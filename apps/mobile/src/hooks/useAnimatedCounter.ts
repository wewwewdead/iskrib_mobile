import {useEffect, useRef, useState} from 'react';

/**
 * Animates a number from 0 (or previous value) to the target using rAF.
 * Returns the current display value as an integer.
 */
export function useAnimatedCounter(
  target: number,
  duration = 600,
  enabled = true,
): number {
  const [display, setDisplay] = useState(0);
  const prevTarget = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }

    const from = prevTarget.current;
    const to = target;
    prevTarget.current = target;

    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      }
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [target, duration, enabled]);

  return display;
}
