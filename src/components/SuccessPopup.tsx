"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// Popup kecil di tengah layar berisi HANYA centang beranimasi, penanda aksi yang
// BERHASIL. Tanpa teks (pesan hanya untuk pembaca layar). Menutup sendiri (atau klik
// di mana saja). Prefers-reduced-motion: tampil statis lalu menutup.
//
// Gerak dibuat mengalir, bukan kaku: semua easing melambat di ujung (expo/power),
// lingkaran digambar dan centang menyusul sebelum lingkaran selesai (tumpang tindih),
// lalu satu denyut kecil dan riak yang memudar. Hanya transform, opacity, dan
// stroke-dashoffset yang dianimasikan, jadi ringan.
export default function SuccessPopup({ message, onClose }: { message: string; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ onComplete: onClose });
        tl.fromTo(".sp-backdrop", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" })
          .fromTo(".sp-card", { scale: 0.9, y: 16, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, 0.02)
          .fromTo(".sp-fill", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }, 0.12)
          .fromTo(".sp-circle", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.75, ease: "power2.inOut" }, 0.12)
          .fromTo(".sp-check", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, 0.55)
          .fromTo(".sp-icon", { scale: 1 }, { scale: 1.07, duration: 0.2, ease: "power2.out", yoyo: true, repeat: 1 }, 0.98)
          .fromTo(".sp-ripple", { opacity: 0.4, scale: 1 }, { opacity: 0, scale: 1.55, duration: 0.8, ease: "power2.out" }, 0.98)
          .to({}, { duration: 0.7 })
          .to(".sp-card", { scale: 0.96, y: -6, opacity: 0, duration: 0.32, ease: "power2.in" })
          .to(".sp-backdrop", { opacity: 0, duration: 0.32, ease: "power1.in" }, "<");
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".sp-circle, .sp-check", { strokeDashoffset: 0 });
        gsap.set(".sp-fill", { opacity: 1 });
        gsap.delayedCall(1.8, onClose);
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
      <div className="sp-card w-[132px] bg-white rounded-[14px] p-6 flex items-center justify-center shadow-[0_20px_60px_rgba(15,23,42,.25)] will-change-transform">
        <svg className="sp-icon" width="76" height="76" viewBox="0 0 76 76" aria-hidden style={{ overflow: "visible" }}>
          <circle className="sp-fill" cx="38" cy="38" r="31" fill="#15803D" fillOpacity="0.1" style={{ transformOrigin: "38px 38px" }} />
          <circle className="sp-ripple" cx="38" cy="38" r="31" fill="none" stroke="#15803D" strokeWidth="2" opacity="0" style={{ transformOrigin: "38px 38px" }} />
          <circle className="sp-circle" cx="38" cy="38" r="31" fill="none" stroke="#15803D" strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} transform="rotate(-90 38 38)" />
          <path className="sp-check" d="M24 39.5 L34 49 L53 28" fill="none" stroke="#15803D" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} />
        </svg>
        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
}
