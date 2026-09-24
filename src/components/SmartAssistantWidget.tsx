"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { isDocOverdue, canUserApproveDoc } from "@/lib/domain/rules";
import { AlertCircle, Clock, CheckCircle2, ChevronRight, FileEdit, FileSignature, Zap } from "lucide-react";
import { DocumentItem } from "@/lib/domain/types";

export default function SmartAssistantWidget() {
  const { activeUser, documents } = usePsi();
  const router = useRouter();

  // Kumpulkan tugas mendesak
  const urgentTasks: { doc: DocumentItem; type: "Approval" | "Revision" | "Overdue"; label: string; color: string; glowColor: string; icon: React.ReactNode }[] = [];

  documents.forEach((doc) => {
    if (canUserApproveDoc(doc, activeUser)) {
      urgentTasks.push({
        doc,
        type: "Approval",
        label: "Perlu Persetujuan",
        color: "#F59E0B",
        glowColor: "rgba(245,158,11,0.2)",
        icon: <FileSignature className="w-4 h-4" />,
      });
    } else if (doc.status === "Revision Required" && !isDocOverdue(doc)) {
      urgentTasks.push({
        doc,
        type: "Revision",
        label: "Perlu Revisi",
        color: "#A78BFA",
        glowColor: "rgba(167,139,250,0.2)",
        icon: <FileEdit className="w-4 h-4" />,
      });
    } else if (isDocOverdue(doc)) {
      urgentTasks.push({
        doc,
        type: "Overdue",
        label: "Kedaluwarsa",
        color: "#F87171",
        glowColor: "rgba(248,113,113,0.2)",
        icon: <Clock className="w-4 h-4" />,
      });
    }
  });

  // Urutkan: Approval dulu, lalu Overdue, lalu Revision
  urgentTasks.sort((a, b) => {
    const order = { Approval: 1, Overdue: 2, Revision: 3 };
    return order[a.type] - order[b.type];
  });

  // Tampilkan maksimal 5 tugas di widget
  const displayTasks = urgentTasks.slice(0, 5);

  return (
    <div
      className="relative rounded-[14px] mb-3.5 overflow-hidden animate-fadeInUp"
      style={{
        background: "linear-gradient(135deg, rgba(11,44,67,0.9) 0%, rgba(9,32,52,0.95) 100%)",
        border: "1px solid rgba(77,166,217,0.2)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset",
      }}
    >
      {/* Decorative gradient accent */}
      <div
        className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
        style={{
          background: "radial-gradient(circle at top right, rgba(77,166,217,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-4"
        style={{ borderBottom: "1px solid rgba(77,166,217,0.1)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-[10px] flex-shrink-0"
            style={{
              background: "rgba(77,166,217,0.12)",
              border: "1px solid rgba(77,166,217,0.2)",
            }}
          >
            <Zap className="w-4.5 h-4.5 text-[#4DA6D9]" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="font-heading text-[17px] font-bold text-white leading-tight">
              Selamat Pagi, {activeUser.name.split(" ")[0]}!
            </h2>
            <p className="text-[12px] text-[#6B98B8] mt-0.5">
              {urgentTasks.length > 0
                ? `Ada ${urgentTasks.length} tugas mendesak yang memerlukan perhatian hari ini.`
                : "Kerja bagus! Tidak ada dokumen kritis atau tugas mendesak hari ini."}
            </p>
          </div>
        </div>
        {urgentTasks.length > 0 && (
          <div
            className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(248,113,113,0.15)",
              color: "#F87171",
              border: "1px solid rgba(248,113,113,0.25)",
            }}
          >
            {urgentTasks.length} Aktif
          </div>
        )}
      </div>

      {displayTasks.length > 0 ? (
        <div className="flex flex-col">
          {displayTasks.map((task, idx) => (
            <div
              key={`${task.doc.id}-${task.type}`}
              className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-all duration-200 group ${idx !== displayTasks.length - 1 ? "" : ""}`}
              style={{
                borderBottom: idx !== displayTasks.length - 1 ? "1px solid rgba(77,166,217,0.08)" : undefined,
              }}
              onClick={() => router.push(`/document/${task.doc.id}`)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(77,166,217,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-[8px] shrink-0"
                  style={{
                    background: task.glowColor,
                    border: `1px solid ${task.color}33`,
                    color: task.color,
                  }}
                >
                  {task.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9.5px] font-bold uppercase tracking-[.08em] px-1.5 py-0.5 rounded-[4px]"
                      style={{
                        background: `${task.color}18`,
                        color: task.color,
                        border: `1px solid ${task.color}30`,
                      }}
                    >
                      {task.label}
                    </span>
                    <span className="text-[11px] font-mono text-[#4a7a9b] truncate">
                      {task.doc.documentNumber}
                    </span>
                  </div>
                  <h4 className="text-[13px] font-semibold text-[#C8DDE9] truncate group-hover:text-white transition-colors">
                    {task.doc.title}
                  </h4>
                </div>
              </div>
              <div className="shrink-0 ml-4">
                <button
                  className="flex items-center gap-1 text-[11.5px] font-bold px-3 py-1.5 rounded-full transition-all duration-200 group-hover:scale-105"
                  style={{
                    background: "rgba(21,128,61,0.15)",
                    color: "#4ADE80",
                    border: "1px solid rgba(74,222,128,0.25)",
                  }}
                >
                  Tindak Lanjuti <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {urgentTasks.length > 5 && (
            <div
              className="px-5 py-2.5 border-t text-center cursor-pointer transition-colors hover:bg-white/4"
              style={{ borderColor: "rgba(77,166,217,0.08)" }}
              onClick={() => router.push("/directory")}
            >
              <span className="text-[12px] font-semibold text-[#4DA6D9]">
                Lihat {urgentTasks.length - 5} tugas lainnya...
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-8 flex flex-col items-center justify-center text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{
              background: "rgba(74,222,128,0.12)",
              border: "1px solid rgba(74,222,128,0.25)",
            }}
          >
            <CheckCircle2 className="w-6 h-6 text-[#4ADE80]" />
          </div>
          <h3 className="text-[14px] font-bold text-white mb-1">Semua Terkendali</h3>
          <p className="text-[12.5px] text-[#6B98B8] max-w-sm">
            Tidak ada dokumen yang kedaluwarsa, butuh revisi, atau menunggu persetujuan Anda.
          </p>
        </div>
      )}
    </div>
  );
}
