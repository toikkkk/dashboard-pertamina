"use client";

import React, { useMemo, useState } from "react";
import { Plus, X, Paperclip } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { mocApi } from "@/lib/useMoc";
import { uploadFileToR2 } from "@/lib/uploadFile";
import {
  nextRegisterStatus,
  reviewsOfCurrentRound,
  type MocAction,
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

export default function MocActionsPanel({ moc, actions }: { moc: MocRequest; actions: MocAction[] }) {
  const { users } = usePsi();
  const people = useMemo(() => users.filter((u) => u.location === moc.location), [users, moc.location]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<string | undefined>();

  // Ajukan / ajukan ulang
  const lastRound = moc.reviews.filter((r) => r.round === Math.max(0, ...moc.reviews.map((x) => x.round)));
  const [reviewers, setReviewers] = useState(() =>
    lastRound.length > 0
      ? lastRound.map((r) => ({ userId: r.reviewerUserId ?? "", functionLabel: r.functionLabel, jabatan: r.reviewerJabatan }))
      : [{ userId: "", functionLabel: "", jabatan: "" }, { userId: "", functionLabel: "", jabatan: "" }]
  );
  const [approverId, setApproverId] = useState(moc.approverUserId ?? "");
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

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setEvidence(undefined);
    } catch (e) {
      const issues = (e as Error & { issues?: unknown }).issues;
      setError(Array.isArray(issues) && typeof issues[0] === "string" ? issues.join(" ") : e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(false);
    }
  };

  if (actions.length === 0) return null;
  const myReview = reviewsOfCurrentRound(moc).find((r) => r.outcome === "Pending");
  const next = nextRegisterStatus(moc.registerStatus);
  const setRow = (i: number, patch: Partial<(typeof reviewers)[number]>) =>
    setReviewers(reviewers.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

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
            <div className="flex flex-col gap-2">
              {reviewers.map((r, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_auto] gap-2">
                  <select className={INPUT} value={r.userId} onChange={(e) => setRow(i, { userId: e.target.value })} aria-label="Reviewer">
                    <option value="">Pilih pengguna…</option>
                    {people.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <input className={INPUT} list="moc-fungsi" placeholder="Fungsi (mis. HSSE)" value={r.functionLabel} onChange={(e) => setRow(i, { functionLabel: e.target.value })} />
                  <input className={INPUT} placeholder="Jabatan" value={r.jabatan} onChange={(e) => setRow(i, { jabatan: e.target.value })} />
                  <button type="button" aria-label="Hapus reviewer" disabled={reviewers.length === 1} onClick={() => setReviewers(reviewers.filter((_, idx) => idx !== i))} className="px-2 text-[#6b6e72] hover:text-[#DC2626] disabled:opacity-30">
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
            <datalist id="moc-fungsi">
              <option value="Maintenance Service" />
              <option value="HSSE" />
              <option value="Fungsi IT" />
            </datalist>
            <button type="button" onClick={() => setReviewers([...reviewers, { userId: "", functionLabel: "", jabatan: "" }])} className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#0F3B59] hover:underline">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Tambah reviewer
            </button>
          </div>
          <div>
            <label className={LABEL}>MoC Approver</label>
            <select className={INPUT} value={approverId} onChange={(e) => setApproverId(e.target.value)} aria-label="Approver">
              <option value="">Pilih pengguna…</option>
              {people.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <EvidenceInput onFileId={setEvidence} disabled={busy} />
          <div>
            <button
              type="button"
              className={BTN}
              disabled={busy || !approverId || reviewers.some((r) => !r.userId || !r.functionLabel.trim())}
              onClick={() =>
                run(() =>
                  mocApi.submit(moc.id, {
                    reviewers: reviewers.map((r) => ({ userId: r.userId, functionLabel: r.functionLabel.trim(), jabatan: r.jabatan.trim() })),
                    approverUserId: approverId,
                    evidenceFileId: evidence,
                  })
                )
              }
            >
              {busy ? "Mengirim…" : "Ajukan"}
            </button>
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
            <button type="button" className={BTN} disabled={busy || (outcome === "Perlu Perubahan" && !recommendation.trim())} onClick={() => run(() => mocApi.review(moc.id, { outcome, recommendation: recommendation.trim(), evidenceFileId: evidence }))}>
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
              <select className={INPUT} value={performerId} onChange={(e) => setPerformerId(e.target.value)} aria-label="Performer">
                <option value="">Pilih pengguna…</option>
                {people.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
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
                run(() =>
                  mocApi.decide(moc.id, {
                    decision,
                    note: note.trim(),
                    performer: decision === "approve" ? { userId: performerId, name: people.find((p) => p.id === performerId)?.name ?? "" } : undefined,
                    evidenceFileId: evidence,
                  })
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
            <button type="button" className={BTN} disabled={busy} onClick={() => run(() => mocApi.register(moc.id, { mocNumber: mocNumber.trim() || undefined, evidenceFileId: evidence }))}>
              {busy ? "Mendaftarkan…" : "Daftarkan MOC"}
            </button>
          </div>
        </Card>
      )}

      {actions.includes("advance") && next && (
        <Card title="Majukan Tahap (sementara)">
          <p className="text-[12px] text-[#6b6e72]">
            Alur tahap Komunikasi hingga Penutupan belum ditetapkan; ini hanya penanda tahap beserta catatan.
          </p>
          <div>
            <label className={LABEL}>Catatan</label>
            <textarea className={INPUT} rows={2} value={advanceNotes} onChange={(e) => setAdvanceNotes(e.target.value)} />
          </div>
          <div>
            <button type="button" className={BTN} disabled={busy} onClick={() => run(async () => { await mocApi.advance(moc.id, { notes: advanceNotes.trim() }); setAdvanceNotes(""); })}>
              {busy ? "Memproses…" : `Majukan ke ${next}`}
            </button>
          </div>
        </Card>
      )}

      {error && <p role="alert" className="text-[12.5px] font-semibold text-[#DC2626]">{error}</p>}
    </div>
  );
}
