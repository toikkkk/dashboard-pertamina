// Angka dan daftar untuk dashboard PSI dan MOC. Semuanya diturunkan dari data yang ada
// (dokumen, riwayat, MOC); tidak ada angka bawaan. Fungsi murni: mudah diperiksa.
import type { DocumentItem, HistoryItem, LastUpdateType } from "@/lib/domain/types";
import { getLastUpdateType, isDocOverdue, isExcludedFromDashboard, isReviewEntry, isSupersedeEntry } from "@/lib/domain/rules";
import {
  MOC_REVIEW_SLA_DAYS,
  MOC_STAGES,
  mocFinalReviewDue,
  mocFinalReviewOverdueDays,
  mocMonitoringDue,
  mocMonitoringOverdueDays,
  mocPendingActions,
  mocStageIndex,
  mocUnsignedMonitoring,
  type MocAction,
  type MocActor,
  type MocRequest,
  type MocRiskLevel,
} from "@/lib/domain/moc";

const DAY = 86_400_000;
export const EXPIRING_WITHIN_DAYS = 90;
export const STALE_AFTER_DAYS = 365;
export const MOC_APPROVAL_SLA_DAYS = 5;
export const MOC_TEMP_EXPIRING_DAYS = 30;

const parseTs = (s: string): number => {
  const t = new Date(s.includes("T") ? s : s.replace(" ", "T")).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// Hari kerja (Senin-Jumat) yang sudah lewat antara dua waktu. Hari libur nasional tidak
// dihitung karena tidak ada kalender libur di sistem, jadi hasilnya sedikit lebih besar.
export function workingDaysBetween(fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return 0;
  let days = 0;
  const cur = new Date(fromMs);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(toMs);
  end.setHours(0, 0, 0, 0);
  while (cur.getTime() < end.getTime()) {
    cur.setDate(cur.getDate() + 1);
    const wd = cur.getDay();
    if (wd !== 0 && wd !== 6) days++;
  }
  return days;
}

// ---------------------------------------------------------------- PSI

export interface PsiRecentUpdate {
  doc: DocumentItem;
  entry: HistoryItem;
  type: LastUpdateType;
  at: number;
}

export function psiInsights(allDocs: DocumentItem[], nowMs: number) {
  // Evidence PHA (bukti pendukung HAZID/HAZOP) dan versi lama yang Digantikan tidak ikut dihitung di visualisasi.
  const docs = allDocs.filter((d) => !isExcludedFromDashboard(d));
  const overdue = docs.filter(isDocOverdue);
  const live = docs.filter((d) => !isDocOverdue(d));

  const expiring = live
    .map((doc) => ({ doc, daysLeft: Math.ceil((new Date(doc.expiryDate + "T00:00:00").getTime() - nowMs) / DAY) }))
    .filter((x) => x.daysLeft <= EXPIRING_WITHIN_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Pembaruan nyata = tindakan pengguna yang mengubah/menjaga isi dokumen: dokumen baru
  // diunggah, direvisi (isi/berkas), atau validitas diperpanjang. TIDAK dihitung:
  //  - entri "Created" hasil tautan arsip registry (migrasi; waktunya = saat diimpor,
  //    bukan tanggal dokumen), dan
  //  - "Revised" yang hanya memindahkan sub-kategori (bukan perubahan isi).
  const isRealUpdate = (h: HistoryItem): boolean => {
    if (isReviewEntry(h) || isSupersedeEntry(h)) return false; // tinjauan tahunan dan penandaan Digantikan bukan pembaruan isi dokumen
    if (h.action === "Created") {
      const n = h.notes ?? "";
      return !n.startsWith("Ditautkan dari arsip registry") && !n.startsWith("Dikoreksi:");
    }
    if (h.action === "Extended Validity") return true;
    // Koreksi data (judul/nomor/tanggal/verifikasi) bukan pembaruan isi dokumen.
    if (h.action === "Revised" && (h.notes ?? "").startsWith("Dikoreksi:")) return false;
    if (h.action === "Revised") return !(h.diff && h.diff.length > 0 && h.diff.every((x) => x.field === "Sub-kategori"));
    return false;
  };
  // Pembaruan terakhir = yang paling baru antara tanggal terbit dokumen dan pembaruan
  // nyata di atas. TKO PSI meminta evaluasi tiap tahun.
  const lastUpdateOf = (d: DocumentItem): number => {
    // Tinjauan tahunan ("Ditinjau:") ikut mengembalikan jam evaluasi walau bukan pembaruan isi.
    const times = d.history.filter((h) => isRealUpdate(h) || isReviewEntry(h)).map((h) => parseTs(h.timestamp));
    return Math.max(parseTs(d.issueDate), ...times);
  };
  const stale = live
    .map((doc) => ({ doc, lastUpdate: lastUpdateOf(doc) }))
    .filter((x) => x.lastUpdate > 0 && nowMs - x.lastUpdate > STALE_AFTER_DAYS * DAY)
    .map((x) => ({ ...x, months: Math.floor((nowMs - x.lastUpdate) / (30.4 * DAY)) }))
    .sort((a, b) => a.lastUpdate - b.lastUpdate);

  // Tidak lagi dipotong ke 5 di sini — dashboard panel "Pembaruan Terbaru" sendiri
  // yang menampilkan 5 teratas, sisanya bisa dilihat lewat popup "Lihat semua"
  // (DashboardListModal), sama seperti `stale` di atas (juga tidak dipotong di
  // sini). Memotong di sumber data membuat popup "lihat semua" tidak punya apa-apa
  // untuk ditampilkan selain 5 yang sudah kelihatan.
  const recent: PsiRecentUpdate[] = docs
    .flatMap((doc) =>
      doc.history
        .filter(isRealUpdate)
        .map((entry) => ({ doc, entry, type: getLastUpdateType([entry]), at: parseTs(entry.timestamp) }))
    )
    .filter((x) => x.at > 0)
    .sort((a, b) => b.at - a.at);

  // Jadwal kedaluwarsa: berapa dokumen berakhir per tahun (yang sudah lewat dihitung terpisah).
  const thisYear = new Date(nowMs).getFullYear();
  const expiryYears: { key: string; label: string; count: number; tone: "lewat" | "dekat" | "jauh" }[] = [
    { key: "lewat", label: "Lewat", count: overdue.length, tone: "lewat" },
  ];
  for (let y = thisYear; y <= thisYear + 4; y++) {
    expiryYears.push({ key: String(y), label: String(y), count: 0, tone: y === thisYear ? "dekat" : "jauh" });
  }
  expiryYears.push({ key: "later", label: `${thisYear + 5}+`, count: 0, tone: "jauh" });
  for (const doc of live) {
    const y = new Date(doc.expiryDate + "T00:00:00").getFullYear();
    if (Number.isNaN(y)) continue;
    const slot = y > thisYear + 4 ? expiryYears[expiryYears.length - 1] : expiryYears.find((e) => e.key === String(y));
    if (slot) slot.count++;
  }

  return {
    overdue,
    expiring,
    stale,
    recent,
    expiryYears,
    total: docs.length,
    approved: live.filter((d) => d.status === "Approved").length,
  };
}

// Dokumen yang masih berlaku dan berakhir pada tahun tertentu (kunci = "2026", "2027", ... atau "later" untuk
// tahun ke-6 dan sesudahnya). Dipakai kolom "Jadwal kedaluwarsa" dan daftar tujuannya di Direktori, supaya angka
// di kolom selalu sama dengan jumlah baris daftar.
export function docsByExpiryBucket(docs: DocumentItem[], key: string, nowMs: number): DocumentItem[] {
  const thisYear = new Date(nowMs).getFullYear();
  return docs
    .filter((d) => !isExcludedFromDashboard(d) && !isDocOverdue(d))
    .filter((d) => {
      const y = new Date(d.expiryDate + "T00:00:00").getFullYear();
      if (Number.isNaN(y)) return false;
      return key === "later" ? y > thisYear + 4 : String(y) === key;
    })
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

// Kelengkapan sub-dokumen PSI (53 item Excel x terminal) dari ringkasan Direktori. Satu sel = satu sub-dokumen di
// satu terminal: terpenuhi (ada dan berlaku), perlu ditinjau (ada tapi lewat siklus), atau kosong (belum ada dokumen).
export interface CompletenessOverview {
  locations: { name: string; type: string }[];
  items: { name: string; chapter: string }[];
  cells: Record<string, Record<string, { n: number; s: string }>>;
}
export interface CompletenessCount {
  ok: number;
  review: number;
  missing: number;
  total: number;
}
const zeroCount = (): CompletenessCount => ({ ok: 0, review: 0, missing: 0, total: 0 });
function addCell(c: CompletenessCount, cell: { n: number; s: string } | undefined) {
  c.total++;
  if (!cell || cell.n === 0) c.missing++;
  else if (cell.s === "ok") c.ok++;
  else c.review++;
}

// Per Sub Chapter; `scope` = satu terminal, atau null untuk semua terminal.
export function completenessByChapter(o: CompletenessOverview, scope: string | null): Record<string, CompletenessCount> {
  const out: Record<string, CompletenessCount> = {};
  for (const loc of o.locations) {
    if (scope && loc.name !== scope) continue;
    for (const it of o.items) addCell((out[it.chapter] ??= zeroCount()), o.cells[loc.name]?.[it.name]);
  }
  return out;
}

// Per terminal, yang paling bolong dulu.
export function completenessByLocation(o: CompletenessOverview): (CompletenessCount & { name: string; type: string; pct: number })[] {
  return o.locations
    .map((loc) => {
      const c = zeroCount();
      for (const it of o.items) addCell(c, o.cells[loc.name]?.[it.name]);
      return { name: loc.name, type: loc.type, ...c, pct: c.total > 0 ? Math.round((c.ok / c.total) * 100) : 0 };
    })
    .sort((a, b) => a.pct - b.pct || b.missing - a.missing || a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- MOC

export type MocAttentionKind = "mine" | "sla" | "temp" | "waiting";
export interface MocAttentionItem {
  moc: MocRequest;
  kind: MocAttentionKind;
  detail: string;
}

const RISK_ORDER: MocRiskLevel[] = ["H", "MTH", "M", "LTM", "L"];

const MINE_LABELS: [MocAction, string][] = [
  ["review", "Menunggu review Anda"],
  ["decide", "Menunggu keputusan Anda"],
  ["reviewFinal", "Menunggu review Tinjauan Akhir Anda"],
  ["decideHalt", "Putuskan penundaan/penghentian"],
  ["decideHaltProxy", "Catat keputusan penundaan/penghentian atas nama Approver"],
  ["signMonitoring", "Unggah Form Pemantauan bertanda tangan"],
  ["finalizeClosure", "Finalisasi penutupan: unggah form bertanda tangan"],
  ["close", "Setujui penutupan MOC"],
  ["closeProxy", "Setujui penutupan atas nama Approver"],
  ["reviewFinalProxy", "Catat review Tinjauan Akhir atas nama reviewer"],
  ["reviewProxy", "Catat review atas nama reviewer"],
  ["decideProxy", "Catat keputusan atas nama Approver"],
  ["register", "Menunggu registrasi Anda"],
  ["monitor", "Catat pemantauan MOC"],
  ["finalReview", "Catat Tinjauan Akhir"],
  ["communicate", "Catat komunikasi MOC"],
  ["planImplementation", "Catat rencana implementasi"],
];

// Penantian yang bukan giliran user ini (tampil sebagai "Menunggu pihak lain"). null = tidak sedang menunggu apa pun.
function mocOthersWaiting(m: MocRequest): string | null {
  if (m.validationState === "halt_requested") return "Menunggu keputusan Approver atas penundaan/penghentian";
  if (m.validationState === "halted") return m.halt?.kind === "Hentikan" ? "Dihentikan; menunggu Initiator melanjutkan (mengulang Validasi)" : "Ditunda; menunggu Initiator melanjutkan (mengulang Validasi)";
  if (m.validationState !== "registered") return null;
  if (m.registerStatus === "Pemantauan") {
    const u = mocUnsignedMonitoring(m);
    return u ? `Menunggu Controller mengunggah Form Pemantauan ke-${u.no} bertanda tangan` : null;
  }
  if (m.registerStatus === "Tinjauan Akhir") {
    if (m.closure) return "Menunggu Controller mengunggah form penutupan bertanda tangan";
    const pending = (m.finalReview?.responses ?? []).filter((r) => r.outcome === "Pending");
    if (pending.length > 0) return `Menunggu review Tinjauan Akhir: ${pending.map((r) => r.fungsi).join(", ")}`;
  }
  return null;
}

export function mocInsights(mocs: MocRequest[], actor: MocActor, nowMs: number) {
  const closed = (m: MocRequest) => m.validationState === "registered" && m.registerStatus === "Closed";
  const active = mocs.filter((m) => !closed(m));

  const stageCounts = MOC_STAGES.map((label, i) => ({
    label,
    count: mocs.filter((m) => (closed(m) ? MOC_STAGES.length - 1 : mocStageIndex(m)) === i).length,
  }));

  const attention: MocAttentionItem[] = [];
  const seen = new Set<string>();
  const push = (moc: MocRequest, kind: MocAttentionKind, detail: string) => {
    if (kind !== "mine" && seen.has(moc.id + kind)) return;
    seen.add(moc.id + kind);
    attention.push({ moc, kind, detail });
  };

  for (const m of active) {
    if (m.isOffline) continue; // catatan offline tidak punya tindakan/penantian di aplikasi
    const acts = mocPendingActions(m, actor);
    if (acts.length > 0) {
      // Label mengikuti tindakan pertama yang cocok; urutan = prioritas. Semua tindakan baru (Gelombang B) terdaftar
      // supaya tidak jatuh ke teks bawaan "perlu diperbaiki".
      const label = MINE_LABELS.find(([act]) => acts.includes(act))?.[1] ?? (m.validationState === "draft" ? "Draf belum diajukan" : "Perlu diperbaiki lalu diajukan ulang");
      push(m, "mine", label);
    }

    const since = m.stateSince ? new Date(m.stateSince).getTime() : 0;
    const waited = since > 0 ? workingDaysBetween(since, nowMs) : 0;
    if (m.validationState === "in_review") {
      const limit = MOC_REVIEW_SLA_DAYS[m.riskLevel ?? "M"];
      if (waited > limit) push(m, "sla", `Review lewat ${waited - limit} hari kerja dari batas ${limit} hari`);
    } else if (m.validationState === "pending_approval") {
      if (waited > MOC_APPROVAL_SLA_DAYS) push(m, "sla", `Persetujuan lewat ${waited - MOC_APPROVAL_SLA_DAYS} hari kerja dari batas ${MOC_APPROVAL_SLA_DAYS} hari`);
    } else if ((m.validationState === "returned" || m.validationState === "rejected") && waited >= 1) {
      push(m, "waiting", `Menunggu perbaikan ${m.createdByName ?? "pembuat"} selama ${waited} hari kerja`);
    }

    if (acts.length === 0) {
      const wait = mocOthersWaiting(m);
      if (wait) push(m, "waiting", wait);
    }

    const monDue = mocMonitoringDue(m);
    const monLate = mocMonitoringOverdueDays(m, nowMs);
    if (monDue && monLate > 0) push(m, "sla", `Pemantauan lewat ${monLate} hari dari batas ${monDue}`);
    const finDue = mocFinalReviewDue(m);
    const finLate = mocFinalReviewOverdueDays(m, nowMs);
    if (finDue && finLate > 0) push(m, "sla", `Tinjauan Akhir lewat ${finLate} hari dari batas ${finDue}`);

    if (m.validationState === "registered" && m.sifatPerubahan === "Sementara" && m.validUntil) {
      const left = Math.ceil((new Date(m.validUntil + "T00:00:00").getTime() - nowMs) / DAY);
      if (left <= MOC_TEMP_EXPIRING_DAYS) {
        push(m, "temp", left < 0 ? `Masa berlaku sementara lewat ${-left} hari` : `Masa berlaku sementara berakhir ${left} hari lagi`);
      }
    }
  }
  const order: Record<MocAttentionKind, number> = { mine: 0, sla: 1, temp: 2, waiting: 3 };
  attention.sort((a, b) => order[a.kind] - order[b.kind]);

  // MOC yang ditunda/dihentikan tetap "aktif" di database tetapi tidak sedang berjalan: dihitung terpisah.
  const halted = active.filter((m) => m.validationState === "halted").length;
  const unrated = active.filter((m) => !m.riskLevel).length;
  const bySifat = (["Permanen", "Sementara", "Darurat"] as const).map((label) => ({ label, count: active.filter((m) => m.sifatPerubahan === label).length }));
  const byRisk = RISK_ORDER.map((level) => ({ level, count: active.filter((m) => m.riskLevel === level).length }));

  const locations = Array.from(new Set(mocs.map((m) => m.location))).sort();
  const byLocation = locations.map((location) => {
    const own = mocs.filter((m) => m.location === location);
    const done = own.filter(closed).length;
    return { location, total: own.length, active: own.length - done, closed: done };
  });

  const recent = [...mocs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

  return {
    total: mocs.length,
    active: active.length,
    running: active.length - halted,
    halted,
    unrated,
    closed: mocs.length - active.length,
    mineCount: attention.filter((a) => a.kind === "mine").length,
    slaCount: attention.filter((a) => a.kind === "sla").length,
    stageCounts,
    attention,
    bySifat,
    byRisk,
    byLocation,
    recent,
  };
}
