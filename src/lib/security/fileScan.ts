// Pertahanan lapis-lapis untuk SEMUA unggahan berkas (dokumen PSI, revisi, bukti tanda
// tangan MOC, lampiran tahap). Dipakai server saja.
//
// Yang DIJAMIN: berkas benar-benar berjenis yang diklaim (tanda-byte/magic bytes cocok
// dengan ekstensi), bukan program/skrip yang menyamar, dan tidak membawa pembawa
// serangan umum: JavaScript/Launch/berkas tertanam di PDF, makro/objek/program di
// Office, serta teks skrip yang disisipkan ke gambar (polyglot).
// Yang TIDAK dijamin: ini bukan antivirus. Malware yang tidak memakai pola di atas
// (mis. eksploit pada pustaka penampil, PDF terenkripsi/terobfuskasi) tidak terdeteksi.
// Lapisan lain: unduhan dipaksa "attachment" untuk selain PDF/gambar dan tipe konten
// ditetapkan server (bukan klaim klien).
import { inflateSync } from "zlib";

export interface UploadKind {
  ext: string; // ".pdf"
  mime: string; // tipe konten yang disajikan ulang
  inline: boolean; // boleh ditampilkan di browser (PDF/gambar); selain itu selalu diunduh
}

// Daftar putih. Sengaja TIDAK memuat .doc/.xls (format OLE lama, pembawa makro),
// .xlsm/.docm (makro), .html/.svg/.js/.exe dan sejenisnya.
const KINDS: UploadKind[] = [
  { ext: ".pdf", mime: "application/pdf", inline: true },
  { ext: ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", inline: false },
  { ext: ".xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", inline: false },
  { ext: ".png", mime: "image/png", inline: true },
  { ext: ".jpg", mime: "image/jpeg", inline: true },
  { ext: ".jpeg", mime: "image/jpeg", inline: true },
];

export const UPLOAD_ACCEPT = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png";
export const UPLOAD_TYPE_ERROR = "Jenis berkas tidak diizinkan. Gunakan PDF, Word (.docx), Excel (.xlsx), atau gambar (JPG/PNG).";
export const ATTACHMENT_TYPE_ERROR = "Lampiran hanya boleh berupa gambar (JPG/PNG) atau PDF.";
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 5;
// Berkas sampai batas ini dipindai seluruhnya; yang lebih besar dipindai di kedua ujung.
export const FULL_SCAN_MAX_BYTES = 50 * 1024 * 1024;
export const SCAN_EDGE_BYTES = 8 * 1024 * 1024;

export function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > -1 ? filename.slice(dot).toLowerCase() : "";
}

export function kindOfFilename(filename: string): UploadKind | null {
  const ext = extOf(filename);
  return KINDS.find((k) => k.ext === ext) ?? null;
}

// Nama berkas tanpa karakter kontrol atau pemisah path.
export function filenameProblem(filename: string): string | null {
  if (!filename.trim() || filename.length > 255) return "Nama berkas tidak valid.";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f/\\]/.test(filename) || filename.includes("..")) return "Nama berkas mengandung karakter yang tidak diizinkan.";
  return null;
}

// Validasi metadata SEBELUM byte apa pun dikirim (presign / proxy).
export function validateUploadMeta(
  filename: string,
  declaredMime: string
): { ok: true; kind: UploadKind } | { ok: false; error: string } {
  const bad = filenameProblem(filename);
  if (bad) return { ok: false, error: bad };
  const kind = kindOfFilename(filename);
  // Klaim MIME dari klien tidak dipercaya untuk menyajikan ulang, tapi harus konsisten dengan ekstensi.
  if (!kind || (declaredMime !== kind.mime && !(kind.mime === "image/jpeg" && declaredMime === "image/jpg"))) {
    return { ok: false, error: UPLOAD_TYPE_ERROR };
  }
  return { ok: true, kind };
}

// Lampiran tahap MOC: hanya gambar/PDF dan maksimum 20MB.
export function isAttachmentKind(filename: string): boolean {
  const k = kindOfFilename(filename);
  return !!k && k.inline;
}

const latin1 = (b: Buffer) => b.toString("latin1");

function startsWith(buf: Buffer, sig: number[]): boolean {
  return buf.length >= sig.length && sig.every((v, i) => buf[i] === v);
}

// Teks skrip yang tidak pernah wajar ada di dalam gambar/PDF.
const SCRIPT_TEXT = /<\s*script|<\?php|<\s*html|<\s*iframe|javascript\s*:|powershell|cmd\.exe|\/bin\/(ba)?sh/i;

// Nama-objek PDF berbahaya. Sengaja TIDAK memblokir /OpenAction (dipakai PDF sah untuk
// zoom awal) — aksi berbahayanya sendiri (/JavaScript, /Launch, ...) tetap ditolak.
const PDF_BAD = /\/(JavaScript|JS|Launch|EmbeddedFile|EmbeddedFiles|RichMedia|SubmitForm|ImportData|GoToE|Sound|Movie)(?![A-Za-z])/;

// Dicocokkan hanya terhadap NAMA entri ZIP (bukan byte terkompresi, agar tidak ada
// kecocokan acak di data biner).
const OOXML_BAD_NAME = /vbaProject\.bin|vbaData\.xml|oleObject|(^|\/)embeddings\/|activeX|\.(exe|dll|bat|cmd|vbs|ps1|scr|jar|msi|js|hta|lnk)$/i;

