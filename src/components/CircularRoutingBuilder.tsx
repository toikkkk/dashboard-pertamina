"use client";

import React, { useState } from "react";
import { ApprovalRouteItem } from "@/lib/mockData";
import { Users, Plus, Trash2, ArrowRight, Layers, Zap, Lock } from "lucide-react";

interface CircularRoutingBuilderProps {
  routes: ApprovalRouteItem[];
  onChange: (routes: ApprovalRouteItem[]) => void;
}

export default function CircularRoutingBuilder({ routes, onChange }: CircularRoutingBuilderProps) {
  const [selectedRole, setSelectedRole] = useState("PSI / MOC Controller");
  const [approverName, setApproverName] = useState("");
  const [stepOrder, setStepOrder] = useState<number>(1);

  const availableRoles = [
    "PSI / MOC Controller",
    "Facility Manager / Kepala Terminal",
    "HSE / Process Safety Engineer",
    "Aviation Safety Inspector",
    "Technical Function / Lead Engineer",
  ];

  const handleAddApprover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approverName.trim()) return;

    const newRoute: ApprovalRouteItem = {
      approverRole: selectedRole,
      approverName: approverName.trim(),
      stepOrder: Number(stepOrder),
      status: "Pending",
    };

    const updated = [...routes, newRoute].sort((a, b) => a.stepOrder - b.stepOrder);
    onChange(updated);
    setApproverName("");
  };

  const handleRemove = (index: number) => {
    const updated = routes.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Group by step order to explain Sequential vs Parallel logic!
  const stepGroups: Record<number, ApprovalRouteItem[]> = {};
  routes.forEach((r) => {
    if (!stepGroups[r.stepOrder]) stepGroups[r.stepOrder] = [];
    stepGroups[r.stepOrder].push(r);
  });

  return (
    <div className="bg-slate-50 border-2 border-blue-200 rounded-xl p-4 my-3">
      <div className="flex items-center gap-2 text-[#284B63] font-bold text-sm mb-1.5">
        <Layers className="w-4 h-4 text-[#3C6E71]" />
        <span>Konfigurasi Alur Sirkuler (Sekuensial & Paralel)</span>
      </div>
      <p className="text-xs text-slate-600 mb-3">
        Tentukan alur persetujuan dengan mengatur nomor tahap tiap approver. Approver dengan nomor tahap yang sama akan memeriksa secara <strong>Paralel (Bersamaan)</strong>. Nomor tahap yang berbeda akan berjalan <strong>Sekuensial (Bertahap)</strong> — misalnya Tahap 2 terkunci sampai Tahap 1 selesai.
      </p>

      {/* Input Form */}
      <form onSubmit={handleAddApprover} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mb-4 bg-white p-3 rounded-lg border border-[#D9D9D9] shadow-sm text-xs">
        <div className="md:col-span-4">
          <label className="block font-semibold text-slate-700 mb-1">Peran / Jabatan Approver:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full border border-[#D9D9D9] rounded px-2.5 py-1.5 bg-slate-50 font-medium"
          >
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4">
          <label className="block font-semibold text-slate-700 mb-1">Nama Approver / Controller:</label>
          <input
            type="text"
            value={approverName}
            onChange={(e) => setApproverName(e.target.value)}
            placeholder="Contoh: Agnes Wijaya atau Hendrik"
            className="w-full border border-[#D9D9D9] rounded px-2.5 py-1.5 bg-white"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1">Nomor Tahap:</label>
          <select
            value={stepOrder}
            onChange={(e) => setStepOrder(Number(e.target.value))}
            className="w-full border border-[#D9D9D9] rounded px-2.5 py-1.5 bg-slate-50 font-bold font-mono text-center text-[#284B63]"
          >
            <option value={1}>Step 1</option>
            <option value={2}>Step 2</option>
            <option value={3}>Step 3</option>
          </select>
        </div>
        <div className="md:col-span-2 flex items-end">
          <button
            type="submit"
            className="w-full bg-[#284B63] hover:bg-[#1E3A4F] text-white font-semibold py-1.5 px-3 rounded flex items-center justify-center gap-1 transition shadow text-xs h-[33px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>
      </form>

      {/* Visual Workflow Map */}
      {routes.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Visualisasi Alur Sirkuler (Workflow Map):</h4>
          <div className="flex flex-col gap-3">
            {Object.keys(stepGroups)
              .map(Number)
              .sort((a, b) => a - b)
              .map((stepNum, index) => {
                const group = stepGroups[stepNum];
                const isParallel = group.length > 1;

                return (
                  <div key={stepNum} className="bg-white p-3 rounded-lg border border-[#D9D9D9] shadow-sm relative">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="text-xs font-bold text-[#284B63] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Tahap {stepNum}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                          isParallel ? "bg-purple-100 text-purple-800" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isParallel ? <Zap className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{isParallel ? "Paralel (Persetujuan Bersamaan)" : "Sekuensial (Bertahap)"}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {group.map((item, gIndex) => {
                        // Find original index in routes
                        const originalIndex = routes.findIndex(
                          (r) => r.approverName === item.approverName && r.stepOrder === item.stepOrder
                        );
                        return (
                          <div
                            key={gIndex}
                            className="flex items-center justify-between bg-slate-50 p-2.5 rounded border border-[#D9D9D9] text-xs"
                          >
                            <div>
                              <div className="font-semibold text-[#353535]">{item.approverName}</div>
                              <div className="text-slate-500 text-[11px]">{item.approverRole}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemove(originalIndex)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition"
                              title="Hapus approver ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {index < Object.keys(stepGroups).length - 1 && (
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 bg-slate-200 text-slate-700 p-1 rounded-full shadow">
                        <ArrowRight className="w-3.5 h-3.5 rotate-90 text-[#284B63]" />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 border-2 border-dashed border-[#D9D9D9] rounded-lg text-slate-500 text-xs font-medium bg-white/50">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          Belum ada approver dalam alur sirkuler. Tambahkan minimal 1 approver di atas untuk memulai sirkuler.
        </div>
      )}
    </div>
  );
}
