import { motion } from 'framer-motion';
import type { Venture } from '../../../types/venture';
import { VentureContactRow } from '../primitives';
import { VentureIcon } from '../ventureIcons';
import { VentureImage } from '../VentureImage';
import { VenturePhotoGallery } from '../VenturePhotoGallery';
import { VentureFaqSection } from '../VentureFaqSection';
import { VentureTextSections } from '../VentureTextSections';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };
const destinations = ['Jaisalmer', 'Jodhpur', 'Jaipur', 'Udaipur', 'Wider Rajasthan & India'];
const travellerTypes = ['Couples', 'Families', 'Groups', 'Custom Tours'];

export default function Adventures({ venture }: { venture: Venture }) {
  const { theme } = venture;
  const process = [
    { num: '01', title: 'Tell Us Your Plan', body: 'Share where you want to go and what kind of trip you’re looking for.' },
    { num: '02', title: 'Draft Itinerary', body: 'We put together a route that matches your interests and pace.' },
    { num: '03', title: 'Coordination', body: 'Hotels, camps, transport and activities are coordinated around your itinerary.' },
    { num: '04', title: 'Confirm & Travel', body: 'We stay available to adjust plans as your trip firms up.' },
  ];

  return (
    <div className="font-body">
      <section className="mx-auto max-w-shell px-[22px] pt-6 pb-4">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: theme.primary }}>Travel & Experiences</div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-heading font-extrabold text-[clamp(30px,4vw,46px)] leading-[1.1] mt-3.5 mb-0"
              style={{ color: theme.text }}
            >
              {venture.tagline}
            </motion.h1>
            <p className="text-[16.5px] mt-5" style={{ color: theme.muted, lineHeight: 1.75 }}>{venture.summary}</p>
            <div className="mt-7"><VentureContactRow venture={venture} theme={theme} /></div>
          </div>
          <VentureImage theme={theme} icon="Map" ratio="4/3" label={venture.name} className="rounded-[20px]" />
        </div>
      </section>

      {/* Destination route strip */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-10">
        <div className="flex flex-wrap items-center gap-2 p-4 rounded-[16px]" style={{ background: theme.surface, border: `1px solid ${theme.secondary}22` }}>
          {destinations.map((d, i) => (
            <span key={d} className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full text-[13.5px] font-semibold" style={{ background: `${theme.primary}12`, color: theme.primary }}>{d}</span>
              {i < destinations.length - 1 && <span style={{ color: theme.muted }}>→</span>}
            </span>
          ))}
        </div>
      </motion.section>

      <VentureTextSections venture={venture} />

      {/* Planning services */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Planning Support</h2>
        <div className="grid gap-4 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {venture.services.map((s) => (
            <div key={s.title} className="p-5 rounded-[16px]" style={{ border: `1px solid ${theme.secondary}22`, background: theme.surface }}>
              <span className="grid place-items-center rounded-full" style={{ width: 40, height: 40, background: `${theme.primary}14`, color: theme.primary }}>
                <VentureIcon name={s.icon} size={19} />
              </span>
              <h3 className="font-heading font-bold text-[16px] mt-3.5 mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[13.8px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 4-step process */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>How Planning Works</h2>
        <div className="grid gap-3.5 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {process.map((s) => (
            <div key={s.num} className="p-5 rounded-[16px]" style={{ border: `1px solid ${theme.secondary}22`, background: theme.surface }}>
              <div className="font-heading font-extrabold text-[13px] tracking-[.1em]" style={{ color: theme.accent }}>{s.num}</div>
              <h3 className="font-heading font-bold text-[15px] mt-2 mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[13.5px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Traveller types */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Trips We Plan</h2>
        <div className="flex flex-wrap gap-2.5 mt-6">
          {travellerTypes.map((t) => (
            <span key={t} className="px-4 py-2.5 rounded-full text-[14px] font-semibold" style={{ border: `1px solid ${theme.secondary}33`, color: theme.text }}>{t}</span>
          ))}
        </div>
      </motion.section>

      <VenturePhotoGallery venture={venture} heading="Trips We’ve Coordinated" />
      <VentureFaqSection venture={venture} />
    </div>
  );
}
