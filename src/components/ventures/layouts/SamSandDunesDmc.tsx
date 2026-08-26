import { motion } from 'framer-motion';
import type { Venture } from '../../../types/venture';
import { VentureContactRow } from '../primitives';
import { VentureIcon } from '../ventureIcons';
import VentureEnquiryForm from '../VentureEnquiryForm';
import { VentureImage } from '../VentureImage';
import { VenturePhotoGallery } from '../VenturePhotoGallery';
import { VentureFaqSection } from '../VentureFaqSection';
import { VentureTextSections } from '../VentureTextSections';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };

const b2bFields = [
  { name: 'agency', label: 'Agency / Company Name', required: true },
  { name: 'contact', label: 'Contact Person', required: true },
  { name: 'phone', label: 'Phone / WhatsApp', type: 'tel' as const, required: true },
  { name: 'email', label: 'Email', type: 'email' as const, required: true },
  { name: 'travelDate', label: 'Travel Date', type: 'date' as const },
  { name: 'guests', label: 'Guest Count', type: 'number' as const },
  { name: 'room', label: 'Room / Tent Requirement' },
  { name: 'meals', label: 'Meal / Activity Requirement' },
  { name: 'message', label: 'Message', type: 'textarea' as const },
];

export default function SamSandDunesDmc({ venture }: { venture: Venture }) {
  const { theme } = venture;
  return (
    <div className="font-body">
      {/* Trade hero */}
      <section className="mx-auto max-w-shell px-[22px] pt-6 pb-4">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div>
            <div className="inline-block px-3 py-1 rounded-[6px] text-[12px] font-bold uppercase tracking-[.12em] mb-3" style={{ background: theme.primary, color: theme.surface }}>
              For Travel Agents &amp; Group Organisers
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-heading font-extrabold text-[clamp(28px,3.8vw,42px)] leading-[1.12] m-0"
              style={{ color: theme.text }}
            >
              {venture.tagline}
            </motion.h1>
            <p className="text-[16px] mt-5 max-w-[560px]" style={{ color: theme.muted, lineHeight: 1.75 }}>{venture.summary}</p>
            <div className="mt-7"><VentureContactRow venture={venture} theme={theme} /></div>
          </div>
          <div className="rounded-[16px] p-5" style={{ background: theme.surface, border: `1px solid ${theme.secondary}22` }}>
            <div className="text-[12px] font-bold uppercase tracking-[.1em]" style={{ color: theme.primary }}>Rate Sheet Snapshot</div>
            <div className="grid gap-2 mt-3">
              {['Standard tent', 'Deluxe tent', 'Group allocation (10+)'].map((r) => (
                <div key={r} className="flex items-center justify-between px-3.5 py-2.5 rounded-[10px]" style={{ background: theme.background }}>
                  <span className="text-[13.5px]" style={{ color: theme.text }}>{r}</span>
                  <span className="text-[12px] font-semibold" style={{ color: theme.muted }}>On enquiry</span>
                </div>
              ))}
            </div>
            <p className="text-[12px] mt-3" style={{ color: theme.muted }}>Exact trade rates are quoted per enquiry — contact us with your group details.</p>
          </div>
        </div>
        <div className="mt-8">
          <VentureImage theme={theme} icon="Tent" ratio="21/9" label={venture.name} className="rounded-[16px]" />
        </div>
      </section>

      <VentureTextSections venture={venture} />

      {/* Trade services grid */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(22px,2.5vw,28px)] m-0" style={{ color: theme.text }}>Trade Support</h2>
        <div className="grid gap-3.5 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {venture.services.map((s) => (
            <div key={s.title} className="p-5 rounded-[12px]" style={{ border: `1px solid ${theme.secondary}22`, background: theme.surface }}>
              <span className="grid place-items-center rounded-[8px]" style={{ width: 38, height: 38, background: `${theme.primary}14`, color: theme.primary }}>
                <VentureIcon name={s.icon} size={18} />
              </span>
              <h3 className="font-heading font-bold text-[15.5px] mt-3 mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[13.5px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* B2B enquiry form */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(22px,2.5vw,28px)] m-0" style={{ color: theme.text }}>Trade Enquiry</h2>
        <p className="mt-2.5 text-[14.5px] max-w-[600px]" style={{ color: theme.muted }}>Submit your group’s details and we’ll respond with camp options, availability and rates.</p>
        <div className="mt-7 p-6 rounded-[16px] max-w-[820px]" style={{ background: theme.surface, border: `1px solid ${theme.secondary}22` }}>
          {venture.email && <VentureEnquiryForm fields={b2bFields} email={venture.email} subject={`B2B Enquiry — ${venture.name}`} theme={theme} />}
        </div>
      </motion.section>

      <VenturePhotoGallery venture={venture} heading="What We Coordinate" />
      <VentureFaqSection venture={venture} />
    </div>
  );
}
