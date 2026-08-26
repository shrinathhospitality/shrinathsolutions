import type { Block } from '../pages/ServicePage';

/** Shared shape for icon+title+body items used by several service sections. */
export type CardItem = { glyph?: string; title: string; body: string };

export type NormalizedService = {
  about: { heading: string; paragraphs: string[] } | null;
  deliverables: { heading: string; body?: string; items: CardItem[] } | null;
  journey: { heading: string; body?: string; items: CardItem[] } | null;
  process: { heading: string; body?: string; items: { num: string; title: string; body: string }[] } | null;
  audience: { heading: string; paragraphs: string[]; chips: string[] } | null;
  outcomes: { heading: string; body?: string; items: string[] } | null;
  advantages: { heading: string; body?: string; items: CardItem[] } | null;
  /** Any block that isn't claimed by a named section above — never dropped, rendered generically. */
  extras: Block[];
};

const AUDIENCE_HEADING = /built for|who this service|who it'?s for|target audience|who we work with/i;

/**
 * Buckets a service's flexible blocks_json array into the named sections the premium
 * template renders. Nothing is ever discarded: anything that isn't confidently matched to a
 * named section is kept in `extras` and rendered generically, so real content is never lost.
 */
export function normalizeServiceBlocks(blocks: Block[]): NormalizedService {
  const claimed = new Set<number>();

  const parasBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter((x): x is { b: Extract<Block, { kind: 'paras' }>; i: number } => x.b.kind === 'paras');
  const cardsBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter((x): x is { b: Extract<Block, { kind: 'cards' }>; i: number } => x.b.kind === 'cards');
  const stepsBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter((x): x is { b: Extract<Block, { kind: 'steps' }>; i: number } => x.b.kind === 'steps');
  const ticksBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter((x): x is { b: Extract<Block, { kind: 'ticks' }>; i: number } => x.b.kind === 'ticks');
  const pillsBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter((x): x is { b: Extract<Block, { kind: 'pills' }>; i: number } => x.b.kind === 'pills');
  const journeyBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter((x): x is { b: Extract<Block, { kind: 'journey' }>; i: number } => x.b.kind === 'journey');

  // Audience paragraph: a paras block whose heading is clearly about who the service serves.
  const audienceParaEntry = parasBlocks.find((x) => AUDIENCE_HEADING.test(x.b.heading));
  if (audienceParaEntry) claimed.add(audienceParaEntry.i);

  // About: every remaining paras block, combined in document order.
  const aboutEntries = parasBlocks.filter((x) => x.i !== audienceParaEntry?.i);
  aboutEntries.forEach((x) => claimed.add(x.i));
  const about = aboutEntries.length
    ? { heading: aboutEntries[0].b.heading, paragraphs: aboutEntries.flatMap((x) => x.b.items) }
    : null;

  // Audience chips: a pills block whose heading signals audience/industries, distinct from a
  // technology/integration pills list which should fall through to extras untouched.
  const audiencePillsEntry = pillsBlocks.find((x) => AUDIENCE_HEADING.test(x.b.heading) || /who this|industries we serve/i.test(x.b.heading));
  if (audiencePillsEntry) claimed.add(audiencePillsEntry.i);

  const audience =
    audienceParaEntry || audiencePillsEntry
      ? {
          heading: audienceParaEntry?.b.heading ?? audiencePillsEntry!.b.heading,
          paragraphs: audienceParaEntry ? audienceParaEntry.b.items : [],
          chips: audiencePillsEntry ? audiencePillsEntry.b.items : [],
        }
      : null;

  // Deliverables: first cards block. Advantages: a later cards block, preferring one whose
  // heading reads like "why choose us"; otherwise the next cards block in order.
  const deliverablesEntry = cardsBlocks[0];
  if (deliverablesEntry) claimed.add(deliverablesEntry.i);
  const remainingCards = cardsBlocks.filter((x) => x.i !== deliverablesEntry?.i);
  const advantagesEntry = remainingCards.find((x) => /why choose|why work with|why shrinath/i.test(x.b.heading)) ?? remainingCards[0];
  if (advantagesEntry) claimed.add(advantagesEntry.i);

  const deliverables = deliverablesEntry
    ? { heading: deliverablesEntry.b.heading, body: deliverablesEntry.b.body, items: deliverablesEntry.b.items }
    : null;
  const advantages = advantagesEntry
    ? { heading: advantagesEntry.b.heading, body: advantagesEntry.b.body, items: advantagesEntry.b.items }
    : null;

  const processEntry = stepsBlocks[0];
  if (processEntry) claimed.add(processEntry.i);
  const process = processEntry ? { heading: processEntry.b.heading, body: processEntry.b.body, items: processEntry.b.items } : null;

  const outcomesEntry = ticksBlocks[0];
  if (outcomesEntry) claimed.add(outcomesEntry.i);
  const outcomes = outcomesEntry ? { heading: outcomesEntry.b.heading, body: outcomesEntry.b.body, items: outcomesEntry.b.items } : null;

  const journeyEntry = journeyBlocks[0];
  if (journeyEntry) claimed.add(journeyEntry.i);
  const journey = journeyEntry ? { heading: journeyEntry.b.heading, body: journeyEntry.b.body, items: journeyEntry.b.items } : null;

  const extras = blocks.filter((_, i) => !claimed.has(i));

  return { about, deliverables, journey, process, audience, outcomes, advantages, extras };
}

/** First N deliverable titles, reused as compact "value point" chips in the About section. */
export function highlightsFrom(items: CardItem[] | undefined, count = 3): string[] {
  return (items ?? []).slice(0, count).map((i) => i.title);
}
