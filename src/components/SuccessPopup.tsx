"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// Popup kecil di tengah layar dengan centang beranimasi — menandai aksi yang BERHASIL
// terkirim. Menutup sendiri setelah ±2,4 dtk (atau klik di mana saja). Dengan
// prefers-reduced-motion: tampil statis lalu menutup tanpa animasi.
export default function SuccessPopup({
  message,
  title = "Berhasil terkirim",
  onClose,
}: {
  message: string;
  title?: string;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ onComplete: onClose });
        tl.fromTo(".sp-backdrop", { opacity: 0 }, { opacity: 1, duration: 0.18 })
          .fromTo(".sp-card", { scale: 0.82, opacity: 0, y: 8 }, { scale: 1, opacity: 1, y: 0, duration: 0.38, ease: "back.out(1.6)" }, "<")
          .fromTo(".sp-circle", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, "-=0.15")
          .fromTo(".sp-check", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" }, "-=0.05")
          .fromTo(".sp-text", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.06 }, "-=0.2")
          .to({}, { duration: 1.3 })
          .to(".sp-backdrop", { opacity: 0, duration: 0.22, ease: "power1.in" });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".sp-circle, .sp-check", { strokeDashoffset: 0 });
        gsap.delayedCall(2.2, onClose);
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [message] }
  );

  return (
    <div
      ref={root}
      role="status"
      aria-live="polite"
      onClick={onClose}
      className="sp-backdrop fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/30 px-4 cursor-pointer"
    >
      <div className="sp-card w-[min(88vw,330px)] bg-white rounded-[14px] px-6 pt-7 pb-6 text-center shadow-[0_20px_60px_rgba(15,23,42,.25)]">
        <svg width="76" height="76" viewBox="0 0 76 76" className="mx-auto mb-3.5" aria-hidden>
          <circle className="sp-circle" cx="38" cy="38" r="31" fill="none" stroke="#15803D" strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} transform="rotate(-90 38 38)" />
          <path className="sp-check" d="M24 39.5 L34 49 L53 28" fill="none" stroke="#15803D" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} />
        </svg>
        <div className="sp-text font-heading text-[16px] font-bold text-[#0F172A]">{title}</div>
        <p className="sp-text text-[12.5px] text-[#3a3d40] mt-1.5 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
