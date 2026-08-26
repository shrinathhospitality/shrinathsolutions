import { motion } from 'framer-motion';
import { muted } from '../../styles/theme';
import type { SeoProcessStep } from './types';

/** Numbered steps connected by a line on desktop, stacked on mobile. Works for any step count
 * but is sized for the "simple four-step process" this template calls for. */
export default function SeoProcess({ heading, steps }: { heading: string; steps: SeoProcessStep[] }) {
  return (
    <section className="mx-auto max-w-shell px-[22px] pt-16">
      <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] m-0">{heading}</h2>

      <div className="hidden md:block relative mt-9">
        <div aria-hidden="true" className="absolute left-0 right-0" style={{ top: 23, height: 1, background: 'linear-gradient(90deg, rgba(125,211,252,.4), rgba(123,92,255,.4), rgba(255,138,69,.4))' }} />
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
          {steps.map((s, i) => (
            <motion.div key={s.num} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.4, delay: i * 0.08 }} className="text-center px-2">
              <span className="grid place-items-center mx-auto rounded-full font-heading font-extrabold text-[14px]" style={{ width: 46, height: 46, background: 'linear-gradient(140deg,#3157e5,#7347e8 55%,#22d3ee)', color: '#fff', boxShadow: '0 0 0 6px var(--color-page)' }}>
                {s.num}
              </span>
              <h3 className="font-heading font-bold text-[15.5px] mt-3 mb-1.5">{s.title}</h3>
              <p className="m-0 text-[13.5px]" style={{ color: muted }}>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="md:hidden mt-8 grid gap-5">
        {steps.map((s, i) => (
          <motion.div key={s.num} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.4, delay: i * 0.06 }} className="flex gap-4">
            <span className="grid place-items-center shrink-0 rounded-full font-heading font-extrabold text-[13px]" style={{ width: 38, height: 38, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 55%,#22d3ee)', color: '#fff' }}>
              {s.num}
            </span>
            <div>
              <h3 className="font-heading font-bold text-[16px] m-0">{s.title}</h3>
              <p className="m-0 mt-1 text-[14px]" style={{ color: muted }}>{s.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
