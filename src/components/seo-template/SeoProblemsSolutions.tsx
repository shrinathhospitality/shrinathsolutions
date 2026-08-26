import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { muted } from '../../styles/theme';

const rise = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 } };

/** Two plain panels side by side — problems vs. how we solve them. Deliberately not a grid of
 * small cards: two readable lists make the contrast clearer than six tiny boxes would. */
export default function SeoProblemsSolutions({
  heading,
  problems,
  solutions,
}: {
  heading: string;
  problems: string[];
  solutions: string[];
}) {
  return (
    <section className="mx-auto max-w-shell px-[22px] pt-16">
      <h2 className="font-heading font-bold text-[clamp(25px,2.8vw,34px)] m-0">{heading}</h2>
      <div className="grid gap-5 mt-7 md:grid-cols-2">
        <motion.div {...rise} transition={{ duration: 0.45 }} className="p-6 md:p-7 rounded-[22px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)' }}>
          <h3 className="font-heading font-bold text-[18px] m-0">Common challenges</h3>
          <div className="grid gap-3 mt-4">
            {problems.map((p) => (
              <div key={p} className="flex gap-2.5">
                <AlertCircle size={17} color="#ff9a53" className="shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-[15.3px]" style={{ color: muted, lineHeight: 1.6 }}>{p}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div {...rise} transition={{ duration: 0.45, delay: 0.08 }} className="p-6 md:p-7 rounded-[22px]" style={{ border: '1px solid rgba(255,255,255,.11)', background: 'linear-gradient(160deg, rgba(34,211,238,.08), rgba(59,107,255,.06))' }}>
          <h3 className="font-heading font-bold text-[18px] m-0">How we solve it</h3>
          <div className="grid gap-3 mt-4">
            {solutions.map((s) => (
              <div key={s} className="flex gap-2.5">
                <CheckCircle2 size={17} color="#6ee7b7" className="shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-[15.3px]" style={{ color: 'rgba(226,234,255,.82)', lineHeight: 1.6 }}>{s}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
