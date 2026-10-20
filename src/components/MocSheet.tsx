import React from "react";
import { MOC_LOGO_DATA_URI } from "@/lib/mocLogo";
import {
  MOC_CHANGE_CATEGORIES,
  MOC_RISK_IMPACTS,
  MOC_RISK_LEVEL_COLOR,
  MOC_SIFAT_PERUBAHAN,
  riskValue,
  reviewsOfCurrentRound,
  type MocBarrier,
  type MocRequest,
  type MocTrackedItem,
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
// Font & border diaudit LANGSUNG dari Form MoC 2025.xlsx (openpyxl, per-sel, 2026-09-30)
// dan berlaku seragam di ketiga sheet formulir (Pengusulan&Validasi/Pemantauan/
// Tinjauan Akhir): font Calibri di semua sel berisi teks — bukan Arial; ukuran
// hampir seluruhnya 9pt (label, nilai, band judul tahap, header abu-abu, grid
// checkbox kategori — SEMUA 9pt, tidak ada yang lebih kecil/besar kecuali judul
// luar 16pt bold). Border 100% "thin" + warna indexed:64 (hitam Excel default) di
// SEMUA sel berbatas pada keempat sheet, tidak ada yang medium/thick — jadi warna
// border web ini harus hitam pekat (#000), bukan abu-abu kebiruan seperti
// sebelumnya. Satuan pt dipakai (bukan px) karena Word membaca ukuran font native
// dalam pt — px sempat menimbulkan mismatch di ekspor Word pada elemen lain
// (lihat riwayat perbaikan logo), jadi pt lebih aman & lebih literal di sini juga.
// PENTING: font-family/font-size diulang eksplisit di SETIAP selector td, bukan
// cuma sekali di .moc-sheet lalu diharapkan diwariskan (inherit) ke <td>-nya.
// Terbukti Word TIDAK mewariskan font dari <table> ke <td> di dalamnya secara
// konsisten (persis kelas bug yang sama dengan float/position/ukuran gambar yang
// sudah ditemukan sebelumnya di lembar ini) — judul luar (elemen <div> sendiri,
// font langsung di elemennya) sudah benar tampil Calibri di Word, tapi isi tabel
// (font cuma diwariskan dari <table class="moc-sheet">) tetap jatuh ke font
// default Word. Ditemukan dari screenshot toolbar font Word pengguna langsung,
// 2026-09-30. JANGAN hapus pengulangan font-family/font-size di tiap rule di
// bawah walau kelihatan redundan — itu justru intinya.
// Lebar border 0.75pt (BUKAN 1px) — "thin" di Excel/OOXML adalah bobot garis
// baku 0.75pt; 1px web/Word terasa lebih tebal dari garis tipis asli file Excel,
// ini akar dari keluhan "ukuran border beda banget" (dikonfirmasi lewat
// screenshot Excel asli pengguna, 2026-09-30 — garisnya jelas tipis/hairline,
// bukan tebal seperti hasil kita sebelumnya).
const SHEET_BORDER = `0.75pt solid #000`;
const SHEET_FONT = `font-family:Calibri,Arial,sans-serif;font-size:9pt`;
export const SHEET_CSS = `
.moc-sheet{width:100%;border-collapse:collapse;table-layout:fixed;${SHEET_FONT};line-height:1.35;color:#000;background:#fff}
.moc-sheet td{border:${SHEET_BORDER};padding:3px 6px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere;${SHEET_FONT};color:#000}
.moc-sheet td.nb{border:0}
.moc-sheet .band{background:#9CC2E5;text-align:center;font-weight:700}
.moc-sheet .gray{background:#D9D9D9;text-align:center;font-weight:700}
.moc-sheet .fill{background:#BFBFBF}
.moc-sheet .ctr{text-align:center}
.moc-sheet .box{white-space:pre-wrap}
.moc-sheet .foot{font-style:italic;${SHEET_FONT}}
.moc-sheet .cats{width:100%;border-collapse:collapse;table-layout:fixed;margin:-3px -6px;width:calc(100% + 12px)}
.moc-sheet .cats td{border-top:0;border-left:0;border-right:${SHEET_BORDER};border-bottom:${SHEET_BORDER};padding:3px 5px;height:32px;${SHEET_FONT};color:#000}
.moc-sheet .cats tr:last-child td{border-bottom:0}
.moc-sheet .cats td:last-child{border-right:0}
.moc-form-title{font-family:Calibri,Arial,sans-serif;text-align:center;font-weight:700;font-size:16pt;padding:10px 0;margin:2px 0 10px;color:#000}
.moc-sheet-banner{height:42px;padding:0}
.moc-sheet-banner-inner{width:100%;height:42px;border-collapse:collapse}
.moc-sheet-banner-inner td{border:0;padding:3px 6px;font-weight:700;vertical-align:middle;${SHEET_FONT};color:#000}
.moc-sheet-banner-inner .txt{text-align:center}
.moc-sheet-banner-inner .logo{width:104px;text-align:right}
.moc-sheet-info td{height:33px}
.moc-form-ref{width:100%;font-family:Calibri,Arial,sans-serif;font-size:13px;margin:0 0 12px;color:#000;border-collapse:collapse}
.moc-form-ref td{border:0;padding:0}
.moc-form-ref .r{text-align:right}
.moc-sheet-page-break{break-before:page;page-break-before:always}
@media print{
  /* Di layar lembar dirancang minimal 860px; saat cetak lebar minimum dilepas (lihat
     .moc-min-w) agar tabel mengikuti lebar kertas A4 dan tidak terpotong. */
  .moc-min-w{min-width:0!important}
  .moc-sheet td{padding:2px 4px}
  .moc-sheet .cats td{padding:2px 4px;height:26px}
  .moc-sheet tr{break-inside:avoid;page-break-inside:avoid}
}
`;

const CHECK = "☑";
const BOX = "☐";
// Nomor dokumen TKO yang jadi acuan lembar ini — satu sumber dipakai baik untuk
// teks "Lampiran N – TKO No. ..." (RefLine) maupun nama file unduhan (MOC_FORMS
// di bawah), supaya keduanya tidak pernah bisa saling tidak sinkron.
export const TKO_DOC_NO = "B13.3-07/PNA400000/2025-S9";
const TKO_REF = `Lampiran %N% – TKO No.    ${TKO_DOC_NO}`;

function dmy(iso?: string | null): string {
  if (!iso) return "DD/MM/YYYY";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

const LEVEL_BG = MOC_RISK_LEVEL_COLOR;
const Cols12 = () => <colgroup>{Array.from({ length: 12 }, (_, i) => <col key={i} style={{ width: `${100 / 12}%` }} />)}</colgroup>;

// Logo "PERTAMINA PATRA NIAGA" — diambil langsung dari Form MoC 2025.xlsx (tertanam
// di 3 sheet formulirnya, bukan di sheet Register MOC). Data URI (lib/mocLogo.ts),
// BUKAN path /public — lembar ini juga dipakai untuk unduhan Word/PDF yang jadi
// berkas berdiri sendiri; path server relatif tidak lagi terhubung begitu file itu
// dibuka di luar aplikasi (tampil sebagai gambar rusak sebelum ini).
//
// Riwayat perbaikan penempatan (2026-09-30, semua ditemukan lewat screenshot Word
// ASLI dari pengguna — pratinjau browser tidak pernah menunjukkan masalah ini):
// 1) posisi absolute+transform → Word tidak mendukung, posisi salah saat diunduh.
// 2) diganti float:right + CSS height → Word mengabaikan CSS box-sizing untuk
//    <img>, tetap pakai ukuran asli file PNG (219x78px) → logo tampil raksasa.
// 3) ditambah atribut HTML width/height eksplisit → masih raksasa; ternyata file
//    src/lib/mocLogo.ts memang di-resize persis ke 96x34px sebagai solusinya
//    (lihat komentar di file itu) — supaya ukuran BENAR di Word apa pun mekanisme
//    sizing yang ia pilih/abaikan.
// 4) TAPI float:right di dalam <td> ternyata JUGA tidak direspons Word — teks
//    ber-text-align:center di sel yang sama tidak reflow mengelilingi float,
//    jadi logo tetap menimpa teks walau ukurannya sudah benar. Floats di dalam
//    <td> memang terkenal tidak reliable di importer HTML lawas Word.
// Solusi final: logo & judul dipisah ke DUA <td> berbeda pada baris banner (lihat
// pemakaian <SheetLogo/> di bawah) — tabel adalah satu-satunya mekanisme layout
// yang benar-benar reliable di Word, jadi hindari float/absolute/transform di
// lembar ini sepenuhnya.
function SheetLogo() {
  return <img src={MOC_LOGO_DATA_URI} alt="Pertamina Patra Niaga" width={96} height={34} />;
}

// Baris banner (judul + logo). Logo & judul dipisah lewat TABEL BERSARANG dengan
// lebar kolom logo tetap (104px), bukan colSpan atas 12-kolom grid utama — supaya
// lebar kolom judul tidak ikut menyusut kalau grid 12-kolom di-render Word dengan
// proporsi yang berbeda dari browser (sempat bikin judul yang panjang jadi wrap 2
// baris saat colSpan grid utama yang dipecah 10/2, ditemukan 2026-09-30). Tabel
// bersarang berdiri sendiri dari layout grid luar, jadi lebih bisa diprediksi.
//
// SEMPAT dicoba tambah kolom "spacer" kosong (104px) di kiri teks supaya judul
// tampak center persis di tengah baris penuh (di xlsx asli logo adalah gambar
// mengambang yang tidak memengaruhi layout sel, jadi teksnya center ke lebar
// baris utuh). Dicabut lagi 2026-09-30: spacer 104px + kolom logo 104px bersama
// "memakan" 208px dari lebar yang tersedia untuk teks — cukup untuk memaksa
// judul yang panjang wrap jadi 2 baris di Word (lebar konten halaman Word
// ternyata lebih sempit dari perkiraan), padahal tanpa spacer teksnya muat 1
// baris. Judul geser dikit dari titik tengah jauh lebih baik daripada wrap 2
// baris — jangan tambahkan spacer ini lagi tanpa memastikan dulu judul tetap
// 1 baris di Word sungguhan.
function BannerRow({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={12} className="moc-sheet-banner">
        <table className="moc-sheet-banner-inner">
          <tbody>
            <tr>
              <td className="txt">{text}</td>
              <td className="logo"><SheetLogo /></td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

// TABEL 2-kolom, BUKAN flexbox — display:flex terbukti tidak didukung sama
// sekali oleh importer HTML Word (dua <span> yang seharusnya terpisah kiri/kanan
// malah nempel jadi satu baris tanpa jarak di Word sungguhan, ditemukan lewat
// screenshot pengguna langsung, 2026-09-30). Tabel adalah satu-satunya mekanisme
// layout kiri/kanan yang reliable di Word di seluruh lembar ini — pola yang sama
// dengan BannerRow.
function RefLine({ n }: { n: number }) {
  return (
    <table className="moc-form-ref"><tbody><tr>
      <td className="l">{TKO_REF.replace("%N%", String(n))}</td>
      <td className="r">Revisi Ke-1</td>
    </tr></tbody></table>
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
      <tr className="moc-sheet-info">
        <td colSpan={6}>Nomor MoC: {moc.mocNumber ?? ""}</td>
        <td colSpan={3}>Fungsi: {moc.fungsi}</td>
        <td colSpan={3}>Anggaran: {moc.anggaranType || "(ABO/ABI/ABO Khusus/….)"}</td>
      </tr>
      {withTanggal ? (
        <>
          <tr className="moc-sheet-info">
            <td colSpan={6}>Tanggal: {dmy(moc.tanggal)}</td>
            <td colSpan={6}>Area / Lokasi: {moc.location}</td>
          </tr>
          <tr className="moc-sheet-info">
            <td colSpan={6}>Unit Operasi: {moc.unitOperasi}</td>
            <td colSpan={6}>Region : {moc.region}</td>
          </tr>
        </>
      ) : (
        <tr className="moc-sheet-info">
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
      <RefLine n={5} />
      <div className="moc-form-title">FORMULIR MOC – PENGUSULAN &amp; VALIDASI</div>
      <table className="moc-sheet">
        <Cols12 />
        <tbody>
          <BannerRow text="FORMULIR PENGUSULAN DAN VALIDASI MANAGEMENT OF CHANGE (MoC)" />
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
            <tr style={{ height: 58 }}><td colSpan={3}>{moc.approverName ?? ""}</td><td colSpan={3}>{moc.approverManualJabatan || moc.approverJabatan || ""}</td><td colSpan={3}>{moc.approvedAt ? dmy(moc.approvedAt) : ""}</td><td colSpan={3} /></tr>
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
function ActivityTable({ head, rows, firstLabel, data = [] }: { head: string; rows: number; firstLabel: string; data?: MocTrackedItem[] }) {
  const total = Math.max(rows, data.length);
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
      {Array.from({ length: total }, (_, i) => {
        const d = data[i];
        return (
          <tr key={i} style={{ height: 20 }}>
            <td colSpan={3}>{d?.item ?? ""}</td>
            <td colSpan={3}>{d?.keterangan ?? ""}</td>
            <td colSpan={2}>{d?.tahapan ?? ""}</td>
            <td colSpan={1}>{d?.pic ?? ""}</td>
            <td colSpan={2}>{d?.targetDate ? dmy(d.targetDate) : ""}</td>
            <td colSpan={1}>{d?.status ?? ""}</td>
          </tr>
        );
      })}
    </>
  );
}

export function MocSheetPemantauan({ moc, no }: { moc: MocRequest; no?: number }) {
  // Pemantauan yang dicetak: nomor yang diminta, atau yang terbaru. Tanpa data = formulir kosong untuk diisi manual.
  const entry = (no ? moc.monitoring.find((m) => m.no === no) : undefined) ?? moc.monitoring[moc.monitoring.length - 1];
  return (
    <div className="moc-sheet-wrap" data-sheet="lampiran-6">
      <style>{SHEET_CSS}</style>
      <RefLine n={6} />
      <div className="moc-form-title">FORMULIR MOC – PEMANTAUAN</div>
      <table className="moc-sheet">
        <Cols12 />
        <tbody>
          <BannerRow text="FORMULIR PEMANTAUAN MANAGEMENT OF CHANGE (MoC)" />
          <InfoRows moc={moc} withTanggal={false} />
          <tr><td colSpan={12} className="band">Informasi MoC</td></tr>
          <tr><td colSpan={3}>Judul Perubahan</td><td colSpan={9} style={{ fontWeight: 700 }}>{moc.judul}</td></tr>
          <CategoryRow moc={moc} />
          <SifatMasaRows moc={moc} />
          <tr><td colSpan={12} className="band">Tahap Pemantauan</td></tr>
          <tr>
            <td colSpan={3}>Pemantauan Ke-</td>
            <td colSpan={5}>{entry ? entry.no : ""}</td>
            <td colSpan={1}>Tanggal</td>
            <td colSpan={3} style={entry ? undefined : { color: "#888" }}>{entry ? dmy(entry.date) : "DD/MM/YYYY"}</td>
          </tr>
          <ActivityTable head="Aktivitas Yang Dipantau" rows={10} firstLabel="Kegiatan" data={entry?.activities} />
          <ActivityTable head="Aksi Tindak Lanjut dari Tahap / Pemantauan Sebelumnya Selain Yang Sudah Termasuk di Aktivitas di Atas" rows={8} firstLabel="Deskripsi Aksi Tindak Lanjut" data={entry?.followUps} />
          <tr style={{ height: 40 }}><td colSpan={3}>Catatan lain / tambahan</td><td colSpan={9}>{entry?.notes ?? ""}</td></tr>
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
  const fr = moc.finalReview;
  const responses = fr?.responses ?? [];
  const reviewerRows = responses.length > 0
    ? responses.map((r) => ({ fungsi: r.fungsi, nama: r.name, tanggapan: r.outcome === "Pending" ? "" : `${r.outcome}${r.note ? ` — ${r.note}` : ""}`, tanggal: r.at ?? "" }))
    : (fr?.reviewers ?? []).map((r) => ({ fungsi: r.fungsi, nama: r.keterangan, tanggapan: r.tanggapan, tanggal: r.tanggal }));
  return (
    <div className="moc-sheet-wrap" data-sheet="lampiran-7">
      <style>{SHEET_CSS}</style>
      <RefLine n={7} />
      <div className="moc-form-title">FORMULIR MOC – TINJAUAN AKHIR &amp; PENUTUPAN</div>
      <table className="moc-sheet">
        <Cols12 />
        <tbody>
          <BannerRow text="FORMULIR TINJAUAN AKHIR DAN PENUTUPAN MANAGEMENT OF CHANGE (MoC)" />
          <InfoRows moc={moc} withTanggal={false} />
          <tr><td colSpan={12} className="band">Informasi MoC</td></tr>
          <tr><td colSpan={3}>Judul Perubahan</td><td colSpan={9} style={{ fontWeight: 700 }}>{moc.judul}</td></tr>
          <CategoryRow moc={moc} />
          <SifatMasaRows moc={moc} />
          <tr>
            <td colSpan={9} className="band">Tahap Tinjauan Akhir</td>
            <td colSpan={1} className="ctr">Tanggal</td>
            <td colSpan={2} className="ctr" style={fr ? undefined : { color: "#888" }}>{fr ? dmy(fr.date) : "DD/MM/YYYY"}</td>
          </tr>
          {FINAL_QUESTIONS.map((q, i) => (
            <tr key={q} style={{ height: 28 }}>
              <td colSpan={4}>{q}</td>
              <td colSpan={8}>{fr?.answers[i] ? `${fr.answers[i].yes ? "Ya" : "Tidak"}${fr.answers[i].keterangan ? ` — ${fr.answers[i].keterangan}` : ""}` : ""}</td>
            </tr>
          ))}
          <ActivityTable head="Aksi Tindak Lanjut dari Tahap Sebelumnya" rows={5} firstLabel="Deskripsi Aksi Tindak Lanjut" data={fr?.followUps} />
          <tr><td colSpan={12} className="gray">MoC Reviewer &amp; Tim Peninjau Akhir</td></tr>
          <tr>
            <td colSpan={2} className="ctr"><b>Fungsi</b></td>
            <td colSpan={3} className="ctr"><b>Nama Pimpinan Fungsi / Unit Organisasi</b></td>
            <td colSpan={3} className="ctr"><b>Tanggapan</b></td>
            <td colSpan={2} className="ctr"><b>Tanggal</b></td>
            <td colSpan={2} className="ctr"><b>Tanda Tangan</b></td>
          </tr>
          {Array.from({ length: Math.max(3, reviewerRows.length) }, (_, i) => {
            const r = reviewerRows[i];
            return (
              <tr key={i} style={{ height: 42 }}>
                <td colSpan={2}>{r?.fungsi ?? ""}</td><td colSpan={3}>{r?.nama ?? ""}</td><td colSpan={3}>{r?.tanggapan ?? ""}</td><td colSpan={2}>{r?.tanggal ? dmy(r.tanggal) : ""}</td><td colSpan={2} />
              </tr>
            );
          })}
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
          <tr style={{ height: 58 }}><td colSpan={3}>{moc.approverName ?? ""}</td><td colSpan={3}>{moc.approverManualJabatan || moc.approverJabatan || ""}</td><td colSpan={3}>{moc.closure ? dmy(moc.closure.closedAt) : ""}</td><td colSpan={3} /></tr>
          <ControllerRows />
          <tr><td colSpan={12} className="foot">Selanjutnya: MoC Controller melakukan dokumentasi atas penutupan MoC</td></tr>
        </tbody>
      </table>
    </div>
  );
}

export type MocFormKey = "pengusulan" | "pemantauan" | "tinjauan";
// Nama file unduhan mengikuti penamaan dokumen terkendali TKO: "Lampiran <N> - TKO
// <nomor> - <judul formulir>" — bukan singkatan bebas seperti sebelumnya
// ("Formulir-MoC-Pengusulan-Validasi") yang tidak menyebut Lampiran/nomor TKO sama
// sekali. Karakter "/" pada nomor TKO otomatis diubah jadi "_" oleh sanitizer di
// mocFilename() (lib/mocDownload.ts), tidak perlu ditangani manual di sini.
export const MOC_FORMS: { key: MocFormKey; label: string; lampiran: string; filename: string }[] = [
  { key: "pengusulan", label: "Pengusulan & Validasi", lampiran: "Lampiran 5", filename: `Lampiran-5_TKO-${TKO_DOC_NO}_Formulir-Pengusulan-dan-Validasi-MoC` },
  { key: "pemantauan", label: "Pemantauan", lampiran: "Lampiran 6", filename: `Lampiran-6_TKO-${TKO_DOC_NO}_Formulir-Pemantauan-MoC` },
  { key: "tinjauan", label: "Tinjauan Akhir & Penutupan", lampiran: "Lampiran 7", filename: `Lampiran-7_TKO-${TKO_DOC_NO}_Formulir-Tinjauan-Akhir-dan-Penutupan-MoC` },
];

export function MocFormSheet({ moc, form, no }: { moc: MocRequest; form: MocFormKey; no?: number }) {
  return form === "pemantauan" ? <MocSheetPemantauan moc={moc} no={no} /> : form === "tinjauan" ? <MocSheetTinjauan moc={moc} /> : <MocSheet moc={moc} />;
}
