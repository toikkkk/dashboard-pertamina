"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Pencil, Paperclip } from "lucide-react";
import { useMocActions, useMocActor, useMocItem } from "@/lib/useMoc";
import { MOC_STATE_META } from "@/lib/domain/statusStyle";
import { MOC_REVIEW_SLA_DAYS, MOC_RISK_LEVEL_LABEL, mocWaitingOn, mocRolesOf } from "@/lib/domain/moc";
import StatusTag from "@/components/StatusTag";
import MocStageStepper from "@/components/MocStageStepper";
import MocFormViewer from "@/components/MocFormViewer";
import MocActionsPanel from "@/components/MocActionsPanel";
import SuccessPopup from "@/components/SuccessPopup";

const CARD =
  "bg-white border border-[#C5CED3] rounded-[14px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)]";
const OUTCOME_COLOR: Record<string, string> = { Pending: "#B45309", Sesuai: "#15803D", "Perlu Perubahan": "#6D28D9" };
const TABS = [
  { key: "ikhtisar", label: "Ikhtisar" },
  { key: "formulir", label: "Formulir" },
  { key: "riwayat", label: "Riwayat" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function MocDetailPage({ params }: { params: { id: string } }) {
  const { moc, isLoading, error } = useMocItem(params.id);
  const actions = useMocActions(moc);
  const actor = useMocActor();
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("ikhtisar");

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
  const hasAction = actions.filter((a) => a !== "edit").length > 0;

  return (
    <div className="max-w-[980px]">
      {notice && <SuccessPopup message={notice} onClose={() => setNotice(null)} />}

      <Link href="/moc" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0F3B59] hover:underline mb-3">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} /> Register MOC
      </Link>

      {/* 1. Kepala ringkas: apa MOC ini + sudah sampai mana */}
      <header className={`${CARD} p-5 mb-4`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <span className="font-mono text-[12px] text-[#6b6e72]">{moc.mocNumber ?? "Belum bernomor"}</span>
              <StatusTag color={state.color} label={state.label} />
            </div>
            <h1 className="font-heading text-[20px] font-bold text-[#0F172A] leading-snug">{moc.judul || "(tanpa judul)"}</h1>
            <p className="text-[12px] text-[#6b6e72] mt-1">
              {moc.location} · {moc.sifatPerubahan} · putaran {moc.round}
              {moc.riskLevel ? ` · risiko ${MOC_RISK_LEVEL_LABEL[moc.riskLevel]}` : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {actions.includes("edit") && (
              <Link href={`/moc/${moc.id}/ubah`} className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold rounded-full border border-[#0F3B59] text-[#0F3B59] hover:bg-[#0F3B59] hover:text-white transition-colors">
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Ubah isi
              </Link>
            )}
            <button
              type="button"
              onClick={() => setTab("formulir")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold rounded-full border border-[#C5CED3] text-[#0F172A] hover:border-[#0F3B59] transition-colors"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2} /> Unduh formulir
            </button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#EDF0F2]">
          <MocStageStepper moc={moc} />
        </div>
      </header>

      {/* 2. Satu ringkasan: sekarang apa & giliran siapa */}
      <section
        className="bg-white rounded-[14px] border border-[#C5CED3] p-5 mb-4"
        style={{ borderLeft: `5px solid ${waiting.done ? "#15803D" : hasAction ? "#B45309" : "#0F3B59"}` }}
      >
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#6b6e72]">Sekarang</div>
        <div className="font-heading text-[17px] font-bold text-[#0F172A] mt-0.5">{waiting.title}</div>
        {(!hasAction || moc.validationState === "in_review") && (
          <p className="text-[13px] text-[#3a3d40] mt-1">{waiting.detail}</p>
        )}
        {!hasAction && (
          <p className="text-[12px] text-[#6b6e72] mt-2">
            {roles.length > 0 ? `Peran Anda: ${roles.join(", ")} — belum ada yang perlu Anda lakukan.` : "Anda hanya dapat melihat MOC ini."}
          </p>
        )}
      </section>

      {/* 3. Yang perlu dilakukan user (hanya bila ada) */}
      {hasAction && (
        <div className="mb-5">
          <MocActionsPanel moc={moc} actions={actions} onNotice={setNotice} />
        </div>
      )}

      {/* 4. Detail di tab — tidak semuanya ditumpuk di satu layar */}
      <div role="tablist" aria-label="Detail MOC" className="flex gap-1 border-b border-[#C5CED3] mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-[13px] font-bold -mb-px border-b-[3px] transition-colors"
            style={{ borderColor: tab === t.key ? "#0F3B59" : "transparent", color: tab === t.key ? "#0F3B59" : "#6b6e72" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ikhtisar" && (
        <div className="flex flex-col gap-4">
          <div className={`${CARD} p-5`}>
            <h2 className="text-[13.5px] font-bold text-[#0F172A] mb-3">Pihak yang terlibat</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
              <div><dt className="text-[11.5px] text-[#6b6e72]">Initiator</dt><dd className="font-semibold text-[#0F172A]">{moc.initiatorName || "—"}{moc.initiatorJabatan ? ` · ${moc.initiatorJabatan}` : ""}</dd></div>
              <div><dt className="text-[11.5px] text-[#6b6e72]">Approver</dt><dd className="font-semibold text-[#0F172A]">{moc.approverName ?? "Belum dipilih"}</dd></div>
              <div><dt className="text-[11.5px] text-[#6b6e72]">Performer</dt><dd className="font-semibold text-[#0F172A]">{moc.performerName ?? "Ditunjuk Approver saat menyetujui"}</dd></div>
              {moc.riskLevel && (
                <div><dt className="text-[11.5px] text-[#6b6e72]">Target waktu</dt><dd className="font-semibold text-[#0F172A]">Review {MOC_REVIEW_SLA_DAYS[moc.riskLevel]} hari kerja · persetujuan 5 hari kerja</dd></div>
              )}
            </dl>
            {moc.approverNote && <p className="text-[12.5px] text-[#3a3d40] mt-3 pt-3 border-t border-[#EDF0F2]"><strong>Catatan Approver:</strong> {moc.approverNote}</p>}
          </div>

          <div className={`${CARD} p-5`}>
            <h2 className="text-[13.5px] font-bold text-[#0F172A] mb-3">Hasil review</h2>
            {rounds.length === 0 ? (
              <p className="text-[12.5px] text-[#9a9da0]">Belum ada review — MOC belum diajukan.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {rounds.map((rd) => (
                  <div key={rd}>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#6b6e72] mb-1.5">Putaran {rd}</div>
                    <ul className="flex flex-col gap-2">
                      {moc.reviews.filter((r) => r.round === rd).map((r) => (
                        <li key={r.id} className="text-[13px]">
                          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                            <strong className="text-[#0F172A]">{r.functionLabel}</strong>
                            <span className="text-[#6b6e72]">{r.reviewerName}</span>
                            <StatusTag color={OUTCOME_COLOR[r.outcome]} label={r.outcome === "Pending" ? "Menunggu" : r.outcome} size="sm" />
                          </div>
                          {r.recommendation && <div className="text-[#3a3d40] mt-0.5">“{r.recommendation}”</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${CARD} p-5`}>
            <h2 className="text-[13.5px] font-bold text-[#0F172A] mb-3">Bukti tanda tangan</h2>
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
        </div>
      )}

      {tab === "formulir" && (
        <div className={`${CARD} p-4`}>
          <MocFormViewer moc={moc} />
        </div>
      )}

      {tab === "riwayat" && (
        <div className={`${CARD} p-5`}>
          <ol className="flex flex-col gap-3.5">
            {[...moc.history].reverse().map((h) => (
              <li key={h.id} className="text-[13px] pl-3.5 border-l-2 border-[#C5CED3]">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <strong className="text-[#0F172A]">{h.action}</strong>
                  <span className="text-[12px] text-[#6b6e72]">{h.actorName} · {h.timestamp}</span>
                </div>
                {h.notes && <div className="text-[#3a3d40] mt-0.5">{h.notes}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
