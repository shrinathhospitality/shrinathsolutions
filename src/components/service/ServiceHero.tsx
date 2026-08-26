import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck, Target } from 'lucide-react';
import { site, wa } from '../../data/site';
import { emberBtn, ghostBtn } from '../../styles/theme';
import ServiceVisual from './ServiceVisual';

const TRUST_ICONS = [MapPin, ShieldCheck, Target];

export default function ServiceHero({
  kicker,
  h1,
  intro,
  ctaLabel,
  notes,
  category,
  featuredImage,
}: {
  kicker: string;
  h1: string;
  intro: string;
  ctaLabel: string;
  notes?: string[];
  category?: string | null;
  featuredImage?: string | null;
}) {
  const imgSrc = featuredImage ? (featuredImage.startsWith('http') ? featuredImage : `/api/${featuredImage}`) : null;

  return (
    <section className="mx-auto max-w-shell px-[22px] pt-9 grid gap-11 items-center lg:grid-cols-[1.08fr_0.92fr]">
      <div>
        {kicker && (
          <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: '#7dd3fc' }}>{kicker}</div>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="font-heading font-extrabold text-[clamp(32px,4.4vw,52px)] leading-[1.08] mt-4 mb-0 max-w-[620px]"
          style={{ letterSpacing: '-0.03em' }}
        >
          {h1}
        </motion.h1>
        {intro && (
          <p className="text-[17.5px] mt-5 max-w-[600px]" style={{ color: 'rgba(226,234,255,.74)' }}>{intro}</p>
        )}
        <div className="flex flex-wrap gap-3.5 mt-7">
          <Link to="/contact" className="px-7 py-4 rounded-full font-heading font-bold text-[16px]" style={emberBtn}>{ctaLabel}</Link>
          <a href={wa()} target="_blank" rel="noopener noreferrer" className="px-7 py-4 rounded-full font-bold text-[16px]" style={ghostBtn}>
            WhatsApp {site.phone}
          </a>
        </div>
        {notes && notes.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-7 text-[14px] font-medium" style={{ color: 'rgba(214,225,255,.65)' }}>
            {notes.map((n, i) => {
              const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
              return (
                <span key={n} className="flex items-center gap-1.5">
                  <Icon size={15} color="#6ee7b7" aria-hidden="true" /> {n}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative">
        {imgSrc ? (
          <div className="rounded-[24px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.12)' }}>
            <img
              src={imgSrc}
              alt={h1}
              width={900}
              height={700}
              className="w-full h-auto object-cover"
              style={{ aspectRatio: '9/7' }}
              loading="eager"
            />
          </div>
        ) : (
          <ServiceVisual category={category} />
        )}
      </div>
    </section>
  );
}
