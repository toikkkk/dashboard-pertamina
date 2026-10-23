// Pemuat + pemeta data MOC untuk semua route /api/moc/*. Sama tujuannya dengan
// lib/api/documents.ts: memetakan baris DB ke bentuk domain (MocRequest) yang dipakai
// klien, sehingga aturan di domain/moc.ts berjalan identik di klien dan server.
import { and, eq, inArray, desc, asc, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { mocRequests, mocReviews, mocHistory, mocEvidence, fileRegistry, users } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/rbac";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT, ATTACHMENT_TYPE_ERROR, isAttachmentKind } from "@/lib/security/fileScan";
import { HttpError } from "@/lib/api/respond";
import {
  MOC_CHANGE_CATEGORIES,
  MOC_COMMUNICATION_ITEMS,
  MOC_COMMUNICATION_MEDIA,
  MOC_FINAL_QUESTIONS,
  MOC_MONITOR_OUTCOMES,
  MOC_REQUIRE_SIGNED_EVIDENCE,
  mocActionsFor,
  type MocAction,
  MOC_RISK_IMPACTS,
  MOC_RISK_LEVELS,
  MOC_SIFAT_PERUBAHAN,
  type MocActor,
  type MocBarrier,
  type MocEvidence,
  type MocEvidenceSlot,
  type MocHistoryAction,
  type MocHistoryEntry,
  type MocRequest,
  type MocReview,
} from "@/lib/domain/moc";

export function sessionUserToMocActor(u: SessionUser): MocActor {
  return { id: u.id, name: u.name, role: u.role, location: u.location, isRegionalAdmin: u.isRegionalAdmin };
}

// Gerbang tulis untuk setiap route aksi: memuat MOC lalu memastikan user BOLEH
// melakukan aksi itu pada status sekarang (mocActionsFor). Klien hanya memakai
// fungsi yang sama untuk menampilkan tombol — di sini yang benar-benar menentukan.
export async function requireMocAction(id: string, user: SessionUser, action: MocAction): Promise<MocRequest> {
  const moc = await loadMocItem(id);
  if (!moc) throw new HttpError(404, "MOC tidak ditemukan.");
  if (!mocActionsFor(moc, sessionUserToMocActor(user)).includes(action)) {
    throw new ForbiddenError("Anda tidak berwenang melakukan tindakan ini pada tahap MOC saat ini.");
  }
  return moc;
}

// Lampirkan bukti tanda tangan bila ada; wajib bila MOC_REQUIRE_SIGNED_EVIDENCE.
export async function handleEvidence(
  mocId: string,
  slot: MocEvidenceSlot,
  fileId: string | undefined,
  user: SessionUser,
  reviewId?: string
): Promise<void> {
  if (!fileId) {
    if (MOC_REQUIRE_SIGNED_EVIDENCE) throw new HttpError(400, "Bukti tanda tangan wajib dilampirkan.");
    return;
  }
  const ok = await attachMocEvidence(mocId, slot, fileId, user, reviewId);
  if (!ok) throw new HttpError(400, "Berkas bukti tidak valid atau bukan unggahan Anda.");
}

// Waktu ditampilkan dalam WIB (Asia/Jakarta), bukan UTC — jejak audit MOC yang
// menunjukkan jam 7 jam lebih awal dari kenyataan menyesatkan. 'sv-SE' = YYYY-MM-DD HH:mm:ss.
const fmtTs = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 16);

type RequestRow = typeof mocRequests.$inferSelect;
type ReviewRow = typeof mocReviews.$inferSelect;
type HistoryRow = typeof mocHistory.$inferSelect;

function toReview(r: ReviewRow): MocReview {
  return {
    id: r.id,
    round: r.round,
    functionLabel: r.functionLabel,
    reviewerUserId: r.reviewerUserId,
    reviewerName: r.reviewerName,
    reviewerJabatan: r.reviewerJabatan,
    outcome: r.outcome as MocReview["outcome"],
    recommendation: r.recommendation,
    reviewedAt: r.reviewedAt ? fmtTs(r.reviewedAt) : undefined,
  };
}

