import { Link } from 'react-router-dom';

export default function RelatedLinks({ items }: { items: { label: string; to: string }[] }) {
  return (
    <section className="mx-auto max-w-shell px-[22px] pt-16">
      <h2 className="font-heading font-bold text-[27px] mb-4">Related services</h2>
      <div className="flex flex-wrap gap-2.5">
        {items.map((i) => (
          <Link key={i.to + i.label} to={i.to} className="px-5 py-3 rounded-full font-semibold text-[15.5px] !text-heading" style={{ border: '1px solid var(--color-border-strong)', background: 'var(--color-surface)' }}>
            {i.label} →
          </Link>
        ))}
      </div>
    </section>
  );
}
