"use client";

// Hook data MOC — sengaja TERPISAH dari PsiContext (psiStore.tsx) supaya 16 pemanggil
// usePsi() tidak tersentuh. Pola sama: SWR + fetch ke /api/moc, mutasi lewat API lalu
// mutate() cache. Tombol/aksi di UI diturunkan dari mocActionsFor (domain/moc.ts),
// fungsi yang sama yang dicek ulang server.
import useSWR, { mutate as globalMutate } from "swr";
import { usePsi } from "@/lib/psiStore";
import {
  mocActionsFor,
  type MocAction,
  type MocActor,
  type MocCommunicationInput,
  type MocFormContent,
  type MocImplementationPlanInput,
  type MocRequest,
} from "@/lib/domain/moc";

async function mocFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const issues: unknown = body.issues;
    const detail =
      Array.isArray(issues) && issues.length > 0
        ? typeof issues[0] === "string"
          ? issues.join(" ")
          : (issues[0] as { message?: string }).message
        : undefined;
    const err = new Error(detail ? `${body.error ?? "Gagal"} ${detail}` : body.error || `Permintaan gagal (${res.status}).`);
    (err as Error & { issues?: unknown }).issues = issues;
    throw err;
  }
  return res.json();
}

const fetcher = (url: string) => mocFetch<MocRequest[] | MocRequest>(url);

export function useMocList(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MocRequest[]>(enabled ? "/api/moc" : null, fetcher as (u: string) => Promise<MocRequest[]>, {
    shouldRetryOnError: false,
    // Notifikasi MOC (lonceng & lencana Navbar) harus muncul tanpa muat ulang halaman.
    refreshInterval: enabled ? 15000 : 0,
  });
  return { mocs: data ?? [], error, isLoading, mutate };
}

export function useMocItem(id: string) {
  const { data, error, isLoading, mutate } = useSWR<MocRequest>(`/api/moc/${id}`, fetcher as (u: string) => Promise<MocRequest>, {
    shouldRetryOnError: false,
  });
  return { moc: data, error, isLoading, mutate };
}

export function useMocActor(): MocActor {
  const { activeUser } = usePsi();
  return {
    id: activeUser.id,
    name: activeUser.name,
    role: activeUser.role,
    location: activeUser.location,
    isRegionalAdmin: activeUser.isRegionalAdmin,
  };
}

export function useMocActions(moc: MocRequest | undefined): MocAction[] {
  const actor = useMocActor();
  return moc ? mocActionsFor(moc, actor) : [];
}

// Setelah tiap mutasi, segarkan daftar dan detail agar Register, badge Navbar, dan
// halaman detail tidak basi.
async function afterMutation(saved: MocRequest): Promise<MocRequest> {
  await Promise.all([globalMutate("/api/moc"), globalMutate(`/api/moc/${saved.id}`, saved, { revalidate: false })]);
  return saved;
}

const post = (url: string, body: unknown) => mocFetch<MocRequest>(url, { method: "POST", body: JSON.stringify(body) }).then(afterMutation);

export const mocApi = {
  create: (patch: Partial<MocFormContent>) => post("/api/moc", patch),
  update: (id: string, patch: Partial<MocFormContent>) =>
    mocFetch<MocRequest>(`/api/moc/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).then(afterMutation),
  // Simpan otomatis pilihan reviewer/approver yang belum diajukan (tidak mengubah status).
  savePlan: (id: string, plan: { plannedReviewers: { userId: string; functionLabel: string; jabatan: string }[]; plannedApproverId: string | null }) =>
    mocFetch<MocRequest>(`/api/moc/${id}`, { method: "PATCH", body: JSON.stringify(plan) }).then(afterMutation),
  submit: (
    id: string,
    body: {
      reviewers: { userId: string; functionLabel: string; jabatan: string }[];
      approverUserId: string;
      evidenceFileId?: string;
    }
  ) => post(`/api/moc/${id}/submit`, body),
  review: (id: string, body: { outcome: "Sesuai" | "Perlu Perubahan"; recommendation: string; evidenceFileId?: string }) =>
    post(`/api/moc/${id}/review`, body),
  decide: (
    id: string,
    body: {
      decision: "approve" | "reject";
      note: string;
      performer?: { userId?: string; name: string };
      evidenceFileId?: string;
    }
  ) => post(`/api/moc/${id}/decision`, body),
  register: (id: string, body: { mocNumber?: string; evidenceFileId?: string }) => post(`/api/moc/${id}/register`, body),
  communicate: (id: string, body: MocCommunicationInput & { attachmentFileIds?: string[] }) => post(`/api/moc/${id}/communication`, body),
  planImplementation: (id: string, body: MocImplementationPlanInput & { attachmentFileIds?: string[] }) =>
    post(`/api/moc/${id}/implementation-plan`, body),
  advance: (id: string, body: { notes: string }) => post(`/api/moc/${id}/advance`, body),
  attachEvidence: (id: string, body: { slot: "initiator" | "reviewer" | "approver" | "controller" | "lampiran"; fileId: string; reviewId?: string }) =>
    post(`/api/moc/${id}/evidence`, body),
};
