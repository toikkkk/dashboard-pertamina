"use client";

import React from "react";
import { DocumentItem } from "@/lib/mockData";
import { Zap, Lock, Clock, CheckCircle2, XCircle, AlertOctagon } from "lucide-react";
import RouteStepper from "@/components/RouteStepper";

const ROUTE_STATUS_META = {
  Pending: { label: "Menunggu", color: "#B45309", tint: "#FEF3C7", icon: Clock },
  Approved: { label: "Disetujui", color: "#15803D", tint: "#DCFCE7", icon: CheckCircle2 },
  Rejected: { label: "Ditolak", color: "#DC2626", tint: "#FEE2E2", icon: XCircle },
} as const;

function fmtDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

interface RoutingStatusPanelProps {
  doc: DocumentItem;
  pendingStepOrder: number | null;
}

export default function RoutingStatusPanel({ doc, pendingStepOrder }: RoutingStatusPanelProps) {
  if (!doc.isCircular) return null;

  // Data macet: dokumen sirkuler tanpa approver terdaftar — tidak ada yang pernah bisa
  // menyetujui/menolaknya (canUserApproveDoc() selalu false untuk routes kosong). Ini
  // seharusnya tidak bisa terjadi lagi lewat form Upload (sudah divalidasi di sana), tapi
  // ditampilkan eksplisit di sini kalau ada data lama/rusak, alih-alih diam-diam kosong.
  if (doc.routes.length === 0) {
    return (
      <div className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-4 mb-3.5">
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-[2px] bg-[#FEE2E2]">
          <AlertOctagon className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" strokeWidth={1.9} />
          <div>
            <div className="text-[12.5px] font-bold text-[#DC2626]">Sirkuler tanpa approver terdaftar</div>
            <div className="text-[11.5px] text-[#7f1d1d] mt-0.5">
              Dokumen ini ditandai sirkuler tapi tidak punya approver di rute persetujuannya, sehingga tidak ada siapapun yang bisa memprosesnya. Hubungi Admin Regional untuk menambahkan approver secara manual, atau ajukan ulang dokumen ini.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepNums = Array.from(new Set(doc.routes.map((r) => r.stepOrder))).sort((a, b) => a - b);

  // Once nothing is pending, every fact this panel would restate per-step (who approved,
  // when, what they said) is already sitting in the chronological history log right below
  // it — showing both was the actual "confusing" complaint (same approval shown twice in a
  // row in two different card styles). The stepper + a one-line summary still earns its
  // keep as an at-a-glance progress indicator; the full per-approver breakdown only adds
  // real value while something is still actionable (pendingStepOrder !== null), which is
  // exactly the "who still needs to act, right now" job this panel exists for.
  const isResolved = pendingStepOrder === null;
  const totalSteps = stepNums.length;
  const rejectedRoute = doc.routes.find((r) => r.status === "Rejected");

  return (
    <div className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-4 mb-3.5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-4">Status Sirkuler Persetujuan</h3>

      {/* Sampai mana dokumen ini — pola tracker seperti status pesanan (bukan cuma daftar
          kotak per-tahap, tapi progres yang tersambung visual: selesai / aktif / belum). */}
      <div className={`overflow-x-auto ${isResolved ? "" : "mb-4 pb-4 border-b border-[#f0f0f1]"}`}>
        <RouteStepper routes={doc.routes} pendingStepOrder={pendingStepOrder} variant="full" />
      </div>

      {isResolved ? (
        <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-[#f0f0f1] text-[12px] text-[#6b6e72]">
          {rejectedRoute ? (
            <>
              <XCircle className="w-3.5 h-3.5 text-[#DC2626] flex-shrink-0" strokeWidth={2} />
              <span>Ditolak pada Tahap {rejectedRoute.stepOrder} oleh {rejectedRoute.approverName} — rincian lengkap ada di riwayat di bawah.</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] flex-shrink-0" strokeWidth={2} />
              <span>Semua {totalSteps} tahap persetujuan selesai — rincian tiap tahap ada di riwayat di bawah.</span>
            </>
          )}
        </div>
      ) : (
      <div className="flex flex-col gap-2.5">
        {stepNums.map((step, stepIndex) => {
          const approvers = doc.routes.filter((r) => r.stepOrder === step);
          const isParallel = approvers.length > 1;
          const isActiveStep = step === pendingStepOrder;

          return (
            <div
              key={step}
              className="border rounded-[2px] p-3 animate-fadeInUp transition-colors duration-300"
              style={{ borderColor: isActiveStep ? "#0369A1" : "#eceded", background: isActiveStep ? "#E0F2FE" : "#fafafb", animationDelay: `${stepIndex * 80}ms` }}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[12px] font-bold text-[#0F172A]">Tahap {step}</span>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-[7px] py-[2px] rounded-[2px]"
                  style={{ background: isParallel ? "#FEF3C7" : "#E0F2FE", color: isParallel ? "#B45309" : "#075985" }}
                >
                  {isParallel ? <Zap className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                  {isParallel ? "Paralel" : "Sekuensial"}
                </span>
                {isActiveStep && (
                  <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-[2px] bg-[#0369A1] text-white">
                    Tahap Aktif
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {approvers.map((r, i) => {
                  const meta = ROUTE_STATUS_META[r.status];
                  const Icon = meta.icon;
                  const date = fmtDate(r.actionDate);
                  return (
                    <div key={i} className="bg-white border border-[#eceded] rounded-[2px] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-[#0F172A] truncate">{r.approverName}</div>
                          <div className="text-[10.5px] text-[#9a9da0]">{r.approverRole}</div>
                        </div>
                        <span
                          className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-[2px] flex-shrink-0"
                          style={{ background: meta.tint, color: meta.color }}
                        >
                          <Icon className="w-3 h-3" strokeWidth={2} />
                          {meta.label}
                        </span>
                      </div>
                      {date && (
                        <div className="text-[10.5px] text-[#9a9da0] mt-1">{date}</div>
                      )}
                      {r.comment && (
                        <div
                          className="text-[11px] mt-1.5 pt-1.5 border-t border-[#f0f0f1]"
                          style={{ color: r.status === "Rejected" ? "#DC2626" : "#3a3d40" }}
                        >
                          {r.comment}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
