"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import {
  MOC_CHANGE_CATEGORIES,
  MOC_RISK_IMPACTS,
  MOC_RISK_LEVELS,
  MOC_RISK_LEVEL_LABEL,
  MOC_SIFAT_PERUBAHAN,
  riskValue,
  type MocBarrier,
  type MocFormContent,
} from "@/lib/domain/moc";

// Isian formulir Lampiran 5 (Tahap Inisiasi + Penilaian Risiko), urutan & label
// mengikuti formulir kertasnya. Terkontrol: induk memegang state lewat onChange.
export function emptyMocForm(defaults: Partial<MocFormContent> = {}): MocFormContent {
  return {
    unitOperasi: "",
    fungsi: "",
    region: "Jatimbalinus",
    anggaranType: "",
    // Tanggal LOKAL (en-CA = YYYY-MM-DD); toISOString() memakai UTC dan menghasilkan
    // hari sebelumnya bagi pengguna WIB pada dini hari.
    tanggal: new Date().toLocaleDateString("en-CA"),
    judul: "",
    latarBelakang: "",
    changeCategories: [],
    sifatPerubahan: "Permanen",
    validFrom: undefined,
    validUntil: undefined,
    deskripsi: "",
    prosesTerdampak: "",
    peraturanRelevan: "",
    stakeholderReviewer: "",
    studiKajian: "",
    usulanPerformer: "",
    initiatorName: "",
    initiatorJabatan: "",
    riskImpacts: [],
    hazardDescription: "",
    severity: null,
    probability: null,
    riskLevel: null,
    plantBarriers: [],
    processBarriers: [],
    peopleBarriers: [],
    upsideGain: "",
    downsideLoss: "",
    ...defaults,
  };
}

// Ambil HANYA isian formulir dari objek yang lebih besar (mis. MocRequest lengkap
// dengan riwayat/review) supaya tidak ikut terkirim saat menyimpan.
export function pickMocForm(src: MocFormContent): MocFormContent {
  const base = emptyMocForm() as unknown as Record<string, unknown>;
  const from = src as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(base)) out[key] = from[key];
  return out as unknown as MocFormContent;
}

const CARD =
  "bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)]";
const INPUT = "w-full min-h-[36px] px-2.5 py-1.5 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white";
const LABEL = "block text-[11.5px] font-bold text-[#0F172A] mb-1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${CARD} overflow-hidden`}>
      <h2 className="px-4 py-2.5 text-[12.5px] font-bold text-[#0F172A] border-b border-[#C5CED3] bg-[#E2E8EB]">{title}</h2>
      <div className="p-4 flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#6b6e72] mt-1">{hint}</p>}
    </div>
  );
}

function BarrierEditor({
  title,
  items,
  onChange,
  disabled,
}: {
  title: string;
  items: MocBarrier[];
  onChange: (next: MocBarrier[]) => void;
  disabled?: boolean;
}) {
  const rows = items.length > 0 ? items : [{ text: "", pic: "" }];
  const set = (i: number, patch: Partial<MocBarrier>) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div>
      <div className={LABEL}>{title}</div>
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-2 items-start">
            <textarea
              value={r.text}
              disabled={disabled}
              onChange={(e) => set(i, { text: e.target.value })}
              rows={2}
              placeholder={`${i + 1}. Tindakan pengendalian`}
              className={INPUT}
            />
            <input
              value={r.pic}
              disabled={disabled}
              onChange={(e) => set(i, { pic: e.target.value })}
              placeholder="Penanggung jawab"
              className={INPUT}
            />
            <button
              type="button"
              disabled={disabled || rows.length === 1}
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              aria-label="Hapus baris"
              className="min-h-[36px] px-2 text-[#6b6e72] hover:text-[#DC2626] disabled:opacity-30"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled || rows.length >= 20}
        onClick={() => onChange([...rows, { text: "", pic: "" }])}
        className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#0F3B59] hover:underline disabled:opacity-40"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Tambah baris
      </button>
    </div>
  );
}

