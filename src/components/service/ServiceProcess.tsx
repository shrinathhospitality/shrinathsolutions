import { motion } from 'framer-motion';
import { muted } from '../../styles/theme';

type Step = { num: string; title: string; body: string };

function StepCard({ s, i }: { s: Step; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: (i % 6) * 0.06 }}
      className="p-5 rounded-[20px] h-full"
      style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)' }}
    >
      <span
        className="grid place-items-center rounded-full font-heading font-extrabold text-[14px] shrink-0"
        style={{ width: 38, height: 38, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 55%,#22d3ee)', color: '#fff' }}
      >
        {s.num}
      </span>
      <h3 className="font-heading font-bold text-[17px] mt-3 mb-1.5">{s.title}</h3>
      <p className="m-0 text-[14.5px]" style={{ color: muted, lineHeight: 1.65 }}>{s.body}</p>
    </motion.div>
  );
}

export default function ServiceProcess({ heading, body, items }: { heading: string; body?: string; items: Step[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-[88px] md:pt-[104px]">
      <div className="max-w-[720px]">
        <h2 className="font-heading font-bold text-[clamp(26px,3vw,38px)] leading-[1.14] m-0">{heading}</h2>
        {body && <p className="text-[16.5px] mt-3.5" style={{ color: muted }}>{body}</p>}
      </div>

      {/* Tablet & desktop: 3-column grid, wrapping to further rows as steps require */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4 mt-9">
        {items.map((s, i) => <StepCard key={s.num} s={s} i={i} />)}
      </div>

      {/* Mobile: vertical connected timeline */}
      <div className="sm:hidden mt-8">
        {items.map((s, i) => (
          <div key={s.num} className="relative pl-11">
            {i < items.length - 1 && (
              <div aria-hidden="true" className="absolute left-[18px] top-10 bottom-[-16px] w-px" style={{ background: 'linear-gradient(180deg, rgba(125,211,252,.4), rgba(123,92,255,.3))' }} />
            )}
            <span
              className="absolute left-0 top-0 grid place-items-center rounded-full font-heading font-extrabold text-[13px]"
              style={{ width: 36, height: 36, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 55%,#22d3ee)', color: '#fff' }}
            >
              {s.num}
            </span>
            <div className="pb-6">
              <h3 className="font-heading font-bold text-[16.5px] m-0">{s.title}</h3>
              <p className="m-0 mt-1.5 text-[14.5px]" style={{ color: muted, lineHeight: 1.65 }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
