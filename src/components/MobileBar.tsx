import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Mail, FileText } from 'lucide-react';
import { site, wa } from '../data/site';

/** Sticky contact bar for small screens. */
export default function MobileBar() {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 grid grid-cols-4 md:hidden" style={{ borderTop: '1px solid rgba(255,255,255,.12)', background: 'rgba(8,12,28,.92)', backdropFilter: 'blur(20px)' }}>
      <a href={site.phoneHref} className="py-3 grid place-items-center gap-0.5 text-[12px] font-semibold !text-[#dce6ff]"><Phone size={17} strokeWidth={2.75} />Call</a>
      <a href={wa()} target="_blank" rel="noopener noreferrer" className="py-3 grid place-items-center gap-0.5 text-[12px] font-semibold !text-[#6ee7b7]"><MessageCircle size={17} strokeWidth={2.75} />WhatsApp</a>
      <a href={`mailto:${site.email}`} className="py-3 grid place-items-center gap-0.5 text-[12px] font-semibold !text-[#dce6ff]"><Mail size={17} strokeWidth={2.75} />Email</a>
      <Link to="/contact" className="py-3 grid place-items-center gap-0.5 text-[12px] font-bold !text-[#ffb182]"><FileText size={17} strokeWidth={2.75} />Quote</Link>
    </div>
  );
}
