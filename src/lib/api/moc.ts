// Pemuat + pemeta data MOC untuk semua route /api/moc/*. Sama tujuannya dengan
// lib/api/documents.ts: memetakan baris DB ke bentuk domain (MocRequest) yang dipakai
// klien, sehingga aturan di domain/moc.ts berjalan identik di klien dan server.
import { and, eq, inArray, desc, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { mocRequests, mocReviews, mocHistory, mocEvidence, fileRegistry, users } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/rbac";
import { HttpError } from "@/lib/api/respond";
import {
  MOC_CHANGE_CATEGORIES,
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

const fmtTs = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

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
  approverName: string | null
): MocRequest {
  return {
    id: row.id,
    mocNumber: row.mocNumber,
    location: row.location,
    createdBy: row.createdBy,
    registerStatus: row.registerStatus as MocRequest["registerStatus"],
    validationState: row.validationState as MocRequest["validationState"],
    round: row.round,
    approverUserId: row.approverUserId,
    approverName,
    performerUserId: row.performerUserId,
    performerName: row.performerName,
    approverNote: row.approverNote,
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

async function userNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const clean = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (clean.length === 0) return new Map();
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, clean));
  return new Map(rows.map((r) => [r.id, r.name]));
}

export async function loadMocItem(id: string): Promise<MocRequest | null> {
  const [row] = await db.select().from(mocRequests).where(eq(mocRequests.id, id)).limit(1);
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
  const names = await userNames([row.approverUserId]);
  const evidence: MocEvidence[] = evidenceRows.map(({ e, fileName, uploaderName }) => ({
    id: e.id,
    slot: e.slot as MocEvidenceSlot,
    reviewId: e.reviewId ?? undefined,
    fileId: e.fileId,
    fileName,
    fileUrl: `/api/files/${e.fileId}/download`,
    uploadedByName: uploaderName ?? "—",
    uploadedAt: fmtTs(e.uploadedAt),
  }));
  return toRequest(row, reviewRows.map(toReview), historyRows.map(toHistory), evidence, names.get(row.approverUserId ?? "") ?? null);
}

// Daftar Register MOC. Sengaja ringan: review terisi (dibutuhkan mocActionsFor untuk
// "menunggu tindakan saya"), tetapi riwayat & bukti kosong — ambil lewat loadMocItem.
export async function loadMocList(): Promise<MocRequest[]> {
  const rows = await db.select().from(mocRequests).orderBy(desc(mocRequests.createdAt));
  if (rows.length === 0) return [];
  const reviewRows = await db.select().from(mocReviews).where(inArray(mocReviews.mocId, rows.map((r) => r.id)));
  const names = await userNames(rows.map((r) => r.approverUserId));
  return rows.map((row) =>
    toRequest(
      row,
      reviewRows.filter((rv) => rv.mocId === row.id).map(toReview),
      [],
      [],
      names.get(row.approverUserId ?? "") ?? null
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
  reviewId?: string
): Promise<boolean> {
  const [file] = await db
    .select({ id: fileRegistry.id })
    .from(fileRegistry)
    .where(and(eq(fileRegistry.id, fileId), eq(fileRegistry.uploadStatus, "uploaded"), eq(fileRegistry.uploadedByUserId, user.id)))
    .limit(1);
  if (!file) return false;
  await db.insert(mocEvidence).values({ mocId, slot, fileId, uploadedBy: user.id, reviewId });
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
