import { motion } from 'framer-motion';
import type { Venture } from '../../types/venture';
import { VentureImage } from './VentureImage';
import { VentureFaqAccordion } from './primitives';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 } };

/** Poster-style image beside the FAQ accordion, rather than the accordion sitting alone in a
 *  narrow column with empty space beside it. */
export function VentureFaqSection({ venture, icon }: { venture: Venture; icon?: string }) {
  const { theme } = venture;
  return (
    <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
      <div className="grid gap-8 lg:grid-cols-[0.4fr_0.6fr] items-start">
        <VentureImage
          theme={theme}
          icon={icon ?? venture.services[0]?.icon ?? 'Building2'}
          ratio="3/4"
          label={venture.name}
          className="rounded-[22px] hidden lg:block"
        />
        <div>
          <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] mb-6" style={{ color: theme.text }}>Frequently Asked Questions</h2>
          <VentureFaqAccordion faqs={venture.faqs} theme={theme} />
        </div>
      </div>
    </motion.section>
  );
}
