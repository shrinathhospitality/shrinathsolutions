import { CheckCircle2 } from 'lucide-react';
import ServiceVisual from './ServiceVisual';

export default function ServiceOutcomes({ heading, body, items, category }: { heading: string; body?: string; items: string[]; category?: string | null }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-[88px] md:pt-[104px]">
      <div
        className="p-7 md:p-10 rounded-[28px] grid gap-9 lg:grid-cols-[1.1fr_0.9fr] items-center"
        style={{ border: '1px solid var(--color-border)', background: 'linear-gradient(160deg, var(--color-surface-alt), var(--color-surface))', boxShadow: 'var(--shadow-card)' }}
      >
        <div>
          <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] leading-[1.15] m-0">{heading}</h2>
          {body && <p className="text-[16px] mt-3" style={{ color: 'var(--color-body)' }}>{body}</p>}
          <div className="grid gap-2.5 mt-6">
            {items.map((i) => (
              <div key={i} className="flex gap-2.5 text-[15.5px]" style={{ color: 'var(--color-heading)' }}>
                <CheckCircle2 size={19} color="var(--color-success)" className="shrink-0 mt-0.5" aria-hidden="true" />
                {i}
              </div>
            ))}
          </div>
        </div>
        <ServiceVisual category={category} />
      </div>
    </section>
  );
}
