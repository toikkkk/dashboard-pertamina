// Pemeriksaan aturan gerbang Komunikasi & Rencana Implementasi MOC (domain/moc.ts, fungsi murni).
// Jalankan: pnpm tsx scripts/check-moc-prep.ts  — diam bila lulus, melempar AssertionError bila gagal.
import assert from "node:assert/strict";
import {
  MOC_INITIATOR_ROLE,
  addMonthsYmd,
  mocActionsFor,
  MOC_CHANGE_CATEGORIES,
  MOC_CHANGE_CATEGORY_SCOPE,
  mocAdvanceIssues,
  mocUnsignedMonitoring,
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
import { mocInsights } from "../src/lib/domain/dashboard";

const LOC = "IT Surabaya";
const by = { recordedById: "u-init", recordedByName: "Ina", recordedAt: "2026-10-13T00:00:00.000Z" };
const comm: MocCommunication = { items: ["Prosedur"], media: ["Email"], mediaOther: "", date: "2026-10-13", audience: "Operator shift", notes: "", ...by };
const plan: MocImplementationPlan = { technicalPlan: "Ganti PSV", monitoringPlan: "Mingguan", milestones: [{ label: "PSSR", targetDate: "2026-11-01" }], documentationPlan: "", ...by };

function moc(patch: Partial<MocRequest> = {}): MocRequest {
  return {
    id: "m1", mocNumber: "MOC-SURABAYA-2026-001", location: LOC, createdBy: "u-init", createdByName: "Ina", stateSince: null,
    registerStatus: "Inisiasi & Validasi", validationState: "registered", round: 1,
    approverUserId: "u-appr", approverName: "Budi", performerUserId: "u-perf", performerName: "Wahyu", approverNote: null,
    plannedReviewers: [], plannedApproverId: null, approverManualName: null, approverManualJabatan: null, communication: null, implementationPlan: null, monitoring: [], finalReview: null, closure: null, halt: null, isOffline: false,
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
assert.deepEqual(mocActionsFor(moc(), controller), []); // Komunikasi/Rencana/serah ke Performer = Initiator pembuat (client 20 Okt)
assert.deepEqual(mocActionsFor(moc({ communication: comm }), initiator), ["communicate", "planImplementation", "advance"]);
assert.deepEqual(mocActionsFor(moc(), otherInitiator), []); // bukan pembuat MOC
assert.deepEqual(mocActionsFor(moc(), outsider), []); // lokasi lain
assert.deepEqual(mocActionsFor(moc(), regionalAdmin), []); // Admin Regional lihat-saja

// Implementasi -> Pemantauan dimajukan Initiator pembuat MOC (bukan Controller).
assert.deepEqual(mocActionsFor(moc({ registerStatus: "Implementasi" }), otherInitiator), []);
assert.deepEqual(mocActionsFor(moc({ registerStatus: "Implementasi" }), controller), []);
assert.deepEqual(mocActionsFor(moc({ registerStatus: "Implementasi" }), initiator), ["advance"]);

// Gerbang Implementasi.
assert.deepEqual(mocAdvanceIssues(moc()), ["Komunikasi belum dicatat.", "Rencana implementasi belum dicatat."]);
const evKom = [{ id: "ek", slot: "lampiran" as const, stage: "Komunikasi", fileId: "f", fileName: "n.pdf", fileUrl: "/n", uploadedByName: "I", uploadedAt: "" }];
assert.deepEqual(mocAdvanceIssues(moc({ communication: comm, implementationPlan: plan })), ["Bukti komunikasi belum dilampirkan."]); // bukti wajib
assert.deepEqual(mocAdvanceIssues(moc({ communication: comm, implementationPlan: plan, evidence: evKom })), []);
assert.equal(mocAdvanceIssues(moc({ communication: comm, implementationPlan: plan, evidence: evKom, performerName: null })).length, 1);
assert.deepEqual(mocAdvanceIssues(moc({ registerStatus: "Implementasi" })), []); // MOC lama tidak terdampak

// Kelengkapan isian.
assert.deepEqual(mocCommunicationIssues(comm), []);
assert.equal(mocCommunicationIssues(comm, false).length, 1); // tanpa bukti ditolak
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
assert.ok(!mocActionsFor(pem, controller).includes("monitor")); // pemantauan oleh Initiator
assert.ok(!mocActionsFor(pem, performer).includes("monitor"));
assert.ok(!mocActionsFor(pem, otherInitiator).includes("monitor")); // bukan pembuat/Performer/Controller
assert.deepEqual(mocActionsFor(pem, outsider), []); // lokasi lain
assert.ok(!mocActionsFor(pem, controller).includes("advance")); // Pemantauan -> Tinjauan Akhir hanya lewat formulir pemantauan
assert.ok(!mocActionsFor(moc({ registerStatus: "Implementasi" }), controller).includes("advance"));

const tin = moc({ registerStatus: "Tinjauan Akhir" });
assert.ok(mocActionsFor(tin, initiator).includes("finalReview"));
assert.ok(!mocActionsFor(tin, controller).includes("finalReview")); // Tinjauan Akhir diisi Initiator
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

// ---- Gelombang B ----
const ev = (stage: string) => ({ id: "e", slot: "controller" as const, stage, fileId: "f", fileName: "x.pdf", fileUrl: "/x", uploadedByName: "C", uploadedAt: "" });
// Form Pemantauan: Initiator mengisi, Controller wajib mengunggah form bertanda tangan sebelum lanjut.
const pemUnsigned = moc({ registerStatus: "Pemantauan", monitoring: [monEntry] });
assert.ok(!mocActionsFor(pemUnsigned, initiator).includes("monitor") && !mocActionsFor(pemUnsigned, initiator).includes("requestHalt"));
assert.ok(mocActionsFor(pemUnsigned, controller).includes("signMonitoring"));
const pemSigned = moc({ registerStatus: "Pemantauan", monitoring: [monEntry], evidence: [ev("Pemantauan-1")] });
assert.ok(mocActionsFor(pemSigned, initiator).includes("monitor") && mocActionsFor(pemSigned, initiator).includes("requestHalt"));
assert.ok(!mocActionsFor(pemSigned, controller).includes("signMonitoring"));
assert.equal(mocUnsignedMonitoring(pemUnsigned)?.no, 1);
assert.equal(mocUnsignedMonitoring(pemSigned), null);
// Penundaan/penghentian.
const haltReq = moc({ validationState: "halt_requested", registerStatus: "Pemantauan", approverUserId: "u-appr" });
assert.ok(mocActionsFor(haltReq, approverActor).includes("decideHalt"));
assert.ok(!mocActionsFor(haltReq, controller).includes("decideHaltProxy")); // Approver berakun
assert.ok(mocActionsFor(moc({ validationState: "halt_requested", registerStatus: "Pemantauan", approverUserId: null, approverManualName: "Bu Sari" }), controller).includes("decideHaltProxy"));
assert.ok(mocActionsFor(moc({ validationState: "halted", registerStatus: "Pemantauan" }), initiator).includes("resume"));
assert.ok(!mocActionsFor(moc({ validationState: "halted", registerStatus: "Pemantauan" }), controller).includes("resume"));
// Tinjauan Akhir: Initiator mengisi -> Reviewer menanggapi -> Approver setuju -> Controller finalisasi.
const resp = (outcome: "Pending" | "Sesuai" | "Perlu Perubahan", userId: string | null) => ({ userId, name: "R", fungsi: "HSSE", jabatan: "", outcome, note: "" });
const frR = (responses: ReturnType<typeof resp>[]) => ({ ...fr, responses });
const base = { registerStatus: "Tinjauan Akhir" as const, approverUserId: "u-appr" };
const rv: MocActor = { id: "u-rv", name: "Rev", role: MOC_INITIATOR_ROLE, location: LOC };
const pend = moc({ ...base, finalReview: frR([resp("Pending", "u-rv"), resp("Pending", null)]) });
assert.ok(mocActionsFor(pend, rv).includes("reviewFinal"));
assert.ok(mocActionsFor(pend, controller).includes("reviewFinalProxy") && mocActionsFor(pend, initiator).includes("reviewFinalProxy"));
assert.ok(!mocActionsFor(pend, approverActor).includes("close")); // belum semua Sesuai
assert.ok(!mocActionsFor(pend, initiator).includes("finalReview")); // tunggu review
const perlu = moc({ ...base, finalReview: frR([resp("Sesuai", "u-rv"), resp("Perlu Perubahan", null)]) });
assert.ok(mocActionsFor(perlu, initiator).includes("finalReview")); // Initiator mengisi ulang
assert.ok(!mocActionsFor(perlu, approverActor).includes("close"));
const semua = moc({ ...base, finalReview: frR([resp("Sesuai", "u-rv")]) });
assert.ok(mocActionsFor(semua, approverActor).includes("close"));
const tutup = moc({ ...base, finalReview: frR([resp("Sesuai", "u-rv")]), closure: { note: "ok", closedAt: "", closedById: "u-appr", closedByName: "B", onBehalfOf: null } });
assert.ok(mocActionsFor(tutup, controller).includes("finalizeClosure"));
assert.ok(!mocActionsFor(tutup, approverActor).includes("close")); // sudah disetujui
assert.ok(!mocActionsFor(tutup, initiator).includes("finalizeClosure"));

// ---- Dashboard MOC: label tepat untuk tiap tindakan baru dan penantian pihak lain ----
const att = (m: MocRequest, a: MocActor) => mocInsights([m], a, Date.now()).attention.map((x) => `${x.kind}:${x.detail}`);
assert.ok(att(pemUnsigned, controller).includes("mine:Unggah Form Pemantauan bertanda tangan"));
assert.ok(att(pemUnsigned, initiator).includes("waiting:Menunggu Controller mengunggah Form Pemantauan ke-1 bertanda tangan"));
assert.ok(att(pend, rv).includes("mine:Menunggu review Tinjauan Akhir Anda"));
assert.ok(att(pend, approverActor).some((x) => x.startsWith("waiting:Menunggu review Tinjauan Akhir")));
assert.ok(att(semua, approverActor).includes("mine:Setujui penutupan MOC"));
assert.ok(att(tutup, controller).includes("mine:Finalisasi penutupan: unggah form bertanda tangan"));
assert.ok(att(haltReq, approverActor).includes("mine:Putuskan penundaan/penghentian"));
assert.ok(att(haltReq, initiator).some((x) => x.startsWith("waiting:Menunggu keputusan Approver")));
assert.ok(att(moc({ validationState: "halted", registerStatus: "Pemantauan" }), initiator).some((x) => x.startsWith("waiting:Ditunda")));
assert.ok(!att(perlu, initiator).includes("mine:Perlu diperbaiki lalu diajukan ulang")); // tidak jatuh ke teks bawaan

// Nomor scope TKO Tabel 1: tiap kategori punya nomor unik 1-13, dan "Sistem / aplikasi..." = 13 (penentu Reviewer Fungsi IT).
assert.deepEqual(MOC_CHANGE_CATEGORIES.map((c) => MOC_CHANGE_CATEGORY_SCOPE[c]).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
assert.equal(MOC_CHANGE_CATEGORY_SCOPE["Sistem / aplikasi / teknologi / metode kerja baru"], 13);
assert.equal(MOC_CHANGE_CATEGORY_SCOPE["Penggantian peralatan / komponen bukan inkind replacement"], 8);