function toHistory(h: HistoryRow): MocHistoryEntry {
  return {
    id: h.id,
    timestamp: fmtTs(h.timestamp),
    actorName: h.actorName,
    actorRole: h.actorRole,
    action: h.action as MocHistoryAction,
    notes: h.notes ?? undefined,
    fromState: h.fromState ?? undefined,
    toState: h.toState ?? undefined,
  };
}

function toRequest(
  row: RequestRow,
  reviews: MocReview[],
  history: MocHistoryEntry[],
  evidence: MocEvidence[],
  approverName: string | null,
  createdByName: string | null,
  stateSince: Date | null
): MocRequest {
  return {
    id: row.id,
    mocNumber: row.mocNumber,
    location: row.location,
    createdBy: row.createdBy,
    createdByName,
    stateSince: (stateSince ?? row.updatedAt).toISOString(),
    registerStatus: row.registerStatus as MocRequest["registerStatus"],
    validationState: row.validationState as MocRequest["validationState"],
    round: row.round,
    approverUserId: row.approverUserId,
    approverName: approverName ?? row.approverManualName,
    performerUserId: row.performerUserId,
    performerName: row.performerName,
    approverNote: row.approverNote,
    plannedReviewers: row.plannedReviewers as MocRequest["plannedReviewers"],
    plannedApproverId: row.plannedApproverId,
    approverManualName: row.approverManualName,
    approverManualJabatan: row.approverManualJabatan,
    communication: (row.communication as MocRequest["communication"]) ?? null,
    implementationPlan: (row.implementationPlan as MocRequest["implementationPlan"]) ?? null,
    monitoring: (row.monitoring as MocRequest["monitoring"]) ?? [],
    finalReview: (row.finalReview as MocRequest["finalReview"]) ?? null,
    closure: (row.closure as MocRequest["closure"]) ?? null,
    halt: (row.halt as MocRequest["halt"]) ?? null,
    isOffline: row.isOffline,
    approvedAt: row.approvedAt ? fmtTs(row.approvedAt) : undefined,
    createdAt: fmtTs(row.createdAt),
    updatedAt: fmtTs(row.updatedAt),
    unitOperasi: row.unitOperasi,
    fungsi: row.fungsi,
    region: row.region,
    anggaranType: row.anggaranType,
    tanggal: row.tanggal,
    judul: row.judul,
    latarBelakang: row.latarBelakang,
    changeCategories: row.changeCategories as MocRequest["changeCategories"],
    sifatPerubahan: row.sifatPerubahan as MocRequest["sifatPerubahan"],
    validFrom: row.validFrom ?? undefined,
    validUntil: row.validUntil ?? undefined,
    deskripsi: row.deskripsi,
    prosesTerdampak: row.prosesTerdampak,
    peraturanRelevan: row.peraturanRelevan,
    stakeholderReviewer: row.stakeholderReviewer,
    studiKajian: row.studiKajian,
    usulanPerformer: row.usulanPerformer,
    initiatorName: row.initiatorName,
    initiatorJabatan: row.initiatorJabatan,
    riskImpacts: row.riskImpacts as MocRequest["riskImpacts"],
    hazardDescription: row.hazardDescription,
    severity: row.severity,
    probability: row.probability,
    riskLevel: row.riskLevel as MocRequest["riskLevel"],
    plantBarriers: row.plantBarriers as MocBarrier[],
    processBarriers: row.processBarriers as MocBarrier[],
    peopleBarriers: row.peopleBarriers as MocBarrier[],
    upsideGain: row.upsideGain,
    downsideLoss: row.downsideLoss,
    reviews,
    history,
    evidence,
  };
}

// Saat terakhir MOC masuk ke keadaan validasi/tahap sekarang, dari riwayat (bukan
// updatedAt, yang ikut berubah oleh suntingan biasa). null bila riwayat belum mencatatnya.
function stateSinceOf(row: RequestRow, history: { toState: string | null; timestamp: Date }[]): Date | null {
  const target = row.validationState === "registered" ? row.registerStatus : row.validationState;
  const hit = history.filter((h) => h.toState === target).map((h) => h.timestamp.getTime());
  return hit.length > 0 ? new Date(Math.max(...hit)) : null;
}

