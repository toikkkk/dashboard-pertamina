"use client";

import { useEffect, useRef, useState } from "react";

// Angka yang menghitung naik/turun dengan halus saat pertama tampil dan setiap kali nilainya berubah
// (mis. pindah dashboard, ganti lokasi, data baru dimuat). Mulai dari angka yang sedang terlihat,
// bukan dari nol, jadi perubahan kecil terasa kecil. Dengan prefers-reduced-motion angka langsung berganti.
export default function AnimatedNumber({ value, duration = 700 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = current.current;
    if (reduce || from === target) {
      current.current = target;
      setShown(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // melambat di ujung
      const next = Math.round(from + (target - from) * eased);
      current.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{shown}</>;
}
