// Kartu baca-saja tahap D Komunikasi & E.1 Rencana Implementasi pada tab Ikhtisar detail MOC.
// Isiannya dilakukan lewat MocActionsPanel; di sini hanya ditampilkan apa yang tercatat.
import React from "react";
import { MOC_FINAL_QUESTIONS, MOC_MONITOR_OUTCOME_LABEL, type MocRequest, type MocTrackedItem } from "@/lib/domain/moc";

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

function TrackedList({ title, rows }: { title: string; rows: MocTrackedItem[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="sm:col-span-2">
      <dt className="text-[11.5px] text-[#6b6e72] mb-1">{title}</dt>
      <dd className="overflow-x-auto">
        <table className="w-full text-[12.5px] border border-[#EDF0F2]">
          <thead className="bg-[#F4F7F8] text-left text-[#6b6e72]">
            <tr>{["Uraian", "Keterangan", "Tahapan", "PIC", "Target", "Status"].map((h) => <th key={h} className="px-2 py-1 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#EDF0F2] align-top">
                <td className="px-2 py-1">{r.item}</td>
                <td className="px-2 py-1">{r.keterangan || "—"}</td>
                <td className="px-2 py-1">{r.tahapan || "—"}</td>
                <td className="px-2 py-1">{r.pic || "—"}</td>
                <td className="px-2 py-1 whitespace-nowrap">{r.targetDate ? fmtDate(r.targetDate) : "—"}</td>
                <td className="px-2 py-1">{r.status || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </dd>
    </div>
  );
}

const SECTION = "text-[11px] font-bold uppercase tracking-wide text-[#6b6e72] mb-1.5 pt-3 border-t border-[#EDF0F2]";

const NotYet = ({ what }: { what: string }) => <p className="text-[12.5px] text-[#9a9da0]">{what} belum dicatat.</p>;

export default function MocImplementationPrep({ moc }: { moc: MocRequest }) {
  if (moc.validationState !== "registered") return null;
  const c = moc.communication;
  const p = moc.implementationPlan;

  return (
    <div className={`${CARD} p-5`}>
      <h2 className="text-[13.5px] font-bold text-[#0F172A] mb-3">Implementasi, Pemantauan & Penutupan</h2>

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

      {(moc.registerStatus === "Pemantauan" || moc.registerStatus === "Tinjauan Akhir" || moc.registerStatus === "Closed" || moc.monitoring.length > 0) && (
        <>
          <h3 className={`${SECTION} mt-4`}>F. Pemantauan</h3>
          {moc.monitoring.length === 0 ? (
            <NotYet what="Pemantauan" />
          ) : (
            <div className="flex flex-col gap-4">
              {moc.monitoring.map((m) => (
                <dl key={m.no} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 rounded-[10px] border border-[#EDF0F2] p-3">
                  <Row label={`Pemantauan ke-${m.no}`}>{fmtDate(m.date)}</Row>
                  <Row label="Hasil">{MOC_MONITOR_OUTCOME_LABEL[m.outcome]}</Row>
                  <TrackedList title="Kegiatan yang dipantau" rows={m.activities} />
                  <TrackedList title="Aksi tindak lanjut" rows={m.followUps} />
                  {m.notes && <Row label="Catatan">{m.notes}</Row>}
                  <Row label="Dicatat oleh">{m.recordedByName} · {fmtStamp(m.recordedAt)}</Row>
                </dl>
              ))}
            </div>
          )}
        </>
      )}

      {(moc.registerStatus === "Tinjauan Akhir" || moc.registerStatus === "Closed" || moc.finalReview) && (
        <>
          <h3 className={`${SECTION} mt-4`}>G. Tinjauan Akhir</h3>
          {moc.finalReview ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              <Row label="Tanggal tinjauan">{fmtDate(moc.finalReview.date)}</Row>
              <Row label="Dicatat oleh">{moc.finalReview.recordedByName} · {fmtStamp(moc.finalReview.recordedAt)}</Row>
              {MOC_FINAL_QUESTIONS.map((q, i) => (
                <Row key={q} label={q}>
                  {moc.finalReview!.answers[i]?.yes ? "Ya" : "Tidak"}
                  {moc.finalReview!.answers[i]?.keterangan ? ` — ${moc.finalReview!.answers[i].keterangan}` : ""}
                </Row>
              ))}
              <TrackedList title="Aksi tindak lanjut" rows={moc.finalReview.followUps} />
              {moc.finalReview.reviewers.length > 0 && (
                <Row label="MoC Reviewer & Tim Peninjau Akhir">
                  {moc.finalReview.reviewers.map((r) => [r.fungsi, r.keterangan, r.tanggapan, r.tanggal ? fmtDate(r.tanggal) : ""].filter(Boolean).join(" · ")).join("\n")}
                </Row>
              )}
              {moc.finalReview.notes && <Row label="Catatan">{moc.finalReview.notes}</Row>}
            </dl>
          ) : (
            <NotYet what="Tinjauan akhir" />
          )}
        </>
      )}

      {moc.closure && (
        <>
          <h3 className={`${SECTION} mt-4`}>H. Penutupan</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            <Row label="Ditutup">{fmtStamp(moc.closure.closedAt)}</Row>
            <Row label="Oleh">{moc.closure.closedByName}{moc.closure.onBehalfOf ? ` (atas nama Approver ${moc.closure.onBehalfOf})` : ""}</Row>
            <Row label="Catatan penutupan">{moc.closure.note}</Row>
          </dl>
        </>
      )}
    </div>
  );
}
