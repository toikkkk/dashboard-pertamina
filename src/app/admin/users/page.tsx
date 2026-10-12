"use client";

import { mutate as globalMutate } from "swr";
import MenuSelect from "@/components/ui/MenuSelect";
import React, { useState } from "react";
import { usePsi } from "@/lib/psiStore";
import { deriveDemoEmail, SimulatedUser } from "@/lib/mockData";
import { ShieldAlert, Hourglass, CheckCircle2, UserCog, Pencil, X, Search, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import MocRoleEditor from "@/components/MocRoleEditor";

const ROLES: SimulatedUser["role"][] = ["Penanggung Jawab PSI (Initiator)", "PSI / MOC Controller", "Admin Regional"];

export default function AdminUsersPage() {
  const { activeUser, users, allLocations: locations, assignUserAccess, deleteUsers } = usePsi();

  const [draftRole, setDraftRole] = useState<Record<string, SimulatedUser["role"]>>({});
  const [draftLocation, setDraftLocation] = useState<Record<string, string>>({});
  const [justActivated, setJustActivated] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState<string | null>(null);
  const [lockoutWarningId, setLockoutWarningId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState<SimulatedUser[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!activeUser.isRegionalAdmin) {
    return (
      <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] py-[60px] px-5 text-center">
        <ShieldAlert className="w-8 h-8 text-[#c3c6c9] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-bold text-[#3a3d40] mb-1">Halaman khusus Admin Regional</p>
        <p className="text-[12.5px] text-[#9a9da0]">Anda tidak memiliki wewenang untuk mengelola akses user.</p>
      </div>
    );
  }

  const matchesSearch = (u: SimulatedUser) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const email = u.email ?? deriveDemoEmail(u.name);
    return u.name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  };

  const pending = users.filter((u) => ((!u.isRegionalAdmin && !u.location) || justActivated === u.id) && matchesSearch(u));
  const activeUsers = users.filter((u) => (u.location || u.isRegionalAdmin) && matchesSearch(u));
  const adminCount = users.filter((u) => u.isRegionalAdmin).length;

  const handleAssign = (u: SimulatedUser) => {
    const role = draftRole[u.id] ?? u.requestedRole ?? "Penanggung Jawab PSI (Initiator)";
    const location = draftLocation[u.id] ?? u.requestedLocation ?? locations[0].locationName;
    const requestedMoc = (u.requestedMocRoles ?? []).length > 0
      ? { mocRoles: u.requestedMocRoles ?? [], mocFunction: u.requestedMocFunction ?? null }
      : undefined;
    assignUserAccess(u.id, role, location, requestedMoc);
    setJustActivated(u.id);
    setTimeout(() => setJustActivated(null), 3000);
  };

  // Akun sendiri tidak pernah bisa dipilih/dihapus.
  const canSelect = (u: SimulatedUser) => u.id !== activeUser.id;
  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = (list: SimulatedUser[]) => {
    const ids = list.filter(canSelect);
    return ids.length > 0 && ids.every((u) => selected.has(u.id));
  };
  const toggleAll = (list: SimulatedUser[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = list.filter(canSelect).map((u) => u.id);
      if (ids.every((id) => next.has(id))) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  const selectedUsers = users.filter((u) => selected.has(u.id) && canSelect(u));

  // Reset MFA user yang kehilangan perangkat/kode pemulihan: MFA dimatikan & semua sesinya dicabut (tercatat di Log Aktivitas).
  const resetMfa = async (u: SimulatedUser) => {
    if (!window.confirm(`Reset MFA untuk ${u.name}? MFA dimatikan dan semua sesinya dikeluarkan. User dapat mengaktifkannya lagi dari Pengaturan › Keamanan Akun.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}/mfa-reset`, { method: "POST" });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      window.alert(b.error || "Gagal mereset MFA.");
      return;
    }
    await globalMutate("/api/bootstrap");
  };

  const askDelete = (list: SimulatedUser[]) => {
    setDeleteError(null);
    setDeleting(list);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const { deleted, failed } = await deleteUsers(deleting.map((u) => u.id));
      const failedIds = new Set(failed.map((f) => f.id));
      // Yang terhapus keluar dari pilihan; yang gagal tetap dipilih agar terlihat.
      setSelected((prev) => new Set(Array.from(prev).filter((id) => failedIds.has(id))));
      if (failed.length === 0) {
        setDeleting(null);
      } else {
        const names = deleting.filter((u) => failedIds.has(u.id)).map((u) => u.name).join(", ");
        setDeleting(deleting.filter((u) => failedIds.has(u.id)));
        setDeleteError(
          `${deleted.length} user dihapus. ${failed.length} tidak dapat dihapus (${failed[0].error}): ${names}.`
        );
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus user.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const startEdit = (u: SimulatedUser) => {
    setDraftRole((s) => ({ ...s, [u.id]: u.role }));
    setDraftLocation((s) => ({ ...s, [u.id]: u.location ?? locations[0].locationName }));
    setLockoutWarningId(null);
    setEditingId(u.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLockoutWarningId(null);
  };

  const handleSaveEdit = (u: SimulatedUser) => {
    const role = draftRole[u.id] ?? u.role;
    const location = draftLocation[u.id] ?? u.location ?? locations[0].locationName;

    // The only way back into /admin/users is being an Admin Regional — if this is the
    // last one and the edit would take their admin status away, there'd be no one left
    // who could ever undo it through the UI. Block it here instead of after the fact.
    if (u.isRegionalAdmin && role !== "Admin Regional" && adminCount <= 1) {
      setLockoutWarningId(u.id);
      return;
    }

    assignUserAccess(u.id, role, location);
    setEditingId(null);
    setLockoutWarningId(null);
    setJustUpdated(u.id);
    setTimeout(() => setJustUpdated(null), 3000);
  };

  return (
    <div>
      <div className="relative mb-4 max-w-[320px]">
        <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama atau email..."
          className="w-full min-h-[38px] pl-[34px] pr-3 py-1.5 text-[13px] border border-[#C5CED3] rounded-[8px]"
        />
      </div>

      {selectedUsers.length > 0 && (
        <div className="sticky top-2 z-30 mb-4 flex items-center gap-3 rounded-[10px] bg-[#0F3B59] px-4 py-2.5 text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,.45)] animate-fadeIn">
          <span className="text-[13px] font-bold">{selectedUsers.length} user dipilih</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="min-h-[34px] px-3 rounded-[8px] border border-white/30 text-[12px] font-bold hover:bg-white/10 active:scale-[0.97] transition-all duration-200"
            >
              Batal pilih
            </button>
            <button
              onClick={() => askDelete(selectedUsers)}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-[8px] bg-[#DC2626] hover:bg-[#B91C1C] text-[12px] font-bold active:scale-[0.97] transition-all duration-200"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
              Hapus
            </button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="bg-white border border-[#B45309] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] mb-4 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF3C7]">
            <input
              type="checkbox"
              checked={allSelected(pending)}
              onChange={() => toggleAll(pending)}
              aria-label="Pilih semua user yang menunggu aktivasi"
              className="w-4 h-4 shrink-0 accent-[#0F3B59] cursor-pointer"
            />
            <Hourglass className="w-[15px] h-[15px] text-[#B45309]" strokeWidth={1.8} />
            <span className="text-[12.5px] font-bold text-[#B45309]">Menunggu Aktivasi ({pending.length})</span>
          </div>
          <div className="flex flex-col divide-y divide-[#f0f0f1]">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                {canSelect(u) && (
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelected(u.id)}
                    aria-label={`Pilih ${u.name}`}
                    className="w-4 h-4 shrink-0 accent-[#0F3B59] cursor-pointer"
                  />
                )}
                <div className="min-w-[160px] flex-1">
                  <div className="text-[13px] font-bold text-[#0F172A]">{u.name}</div>
                  <div className="text-[11px] text-[#9a9da0]">{u.email ?? deriveDemoEmail(u.name)}</div>
                  {(u.requestedRole || u.requestedLocation) && (
                    <div className="mt-0.5 text-[10.5px] text-[#B45309]">
                      Mengajukan: {u.requestedRole ?? "—"}
                      {u.requestedLocation ? ` · ${u.requestedLocation}` : ""}
                      {(u.requestedMocRoles ?? []).length > 0
                        ? ` · MoC ${(u.requestedMocRoles ?? []).join(", ")}${u.requestedMocFunction ? ` (${u.requestedMocFunction})` : ""}`
                        : ""}
                    </div>
                  )}
                </div>

                {justActivated === u.id ? (
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#15803D]">
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                    Diaktifkan
                  </span>
                ) : (
                  <>
                    <MenuSelect ariaLabel="Peran" minWidth={250} value={draftRole[u.id] ?? u.requestedRole ?? "Penanggung Jawab PSI (Initiator)"} options={ROLES.map((r) => ({ value: r, label: r }))} onChange={(v) => setDraftRole((s) => ({ ...s, [u.id]: v as SimulatedUser["role"] }))} />
                    <MenuSelect ariaLabel="Lokasi" minWidth={190} value={draftLocation[u.id] ?? u.requestedLocation ?? locations[0].locationName} options={locations.map((l) => ({ value: l.locationName, label: l.locationName }))} onChange={(v) => setDraftLocation((s) => ({ ...s, [u.id]: v }))} />
                    <button
                      onClick={() => handleAssign(u)}
                      className="text-[11.5px] font-bold px-3 py-1.5 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white transition-all duration-200"
                    >
                      Aktifkan
                    </button>
                    <button
                      onClick={() => askDelete([u])}
                      aria-label={`Hapus ${u.name}`}
                      className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border border-[#C5CED3] text-[#DC2626] hover:bg-[#FEE2E2] active:scale-[0.97] transition-all duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#fafafb] border-b border-[#f0f0f1]">
          <input
            type="checkbox"
            checked={allSelected(activeUsers)}
            onChange={() => toggleAll(activeUsers)}
            aria-label="Pilih semua user aktif"
            className="w-4 h-4 shrink-0 accent-[#0F3B59] cursor-pointer"
          />
          <UserCog className="w-[15px] h-[15px] text-[#0F3B59]" strokeWidth={1.8} />
          <span className="text-[12.5px] font-bold text-[#3a3d40]">Semua User Aktif ({activeUsers.length})</span>
        </div>
        {activeUsers.length === 0 ? (
          <div className="py-14 px-5 text-center">
            <Search className="w-[30px] h-[30px] text-[#c3c6c9] mx-auto mb-2.5" strokeWidth={1.5} />
            <p className="text-[13px] text-[#9a9da0]">Tidak ada user yang cocok dengan pencarian Anda.</p>
          </div>
        ) : (
        <>
        {/* Card list below lg — the 5-column table below was previously just
            silently clipping its last 2 columns (Lokasi, Aksi) off-screen on a
            narrow viewport with no way to reach them at all (no scroll container),
            not merely "cramped" — the "Ubah" button was completely unreachable. */}
        <div className="lg:hidden divide-y divide-[#f0f0f1]">
          {activeUsers.map((u) => (
            <div key={u.id} className="p-3.5">
              <div className="flex items-start gap-2.5">
                {canSelect(u) && (
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelected(u.id)}
                    aria-label={`Pilih ${u.name}`}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-[#0F3B59] cursor-pointer"
                  />
                )}
                <div>
                  <div className="font-semibold text-[13.5px] text-[#0F172A]">{u.name}</div>
                  <div className="text-[12px] text-[#6b6e72] mb-2">{u.email ?? deriveDemoEmail(u.name)}</div>
                </div>
              </div>

              {editingId === u.id ? (
                <div className="flex flex-col gap-2 mt-2">
                  <MenuSelect ariaLabel="Peran" fullWidth minWidth={250} value={draftRole[u.id] ?? u.role} options={ROLES.map((r) => ({ value: r, label: r }))} onChange={(v) => setDraftRole((s) => ({ ...s, [u.id]: v as SimulatedUser["role"] }))} />
                  <MenuSelect ariaLabel="Lokasi" fullWidth minWidth={190} value={draftLocation[u.id] ?? u.location ?? locations[0].locationName} options={locations.map((l) => ({ value: l.locationName, label: l.locationName }))} onChange={(v) => setDraftLocation((s) => ({ ...s, [u.id]: v }))} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(u)}
                      className="flex-1 text-[12.5px] font-bold px-3 py-2 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white transition-all duration-200"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-[12.5px] font-bold px-3 py-2 rounded-[8px] border border-[#C5CED3] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
                    >
                      Batal
                    </button>
                  </div>
                  {lockoutWarningId === u.id && (
                    <p className="px-2.5 py-2 bg-[#FEF3C7] rounded-[8px] text-[11.5px] font-semibold text-[#92400E]">
                      Tidak bisa disimpan — {u.name} satu-satunya Admin Regional saat ini. Tunjuk admin lain dulu sebelum menurunkan perannya.
                    </p>
                  )}
                </div>
              ) : (
                <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center text-[11px] font-bold px-2 py-[3px] rounded-[8px]"
                      style={{ background: u.isRegionalAdmin ? "#EDE9FE" : "#E2E8EB", color: u.isRegionalAdmin ? "#6D28D9" : "#0B2C43" }}
                    >
                      {u.role}
                    </span>
                    <span className="text-[11.5px] text-[#6b6e72]">{u.location}</span>
                  </div>
                  {justUpdated === u.id ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#15803D]">
                      <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                      Tersimpan
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(u)}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] text-[#0F3B59] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
                      >
                        <Pencil className="w-3 h-3" strokeWidth={2} />
                        Ubah
                      </button>
                      {u.id !== activeUser.id && (
                        <button
                          onClick={() => askDelete([u])}
                          aria-label={`Hapus ${u.name}`}
                          className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border border-[#C5CED3] text-[#DC2626] hover:bg-[#FEE2E2] active:scale-[0.97] transition-all duration-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-[#f5f5f6]">
                  <div className="text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase mb-1">Peran MOC</div>
                  <MocRoleEditor key={`${u.id}-${(u.mocRoles ?? []).join()}-${u.mocFunction ?? ""}`} user={u} />
                </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-[#fafafb]">
              <th className="w-9 pl-3.5 py-2.5" aria-hidden />
              <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Nama</th>
              <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Email</th>
              <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Peran</th>
              <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Lokasi</th>
              <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Peran MOC</th>
              <th className="text-right px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.map((u) => (
              <React.Fragment key={u.id}>
              <tr className="border-t border-[#f0f0f1]">
                <td className="w-9 pl-3.5 py-3">
                  {canSelect(u) && (
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleSelected(u.id)}
                      aria-label={`Pilih ${u.name}`}
                      className="w-4 h-4 shrink-0 accent-[#0F3B59] cursor-pointer"
                    />
                  )}
                </td>
                <td className="px-3.5 py-3 font-semibold text-[#0F172A]">
                  {u.name}
                  <div className="flex flex-wrap gap-1 mt-0.5 font-normal">
                    {u.mfaEnabled && <span className="text-[10px] font-bold px-1.5 py-[1px] rounded-full bg-[#EAF5EE] text-[#15663A]">MFA aktif</span>}
                    {u.emailVerifiedAt === null && <span className="text-[10px] font-bold px-1.5 py-[1px] rounded-full bg-[#FEF3C7] text-[#92400E]">Email belum diverifikasi</span>}
                  </div>
                </td>
                <td className="px-3.5 py-3 text-[#6b6e72]">{u.email ?? deriveDemoEmail(u.name)}</td>

                {editingId === u.id ? (
                  <>
                    <td className="px-3.5 py-2.5">
                      <MenuSelect ariaLabel="Peran" fullWidth minWidth={250} value={draftRole[u.id] ?? u.role} options={ROLES.map((r) => ({ value: r, label: r }))} onChange={(v) => setDraftRole((s) => ({ ...s, [u.id]: v as SimulatedUser["role"] }))} />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <MenuSelect ariaLabel="Lokasi" fullWidth minWidth={190} value={draftLocation[u.id] ?? u.location ?? locations[0].locationName} options={locations.map((l) => ({ value: l.locationName, label: l.locationName }))} onChange={(v) => setDraftLocation((s) => ({ ...s, [u.id]: v }))} />
                    </td>
                    <td className="px-3.5 py-2.5"><MocRoleEditor key={`${u.id}-${(u.mocRoles ?? []).join()}-${u.mocFunction ?? ""}`} user={u} /></td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleSaveEdit(u)}
                        className="text-[11.5px] font-bold px-3 py-1.5 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white transition-all duration-200 mr-1.5"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={cancelEdit}
                        aria-label="Batal"
                        className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border border-[#C5CED3] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
                      >
                        <X className="w-3.5 h-3.5 text-[#6b6e72]" strokeWidth={2} />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3.5 py-3">
                      <span
                        className="inline-flex items-center text-[11px] font-bold px-2 py-[3px] rounded-[8px]"
                        style={{ background: u.isRegionalAdmin ? "#EDE9FE" : "#E2E8EB", color: u.isRegionalAdmin ? "#6D28D9" : "#0B2C43" }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-[#6b6e72]">{u.location}</td>
                    <td className="px-3.5 py-3"><MocRoleEditor key={`${u.id}-${(u.mocRoles ?? []).join()}-${u.mocFunction ?? ""}`} user={u} /></td>
                    <td className="px-3.5 py-3 text-right">
                      {justUpdated === u.id ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#15803D]">
                          <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                          Tersimpan
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => startEdit(u)}
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] text-[#0F3B59] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
                          >
                            <Pencil className="w-3 h-3" strokeWidth={2} />
                            Ubah
                          </button>
                          {u.mfaEnabled && u.id !== activeUser.id && (
                            <button
                              onClick={() => resetMfa(u)}
                              className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] text-[#B45309] hover:bg-[#FEF3C7] active:scale-[0.97] transition-all duration-200"
                            >
                              Reset MFA
                            </button>
                          )}
                          {u.id !== activeUser.id && (
                            <button
                              onClick={() => askDelete([u])}
                              aria-label={`Hapus ${u.name}`}
                              className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border border-[#C5CED3] text-[#DC2626] hover:bg-[#FEE2E2] active:scale-[0.97] transition-all duration-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </>
                )}
              </tr>
              {lockoutWarningId === u.id && (
                <tr>
                  <td colSpan={7} className="px-3.5 py-2.5 bg-[#FEF3C7] border-t border-[#f0f0f1] text-[11.5px] font-semibold text-[#92400E]">
                    Tidak bisa disimpan — {u.name} satu-satunya Admin Regional saat ini. Tunjuk admin lain dulu sebelum menurunkan perannya.
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        </div>
        </>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? (deleting.length === 1 ? `Hapus ${deleting[0].name}?` : `Hapus ${deleting.length} user?`) : ""}
        confirmLabel="Ya, hapus"
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
