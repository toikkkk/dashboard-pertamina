"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Download, FileText, Printer } from "lucide-react";
import { MOC_FORMS, MocFormSheet, type MocFormKey } from "@/components/MocSheet";
import { downloadSheetAsWord, mocFilename, printAsPdf } from "@/lib/mocDownload";
import type { MocRequest } from "@/lib/domain/moc";

// Penampil formulir MoC: pilih Lampiran 5 / 6 / 7, lalu unduh (Word), unduh PDF
// (dialog cetak), atau buka halaman cetak. `standalone` dipakai halaman cetak.
export default function MocFormViewer({
  moc,
  initialForm = "pengusulan",
  standalone = false,
  autoPrint = false,
  monitoringNo,
}: {
  moc: MocRequest;
  initialForm?: MocFormKey;
  standalone?: boolean;
  autoPrint?: boolean;
  /** Nomor pemantauan yang dicetak pada Lampiran 6 (bawaan: terbaru). */
  monitoringNo?: number;
}) {
  const [form, setForm] = useState<MocFormKey>(initialForm);
  const sheetRef = useRef<HTMLDivElement>(null);
  const meta = MOC_FORMS.find((f) => f.key === form)!;
  const filename = mocFilename(moc, meta.filename);

  React.useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => printAsPdf(filename), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  const btn =
    "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-bold rounded-full border transition-colors";

  return (
    <div>
      <div className="no-print flex items-center gap-2 flex-wrap mb-3">
        <div role="tablist" aria-label="Formulir MoC" className={`flex gap-1.5 flex-wrap mr-auto${standalone ? " hidden" : ""}`}>
          {MOC_FORMS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={form === f.key}
              type="button"
              onClick={() => setForm(f.key)}
              className={`px-3.5 py-1.5 text-[12.5px] font-bold rounded-full border transition-colors ${
                form === f.key ? "bg-[#0F3B59] border-[#0F3B59] text-white" : "border-[#C5CED3] text-[#0F172A] hover:border-[#0F3B59] bg-white"
              }`}
            >
              {f.label} <span className="font-normal opacity-75">· {f.lampiran}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => downloadSheetAsWord(sheetRef.current?.innerHTML ?? "", filename)} className={`${btn} border-[#C5CED3] text-[#0F172A] hover:border-[#0F3B59] bg-white`}>
          <FileText className="w-3.5 h-3.5" strokeWidth={2} /> Unduh Word
        </button>
        {standalone ? (
          <button type="button" onClick={() => printAsPdf(filename)} className={`${btn} border-[#0F3B59] bg-[#0F3B59] text-white hover:bg-[#0B2C43]`}>
            <Download className="w-3.5 h-3.5" strokeWidth={2} /> Unduh PDF
          </button>
        ) : (
          <Link href={`/moc/${moc.id}/cetak?form=${form}&print=1`} target="_blank" className={`${btn} border-[#0F3B59] bg-[#0F3B59] text-white hover:bg-[#0B2C43]`}>
            <Download className="w-3.5 h-3.5" strokeWidth={2} /> Unduh PDF
          </Link>
        )}
        {!standalone && (
          <Link href={`/moc/${moc.id}/cetak?form=${form}`} target="_blank" className={`${btn} border-[#C5CED3] text-[#0F172A] hover:border-[#0F3B59] bg-white`}>
            <Printer className="w-3.5 h-3.5" strokeWidth={2} /> Cetak
          </Link>
        )}
      </div>

      {form !== "pengusulan" && (
        <p className="no-print text-[11.5px] text-[#6b6e72] mb-2.5">
          Informasi MoC dan isian yang sudah dicatat di aplikasi terisi otomatis. Bagian yang belum dicatat dibiarkan kosong; tanda tangan dilakukan
          di luar aplikasi, lalu form bertanda tangan diunggah Controller.
        </p>
      )}

      <div className="overflow-x-auto print:overflow-visible">
        <div ref={sheetRef} className="moc-min-w" style={{ minWidth: 860 }}>
          <MocFormSheet moc={moc} form={form} no={monitoringNo} />
        </div>
      </div>
    </div>
  );
}
