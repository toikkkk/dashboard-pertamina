"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Paperclip } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { mocApi } from "@/lib/useMoc";
import { uploadFileToR2 } from "@/lib/uploadFile";
import {
  MOC_LATER_STAGE_INFO,
  hasMocRole,
  nextRegisterStatus,
  reviewsOfCurrentRound,
  type MocAction,
  type MocPlannedReviewer,
  type MocRequest,
} from "@/lib/domain/moc";

const INPUT = "w-full min-h-[36px] px-2.5 py-1.5 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white";
const LABEL = "block text-[11.5px] font-bold text-[#0F172A] mb-1";
const BTN =
  "px-5 py-2 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13px] font-bold disabled:opacity-60 transition-colors";

// Unggah bukti tanda tangan (berkas yang sudah ditandatangani di luar web). Opsional
// sementara — lihat MOC_REQUIRE_SIGNED_EVIDENCE di domain/moc.ts.
function EvidenceInput({ onFileId, disabled }: { onFileId: (id: string | undefined) => void; disabled?: boolean }) {
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <label className={LABEL}>Bukti tanda tangan (opsional)</label>
      <label className="inline-flex items-center gap-2 px-3 py-1.5 text-[12.5px] font-semibold border border-dashed border-[#C5CED3] rounded-[8px] cursor-pointer hover:border-[#0F3B59] transition-colors">
        <Paperclip className="w-3.5 h-3.5" strokeWidth={2} />
        {busy ? "Mengunggah…" : name ?? "Pilih berkas (PDF / gambar)"}
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          disabled={disabled || busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setErr(null);
            try {
              onFileId(await uploadFileToR2(file));
              setName(file.name);
            } catch (ex) {
              setErr(ex instanceof Error ? ex.message : "Gagal mengunggah.");
              onFileId(undefined);
              setName(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {err && <p className="text-[11.5px] text-[#DC2626] mt-1">{err}</p>}
      <p className="text-[11px] text-[#6b6e72] mt-1">Cetak lembar formulir, tanda tangani di luar web, lalu unggah hasilnya di sini.</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#0F3B59] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] overflow-hidden">
      <h2 className="px-4 py-2.5 text-[12.5px] font-bold text-white bg-[#0F3B59]">{title}</h2>
      <div className="p-4 flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function EmptyPool({ role }: { role: string }) {
  return (
    <p className="text-[12px] text-[#B45309] font-semibold">
      Belum ada pengguna dengan peran {role} di lokasi ini. Minta Admin Regional menetapkannya di Kelola User → Peran MOC.
    </p>
  );
}

export default function MocActionsPanel({
  moc,
  actions,
  onNotice,
}: {
  moc: MocRequest;
  actions: MocAction[];
  onNotice: (message: string) => void;
}) {
  const { users, activeUser } = usePsi();
  // Dropdown HANYA berisi akun di lokasi MOC yang ber-peran sesuai (Reviewer/Approver/Performer).
  const inLocation = useMemo(() => users.filter((u) => u.location === moc.location), [users, moc.location]);
  const reviewerPool = useMemo(() => inLocation.filter((u) => hasMocRole(u, "Reviewer")), [inLocation]);
  const approverPool = useMemo(() => inLocation.filter((u) => hasMocRole(u, "Approver")), [inLocation]);
  const performerPool = useMemo(() => inLocation.filter((u) => hasMocRole(u, "Performer")), [inLocation]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<string | undefined>();

  // Ajukan / ajukan ulang. Urutan sumber isian: rencana yang tersimpan di server ->
  // reviewer putaran terakhir -> dua baris kosong. Jadi tidak hilang saat pindah halaman.
  const lastRoundNo = Math.max(0, ...moc.reviews.map((x) => x.round));
  const lastRound = moc.reviews.filter((r) => r.round === lastRoundNo);
  const [reviewers, setReviewers] = useState<MocPlannedReviewer[]>(() =>
    moc.plannedReviewers.length > 0
      ? moc.plannedReviewers
      : lastRound.length > 0
        ? lastRound.map((r) => ({ userId: r.reviewerUserId ?? "", functionLabel: r.functionLabel, jabatan: r.reviewerJabatan }))
        : [{ userId: "", functionLabel: "", jabatan: "" }, { userId: "", functionLabel: "", jabatan: "" }]
  );
  const [approverId, setApproverId] = useState(moc.plannedApproverId ?? moc.approverUserId ?? "");
  const dirty = useRef(false);
  const [planSaved, setPlanSaved] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!dirty.current || !actions.includes("submit")) return;
    setPlanSaved("saving");
    const t = setTimeout(async () => {
      try {
        await mocApi.savePlan(moc.id, { plannedReviewers: reviewers, plannedApproverId: approverId || null });
        setPlanSaved("saved");
      } catch {
        setPlanSaved("idle");
      }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewers, approverId]);

  const touch = () => { dirty.current = true; };
  const setRow = (i: number, patch: Partial<MocPlannedReviewer>) => {
    touch();
    setReviewers((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const pickReviewer = (i: number, userId: string) => {
    const u = reviewerPool.find((x) => x.id === userId);
    setRow(i, { userId, functionLabel: u?.mocFunction ?? reviewers[i].functionLabel });
  };

  // Review
  const [outcome, setOutcome] = useState<"Sesuai" | "Perlu Perubahan">("Sesuai");
  const [recommendation, setRecommendation] = useState("");
  // Keputusan
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");
  const [performerId, setPerformerId] = useState("");
  // Registrasi & majukan
  const [mocNumber, setMocNumber] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");
  const [confirmAdvance, setConfirmAdvance] = useState(false);

  const run = async (fn: () => Promise<MocRequest>, message: (saved: MocRequest) => string) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await fn();
      setEvidence(undefined);
      onNotice(message(saved));
    } catch (e) {
      const issues = (e as Error & { issues?: unknown }).issues;
      setError(Array.isArray(issues) && typeof issues[0] === "string" ? issues.join(" ") : e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(false);
      setConfirmAdvance(false);
    }
  };

  if (actions.length === 0) return null;
  // Review MILIK user yang sedang login (bukan sekadar yang pertama belum selesai).
  const myReview = reviewsOfCurrentRound(moc).find((r) => r.reviewerUserId === activeUser.id && r.outcome === "Pending");
  const next = nextRegisterStatus(moc.registerStatus);
  const startsImplementation = moc.registerStatus === "Inisiasi & Validasi";
  const currentLabel = startsImplementation ? "Registrasi" : moc.registerStatus;
  const canSubmit = !busy && !!approverId && reviewers.length > 0 && reviewers.every((r) => r.userId && r.functionLabel.trim());

  return (
    <div className="flex flex-col gap-4">
      {actions.includes("submit") && (
        <Card title={moc.validationState === "draft" ? "Ajukan ke Reviewer" : "Ajukan Ulang ke Reviewer"}>
          {moc.validationState === "returned" && (
            <ul className="text-[12px] text-[#3a3d40] list-disc pl-5">
              {moc.reviews.filter((r) => r.round === moc.round && r.outcome === "Perlu Perubahan").map((r) => (
                <li key={r.id}><strong>{r.functionLabel}</strong>: {r.recommendation}</li>
              ))}
            </ul>
          )}
          {moc.validationState === "rejected" && moc.approverNote && (
            <p className="text-[12px] text-[#3a3d40]"><strong>Catatan Approver:</strong> {moc.approverNote}</p>
          )}
          <div>
            <div className={LABEL}>MoC Reviewer (dinilai paralel)</div>
            {reviewerPool.length === 0 ? (
              <EmptyPool role="Reviewer" />
            ) : (
              <div className="flex flex-col gap-2">
                {reviewers.map((r, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_auto] gap-2">
                    <select className={INPUT} value={r.userId} onChange={(e) => pickReviewer(i, e.target.value)} aria-label="Reviewer">
                      <option value="">Pilih Reviewer…</option>
                      {reviewerPool.map((u) => (
                        <option key={u.id} value={u.id} disabled={reviewers.some((x, idx) => idx !== i && x.userId === u.id)}>
                          {u.name}{u.mocFunction ? ` — ${u.mocFunction}` : ""}
                        </option>
                      ))}
                    </select>
                    <input className={INPUT} placeholder="Fungsi (mis. HSSE)" value={r.functionLabel} onChange={(e) => setRow(i, { functionLabel: e.target.value })} />
                    <input className={INPUT} placeholder="Jabatan" value={r.jabatan} onChange={(e) => setRow(i, { jabatan: e.target.value })} />
                    <button type="button" aria-label="Hapus reviewer" disabled={reviewers.length === 1} onClick={() => { touch(); setReviewers(reviewers.filter((_, idx) => idx !== i)); }} className="px-2 text-[#6b6e72] hover:text-[#DC2626] disabled:opacity-30">
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => { touch(); setReviewers([...reviewers, { userId: "", functionLabel: "", jabatan: "" }]); }} className="self-start inline-flex items-center gap-1 text-[12px] font-bold text-[#0F3B59] hover:underline">
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Tambah reviewer
                </button>
              </div>
            )}
          </div>
          <div>
            <label className={LABEL}>MoC Approver</label>
            {approverPool.length === 0 ? (
              <EmptyPool role="Approver" />
            ) : (
              <select className={INPUT} value={approverId} onChange={(e) => { touch(); setApproverId(e.target.value); }} aria-label="Approver">
                <option value="">Pilih Approver…</option>
                {approverPool.map((u) => <option key={u.id} value={u.id}>{u.name}{u.mocFunction ? ` — ${u.mocFunction}` : ""}</option>)}
              </select>
            )}
          </div>
          <EvidenceInput onFileId={setEvidence} disabled={busy} />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              className={BTN}
              disabled={!canSubmit}
              onClick={() =>
                run(
                  () =>
                    mocApi.submit(moc.id, {
                      reviewers: reviewers.map((r) => ({ userId: r.userId, functionLabel: r.functionLabel.trim(), jabatan: r.jabatan.trim() })),
                      approverUserId: approverId,
                      evidenceFileId: evidence,
                    }),
                  (s) => `MOC diajukan ke ${reviewers.length} reviewer (putaran ${s.round}). Status: Menunggu review.`
                )
              }
            >
              {busy ? "Mengirim…" : "Ajukan"}
            </button>
            <span className="text-[11.5px] text-[#6b6e72]" aria-live="polite">
              {planSaved === "saving" ? "Menyimpan pilihan…" : planSaved === "saved" ? "Pilihan reviewer & approver tersimpan" : ""}
            </span>
          </div>
        </Card>
      )}

      {actions.includes("review") && (
        <Card title={`Review Anda${myReview ? ` — ${myReview.functionLabel}` : ""}`}>
          <div className="flex gap-5 flex-wrap">
            {(["Sesuai", "Perlu Perubahan"] as const).map((o) => (
              <label key={o} className="flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer">
                <input type="radio" name="outcome" checked={outcome === o} onChange={() => setOutcome(o)} />
                {o === "Sesuai" ? "Sesuai — tidak perlu perubahan" : "Perlu Perubahan"}
              </label>
            ))}
          </div>
          <div>
            <label className={LABEL}>Rekomendasi / catatan evaluasi{outcome === "Perlu Perubahan" ? " (wajib)" : ""}</label>
            <textarea className={INPUT} rows={4} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} />
          </div>
          <EvidenceInput onFileId={setEvidence} disabled={busy} />
          <div>
            <button
              type="button"
              className={BTN}
              disabled={busy || (outcome === "Perlu Perubahan" && !recommendation.trim())}
              onClick={() =>
                run(
                  () => mocApi.review(moc.id, { outcome, recommendation: recommendation.trim(), evidenceFileId: evidence }),
                  (s) =>
                    `Review Anda tercatat (${outcome}). ${
                      s.validationState === "in_review"
                        ? "Menunggu reviewer lain."
                        : s.validationState === "pending_approval"
                          ? "Semua reviewer sesuai — dilanjutkan ke Approver."
                          : "Ada perubahan yang diminta — MOC dikembalikan ke Initiator."
                    }`
                )
              }
            >
              {busy ? "Mengirim…" : "Kirim Review"}
            </button>
          </div>
        </Card>
      )}

      {actions.includes("decide") && (
        <Card title="Keputusan MoC Approver">
          <div className="flex gap-5 flex-wrap">
            {(["approve", "reject"] as const).map((d) => (
              <label key={d} className="flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer">
                <input type="radio" name="decision" checked={decision === d} onChange={() => setDecision(d)} />
                {d === "approve" ? "Setujui" : "Tolak (kembali ke Initiator)"}
              </label>
            ))}
          </div>
          {decision === "approve" && (
            <div>
              <label className={LABEL}>Tunjuk MoC Performer</label>
              {performerPool.length === 0 ? (
                <EmptyPool role="Performer" />
              ) : (
                <select className={INPUT} value={performerId} onChange={(e) => setPerformerId(e.target.value)} aria-label="Performer">
                  <option value="">Pilih Performer…</option>
                  {performerPool.map((u) => <option key={u.id} value={u.id}>{u.name}{u.mocFunction ? ` — ${u.mocFunction}` : ""}</option>)}
                </select>
              )}
            </div>
          )}
          <div>
            <label className={LABEL}>Catatan{decision === "reject" ? " (wajib — perbaikan upaya preventif/mitigasi)" : ""}</label>
            <textarea className={INPUT} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <EvidenceInput onFileId={setEvidence} disabled={busy} />
          <div>
            <button
              type="button"
              className={BTN}
              disabled={busy || (decision === "approve" ? !performerId : !note.trim())}
              onClick={() =>
                run(
                  () =>
                    mocApi.decide(moc.id, {
                      decision,
                      note: note.trim(),
                      performer: decision === "approve" ? { userId: performerId, name: performerPool.find((p) => p.id === performerId)?.name ?? "" } : undefined,
                      evidenceFileId: evidence,
                    }),
                  () => (decision === "approve" ? "MOC disetujui dan Performer ditunjuk. Menunggu registrasi MoC Controller." : "MOC ditolak dan dikembalikan ke Initiator.")
                )
              }
            >
              {busy ? "Mengirim…" : decision === "approve" ? "Setujui" : "Tolak"}
            </button>
          </div>
        </Card>
      )}

      {actions.includes("register") && (
        <Card title="Registrasi MoC Controller">
          <p className="text-[12.5px] text-[#3a3d40]">Catat MOC yang sudah disetujui ke daftar MoC dan beri Nomor MoC.</p>
          <div>
            <label className={LABEL}>Nomor MoC</label>
            <input className={INPUT} value={mocNumber} onChange={(e) => setMocNumber(e.target.value)} placeholder="Kosongkan untuk usulan otomatis (MOC-LOKASI-TAHUN-urut)" />
          </div>
          <EvidenceInput onFileId={setEvidence} disabled={busy} />
          <div>
            <button type="button" className={BTN} disabled={busy} onClick={() => run(() => mocApi.register(moc.id, { mocNumber: mocNumber.trim() || undefined, evidenceFileId: evidence }), (s) => `MOC terdaftar dengan Nomor ${s.mocNumber}. Langkah berikutnya: majukan ke tahap Implementasi.`)}>
              {busy ? "Mendaftarkan…" : "Daftarkan MOC"}
            </button>
          </div>
        </Card>
      )}

      {actions.includes("advance") && next && (
        <Card title={`Tahap saat ini: ${currentLabel} → berikutnya: ${next}`}>
          {!startsImplementation && moc.registerStatus in MOC_LATER_STAGE_INFO && (
            <p className="text-[12.5px] text-[#3a3d40]">
              <strong>Yang berlangsung di tahap {moc.registerStatus}:</strong> {MOC_LATER_STAGE_INFO[moc.registerStatus as keyof typeof MOC_LATER_STAGE_INFO]}
            </p>
          )}
          <p className="text-[12px] text-[#6b6e72]">
            Alur rinci tahap Komunikasi hingga Penutupan belum ditetapkan; tombol ini hanya menandai perpindahan tahap dan mencatat catatanmu di Riwayat. Satu klik = maju <strong>satu</strong> tahap.
          </p>
          <div>
            <label className={LABEL}>Catatan (opsional)</label>
            <textarea className={INPUT} rows={2} value={advanceNotes} onChange={(e) => setAdvanceNotes(e.target.value)} />
          </div>
          {!confirmAdvance ? (
            <div>
              <button type="button" className={BTN} disabled={busy} onClick={() => setConfirmAdvance(true)}>
                {startsImplementation ? "Mulai tahap Implementasi" : next === "Closed" ? "Tutup MOC (Closed)" : `Selesaikan ${moc.registerStatus}, lanjut ${next}`}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 flex-wrap p-3 rounded-[8px] bg-[#FEF3C7] border border-[#B45309]/30">
              <span className="text-[12.5px] font-semibold text-[#92400E]">Yakin memajukan MOC ke tahap “{next}”? Ini tercatat di Riwayat.</span>
              <button type="button" className={BTN} disabled={busy} onClick={() => run(async () => { const saved = await mocApi.advance(moc.id, { notes: advanceNotes.trim() }); setAdvanceNotes(""); return saved; }, (s) => `Tahap dimajukan ke ${s.registerStatus}.`)}>
                {busy ? "Memproses…" : "Ya, majukan"}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmAdvance(false)} className="px-3 py-2 text-[13px] font-bold text-[#0F172A] hover:underline">
                Batal
              </button>
            </div>
          )}
        </Card>
      )}

      {error && <p role="alert" className="text-[12.5px] font-semibold text-[#DC2626]">{error}</p>}
    </div>
  );
}
