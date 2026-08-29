import { motion } from 'framer-motion';
import type { Venture } from '../../../types/venture';
import { VentureContactRow } from '../primitives';
import { VentureIcon } from '../ventureIcons';
import { VentureImage } from '../VentureImage';
import { VenturePhotoGallery } from '../VenturePhotoGallery';
import { VentureFaqSection } from '../VentureFaqSection';
import { VentureTextSections } from '../VentureTextSections';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };
const suitedFor = ['Couples', 'Families', 'Groups'];

export default function DesertCamp({ venture }: { venture: Venture }) {
  const { theme } = venture;
  return (
    <div className="font-body">
      {/* Cinematic hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: `radial-gradient(ellipse at 70% 20%, ${theme.primary}3a, transparent 60%), radial-gradient(ellipse at 20% 90%, ${theme.accent}22, transparent 55%), ${theme.background}` }}
      >
        <div className="mx-auto max-w-shell px-[22px] pt-10 pb-16 relative">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <div className="text-[13px] font-bold uppercase tracking-[.2em]" style={{ color: theme.accent }}>Hospitality · Desert Camp</div>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="font-heading font-extrabold text-[clamp(32px,4.6vw,52px)] leading-[1.08] mt-4 mb-0"
                style={{ color: theme.text }}
              >
                {venture.tagline}
              </motion.h1>
              <p className="text-[17px] mt-5" style={{ color: theme.muted, lineHeight: 1.75 }}>{venture.summary}</p>
              <div className="mt-8"><VentureContactRow venture={venture} theme={theme} /></div>
            </div>
            <div>
              <VentureImage theme={theme} icon="Tent" ratio="4/3" label={venture.name} className="rounded-[24px]" />
            </div>
          </div>
        </div>
      </section>

      <VentureTextSections venture={venture} />

      {/* Experience highlights */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>The Experience</h2>
        <div className="grid gap-4 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {venture.services.map((s) => (
            <div key={s.title} className="p-6 rounded-[22px]" style={{ background: theme.surface, border: `1px solid ${theme.primary}22` }}>
              <span className="grid place-items-center rounded-full" style={{ width: 44, height: 44, background: `${theme.accent}22`, color: theme.accent }}>
                <VentureIcon name={s.icon} size={20} />
              </span>
              <h3 className="font-heading font-bold text-[17px] mt-4 mb-2" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[14.5px]" style={{ color: theme.muted, lineHeight: 1.65 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Suited for */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Suited For</h2>
        <div className="flex flex-wrap gap-2.5 mt-6">
          {suitedFor.map((c) => (
            <span key={c} className="px-5 py-2.5 rounded-full text-[14.5px] font-semibold" style={{ border: `1px dashed ${theme.accent}88`, color: theme.text }}>{c}</span>
          ))}
        </div>
      </motion.section>

      <VenturePhotoGallery venture={venture} heading="Around the Camp" />
      <VentureFaqSection venture={venture} />
    </div>
  );
}
