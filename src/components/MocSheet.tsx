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

// Lembar "Formulir MoC — Pengusulan & Validasi" (Lampiran 5 TKO B13.3-07) dalam HTML,
// mengikuti tata letak formulir aslinya. Dipakai untuk tampilan baca di halaman
// detail dan untuk cetak (PDF dari browser) yang ditandatangani di luar web — kolom
// "Tanda Tangan" sengaja dibiarkan kosong untuk itu.
const CSS = `
.moc-sheet{width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.35;color:#000;background:#fff}
.moc-sheet td{border:1px solid #1f2937;padding:3px 6px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere}
.moc-sheet .title{text-align:center;font-weight:700;font-size:11.5px}
.moc-sheet .band{background:#9CC2E5;text-align:center;font-weight:700}
.moc-sheet .gray{background:#D9D9D9;text-align:center;font-weight:700}
.moc-sheet .ctr{text-align:center}
.moc-sheet .lbl{background:#fff}
.moc-sheet .box{white-space:pre-wrap;min-height:64px}
.moc-sheet .sign{height:56px}
.moc-sheet .cat-grid{display:grid;grid-template-columns:repeat(6,1fr);margin:-3px -6px}
.moc-sheet .cat-grid>div{border-right:1px solid #1f2937;border-bottom:1px solid #1f2937;padding:3px 5px;min-height:34px}
.moc-sheet .cat-grid>div:nth-child(6n){border-right:0}
.moc-sheet .cat-grid>div:nth-last-child(-n+1){border-bottom:0}
.moc-sheet .foot{font-style:italic;font-size:10px}
.moc-sheet-page-break{break-before:page}
@media print{.moc-sheet{font-size:10px}.moc-sheet tr{break-inside:avoid}}
`;

const CHECK = "☑";
const BOX = "☐";

