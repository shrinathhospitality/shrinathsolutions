import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, ExternalLink, Navigation, ArrowRight } from 'lucide-react';
import type { Venture } from '../../types/venture';
import { formatIndianPhone } from '../../lib/venturePhone';

export default function VentureCard({ venture, index }: { venture: Venture; index: number }) {
  const { theme } = venture;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05 }}
      whileHover={{ y: -4 }}
      className="rounded-[22px] overflow-hidden flex flex-col"
      style={{ border: `1px solid ${theme.secondary}22`, background: '#ffffff', boxShadow: '0 10px 30px rgba(30,20,10,.06)' }}
    >
      <div className="h-[86px] shrink-0" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }} aria-hidden="true" />
      <div className="p-5 flex flex-col flex-1">
        <div className="text-[11.5px] font-bold uppercase tracking-[.1em]" style={{ color: theme.primary }}>{venture.category}</div>
        <h3 className="font-heading font-bold text-[19px] mt-1.5 mb-1.5 leading-snug" style={{ color: '#23201b' }}>{venture.name}</h3>
        <p className="m-0 text-[14px] flex-1" style={{ color: '#5b5648', lineHeight: 1.6 }}>{venture.tagline}</p>

        <div className="flex items-center gap-3 mt-4 text-[13px]" style={{ color: '#726c5c' }}>
          <span className="inline-flex items-center gap-1.5"><Phone size={13} aria-hidden="true" /> {formatIndianPhone(venture.phoneNumbers[0])}</span>
          {venture.website && <span title="Website available"><ExternalLink size={14} aria-hidden="true" /></span>}
          {venture.googleBusinessUrl && <span title="Directions available"><Navigation size={14} aria-hidden="true" /></span>}
        </div>

        <Link
          to={`/our-ventures/${venture.slug}`}
          className="group mt-5 inline-flex items-center gap-1.5 font-heading font-bold text-[14px] !text-current"
          style={{ color: theme.primary }}
        >
          View Venture <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </motion.div>
  );
}
