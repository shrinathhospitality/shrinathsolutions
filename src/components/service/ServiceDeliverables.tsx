import { motion } from 'framer-motion';
import { glass, muted } from '../../styles/theme';
import type { CardItem } from '../../lib/serviceContent';

export default function ServiceDeliverables({ heading, body, items }: { heading: string; body?: string; items: CardItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-[88px] md:pt-[104px]">
      <div className="max-w-[720px]">
        <h2 className="font-heading font-bold text-[clamp(26px,3vw,38px)] leading-[1.14] m-0">{heading}</h2>
        {body && <p className="text-[16.5px] mt-3.5" style={{ color: muted }}>{body}</p>}
      </div>
      <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <motion.article
            key={it.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: (i % 6) * 0.05 }}
            className="group p-6 rounded-[22px] transition-all hover:-translate-y-0.5"
            style={{ ...glass, position: 'relative', overflow: 'hidden' }}
          >
            <div aria-hidden="true" className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at 85% 0%, rgba(49,87,229,.06), transparent 60%)' }} />
            {it.glyph && (
              <span className="grid place-items-center text-[19px] relative" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }} aria-hidden="true">
                {it.glyph}
              </span>
            )}
            <h3 className="font-heading font-bold text-[18.5px] mt-4 mb-2 relative">{it.title}</h3>
            <p className="m-0 text-[15px] relative" style={{ color: muted }}>{it.body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
