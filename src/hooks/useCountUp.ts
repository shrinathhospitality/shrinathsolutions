import { useEffect, useRef, useState } from 'react';

/** Counts up to each target once the element scrolls into view. Respects reduced motion. */
export function useCountUp(targets: number[], duration = 1400) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [values, setValues] = useState<number[]>(() => targets.map(() => 0));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValues(targets);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setValues(targets.map((t) => Math.round(t * eased)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targets, duration]);

  return { ref, values };
}
