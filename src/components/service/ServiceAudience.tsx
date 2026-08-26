import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { muted } from '../../styles/theme';

export default function ServiceAudience({ heading, paragraphs, chips }: { heading: string; paragraphs: string[]; chips: string[] }) {
  if (paragraphs.length === 0 && chips.length === 0) return null;

  const hasChips = chips.length > 0;

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-[88px] md:pt-[104px]">
      <div className={hasChips ? 'grid gap-9 lg:grid-cols-[0.9fr_1.1fr] items-start' : ''}>
        <div>
          <div className="text-[13px] font-bold uppercase tracking-[.16em]" style={{ color: '#7dd3fc' }}>Who this service is for</div>
          <h2 className={`font-heading font-bold text-[clamp(25px,2.8vw,34px)] leading-[1.15] mt-2.5 mb-0 ${hasChips ? 'max-w-[440px]' : 'max-w-[720px]'}`}>{heading}</h2>
          {paragraphs.length > 0 && (
            <div className={`grid gap-3.5 mt-4 ${hasChips ? 'max-w-[460px]' : 'grid-cols-1 md:grid-cols-2 gap-x-10 max-w-none'}`}>
              {paragraphs.map((p, i) => (
                <p key={i} className="m-0 text-[15.8px]" style={{ color: muted, lineHeight: 1.7 }}>{p}</p>
              ))}
            </div>
          )}
        </div>

        {hasChips && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {chips.map((c, i) => (
              <motion.div
                key={c}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
                className="flex items-center gap-2.5 p-4 rounded-[16px]"
                style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)' }}
              >
                <Building2 size={17} color="#7dd3fc" className="shrink-0" aria-hidden="true" />
                <span className="text-[14px] font-semibold">{c}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
