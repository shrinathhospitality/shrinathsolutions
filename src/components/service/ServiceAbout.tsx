import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { glass, muted } from '../../styles/theme';

/** Branded abstract panel used when no featured image exists — deliberately distinct from the
 *  hero's ServiceVisual mockup so the two columns don't repeat the same illustration. */
function AbstractPanel() {
  return (
    <div
      className="rounded-[24px] grid place-items-center"
      style={{
        aspectRatio: '6/7',
        border: '1px solid rgba(255,255,255,.12)',
        background: 'linear-gradient(155deg, rgba(59,107,255,.26), rgba(123,92,255,.16) 55%, rgba(34,211,238,.12))',
      }}
    >
      <span
        className="grid place-items-center font-heading font-extrabold text-[22px]"
        style={{ width: 68, height: 68, borderRadius: 20, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}
        aria-hidden="true"
      >
        S
      </span>
    </div>
  );
}

export default function ServiceAbout({
  heading,
  paragraphs,
  highlights,
  featuredImage,
  ctaLabel,
  ctaTo,
}: {
  heading: string;
  paragraphs: string[];
  highlights: string[];
  featuredImage?: string | null;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  if (paragraphs.length === 0) return null;
  const imgSrc = featuredImage ? (featuredImage.startsWith('http') ? featuredImage : `/api/${featuredImage}`) : null;

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-[88px] md:pt-[104px]">
      <div className="grid gap-9 lg:grid-cols-[0.85fr_1.15fr] items-start">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.5 }}>
          {imgSrc ? (
            <div className="rounded-[24px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.12)' }}>
              <img src={imgSrc} alt={heading} width={720} height={840} loading="lazy" className="w-full h-auto object-cover" style={{ aspectRatio: '6/7' }} />
            </div>
          ) : (
            <AbstractPanel />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.5, delay: 0.08 }} className="p-7 md:p-9 rounded-[24px]" style={glass}>
          <div className="text-[13px] font-bold uppercase tracking-[.16em]" style={{ color: '#7dd3fc' }}>About this service</div>
          <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] leading-[1.15] mt-2.5 mb-4">{heading}</h2>
          <div className="grid gap-4 max-w-[680px]">
            {paragraphs.map((p, i) => (
              <p key={i} className="m-0 text-[16.5px]" style={{ color: muted, lineHeight: 1.72 }}>{p}</p>
            ))}
          </div>

          {highlights.length > 0 && (
            <div className="grid gap-2 mt-6">
              {highlights.map((h) => (
                <div key={h} className="flex items-center gap-2.5 text-[15px] font-medium">
                  <CheckCircle2 size={17} color="#6ee7b7" className="shrink-0" aria-hidden="true" />
                  {h}
                </div>
              ))}
            </div>
          )}

          {ctaLabel && (
            <Link to={ctaTo ?? '/contact'} className="inline-flex items-center gap-1.5 mt-7 font-bold text-[15px]" style={{ color: '#ffb182' }}>
              {ctaLabel} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}
