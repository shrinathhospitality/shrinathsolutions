import { motion } from 'framer-motion';
import type { Venture } from '../../../types/venture';
import { VentureContactRow } from '../primitives';
import { VentureIcon } from '../ventureIcons';
import { VentureImage } from '../VentureImage';
import { VenturePhotoGallery } from '../VenturePhotoGallery';
import { VentureFaqSection } from '../VentureFaqSection';
import { VentureTextSections } from '../VentureTextSections';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };

const suitedFor = ['Repeat Jaisalmer visitors', 'Travellers avoiding crowds', 'Photography-focused travellers', 'Small groups'];
const checklist = [
  'Comfortable, weather-appropriate desert clothing',
  'Sun protection and hydration for daytime routes',
  'A warm layer for cool desert nights',
  'Realistic expectations — no guaranteed sightings or restricted-area access',
];

export default function JaisalmerAdventures({ venture }: { venture: Venture }) {
  const { theme } = venture;
  return (
    <div className="font-body">
      {/* Documentary hero */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${theme.background}, ${theme.surface})` }}>
        <div className="mx-auto max-w-shell px-[22px] pt-8 pb-14">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <div className="text-[12.5px] font-bold uppercase tracking-[.22em]" style={{ color: theme.accent }}>Travel & Experiences · Offbeat Safaris</div>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="font-heading font-extrabold text-[clamp(30px,4.2vw,48px)] leading-[1.1] mt-4 mb-0"
                style={{ color: theme.text }}
              >
                {venture.tagline}
              </motion.h1>
              <p className="text-[16.5px] mt-5" style={{ color: theme.muted, lineHeight: 1.75 }}>{venture.summary}</p>
              <div className="mt-8"><VentureContactRow venture={venture} theme={theme} /></div>
            </div>
            <div>
              <VentureImage theme={theme} icon="Mountain" ratio="4/3" label={venture.name} className="rounded-[4px]" />
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)` }} />
      </section>

      <VentureTextSections venture={venture} />

      {/* Route options */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Route Options</h2>
        <div className="grid gap-4 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {venture.services.map((s) => (
            <div key={s.title} className="p-5 rounded-[4px]" style={{ borderLeft: `3px solid ${theme.accent}`, background: theme.surface }}>
              <span className="inline-flex items-center gap-2 mb-2" style={{ color: theme.accent }}>
                <VentureIcon name={s.icon} size={17} />
              </span>
              <h3 className="font-heading font-bold text-[16px] mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[13.8px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Who it suits */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Who This Suits</h2>
        <div className="flex flex-wrap gap-2.5 mt-6">
          {suitedFor.map((c) => (
            <span key={c} className="px-4 py-2.5 rounded-[6px] text-[13.8px] font-semibold" style={{ border: `1px solid ${theme.accent}55`, color: theme.text }}>{c}</span>
          ))}
        </div>
      </motion.section>

      {/* Safety checklist */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Preparing for the Route</h2>
        <div className="grid gap-2.5 mt-6 max-w-[640px]">
          {checklist.map((c) => (
            <div key={c} className="flex gap-3 px-4.5 py-3.5 rounded-[4px]" style={{ borderLeft: `3px solid ${theme.accent}`, background: theme.surface }}>
              <span style={{ color: theme.accent, flex: 'none' }}>✓</span>
              <span className="text-[14px]" style={{ color: theme.text }}>{c}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <VenturePhotoGallery venture={venture} heading="Along the Route" />
      <VentureFaqSection venture={venture} />
    </div>
  );
}
