import { Link } from 'react-router-dom';
import { ArrowRight, Target } from 'lucide-react';
import { emberBtn } from '../../styles/theme';

/** A lighter, single-line CTA banner for the middle of the page — deliberately smaller than
 * the full gradient block used for the page's final CTA, so the two don't read as a repeat. */
export default function SeoMidCta({ heading, body, buttonLabel }: { heading: string; body: string; buttonLabel: string }) {
  return (
    <section className="mx-auto max-w-shell px-[22px] pt-16">
      <div className="flex flex-col md:flex-row items-center gap-6 justify-between p-6 md:p-7 rounded-[20px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-warm)' }}>
        <div className="flex items-center gap-4">
          <span className="grid place-items-center rounded-full shrink-0" style={{ width: 46, height: 46, background: '#fff' }}>
            <Target size={20} color="var(--color-accent-hover)" aria-hidden="true" />
          </span>
          <div>
            <div className="font-heading font-bold text-[18px]">{heading}</div>
            <p className="m-0 mt-1 text-[14.5px]" style={{ color: 'var(--color-body)' }}>{body}</p>
          </div>
        </div>
        <Link to="/contact" className="shrink-0 inline-flex items-center gap-1.5 px-6 py-3.5 rounded-full font-heading font-bold text-[15px] whitespace-nowrap" style={emberBtn}>
          {buttonLabel} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
