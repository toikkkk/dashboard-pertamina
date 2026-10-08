// Jejak audit (tabel audit_log): siapa melakukan apa, kapan, dari alamat mana. Hanya menambah baris; pembacaan
// dibatasi Admin Regional (/admin/audit). PENTING: pencatatan tidak boleh pernah menggagalkan aksi aslinya —
// galat hanya ditulis ke log server. Jangan memasukkan kata sandi, token, atau isi berkas ke `detail`.
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

export interface AuditActor {
  id?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface AuditOptions {
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  location?: string | null;
  detail?: Record<string, unknown>;
}

/** Alamat klien dari header proxy (entri pertama X-Forwarded-For). */
export function clientIp(req: Request | null | undefined): string | null {
  const h = req?.headers.get("x-forwarded-for");
  return h ? h.split(",")[0].trim().slice(0, 64) : null;
}

export async function logAudit(req: Request | null, actor: AuditActor | null, action: string, opts: AuditOptions = {}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorUserId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? null,
      action,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      targetLabel: opts.targetLabel?.slice(0, 300) ?? null,
      location: opts.location ?? null,
      ipAddress: clientIp(req),
      detail: opts.detail ?? null,
    });
  } catch (err) {
    console.error("[audit] gagal mencatat", action, err instanceof Error ? err.message : err);
  }
}
