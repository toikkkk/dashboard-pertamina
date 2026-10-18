"use client";

import MenuSelect from "@/components/ui/MenuSelect";
import { kboForMoc } from "@/lib/domain/kbo";
import MocAuthorityInfo from "@/components/MocAuthorityInfo";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Paperclip } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { mocApi } from "@/lib/useMoc";
import { uploadFileToR2 } from "@/lib/uploadFile";
import {
  MOC_COMMUNICATION_ITEMS,
  MOC_COMMUNICATION_MEDIA,
  MOC_FINAL_QUESTIONS,
  MOC_MONITOR_OUTCOMES,
  MOC_MONITOR_OUTCOME_LABEL,
  hasMocRole,
  mocExtensionsUsed,
  mocFinalReviewIssues,
  mocMonitoringDue,
  mocMonitoringIssues,
  wibYmd,
  type MocFinalReviewInput,
  type MocMonitoringInput,
  type MocTrackedItem,
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
        ? lastRound.map((r) => (r.reviewerUserId ? { userId: r.reviewerUserId, functionLabel: r.functionLabel, jabatan: r.reviewerJabatan } : { userId: "", manual: true, name: r.reviewerName, functionLabel: r.functionLabel, jabatan: r.reviewerJabatan }))
        : [{ userId: "", functionLabel: "", jabatan: "" }, { userId: "", functionLabel: "", jabatan: "" }]
  );
  const [approverId, setApproverId] = useState(moc.plannedApproverId ?? moc.approverUserId ?? "");
  // Approver tanpa akun: nama dan jabatan diketik manual (keputusannya dicatat Controller atas namanya).
  const [approverMode, setApproverMode] = useState<"akun" | "manual">(!moc.plannedApproverId && !moc.approverUserId && moc.approverManualName ? "manual" : "akun");
  const [approverManual, setApproverManual] = useState({ name: moc.approverManualName ?? "", jabatan: moc.approverManualJabatan ?? "" });
  const dirty = useRef(false);
  const [planSaved, setPlanSaved] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!dirty.current || !actions.includes("submit")) return;
    setPlanSaved("saving");
    const t = setTimeout(async () => {
      try {
        await mocApi.savePlan(moc.id, {
          plannedReviewers: reviewers,
          plannedApproverId: approverMode === "akun" ? approverId || null : null,
          approverManualName: approverMode === "manual" ? approverManual.name.trim() || null : null,
          approverManualJabatan: approverMode === "manual" ? approverManual.jabatan.trim() || null : null,
        });
        setPlanSaved("saved");
      } catch {
        setPlanSaved("idle");
      }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewers, approverId, approverMode, approverManual]);

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
  const [performerManual, setPerformerManual] = useState("");
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
  const canSubmit =
    !busy &&
    (approverMode === "akun" ? !!approverId : !!approverManual.name.trim()) &&
    reviewers.length > 0 &&
    reviewers.every((r) => (r.manual ? !!r.name?.trim() : !!r.userId) && r.functionLabel.trim());
  const proxyReviews = reviewsOfCurrentRound(moc).filter((r) => !r.reviewerUserId && r.outcome === "Pending");
  const performerReady = performerId === "__manual" ? !!performerManual.trim() : !!performerId;
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
            <div className="flex flex-col gap-2">
              {reviewerPool.length === 0 && <EmptyPool role="Reviewer" />}
              {reviewers.map((r, i) => (
                <div key={i} className="flex flex-col gap-1.5 rounded-[10px] border border-[#EEF2F4] bg-white p-2">
                  <div className="flex items-center gap-2">
                    {r.manual ? (
                      <input className={INPUT} placeholder="Nama reviewer (tanpa akun)" maxLength={200} value={r.name ?? ""} onChange={(e) => setRow(i, { name: e.target.value })} />
                    ) : (
                      <MenuSelect
                        ariaLabel="Reviewer"
                        fullWidth
                        minWidth={200}
                        value={r.userId}
                        options={[{ value: "", label: "Pilih reviewer…" }, ...reviewerPool.map((u) => ({ value: u.id, label: `${u.name}${u.mocFunction ? ` — ${u.mocFunction}` : ""}`, disabled: reviewers.some((x, idx) => idx !== i && x.userId === u.id) }))]}
                        onChange={(v) => pickReviewer(i, v)}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setRow(i, r.manual ? { manual: false, name: "", userId: "", functionLabel: "", jabatan: "" } : { manual: true, userId: "", name: "", functionLabel: "", jabatan: "" })}
                      className="whitespace-nowrap text-[12px] font-semibold text-[#0F3B59] hover:underline"
                    >
                      {r.manual ? "Pilih akun" : "Isi manual"}
                    </button>
                    <button type="button" aria-label="Hapus reviewer" disabled={reviewers.length === 1} onClick={() => { touch(); setReviewers(reviewers.filter((_, idx) => idx !== i)); }} className="p-2 text-[#6b6e72] hover:text-[#DC2626] disabled:opacity-30">
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                  {r.manual && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input className={INPUT} placeholder="Fungsi (mis. Maintenance Service)" maxLength={100} value={r.functionLabel} onChange={(e) => setRow(i, { functionLabel: e.target.value })} />
                      <input className={INPUT} placeholder="Jabatan (opsional)" maxLength={200} value={r.jabatan} onChange={(e) => setRow(i, { jabatan: e.target.value })} />
                    </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => { touch(); setReviewers([...reviewers, { userId: "", functionLabel: "", jabatan: "" }]); }} className="self-start inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#0F3B59] hover:underline">
                <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Tambah reviewer
              </button>
            </div>
          </Step>

          <Step n={2} label="Siapa yang menyetujui?">
            <div className="flex flex-col gap-2">
              {approverMode === "akun" ? (
                approverPool.length === 0 ? (
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
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input className={INPUT} placeholder="Nama approver (tanpa akun)" maxLength={200} value={approverManual.name} onChange={(e) => { touch(); setApproverManual({ ...approverManual, name: e.target.value }); }} />
                  <input className={INPUT} placeholder="Jabatan" maxLength={200} value={approverManual.jabatan} onChange={(e) => { touch(); setApproverManual({ ...approverManual, jabatan: e.target.value }); }} />
                </div>
              )}
              <button type="button" onClick={() => { touch(); setApproverMode(approverMode === "akun" ? "manual" : "akun"); }} className="self-start text-[12.5px] font-semibold text-[#0F3B59] hover:underline">
                {approverMode === "akun" ? "Tidak ada di daftar? Isi nama manual" : "Pilih dari akun terdaftar"}
              </button>
            </div>
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
                      reviewers: reviewers.map((r) =>
                        r.manual
                          ? { manual: true, name: (r.name ?? "").trim(), functionLabel: r.functionLabel.trim(), jabatan: r.jabatan.trim() }
                          : { userId: r.userId, functionLabel: r.functionLabel.trim(), jabatan: r.jabatan.trim() }
                      ),
                      ...(approverMode === "akun"
                        ? { approverUserId: approverId }
                        : { approverManual: { name: approverManual.name.trim(), jabatan: approverManual.jabatan.trim() } }),
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

      {actions.includes("reviewProxy") && (
        <Panel title="Catat review atas nama reviewer tanpa akun">
          <div className="flex flex-col gap-3">
            {proxyReviews.map((r) => (
              <ProxyReviewCard
                key={r.id}
                review={r}
                busy={busy}
                onSend={(body) =>
                  run(
                    () => mocApi.review(moc.id, { ...body, reviewId: r.id }),
                    (saved) => `Review ${r.reviewerName} tercatat atas nama reviewer (${body.outcome}). ${saved.validationState === "in_review" ? "Menunggu reviewer lain." : saved.validationState === "pending_approval" ? "Semua reviewer sesuai, dilanjutkan ke Approver." : "MOC dikembalikan ke Initiator untuk diperbaiki."}`
                  )
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {actions.includes("editParties") && (
        <PartiesEditor
          moc={moc}
          busy={busy}
          onSave={(body) => run(() => mocApi.updateParties(moc.id, body), () => "Nama pihak tanpa akun diperbarui.")}
        />
      )}

      {(actions.includes("decide") || actions.includes("decideProxy")) && (
        <Panel title={actions.includes("decideProxy") ? `Catat keputusan atas nama ${moc.approverManualName ?? "Approver"}` : "Setujui atau tolak MOC ini"}>
          <div role="radiogroup" aria-label="Keputusan" className="flex gap-2.5 flex-wrap">
            <Choice selected={decision === "approve"} onSelect={() => setDecision("approve")} tone="good" title="Setujui" />
            <Choice selected={decision === "reject"} onSelect={() => setDecision("reject")} tone="bad" title="Tolak" />
          </div>
          {decision === "approve" && (
            <Step n={1} label="Siapa MoC Performer-nya?">
              <div className="flex flex-col gap-2">
                <MenuSelect
                  ariaLabel="Performer"
                  fullWidth
                  minWidth={200}
                  value={performerId}
                  options={[{ value: "", label: "Pilih performer…" }, ...performerPool.map((u) => ({ value: u.id, label: `${u.name}${u.mocFunction ? ` — ${u.mocFunction}` : ""}` })), { value: "__manual", label: "Isi nama manual (tanpa akun)" }]}
                  onChange={setPerformerId}
                />
                {performerId === "__manual" && (
                  <input className={INPUT} placeholder="Nama MoC Performer" maxLength={200} value={performerManual} onChange={(e) => setPerformerManual(e.target.value)} />
                )}
              </div>
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
              disabled={busy || !note.trim() || (decision === "approve" && !performerReady)}
              onClick={() =>
                run(
                  () =>
                    mocApi.decide(moc.id, {
                      decision,
                      note: note.trim(),
                      performer: decision === "approve" ? (performerId === "__manual" ? { name: performerManual.trim() } : { userId: performerId, name: performerPool.find((p) => p.id === performerId)?.name ?? "" }) : undefined,
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
          <div className="text-[12.5px] text-[#3a3d40]">
            Nomor MoC dibuat otomatis:{" "}
            <span className="font-mono font-semibold">
              {kboForMoc(moc.location, moc.fungsi) ? `NNN/MOC/${kboForMoc(moc.location, moc.fungsi)}/bulan/tahun pengajuan` : "KBO belum ditetapkan"}
            </span>
          </div>
          <Optional label="Lampirkan bukti tanda tangan (opsional)"><EvidenceInput onFileId={setEvidence} disabled={busy} /></Optional>
          <div>
            <button type="button" className={BTN} disabled={busy} onClick={() => run(() => mocApi.register(moc.id, { evidenceFileId: evidence }), (s) => `MOC terdaftar dengan Nomor ${s.mocNumber}.`)}>
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

      {actions.includes("monitor") && <MonitorPanel moc={moc} busy={busy} run={run} />}
      {actions.includes("finalReview") &&
        (moc.finalReview ? (
          <EditRecorded label={`Ubah Tinjauan Akhir (dicatat ${moc.finalReview.recordedByName})`}>
            <FinalReviewForm moc={moc} busy={busy} run={run} />
          </EditRecorded>
        ) : (
          <Panel title="Catat Tinjauan Akhir (Lampiran 7)">
            <FinalReviewForm moc={moc} busy={busy} run={run} />
          </Panel>
        ))}
      {(actions.includes("close") || actions.includes("closeProxy")) && (
        <ClosePanel moc={moc} proxy={!actions.includes("close")} busy={busy} run={run} onEvidence={setEvidence} evidence={evidence} />
      )}

      {error && <p role="alert" className="text-[13px] font-semibold text-[#DC2626]">{error}</p>}
    </div>
  );
}

type RunFn = (fn: () => Promise<MocRequest>, message: (saved: MocRequest) => string) => Promise<void>;
const blankItem = (): MocTrackedItem => ({ item: "", keterangan: "", tahapan: "", pic: "", targetDate: "", status: "" });
const nonBlank = (r: MocTrackedItem) => r.item.trim() || r.keterangan.trim() || r.tahapan.trim() || r.pic.trim() || r.targetDate || r.status.trim();

// Tabel Kegiatan / Keterangan / Tahapan / PIC / Target Date / Status (Lampiran 6 dan 7).
function TrackedRows({ rows, onChange, itemLabel }: { rows: MocTrackedItem[]; onChange: (rows: MocTrackedItem[]) => void; itemLabel: string }) {
  const set = (i: number, patch: Partial<MocTrackedItem>) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div key={i} className="rounded-[10px] border border-[#C5CED3] p-3 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <input className={INPUT} value={r.item} onChange={(e) => set(i, { item: e.target.value })} placeholder={itemLabel} aria-label={itemLabel} />
            <button type="button" aria-label="Hapus baris" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="p-2 text-[#6b6e72] hover:text-[#DC2626]">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className={INPUT} value={r.keterangan} onChange={(e) => set(i, { keterangan: e.target.value })} placeholder="Keterangan" aria-label="Keterangan" />
            <input className={INPUT} value={r.tahapan} onChange={(e) => set(i, { tahapan: e.target.value })} placeholder="Tahapan" aria-label="Tahapan" />
            <input className={INPUT} value={r.pic} onChange={(e) => set(i, { pic: e.target.value })} placeholder="PIC" aria-label="PIC" />
            <input type="date" className={INPUT} value={r.targetDate} onChange={(e) => set(i, { targetDate: e.target.value })} aria-label="Target date" />
            <input className={`${INPUT} sm:col-span-2`} value={r.status} onChange={(e) => set(i, { status: e.target.value })} placeholder="Status (mis. Selesai, Berjalan, Belum mulai)" aria-label="Status" />
          </div>
        </div>
      ))}
      {rows.length < 40 && (
        <button type="button" onClick={() => onChange([...rows, blankItem()])} className="self-start inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#0F3B59] hover:underline">
          <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Tambah baris
        </button>
      )}
    </div>
  );
}

// Tahap F: Formulir Pemantauan (Lampiran 6). Satu pemantauan per simpan; hasilnya menentukan langkah berikutnya.
function MonitorPanel({ moc, busy, run }: { moc: MocRequest; busy: boolean; run: RunFn }) {
  const today = wibYmd(Date.now());
  const [form, setForm] = useState<MocMonitoringInput>({ date: today, activities: [blankItem()], followUps: [], notes: "", outcome: "Lanjut" });
  const [file, setFile] = useState<string | undefined>();
  const extUsed = mocExtensionsUsed(moc);
  const clean = { ...form, activities: form.activities.filter(nonBlank), followUps: form.followUps.filter(nonBlank) };
  const issues = mocMonitoringIssues(clean, extUsed, today);
  const due = mocMonitoringDue(moc);
  const no = moc.monitoring.length + 1;
  return (
    <Panel title={`Catat Pemantauan ke-${no} (Lampiran 6)`}>
      {due && <p className="text-[12.5px] text-[#3a3d40]">Pemantauan berikutnya paling lambat <span className="font-semibold">{due}</span> (minimal sekali per 3 bulan).</p>}
      <Step n={1} label="Tanggal pemantauan">
        <input type="date" className={`${INPUT} max-w-[220px]`} value={form.date} max={today} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Step>
      <Step n={2} label="Kegiatan yang dipantau">
        <TrackedRows rows={form.activities} onChange={(activities) => setForm({ ...form, activities })} itemLabel="Kegiatan" />
      </Step>
      <Step n={3} label="Aksi tindak lanjut (bila ada)">
        <TrackedRows rows={form.followUps} onChange={(followUps) => setForm({ ...form, followUps })} itemLabel="Deskripsi aksi tindak lanjut" />
      </Step>
      <Step n={4} label="Hasil pemantauan ini">
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {MOC_MONITOR_OUTCOMES.map((o) => (
            <Choice key={o} selected={form.outcome === o} onSelect={() => setForm({ ...form, outcome: o })} title={MOC_MONITOR_OUTCOME_LABEL[o]} tone={o === "Tutup" ? "good" : "warn"} />
          ))}
        </div>
        {form.outcome === "Perpanjang" && moc.sifatPerubahan === "Sementara" && moc.validUntil && (
          <p className="text-[11.5px] text-[#6b6e72] mt-1.5">Masa berlaku MOC sementara ini (sampai {moc.validUntil}) akan digeser 6 bulan.</p>
        )}
        {extUsed > 0 && <p className="text-[11.5px] text-[#6b6e72] mt-1.5">Perpanjangan terpakai {extUsed} dari 2 kali.</p>}
      </Step>
      <Optional label="Catatan lain (opsional)">
        <textarea className={INPUT} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Optional>
      <Optional label="Lampirkan lembar pemantauan bertanda tangan (opsional)"><EvidenceInput onFileId={setFile} disabled={busy} /></Optional>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          className={BTN}
          disabled={busy || issues.length > 0}
          onClick={() =>
            run(
              () => mocApi.monitor(moc.id, { ...clean, attachmentFileIds: file ? [file] : [] }),
              (s) => (form.outcome === "Tutup" ? "Pemantauan ditutup. MOC masuk Tinjauan Akhir." : `Pemantauan ke-${s.monitoring.length} tercatat.`)
            ).then(() => { setForm({ date: today, activities: [blankItem()], followUps: [], notes: "", outcome: "Lanjut" }); setFile(undefined); })
          }
        >
          {busy ? "Menyimpan…" : "Simpan pemantauan"}
        </button>
        {issues.length > 0 && !busy && <span className="text-[11.5px] text-[#6b6e72]">{issues[0]}</span>}
      </div>
    </Panel>
  );
}

// Tahap G: Formulir Tinjauan Akhir (Lampiran 7).
function FinalReviewForm({ moc, busy, run }: { moc: MocRequest; busy: boolean; run: RunFn }) {
  const today = wibYmd(Date.now());
  const saved = moc.finalReview;
  const [form, setForm] = useState<MocFinalReviewInput>(() =>
    saved
      ? { date: saved.date, answers: saved.answers, followUps: saved.followUps, reviewers: saved.reviewers, notes: saved.notes }
      : { date: today, answers: MOC_FINAL_QUESTIONS.map(() => ({ yes: null, keterangan: "" })), followUps: [], reviewers: [{ fungsi: "", keterangan: "", tanggapan: "", tanggal: "" }], notes: "" }
  );
  const [file, setFile] = useState<string | undefined>();
  const issues = mocFinalReviewIssues(form, today);
  const setAnswer = (i: number, patch: Partial<MocFinalReviewInput["answers"][number]>) =>
    setForm({ ...form, answers: form.answers.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) });
  const setReviewer = (i: number, patch: Partial<MocFinalReviewInput["reviewers"][number]>) =>
    setForm({ ...form, reviewers: form.reviewers.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  return (
    <>
      <Step n={1} label="Tanggal tinjauan akhir">
        <input type="date" className={`${INPUT} max-w-[220px]`} value={form.date} max={today} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Step>
      <Step n={2} label="Hasil tinjauan">
        <div className="flex flex-col gap-3">
          {MOC_FINAL_QUESTIONS.map((q, i) => (
            <div key={q} className="rounded-[10px] border border-[#C5CED3] p-3">
              <div className="text-[12.5px] font-semibold text-[#0F172A] mb-2">{q}</div>
              <div role="radiogroup" aria-label={q} className="flex gap-4 mb-2">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                    <input type="radio" name={`fq-${i}`} className="accent-[#0F3B59]" checked={form.answers[i].yes === v} onChange={() => setAnswer(i, { yes: v })} />
                    {v ? "Ya" : "Tidak"}
                  </label>
                ))}
              </div>
              <input className={INPUT} value={form.answers[i].keterangan} onChange={(e) => setAnswer(i, { keterangan: e.target.value })} placeholder={form.answers[i].yes === false ? "Keterangan (wajib untuk jawaban Tidak)" : "Keterangan (opsional)"} aria-label="Keterangan" />
            </div>
          ))}
        </div>
      </Step>
      <Step n={3} label="Aksi tindak lanjut (bila ada)">
        <TrackedRows rows={form.followUps} onChange={(followUps) => setForm({ ...form, followUps })} itemLabel="Deskripsi aksi tindak lanjut" />
      </Step>
      <Step n={4} label="MoC Reviewer & Tim Peninjau Akhir">
        <div className="flex flex-col gap-2.5">
          {form.reviewers.map((r, i) => (
            <div key={i} className="rounded-[10px] border border-[#C5CED3] p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className={INPUT} value={r.fungsi} onChange={(e) => setReviewer(i, { fungsi: e.target.value })} placeholder="Fungsi" aria-label="Fungsi" />
              <input type="date" className={INPUT} value={r.tanggal} onChange={(e) => setReviewer(i, { tanggal: e.target.value })} aria-label="Tanggal" />
              <input className={INPUT} value={r.keterangan} onChange={(e) => setReviewer(i, { keterangan: e.target.value })} placeholder="Keterangan" aria-label="Keterangan" />
              <div className="flex items-start gap-2">
                <input className={INPUT} value={r.tanggapan} onChange={(e) => setReviewer(i, { tanggapan: e.target.value })} placeholder="Tanggapan" aria-label="Tanggapan" />
                <button type="button" aria-label="Hapus baris" onClick={() => setForm({ ...form, reviewers: form.reviewers.filter((_, idx) => idx !== i) })} className="p-2 text-[#6b6e72] hover:text-[#DC2626]">
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
          {form.reviewers.length < 20 && (
            <button type="button" onClick={() => setForm({ ...form, reviewers: [...form.reviewers, { fungsi: "", keterangan: "", tanggapan: "", tanggal: "" }] })} className="self-start inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#0F3B59] hover:underline">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Tambah peninjau
            </button>
          )}
        </div>
      </Step>
      <Optional label="Catatan lain (opsional)">
        <textarea className={INPUT} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Optional>
      <Optional label="Lampirkan lembar tinjauan akhir bertanda tangan (opsional)"><EvidenceInput onFileId={setFile} disabled={busy} /></Optional>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          className={BTN}
          disabled={busy || issues.length > 0}
          onClick={() =>
            run(() => mocApi.finalReview(moc.id, { ...form, attachmentFileIds: file ? [file] : [] }), () => "Tinjauan Akhir tercatat. Approver kini dapat menutup MOC.")
          }
        >
          {busy ? "Menyimpan…" : saved ? "Simpan perubahan" : "Simpan tinjauan akhir"}
        </button>
        {issues.length > 0 && !busy && <span className="text-[11.5px] text-[#6b6e72]">{issues[0]}</span>}
      </div>
    </>
  );
}

// Tahap H: penutupan oleh Approver (atau Controller atas nama Approver tanpa akun).
function ClosePanel({ moc, proxy, busy, run, onEvidence, evidence }: { moc: MocRequest; proxy: boolean; busy: boolean; run: RunFn; onEvidence: (id: string | undefined) => void; evidence: string | undefined }) {
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  return (
    <Panel title={proxy ? `Tutup MOC atas nama ${moc.approverManualName ?? "Approver"}` : "Setujui penutupan MOC"}>
      <p className="text-[12.5px] text-[#3a3d40]">
        Tinjauan Akhir sudah dicatat{moc.finalReview ? ` oleh ${moc.finalReview.recordedByName}` : ""}. Penutupan mengubah status Register menjadi Closed dan tidak dapat dibatalkan.
      </p>
      <NoteField label="Catatan penutupan" value={note} onChange={setNote} placeholder="Mis. seluruh aksi tindak lanjut selesai, dokumen PSI terkait sudah dimutakhirkan…" rows={2} />
      <Optional label="Lampirkan bukti penutupan bertanda tangan (opsional)"><EvidenceInput onFileId={onEvidence} disabled={busy} /></Optional>
      {!confirm ? (
        <div>
          <button type="button" className={BTN} disabled={busy || !note.trim()} onClick={() => setConfirm(true)}>Tutup MOC</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap p-3.5 rounded-[10px] bg-[#FEF3C7] border border-[#B45309]/30">
          <span className="text-[13px] font-semibold text-[#92400E]">Tutup MOC ini? Ini tercatat di Riwayat.</span>
          <button type="button" className={BTN} disabled={busy} onClick={() => run(() => mocApi.close(moc.id, { note: note.trim(), evidenceFileId: evidence }), () => "MOC ditutup.")}>
            {busy ? "Memproses…" : "Ya, tutup"}
          </button>
          <button type="button" disabled={busy} onClick={() => setConfirm(false)} className="px-3 py-2 text-[13px] font-bold text-[#0F172A] hover:underline">Batal</button>
        </div>
      )}
    </Panel>
  );
}

// Mencatat review atas nama reviewer tanpa akun: hasil dan catatan diisi oleh pembuat MOC atau Controller,
// bukti tanda tangan (lembar yang sudah ditandatangani) dilampirkan bila ada.
function ProxyReviewCard({
  review,
  busy,
  onSend,
}: {
  review: MocRequest["reviews"][number];
  busy: boolean;
  onSend: (body: { outcome: "Sesuai" | "Perlu Perubahan"; recommendation: string; evidenceFileId?: string }) => void;
}) {
  const [outcome, setOutcome] = useState<"Sesuai" | "Perlu Perubahan">("Sesuai");
  const [recommendation, setRecommendation] = useState("");
  const [file, setFile] = useState<string | undefined>();
  return (
    <div className="rounded-[10px] border border-[#D8E1E4] bg-white p-3 flex flex-col gap-2.5">
      <div className="text-[13px] font-bold text-[#0F172A]">
        {review.reviewerName} <span className="font-normal text-[#6b6e72]">· {review.functionLabel}{review.reviewerJabatan ? ` · ${review.reviewerJabatan}` : ""} · tanpa akun</span>
      </div>
      <div role="radiogroup" aria-label="Hasil review" className="flex gap-2.5 flex-wrap">
        <Choice selected={outcome === "Sesuai"} onSelect={() => setOutcome("Sesuai")} tone="good" title="Sesuai" />
        <Choice selected={outcome === "Perlu Perubahan"} onSelect={() => setOutcome("Perlu Perubahan")} tone="warn" title="Perlu perubahan" />
      </div>
      <NoteField label="Catatan review dari lembar yang ditandatangani" value={recommendation} onChange={setRecommendation} placeholder="Salin rekomendasi reviewer…" rows={2} />
      <Optional label="Lampirkan lembar bertanda tangan (opsional)"><EvidenceInput onFileId={setFile} disabled={busy} /></Optional>
      <div>
        <button type="button" className={BTN} disabled={busy || !recommendation.trim()} onClick={() => onSend({ outcome, recommendation: recommendation.trim(), evidenceFileId: file })}>
          {busy ? "Menyimpan…" : "Catat review"}
        </button>
      </div>
    </div>
  );
}

// Controller memperbaiki nama pihak tanpa akun (reviewer yang belum menilai dan Approver manual).
function PartiesEditor({
  moc,
  busy,
  onSave,
}: {
  moc: MocRequest;
  busy: boolean;
  onSave: (body: { reviewers: { id: string; name: string; functionLabel: string; jabatan: string }[]; approverManual?: { name: string; jabatan: string } }) => void;
}) {
  const manualReviews = reviewsOfCurrentRound(moc).filter((r) => !r.reviewerUserId && r.outcome === "Pending");
  const hasManualApprover = !moc.approverUserId && !!moc.approverManualName;
  const [rows, setRows] = useState(() => manualReviews.map((r) => ({ id: r.id, name: r.reviewerName, functionLabel: r.functionLabel, jabatan: r.reviewerJabatan })));
  const [approver, setApprover] = useState({ name: moc.approverManualName ?? "", jabatan: moc.approverManualJabatan ?? "" });
  const [open, setOpen] = useState(false);
  const setRow = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const valid = rows.every((r) => r.name.trim() && r.functionLabel.trim()) && (!hasManualApprover || !!approver.name.trim());
  return (
    <section className="rounded-[12px] border border-[#D8E1E4] bg-white px-4 py-3">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="text-[12.5px] font-semibold text-[#0F3B59] hover:underline">
        {open ? "Tutup" : "Ubah nama pihak tanpa akun"}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {rows.map((r, i) => (
            <div key={r.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input className={INPUT} aria-label="Nama reviewer" maxLength={200} value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
              <input className={INPUT} aria-label="Fungsi" maxLength={100} value={r.functionLabel} onChange={(e) => setRow(i, { functionLabel: e.target.value })} />
              <input className={INPUT} aria-label="Jabatan" maxLength={200} value={r.jabatan} onChange={(e) => setRow(i, { jabatan: e.target.value })} />
            </div>
          ))}
          {hasManualApprover && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className={INPUT} aria-label="Nama approver" maxLength={200} value={approver.name} onChange={(e) => setApprover({ ...approver, name: e.target.value })} />
              <input className={INPUT} aria-label="Jabatan approver" maxLength={200} value={approver.jabatan} onChange={(e) => setApprover({ ...approver, jabatan: e.target.value })} />
            </div>
          )}
          <div>
            <button
              type="button"
              className={BTN}
              disabled={busy || !valid}
              onClick={() => onSave({ reviewers: rows.map((r) => ({ id: r.id, name: r.name.trim(), functionLabel: r.functionLabel.trim(), jabatan: r.jabatan.trim() })), approverManual: hasManualApprover ? { name: approver.name.trim(), jabatan: approver.jabatan.trim() } : undefined })}
            >
              {busy ? "Menyimpan…" : "Simpan perubahan nama"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
