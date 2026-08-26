import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { muted } from '../../styles/theme';
import type { CardItem } from '../../lib/serviceContent';

/** Optional visual outcome journey (e.g. Search Visibility → Maps Discovery → Enquiry → Booking).
 *  Only renders when the service record defines a `journey` block — never fabricated. */
export default function ServiceGrowthJourney({ heading, body, items }: { heading: string; body?: string; items: CardItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-[88px] md:pt-[104px]">
      <div className="max-w-[720px]">
        <h2 className="font-heading font-bold text-[clamp(26px,3vw,38px)] leading-[1.14] m-0">{heading}</h2>
        {body && <p className="text-[16.5px] mt-3.5" style={{ color: muted }}>{body}</p>}
      </div>

      <div className="mt-9 flex flex-col lg:flex-row items-stretch gap-0">
        {items.map((it, i) => (
          <div key={it.title} className="flex flex-col lg:flex-row items-center flex-1">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="w-full p-5 rounded-[20px] text-center"
              style={{
                border: '1px solid ' + (i === items.length - 1 ? 'rgba(255,154,83,.4)' : 'rgba(255,255,255,.11)'),
                background: i === items.length - 1 ? 'linear-gradient(160deg, rgba(255,122,47,.16), rgba(255,122,47,.04))' : 'rgba(255,255,255,.04)',
              }}
            >
              {it.glyph && <span className="text-[22px]" aria-hidden="true">{it.glyph}</span>}
              <div className="font-heading font-bold text-[16px] mt-2">{it.title}</div>
              {it.body && <p className="m-0 mt-1.5 text-[13.5px]" style={{ color: muted }}>{it.body}</p>}
            </motion.div>
            {i < items.length - 1 && (
              <span className="shrink-0 my-2 lg:my-0 lg:mx-3" aria-hidden="true" style={{ color: 'rgba(226,234,255,.35)' }}>
                <ArrowDown size={18} className="lg:hidden" />
                <ArrowRight size={18} className="hidden lg:block" />
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