export default function MocFormFields({
  value,
  onChange,
  disabled,
}: {
  value: MocFormContent;
  onChange: (patch: Partial<MocFormContent>) => void;
  disabled?: boolean;
}) {
  const toggle = <T extends string>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const nilai = riskValue(value.severity, value.probability);
  const num = (v: string): number | null => (v === "" ? null : Number(v));

  return (
    <div className="flex flex-col gap-4">
      <Section title="Informasi Formulir">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Unit Operasi">
            <input className={INPUT} disabled={disabled} value={value.unitOperasi} onChange={(e) => onChange({ unitOperasi: e.target.value })} />
          </Field>
          <Field label="Fungsi">
            <input className={INPUT} disabled={disabled} value={value.fungsi} onChange={(e) => onChange({ fungsi: e.target.value })} />
          </Field>
          <Field label="Region">
            <input className={INPUT} disabled={disabled} value={value.region} onChange={(e) => onChange({ region: e.target.value })} />
          </Field>
          <Field label="Anggaran" hint="Mis. ABO / ABI / ABO Khusus.">
            <input
              className={INPUT}
              disabled={disabled}
              list="moc-anggaran"
              value={value.anggaranType}
              onChange={(e) => onChange({ anggaranType: e.target.value })}
            />
            <datalist id="moc-anggaran">
              <option value="ABO" />
              <option value="ABI" />
              <option value="ABO Khusus" />
            </datalist>
          </Field>
          <Field label="Tanggal">
            <input type="date" className={INPUT} disabled={disabled} value={value.tanggal} onChange={(e) => onChange({ tanggal: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section title="Tahap Inisiasi">
        <Field label="Judul Perubahan">
          <input className={INPUT} disabled={disabled} maxLength={300} value={value.judul} onChange={(e) => onChange({ judul: e.target.value })} />
        </Field>
        <Field label="Latar Belakang / Tujuan Perubahan">
          <textarea className={INPUT} disabled={disabled} rows={3} value={value.latarBelakang} onChange={(e) => onChange({ latarBelakang: e.target.value })} />
        </Field>

        <div>
          <div className={LABEL}>Aktivitas / Ruang Lingkup Perubahan</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
            {MOC_CHANGE_CATEGORIES.map((c) => (
              <label key={c} className="flex items-start gap-2 text-[12.5px] text-[#0F172A] cursor-pointer">
                <input
                  type="checkbox"
                  disabled={disabled}
                  className="mt-[3px]"
                  checked={value.changeCategories.includes(c)}
                  onChange={() => onChange({ changeCategories: toggle(value.changeCategories, c) })}
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-6 gap-y-3 items-start">
          <div>
            <div className={LABEL}>Sifat Perubahan</div>
            <div className="flex gap-4 flex-wrap">
              {MOC_SIFAT_PERUBAHAN.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                  <input
                    type="radio"
                    name="sifat"
                    disabled={disabled}
                    checked={value.sifatPerubahan === s}
                    onChange={() => onChange({ sifatPerubahan: s })}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className={LABEL}>
              Masa Berlaku{value.sifatPerubahan === "Sementara" ? " (wajib untuk perubahan Sementara)" : ""}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" className={`${INPUT} !w-auto`} disabled={disabled} value={value.validFrom ?? ""} onChange={(e) => onChange({ validFrom: e.target.value || undefined })} />
              <span className="text-[12px] text-[#6b6e72]">sampai</span>
              <input type="date" className={`${INPUT} !w-auto`} disabled={disabled} value={value.validUntil ?? ""} onChange={(e) => onChange({ validUntil: e.target.value || undefined })} />
            </div>
          </div>
        </div>

        <Field label="1. Deskripsi Perubahan (termasuk ruang lingkup dan persyaratan)" hint="Lampirkan detail metode / langkah kerja.">
          <textarea className={INPUT} disabled={disabled} rows={5} value={value.deskripsi} onChange={(e) => onChange({ deskripsi: e.target.value })} />
        </Field>
        <Field label="2. Proses, dokumen, dan pihak yang terkait / terdampak akibat perubahan">
          <textarea className={INPUT} disabled={disabled} rows={3} value={value.prosesTerdampak} onChange={(e) => onChange({ prosesTerdampak: e.target.value })} />
        </Field>
        <Field label="3. Peraturan / regulasi / perizinan / sertifikasi peralatan yang relevan dengan perubahan">
          <textarea className={INPUT} disabled={disabled} rows={3} value={value.peraturanRelevan} onChange={(e) => onChange({ peraturanRelevan: e.target.value })} />
        </Field>
        <Field label="4. Stakeholder / Subject Matter Expert / Tenaga Ahli (MoC Reviewer)">
          <textarea className={INPUT} disabled={disabled} rows={2} value={value.stakeholderReviewer} onChange={(e) => onChange({ stakeholderReviewer: e.target.value })} />
        </Field>
        <Field label="5. Studi kelayakan teknis / kajian risiko yang diperlukan">
          <textarea className={INPUT} disabled={disabled} rows={2} value={value.studiKajian} onChange={(e) => onChange({ studiKajian: e.target.value })} />
        </Field>
        <Field label="6. Usulan tim pelaksana perubahan (MoC Performer)">
          <textarea className={INPUT} disabled={disabled} rows={2} value={value.usulanPerformer} onChange={(e) => onChange({ usulanPerformer: e.target.value })} />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Nama MoC Initiator" hint="Akun Initiator dipakai bersama; tuliskan nama pengusul sebenarnya.">
            <input className={INPUT} disabled={disabled} value={value.initiatorName} onChange={(e) => onChange({ initiatorName: e.target.value })} />
          </Field>
          <Field label="Jabatan MoC Initiator">
            <input className={INPUT} disabled={disabled} value={value.initiatorJabatan} onChange={(e) => onChange({ initiatorJabatan: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section title="Tahap Penilaian Risiko dan Penentuan Pengendalian">
        <div>
          <div className={LABEL}>Jenis Dampak Risiko</div>
          <div className="flex gap-x-5 gap-y-1.5 flex-wrap">
            {MOC_RISK_IMPACTS.map((r) => (
              <label key={r} className="flex items-center gap-1.5 text-[12.5px] font-semibold cursor-pointer">
                <input type="checkbox" disabled={disabled} checked={value.riskImpacts.includes(r)} onChange={() => onChange({ riskImpacts: toggle(value.riskImpacts, r) })} />
                {r.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
        <Field label="Deskripsi Bahaya">
          <textarea className={INPUT} disabled={disabled} rows={3} value={value.hazardDescription} onChange={(e) => onChange({ hazardDescription: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <Field label="Tingkat Keparahan (1–5)">
            <select className={INPUT} disabled={disabled} value={value.severity ?? ""} onChange={(e) => onChange({ severity: num(e.target.value) })}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Probabilitas (1–5)">
            <select className={INPUT} disabled={disabled} value={value.probability ?? ""} onChange={(e) => onChange({ probability: num(e.target.value) })}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Nilai Risiko" hint="Keparahan × Probabilitas.">
            <div className={`${INPUT} bg-[#E2E8EB] font-mono tabular-nums flex items-center`}>{nilai ?? "—"}</div>
          </Field>
          <Field label="Tingkat Risiko" hint="Dipilih Initiator; batas nilai→tingkat belum ditetapkan di TKO.">
            <select className={INPUT} disabled={disabled} value={value.riskLevel ?? ""} onChange={(e) => onChange({ riskLevel: (e.target.value || null) as MocFormContent["riskLevel"] })}>
              <option value="">—</option>
              {MOC_RISK_LEVELS.map((l) => <option key={l} value={l}>{l} — {MOC_RISK_LEVEL_LABEL[l]}</option>)}
            </select>
          </Field>
        </div>

        <BarrierEditor title="Plant Barrier (fasilitas dan peralatan yang diperlukan untuk mitigasi risiko perubahan)" items={value.plantBarriers} disabled={disabled} onChange={(next) => onChange({ plantBarriers: next })} />
        <BarrierEditor title="Process Barrier (sistem manajemen dan prosedur kerja yang diperlukan untuk mitigasi risiko perubahan)" items={value.processBarriers} disabled={disabled} onChange={(next) => onChange({ processBarriers: next })} />
        <BarrierEditor title="People Barrier (kompetensi dan organisasi yang diperlukan untuk mitigasi risiko perubahan)" items={value.peopleBarriers} disabled={disabled} onChange={(next) => onChange({ peopleBarriers: next })} />

        <Field label="Upside Gain (Peluang / Opportunity)">
          <textarea className={INPUT} disabled={disabled} rows={2} value={value.upsideGain} onChange={(e) => onChange({ upsideGain: e.target.value })} />
        </Field>
        <Field label="Downside Loss (Threat / Ancaman)">
          <textarea className={INPUT} disabled={disabled} rows={2} value={value.downsideLoss} onChange={(e) => onChange({ downsideLoss: e.target.value })} />
        </Field>
      </Section>
    </div>
  );
}
