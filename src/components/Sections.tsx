import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { glass, muted } from '../styles/theme';

/** Section shell: max width, padding, optional heading + intro. */
export function Section({ heading, body, children, id }: { heading?: string; body?: string; children?: ReactNode; id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-shell px-[22px] pt-16">
      {(heading || body) && (
        <div className="max-w-[820px]">
          {heading && <h2 className="font-heading font-bold text-[clamp(27px,3.2vw,40px)] leading-[1.12] m-0">{heading}</h2>}
          {body && <p className="text-[17.4px] mt-3.5" style={{ color: muted }}>{body}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

const rise = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
};

/** Staggered white cards: icon glyph, title, body. */
export function CardsGrid({ items, tint = 'var(--color-surface-alt)' }: { items: { glyph?: string; title: string; body: string }[]; tint?: string }) {
  return (
    <div className="grid gap-4 mt-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
      {items.map((it, i) => (
        <motion.article
          key={it.title}
          {...rise}
          transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.06 }}
          className="p-6 rounded-[22px]"
          style={glass}
        >
          {it.glyph && (
            <span className="grid place-items-center text-[19px]" style={{ width: 44, height: 44, borderRadius: 14, background: tint, border: '1px solid var(--color-border)' }}>
              {it.glyph}
            </span>
          )}
          <h3 className="font-heading font-bold text-[19.5px] mt-4 mb-2">{it.title}</h3>
          <p className="m-0 text-[15.8px]" style={{ color: muted }}>{it.body}</p>
        </motion.article>
      ))}
    </div>
  );
}

/** Numbered process steps. Explicit responsive columns (not auto-fit) so item counts like
 *  5 or 6 land in balanced rows instead of leaving a lone card on its own row. */
export function StepsGrid({ items }: { items: { num: string; title: string; body: string }[] }) {
  return (
    <div className="grid gap-3.5 mt-7 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s, i) => (
        <motion.div key={s.num} {...rise} transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.06 }} className="p-5 rounded-[20px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div className="font-heading font-extrabold text-[14.5px] tracking-[.1em]" style={{ color: 'var(--color-accent-hover)' }}>{s.num}</div>
          <h3 className="font-heading font-bold text-[18px] mt-2 mb-1.5">{s.title}</h3>
          <p className="m-0 text-[15.4px]" style={{ color: muted }}>{s.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

/** Pill row for tag-style lists. */
export function PillList({ items, dashed = false }: { items: string[]; dashed?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2.5 mt-6">
      {items.map((i) => (
        <span key={i} className="px-4 py-2.5 rounded-full text-[15.5px] font-semibold" style={{ border: `1px ${dashed ? 'dashed' : 'solid'} var(--color-border-strong)`, background: 'var(--color-surface)', color: 'var(--color-heading)' }}>
          {i}
        </span>
      ))}
    </div>
  );
}

/** Ticked list of name + description pairs. */
export function KvList({ items }: { items: { name: string; body: string }[] }) {
  return (
    <div className="grid gap-2.5 mt-6">
      {items.map((i) => (
        <div key={i.name} className="flex gap-3 px-4.5 py-3.5 rounded-2xl" style={{ padding: '14px 18px', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <span style={{ color: 'var(--color-success)', flex: 'none' }}>✓</span>
          <span className="text-[15.8px]" style={{ color: 'var(--color-heading)' }}>
            <strong className="font-heading">{i.name}</strong> — {i.body}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Ticks({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2.5 mt-6">
      {items.map((i) => (
        <div key={i} className="flex gap-3" style={{ padding: '14px 18px', borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <span style={{ color: 'var(--color-success)', flex: 'none' }}>✓</span>
          <span className="text-[15.8px]" style={{ color: 'var(--color-heading)' }}>{i}</span>
        </div>
      ))}
    </div>
  );
}

export function Paras({ items }: { items: string[] }) {
  return (
    <div className="grid gap-4 mt-5 max-w-[820px]">
      {items.map((p, i) => (
        <p key={i} className="m-0 text-[17.4px]" style={{ color: muted }}>{p}</p>
      ))}
    </div>
  );
}

/** Labelled placeholder for imagery the client supplies. */
export function ImageSlot({ note, ratio = '16/9', size = '1600 × 900 px, WebP', style }: { note: string; ratio?: string; size?: string; style?: CSSProperties }) {
  return (
    <div
      className="grid place-items-center text-center p-5 text-[13.5px]"
      style={{
        aspectRatio: ratio, borderRadius: 24, border: '1px dashed var(--color-border-strong)',
        color: 'var(--color-muted)', background: 'var(--color-surface-alt)', ...style,
      }}
    >
      <span>
        Replace with {note}
        <br />
        {size}
      </span>
    </div>
  );
}
