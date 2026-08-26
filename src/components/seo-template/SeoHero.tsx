import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { wa } from '../../data/site';
import { emberBtn, ghostBtn } from '../../styles/theme';

/** Compact hero: eyebrow, H1, one intro line, two CTAs. No side visual or stat row — kept
 * short so the page gets to the actual content fast on both city and service pages. */
export default function SeoHero({
  eyebrow,
  h1,
  intro,
  primaryCtaLabel,
  whatsappMessage,
}: {
  eyebrow: string;
  h1: string;
  intro: string;
  primaryCtaLabel: string;
  whatsappMessage: string;
}) {
  return (
    <section className="mx-auto max-w-shell px-[22px] pt-9 pb-2">
      <div className="max-w-[760px]">
        {eyebrow && (
          <div className="text-[13px] font-bold uppercase tracking-[.18em]" style={{ color: 'var(--color-primary)' }}>{eyebrow}</div>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-heading font-extrabold text-[clamp(30px,4vw,46px)] leading-[1.1] mt-3 mb-0"
          style={{ letterSpacing: '-0.02em' }}
        >
          {h1}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-[17px] mt-4 mb-0 max-w-[620px]"
          style={{ color: 'var(--color-body)', lineHeight: 1.7 }}
        >
          {intro}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="flex flex-wrap gap-3.5 mt-7"
        >
          <Link to="/contact" className="px-7 py-4 rounded-full font-heading font-bold text-[16px]" style={emberBtn}>
            {primaryCtaLabel}
          </Link>
          <a href={wa(whatsappMessage)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-7 py-4 rounded-full font-bold text-[16px]" style={ghostBtn}>
            <MessageCircle size={16} aria-hidden="true" /> Chat on WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
}
