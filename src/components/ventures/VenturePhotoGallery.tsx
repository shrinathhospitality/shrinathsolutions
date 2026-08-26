import { motion } from 'framer-motion';
import type { Venture } from '../../types/venture';
import { VentureImage } from './VentureImage';

const rise = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } };

export function VenturePhotoGallery({
  venture, heading = 'A Look at the Venture', items,
}: {
  venture: Venture; heading?: string; items?: { title: string; icon: string }[];
}) {
  const { theme } = venture;
  const tiles = items ?? venture.services.slice(0, 4);
  if (tiles.length === 0) return null;

  return (
    <motion.section {...rise} className="mx-auto max-w-shell px-[22px] pt-16">
      <h2 className="font-heading font-bold text-[clamp(23px,2.6vw,30px)] m-0" style={{ color: theme.text }}>{heading}</h2>
      <div className="grid gap-4 mt-7 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((s) => (
          <div key={s.title}>
            <VentureImage theme={theme} icon={s.icon} label={s.title} className="rounded-[16px]" />
            <div className="mt-2.5 text-[13.5px] font-semibold" style={{ color: theme.text }}>{s.title}</div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

