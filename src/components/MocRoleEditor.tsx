"use client";

import React, { useState } from "react";
import { mutate as globalMutate } from "swr";
import { Pencil } from "lucide-react";
import { MOC_ROLE_FLAGS, type MocRoleFlag } from "@/lib/domain/moc";
import type { SimulatedUser } from "@/lib/domain/types";

// Editor kecil "Peran MOC" per akun untuk halaman Kelola User: peran (Reviewer /
// Approver / Performer) + fungsi/jabatan. Menentukan siapa muncul di dropdown pada MOC.
export default function MocRoleEditor({ user }: { user: SimulatedUser }) {
  const current = (user.mocRoles ?? []).filter((r): r is MocRoleFlag => (MOC_ROLE_FLAGS as readonly string[]).includes(r));
  const [editing, setEditing] = useState(false);
  const [roles, setRoles] = useState<MocRoleFlag[]>(current);
  const [fn, setFn] = useState(user.mocFunction ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/moc-roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mocRoles: roles, mocFunction: fn.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Gagal menyimpan.");
      await globalMutate("/api/bootstrap");
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {current.length === 0 ? (
          <span className="text-[11.5px] text-[#9a9da0]">Belum diatur</span>
        ) : (
          <span className="text-[11.5px] font-semibold text-[#0F172A]">
            {current.join(", ")}
            {user.mocFunction ? <span className="font-normal text-[#6b6e72]"> · {user.mocFunction}</span> : null}
          </span>
        )}
        <button
          type="button"
          onClick={() => { setRoles(current); setFn(user.mocFunction ?? ""); setEditing(true); }}
          aria-label={`Atur peran MOC ${user.name}`}
          className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-[8px] border border-[#C5CED3] text-[#0F3B59] hover:bg-[#F5F7F9] transition-colors"
        >
          <Pencil className="w-3 h-3" strokeWidth={2} /> Atur
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2 border border-[#C5CED3] rounded-[8px] bg-[#F5F7F9] min-w-[210px]">
      <div className="flex gap-3 flex-wrap">
        {MOC_ROLE_FLAGS.map((r) => (
          <label key={r} className="flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer">
            <input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles(roles.includes(r) ? roles.filter((x) => x !== r) : [...roles, r])} />
            {r}
          </label>
        ))}
      </div>
      <input
        value={fn}
        onChange={(e) => setFn(e.target.value)}
        maxLength={100}
        placeholder="Fungsi/jabatan (mis. HSSE, Maintenance Service)"
        className="text-[12px] px-2 py-1.5 border border-[#C5CED3] rounded-[8px] bg-white w-full"
      />
      {error && <p role="alert" className="text-[11px] font-semibold text-[#DC2626]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={save} className="text-[11.5px] font-bold px-3 py-1.5 rounded-[8px] bg-[#0F3B59] hover:bg-[#0B2C43] text-white disabled:opacity-60">
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" disabled={busy} onClick={() => setEditing(false)} className="text-[11.5px] font-bold px-3 py-1.5 rounded-[8px] border border-[#C5CED3] bg-white">
          Batal
        </button>
      </div>
    </div>
  );
}