// Nama entri ZIP dari central directory (ada di ujung berkas). null bila rusak/tidak utuh.
function zipEntryNames(tail: Buffer): string[] | null {
  let eocd = -1;
  for (let i = tail.length - 22; i >= Math.max(0, tail.length - 22 - 65535); i--) {
    if (tail.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const cdSize = tail.readUInt32LE(eocd + 12);
  let pos = eocd - cdSize;
  if (pos < 0 || cdSize === 0xffffffff) return null;
  const names: string[] = [];
  while (pos + 46 <= eocd && tail.readUInt32LE(pos) === 0x02014b50) {
    const nameLen = tail.readUInt16LE(pos + 28);
    const extraLen = tail.readUInt16LE(pos + 30);
    const commentLen = tail.readUInt16LE(pos + 32);
    names.push(tail.subarray(pos + 46, pos + 46 + nameLen).toString("utf8"));
    pos += 46 + nameLen + extraLen + commentLen;
    if (names.length > 5000) return null;
  }
  return names.length > 0 ? names : null;
}

// Buang isi "stream ... endstream" (data biner terkompresi) sebelum mencari kata kunci
// PDF berbahaya, agar tidak ada kecocokan acak; stream ObjStm (yang bisa menyembunyikan
// objek /JavaScript) dibuka dulu lalu ikut dipindai.
function pdfSurface(raw: string): string {
  const parts: string[] = [];
  let last = 0;
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    parts.push(raw.slice(last, m.index));
    const dict = raw.slice(Math.max(0, m.index - 400), m.index);
    if (/ObjStm/.test(dict) && end - start < 8 * 1024 * 1024) {
      try {
        parts.push(inflateSync(Buffer.from(raw.slice(start, end), "latin1")).toString("latin1"));
      } catch {
        parts.push("/Undecodable");
      }
    }
    last = end + "endstream".length;
    re.lastIndex = last;
  }
  parts.push(raw.slice(last));
  return parts.join("\n");
}

// head = awal berkas, tail = akhir berkas (sama dengan head bila berkas dipindai utuh).
// Opsi pemindaian. allowEncryptedPdf: izinkan PDF ber-/Encrypt (mis. PDF bertanda tangan dari sistem lain yang tetap bisa
// dibuka tanpa kata sandi). Pemindai tidak bisa melihat ke dalam isi terenkripsi, jadi HANYA dipakai untuk unggahan akun
// tepercaya (Controller / Admin Regional); pola berbahaya pada bagian yang tidak terenkripsi tetap ditolak.
export interface ScanOptions {
  allowEncryptedPdf?: boolean;
  /** Izinkan berkas yang isinya sama dengan berkas lain di arsip (mis. dokumen MOC offline yang sudah ada di arsip hasil migrasi). */
  allowDuplicate?: boolean;
}
export const canUploadEncryptedPdf = (user: { isRegionalAdmin?: boolean | null; role: string }): boolean => !!user.isRegionalAdmin || user.role.includes("Controller");

export function scanContent(kind: UploadKind, head: Buffer, tail: Buffer, opts: ScanOptions = {}): string | null {
  const bad = (m: string) => `Berkas ditolak: ${m}`;
  const text = latin1(head) + (tail === head ? "" : "\n" + latin1(tail));
  switch (kind.ext) {
    case ".pdf": {
      if (!startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) return bad("isi berkas bukan PDF yang valid.");
      const surface = pdfSurface(text);
      if (PDF_BAD.test(surface)) return bad("PDF berisi skrip, berkas tertanam, atau aksi otomatis yang tidak diizinkan.");
      if (SCRIPT_TEXT.test(surface)) return bad("PDF berisi teks skrip yang mencurigakan.");
      if (!opts.allowEncryptedPdf && /\/Encrypt(?![A-Za-z])/.test(surface)) return bad("PDF terenkripsi tidak dapat diperiksa keamanannya.");
      return null;
    }
    case ".png": {
      if (!startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return bad("isi berkas bukan PNG yang valid.");
      if (SCRIPT_TEXT.test(text)) return bad("gambar berisi teks skrip yang tersembunyi.");
      return null;
    }
    case ".jpg":
    case ".jpeg": {
      if (!startsWith(head, [0xff, 0xd8, 0xff])) return bad("isi berkas bukan JPEG yang valid.");
      if (SCRIPT_TEXT.test(text)) return bad("gambar berisi teks skrip yang tersembunyi.");
      return null;
    }
    case ".docx":
    case ".xlsx": {
      if (!startsWith(head, [0x50, 0x4b, 0x03, 0x04])) return bad("isi berkas bukan dokumen Office (OOXML) yang valid.");
      const names = zipEntryNames(tail);
      if (!names) return bad("struktur dokumen Office tidak dapat dibaca.");
      if (!names.includes("[Content_Types].xml")) return bad("struktur dokumen Office tidak valid.");
      if (!names.some((n) => n.startsWith(kind.ext === ".docx" ? "word/" : "xl/"))) return bad("isi berkas tidak sesuai dengan ekstensinya.");
      if (names.some((n) => OOXML_BAD_NAME.test(n))) return bad("dokumen berisi makro, objek tertanam, atau program.");
      return null;
    }
    default:
      return bad("jenis berkas tidak diizinkan.");
  }
}

// Untuk jalur unggah lewat server (seluruh byte sudah ada di memori).
export function scanWholeBuffer(kind: UploadKind, buf: Buffer, opts: ScanOptions = {}): string | null {
  return scanContent(kind, buf, buf, opts);
}
