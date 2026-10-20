"use client";

// Catat MOC Offline: MOC yang sudah dibuat di luar aplikasi dicatat ke Register beserta dokumennya. Hanya Controller
// lokasi atau Admin Regional. Nomor MoC disusun dari nomor urut + bulan + tahun (format standar), jadi nomor otomatis
// berikutnya melanjutkan dari nomor terbesar yang tercatat.
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Paperclip, X } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { mocApi } from "@/lib/useMoc";
import { uploadFileToR2 } from "@/lib/uploadFile";
import { isRegionalUnit } from "@/lib/domain/regionalUnit";
import { formatMocNumber, kboForMoc } from "@/lib/domain/kbo";
import { REGIONAL_KBO_FUNCTIONS } from "@/lib/domain/kbo";
import { MOC_REGISTER_STATUSES, MOC_SIFAT_PERUBAHAN, type MocRegisterStatus, type MocSifatPerubahan } from "@/lib/domain/moc";

const INPUT = "w-full min-h-[38px] px-3 py-2 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]";
const LABEL = "block text-[12.5px] font-bold text-[#0F172A] mb-1";

export default function MocOfflinePage() {
  const router = useRouter();
  const { activeUser, allLocations } = usePsi();
  const isAdmin = !!activeUser.isRegionalAdmin;
  const isController = activeUser.role.includes("Controller");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const [location, setLocation] = useState(activeUser.location ?? "");
  const [fungsi, setFungsi] = useState("");
  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState(today);
  const [sequence, setSequence] = useState("");
  const [month, setMonth] = useState(String(Number(today.slice(5, 7))));
  const [year, setYear] = useState(today.slice(0, 4));
  const [sifat, setSifat] = useState<MocSifatPerubahan>("Permanen");
  const [status, setStatus] = useState<MocRegisterStatus>("Inisiasi & Validasi");
  const [initiatorName, setInitiatorName] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tglSetuju, setTglSetuju] = useState("");
  const [tglTutup, setTglTutup] = useState("");
  type Slot = "form5" | "form6" | "form7";
  const [files, setFiles] = useState<Record<Slot, { name: string; id: string }[]>>({ form5: [], form6: [], form7: [] });
  const [uploading, setUploading] = useState(false);
  const [dragSlot, setDragSlot] = useState<Slot | null>(null); // kotak yang sedang disinggahi berkas seretan
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regional = isRegionalUnit(location);
  const kbo = location ? kboForMoc(location, fungsi) : null;
  const seqN = Number(sequence);
  const preview = useMemo(
    () => (kbo && Number.isInteger(seqN) && seqN > 0 && Number(month) >= 1 ? formatMocNumber(seqN, kbo, Number(month), Number(year)) : null),
    [kbo, seqN, month, year]
  );
  // Form wajib mengikuti status terakhir: Form 5 selalu; Form 6 mulai Pemantauan; Form 7 saat Closed.
  const need6 = status === "Pemantauan" || status === "Tinjauan Akhir" || status === "Closed";
  const need7 = status === "Closed";
  const needSetuju = status !== "Inisiasi & Validasi";
  const filesOk = files.form5.length > 0 && (!need6 || files.form6.length > 0) && (!need7 || files.form7.length > 0);
  const datesOk = (!needSetuju || !!tglSetuju) && (!need7 || !!tglTutup);
  const ready = !!location && judul.trim().length >= 3 && !!preview && filesOk && datesOk && !uploading && (!regional || !!fungsi);

  if (!isAdmin && !(isController && activeUser.location)) {
    return (
      <div className="bg-white border border-[#C5CED3] rounded-[8px] p-6 text-[13px] text-[#0F172A]">
        Hanya <strong>Controller</strong> lokasi atau <strong>Admin Regional</strong> yang dapat mencatat MOC offline.{" "}
        <Link href="/moc" className="font-bold text-[#0F3B59] hover:underline">Kembali ke Register</Link>
      </div>
    );
  }

  const addFiles = async (slot: Slot, list: FileList | null) => {
    if (!list) return;
    setUploading(true);
    setError(null);
    try {
      const added: { name: string; id: string }[] = [];
      for (const f of Array.from(list)) added.push({ name: f.name, id: await uploadFileToR2(f) });
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
      const saved = await mocApi.createOffline({
        location,
        fungsi: regional ? fungsi : "",
        judul: judul.trim(),
        tanggal,
        sequence: seqN,
        month: Number(month),
        year: Number(year),
        sifatPerubahan: sifat,
        registerStatus: status,
        initiatorName: initiatorName.trim(),
        deskripsi: deskripsi.trim(),
        tanggalDisetujui: tglSetuju,
        tanggalDitutup: need7 ? tglTutup : "",
        form5: files.form5.map((f) => f.id),
        form6: need6 ? files.form6.map((f) => f.id) : [],
        form7: need7 ? files.form7.map((f) => f.id) : [],
      });
      router.push(`/moc/${saved.id}`);
    } catch (e) {
      const issues = (e as Error & { issues?: { message?: string }[] }).issues;
      setError(Array.isArray(issues) && issues[0]?.message ? issues[0].message : e instanceof Error ? e.message : "Gagal menyimpan.");
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[760px] mx-auto">
      <Link href="/moc" className="text-[12px] font-bold text-[#0F3B59] hover:underline">← Register MOC</Link>
      <h1 className="font-heading text-[18px] font-bold text-[#0F172A] mt-2 mb-4">Catat MOC Offline</h1>

      <div className="bg-white border border-[#D8E1E4] rounded-[14px] p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className={LABEL}>Lokasi</label>
            {isAdmin ? (
              <select className={INPUT} value={location} onChange={(e) => { setLocation(e.target.value); setFungsi(""); }}>
                <option value="">Pilih lokasi…</option>
                {allLocations.map((l) => <option key={l.locationName} value={l.locationName}>{l.locationName}</option>)}
              </select>
            ) : (
              <input className={`${INPUT} bg-[#E2E8EB]`} value={location} disabled />
            )}
          </div>
          {regional && (
            <div>
              <label className={LABEL}>Fungsi pengusul</label>
              <select className={INPUT} value={fungsi} onChange={(e) => setFungsi(e.target.value)}>
                <option value="">Pilih fungsi…</option>
                {REGIONAL_KBO_FUNCTIONS.map((f) => <option key={f.kbo} value={f.label}>{f.label} ({f.kbo})</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={LABEL}>Judul perubahan</label>
          <input className={INPUT} maxLength={300} value={judul} onChange={(e) => setJudul(e.target.value)} />
        </div>

        <div className="rounded-[10px] bg-[#F4F7F8] p-3.5">
          <div className={LABEL}>Nomor MoC di dokumen offline</div>
          <div className="grid grid-cols-3 gap-2.5">
            <input className={INPUT} type="number" min={1} placeholder="Nomor urut (mis. 4)" value={sequence} onChange={(e) => setSequence(e.target.value)} aria-label="Nomor urut" />
            <select className={INPUT} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Bulan">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Bulan {i + 1}</option>)}
            </select>
            <input className={INPUT} type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} aria-label="Tahun" />
          </div>
          <p className="text-[12px] mt-2 text-[#3a3d40]">
            Nomor yang tercatat:{" "}
            <span className="font-mono font-semibold">{preview ?? (location && !kbo ? "KBO belum ditetapkan untuk pilihan ini" : "—")}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className={LABEL}>Tanggal MOC</label>
            <input type="date" className={INPUT} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Sifat perubahan</label>
            <select className={INPUT} value={sifat} onChange={(e) => setSifat(e.target.value as MocSifatPerubahan)}>
              {MOC_SIFAT_PERUBAHAN.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Status terakhir</label>
            <select className={INPUT} value={status} onChange={(e) => setStatus(e.target.value as MocRegisterStatus)}>
              {MOC_REGISTER_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {(needSetuju || need7) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {needSetuju && (
              <div>
                <label className={LABEL}>Tanggal disetujui</label>
                <input type="date" className={INPUT} value={tglSetuju} onChange={(e) => setTglSetuju(e.target.value)} />
              </div>
            )}
            {need7 && (
              <div>
                <label className={LABEL}>Tanggal ditutup</label>
                <input type="date" className={INPUT} value={tglTutup} onChange={(e) => setTglTutup(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className={LABEL}>Nama Initiator (opsional)</label>
            <input className={INPUT} maxLength={200} value={initiatorName} onChange={(e) => setInitiatorName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Deskripsi singkat (opsional)</label>
          <textarea className={INPUT} rows={3} maxLength={5000} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
        </div>

        {([
          { slot: "form5" as Slot, title: "Form 5 — Pengusulan & Validasi (Lampiran 5)", required: true },
          { slot: "form6" as Slot, title: "Form 6 — Pemantauan (Lampiran 6)", required: need6 },
          { slot: "form7" as Slot, title: "Form 7 — Tinjauan Akhir & Penutupan (Lampiran 7)", required: need7 },
        ]).map(({ slot, title, required }) => (
          <div key={slot}>
            <label className={LABEL}>{title} <span className="font-normal text-[#6b6e72]">{required ? "— wajib" : "— opsional"}</span></label>
            <label
              onDragOver={(e) => { e.preventDefault(); if (!uploading && !busy) setDragSlot(slot); }}
              onDragLeave={() => setDragSlot((cur) => (cur === slot ? null : cur))}
              onDrop={(e) => { e.preventDefault(); setDragSlot(null); if (!uploading && !busy) addFiles(slot, e.dataTransfer.files); }}
              className={`flex items-center justify-center gap-2 px-4 py-5 text-[12.5px] font-semibold border border-dashed rounded-[10px] cursor-pointer transition-colors ${dragSlot === slot ? "border-[#0F3B59] bg-[#E2E8EB]" : "border-[#C5CED3] hover:border-[#0F3B59]"}`}
            >
              <Paperclip className="w-3.5 h-3.5" strokeWidth={2} />
              {uploading ? "Mengunggah…" : dragSlot === slot ? "Lepas berkas di sini" : "Seret berkas ke sini atau klik untuk memilih (boleh banyak)"}
              <input type="file" multiple className="hidden" disabled={uploading || busy} onChange={(e) => { addFiles(slot, e.target.files); e.target.value = ""; }} />
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
        ))}

        {error && <p role="alert" className="text-[13px] font-semibold text-[#DC2626]">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="button" disabled={!ready || busy} onClick={submit} className="px-6 py-2.5 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13.5px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {busy ? "Menyimpan…" : "Catat MOC Offline"}
          </button>
          {!ready && !busy && <span className="text-[11.5px] text-[#6b6e72]">Lengkapi lokasi, judul, nomor, tanggal, dan dokumen form yang wajib.</span>}
        </div>
      </div>
    </div>
  );
}
