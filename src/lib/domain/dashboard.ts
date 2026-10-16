// Angka dan daftar untuk dashboard PSI dan MOC. Semuanya diturunkan dari data yang ada
// (dokumen, riwayat, MOC); tidak ada angka bawaan. Fungsi murni: mudah diperiksa.
import type { DocumentItem, HistoryItem, LastUpdateType } from "@/lib/domain/types";
import { getLastUpdateType, isDocOverdue } from "@/lib/domain/rules";
import {
  MOC_REVIEW_SLA_DAYS,
  MOC_STAGES,
  mocPendingActions,
  mocStageIndex,
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

export function psiInsights(docs: DocumentItem[], nowMs: number) {
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
    const times = d.history.filter(isRealUpdate).map((h) => parseTs(h.timestamp));
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

  // Umur pembaruan dokumen yang masih berlaku (dasar infografik dashboard). Batas 12 bulan sama dengan
  // `stale`, jadi dua bucket terakhir berjumlah persis sama dengan daftar "Belum diperbarui".
  const ageBuckets = [
    { key: "u3", label: "≤ 3 bln", maxDays: 90, stale: false, count: 0 },
    { key: "u6", label: "3–6 bln", maxDays: 180, stale: false, count: 0 },
    { key: "u12", label: "6–12 bln", maxDays: STALE_AFTER_DAYS, stale: false, count: 0 },
    { key: "u24", label: "1–2 thn", maxDays: 730, stale: true, count: 0 },
    { key: "o24", label: "> 2 thn", maxDays: Infinity, stale: true, count: 0 },
  ];
  for (const doc of live) {
    const last = lastUpdateOf(doc);
    if (last <= 0) continue;
    const ageDays = (nowMs - last) / DAY;
    const b = ageBuckets.find((x) => ageDays <= x.maxDays);
    if (b) b.count++;
  }

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
    ageBuckets,
    expiryYears,
    total: docs.length,
    approved: live.filter((d) => d.status === "Approved").length,
  };
}

// ---------------------------------------------------------------- MOC

export type MocAttentionKind = "mine" | "sla" | "temp" | "waiting";
export interface MocAttentionItem {
  moc: MocRequest;
  kind: MocAttentionKind;
  detail: string;
}

const RISK_ORDER: MocRiskLevel[] = ["H", "M", "L"];

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
    const acts = mocPendingActions(m, actor);
    if (acts.length > 0) {
      const label = acts.includes("review")
        ? "Menunggu review Anda"
        : acts.includes("decide")
          ? "Menunggu keputusan Anda"
          : acts.includes("register")
            ? "Menunggu registrasi Anda"
            : acts.includes("communicate")
              ? "Catat komunikasi MOC"
              : acts.includes("planImplementation")
                ? "Catat rencana implementasi"
                : m.validationState === "draft"
              ? "Draf belum diajukan"
              : "Perlu diperbaiki lalu diajukan ulang";
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

    if (m.validationState === "registered" && m.sifatPerubahan === "Sementara" && m.validUntil) {
      const left = Math.ceil((new Date(m.validUntil + "T00:00:00").getTime() - nowMs) / DAY);
      if (left <= MOC_TEMP_EXPIRING_DAYS) {
        push(m, "temp", left < 0 ? `Masa berlaku sementara lewat ${-left} hari` : `Masa berlaku sementara berakhir ${left} hari lagi`);
      }
    }
  }
  const order: Record<MocAttentionKind, number> = { mine: 0, sla: 1, temp: 2, waiting: 3 };
  attention.sort((a, b) => order[a.kind] - order[b.kind]);

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
