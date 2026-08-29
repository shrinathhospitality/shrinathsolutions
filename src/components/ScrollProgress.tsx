import { useEffect, useRef } from 'react';

/**
 * Native scroll-progress bar — previously used framer-motion's useScroll/motion.div for a
 * plain linear scaleX transform, which pulled the entire framer-motion package into the
 * always-mounted Layout (every route, no code-splitting benefit possible). A rAF-throttled
 * scroll listener driving the same transform needs no animation library.
 */
export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const ticking = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const update = () => {
      ticking.current = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    };

    update();
    if (prefersReducedMotion) return;

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[60] origin-left"
      style={{
        height: 3,
        transform: 'scaleX(0)',
        background: 'linear-gradient(90deg,#3b6bff,#22d3ee 55%,#ff7a2f)',
        boxShadow: '0 0 14px rgba(59,107,255,.8)',
      }}
    />
  );
}
