"use client";

// Lanjutkan catatan MOC offline: Controller lokasi atau Admin Regional menaikkan status terakhir dan/atau menambah
// Form 6/7 pada catatan offline yang sudah ada. Berkas yang wajib mengikuti status baru, dihitung bersama berkas
// yang sudah tersimpan; status tidak dapat mundur. Server memeriksa ulang semua aturan ini.
import React, { useState } from "react";
import { Paperclip, X } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { mocApi } from "@/lib/useMoc";
import { uploadFileToR2 } from "@/lib/uploadFile";
import { MOC_REGISTER_STATUSES, type MocRequest } from "@/lib/domain/moc";

const INPUT = "w-full min-h-[38px] px-3 py-2 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]";
const LABEL = "block text-[12.5px] font-bold text-[#0F172A] mb-1";

type Slot = "form6" | "form7";
type Picked = { name: string; id: string };

export default function MocOfflineContinue({ moc, onNotice }: { moc: MocRequest; onNotice: (m: string) => void }) {
  const { activeUser } = usePsi();
  const canAct = !!activeUser.isRegionalAdmin || (activeUser.role.includes("Controller") && activeUser.location === moc.location);
  const order = (s: string) => MOC_REGISTER_STATUSES.indexOf(s as (typeof MOC_REGISTER_STATUSES)[number]);
  const options = MOC_REGISTER_STATUSES.filter((s) => order(s) >= order(moc.registerStatus));
  const [status, setStatus] = useState<string>(moc.registerStatus);
  const [tglSetuju, setTglSetuju] = useState("");
  const [tglTutup, setTglTutup] = useState("");
  const [files, setFiles] = useState<Record<Slot, Picked[]>>({ form6: [], form7: [] });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!moc.isOffline || moc.registerStatus === "Closed" || !canAct) return null;

  const stored6 = moc.evidence.some((e) => e.stage === "Offline-Form6");
  const stored7 = moc.evidence.some((e) => e.stage === "Offline-Form7");
  const need6 = (status === "Pemantauan" || status === "Tinjauan Akhir" || status === "Closed") && !stored6;
  const need7 = status === "Closed" && !stored7;
  const needSetuju = status !== "Inisiasi & Validasi" && !moc.approvedAt;
  const needTutup = status === "Closed";
  const sameStatus = status === moc.registerStatus;
  const hasNew = files.form6.length + files.form7.length > 0;
  const ready =
    !uploading && (!sameStatus || hasNew) && (!need6 || files.form6.length > 0) && (!need7 || files.form7.length > 0) && (!needSetuju || !!tglSetuju) && (!needTutup || !!tglTutup);

  const addFiles = async (slot: Slot, list: FileList | null) => {
    if (!list) return;
    setUploading(true);
    setError(null);
    try {
      const added: Picked[] = [];
      for (const f of Array.from(list)) added.push({ name: f.name, id: await uploadFileToR2(f, { allowDuplicate: true }) });
      setFiles((cur) => ({ ...cur, [slot]: [...cur[slot], ...added] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah berkas.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await mocApi.continueOffline(moc.id, {
        registerStatus: status,
        tanggalDisetujui: needSetuju ? tglSetuju : "",
        tanggalDitutup: needTutup ? tglTutup : "",
        form6: files.form6.map((f) => f.id),
        form7: files.form7.map((f) => f.id),
      });
      setFiles({ form6: [], form7: [] });
      onNotice("Catatan offline diperbarui.");
    } catch (e) {
      const issues = (e as Error & { issues?: { message?: string }[] }).issues;
      setError(Array.isArray(issues) && issues[0]?.message ? issues[0].message : e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  const zone = (slot: Slot, title: string, required: boolean) => (
    <div>
      <label className={LABEL}>
        {title} <span className="font-normal text-[#6b6e72]">{required ? "— wajib" : "— opsional"}</span>
      </label>
      <label className="flex items-center justify-center gap-2 px-4 py-4 text-[12.5px] font-semibold border border-dashed border-[#C5CED3] hover:border-[#0F3B59] rounded-[10px] cursor-pointer">
        <Paperclip className="w-3.5 h-3.5" strokeWidth={2} />
        {uploading ? "Mengunggah…" : "Pilih berkas (boleh banyak)"}
        <input type="file" multiple className="hidden" disabled={uploading || busy} onChange={(e) => { void addFiles(slot, e.target.files); e.target.value = ""; }} />
      </label>
      {files[slot].length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {files[slot].map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-[12.5px]">
              <Paperclip className="w-3.5 h-3.5 text-[#6b6e72]" strokeWidth={2} /> {f.name}
              <button type="button" aria-label="Hapus berkas" onClick={() => setFiles((cur) => ({ ...cur, [slot]: cur[slot].filter((x) => x.id !== f.id) }))} className="p-0.5 text-[#6b6e72] hover:text-[#DC2626]">
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section className="bg-white rounded-[14px] border border-[#C5CED3] p-5 mb-5" aria-label="Lanjutkan catatan offline">
      <h2 className="font-heading text-[15px] font-bold text-[#0F172A]">Lanjutkan catatan offline</h2>
      <div className="mt-3 flex flex-col gap-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className={LABEL}>Status terakhir</label>
            <select className={INPUT} value={status} onChange={(e) => setStatus(e.target.value)}>
              {options.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {needSetuju && (
            <div>
              <label className={LABEL}>Tanggal disetujui</label>
              <input type="date" className={INPUT} value={tglSetuju} onChange={(e) => setTglSetuju(e.target.value)} />
            </div>
          )}
          {needTutup && (
            <div>
              <label className={LABEL}>Tanggal ditutup</label>
              <input type="date" className={INPUT} value={tglTutup} onChange={(e) => setTglTutup(e.target.value)} />
            </div>
          )}
        </div>
        {zone("form6", "Form 6 — Pemantauan (Lampiran 6)", need6)}
        {(status === "Closed" || stored7) && zone("form7", "Form 7 — Tinjauan Akhir & Penutupan (Lampiran 7)", need7)}
        {error && <p role="alert" className="text-[13px] font-semibold text-[#DC2626]">{error}</p>}
        <div>
          <button type="button" disabled={!ready || busy} onClick={submit} className="px-6 py-2.5 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13.5px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </section>
  );
}
