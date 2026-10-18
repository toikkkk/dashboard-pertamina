// Pemeriksaan aturan gerbang Komunikasi & Rencana Implementasi MOC (domain/moc.ts, fungsi murni).
// Jalankan: pnpm tsx scripts/check-moc-prep.ts  — diam bila lulus, melempar AssertionError bila gagal.
import assert from "node:assert/strict";
import {
  MOC_INITIATOR_ROLE,
  addMonthsYmd,
  mocActionsFor,
  mocAdvanceIssues,
  mocExtensionsUsed,
  mocFinalReviewDue,
  mocFinalReviewIssues,
  mocMonitoringDue,
  mocMonitoringIssues,
  mocMonitoringOverdueDays,
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
    plannedReviewers: [], plannedApproverId: null, approverManualName: null, approverManualJabatan: null, communication: null, implementationPlan: null, monitoring: [], finalReview: null, closure: null,
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

// Pihak tanpa akun (diketik manual): review dicatat pembuat MOC atau Controller; keputusan hanya Controller.
const manualReview = { id: "r1", round: 1, functionLabel: "Maintenance Service", reviewerUserId: null, reviewerName: "Pak Hadi", reviewerJabatan: "", outcome: "Pending" as const, recommendation: "" };
const inReview = moc({ validationState: "in_review", reviews: [manualReview] });
assert.ok(mocActionsFor(inReview, initiator).includes("reviewProxy"));
assert.ok(mocActionsFor(inReview, controller).includes("reviewProxy"));
assert.ok(mocActionsFor(inReview, controller).includes("editParties"));
assert.ok(!mocActionsFor(inReview, initiator).includes("editParties")); // hanya Controller yang mengubah nama pihak
assert.deepEqual(mocActionsFor(inReview, otherInitiator).filter((a) => a === "reviewProxy"), []); // bukan pembuat MOC
assert.deepEqual(mocActionsFor(inReview, outsider), []); // lokasi lain
assert.ok(!mocActionsFor(moc({ validationState: "in_review", reviews: [{ ...manualReview, outcome: "Sesuai" as const }] }), controller).includes("reviewProxy")); // sudah dicatat

const manualApprover = moc({ validationState: "pending_approval", approverUserId: null, approverName: "Bu Sari", approverManualName: "Bu Sari" });
assert.ok(mocActionsFor(manualApprover, controller).includes("decideProxy"));
assert.ok(!mocActionsFor(manualApprover, initiator).includes("decideProxy")); // Initiator tidak boleh memutuskan MOC-nya sendiri
assert.ok(!mocActionsFor(manualApprover, initiator).includes("decide"));
assert.ok(!mocActionsFor(moc({ validationState: "pending_approval" }), controller).includes("decideProxy")); // Approver berakun: bukan proxy

// Tahap F-H: pemantauan, tinjauan akhir, penutupan.
const performer: MocActor = { id: "u-perf", name: "Wahyu", role: MOC_INITIATOR_ROLE, location: LOC };
const approverActor: MocActor = { id: "u-appr", name: "Budi", role: MOC_INITIATOR_ROLE, location: LOC };
const pem = moc({ registerStatus: "Pemantauan" });
assert.ok(mocActionsFor(pem, initiator).includes("monitor"));
assert.ok(mocActionsFor(pem, controller).includes("monitor"));
assert.ok(mocActionsFor(pem, performer).includes("monitor"));
assert.ok(!mocActionsFor(pem, otherInitiator).includes("monitor")); // bukan pembuat/Performer/Controller
assert.deepEqual(mocActionsFor(pem, outsider), []); // lokasi lain
assert.ok(!mocActionsFor(pem, controller).includes("advance")); // Pemantauan -> Tinjauan Akhir hanya lewat formulir pemantauan
assert.ok(mocActionsFor(moc({ registerStatus: "Implementasi" }), controller).includes("advance"));

const tin = moc({ registerStatus: "Tinjauan Akhir" });
assert.ok(mocActionsFor(tin, initiator).includes("finalReview"));
assert.ok(mocActionsFor(tin, controller).includes("finalReview"));
assert.ok(!mocActionsFor(tin, approverActor).includes("close")); // belum ada tinjauan akhir
const fr = { date: "2026-10-01", answers: [], followUps: [], reviewers: [], notes: "", recordedById: "x", recordedByName: "X", recordedAt: "2026-10-01T00:00:00.000Z" };
const tinDone = moc({ registerStatus: "Tinjauan Akhir", finalReview: fr });
assert.ok(mocActionsFor(tinDone, approverActor).includes("close"));
assert.ok(!mocActionsFor(tinDone, initiator).includes("close")); // hanya Approver
assert.ok(!mocActionsFor(tinDone, controller).includes("closeProxy")); // Approver berakun: bukan proxy
const tinManual = moc({ registerStatus: "Tinjauan Akhir", finalReview: fr, approverUserId: null, approverName: "Bu Sari", approverManualName: "Bu Sari" });
assert.ok(mocActionsFor(tinManual, controller).includes("closeProxy"));
assert.ok(!mocActionsFor(tinManual, initiator).includes("closeProxy"));
assert.deepEqual(mocActionsFor(moc({ registerStatus: "Closed" }), controller), []);

// Jadwal: pemantauan 3 bulan sesudah pemantauan terakhir; Tinjauan Akhir 3 bulan (Permanen) atau 1 bulan (Sementara).
const monEntry = { no: 1, date: "2026-07-10", activities: [], followUps: [], notes: "", outcome: "Lanjut" as const, recordedById: "x", recordedByName: "X", recordedAt: "2026-07-10T00:00:00.000Z" };
assert.equal(mocMonitoringDue(moc({ registerStatus: "Pemantauan", monitoring: [monEntry] })), "2026-10-10");
assert.equal(mocMonitoringDue(moc({ registerStatus: "Pemantauan", stateSince: "2026-06-30T17:00:00.000Z" })), "2026-10-01"); // 1 Jul WIB + 3 bulan
assert.equal(mocMonitoringDue(moc({ registerStatus: "Implementasi" })), null);
assert.equal(mocFinalReviewDue(moc({ registerStatus: "Tinjauan Akhir", stateSince: "2026-08-14T02:00:00.000Z" })), "2026-11-14");
assert.equal(mocFinalReviewDue(moc({ registerStatus: "Tinjauan Akhir", sifatPerubahan: "Sementara", stateSince: "2026-08-14T02:00:00.000Z" })), "2026-09-14");
assert.ok(mocMonitoringOverdueDays(moc({ registerStatus: "Pemantauan", monitoring: [monEntry] }), new Date("2026-10-20T03:00:00Z").getTime()) === 10);
assert.equal(mocMonitoringOverdueDays(moc({ registerStatus: "Pemantauan", monitoring: [monEntry] }), new Date("2026-10-05T03:00:00Z").getTime()), 0);

// Aturan isian dan batas perpanjangan (maks 2 x 6 bulan).
const item = (v: string) => ({ item: v, keterangan: "", tahapan: "", pic: "", targetDate: "", status: "" });
assert.deepEqual(mocMonitoringIssues({ date: "2026-10-01", activities: [item("Uji")], followUps: [], notes: "", outcome: "Lanjut" }, 0, "2026-10-18"), []);
assert.equal(mocMonitoringIssues({ date: "2026-10-01", activities: [], followUps: [], notes: "", outcome: "Lanjut" }, 0, "2026-10-18").length, 1);
assert.equal(mocMonitoringIssues({ date: "2026-12-01", activities: [item("Uji")], followUps: [], notes: "", outcome: "Lanjut" }, 0, "2026-10-18").length, 1);
assert.equal(mocMonitoringIssues({ date: "2026-10-01", activities: [item("Uji")], followUps: [], notes: "", outcome: "Perpanjang" }, 1, "2026-10-18").length, 0);
assert.equal(mocMonitoringIssues({ date: "2026-10-01", activities: [item("Uji")], followUps: [], notes: "", outcome: "Perpanjang" }, 2, "2026-10-18").length, 1); // sudah 2x
const ans = (yes: boolean | null, k = "") => ({ yes, keterangan: k });
assert.deepEqual(mocFinalReviewIssues({ date: "2026-10-01", answers: [ans(true), ans(true), ans(true), ans(true)], followUps: [], reviewers: [], notes: "" }, "2026-10-18"), []);
assert.equal(mocFinalReviewIssues({ date: "2026-10-01", answers: [ans(true), ans(null), ans(true), ans(true)], followUps: [], reviewers: [], notes: "" }, "2026-10-18").length, 1);
assert.equal(mocFinalReviewIssues({ date: "2026-10-01", answers: [ans(true), ans(false), ans(true), ans(true)], followUps: [], reviewers: [], notes: "" }, "2026-10-18").length, 1); // Tidak tanpa keterangan
assert.equal(mocFinalReviewIssues({ date: "2026-10-01", answers: [ans(true), ans(false, "belum"), ans(true), ans(true)], followUps: [], reviewers: [], notes: "" }, "2026-10-18").length, 0);
assert.equal(mocExtensionsUsed({ monitoring: [monEntry, { ...monEntry, no: 2, outcome: "Perpanjang" as const }] }), 1);
assert.equal(addMonthsYmd("2026-12-31", 6), "2027-06-30"); // dijepit ke akhir bulan
assert.equal(addMonthsYmd("2027-01-31", 1), "2027-02-28");
