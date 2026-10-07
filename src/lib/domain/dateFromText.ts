// Membaca tanggal terbit dari teks/nama berkas dokumen (dipakai saat unggah di Direktori).
// Port dari pembaca yang dipakai memverifikasi tanggal arsip: tanggal tertulis penuh
// ("3 Oktober 2025", "03-10-2025", "October 3, 2025"), tanggal ditulis dengan huruf
// ("Tanggal Dua Puluh Enam Bulan Januari Tahun Dua Ribu Dua Puluh Lima"), dan tanggal di
// nama berkas ("2020.09.01 ...", "... 290626"). Murni (tanpa DOM) supaya mudah diuji.
//
// PENTING: ini SARAN, bukan fakta — user selalu bisa mengoreksi. Teks dengan beberapa
// tanggal (mis. tanggal berakhir, tanggal acuan) dipilih dengan heuristik yang sama seperti
// verifikasi arsip; kalau ragu, dikembalikan sebagai "kurang pasti".

const ID_MONTHS: Record<string, number> = {
  januari: 1, februari: 2, pebruari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8,
  september: 9, oktober: 10, november: 11, nopember: 11, desember: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, august: 8, october: 10, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, sept: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};
const MONTH_RE = Object.keys(ID_MONTHS).sort((a, b) => b.length - a.length).join("|");

export interface DateSuggestion {
  /** YYYY-MM-DD */
  date: string;
  /** "pasti" = tertulis jelas di dokumen; "kurang" = hasil pilihan heuristik / hanya nama berkas */
  confidence: "pasti" | "kurang";
  /** Penjelasan singkat untuk ditampilkan ke user, mis. "dari isi dokumen: 3 Oktober 2025" */
  source: string;
}

function valid(y: number, m: number, d: number, today = new Date()): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  if (y < 2005 || dt.getTime() > today.getTime()) return null;
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

const UNITS: Record<string, number> = { nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9 };

function wordsToNumber(words: string[]): number | null {
  let total = 0;
  let cur = 0;
  for (const w of words) {
    if (w in UNITS) cur += UNITS[w];
    else if (w === "sepuluh") cur += 10;
    else if (w === "sebelas") cur += 11;
    else if (w === "belas") cur += 10;
    else if (w === "puluh") cur = (cur || 1) * 10;
    else if (w === "ratus") cur = (cur || 1) * 100;
    else if (w === "ribu") { total += (cur || 1) * 1000; cur = 0; }
    else return null;
  }
  return total + cur;
}

interface Found { pos: number; date: string; ctx: string; at: string }

// Konteks yang menandakan tanggal BERAKHIR / acuan (bukan tanggal terbit dokumen ini).
const BAD_CTX = /(sampai|hingga|s\/d|s\.d|exp|expired|masa berlaku|valid until|kadaluarsa|kedaluwarsa|jatuh tempo|berlaku sampai|selanjutnya|tanggal berikutnya)/i;
const GOOD_CTX = /(tanggal|tgl|date|hari ini|issued|dibuat|disetujui|ditetapkan|diterbitkan|surabaya|kupang|madiun|malang|bima|jakarta|mataram|denpasar|tuban|gresik|ende|maumere|waingapu|kalabahi|atapupu|badas|sanggaran|camplong|manggis|ampenan|reo)/i;

