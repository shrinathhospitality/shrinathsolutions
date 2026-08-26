import { motion } from 'framer-motion';
import type { Venture } from '../../../types/venture';
import { VentureContactRow } from '../primitives';
import { VentureIcon } from '../ventureIcons';
import { VenturePhotoGallery } from '../VenturePhotoGallery';
import { VentureFaqSection } from '../VentureFaqSection';
import { VentureTextSections } from '../VentureTextSections';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };

const orderSteps = [
  { num: '01', title: 'Share Your Requirement', body: 'Tell us the wording, layout and stamp type you need — by phone or in person.' },
  { num: '02', title: 'Approve the Details', body: 'We confirm the exact layout with you before anything goes into production.' },
  { num: '03', title: 'Production', body: 'Your stamp is made to the approved specification.' },
  { num: '04', title: 'Collection / Delivery Enquiry', body: 'Let us know how you’d like to collect your stamp — we’ll confirm what’s possible.' },
];

const useCases = ['Offices', 'Hotels', 'Schools', 'Shops', 'Professionals'];

export default function RubberStamp({ venture }: { venture: Venture }) {
  const { theme } = venture;
  return (
    <div className="font-body">
      {/* Heritage hero */}
      <section className="mx-auto max-w-shell px-[22px] pt-6 pb-4">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: theme.primary }}>Legacy Business · Est. Local Craft</div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-heading font-extrabold text-[clamp(30px,4vw,46px)] leading-[1.1] mt-3.5 mb-0"
              style={{ color: theme.text }}
            >
              40 Years of Rubber Stamp Craftsmanship
            </motion.h1>
            <p className="text-[16.5px] mt-5 max-w-[520px]" style={{ color: theme.muted, lineHeight: 1.75 }}>{venture.summary}</p>
            <div className="mt-7"><VentureContactRow venture={venture} theme={theme} /></div>
          </div>
          <div
            className="rounded-[28px] aspect-[4/3] flex items-center justify-center relative overflow-hidden"
            style={{ background: `radial-gradient(circle at 30% 20%, ${theme.accent}33, transparent 60%), ${theme.surface}`, border: `1px solid ${theme.secondary}22` }}
          >
            <div
              className="w-[64%] aspect-square rounded-full grid place-items-center"
              style={{ border: `3px solid ${theme.primary}`, transform: 'rotate(-8deg)' }}
              aria-hidden="true"
            >
              <span className="font-heading font-extrabold text-[15px] uppercase tracking-[.14em] text-center px-6" style={{ color: theme.primary }}>
                Shrinath<br />Rubber Stamp<br /><span className="text-[11px] font-bold tracking-[.2em]">JAISALMER</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <VentureTextSections venture={venture} />

      {/* Products/services grid */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Stamps We Make</h2>
        <div className="grid gap-4 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {venture.services.map((s) => (
            <div key={s.title} className="p-5 rounded-[18px]" style={{ border: `1px solid ${theme.secondary}22`, background: theme.surface }}>
              <span className="grid place-items-center rounded-full" style={{ width: 40, height: 40, background: `${theme.primary}18`, color: theme.primary }}>
                <VentureIcon name={s.icon} size={19} />
              </span>
              <h3 className="font-heading font-bold text-[16.5px] mt-3.5 mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[14px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* How to order */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>How to Order</h2>
        <div className="grid gap-3.5 mt-7 sm:grid-cols-2 lg:grid-cols-4">
          {orderSteps.map((s) => (
            <div key={s.num} className="p-5 rounded-[18px]" style={{ border: `1px solid ${theme.secondary}22`, background: theme.surface }}>
              <div className="font-heading font-extrabold text-[13px] tracking-[.1em]" style={{ color: theme.accent }}>{s.num}</div>
              <h3 className="font-heading font-bold text-[15.5px] mt-2 mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[13.8px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Use cases */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Trusted Across Jaisalmer</h2>
        <div className="flex flex-wrap gap-2.5 mt-6">
          {useCases.map((c) => (
            <span key={c} className="px-4 py-2.5 rounded-full text-[14.5px] font-semibold" style={{ border: `1px solid ${theme.secondary}33`, color: theme.text }}>{c}</span>
          ))}
        </div>
      </motion.section>

      <VenturePhotoGallery venture={venture} heading="Stamps in Everyday Use" />
      <VentureFaqSection venture={venture} />
    </div>
  );
}
