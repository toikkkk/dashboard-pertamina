"use client";

import React from "react";
import Link from "next/link";
import { usePsi } from "@/lib/psiStore";
import { canUserApproveDoc, getPendingApprovalStepOrder } from "@/lib/mockData";
import { ClipboardCheck, Zap, Lock, MapPin, FileText, ArrowRight } from "lucide-react";
import RouteStepper from "@/components/RouteStepper";
import StatusTag from "@/components/StatusTag";

function fmtDate(ts: string) {
  if (!ts) return "-";
  const d = new Date(ts.replace(" ", "T"));
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ApprovalsPage() {
  const { documents, activeUser } = usePsi();

  const myApprovals = documents
    .filter((doc) => canUserApproveDoc(doc, activeUser))
    .map((doc) => {
      const stepOrder = getPendingApprovalStepOrder(doc)!;
      const stepApprovers = doc.routes.filter((r) => r.stepOrder === stepOrder);
      const isParallel = stepApprovers.length > 1;
      const totalSteps = new Set(doc.routes.map((r) => r.stepOrder)).size;
      const lastActivity = [...doc.history].reverse()[0];
      return { doc, stepOrder, isParallel, totalSteps, waitingSince: lastActivity?.timestamp ?? doc.issueDate };
    })
    .sort((a, b) => new Date(a.waitingSince.replace(" ", "T")).getTime() - new Date(b.waitingSince.replace(" ", "T")).getTime());

  return (
    <div>
      {myApprovals.length > 0 ? (
        <div className="flex flex-col gap-3">
          {myApprovals.map(({ doc, stepOrder, isParallel, totalSteps, waitingSince }, i) => (
            <Link
              key={doc.id}
              href={`/document/${doc.id}`}
              className="group block bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-4 transition-all duration-200 ease-out-expo hover:shadow-[0_4px_16px_rgba(0,0,0,.08)] hover:-translate-y-[1px] hover:border-[#0369A1] animate-fadeInUp"
              style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-[11.5px] text-[#9a9da0]">{doc.documentNumber}</span>
                    <span className="inline-flex items-center gap-1.5">
                      {isParallel ? <Zap className="w-2.5 h-2.5 text-[#B45309]" /> : <Lock className="w-2.5 h-2.5 text-[#075985]" />}
                      <StatusTag color={isParallel ? "#B45309" : "#075985"} label={`Tahap ${stepOrder} dari ${totalSteps}`} size="sm" />
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-[#0F172A] group-hover:text-[#0369A1] transition-colors truncate mb-1.5">{doc.title}</div>
                  <div className="flex items-center gap-3 text-[11.5px] text-[#6b6e72] flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" strokeWidth={2} />{doc.location}</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" strokeWidth={2} />{doc.psiType}</span>
                    <span>Menunggu sejak {fmtDate(waitingSince)}</span>
                  </div>
                </div>

                {/* "Sampai mana" — preview tracker mini, sama seperti status pesanan */}
                <div className="flex-shrink-0 px-2">
                  <RouteStepper routes={doc.routes} pendingStepOrder={stepOrder} variant="mini" />
                </div>

                <div className="flex-shrink-0 inline-flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-[2px] border border-[#0369A1] text-[#0369A1] group-hover:bg-[#0369A1] group-hover:text-white transition-all duration-200">
                  Tinjau &amp; Putuskan
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] py-14 px-5 text-center">
          <ClipboardCheck className="w-[30px] h-[30px] text-[#c3c6c9] mx-auto mb-2.5" strokeWidth={1.5} />
          <p className="text-[13px] text-[#9a9da0]">Tidak ada dokumen yang menunggu persetujuan Anda saat ini.</p>
        </div>
      )}
    </div>
  );
}
