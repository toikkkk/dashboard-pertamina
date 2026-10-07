// Pencocokan dokumen toleran-typo, dipakai pencarian di bilah atas dan di Direktori.
import type { DocumentItem } from "@/lib/domain/types";

// Levenshtein distance — dasar pencocokan "mirip" (typo-toleran), bukan hanya substring persis.
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

// Kemiripan 0..1 antar dua kata. Token sangat pendek (mis. "p", "201", nomor urut)
// diabaikan sepenuhnya — kalau tidak, "hazip" otomatis "mengandung" huruf "p" dari token
// 1 huruf manapun di dokumen lain dan memenangkan skor tertinggi secara tidak relevan.
function wordSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a.length < 3 || b.length < 3) return a === b ? 1 : 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const dist = levenshtein(a, b);
  return Math.max(0, 1 - dist / Math.max(a.length, b.length));
}

// Skor kecocokan dokumen untuk satu query (mis. "hazip" → cocok dengan "HAZOP").
// -1 = tidak cocok; makin besar makin relevan, dipakai untuk mengurutkan hasil.
// Ikut mencari di lokasi + nama sub-kategori Direktori juga, bukan cuma judul/nomor —
// supaya "hac juanda" tetap ketemu dokumen yang masuk sub-folder "HAC Layout" di AFT
// Juanda walau kata "hac"/"juanda" sendiri tidak ada di judul dokumennya.
export function documentMatchScore(query: string, doc: DocumentItem): number {
  const haystack = `${doc.title} ${doc.documentNumber} ${doc.location} ${doc.categoryName ?? ""}`.toLowerCase();
  if (haystack.includes(query)) return 1;
  const queryWords = query.split(/\s+/).filter(Boolean);
  const targetWords = haystack.split(/[\s\-/_.,()]+/).filter(Boolean);
  if (queryWords.length === 0 || targetWords.length === 0) return -1;
  let total = 0;
  for (const qw of queryWords) {
    let best = 0;
    for (const tw of targetWords) best = Math.max(best, wordSimilarity(qw, tw));
    total += best;
  }
  const avg = total / queryWords.length;
  return avg >= 0.6 ? avg : -1;
}
