// Kartu baca-saja tahap D Komunikasi & E.1 Rencana Implementasi pada tab Ikhtisar detail MOC.
// Isiannya dilakukan lewat MocActionsPanel; di sini hanya ditampilkan apa yang tercatat.
import React from "react";
import type { MocRequest } from "@/lib/domain/moc";

const CARD = "bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)]";
const fmtDate = (ymd: string) => (ymd ? new Date(ymd + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtStamp = (iso: string) => new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] text-[#6b6e72]">{label}</dt>
      <dd className="text-[13px] text-[#0F172A] whitespace-pre-line">{children}</dd>
    </div>
  );
}

const NotYet = ({ what }: { what: string }) => <p className="text-[12.5px] text-[#9a9da0]">{what} belum dicatat.</p>;

export default function MocImplementationPrep({ moc }: { moc: MocRequest }) {
  if (moc.validationState !== "registered") return null;
  const c = moc.communication;
  const p = moc.implementationPlan;

  return (
    <div className={`${CARD} p-5`}>
      <h2 className="text-[13.5px] font-bold text-[#0F172A] mb-3">Komunikasi & Rencana Implementasi</h2>

      <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#6b6e72] mb-1.5">D. Komunikasi</h3>
      {c ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-4">
          <Row label="Yang dikomunikasikan">{c.items.join("\n")}</Row>
          <Row label="Media">{c.media.map((m) => (m === "Lainnya" && c.mediaOther ? `Lainnya: ${c.mediaOther}` : m)).join(", ")}</Row>
          <Row label="Tanggal">{fmtDate(c.date)}</Row>
          <Row label="Kepada">{c.audience}</Row>
          {c.notes && <Row label="Catatan">{c.notes}</Row>}
          <Row label="Dicatat oleh">{c.recordedByName} · {fmtStamp(c.recordedAt)}</Row>
        </dl>
      ) : (
        <div className="mb-4"><NotYet what="Komunikasi" /></div>
      )}

      <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#6b6e72] mb-1.5 pt-3 border-t border-[#EDF0F2]">E.1 Rencana Implementasi</h3>
      {p ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          <Row label="Rencana teknis">{p.technicalPlan}</Row>
          <Row label="Rencana pemantauan">{p.monitoringPlan}</Row>
          <Row label="Milestone">{p.milestones.map((m) => `${fmtDate(m.targetDate)} — ${m.label}`).join("\n")}</Row>
          {p.documentationPlan && <Row label="Rencana dokumentasi">{p.documentationPlan}</Row>}
          <Row label="Untuk Performer">{moc.performerName ?? "—"}</Row>
          <Row label="Dicatat oleh">{p.recordedByName} · {fmtStamp(p.recordedAt)}</Row>
        </dl>
      ) : (
        <NotYet what="Rencana implementasi" />
      )}
    </div>
  );
}
