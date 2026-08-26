import { motion } from 'framer-motion';
import type { Venture, VentureSection } from '../../types/venture';
import { VentureImage } from './VentureImage';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };

/** Renders a venture's plain heading/body sections paired with an alternating themed image,
 *  instead of a single narrow text column leaving the other half of the page empty. Used by
 *  every venture layout so the "story" sections read consistently across all 9 pages.
 *  `sections`/`iconOffset` let a page render a subset (e.g. sections interleaved with other
 *  content) while keeping the icon cycle from repeating the same icon at each slice's start. */
export function VentureTextSections({
  venture, sections, iconOffset = 0,
}: {
  venture: Venture; sections?: VentureSection[]; iconOffset?: number;
}) {
  const { theme } = venture;
  const list = sections ?? venture.sections;
  return (
    <>
      {list.map((s, i) => {
        const icon = venture.services[(i + iconOffset) % venture.services.length]?.icon ?? 'Building2';
        return (
          <motion.section key={s.heading} {...rise} className="mx-auto max-w-shell px-[22px] pt-14">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className={`max-w-[560px] ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] leading-[1.2] m-0" style={{ color: theme.text }}>{s.heading}</h2>
                {s.body && <p className="mt-3.5 text-[16px]" style={{ color: theme.muted, lineHeight: 1.75 }}>{s.body}</p>}
              </div>
              <VentureImage theme={theme} icon={icon} ratio="4/3" label={s.heading} className="rounded-[20px] hidden sm:block" />
            </div>
          </motion.section>
        );
      })}
    </>
  );
}