function dmy(iso?: string | null): string {
  if (!iso) return "DD/MM/YYYY";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

const LEVEL_BG: Record<string, string> = { L: "#92D050", M: "#FFFF00", H: "#FF5050" };

function BarrierRows({ title, items }: { title: string; items: MocBarrier[] }) {
  const rows = items.length > 0 ? items : [{ text: "", pic: "" }, { text: "", pic: "" }];
  return (
    <>
      <tr>
        <td colSpan={9} style={{ fontStyle: "italic", fontWeight: 700 }}>{title}</td>
        <td colSpan={3} />
      </tr>
      {rows.map((b, i) => (
        <tr key={i}>
          <td colSpan={9} style={{ whiteSpace: "pre-wrap" }}>{i + 1}. {b.text}</td>
          <td colSpan={3}>{b.pic}</td>
        </tr>
      ))}
    </>
  );
}

export default function MocSheet({ moc }: { moc: MocRequest }) {
  const value = riskValue(moc.severity, moc.probability);
  const reviews = reviewsOfCurrentRound(moc);
  const reviewRows = reviews.length > 0 ? reviews : Array.from({ length: 3 }, () => null);

  return (
    <div className="moc-sheet-wrap">
      <style>{CSS}</style>
      <table className="moc-sheet">
        <colgroup>{Array.from({ length: 12 }, (_, i) => <col key={i} style={{ width: `${100 / 12}%` }} />)}</colgroup>
        <tbody>
          <tr><td colSpan={12} className="title">FORMULIR PENGUSULAN DAN VALIDASI MANAGEMENT OF CHANGE (MoC)</td></tr>
          <tr>
            <td colSpan={6}>Nomor MoC: {moc.mocNumber ?? ""}</td>
            <td colSpan={3}>Fungsi: {moc.fungsi}</td>
            <td colSpan={3}>Anggaran: {moc.anggaranType || "(ABO/ABI/ABO Khusus/….)"}</td>
          </tr>
          <tr>
            <td colSpan={6}>Tanggal: {dmy(moc.tanggal)}</td>
            <td colSpan={6}>Area / Lokasi: {moc.location}</td>
          </tr>
          <tr>
            <td colSpan={6}>Unit Operasi: {moc.unitOperasi}</td>
            <td colSpan={6}>Region : {moc.region}</td>
          </tr>
          <tr><td colSpan={12} className="band">Tahap Inisiasi</td></tr>
          <tr>
            <td colSpan={3}>Judul Perubahan</td>
            <td colSpan={9} style={{ fontWeight: 700 }}>{moc.judul}</td>
          </tr>
          <tr>
            <td colSpan={3}>Latar Belakang / Tujuan Perubahan</td>
            <td colSpan={9} className="box">{moc.latarBelakang}</td>
          </tr>
          <tr>
            <td colSpan={3}>Aktivitas / Ruang Lingkup Perubahan</td>
            <td colSpan={9}>
              <div className="cat-grid">
                {MOC_CHANGE_CATEGORIES.map((c) => (
                  <div key={c}>{moc.changeCategories.includes(c) ? CHECK : BOX} {c}</div>
                ))}
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={3}>Sifat Perubahan</td>
            <td colSpan={9}>
              {MOC_SIFAT_PERUBAHAN.map((s) => (
                <span key={s} style={{ marginRight: 18 }}>{moc.sifatPerubahan === s ? CHECK : BOX} {s}</span>
              ))}
            </td>
          </tr>
          <tr>
            <td colSpan={3}>Masa Berlaku</td>
            <td colSpan={9} style={{ color: moc.validFrom ? "#000" : "#888" }}>
              {dmy(moc.validFrom)} &nbsp; sampai &nbsp; {dmy(moc.validUntil)}
            </td>
          </tr>
          {[
            ["1.Deskripsi Perubahan (termasuk ruang lingkup dan persyaratan)\n*Lampirkan detail metode / langkah kerja", moc.deskripsi],
            ["2.Proses, dokumen, dan pihak yang terkait / terdampak akibat perubahan", moc.prosesTerdampak],
            ["3.Peraturan / regulasi / perizinan / sertifikasi peralatan yang relevan dengan perubahan", moc.peraturanRelevan],
            ["4. Stakeholder/Subject Matter Expert/Tenaga Ahli (MoC Reviewer)", moc.stakeholderReviewer],
            ["5. Studi kelayakan teknis / kajian risiko yang diperlukan", moc.studiKajian],
            ["6. Usulan tim pelaksana perubahan (MoC Performer)", moc.usulanPerformer],
          ].map(([label, val]) => (
            <tr key={label}>
              <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>{label}</td>
              <td colSpan={9} className="box" style={{ minHeight: 80 }}>{val}</td>
            </tr>
          ))}
          <tr><td colSpan={12} className="gray">MoC Initiator</td></tr>
          <tr className="ctr"><td colSpan={3} className="ctr"><b>Nama</b></td><td colSpan={3} className="ctr"><b>Jabatan</b></td><td colSpan={3} className="ctr"><b>Tanggal</b></td><td colSpan={3} className="ctr"><b>Tanda Tangan</b></td></tr>
          <tr><td colSpan={3} className="sign">{moc.initiatorName}</td><td colSpan={3}>{moc.initiatorJabatan}</td><td colSpan={3}>{dmy(moc.tanggal)}</td><td colSpan={3} /></tr>
        </tbody>
      </table>

      <table className="moc-sheet moc-sheet-page-break" style={{ marginTop: 14 }}>
        <colgroup>{Array.from({ length: 12 }, (_, i) => <col key={i} style={{ width: `${100 / 12}%` }} />)}</colgroup>
        <tbody>
          <tr><td colSpan={12} className="band">Tahap Penilaian Risiko dan Penentuan Pengendalian</td></tr>
          <tr>
            <td colSpan={2}>Jenis Dampak Risiko</td>
            {MOC_RISK_IMPACTS.map((r) => (
              <td key={r} colSpan={2} style={{ fontWeight: 700 }}>{moc.riskImpacts.includes(r) ? CHECK : BOX} {r.toUpperCase()}</td>
            ))}
          </tr>
          <tr>
            <td colSpan={2}>Deskripsi Bahaya</td>
            <td colSpan={10} className="box" style={{ minHeight: 40 }}>{moc.hazardDescription}</td>
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
            <td colSpan={9} className="ctr" style={{ fontWeight: 700 }}>PENGENDALIAN / MITIGASI RISIKO</td>
            <td colSpan={3} className="ctr" style={{ fontWeight: 700 }}>PENANGGUNG JAWAB</td>
          </tr>
          <BarrierRows title="Plant Barrier (terkait fasilitas dan peralatan yang diperlukan untuk mitigasi risiko perubahan)" items={moc.plantBarriers} />
          <BarrierRows title="Process Barrier (terkait sistem manajemen dan prosedur kerja yang diperlukan untuk mitigasi risiko perubahan)" items={moc.processBarriers} />
          <BarrierRows title="People Barrier (terkait kompetensi dan organisasi yang diperlukan untuk mitigasi risiko perubahan)" items={moc.peopleBarriers} />
          <tr>
            <td colSpan={2}>Upside Gain (Peluang / Opportunity)</td>
            <td colSpan={10} className="box" style={{ minHeight: 40 }}>{moc.upsideGain}</td>
          </tr>
          <tr>
            <td colSpan={2}>Downside Loss (Threat / Ancaman)</td>
            <td colSpan={10} className="box" style={{ minHeight: 40 }}>{moc.downsideLoss}</td>
          </tr>
          <tr><td colSpan={12} className="gray">MoC Initiator</td></tr>
          <tr><td colSpan={3} className="ctr"><b>Nama</b></td><td colSpan={3} className="ctr"><b>Jabatan</b></td><td colSpan={3} className="ctr"><b>Tanggal</b></td><td colSpan={3} className="ctr"><b>Tanda Tangan</b></td></tr>
          <tr><td colSpan={3} className="sign">{moc.initiatorName}</td><td colSpan={3}>{moc.initiatorJabatan}</td><td colSpan={3}>{dmy(moc.tanggal)}</td><td colSpan={3} /></tr>

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
            <tr key={r?.id ?? i}>
              <td colSpan={2} className="sign">{r?.functionLabel ?? ""}</td>
              <td colSpan={3}>{r ? `${r.reviewerName}${r.reviewerJabatan ? ` — ${r.reviewerJabatan}` : ""}` : ""}</td>
              <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>
                {r && r.outcome !== "Pending" ? `[${r.outcome}] ${r.recommendation}` : ""}
              </td>
              <td colSpan={2}>{r?.reviewedAt ? dmy(r.reviewedAt) : ""}</td>
              <td colSpan={2} />
            </tr>
          ))}
          <tr><td colSpan={12} className="foot">Keterangan: Reviewer dapat ditambah dengan fungsi-fungsi yang relevan, sesuai dengan MoC yang dilakukan</td></tr>
          <tr><td colSpan={12} className="gray">MoC Approver</td></tr>
          <tr><td colSpan={3} className="ctr"><b>Nama</b></td><td colSpan={3} className="ctr"><b>Jabatan</b></td><td colSpan={3} className="ctr"><b>Tanggal</b></td><td colSpan={3} className="ctr"><b>Tanda Tangan</b></td></tr>
          <tr><td colSpan={3} className="sign">{moc.approverName ?? ""}</td><td colSpan={3} /><td colSpan={3}>{moc.approvedAt ? dmy(moc.approvedAt) : ""}</td><td colSpan={3} /></tr>
          <tr><td colSpan={12} className="gray">MoC Controller</td></tr>
          <tr>
            <td colSpan={3}>Jabatan</td>
            <td colSpan={9}>Keterangan:</td>
          </tr>
          <tr>
            <td colSpan={3} className="sign">Nama :<br />Tanggal :</td>
            <td colSpan={9} />
          </tr>
          <tr><td colSpan={12} className="foot">Selanjutnya: MoC Initiator mengkomunikasikan upaya pengendalian dan rencana implementasi ke MoC Performer</td></tr>
          <tr><td colSpan={12} className="foot">Selanjutnya: MoC Initiator melakukan pemantauan perubahan menggunakan Formulir Pemantauan MoC</td></tr>
        </tbody>
      </table>
    </div>
  );
}
