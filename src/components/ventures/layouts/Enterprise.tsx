import { motion } from 'framer-motion';
import type { Venture } from '../../../types/venture';
import { VentureContactRow } from '../primitives';
import { VentureIcon } from '../ventureIcons';
import { VenturePhotoGallery } from '../VenturePhotoGallery';
import { VentureFaqSection } from '../VentureFaqSection';
import { VentureTextSections } from '../VentureTextSections';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };

const applications = ['Hotels', 'Offices', 'Institutions', 'Residences', 'Commercial Properties'];
const workflow = [
  { num: '01', title: 'Consultation', body: 'We review your property, entry points and current gaps.' },
  { num: '02', title: 'Supply Options', body: 'We discuss suitable equipment and supply options for your needs.' },
  { num: '03', title: 'Installation Enquiry', body: 'We outline what installation support would look like for your property.' },
  { num: '04', title: 'Ongoing Support', body: 'A local point of contact for follow-up and support questions.' },
];
const checklist = [
  'Entry and exit points that need coverage',
  'Number of internal communication lines required',
  'Vehicle access points needing barrier control',
  'Existing hardware that needs replacing or extending',
];

export default function Enterprise({ venture }: { venture: Venture }) {
  const { theme } = venture;
  return (
    <div className="font-body">
      {/* Hero */}
      <section className="mx-auto max-w-shell px-[22px] pt-6 pb-4">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: theme.primary }}>Technology & Security</div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-heading font-extrabold text-[clamp(30px,4vw,46px)] leading-[1.1] mt-3.5 mb-0"
              style={{ color: theme.text }}
            >
              {venture.tagline}
            </motion.h1>
            <p className="text-[16.5px] mt-5 max-w-[540px]" style={{ color: theme.muted, lineHeight: 1.75 }}>{venture.summary}</p>
            <div className="mt-7"><VentureContactRow venture={venture} theme={theme} /></div>
          </div>
          <div
            className="rounded-[24px] aspect-[4/3] relative overflow-hidden p-6"
            style={{ background: theme.surface, border: `1px solid ${theme.muted}` }}
            aria-hidden="true"
          >
            <div className="absolute inset-0 opacity-[.5]" style={{ backgroundImage: `linear-gradient(${theme.primary}14 1px, transparent 1px), linear-gradient(90deg, ${theme.primary}14 1px, transparent 1px)`, backgroundSize: '28px 28px' }} />
            <div className="relative grid grid-cols-3 gap-3 h-full">
              {venture.services.slice(0, 6).map((s) => (
                <div key={s.title} className="rounded-[14px] grid place-items-center" style={{ background: '#fff', border: `1px solid ${theme.muted}` }}>
                  <VentureIcon name={s.icon} size={22} className="opacity-80" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <VentureTextSections venture={venture} />

      {/* Solution categories */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Solution Categories</h2>
        <div className="grid gap-4 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {venture.services.map((s) => (
            <div key={s.title} className="p-5 rounded-[16px]" style={{ border: `1px solid ${theme.muted}`, background: theme.surface }}>
              <span className="grid place-items-center rounded-[10px]" style={{ width: 40, height: 40, background: `${theme.primary}14`, color: theme.primary }}>
                <VentureIcon name={s.icon} size={19} />
              </span>
              <h3 className="font-heading font-bold text-[16px] mt-3.5 mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[13.8px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Applications */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Where We Work</h2>
        <div className="flex flex-wrap gap-2.5 mt-6">
          {applications.map((a) => (
            <span key={a} className="px-4 py-2.5 rounded-full text-[14px] font-semibold" style={{ background: `${theme.primary}0f`, color: theme.primary }}>{a}</span>
          ))}
        </div>
      </motion.section>

      {/* Workflow */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Consultation to Support</h2>
        <div className="grid gap-3.5 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map((s) => (
            <div key={s.num} className="p-5 rounded-[16px]" style={{ border: `1px solid ${theme.muted}`, background: theme.surface }}>
              <div className="font-heading font-extrabold text-[13px] tracking-[.1em]" style={{ color: theme.accent }}>{s.num}</div>
              <h3 className="font-heading font-bold text-[15px] mt-2 mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[13.5px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* System planning checklist */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>System Planning Checklist</h2>
        <div className="grid gap-2.5 mt-6 max-w-[640px]">
          {checklist.map((c) => (
            <div key={c} className="flex gap-3 px-4.5 py-3.5 rounded-[14px]" style={{ border: `1px solid ${theme.muted}`, background: theme.surface }}>
              <span style={{ color: theme.primary, flex: 'none' }}>✓</span>
              <span className="text-[14.5px]" style={{ color: theme.text }}>{c}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <VenturePhotoGallery venture={venture} heading="Systems We Work With" />
      <VentureFaqSection venture={venture} />
    </div>
  );
}
