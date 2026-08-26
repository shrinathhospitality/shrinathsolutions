import { motion, useScroll } from 'framer-motion';

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[60] origin-left"
      style={{
        height: 3,
        scaleX: scrollYProgress,
        background: 'linear-gradient(90deg,#3b6bff,#22d3ee 55%,#ff7a2f)',
        boxShadow: '0 0 14px rgba(59,107,255,.8)',
      }}
    />
  );
}
