"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Pencil, Paperclip, CheckCircle2 } from "lucide-react";
import { useMocActions, useMocActor, useMocItem } from "@/lib/useMoc";
import { MOC_STATE_META } from "@/lib/domain/statusStyle";
import { MOC_REVIEW_SLA_DAYS, MOC_RISK_LEVEL_LABEL, mocWaitingOn, mocRolesOf } from "@/lib/domain/moc";
import StatusTag from "@/components/StatusTag";
import MocStageStepper from "@/components/MocStageStepper";
import MocFormViewer from "@/components/MocFormViewer";
import MocActionsPanel from "@/components/MocActionsPanel";

const CARD =
  "bg-white border border-[#C5CED3] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)]";
const OUTCOME_COLOR: Record<string, string> = { Pending: "#B45309", Sesuai: "#15803D", "Perlu Perubahan": "#6D28D9" };

export default function MocDetailPage({ params }: { params: { id: string } }) {
  const { moc, isLoading, error } = useMocItem(params.id);
  const actions = useMocActions(moc);
  const actor = useMocActor();
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 12000);
    return () => clearTimeout(t);
  }, [notice]);

  if (isLoading || (!moc && !error)) return <div className="text-[13px] text-[#6b6e72]">Memuat MOC…</div>;
  if (error || !moc) {
    return (
      <div className={`${CARD} p-6 text-[13px]`}>
        MOC tidak ditemukan. <Link href="/moc" className="font-bold text-[#0F3B59] hover:underline">Kembali ke Register</Link>
      </div>
    );
  }

  const state = MOC_STATE_META[moc.validationState];
  const waiting = mocWaitingOn(moc);
  const roles = mocRolesOf(moc, actor);
  const rounds = Array.from(new Set(moc.reviews.map((r) => r.round))).sort((a, b) => a - b);

  return (
    <div>
      <Link href="/moc" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0F3B59] hover:underline mb-3">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} /> Register MOC
      </Link>

      <div className={`${CARD} p-4 mb-4`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <span className="font-mono text-[12px] text-[#6b6e72]">{moc.mocNumber ?? "Belum bernomor"}</span>
              <StatusTag color={state.color} label={state.label} />
              <span className="text-[11.5px] text-[#6b6e72]">{moc.location} · {moc.sifatPerubahan} · putaran {moc.round}</span>
            </div>
            <h1 className="font-heading text-[19px] font-bold text-[#0F172A]">{moc.judul || "(tanpa judul)"}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {actions.includes("edit") && (
              <Link href={`/moc/${moc.id}/ubah`} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-bold rounded-full border border-[#0F3B59] text-[#0F3B59] hover:bg-[#0F3B59] hover:text-white transition-colors">
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Ubah
              </Link>
            )}
            <Link href={`/moc/${moc.id}/cetak`} target="_blank" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-bold rounded-full border border-[#C5CED3] text-[#0F172A] hover:border-[#0F3B59] transition-colors">
              <Printer className="w-3.5 h-3.5" strokeWidth={2} /> Unduh / Cetak Formulir
            </Link>
          </div>
        </div>
        <div className="mt-3.5 pt-3.5 border-t border-[#f0f0f1]">
          <MocStageStepper moc={moc} />
          {moc.riskLevel && (
            <p className="text-[11.5px] text-[#6b6e72] mt-2.5">
              Tingkat risiko {moc.riskLevel} ({MOC_RISK_LEVEL_LABEL[moc.riskLevel]}) — target waktu review {MOC_REVIEW_SLA_DAYS[moc.riskLevel]} hari kerja, persetujuan 5 hari kerja.
            </p>
          )}
        </div>
      </div>

      {notice && (
        <div role="status" className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-[8px] bg-[#DCFCE7] border border-[#15803D]/40 animate-fadeInUp">
          <CheckCircle2 className="w-[18px] h-[18px] text-[#15803D] flex-shrink-0 mt-px" strokeWidth={2} />
          <span className="text-[13px] font-semibold text-[#14532D] flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-[12px] font-bold text-[#15803D] hover:underline">Tutup</button>
        </div>
      )}

      <div
        className="mb-4 px-4 py-3 rounded-[8px] border bg-white"
        style={{ borderColor: waiting.done ? "#15803D" : "#C5CED3", borderLeftWidth: 4, borderLeftColor: waiting.done ? "#15803D" : "#0F3B59" }}
      >
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#6b6e72] mb-0.5">Sedang berlangsung</div>
        <div className="text-[14.5px] font-bold text-[#0F172A]">{waiting.title}</div>
        <p className="text-[12.5px] text-[#3a3d40] mt-0.5">{waiting.detail}</p>
        <p className="text-[11.5px] mt-1.5" style={{ color: actions.filter((a) => a !== "edit").length > 0 ? "#B45309" : "#6b6e72", fontWeight: 600 }}>
          {actions.filter((a) => a !== "edit").length > 0
            ? "Ada tindakan yang perlu Anda lakukan — lihat panel di bawah."
            : roles.length > 0
              ? `Peran Anda pada MOC ini: ${roles.join(", ")}. Belum ada tindakan untuk Anda saat ini.`
              : "Anda hanya dapat melihat MOC ini."}
        </p>
      </div>

      {actions.filter((a) => a !== "edit").length > 0 && (
        <div className="mb-4">
          <MocActionsPanel moc={moc} actions={actions} onNotice={setNotice} />
        </div>
      )}

      {rounds.length > 0 && (
        <div className={`${CARD} p-4 mb-4`}>
          <h2 className="text-[13px] font-bold text-[#0F172A] mb-2.5">Review MoC Reviewer</h2>
          <div className="flex flex-col gap-3">
            {rounds.map((rd) => (
              <div key={rd}>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#6b6e72] mb-1.5">Putaran {rd}</div>
                <ul className="flex flex-col gap-1.5">
                  {moc.reviews.filter((r) => r.round === rd).map((r) => (
                    <li key={r.id} className="text-[12.5px] flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <strong className="text-[#0F172A]">{r.functionLabel}</strong>
                      <span className="text-[#6b6e72]">{r.reviewerName}{r.reviewerJabatan ? ` — ${r.reviewerJabatan}` : ""}</span>
                      <StatusTag color={OUTCOME_COLOR[r.outcome]} label={r.outcome === "Pending" ? "Menunggu" : r.outcome} size="sm" />
                      {r.recommendation && <span className="basis-full text-[#3a3d40]">{r.recommendation}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {(moc.approverName || moc.performerName) && (
            <p className="text-[12px] text-[#3a3d40] mt-3 pt-3 border-t border-[#f0f0f1]">
              {moc.approverName && <>Approver: <strong>{moc.approverName}</strong>. </>}
              {moc.performerName && <>Performer: <strong>{moc.performerName}</strong>.</>}
              {moc.approverNote && <> Catatan: {moc.approverNote}</>}
            </p>
          )}
        </div>
      )}

      <div className={`${CARD} p-3 mb-4`}>
        <h2 className="text-[13px] font-bold text-[#0F172A] mb-2.5">Formulir MoC</h2>
        <MocFormViewer moc={moc} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${CARD} p-4`}>
          <h2 className="text-[13px] font-bold text-[#0F172A] mb-2.5">Bukti Tanda Tangan</h2>
          {moc.evidence.length === 0 ? (
            <p className="text-[12.5px] text-[#9a9da0]">Belum ada berkas bukti yang diunggah.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {moc.evidence.map((e) => (
                <li key={e.id} className="text-[12.5px] flex items-center gap-2 flex-wrap">
                  <Paperclip className="w-3.5 h-3.5 text-[#6b6e72]" strokeWidth={2} />
                  <a href={e.fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0F3B59] hover:underline">{e.fileName ?? "Berkas"}</a>
                  <span className="text-[#6b6e72]">{e.slot} · {e.uploadedByName} · {e.uploadedAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${CARD} p-4`}>
          <h2 className="text-[13px] font-bold text-[#0F172A] mb-2.5">Riwayat</h2>
          <ol className="flex flex-col gap-2.5">
            {[...moc.history].reverse().map((h) => (
              <li key={h.id} className="text-[12.5px]">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <strong className="text-[#0F172A]">{h.action}</strong>
                  <span className="text-[#6b6e72]">{h.actorName} · {h.timestamp}</span>
                </div>
                {h.notes && <div className="text-[#3a3d40]">{h.notes}</div>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
