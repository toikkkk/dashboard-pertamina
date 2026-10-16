"use client";

// Tombol "Tandai ditinjau" dua langkah (klik → Konfirmasi) supaya tidak tercatat karena salah klik. Mencatat
// evaluasi tahunan dokumen (masih valid, tanpa unggah ulang); tanggal terbit dan masa berlaku tidak berubah.
import React, { useEffect, useRef, useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { usePsi } from "@/lib/psiStore";

export default function ReviewButton({
  docId,
  location,
  className = "",
  onDone,
}: {
  docId: string;
  location: string;
  className?: string;
  /** Dipanggil setelah berhasil dicatat (mis. memuat ulang halaman dokumen). */
  onDone?: () => void;
}) {
  const { activeUser, markReviewed } = usePsi();
  const [step, setStep] = useState<"idle" | "confirm" | "saving" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const canWrite = !!activeUser.isRegionalAdmin || activeUser.location === location;
  if (!canWrite) return null;

  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };
  const onClick = async (e: React.MouseEvent) => {
    stop(e);
    if (step === "saving") return;
    if (step !== "confirm") {
      setStep("confirm");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStep("idle"), 4000);
      return;
    }
    setStep("saving");
    try {
      await markReviewed(docId);
      onDone?.();
      setStep("idle");
    } catch {
      setStep("error");
      timer.current = setTimeout(() => setStep("idle"), 4000);
    }
  };

  const label = step === "confirm" ? "Ya, masih valid" : step === "saving" ? "Menyimpan" : step === "error" ? "Gagal, ulangi" : "Masih valid";
  const tone =
    step === "confirm" ? "border-[#0F3B59] bg-[#0F3B59] text-white" : step === "error" ? "border-[#DC2626] text-[#DC2626]" : "border-[#C5CED3] text-[#0F3B59] hover:border-[#0F3B59] hover:bg-[#EEF3F6]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={step === "saving"}
      title="Catat bahwa dokumen sudah dicek dan masih valid, tanpa unggah ulang. Tanggal terbit dan masa berlaku tidak berubah."
      className={`inline-flex items-center gap-1.5 rounded-[8px] border bg-white px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap transition-colors duration-150 ${tone} ${className}`}
    >
      {step === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} /> : <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.2} />}
      {label}
    </button>
  );
}