async function userNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const clean = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (clean.length === 0) return new Map();
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, clean));
  return new Map(rows.map((r) => [r.id, r.name]));
}

export async function loadMocItem(id: string): Promise<MocRequest | null> {
  const [row] = await db.select().from(mocRequests).where(and(eq(mocRequests.id, id), isNull(mocRequests.deletedAt))).limit(1);
  if (!row) return null;
  const [reviewRows, historyRows, evidenceRows] = await Promise.all([
    db.select().from(mocReviews).where(eq(mocReviews.mocId, id)).orderBy(asc(mocReviews.round), asc(mocReviews.functionLabel)),
    db.select().from(mocHistory).where(eq(mocHistory.mocId, id)).orderBy(asc(mocHistory.timestamp)),
    db
      .select({
        e: mocEvidence,
        fileName: fileRegistry.originalFilename,
        uploaderName: users.name,
      })
      .from(mocEvidence)
      .innerJoin(fileRegistry, eq(mocEvidence.fileId, fileRegistry.id))
      .leftJoin(users, eq(mocEvidence.uploadedBy, users.id))
      .where(eq(mocEvidence.mocId, id))
      .orderBy(asc(mocEvidence.uploadedAt)),
  ]);
  const names = await userNames([row.approverUserId, row.createdBy]);
  const evidence: MocEvidence[] = evidenceRows.map(({ e, fileName, uploaderName }) => ({
    id: e.id,
    slot: e.slot as MocEvidenceSlot,
    stage: e.stage ?? undefined,
    reviewId: e.reviewId ?? undefined,
    fileId: e.fileId,
    fileName,
    fileUrl: `/api/files/${e.fileId}/download`,
    uploadedByName: uploaderName ?? "—",
    uploadedAt: fmtTs(e.uploadedAt),
  }));
  const result = toRequest(row, reviewRows.map(toReview), historyRows.map(toHistory), evidence, names.get(row.approverUserId ?? "") ?? null, names.get(row.createdBy ?? "") ?? null, stateSinceOf(row, historyRows));
  // Jabatan kosong pada lembar cetak: pakai fungsi yang tercatat di akun Approver/Reviewer.
  const funcIds = [row.approverUserId, ...reviewRows.map((r) => r.reviewerUserId)].filter((v): v is string => !!v);
  if (funcIds.length > 0) {
    const fns = await db.select({ id: users.id, fn: users.mocFunction, username: users.username }).from(users).where(inArray(users.id, funcIds));
    const fnOf = new Map(fns.map((f) => [f.id, f.fn]));
    const unameOf = new Map(fns.map((f) => [f.id, f.username]));
    result.approverJabatan = row.approverUserId ? fnOf.get(row.approverUserId) ?? null : null;
    result.reviews = result.reviews.map((r) => (r.reviewerUserId ? { ...r, reviewerJabatan: r.reviewerJabatan || (fnOf.get(r.reviewerUserId) ?? ""), reviewerUsername: unameOf.get(r.reviewerUserId) ?? null } : r));
  }
  return result;
}

// Daftar Register MOC. Sengaja ringan: review terisi (dibutuhkan mocActionsFor untuk
// "menunggu tindakan saya"), tetapi riwayat & bukti kosong — ambil lewat loadMocItem.
export async function loadMocList(): Promise<MocRequest[]> {
  const rows = await db.select().from(mocRequests).where(isNull(mocRequests.deletedAt)).orderBy(desc(mocRequests.createdAt));
  if (rows.length === 0) return [];
  const reviewRows = await db.select().from(mocReviews).where(inArray(mocReviews.mocId, rows.map((r) => r.id)));
  const names = await userNames(rows.flatMap((r) => [r.approverUserId, r.createdBy]));
  const historyRows = await db
    .select({ mocId: mocHistory.mocId, toState: mocHistory.toState, timestamp: mocHistory.timestamp })
    .from(mocHistory)
    .where(inArray(mocHistory.mocId, rows.map((r) => r.id)));
  // Bukti ringan (hanya slot + tahap) agar aturan berbasis bukti (mis. Form Pemantauan sudah bertanda tangan atau belum)
  // bernilai sama di daftar, badge, dan dashboard seperti di halaman detail.
  const evidenceRows = await db
    .select({ mocId: mocEvidence.mocId, id: mocEvidence.id, slot: mocEvidence.slot, stage: mocEvidence.stage, fileId: mocEvidence.fileId })
    .from(mocEvidence)
    .where(inArray(mocEvidence.mocId, rows.map((r) => r.id)));
  const historyByMoc = new Map<string, { toState: string | null; timestamp: Date }[]>();
  for (const h of historyRows) historyByMoc.set(h.mocId, [...(historyByMoc.get(h.mocId) ?? []), h]);
  return rows.map((row) =>
    toRequest(
      row,
      reviewRows.filter((rv) => rv.mocId === row.id).map(toReview),
      [],
      evidenceRows
        .filter((e) => e.mocId === row.id)
        .map((e) => ({ id: e.id, slot: e.slot as MocEvidenceSlot, stage: e.stage ?? undefined, fileId: e.fileId, fileName: "", fileUrl: "", uploadedByName: "", uploadedAt: "" })),
      names.get(row.approverUserId ?? "") ?? null,
      names.get(row.createdBy ?? "") ?? null,
      stateSinceOf(row, historyByMoc.get(row.id) ?? [])
    )
  );
}

