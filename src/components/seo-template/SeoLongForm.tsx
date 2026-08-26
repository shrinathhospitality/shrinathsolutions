import { motion } from 'framer-motion';
import { muted } from '../../styles/theme';
import type { SeoLongFormSubsection } from './types';

/** Readable long-form content: one H2, an optional intro paragraph, then H3 subsections —
 * a single narrow column (not full page width) so paragraphs stay comfortable to read. */
export default function SeoLongForm({
  heading,
  intro,
  subsections,
}: {
  heading: string;
  intro?: string;
  subsections: SeoLongFormSubsection[];
}) {
  return (
    <section className="mx-auto max-w-shell px-[22px] pt-16">
      <div className="max-w-[760px]">
        <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] leading-[1.15] m-0">{heading}</h2>
        {intro && (
          <p className="mt-4 text-[17px] m-0" style={{ color: muted, lineHeight: 1.75 }}>{intro}</p>
        )}
        <div className="grid gap-8 mt-8">
          {subsections.map((sub, i) => (
            <motion.div key={sub.heading} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.4, delay: Math.min(i, 4) * 0.05 }}>
              <h3 className="font-heading font-bold text-[19.5px] m-0">{sub.heading}</h3>
              <div className="grid gap-3.5 mt-3">
                {sub.paragraphs.map((p, j) => (
                  <p key={j} className="m-0 text-[16px]" style={{ color: 'var(--color-body)', lineHeight: 1.75 }}>{p}</p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
