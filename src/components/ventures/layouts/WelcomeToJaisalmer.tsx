import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import type { Venture } from '../../../types/venture';
import { VentureContactRow } from '../primitives';
import { VentureIcon } from '../ventureIcons';
import { VentureImage } from '../VentureImage';
import { VenturePhotoGallery } from '../VenturePhotoGallery';
import { VentureFaqSection } from '../VentureFaqSection';
import { VentureTextSections } from '../VentureTextSections';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };
const helpsWho = ['First-Time Visitors', 'Families', 'Couples', 'Travel Planners'];

export default function WelcomeToJaisalmer({ venture }: { venture: Venture }) {
  const { theme } = venture;
  return (
    <div className="font-body">
      {/* Editorial hero */}
      <section className="mx-auto max-w-shell px-[22px] pt-8 pb-4">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.2em]" style={{ color: theme.primary, fontFamily: 'Sora, sans-serif' }}>The Jaisalmer Travel Guide</div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-heading font-extrabold text-[clamp(32px,4.4vw,50px)] leading-[1.1] mt-4 mb-0"
              style={{ color: theme.text }}
            >
              {venture.tagline}
            </motion.h1>
            <p className="text-[17px] mt-5" style={{ color: theme.muted, lineHeight: 1.8, fontStyle: 'italic' }}>{venture.summary}</p>
            <div className="mt-7"><VentureContactRow venture={venture} theme={theme} /></div>
          </div>
          <VentureImage theme={theme} icon="Landmark" ratio="4/3" label={venture.name} className="rounded-[8px]" />
        </div>
      </section>

      {/* Explore sections — editorial cards */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-14">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Explore the Guide</h2>
        <div className="grid gap-4 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {venture.services.map((s) => (
            <a
              key={s.title}
              href={venture.website}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-[4px] !text-current"
              style={{ background: theme.surface, border: `1px solid ${theme.secondary}44` }}
            >
              <span style={{ color: theme.primary }}><VentureIcon name={s.icon} size={19} /></span>
              <h3 className="font-heading font-bold text-[16.5px] mt-3.5 mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[13.8px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{s.description}</p>
              <span className="inline-flex items-center gap-1.5 mt-3 text-[12.5px] font-bold" style={{ color: theme.primary }}>
                Read the guide <ExternalLink size={12} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </motion.section>

      <VentureTextSections venture={venture} />

      {/* Who it helps */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Who the Guide Helps</h2>
        <div className="flex flex-wrap gap-2.5 mt-6">
          {helpsWho.map((c) => (
            <span key={c} className="px-4 py-2.5 rounded-[4px] text-[14px] font-semibold" style={{ border: `1px solid ${theme.secondary}66`, color: theme.text }}>{c}</span>
          ))}
        </div>
      </motion.section>

      <VenturePhotoGallery
        venture={venture}
        heading="Highlights Worth Planning Around"
        items={venture.highlights.slice(0, 4).map((h) => ({ title: h, icon: 'Landmark' }))}
      />

      <VentureFaqSection venture={venture} />
    </div>
  );
}