export async function recordMocHistory(
  mocId: string,
  actor: SessionUser,
  action: MocHistoryAction,
  opts: { notes?: string; fromState?: string; toState?: string } = {}
): Promise<void> {
  await db.insert(mocHistory).values({
    mocId,
    actorUserId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    notes: opts.notes,
    fromState: opts.fromState,
    toState: opts.toState,
  });
}

// Bukti tanda tangan hanya boleh berupa berkas yang benar-benar sudah diunggah
// OLEH user yang melampirkan (mencegah melampirkan berkas milik orang lain).
export async function attachMocEvidence(
  mocId: string,
  slot: MocEvidenceSlot,
  fileId: string,
  user: SessionUser,
  reviewId?: string,
  stage?: string
): Promise<boolean> {
  const [file] = await db
    .select({ id: fileRegistry.id, name: fileRegistry.originalFilename, size: fileRegistry.sizeBytes })
    .from(fileRegistry)
    .where(and(eq(fileRegistry.id, fileId), eq(fileRegistry.uploadStatus, "uploaded"), eq(fileRegistry.uploadedByUserId, user.id)))
    .limit(1);
  if (!file) return false;
  // Lampiran tahap: hanya gambar/PDF (sudah dipindai saat unggah) dan maksimum 20MB.
  if (slot === "lampiran") {
    if (!isAttachmentKind(file.name)) throw new HttpError(400, ATTACHMENT_TYPE_ERROR);
    if (Number(file.size) > ATTACHMENT_MAX_BYTES) throw new HttpError(400, "Ukuran lampiran maksimum 20MB.");
  }
  await db.insert(mocEvidence).values({ mocId, slot, fileId, uploadedBy: user.id, reviewId, stage });
  return true;
}

// ---------------------------------------------------------------------------
// Validasi input (zod) — isi formulir Lampiran 5. Semua opsional agar draf boleh
// disimpan setengah jadi; kelengkapan dicek saat diajukan (mocSubmitIssues).
// ---------------------------------------------------------------------------
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .or(z.literal("").transform(() => null));
const text = (max: number) => z.string().max(max);
const barrier = z.object({ text: text(1000), pic: text(200) });

