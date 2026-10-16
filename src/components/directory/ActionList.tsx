"use client";

// Daftar tindak lanjut dari chip "Perlu tindakan": kedaluwarsa, berakhir ≤90 hari, belum
// diperbarui >12 bulan (dokumen), dan "Belum ada dokumen" (sub-dokumen Excel yang masih
// kosong per lokasi). Setiap baris menunjukkan jalurnya (Lokasi › Sub-dokumen) dan bisa diklik.
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { DocumentItem } from "@/lib/domain/types";
import { docsByExpiryBucket, psiInsights } from "@/lib/domain/dashboard";
import { PSI_CHAPTERS } from "@/lib/domain/psiSubChapters";
import type { DirectoryOverview } from "@/lib/useDocumentCategories";

export type ActionKind = "kedaluwarsa" | "segera" | "stale" | "kosong";

export const ACTION_META: Record<ActionKind, { label: string; color: string }> = {
  kedaluwarsa: { label: "Kedaluwarsa", color: "#DC2626" },
  segera: { label: "Berakhir ≤ 90 hari", color: "#B45309" },
  stale: { label: "Belum diperbarui > 12 bln", color: "#6D28D9" },
  kosong: { label: "Belum ada dokumen", color: "#6b6e72" },
};

const fmtDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};
const PAGE = 50;

interface Row {
  id: string;
  title: string;
  path: string;
  note: string;
  noteColor: string;
}

function rowsFor(kind: Exclude<ActionKind, "kosong">, docs: DocumentItem[]): Row[] {
  const nowMs = Date.now();
  const ins = psiInsights(docs, nowMs);
  const path = (d: DocumentItem) => `${d.location}${d.categoryName ? ` › ${d.categoryName}` : ""}`;
  if (kind === "kedaluwarsa") {
    return [...ins.overdue]
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
      .map((d) => ({ id: d.id, title: d.title, path: path(d), note: `Kedaluwarsa ${fmtDate(d.expiryDate)}`, noteColor: "#DC2626" }));
  }
  if (kind === "segera") {
    return ins.expiring.map(({ doc, daysLeft }) => ({ id: doc.id, title: doc.title, path: path(doc), note: `Berakhir ${fmtDate(doc.expiryDate)} · ${daysLeft} hari lagi`, noteColor: daysLeft <= 30 ? "#DC2626" : "#B45309" }));
  }
  return ins.stale.map(({ doc, lastUpdate, months }) => ({ id: doc.id, title: doc.title, path: path(doc), note: `Terbit ${fmtDate(new Date(lastUpdate).toISOString().slice(0, 10))} · ${months} bln lalu`, noteColor: "#6D28D9" }));
}

function DocRows({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [shown, setShown] = useState(PAGE);
  return (
    <>
      <div className="bg-white border border-[#D8E1E4] rounded-[14px] overflow-hidden">
        {rows.slice(0, shown).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => router.push(`/document/${r.id}`)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left border-b border-[#EEF2F4] last:border-b-0 hover:bg-[#F5F7F9] transition-colors duration-150"
          >
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#0F172A] truncate">{r.title}</div>
              <div className="text-[11px] text-[#6b6e72] truncate">{r.path}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-mono tabular-nums" style={{ color: r.noteColor }}>{r.note}</span>
              <ChevronRight className="w-4 h-4 text-[#c3c6c9]" strokeWidth={2} />
            </div>
          </button>
        ))}
      </div>
      {rows.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mt-3 w-full text-[12.5px] font-bold px-3.5 py-2.5 rounded-[8px] border border-dashed border-[#C5CED3] text-[#6b6e72] hover:border-[#0F3B59] hover:text-[#0F3B59] transition-all duration-200"
        >
          Tampilkan {Math.min(PAGE, rows.length - shown)} lagi ({rows.length - shown} tersisa)
        </button>
      )}
    </>
  );
}