export function findDates(text: string, today = new Date()): Found[] {
  const t = text.replace(/\s+/g, " ");
  const out: Found[] = [];
  const push = (pos: number, iso: string | null) => {
    if (iso) out.push({ pos, date: iso, ctx: t.slice(Math.max(0, pos - 40), pos + 60), at: t.slice(pos, pos + 28).trim() });
  };

  // 3 Oktober 2025 | 3-Okt-25 | 03/Oct/2025
  for (const m of Array.from(t.matchAll(new RegExp(`(?<!\\d)(\\d{1,2})\\s*[-./ ]?\\s*(${MONTH_RE})[a-z]*\\.?\\s*[-./,' ]?\\s*(\\d{4}|\\d{2})(?!\\d)`, "gi")))) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    push(m.index ?? 0, valid(y, ID_MONTHS[m[2].toLowerCase()], Number(m[1]), today));
  }
  // October 3, 2025
  for (const m of Array.from(t.matchAll(new RegExp(`\\b(${MONTH_RE})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "gi")))) {
    push(m.index ?? 0, valid(Number(m[3]), ID_MONTHS[m[1].toLowerCase()], Number(m[2]), today));
  }
  // 2025-10-03
  for (const m of Array.from(t.matchAll(/(?<!\d)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/g))) {
    push(m.index ?? 0, valid(Number(m[1]), Number(m[2]), Number(m[3]), today));
  }
  // 03-10-2025 | 03/10/25  (pemisah harus sama; titik dengan 2 digit tahun ditolak: sering nomor bab "02.03.05")
  for (const m of Array.from(t.matchAll(/(?<!\d)(\d{1,2})\s*([-/.])\s*(\d{1,2})\s*\2\s*(\d{4}|\d{2})(?!\d)/g))) {
    if (m[4].length === 2 && m[2] === ".") continue;
    const y = m[4].length === 2 ? 2000 + Number(m[4]) : Number(m[4]);
    push(m.index ?? 0, valid(y, Number(m[3]), Number(m[1]), today));
  }
  // Tanggal Dua Puluh Enam Bulan Januari Tahun Dua Ribu Dua Puluh Lima
  const lower = t.toLowerCase();
  const numw = "(?:nol|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|ribu)";
  const longMonths = Object.keys(ID_MONTHS).filter((k) => k.length > 3).join("|");
  for (const m of Array.from(lower.matchAll(new RegExp(`tanggal\\s+((?:${numw}\\s*){1,5})\\s*bulan\\s+(${longMonths})\\s*tahun\\s+((?:${numw}\\s*){2,8})`, "g")))) {
    const d = wordsToNumber(m[1].trim().split(/\s+/));
    const y = wordsToNumber(m[3].trim().split(/\s+/));
    if (d && y) push(m.index ?? 0, valid(y, ID_MONTHS[m[2]], d, today));
  }
  return out.sort((a, b) => a.pos - b.pos);
}

/** Pilih satu tanggal terbit dari teks (halaman pertama dokumen). */
export function suggestDateFromText(text: string, today = new Date()): DateSuggestion | null {
  const found = findDates(text, today);
  if (found.length === 0) return null;
  const distinct = Array.from(new Set(found.map((f) => f.date)));
  const scored = found
    .map((f) => ({ f, s: (GOOD_CTX.test(f.ctx.slice(0, 60)) ? 2 : 0) - (BAD_CTX.test(f.ctx) ? 3 : 0) - f.pos / 100000 }))
    .sort((a, b) => b.s - a.s);
  const best = scored[0];
  if (best.s <= -2) return null; // semua kandidat tampak tanggal berakhir
  return {
    date: best.f.date,
    confidence: distinct.length === 1 ? "pasti" : "kurang",
    source: `dari isi dokumen: “${best.f.at}”`,
  };
}

/** Tanggal yang tertulis di nama berkas: "2020.09.01 …", "… - 290626.pdf", "… 7 Januari 2025 …". */
export function suggestDateFromFilename(name: string, today = new Date()): DateSuggestion | null {
  const base = name.replace(/\.[^.]+$/, "");
  const iso = base.match(/(?<!\d)(\d{4})[.\-_](\d{2})[.\-_](\d{2})(?!\d)/);
  if (iso) {
    const d = valid(Number(iso[1]), Number(iso[2]), Number(iso[3]), today);
    if (d) return { date: d, confidence: "pasti", source: `dari nama berkas: ${iso[0]}` };
  }
  const named = findDates(base, today)[0];
  if (named) return { date: named.date, confidence: "pasti", source: `dari nama berkas: ${base.slice(Math.max(0, named.pos - 2), named.pos + 22).trim()}` };
  const compact = base.match(/(?<![0-9])(\d{2})(\d{2})(\d{2})(?![0-9_])/);
  if (compact) {
    const d = valid(2000 + Number(compact[3]), Number(compact[2]), Number(compact[1]), today);
    if (d) return { date: d, confidence: "kurang", source: `dari nama berkas: ${compact[0]} (dibaca hari-bulan-tahun)` };
  }
  return null;
}

/** Judul awal dari nama berkas: tanpa ekstensi, awalan nomor urut, dan awalan "Copy of". */
export function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/^copy of\s+/i, "")
    .replace(/^\d{4}[.\-_]\d{2}[.\-_]\d{2}\s*/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
