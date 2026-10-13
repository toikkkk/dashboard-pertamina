// Pemeriksaan aturan gerbang Komunikasi & Rencana Implementasi MOC (domain/moc.ts, fungsi murni).
// Jalankan: pnpm tsx scripts/check-moc-prep.ts  — diam bila lulus, melempar AssertionError bila gagal.
import assert from "node:assert/strict";
import {
  MOC_INITIATOR_ROLE,
  mocActionsFor,
  mocAdvanceIssues,
  mocCommunicationIssues,
  mocImplementationPlanIssues,
  mocPendingActions,
  mocStageIndex,
  type MocActor,
  type MocCommunication,
  type MocImplementationPlan,
  type MocRequest,
} from "../src/lib/domain/moc";

const LOC = "IT Surabaya";
const by = { recordedById: "u-init", recordedByName: "Ina", recordedAt: "2026-10-13T00:00:00.000Z" };
const comm: MocCommunication = { items: ["Prosedur"], media: ["Email"], mediaOther: "", date: "2026-10-13", audience: "Operator shift", notes: "", ...by };
const plan: MocImplementationPlan = { technicalPlan: "Ganti PSV", monitoringPlan: "Mingguan", milestones: [{ label: "PSSR", targetDate: "2026-11-01" }], documentationPlan: "", ...by };

function moc(patch: Partial<MocRequest> = {}): MocRequest {
  return {
    id: "m1", mocNumber: "MOC-SURABAYA-2026-001", location: LOC, createdBy: "u-init", createdByName: "Ina", stateSince: null,
    registerStatus: "Inisiasi & Validasi", validationState: "registered", round: 1,
    approverUserId: "u-appr", approverName: "Budi", performerUserId: "u-perf", performerName: "Wahyu", approverNote: null,
    plannedReviewers: [], plannedApproverId: null, communication: null, implementationPlan: null,
    createdAt: "", updatedAt: "", reviews: [], history: [], evidence: [],
    unitOperasi: "", fungsi: "", region: "Jatimbalinus", anggaranType: "", tanggal: "2026-10-01", judul: "Uji", latarBelakang: "",
    changeCategories: [], sifatPerubahan: "Permanen", deskripsi: "", prosesTerdampak: "", peraturanRelevan: "", stakeholderReviewer: "",
    studiKajian: "", usulanPerformer: "", initiatorName: "Ina", initiatorJabatan: "Spv", riskImpacts: [], hazardDescription: "",
    severity: 2, probability: 2, riskLevel: "LTM", plantBarriers: [], processBarriers: [], peopleBarriers: [], upsideGain: "", downsideLoss: "",
    ...patch,
  };
}

const initiator: MocActor = { id: "u-init", name: "Ina", role: MOC_INITIATOR_ROLE, location: LOC };
const otherInitiator: MocActor = { id: "u-x", name: "Xan", role: MOC_INITIATOR_ROLE, location: LOC };
const controller: MocActor = { id: "u-ctrl", name: "Citra", role: "MoC Controller (HSSE)", location: LOC };
const outsider: MocActor = { id: "u-out", name: "Oki", role: "MoC Controller (HSSE)", location: "FT Malang" };
const regionalAdmin: MocActor = { id: "u-adm", name: "Ari", role: MOC_INITIATOR_ROLE, location: null, isRegionalAdmin: true };

// Siapa boleh apa, sebelum & sesudah komunikasi.
assert.deepEqual(mocActionsFor(moc(), initiator), ["communicate", "advance"]);
assert.deepEqual(mocActionsFor(moc(), controller), ["communicate", "advance"]);
assert.deepEqual(mocActionsFor(moc({ communication: comm }), initiator), ["communicate", "planImplementation", "advance"]);
assert.deepEqual(mocActionsFor(moc(), otherInitiator), []); // bukan pembuat MOC
assert.deepEqual(mocActionsFor(moc(), outsider), []); // lokasi lain
assert.deepEqual(mocActionsFor(moc(), regionalAdmin), []); // Admin Regional lihat-saja

// Tahap sesudah Implementasi tetap seperti dulu: hanya Controller yang memajukan.
assert.deepEqual(mocActionsFor(moc({ registerStatus: "Implementasi" }), initiator), []);
assert.deepEqual(mocActionsFor(moc({ registerStatus: "Implementasi" }), controller), ["advance"]);

// Gerbang Implementasi.
assert.deepEqual(mocAdvanceIssues(moc()), ["Komunikasi belum dicatat.", "Rencana implementasi belum dicatat."]);
assert.deepEqual(mocAdvanceIssues(moc({ communication: comm, implementationPlan: plan })), []);
assert.equal(mocAdvanceIssues(moc({ communication: comm, implementationPlan: plan, performerName: null })).length, 1);
assert.deepEqual(mocAdvanceIssues(moc({ registerStatus: "Implementasi" })), []); // MOC lama tidak terdampak

// Kelengkapan isian.
assert.deepEqual(mocCommunicationIssues(comm), []);
assert.equal(mocCommunicationIssues({ ...comm, items: [], media: ["Lainnya"], date: "", audience: " " }).length, 4);
assert.deepEqual(mocImplementationPlanIssues(plan), []);
assert.equal(mocImplementationPlanIssues({ ...plan, milestones: [{ label: "PSSR", targetDate: "" }] }).length, 1);

// Lencana "perlu tindakan" hanya selama belum dicatat.
assert.deepEqual(mocPendingActions(moc(), initiator), ["communicate"]);
assert.deepEqual(mocPendingActions(moc({ communication: comm }), initiator), ["planImplementation"]);
assert.deepEqual(mocPendingActions(moc({ communication: comm, implementationPlan: plan }), initiator), []);

// Stepper: terdaftar tapi belum Implementasi = "Registrasi & Komunikasi" (3).
assert.equal(mocStageIndex(moc()), 3);
assert.equal(mocStageIndex(moc({ registerStatus: "Implementasi" })), 4);
assert.equal(mocStageIndex(moc({ registerStatus: "Closed" })), 7);

console.log("check-moc-prep: semua pemeriksaan lulus");
