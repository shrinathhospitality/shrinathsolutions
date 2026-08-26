import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

/** Accessible FAQ accordion. Pairs are [question, answer]. Only one answer open at a time. */
export default function Faq({ faqs, heading = 'Frequently asked questions' }: { faqs: [string, string][]; heading?: string }) {
  const [open, setOpen] = useState<number>(-1);
  const uid = useId();

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-[88px] md:pt-[104px]">
      <h2 className="font-heading font-bold text-[clamp(27px,3.2vw,40px)] mb-6">{heading}</h2>
      <div className="max-w-[900px] rounded-[24px] overflow-hidden" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
        {faqs.map(([q, a], i) => {
          const panelId = `${uid}-panel-${i}`;
          const buttonId = `${uid}-button-${i}`;
          const isOpen = open === i;
          return (
            <div key={q} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="m-0">
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-3.5 px-6 py-5 text-left font-heading font-bold text-[17px]"
                  style={{ color: 'var(--color-heading)' }}
                >
                  {q}
                  {isOpen ? <Minus size={20} color="var(--color-accent-hover)" strokeWidth={2.75} aria-hidden="true" /> : <Plus size={20} color="var(--color-accent-hover)" strokeWidth={2.75} aria-hidden="true" />}
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="m-0 px-6 pb-6 text-[16.5px] max-w-[780px]" style={{ color: 'var(--color-body)' }}>{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
