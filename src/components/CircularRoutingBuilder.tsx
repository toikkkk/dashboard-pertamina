"use client";

import React, { useState } from "react";
import { ApprovalRouteItem } from "@/lib/mockData";
import { Zap, Lock, Trash2, AlertTriangle } from "lucide-react";

interface CircularRoutingBuilderProps {
  routes: ApprovalRouteItem[];
  onChange: (routes: ApprovalRouteItem[]) => void;
  /** Shown when the parent form was submitted with zero approvers — a circular doc with no
   * routes gets stuck "In Routing" forever since canUserApproveDoc() has nothing to match. */
  error?: string;
}

const APPROVER_ROLE_PRESETS = [
  "PSI Controller",
  "MOC Controller",
  "Facility Manager",
  "HSE Manager",
  "Aviation Safety Inspector",
];

export default function CircularRoutingBuilder({ routes, onChange, error }: CircularRoutingBuilderProps) {
  const [roleDraft, setRoleDraft] = useState(APPROVER_ROLE_PRESETS[0]);
  const [nameDraft, setNameDraft] = useState("");
  const [stepDraft, setStepDraft] = useState(1);

  const handleAdd = () => {
    if (!nameDraft.trim()) return;
    const newRoute: ApprovalRouteItem = { approverRole: roleDraft, approverName: nameDraft.trim(), stepOrder: stepDraft, status: "Pending" };
    onChange([...routes, newRoute].sort((a, b) => a.stepOrder - b.stepOrder));
    setNameDraft("");
  };

  const handleRemove = (index: number) => {
    onChange(routes.filter((_, i) => i !== index));
  };

  const stepNums = Array.from(new Set(routes.map((r) => r.stepOrder))).sort((a, b) => a - b);

  return (
    <div className="border border-[#eceded] rounded-[8px] p-4">
      <p className="mb-3 text-xs font-bold text-[#3a3d40]">Circular Routing Builder</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_90px_90px] gap-2 mb-3.5">
        <select
          value={roleDraft}
          onChange={(e) => setRoleDraft(e.target.value)}
          className="min-h-[34px] px-2 py-1 text-xs border border-[#D6DEE8] rounded-[8px]"
        >
          {APPROVER_ROLE_PRESETS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="Nama approver"
          className="min-h-[34px] px-2 py-1 text-xs border border-[#D6DEE8] rounded-[8px]"
        />
        <select
          value={stepDraft}
          onChange={(e) => setStepDraft(Number(e.target.value))}
          className="min-h-[34px] px-2 py-1 text-xs border border-[#D6DEE8] rounded-[8px]"
        >
          <option value={1}>Tahap 1</option>
          <option value={2}>Tahap 2</option>
          <option value={3}>Tahap 3</option>
        </select>
        <button
          type="button"
          onClick={handleAdd}
          className="min-h-[34px] text-xs font-bold rounded-[8px] border border-[#0369A1] bg-[#0369A1] hover:bg-[#075985] active:scale-[0.97] text-white transition-all duration-200"
        >
          + Tambah
        </button>
      </div>

      {stepNums.length === 0 && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-[8px] text-[11.5px]"
          style={error ? { background: "#FEE2E2", color: "#DC2626" } : { background: "#FEF3C7", color: "#B45309" }}
        >
          <AlertTriangle className="w-[13px] h-[13px] flex-shrink-0 mt-0.5" strokeWidth={2} />
          <span>{error || "Sirkuler aktif tapi belum ada approver — dokumen tidak akan bisa diproses siapapun sampai minimal satu approver ditambahkan."}</span>
        </div>
      )}

      {stepNums.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {stepNums.map((step) => {
            const approvers = routes
              .map((r, idx) => ({ ...r, idx }))
              .filter((r) => r.stepOrder === step);
            const isParallel = approvers.length > 1;
            return (
              <div key={step} className="border border-[#eceded] rounded-[8px] p-2.5 bg-[#fafafb]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11.5px] font-bold">Tahap {step}</span>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-[7px] py-[2px] rounded-[8px]"
                    style={{ background: isParallel ? "#FEF3C7" : "#E0F2FE", color: isParallel ? "#B45309" : "#075985" }}
                  >
                    {isParallel ? <Zap className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                    {isParallel ? "Paralel" : "Sekuensial"}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {approvers.map((a, idx) => (
                    <div
                      key={a.idx}
                      className="flex items-center justify-between text-xs bg-white border border-[#eceded] rounded-[8px] px-2.5 py-1.5 animate-fadeInUp"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <span><strong>{a.approverName}</strong> <span className="text-[#9a9da0]">— {a.approverRole}</span></span>
                      <button type="button" onClick={() => handleRemove(a.idx)} className="p-0.5 rounded-[8px] transition-all duration-200 hover:bg-[#FEE2E2] active:scale-90">
                        <Trash2 className="w-[13px] h-[13px] text-[#DC2626]" strokeWidth={1.8} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
