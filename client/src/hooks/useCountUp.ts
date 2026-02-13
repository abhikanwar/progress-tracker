import { useEffect, useRef, useState } from "react";

type UseCountUpOptions = {
  durationMs?: number;
  start?: number;
  play?: boolean;
};

export const useCountUp = (
  target: number,
  options: UseCountUpOptions = {}
) => {
  const { durationMs = 800, start = 0, play = true } = options;
  const [value, setValue] = useState(start);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0;
    if (!play) {
      setValue(safeTarget);
      return;
    }

    if (typeof window !== "undefined") {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (reduce) {
        setValue(safeTarget);
        return;
      }
    }

    const from = Number.isFinite(start) ? start : 0;
    const diff = safeTarget - from;
    if (diff === 0) {
      setValue(safeTarget);
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / Math.max(durationMs, 1), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + diff * eased);

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [durationMs, play, start, target]);

  return value;
};