function EmptyCells({ overview, scope, onOpen }: { overview: DirectoryOverview; scope: string[] | null; onOpen: (location: string, categoryId: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = useMemo(
    () =>
      overview.locations
        .filter((l) => !scope || scope.includes(l.name))
        .map((l) => ({
          name: l.name,
          empty: overview.items.filter((it) => (overview.cells[l.name]?.[it.name]?.n ?? 0) === 0),
        }))
        .filter((g) => g.empty.length > 0)
        .sort((a, b) => b.empty.length - a.empty.length || a.name.localeCompare(b.name)),
    [overview, scope]
  );
  if (groups.length === 0) return <p className="py-14 text-center text-[13px] text-[#9a9da0]">Semua sub-dokumen sudah terisi.</p>;
  return (
    <div className="bg-white border border-[#D8E1E4] rounded-[14px] overflow-hidden">
      {groups.map((g) => {
        const isOpen = open === g.name;
        return (
          <div key={g.name} className="border-b border-[#EEF2F4] last:border-b-0">
            <button type="button" onClick={() => setOpen(isOpen ? null : g.name)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F5F7F9]">
              <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[#0F172A]">
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.2} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />}
                {g.name}
              </span>
              <span className="text-[11px] font-mono tabular-nums text-[#6b6e72]">{g.empty.length} dari {overview.total} masih kosong</span>
            </button>
            {isOpen && (
              <div className="bg-[#FAFBFC] pb-2">
                {PSI_CHAPTERS.map((ch) => {
                  const items = g.empty.filter((it) => it.chapter === ch.key);
                  if (items.length === 0) return null;
                  return (
                    <div key={ch.key} className="px-4 pt-2">
                      <div className="text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase mb-1">{ch.title}</div>
                      {items.map((it) => (
                        <button
                          key={it.name}
                          type="button"
                          onClick={() => onOpen(g.name, overview.cells[g.name][it.name].id)}
                          className="w-full flex items-start gap-2 px-2 py-1.5 rounded-[6px] text-left text-[12.5px] text-[#0F172A] hover:bg-white"
                        >
                          <span className="font-mono text-[#9a9da0] flex-shrink-0">{it.no}.</span>
                          <span>{it.name}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ActionList({
  kind,
  docs,
  overview,
  scope,
  onOpen,
}: {
  kind: ActionKind;
  docs: DocumentItem[];
  overview: DirectoryOverview | null;
  scope: string[] | null;
  onOpen: (location: string, categoryId: string) => void;
}) {
  const rows = useMemo(() => (kind === "kosong" ? [] : rowsFor(kind, docs)), [kind, docs]);
  const meta = ACTION_META[kind];
  return (
    <div>
      <h2 className="font-heading text-[16px] font-bold text-[#0F172A] mb-3 flex items-center gap-2">
        <span className="w-2.5 h-[3px] rounded-full" style={{ background: meta.color }} aria-hidden />
        {meta.label}
        {kind !== "kosong" && <span className="font-mono text-[12px] font-normal text-[#6b6e72]">{rows.length}</span>}
      </h2>
      {kind === "kosong" ? (
        overview ? <EmptyCells overview={overview} scope={scope} onOpen={onOpen} /> : <p className="py-14 text-center text-[13px] text-[#9a9da0]">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="py-14 text-center text-[13px] text-[#9a9da0]">Tidak ada dokumen dalam kategori ini.</p>
      ) : (
        <DocRows rows={rows} />
      )}
    </div>
  );
}

// Daftar dokumen yang berakhir pada satu tahun (tujuan klik kolom "Jadwal kedaluwarsa" di dashboard).
export function ExpiryYearList({ bucket, docs }: { bucket: string; docs: DocumentItem[] }) {
  const now = Date.now();
  const thisYear = new Date(now).getFullYear();
  const rows = useMemo(
    () =>
      docsByExpiryBucket(docs, bucket, now).map((d) => {
        const daysLeft = Math.ceil((new Date(`${d.expiryDate}T00:00:00`).getTime() - now) / 86_400_000);
        return {
          id: d.id,
          title: d.title,
          path: `${d.location}${d.categoryName ? ` › ${d.categoryName}` : ""}`,
          note: `Berakhir ${fmtDate(d.expiryDate)} · ${daysLeft} hari lagi`,
          noteColor: daysLeft <= 90 ? "#B45309" : "#0F3B59",
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucket, docs]
  );
  const label = bucket === "later" ? `Berakhir ${thisYear + 5} ke atas` : `Berakhir tahun ${bucket}`;
  return (
    <div>
      <h2 className="font-heading text-[16px] font-bold text-[#0F172A] mb-3 flex items-center gap-2">
        <span className="w-2.5 h-[3px] rounded-full" style={{ background: "#0F3B59" }} aria-hidden />
        {label}
        <span className="font-mono text-[12px] font-normal text-[#6b6e72]">{rows.length}</span>
      </h2>
      {rows.length === 0 ? <p className="py-14 text-center text-[13px] text-[#9a9da0]">Tidak ada dokumen yang berakhir pada periode ini.</p> : <DocRows rows={rows} />}
    </div>
  );
}
