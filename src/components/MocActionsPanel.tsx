"use client";

import MenuSelect from "@/components/ui/MenuSelect";
import MocAuthorityInfo from "@/components/MocAuthorityInfo";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Paperclip } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { mocApi } from "@/lib/useMoc";
import { uploadFileToR2 } from "@/lib/uploadFile";
import {
  MOC_COMMUNICATION_ITEMS,
  MOC_COMMUNICATION_MEDIA,
  hasMocRole,
  mocAdvanceIssues,
  mocCommunicationIssues,
  mocImplementationPlanIssues,
  nextRegisterStatus,
  reviewsOfCurrentRound,
  type MocAction,
  type MocCommunicationInput,
  type MocImplementationPlanInput,
  type MocPlannedReviewer,
  type MocRequest,
} from "@/lib/domain/moc";

const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function CheckList<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
      {options.map((o) => (
        <label key={o} className="flex items-start gap-2 text-[12.5px] text-[#0F172A] cursor-pointer">
          <input type="checkbox" className="mt-[3px] accent-[#0F3B59]" checked={value.includes(o)} onChange={() => onChange(toggle(value, o))} />
          {o}
        </label>
      ))}
    </div>
  );
}

const INPUT = "w-full min-h-[38px] px-3 py-2 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]";
const BTN =
  "px-6 py-2.5 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13.5px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

// Kartu "Giliran Anda": satu fokus, satu tombol utama. Isian opsional disembunyikan
// (Optional) supaya layar tidak penuh.
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[14px] border border-[#C5CED3] border-l-[5px] border-l-[#B45309] shadow-[0_1px_2px_rgba(15,23,42,.05),0_4px_14px_rgba(15,23,42,.05)] p-5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#B45309]">Giliran Anda</div>
      <h2 className="font-heading text-[17px] font-bold text-[#0F172A] mt-0.5">{title}</h2>
      <div className="flex flex-col gap-4 mt-4">{children}</div>
    </section>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[13px] font-bold text-[#0F172A] mb-1.5">
        <span className="text-[#6b6e72] font-semibold">{n}.</span> {label}
      </div>
      {children}
    </div>
  );
}

function Choice({ selected, onSelect, title, tone }: { selected: boolean; onSelect: () => void; title: string; tone: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "#15803D" : tone === "warn" ? "#6D28D9" : "#DC2626";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex-1 min-w-[210px] text-left px-4 py-3.5 rounded-[10px] border-2 transition-colors"
      style={{ borderColor: selected ? color : "#C5CED3", background: selected ? `${color}12` : "#fff" }}
    >
      <div className="text-[13.5px] font-bold" style={{ color: selected ? color : "#0F172A" }}>{title}</div>
    </button>
  );
}

// Kolom catatan WAJIB: selalu tampil (tidak disembunyikan), harus diisi sebelum tombol kirim aktif.
function NoteField({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <div className="text-[13px] font-bold text-[#0F172A] mb-1.5">{label} <span className="text-[#DC2626]">*</span></div>
      <textarea className={INPUT} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-required="true" />
    </div>
  );
}

function Optional({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-[12.5px] font-semibold text-[#0F3B59] hover:underline list-none [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">＋ {label}</span>
        <span className="hidden group-open:inline">− {label}</span>
      </summary>
      <div className="mt-2.5">{children}</div>
    </details>
  );
}

// Unggah bukti tanda tangan (berkas yang sudah ditandatangani di luar web).
function EvidenceInput({ onFileId, disabled }: { onFileId: (id: string | undefined) => void; disabled?: boolean }) {
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <label className="inline-flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold border border-dashed border-[#C5CED3] rounded-[8px] cursor-pointer hover:border-[#0F3B59] transition-colors">
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
    </div>
  );
}

