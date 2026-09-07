import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Animates a displayed number from its previous value up (or down) to
// `target` whenever `target` changes — e.g. once a stat card's real Supabase
// count actually loads, instead of the number just appearing. Respects
// prefers-reduced-motion (jumps straight to the final value, no tween).
export function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(target)) { setDisplay(0); fromRef.current = 0; return; }
    if (prefersReducedMotion()) { setDisplay(target); fromRef.current = target; return; }

    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) { raf = requestAnimationFrame(tick); }
      else { fromRef.current = target; }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}
