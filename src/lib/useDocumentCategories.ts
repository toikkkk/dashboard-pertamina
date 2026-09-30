"use client";

// Hook grid Direktori per lokasi — terpisah dari PsiContext (pola sama seperti
// useMoc.ts) supaya pemanggil usePsi() yang sudah ada tidak tersentuh.
import useSWR from "swr";
import type { CategoryDocStatus } from "@/lib/domain/documentCategories";

export interface CategoryTile {
  id: string;
  name: string;
  reviewCycleMonths: number;
  treatExpiryAsReviewOnly: boolean;
  isCustom: boolean;
  status: CategoryDocStatus;
  /** Dokumen terbaru di kategori ini (dipakai untuk status/label ringkas). */
  document: { id: string; title: string; version: string; issueDate: string } | null;
  /** Semua dokumen di kategori ini, terbaru dulu — bisa lebih dari satu (mis. beberapa
   * produk SDS berbeda). Kosong sama artinya dengan document === null. */
  documents: { id: string; title: string; version: string; issueDate: string }[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Permintaan gagal (${res.status}).`);
  }
  return res.json();
}

export function useDocumentCategories(location: string | null) {
  const key = location ? `/api/document-categories?location=${encodeURIComponent(location)}` : null;
  const { data, error, isLoading, mutate } = useSWR<{ location: string; categories: CategoryTile[] }>(
    key,
    (u: string) => fetchJson(u),
    { shouldRetryOnError: false }
  );
  return { categories: data?.categories ?? [], error, isLoading, mutate };
}

export async function createDocumentCategory(location: string, name: string): Promise<CategoryTile> {
  return fetchJson<CategoryTile>("/api/document-categories", { method: "POST", body: JSON.stringify({ location, name }) });
}

export interface CategorySummaryItem {
  name: string;
  approved: number;
  target: number;
  pct: number;
}

// Ringkasan lintas-lokasi — dipakai tab "Per jenis PSI" di kartu Kepatuhan Dokumen
// dashboard (lihat api/document-categories/summary/route.ts untuk arti target/approved).
export function useDocumentCategorySummary(enabled: boolean) {
  const { data, error, isLoading } = useSWR<{ categories: CategorySummaryItem[] }>(
    enabled ? "/api/document-categories/summary" : null,
    (u: string) => fetchJson(u),
    { shouldRetryOnError: false }
  );
  return { categories: data?.categories ?? [], error, isLoading };
}
