import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { site, wa } from '../data/site';
import { emberBtn, ghostBtn } from '../styles/theme';

type Props = {
  kicker: string;
  h1: string;
  intro: string;
  ctaLabel: string;
  aside?: ReactNode;
  notes?: string[];
};

export default function Hero({ kicker, h1, intro, ctaLabel, aside, notes }: Props) {
  return (
    <section className="mx-auto max-w-shell px-[22px] pt-10 grid gap-11 items-center" style={{ gridTemplateColumns: aside ? 'repeat(auto-fit, minmax(330px, 1fr))' : '1fr' }}>
      <div>
        <div className="text-[13px] uppercase tracking-[.18em]" style={{ color: '#7dd3fc' }}>{kicker}</div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="font-heading font-extrabold text-[clamp(33px,4.6vw,56px)] leading-[1.06] mt-4 mb-0"
          style={{ letterSpacing: '-0.03em' }}
        >
          {h1}
        </motion.h1>
        <p className="text-[18.5px] mt-5 max-w-[660px]" style={{ color: 'rgba(226,234,255,.74)' }}>{intro}</p>
        <div className="flex flex-wrap gap-3.5 mt-7">
          <Link to="/contact" className="px-7 py-4 rounded-full font-heading font-bold text-[16px]" style={emberBtn}>{ctaLabel}</Link>
          <a href={wa()} target="_blank" rel="noopener noreferrer" className="px-7 py-4 rounded-full font-bold text-[16px]" style={ghostBtn}>
            WhatsApp {site.phone}
          </a>
        </div>
        {notes && (
          <div className="flex flex-wrap gap-6 mt-7 text-[14.5px]" style={{ color: 'rgba(214,225,255,.6)' }}>
            {notes.map((n) => <span key={n}>{n}</span>)}
          </div>
        )}
      </div>
      {aside}
    </section>
  );
}