// Catatan tahap yang sudah tersimpan tidak lagi "giliran Anda" — cukup bisa dibuka untuk diubah.
function EditRecorded({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[14px] border border-[#C5CED3] px-5 py-3.5">
      <Optional label={label}><div className="flex flex-col gap-4">{children}</div></Optional>
    </section>
  );
}

function EmptyPool({ role }: { role: string }) {
  return (
    <p className="text-[12.5px] text-[#B45309] font-semibold">
      Belum ada pengguna ber-peran {role} di lokasi ini. Minta Admin Regional menetapkannya di Kelola User → Peran MOC.
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

  // Ajukan / ajukan ulang. Sumber isian: rencana tersimpan di server -> reviewer putaran
  // terakhir -> dua baris kosong. Jadi pilihan tidak hilang saat pindah halaman.
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
  // Fungsi otomatis dari peran akun (diatur Admin); tidak perlu diketik lagi.
  const pickReviewer = (i: number, userId: string) => {
    const u = reviewerPool.find((x) => x.id === userId);
    setRow(i, { userId, functionLabel: u?.mocFunction ?? "Reviewer" });
  };

  const [outcome, setOutcome] = useState<"Sesuai" | "Perlu Perubahan">("Sesuai");
  const [recommendation, setRecommendation] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");
  const [performerId, setPerformerId] = useState("");
  const [mocNumber, setMocNumber] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");
  const [confirmAdvance, setConfirmAdvance] = useState(false);

  // Komunikasi & Rencana Implementasi: diisi awal dari catatan tersimpan (bisa diubah sampai Implementasi dimulai).
  const [comm, setComm] = useState<MocCommunicationInput>(() => {
    const c = moc.communication;
    return c
      ? { items: c.items, media: c.media, mediaOther: c.mediaOther, date: c.date, audience: c.audience, notes: c.notes }
      : { items: [], media: [], mediaOther: "", date: "", audience: "", notes: "" };
  });
  const [plan, setPlan] = useState<MocImplementationPlanInput>(() => {
    const p = moc.implementationPlan;
    return p
      ? { technicalPlan: p.technicalPlan, monitoringPlan: p.monitoringPlan, milestones: p.milestones, documentationPlan: p.documentationPlan }
      : { technicalPlan: "", monitoringPlan: "", milestones: [{ label: "", targetDate: "" }], documentationPlan: "" };
  });
  const [stageFile, setStageFile] = useState<string | undefined>();
  const setMilestone = (i: number, patch: Partial<MocImplementationPlanInput["milestones"][number]>) =>
    setPlan((p) => ({ ...p, milestones: p.milestones.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));

  const run = async (fn: () => Promise<MocRequest>, message: (saved: MocRequest) => string) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await fn();
      setEvidence(undefined);
      setStageFile(undefined);
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
  const canSubmit = !busy && !!approverId && reviewers.length > 0 && reviewers.every((r) => r.userId && r.functionLabel.trim());
  const reviseNotes = moc.reviews.filter((r) => r.round === moc.round && r.outcome === "Perlu Perubahan");
  const commIssues = mocCommunicationIssues(comm);
  const planIssues = mocImplementationPlanIssues({ ...plan, milestones: plan.milestones.filter((m) => m.label.trim() || m.targetDate) });
  const advanceIssues = mocAdvanceIssues(moc);
  const attachments = stageFile ? [stageFile] : [];

  const commForm = (
    <>
      <Step n={1} label="Apa yang dikomunikasikan?">
        <CheckList options={MOC_COMMUNICATION_ITEMS} value={comm.items} onChange={(items) => setComm({ ...comm, items })} />
      </Step>
      <Step n={2} label="Lewat media apa?">
        <CheckList options={MOC_COMMUNICATION_MEDIA} value={comm.media} onChange={(media) => setComm({ ...comm, media })} />
        {comm.media.includes("Lainnya") && (
          <input className={`${INPUT} mt-2`} value={comm.mediaOther} onChange={(e) => setComm({ ...comm, mediaOther: e.target.value })} placeholder="Sebutkan media lainnya…" />
        )}
      </Step>
      <Step n={3} label="Kapan?">
        <input type="date" className={`${INPUT} max-w-[220px]`} value={comm.date} onChange={(e) => setComm({ ...comm, date: e.target.value })} />
      </Step>
      <NoteField label="Kepada pekerja / kontraktor mana?" value={comm.audience} onChange={(audience) => setComm({ ...comm, audience })} placeholder="Mis. operator shift A-D, tim maintenance, kontraktor PT …" rows={2} />
      <Optional label="Catatan tambahan (opsional)">
        <textarea className={INPUT} rows={2} value={comm.notes} onChange={(e) => setComm({ ...comm, notes: e.target.value })} />
      </Optional>
      <Optional label="Lampirkan bukti komunikasi, mis. notulen / daftar hadir (opsional)"><EvidenceInput onFileId={setStageFile} disabled={busy} /></Optional>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          className={BTN}
          disabled={busy || commIssues.length > 0}
          onClick={() => run(() => mocApi.communicate(moc.id, { ...comm, attachmentFileIds: attachments }), () => "Komunikasi tercatat. Langkah berikutnya: rencana implementasi.")}
        >
          {busy ? "Menyimpan…" : moc.communication ? "Simpan perubahan" : "Simpan catatan komunikasi"}
        </button>
        {commIssues.length > 0 && !busy && <span className="text-[11.5px] text-[#6b6e72]">{commIssues[0]}</span>}
      </div>
    </>
  );

  const planForm = (
    <>
      <NoteField label="Rencana teknis pekerjaan" value={plan.technicalPlan} onChange={(technicalPlan) => setPlan({ ...plan, technicalPlan })} placeholder="Lingkup pekerjaan, metode kerja, persyaratan MoC Performer…" />
      <NoteField label="Rencana pemantauan & pengukuran kinerja" value={plan.monitoringPlan} onChange={(monitoringPlan) => setPlan({ ...plan, monitoringPlan })} placeholder="Apa yang dipantau, seberapa sering, oleh siapa…" />
      <Step n={1} label="Milestone / jadwal">
        <div className="flex flex-col gap-2">
          {plan.milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={INPUT} value={m.label} onChange={(e) => setMilestone(i, { label: e.target.value })} placeholder="Mis. Pre-Start-Up Safety Review selesai" aria-label="Milestone" />
              <input type="date" className={`${INPUT} max-w-[170px]`} value={m.targetDate} onChange={(e) => setMilestone(i, { targetDate: e.target.value })} aria-label="Tanggal target" />
              <button type="button" aria-label="Hapus milestone" disabled={plan.milestones.length === 1} onClick={() => setPlan({ ...plan, milestones: plan.milestones.filter((_, idx) => idx !== i) })} className="p-2 text-[#6b6e72] hover:text-[#DC2626] disabled:opacity-30">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          ))}
          {plan.milestones.length < 20 && (
            <button type="button" onClick={() => setPlan({ ...plan, milestones: [...plan.milestones, { label: "", targetDate: "" }] })} className="self-start inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#0F3B59] hover:underline">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Tambah milestone
            </button>
          )}
        </div>
      </Step>
      <Optional label="Rencana dokumentasi / rekaman (opsional)">
        <textarea className={INPUT} rows={2} value={plan.documentationPlan} onChange={(e) => setPlan({ ...plan, documentationPlan: e.target.value })} placeholder="Dokumen/rekaman yang perlu dimutakhirkan: HIRADC, P&ID, drawing, job description…" />
      </Optional>
      <Optional label="Lampirkan dokumen rencana (opsional)"><EvidenceInput onFileId={setStageFile} disabled={busy} /></Optional>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          className={BTN}
          disabled={busy || planIssues.length > 0}
          onClick={() => run(() => mocApi.planImplementation(moc.id, { ...plan, attachmentFileIds: attachments }), () => "Rencana implementasi tercatat.")}
        >
          {busy ? "Menyimpan…" : moc.implementationPlan ? "Simpan perubahan" : "Simpan rencana implementasi"}
        </button>
        {planIssues.length > 0 && !busy && <span className="text-[11.5px] text-[#6b6e72]">{planIssues[0]}</span>}
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {actions.includes("submit") && (
        <Panel
          title={moc.validationState === "draft" ? "Ajukan MOC untuk direview" : "Ajukan ulang setelah perbaikan"}
        >
          {(reviseNotes.length > 0 || (moc.validationState === "rejected" && moc.approverNote)) && (
            <div className="rounded-[10px] bg-[#FEF3C7] border border-[#B45309]/30 px-4 py-3">
              <div className="text-[12px] font-bold text-[#92400E] mb-1">Yang perlu diperbaiki</div>
              <ul className="text-[12.5px] text-[#3a3d40] list-disc pl-4 flex flex-col gap-0.5">
                {reviseNotes.map((r) => <li key={r.id}><strong>{r.functionLabel}:</strong> {r.recommendation}</li>)}
                {moc.validationState === "rejected" && moc.approverNote && <li><strong>Approver:</strong> {moc.approverNote}</li>}
              </ul>
            </div>
          )}

          <Step n={1} label="Siapa yang mereview? (dinilai bersamaan)">
            <MocAuthorityInfo />
            {reviewerPool.length === 0 ? (
              <EmptyPool role="Reviewer" />
            ) : (
              <div className="flex flex-col gap-2">
                {reviewers.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <MenuSelect
                      ariaLabel="Reviewer"
                      fullWidth
                      minWidth={200}
                      value={r.userId}
                      options={[{ value: "", label: "Pilih reviewer…" }, ...reviewerPool.map((u) => ({ value: u.id, label: `${u.name}${u.mocFunction ? ` — ${u.mocFunction}` : ""}`, disabled: reviewers.some((x, idx) => idx !== i && x.userId === u.id) }))]}
                      onChange={(v) => pickReviewer(i, v)}
                    />
                    <button type="button" aria-label="Hapus reviewer" disabled={reviewers.length === 1} onClick={() => { touch(); setReviewers(reviewers.filter((_, idx) => idx !== i)); }} className="p-2 text-[#6b6e72] hover:text-[#DC2626] disabled:opacity-30">
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => { touch(); setReviewers([...reviewers, { userId: "", functionLabel: "", jabatan: "" }]); }} className="self-start inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#0F3B59] hover:underline">
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Tambah reviewer
                </button>
              </div>
            )}
          </Step>

          <Step n={2} label="Siapa yang menyetujui?">
            {approverPool.length === 0 ? (
              <EmptyPool role="Approver" />
            ) : (
              <MenuSelect
                ariaLabel="Approver"
                fullWidth
                minWidth={200}
                value={approverId}
                options={[{ value: "", label: "Pilih approver…" }, ...approverPool.map((u) => ({ value: u.id, label: `${u.name}${u.mocFunction ? ` — ${u.mocFunction}` : ""}` }))]}
                onChange={(v) => { touch(); setApproverId(v); }}
              />
            )}
          </Step>

          <Optional label="Lampirkan bukti tanda tangan (opsional)"><EvidenceInput onFileId={setEvidence} disabled={busy} /></Optional>

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
                  (s) => `MOC diajukan ke ${reviewers.length} reviewer (putaran ${s.round}). Sekarang menunggu review.`
                )
              }
            >
              {busy ? "Mengirim…" : "Ajukan"}
            </button>
            <span className="text-[11.5px] text-[#6b6e72]" aria-live="polite">
              {planSaved === "saving" ? "Menyimpan pilihan…" : planSaved === "saved" ? "Pilihan tersimpan otomatis" : !canSubmit && !busy ? "Lengkapi pilihan di atas untuk mengajukan." : ""}
            </span>
          </div>
        </Panel>
      )}

      {actions.includes("review") && (
        <Panel title={`Review MOC ini${myReview ? ` sebagai ${myReview.functionLabel}` : ""}`}>
          <div role="radiogroup" aria-label="Hasil review" className="flex gap-2.5 flex-wrap">
            <Choice selected={outcome === "Sesuai"} onSelect={() => setOutcome("Sesuai")} tone="good" title="Sesuai" />
            <Choice selected={outcome === "Perlu Perubahan"} onSelect={() => setOutcome("Perlu Perubahan")} tone="warn" title="Perlu perubahan" />
          </div>
          <NoteField
            label={outcome === "Perlu Perubahan" ? "Apa yang perlu diperbaiki?" : "Catatan review"}
            value={recommendation}
            onChange={setRecommendation}
            placeholder={outcome === "Perlu Perubahan" ? "Tuliskan catatan untuk Initiator…" : "Tuliskan hasil evaluasi Anda…"}
          />
          <Optional label="Lampirkan bukti tanda tangan (opsional)"><EvidenceInput onFileId={setEvidence} disabled={busy} /></Optional>
          <div>
            <button
              type="button"
              className={BTN}
              disabled={busy || !recommendation.trim()}
              onClick={() =>
                run(
                  () => mocApi.review(moc.id, { outcome, recommendation: recommendation.trim(), evidenceFileId: evidence }),
                  (s) =>
                    `Review Anda tercatat (${outcome}). ${
                      s.validationState === "in_review"
                        ? "Menunggu reviewer lain."
                        : s.validationState === "pending_approval"
                          ? "Semua reviewer sesuai — dilanjutkan ke Approver."
                          : "MOC dikembalikan ke Initiator untuk diperbaiki."
                    }`
                )
              }
            >
              {busy ? "Mengirim…" : "Kirim review"}
            </button>
          </div>
        </Panel>
      )}

      {actions.includes("decide") && (
        <Panel title="Setujui atau tolak MOC ini">
          <div role="radiogroup" aria-label="Keputusan" className="flex gap-2.5 flex-wrap">
            <Choice selected={decision === "approve"} onSelect={() => setDecision("approve")} tone="good" title="Setujui" />
            <Choice selected={decision === "reject"} onSelect={() => setDecision("reject")} tone="bad" title="Tolak" />
          </div>
          {decision === "approve" && (
            <Step n={1} label="Siapa MoC Performer-nya?">
              {performerPool.length === 0 ? (
                <EmptyPool role="Performer" />
              ) : (
                <MenuSelect
                  ariaLabel="Performer"
                  fullWidth
                  minWidth={200}
                  value={performerId}
                  options={[{ value: "", label: "Pilih performer…" }, ...performerPool.map((u) => ({ value: u.id, label: `${u.name}${u.mocFunction ? ` — ${u.mocFunction}` : ""}` }))]}
                  onChange={setPerformerId}
                />
              )}
            </Step>
          )}
          <NoteField
            label={decision === "approve" ? "Catatan persetujuan" : "Alasan penolakan / yang perlu diperbaiki"}
            value={note}
            onChange={setNote}
            placeholder={decision === "approve" ? "Tuliskan catatan persetujuan…" : "Tuliskan catatan untuk Initiator…"}
          />
          <Optional label="Lampirkan bukti tanda tangan (opsional)"><EvidenceInput onFileId={setEvidence} disabled={busy} /></Optional>
          <div>
            <button
              type="button"
              className={BTN}
              disabled={busy || !note.trim() || (decision === "approve" && !performerId)}
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
              {busy ? "Mengirim…" : decision === "approve" ? "Setujui MOC" : "Tolak MOC"}
            </button>
          </div>
        </Panel>
      )}

      {actions.includes("register") && (
        <Panel title="Daftarkan MOC ke Register">
          <Optional label="Ubah Nomor MoC (opsional)">
            <input className={INPUT} value={mocNumber} onChange={(e) => setMocNumber(e.target.value)} placeholder="Kosongkan untuk nomor otomatis (MOC-LOKASI-TAHUN-urut)" />
          </Optional>
          <Optional label="Lampirkan bukti tanda tangan (opsional)"><EvidenceInput onFileId={setEvidence} disabled={busy} /></Optional>
          <div>
            <button type="button" className={BTN} disabled={busy} onClick={() => run(() => mocApi.register(moc.id, { mocNumber: mocNumber.trim() || undefined, evidenceFileId: evidence }), (s) => `MOC terdaftar dengan Nomor ${s.mocNumber}.`)}>
              {busy ? "Mendaftarkan…" : "Daftarkan MOC"}
            </button>
          </div>
        </Panel>
      )}

      {actions.includes("communicate") &&
        (moc.communication ? (
          <EditRecorded label={`Ubah catatan Komunikasi (dicatat ${moc.communication.recordedByName})`}>{commForm}</EditRecorded>
        ) : (
          <Panel title="Catat Komunikasi MOC">{commForm}</Panel>
        ))}

      {actions.includes("planImplementation") &&
        (moc.implementationPlan ? (
          <EditRecorded label={`Ubah Rencana Implementasi (dicatat ${moc.implementationPlan.recordedByName})`}>{planForm}</EditRecorded>
        ) : (
          <Panel title={`Susun Rencana Implementasi untuk ${moc.performerName ?? "MoC Performer"}`}>{planForm}</Panel>
        ))}

      {actions.includes("advance") && next && (
        <Panel
          title={startsImplementation ? "Serahkan ke Performer & mulai Implementasi" : next === "Closed" ? "Tutup MOC" : `Lanjutkan ke tahap ${next}`}
        >
          {startsImplementation && (
            <ul className="flex flex-col gap-1 text-[12.5px]">
              {[
                { ok: !!moc.communication, label: "Komunikasi dicatat" },
                { ok: !!moc.implementationPlan, label: "Rencana implementasi dicatat" },
                { ok: !!moc.performerName, label: `MoC Performer ditunjuk${moc.performerName ? `: ${moc.performerName}` : ""}` },
              ].map((r) => (
                <li key={r.label} className="font-semibold" style={{ color: r.ok ? "#15803D" : "#6b6e72" }}>
                  {r.ok ? "✓" : "○"} {r.label}
                </li>
              ))}
            </ul>
          )}
          <NoteField label={startsImplementation ? "Catatan serah terima" : "Catatan"} value={advanceNotes} onChange={setAdvanceNotes} placeholder="Tuliskan catatan untuk tahap ini…" rows={2} />
          {!confirmAdvance ? (
            <div>
              <button type="button" className={BTN} disabled={busy || !advanceNotes.trim() || advanceIssues.length > 0} onClick={() => setConfirmAdvance(true)}>
                {startsImplementation ? "Mulai Implementasi" : next === "Closed" ? "Tutup MOC" : `Lanjut ke ${next}`}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap p-3.5 rounded-[10px] bg-[#FEF3C7] border border-[#B45309]/30">
              <span className="text-[13px] font-semibold text-[#92400E]">Majukan MOC ke tahap “{next}”? Ini tercatat di Riwayat.</span>
              <button type="button" className={BTN} disabled={busy} onClick={() => run(async () => { const saved = await mocApi.advance(moc.id, { notes: advanceNotes.trim() }); setAdvanceNotes(""); return saved; }, (s) => `Tahap dimajukan ke ${s.registerStatus}.`)}>
                {busy ? "Memproses…" : "Ya, majukan"}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmAdvance(false)} className="px-3 py-2 text-[13px] font-bold text-[#0F172A] hover:underline">
                Batal
              </button>
            </div>
          )}
        </Panel>
      )}

      {error && <p role="alert" className="text-[13px] font-semibold text-[#DC2626]">{error}</p>}
    </div>
  );
}
