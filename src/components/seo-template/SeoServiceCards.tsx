import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { glass, muted } from '../../styles/theme';
import type { SeoServiceCard } from './types';

/** Exactly four service cards — kept to four by design so this section stays a quick scan,
 * not a wall of tiles. */
export default function SeoServiceCards({ heading, cards }: { heading: string; cards: SeoServiceCard[] }) {
  return (
    <section className="mx-auto max-w-shell px-[22px] pt-16">
      <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] m-0">{heading}</h2>
      <div className="grid gap-4 mt-7 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const content = (
            <>
              <span className="grid place-items-center" style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(59,107,255,.2)', border: '1px solid rgba(255,255,255,.16)' }}>
                <c.icon size={19} color="#7dd3fc" aria-hidden="true" />
              </span>
              <h3 className="font-heading font-bold text-[17px] mt-3.5 mb-1.5">{c.title}</h3>
              <p className="m-0 text-[14.3px]" style={{ color: muted }}>{c.body}</p>
              {c.to && (
                <span className="inline-flex items-center gap-1 mt-3.5 font-bold text-[13.5px]" style={{ color: '#7dd3fc' }}>
                  Learn more <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              )}
            </>
          );
          return (
            <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.4, delay: i * 0.06 }}>
              {c.to ? (
                <Link to={c.to} className="group block h-full p-6 rounded-[20px] !text-paper transition-all hover:-translate-y-0.5" style={glass}>
                  {content}
                </Link>
              ) : (
                <div className="h-full p-6 rounded-[20px]" style={glass}>{content}</div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