export const mocFormPatchSchema = z
  .object({
    // Rencana reviewer/approver (disimpan otomatis dari panel Ajukan; baris kosong boleh).
    plannedReviewers: z
      .array(z.object({ userId: z.union([z.string().uuid(), z.literal("")]), functionLabel: text(100), jabatan: text(200), manual: z.boolean().optional(), name: text(200).optional() }))
      .max(10),
    plannedApproverId: z.union([z.string().uuid(), z.literal("").transform(() => null), z.null()]),
    approverManualName: text(200).nullable(),
    approverManualJabatan: text(200).nullable(),
    unitOperasi: text(200),
    fungsi: text(200),
    region: text(100),
    anggaranType: text(100),
    tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    judul: text(300),
    latarBelakang: text(5000),
    changeCategories: z.array(z.enum(MOC_CHANGE_CATEGORIES)).max(MOC_CHANGE_CATEGORIES.length),
    sifatPerubahan: z.enum(MOC_SIFAT_PERUBAHAN),
    validFrom: dateStr,
    validUntil: dateStr,
    deskripsi: text(10000),
    prosesTerdampak: text(10000),
    peraturanRelevan: text(10000),
    stakeholderReviewer: text(5000),
    studiKajian: text(5000),
    usulanPerformer: text(5000),
    initiatorName: text(200),
    initiatorJabatan: text(200),
    riskImpacts: z.array(z.enum(MOC_RISK_IMPACTS)).max(MOC_RISK_IMPACTS.length),
    hazardDescription: text(5000),
    severity: z.number().int().min(1).max(5).nullable(),
    probability: z.number().int().min(1).max(5).nullable(),
    riskLevel: z.enum(MOC_RISK_LEVELS).nullable(),
    plantBarriers: z.array(barrier).max(20),
    processBarriers: z.array(barrier).max(20),
    peopleBarriers: z.array(barrier).max(20),
    upsideGain: text(5000),
    downsideLoss: text(5000),
  })
  .partial();

// Tahap D Komunikasi & E.1 Rencana Implementasi. Kelengkapan isian dicek terpisah oleh
// mocCommunicationIssues / mocImplementationPlanIssues (pesan yang sama dengan klien).
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""));
const attachmentFileIds = z.array(z.string().uuid()).max(ATTACHMENT_MAX_COUNT).default([]);

export const mocCommunicationSchema = z.object({
  items: z.array(z.enum(MOC_COMMUNICATION_ITEMS)).max(MOC_COMMUNICATION_ITEMS.length),
  media: z.array(z.enum(MOC_COMMUNICATION_MEDIA)).max(MOC_COMMUNICATION_MEDIA.length),
  mediaOther: text(200).default(""),
  date: ymd,
  audience: text(2000),
  notes: text(5000).default(""),
  attachmentFileIds,
});

export const mocImplementationPlanSchema = z.object({
  technicalPlan: text(10000),
  monitoringPlan: text(10000),
  milestones: z.array(z.object({ label: text(300), targetDate: ymd })).max(20),
  documentationPlan: text(10000).default(""),
  attachmentFileIds,
});

// Tahap F-H. Baris tabel Lampiran 6 dan 7; baris yang seluruhnya kosong dibuang di rute.
const trackedItem = z.object({ item: text(1000), keterangan: text(2000), tahapan: text(300), pic: text(300), targetDate: ymd, status: text(200) });
export const mocMonitoringSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activities: z.array(trackedItem).max(40),
  followUps: z.array(trackedItem).max(40).default([]),
  notes: text(5000).default(""),
  outcome: z.enum(MOC_MONITOR_OUTCOMES),
  attachmentFileIds,
});
export const mocFinalReviewSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: z.array(z.object({ yes: z.boolean().nullable(), keterangan: text(2000) })).length(MOC_FINAL_QUESTIONS.length),
  followUps: z.array(trackedItem).max(40).default([]),
  reviewers: z.array(z.object({ fungsi: text(200), keterangan: text(2000), tanggapan: text(2000), tanggal: ymd })).max(20).default([]),
  notes: text(5000).default(""),
  attachmentFileIds,
});
export const mocCloseSchema = z.object({ note: z.string().trim().min(1).max(5000), evidenceFileId: z.string().uuid().optional() });
export const isBlankTracked = (r: { item: string; keterangan: string; tahapan: string; pic: string; targetDate: string; status: string }) =>
  !r.item.trim() && !r.keterangan.trim() && !r.tahapan.trim() && !r.pic.trim() && !r.targetDate && !r.status.trim();

// Lampiran tahap (gambar/PDF) yang ikut dikirim bersama catatan tahap.
export async function attachStageFiles(mocId: string, fileIds: string[], user: SessionUser, stage: string): Promise<void> {
  for (const fileId of fileIds) {
    const ok = await attachMocEvidence(mocId, "lampiran", fileId, user, undefined, stage);
    if (!ok) throw new HttpError(400, "Lampiran tidak valid atau bukan unggahan Anda.");
  }
}
