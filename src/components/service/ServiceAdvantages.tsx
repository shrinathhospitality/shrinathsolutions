import { motion } from 'framer-motion';
import { glass, muted } from '../../styles/theme';
import type { CardItem } from '../../lib/serviceContent';

/** 4-column grid on large screens, but falls back to 3 columns for item counts (5, 7…) that
 *  would otherwise leave a lone card in the final row. */
function colsFor(count: number): string {
  if (count % 4 === 0) return 'lg:grid-cols-4';
  if (count % 3 === 0 || count === 5) return 'lg:grid-cols-3';
  return 'lg:grid-cols-4';
}

export default function ServiceAdvantages({ heading, body, items }: { heading: string; body?: string; items: CardItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-[88px] md:pt-[104px]">
      <div className="max-w-[720px]">
        <h2 className="font-heading font-bold text-[clamp(26px,3vw,38px)] leading-[1.14] m-0">{heading}</h2>
        {body && <p className="text-[16.5px] mt-3.5" style={{ color: muted }}>{body}</p>}
      </div>
      <div className={`grid gap-4 mt-8 sm:grid-cols-2 ${colsFor(items.length)}`}>
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: (i % 6) * 0.05 }}
            className="p-6 rounded-[22px]"
            style={glass}
          >
            {it.glyph && (
              <span className="grid place-items-center text-[18px]" style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(123,92,255,.2)', border: '1px solid rgba(255,255,255,.16)' }} aria-hidden="true">
                {it.glyph}
              </span>
            )}
            <h3 className="font-heading font-bold text-[17px] mt-3.5 mb-1.5">{it.title}</h3>
            <p className="m-0 text-[14.5px]" style={{ color: muted }}>{it.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
