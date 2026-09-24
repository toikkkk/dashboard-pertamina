import React from "react";
import {
  MOC_CHANGE_CATEGORIES,
  MOC_RISK_IMPACTS,
  MOC_SIFAT_PERUBAHAN,
  riskValue,
  reviewsOfCurrentRound,
  type MocBarrier,
  type MocRequest,
} from "@/lib/domain/moc";

// Lembar formulir MoC dalam HTML/tabel, mengikuti tata letak formulir aslinya pada TKO
// B13.3-07/PNA400000/2025-S9 (Lampiran 5, 6, 7). Dipakai untuk tampilan baca, cetak/
// PDF, dan ekspor Word — kolom "Tanda Tangan" sengaja kosong karena tanda tangan
// dilakukan di luar web. Hanya <table> biasa (tanpa CSS grid) agar aman di Word.
//
// Catatan isi: Lampiran 5 memuat data yang dikelola web. Lampiran 6 (Pemantauan) dan 7
// (Tinjauan Akhir & Penutupan) baru terisi bagian informasi MoC-nya; tabel kegiatan /
// tindak lanjut / tanggapan dibiarkan kosong untuk diisi di luar web karena alur tahap
// Pemantauan dan seterusnya belum ditetapkan.
export const SHEET_CSS = `
.moc-sheet{width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.35;color:#000;background:#fff}
.moc-sheet td{border:1px solid #1f2937;padding:3px 6px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere}
.moc-sheet td.nb{border:0}
.moc-sheet .band{background:#9CC2E5;text-align:center;font-weight:700}
.moc-sheet .gray{background:#D9D9D9;text-align:center;font-weight:700}
.moc-sheet .fill{background:#BFBFBF}
.moc-sheet .ctr{text-align:center}
.moc-sheet .box{white-space:pre-wrap}
.moc-sheet .foot{font-style:italic;font-size:10px}
.moc-sheet .cats{width:100%;border-collapse:collapse;table-layout:fixed;margin:-3px -6px;width:calc(100% + 12px)}
.moc-sheet .cats td{border-top:0;border-left:0;border-right:1px solid #1f2937;border-bottom:1px solid #1f2937;padding:3px 5px;height:32px;font-size:10.5px}
.moc-sheet .cats tr:last-child td{border-bottom:0}
.moc-sheet .cats td:last-child{border-right:0}
.moc-form-title{font-family:Arial,Helvetica,sans-serif;text-align:center;font-weight:700;font-size:15px;margin:2px 0 10px;color:#000}
.moc-form-ref{font-family:Arial,Helvetica,sans-serif;font-size:13px;margin:0 0 12px;color:#000;display:flex;justify-content:space-between}
.moc-sheet-page-break{break-before:page;page-break-before:always}
@media print{
  /* Di layar lembar dirancang minimal 860px; saat cetak lebar minimum dilepas (lihat
     .moc-min-w) agar tabel mengikuti lebar kertas A4 dan tidak terpotong. */
  .moc-min-w{min-width:0!important}
  .moc-sheet{font-size:9px}
  .moc-sheet td{padding:2px 4px}
  .moc-sheet .cats td{font-size:9px;padding:2px 4px;height:26px}
  .moc-sheet tr{break-inside:avoid;page-break-inside:avoid}
}
`;

const CHECK = "☑";
const BOX = "☐";
const TKO_REF = "Lampiran %N% – TKO No.    B13.3-07/PNA400000/2025-S9";

