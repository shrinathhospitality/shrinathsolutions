import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import type { Venture } from '../../../types/venture';
import { VentureButton, VentureContactRow } from '../primitives';
import { VentureIcon } from '../ventureIcons';
import VentureEnquiryForm from '../VentureEnquiryForm';
import { VentureImage } from '../VentureImage';
import { VenturePhotoGallery } from '../VenturePhotoGallery';
import { VentureFaqSection } from '../VentureFaqSection';
import { VentureTextSections } from '../VentureTextSections';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };

const properties = ['Hotel Garh Adhiraj', 'KK Desert Camp & Resort', 'Lakhmana Desert Camp', 'Vijaybagh Resort', 'Hotel Elite Castle', 'Hotel Vasshifa', 'Hotel Narpat Garh Palace'];

const shootFields = [
  { name: 'name', label: 'Your Name', required: true },
  { name: 'production', label: 'Production / Company' },
  { name: 'phone', label: 'Phone', type: 'tel' as const, required: true },
  { name: 'email', label: 'Email', type: 'email' as const, required: true },
  { name: 'dates', label: 'Dates Required' },
  { name: 'purpose', label: 'Purpose (Shoot / Long Stay)' },
  { name: 'message', label: 'Requirement Details', type: 'textarea' as const },
];

const process = [
  { num: '01', title: 'Introduction', body: 'Tell us about your property and current marketing setup.' },
  { num: '02', title: 'Assessment', body: 'We review positioning, presence and where support would help most.' },
  { num: '03', title: 'Proposal', body: 'We outline what marketing or management support looks like for your property.' },
  { num: '04', title: 'Onboarding', body: 'Once agreed, we begin the onboarding process together.' },
];

export default function Hospitality({ venture }: { venture: Venture }) {
  const { theme } = venture;
  return (
    <div className="font-body">
      <section className="mx-auto max-w-shell px-[22px] pt-6 pb-4">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: theme.primary }}>Hospitality · Marketing & Management</div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-heading font-extrabold text-[clamp(30px,4vw,44px)] leading-[1.12] mt-3.5 mb-0"
              style={{ color: theme.text }}
            >
              {venture.tagline}
            </motion.h1>
            <p className="text-[16.5px] mt-5" style={{ color: theme.muted, lineHeight: 1.75 }}>{venture.summary}</p>
            <div className="mt-7"><VentureContactRow venture={venture} theme={theme} /></div>
          </div>
          <VentureImage theme={theme} icon="Building2" ratio="4/3" label={venture.name} className="rounded-[18px]" />
        </div>
      </section>

      {/* Services */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-14">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Services</h2>
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

      <VentureTextSections venture={venture} sections={venture.sections.slice(0, 2)} />

      {/* Property showcase */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Managed, Marketed & Associated Properties</h2>
        <div className="grid gap-3.5 mt-7 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <div key={p} className="flex items-center gap-3 p-4 rounded-[14px]" style={{ border: `1px solid ${theme.secondary}22`, background: theme.surface }}>
              <span className="grid place-items-center rounded-[10px] shrink-0" style={{ width: 38, height: 38, background: `${theme.accent}22`, color: theme.secondary }}>
                <Building2 size={17} aria-hidden="true" />
              </span>
              <span className="font-heading font-semibold text-[14.5px]" style={{ color: theme.text }}>{p}</span>
            </div>
          ))}
        </div>
        <div className="mt-7"><VentureButton to="/contact" theme={theme} variant="primary">Add Your Hotel</VentureButton></div>
      </motion.section>

      {/* Partnership process */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>How a Hotel Partnership Starts</h2>
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

      {/* Shoots & long stays */}
      <VentureTextSections venture={venture} sections={venture.sections.slice(3)} iconOffset={2} />

      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-8">
        <div className="p-6 rounded-[16px] max-w-[820px]" style={{ background: theme.surface, border: `1px solid ${theme.secondary}22` }}>
          <h3 className="font-heading font-bold text-[17px] m-0 mb-1" style={{ color: theme.text }}>Shoot & Long-Stay Enquiry</h3>
          <p className="m-0 mb-5 text-[14px]" style={{ color: theme.muted }}>Tell us your requirement and we’ll check what’s available in our network.</p>
          {venture.email && <VentureEnquiryForm fields={shootFields} email={venture.email} subject={`Shoot / Long-Stay Enquiry — ${venture.name}`} theme={theme} />}
        </div>
      </motion.section>

      <VenturePhotoGallery venture={venture} heading="Properties & Services" />
      <VentureFaqSection venture={venture} />
    </div>
  );
}
