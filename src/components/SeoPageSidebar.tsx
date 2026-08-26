import { Phone, MessageCircle, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { site, wa } from '../data/site';
import { emberBtn, ghostBtn, muted } from '../styles/theme';
import type { Heading } from '../lib/extractHeadings';

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-[20px]" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  );
}

export default function SeoPageSidebar({ headings, targetLocation }: { headings: Heading[]; targetLocation: string | null }) {
  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <h3 className="font-heading font-bold text-[16px] m-0 mb-1.5">Have a project in mind?</h3>
        <p className="m-0 text-[14px]" style={{ color: muted, lineHeight: 1.6 }}>
          {targetLocation ? `We work with businesses in ${targetLocation} and beyond.` : 'Tell us what you need — we’ll reply with a clear, fixed quote.'}
        </p>
        <div className="grid gap-2.5 mt-5">
          <Link to="/contact" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-heading font-bold text-[14.5px]" style={emberBtn}>
            <Phone size={15} aria-hidden="true" /> Get a Free Quote
          </Link>
          <a href={wa()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-[14.5px]" style={ghostBtn}>
            <MessageCircle size={15} aria-hidden="true" /> WhatsApp {site.phone}
          </a>
        </div>
      </Panel>

      {headings.length > 1 && (
        <Panel>
          <h3 className="flex items-center gap-2 font-heading font-bold text-[14.5px] m-0 mb-3.5">
            <List size={16} style={{ color: 'var(--color-primary)' }} aria-hidden="true" /> On this page
          </h3>
          <nav className="flex flex-col gap-2.5">
            {headings.map((h) => (
              <a key={h.id} href={`#${h.id}`} className="text-[14px] leading-snug !text-[var(--color-body)] hover:!text-[var(--color-primary)]">
                {h.text}
              </a>
            ))}
          </nav>
        </Panel>
      )}
    </div>
  );
}