function dmy(iso?: string | null): string {
  if (!iso) return "DD/MM/YYYY";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

const LEVEL_BG: Record<string, string> = { L: "#92D050", M: "#FFFF00", H: "#FF5050" };
const Cols12 = () => <colgroup>{Array.from({ length: 12 }, (_, i) => <col key={i} style={{ width: `${100 / 12}%` }} />)}</colgroup>;

function RefLine({ n }: { n: number }) {
  return (
    <div className="moc-form-ref">
      <span>{TKO_REF.replace("%N%", String(n))}</span>
      <span>Revisi Ke-1</span>
    </div>
  );
}

// Baris "Aktivitas / Ruang Lingkup Perubahan" — 13 kotak dalam grid 6 kolom seperti formulir asli.
function CategoryRow({ moc }: { moc: MocRequest }) {
  const cells = MOC_CHANGE_CATEGORIES.map((c) => (
    <td key={c}>{moc.changeCategories.includes(c) ? CHECK : BOX} {c}</td>
  ));
  return (
    <tr>
      <td colSpan={3}>Aktivitas / Ruang Lingkup Perubahan</td>
      <td colSpan={9}>
        <table className="cats">
          <tbody>
            <tr>{cells.slice(0, 6)}</tr>
            <tr>{cells.slice(6, 12)}</tr>
            <tr>
              <td colSpan={2}>{cells[12].props.children}</td>
              <td className="fill" colSpan={4} />
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function SifatMasaRows({ moc }: { moc: MocRequest }) {
  return (
    <>
      <tr>
        <td colSpan={3}>Sifat Perubahan</td>
        <td colSpan={9}>
          {MOC_SIFAT_PERUBAHAN.map((s) => (
            <span key={s} style={{ marginRight: 22 }}>{moc.sifatPerubahan === s ? CHECK : BOX} {s}</span>
          ))}
        </td>
      </tr>
      <tr>
        <td colSpan={3}>Masa Berlaku</td>
        <td colSpan={9} style={{ color: moc.validFrom ? "#000" : "#888" }}>
          {dmy(moc.validFrom)} &nbsp;&nbsp; sampai &nbsp;&nbsp; {dmy(moc.validUntil)}
        </td>
      </tr>
    </>
  );
}

function InfoRows({ moc, withTanggal }: { moc: MocRequest; withTanggal: boolean }) {
  return (
    <>
      <tr>
        <td colSpan={6}>Nomor MoC: {moc.mocNumber ?? ""}</td>
        <td colSpan={3}>Fungsi: {moc.fungsi}</td>
        <td colSpan={3}>Anggaran: {moc.anggaranType || "(ABO/ABI/ABO Khusus/….)"}</td>
      </tr>
      {withTanggal ? (
        <>
          <tr>
            <td colSpan={6}>Tanggal: {dmy(moc.tanggal)}</td>
            <td colSpan={6}>Area / Lokasi: {moc.location}</td>
          </tr>
          <tr>
            <td colSpan={6}>Unit Operasi: {moc.unitOperasi}</td>
            <td colSpan={6}>Region : {moc.region}</td>
          </tr>
        </>
      ) : (
        <tr>
          <td colSpan={6}>Unit Operasi: {moc.unitOperasi}</td>
          <td colSpan={3}>Area / Lokasi: {moc.location}</td>
          <td colSpan={3}>Region : {moc.region}</td>
        </tr>
      )}
    </>
  );
}

function InitiatorSignRows({ moc }: { moc: MocRequest }) {
  return (
    <>
      <tr><td colSpan={12} className="gray">MoC Initiator</td></tr>
      <tr><td colSpan={3} className="ctr"><b>Nama</b></td><td colSpan={3} className="ctr"><b>Jabatan</b></td><td colSpan={3} className="ctr"><b>Tanggal</b></td><td colSpan={3} className="ctr"><b>Tanda Tangan</b></td></tr>
      <tr style={{ height: 58 }}><td colSpan={3}>{moc.initiatorName}</td><td colSpan={3}>{moc.initiatorJabatan}</td><td colSpan={3}>{dmy(moc.tanggal)}</td><td colSpan={3} /></tr>
    </>
  );
}

function ControllerRows() {
  return (
    <>
      <tr><td colSpan={12} className="gray">MoC Controller</td></tr>
      <tr><td colSpan={3} className="ctr"><b>Jabatan</b></td><td colSpan={9}>Keterangan:</td></tr>
      <tr style={{ height: 52 }}><td colSpan={3}>Nama :<br />Tanggal :</td><td colSpan={9} /></tr>
    </>
  );
}

function BarrierRows({ title, items }: { title: string; items: MocBarrier[] }) {
  const rows = items.length >= 2 ? items : [...items, ...Array.from({ length: 2 - items.length }, () => ({ text: "", pic: "" }))];
  return (
    <>
      <tr>
        <td colSpan={7} style={{ fontStyle: "italic", fontWeight: 700 }}>{title}</td>
        <td colSpan={3} />
      </tr>
      {rows.map((b, i) => (
        <tr key={i}>
          <td colSpan={7} style={{ whiteSpace: "pre-wrap", height: 22 }}>{i + 1}. {b.text || "……………………………………………………"}</td>
          <td colSpan={3}>{b.pic}</td>
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Lampiran 5 — Formulir MoC: Pengusulan & Validasi                    */
/* ------------------------------------------------------------------ */
export default function MocSheet({ moc }: { moc: MocRequest }) {
  const value = riskValue(moc.severity, moc.probability);
  const reviews = reviewsOfCurrentRound(moc);
  const reviewRows = reviews.length > 0 ? reviews : Array.from({ length: 3 }, () => null);

  return (
    <div className="moc-sheet-wrap" data-sheet="lampiran-5">
      <style>{SHEET_CSS}</style>
      <div className="moc-form-title">FORMULIR MOC – PENGUSULAN &amp; VALIDASI</div>
      <table className="moc-sheet">
        <Cols12 />
        <tbody>
          <tr><td colSpan={12} className="ctr" style={{ fontWeight: 700 }}>FORMULIR PENGUSULAN DAN VALIDASI MANAGEMENT OF CHANGE (MoC)</td></tr>
          <InfoRows moc={moc} withTanggal />
          <tr><td colSpan={12} className="band">Tahap Inisiasi</td></tr>
          <tr><td colSpan={3}>Judul Perubahan</td><td colSpan={9} style={{ fontWeight: 700 }}>{moc.judul}</td></tr>
          <tr><td colSpan={3} style={{ height: 52 }}>Latar Belakang / Tujuan Perubahan</td><td colSpan={9} className="box">{moc.latarBelakang}</td></tr>
          <CategoryRow moc={moc} />
          <SifatMasaRows moc={moc} />
          {[
            ["1.Deskripsi Perubahan (termasuk ruang lingkup dan persyaratan)\n*Lampirkan detail metode / langkah kerja", moc.deskripsi],
            ["2.Proses, dokumen, dan pihak yang terkait / terdampak akibat perubahan", moc.prosesTerdampak],
            ["3.Peraturan / regulasi / perizinan / sertifikasi peralatan yang relevan dengan perubahan", moc.peraturanRelevan],
            ["4. Stakeholder/Subject Matter Expert/Tenaga Ahli (MoC Reviewer)", moc.stakeholderReviewer],
            ["5. Studi kelayakan teknis / kajian risiko yang diperlukan", moc.studiKajian],
            ["6. Usulan tim pelaksana perubahan (MoC Performer)", moc.usulanPerformer],
          ].map(([label, val]) => (
            <tr key={label} style={{ height: 78 }}>
              <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>{label}</td>
              <td colSpan={9} className="box">{val}</td>
            </tr>
          ))}
          <InitiatorSignRows moc={moc} />
        </tbody>
      </table>

      <div className="moc-sheet-page-break" style={{ marginTop: 16 }}>
        <RefLine n={5} />
        <table className="moc-sheet">
          <Cols12 />
          <tbody>
            <tr><td colSpan={12} className="band">Tahap Penilaian Risiko dan Penentuan Pengendalian</td></tr>
            <tr>
              <td colSpan={2}>Jenis Dampak Risiko</td>
              {MOC_RISK_IMPACTS.map((r) => (
                <td key={r} colSpan={2} style={{ fontWeight: 700 }}>{moc.riskImpacts.includes(r) ? CHECK : BOX} {r.toUpperCase()}</td>
              ))}
            </tr>
            <tr>
              <td colSpan={2} style={{ height: 40 }}>Deskripsi Bahaya</td>
              <td colSpan={10} className="box">{moc.hazardDescription || "……………………………………………………………………………………………………………………"}</td>
            </tr>
            <tr>
              <td colSpan={2}>Tingkat Keparahan :</td>
              <td colSpan={2} className="ctr">{moc.severity ?? ""}</td>
              <td colSpan={2}>Probabilitas :</td>
              <td colSpan={2} className="ctr">{moc.probability ?? ""}</td>
              <td colSpan={1}>Nilai Risiko</td>
              <td colSpan={1} className="ctr">{value ?? ""}</td>
              <td colSpan={1}>Tingkat Risiko</td>
              <td colSpan={1} className="ctr" style={{ background: moc.riskLevel ? LEVEL_BG[moc.riskLevel] : undefined, fontWeight: 700 }}>{moc.riskLevel ?? ""}</td>
            </tr>
            <tr>
              <td colSpan={2} className="ctr" rowSpan={1} />
              <td colSpan={7} className="ctr" style={{ fontWeight: 700 }}>PENGENDALIAN / MITIGASI RISIKO</td>
              <td colSpan={3} className="ctr" style={{ fontWeight: 700 }}>PENANGGUNG JAWAB</td>
            </tr>
            <tr>
              <td colSpan={2} rowSpan={9}>Mitigasi Risiko / Pengendalian yang dilakukan</td>
              <td colSpan={7} style={{ fontStyle: "italic", fontWeight: 700 }}>Plant Barrier (terkait fasilitas dan peralatan yang diperlukan untuk mitigasi risiko perubahan)</td>
              <td colSpan={3} />
            </tr>
            {(moc.plantBarriers.length >= 2 ? moc.plantBarriers : [...moc.plantBarriers, ...Array.from({ length: 2 - moc.plantBarriers.length }, () => ({ text: "", pic: "" }))]).map((b, i) => (
              <tr key={`pl${i}`}><td colSpan={7} style={{ whiteSpace: "pre-wrap", height: 22 }}>{i + 1}. {b.text || "……………………………………………………"}</td><td colSpan={3}>{b.pic}</td></tr>
            ))}
            <tr><td colSpan={7} style={{ fontStyle: "italic", fontWeight: 700 }}>Process Barrier (terkait sistem manajemen dan prosedur kerja yang diperlukan untuk mitigasi risiko perubahan)</td><td colSpan={3} /></tr>
            {(moc.processBarriers.length >= 2 ? moc.processBarriers : [...moc.processBarriers, ...Array.from({ length: 2 - moc.processBarriers.length }, () => ({ text: "", pic: "" }))]).map((b, i) => (
              <tr key={`pr${i}`}><td colSpan={7} style={{ whiteSpace: "pre-wrap", height: 22 }}>{i + 1}. {b.text || "……………………………………………………"}</td><td colSpan={3}>{b.pic}</td></tr>
            ))}
            <tr><td colSpan={7} style={{ fontStyle: "italic", fontWeight: 700 }}>People Barrier (terkait kompetensi dan organisasi yang diperlukan untuk mitigasi risiko perubahan)</td><td colSpan={3} /></tr>
            {(moc.peopleBarriers.length >= 2 ? moc.peopleBarriers : [...moc.peopleBarriers, ...Array.from({ length: 2 - moc.peopleBarriers.length }, () => ({ text: "", pic: "" }))]).map((b, i) => (
              <tr key={`pe${i}`}><td colSpan={7} style={{ whiteSpace: "pre-wrap", height: 22 }}>{i + 1}. {b.text || "……………………………………………………"}</td><td colSpan={3}>{b.pic}</td></tr>
            ))}
            <tr style={{ height: 52 }}>
              <td colSpan={2}>Upside Gain (Peluang / Opportunity)</td>
              <td colSpan={10} className="box">{moc.upsideGain}</td>
            </tr>
            <tr style={{ height: 52 }}>
              <td colSpan={2}>Downside Loss (Threat / Ancaman)</td>
              <td colSpan={10} className="box">{moc.downsideLoss}</td>
            </tr>
            <InitiatorSignRows moc={moc} />

            <tr><td colSpan={12} className="band">Tahap Validasi</td></tr>
            <tr><td colSpan={12} className="gray">MoC Reviewer</td></tr>
            <tr>
              <td colSpan={2} className="ctr"><b>Fungsi</b></td>
              <td colSpan={3} className="ctr"><b>Nama Pimpinan Fungsi / Unit Organisasi</b></td>
              <td colSpan={3} className="ctr"><b>Rekomendasi atas Usulan Perubahan</b></td>
              <td colSpan={2} className="ctr"><b>Tanggal</b></td>
              <td colSpan={2} className="ctr"><b>Tanda Tangan</b></td>
            </tr>
            {reviewRows.map((r, i) => (
              <tr key={r?.id ?? i} style={{ height: 52 }}>
                <td colSpan={2}>{r?.functionLabel ?? ""}</td>
                <td colSpan={3}>{r ? `${r.reviewerName}${r.reviewerJabatan ? ` — ${r.reviewerJabatan}` : ""}` : ""}</td>
                <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>{r && r.outcome !== "Pending" ? `[${r.outcome}] ${r.recommendation}` : ""}</td>
                <td colSpan={2}>{r?.reviewedAt ? dmy(r.reviewedAt) : ""}</td>
                <td colSpan={2} />
              </tr>
            ))}
            <tr><td colSpan={12} className="foot">Keterangan: Reviewer dapat ditambah dengan fungsi-fungsi yang relevan, sesuai dengan MoC yang dilakukan</td></tr>
            <tr><td colSpan={12} className="gray">MoC Approver</td></tr>
            <tr><td colSpan={3} className="ctr"><b>Nama</b></td><td colSpan={3} className="ctr"><b>Jabatan</b></td><td colSpan={3} className="ctr"><b>Tanggal</b></td><td colSpan={3} className="ctr"><b>Tanda Tangan</b></td></tr>
            <tr style={{ height: 58 }}><td colSpan={3}>{moc.approverName ?? ""}</td><td colSpan={3} /><td colSpan={3}>{moc.approvedAt ? dmy(moc.approvedAt) : ""}</td><td colSpan={3} /></tr>
            <ControllerRows />
            <tr><td colSpan={12} className="foot">Selanjutnya: MoC Initiator mengkomunikasikan upaya pengendalian dan rencana implementasi ke MoC Performer</td></tr>
            <tr><td colSpan={12} className="foot">Selanjutnya: MoC Initiator melakukan pemantauan perubahan menggunakan Formulir Pemantauan MoC</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lampiran 6 — Formulir MoC: Pemantauan                               */
/* ------------------------------------------------------------------ */
function ActivityTable({ head, rows, firstLabel }: { head: string; rows: number; firstLabel: string }) {
  return (
    <>
      <tr><td colSpan={12} className="gray">{head}</td></tr>
      <tr>
        <td colSpan={3} className="ctr"><b>{firstLabel}</b></td>
        <td colSpan={3} className="ctr"><b>Keterangan</b></td>
        <td colSpan={2} className="ctr"><b>Tahapan</b></td>
        <td colSpan={1} className="ctr"><b>PIC</b></td>
        <td colSpan={2} className="ctr"><b>Target Date</b></td>
        <td colSpan={1} className="ctr"><b>Status</b></td>
      </tr>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} style={{ height: 20 }}>
          <td colSpan={3} /><td colSpan={3} /><td colSpan={2} /><td colSpan={1} /><td colSpan={2} /><td colSpan={1} />
        </tr>
      ))}
    </>
  );
}

export function MocSheetPemantauan({ moc }: { moc: MocRequest }) {
  return (
    <div className="moc-sheet-wrap" data-sheet="lampiran-6">
      <style>{SHEET_CSS}</style>
      <div className="moc-form-title">FORMULIR MOC – PEMANTAUAN</div>
      <table className="moc-sheet">
        <Cols12 />
        <tbody>
          <tr><td colSpan={12} className="ctr" style={{ fontWeight: 700 }}>FORMULIR PEMANTAUAN MANAGEMENT OF CHANGE (MoC)</td></tr>
          <InfoRows moc={moc} withTanggal={false} />
          <tr><td colSpan={12} className="band">Informasi MoC</td></tr>
          <tr><td colSpan={3}>Judul Perubahan</td><td colSpan={9} style={{ fontWeight: 700 }}>{moc.judul}</td></tr>
          <CategoryRow moc={moc} />
          <SifatMasaRows moc={moc} />
          <tr><td colSpan={12} className="band">Tahap Pemantauan</td></tr>
          <tr>
            <td colSpan={3}>Pemantauan Ke-</td>
            <td colSpan={5} />
            <td colSpan={1}>Tanggal</td>
            <td colSpan={3} style={{ color: "#888" }}>DD/MM/YYYY</td>
          </tr>
          <ActivityTable head="Aktivitas Yang Dipantau" rows={10} firstLabel="Kegiatan" />
          <ActivityTable head="Aksi Tindak Lanjut dari Tahap / Pemantauan Sebelumnya Selain Yang Sudah Termasuk di Aktivitas di Atas" rows={8} firstLabel="Deskripsi Aksi Tindak Lanjut" />
          <tr style={{ height: 40 }}><td colSpan={3}>Catatan lain / tambahan</td><td colSpan={9} /></tr>
          <tr><td colSpan={6} className="gray">MoC Performer</td><td colSpan={6} className="gray">MoC Initiator</td></tr>
          <tr>
            <td colSpan={2} className="ctr"><b>Nama</b></td><td colSpan={2} className="ctr"><b>Jabatan</b></td><td colSpan={2} className="ctr"><b>Tanda Tangan</b></td>
            <td colSpan={2} className="ctr"><b>Nama</b></td><td colSpan={2} className="ctr"><b>Jabatan</b></td><td colSpan={2} className="ctr"><b>Tanda Tangan</b></td>
          </tr>
          <tr style={{ height: 56 }}>
            <td colSpan={2}>{moc.performerName ?? ""}</td><td colSpan={2} /><td colSpan={2} />
            <td colSpan={2}>{moc.initiatorName}</td><td colSpan={2}>{moc.initiatorJabatan}</td><td colSpan={2} />
          </tr>
          <ControllerRows />
          <tr><td colSpan={12} className="foot">Selanjutnya: MoC Initiator melakukan pemantauan perubahan menggunakan Formulir Pemantauan MoC sesuai dengan rencana pemantauan awal sampai dengan selesai</td></tr>
          <tr><td colSpan={12} className="foot">Selanjutnya: MoC Initiator melakukan tinjauan akhir dan penutupan MoC ketika perubahan telah selesai dilaksanakan</td></tr>
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lampiran 7 — Formulir MoC: Tinjauan Akhir & Penutupan               */
/* ------------------------------------------------------------------ */
const FINAL_QUESTIONS = [
  "1. Apakah tujuan dan sasaran perubahan tercapai ?",
  "2. Apakah mitigasi risiko dari perubahan telah dilaksanakan?",
  "3. Apakah informasi keselamatan proses akibat perubahan telah disosialisasikan kepada pekerja terkait?",
  "4. Apakah rencana tanggap darurat telah disesuaikan untuk mengakomodir perubahan?",
];

export function MocSheetTinjauan({ moc }: { moc: MocRequest }) {
  return (
    <div className="moc-sheet-wrap" data-sheet="lampiran-7">
      <style>{SHEET_CSS}</style>
      <div className="moc-form-title">FORMULIR MOC – TINJAUAN AKHIR &amp; PENUTUPAN</div>
      <table className="moc-sheet">
        <Cols12 />
        <tbody>
          <tr><td colSpan={12} className="ctr" style={{ fontWeight: 700 }}>FORMULIR TINJAUAN AKHIR DAN PENUTUPAN MANAGEMENT OF CHANGE (MoC)</td></tr>
          <InfoRows moc={moc} withTanggal={false} />
          <tr><td colSpan={12} className="band">Informasi MoC</td></tr>
          <tr><td colSpan={3}>Judul Perubahan</td><td colSpan={9} style={{ fontWeight: 700 }}>{moc.judul}</td></tr>
          <CategoryRow moc={moc} />
          <SifatMasaRows moc={moc} />
          <tr>
            <td colSpan={9} className="band">Tahap Tinjauan Akhir</td>
            <td colSpan={1} className="ctr">Tanggal</td>
            <td colSpan={2} className="ctr" style={{ color: "#888" }}>DD/MM/YYYY</td>
          </tr>
          {FINAL_QUESTIONS.map((q) => (
            <tr key={q} style={{ height: 28 }}><td colSpan={4}>{q}</td><td colSpan={8} /></tr>
          ))}
          <ActivityTable head="Aksi Tindak Lanjut dari Tahap Sebelumnya" rows={5} firstLabel="Deskripsi Aksi Tindak Lanjut" />
          <tr><td colSpan={12} className="gray">MoC Reviewer &amp; Tim Peninjau Akhir</td></tr>
          <tr>
            <td colSpan={2} className="ctr"><b>Fungsi</b></td>
            <td colSpan={3} className="ctr"><b>Nama Pimpinan Fungsi / Unit Organisasi</b></td>
            <td colSpan={3} className="ctr"><b>Tanggapan</b></td>
            <td colSpan={2} className="ctr"><b>Tanggal</b></td>
            <td colSpan={2} className="ctr"><b>Tanda Tangan</b></td>
          </tr>
          {Array.from({ length: 3 }, (_, i) => (
            <tr key={i} style={{ height: 42 }}><td colSpan={2} /><td colSpan={3} /><td colSpan={3} /><td colSpan={2} /><td colSpan={2} /></tr>
          ))}
          <tr><td colSpan={6} className="gray">MoC Performer</td><td colSpan={6} className="gray">MoC Initiator</td></tr>
          <tr>
            <td colSpan={2} className="ctr"><b>Nama</b></td><td colSpan={2} className="ctr"><b>Jabatan</b></td><td colSpan={2} className="ctr"><b>Tanda Tangan</b></td>
            <td colSpan={2} className="ctr"><b>Nama</b></td><td colSpan={2} className="ctr"><b>Jabatan</b></td><td colSpan={2} className="ctr"><b>Tanda Tangan</b></td>
          </tr>
          <tr style={{ height: 52 }}>
            <td colSpan={2}>{moc.performerName ?? ""}</td><td colSpan={2} /><td colSpan={2} />
            <td colSpan={2}>{moc.initiatorName}</td><td colSpan={2}>{moc.initiatorJabatan}</td><td colSpan={2} />
          </tr>
          <tr><td colSpan={12} className="band">Tahap Penutupan MoC</td></tr>
          <tr><td colSpan={12} className="gray">MoC Approver</td></tr>
          <tr><td colSpan={3} className="ctr"><b>Nama</b></td><td colSpan={3} className="ctr"><b>Jabatan</b></td><td colSpan={3} className="ctr"><b>Tanggal</b></td><td colSpan={3} className="ctr"><b>Tanda Tangan</b></td></tr>
          <tr style={{ height: 58 }}><td colSpan={3}>{moc.approverName ?? ""}</td><td colSpan={3} /><td colSpan={3} /><td colSpan={3} /></tr>
          <ControllerRows />
          <tr><td colSpan={12} className="foot">Selanjutnya: MoC Controller melakukan dokumentasi atas penutupan MoC</td></tr>
        </tbody>
      </table>
    </div>
  );
}

export type MocFormKey = "pengusulan" | "pemantauan" | "tinjauan";
export const MOC_FORMS: { key: MocFormKey; label: string; lampiran: string; filename: string }[] = [
  { key: "pengusulan", label: "Pengusulan & Validasi", lampiran: "Lampiran 5", filename: "Formulir-MoC-Pengusulan-Validasi" },
  { key: "pemantauan", label: "Pemantauan", lampiran: "Lampiran 6", filename: "Formulir-MoC-Pemantauan" },
  { key: "tinjauan", label: "Tinjauan Akhir & Penutupan", lampiran: "Lampiran 7", filename: "Formulir-MoC-Tinjauan-Akhir-Penutupan" },
];

export function MocFormSheet({ moc, form }: { moc: MocRequest; form: MocFormKey }) {
  return form === "pemantauan" ? <MocSheetPemantauan moc={moc} /> : form === "tinjauan" ? <MocSheetTinjauan moc={moc} /> : <MocSheet moc={moc} />;
}
