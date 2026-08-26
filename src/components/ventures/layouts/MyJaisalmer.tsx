import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import type { Venture } from '../../../types/venture';
import { VentureButton, VentureContactRow } from '../primitives';
import { VentureIcon } from '../ventureIcons';
import { VentureImage } from '../VentureImage';
import { VenturePhotoGallery } from '../VenturePhotoGallery';
import { VentureFaqSection } from '../VentureFaqSection';
import { VentureTextSections } from '../VentureTextSections';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };
const benefits = [
  { who: 'Residents', body: 'A quick reference for everyday local services without searching multiple places.' },
  { who: 'Visitors', body: 'A simpler way to explore hotels, dining and attractions beyond the obvious tourist list.' },
  { who: 'Local Businesses', body: 'A channel to be discoverable to both audiences without building a directory of your own.' },
];

export default function MyJaisalmer({ venture }: { venture: Venture }) {
  const { theme } = venture;
  const [query, setQuery] = useState('');
  return (
    <div className="font-body">
      {/* Search-style hero */}
      <section className="mx-auto max-w-shell px-[22px] pt-8 pb-4">
        <div className="max-w-[760px] mx-auto text-center">
          <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: theme.secondary }}>Local Digital Platforms</div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-heading font-extrabold text-[clamp(30px,4vw,44px)] leading-[1.1] mt-3.5 mb-0"
            style={{ color: theme.text }}
          >
            {venture.tagline}
          </motion.h1>
          <p className="text-[16.5px] mt-5" style={{ color: theme.muted, lineHeight: 1.75 }}>{venture.summary}</p>

          <form
            onSubmit={(e) => e.preventDefault()}
            role="search"
            className="mt-8 flex items-center gap-2 p-2 rounded-full mx-auto max-w-[520px]"
            style={{ border: `1.5px solid ${theme.secondary}`, background: theme.surface }}
          >
            <Search size={18} className="ml-3 shrink-0" style={{ color: theme.secondary }} aria-hidden="true" />
            <label htmlFor="directory-search" className="sr-only">Search the Jaisalmer directory</label>
            <input
              id="directory-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hotels, restaurants, taxis…"
              className="flex-1 bg-transparent outline-none text-[14.5px] py-2"
              style={{ color: theme.text }}
            />
            <button type="submit" className="px-5 py-2.5 rounded-full font-bold text-[13.5px] shrink-0" style={{ background: theme.accent, color: theme.secondary }}>
              Search
            </button>
          </form>

          <div className="mt-7"><div className="flex justify-center"><VentureContactRow venture={venture} theme={theme} /></div></div>
        </div>
        <div className="mt-10 max-w-[900px] mx-auto">
          <VentureImage theme={theme} icon="LayoutGrid" ratio="21/9" label={venture.name} className="rounded-[20px]" />
        </div>
      </section>

      {/* Directory categories */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-14">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0 text-center" style={{ color: theme.text }}>Directory Categories</h2>
        <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-4">
          {venture.services.map((s) => (
            <div key={s.title} className="p-5 rounded-[16px] text-center" style={{ border: `1px solid #e5e8f0`, background: theme.surface }}>
              <span className="grid place-items-center rounded-full mx-auto" style={{ width: 44, height: 44, background: `${theme.secondary}12`, color: theme.secondary }}>
                <VentureIcon name={s.icon} size={20} />
              </span>
              <h3 className="font-heading font-bold text-[15.5px] mt-3.5 mb-1.5" style={{ color: theme.text }}>{s.title}</h3>
              <p className="m-0 text-[13.3px]" style={{ color: theme.muted, lineHeight: 1.55 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <VentureTextSections venture={venture} />

      {/* Benefits */}
      <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
        <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>Who Benefits</h2>
        <div className="grid gap-4 mt-7 sm:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.who} className="p-5 rounded-[16px]" style={{ background: theme.surface, border: '1px solid #e5e8f0' }}>
              <h3 className="font-heading font-bold text-[16px] m-0 mb-1.5" style={{ color: theme.secondary }}>{b.who}</h3>
              <p className="m-0 text-[13.8px]" style={{ color: theme.muted, lineHeight: 1.6 }}>{b.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-7"><VentureButton to="/contact" theme={theme} variant="primary">Add Your Business</VentureButton></div>
      </motion.section>

      <VenturePhotoGallery venture={venture} heading="Explore by Category" />
      <VentureFaqSection venture={venture} />
    </div>
  );
}
