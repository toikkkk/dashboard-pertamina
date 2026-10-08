"use client";

// Antrean unggahan global bergaya Google Drive: unggahan berjalan di latar (dialog langsung tutup),
// progresnya tampil di kartu kanan-bawah (UploadTray) dan TETAP berjalan walau user pindah halaman,
// karena state-nya hidup di modul ini, bukan di komponen. Tiap berkas: kirim byte ke R2 (progres
// sungguhan) → buat dokumen → segarkan Direktori.
import { useSyncExternalStore } from "react";
import { mutate as globalMutate } from "swr";
import { uploadFileToR2 } from "@/lib/uploadFile";

export type UploadStatus = "menunggu" | "mengunggah" | "menyimpan" | "selesai" | "gagal" | "batal";

export interface UploadJob {
  file: File;
  title: string;
  /** YYYY-MM-DD */
  issueDate: string;
  expiryDate: string;
  psiType: string;
  location: string;
  categoryId: string;
  categoryName: string;
  documentNumber: string;
  /** psiStore.addNewDocument — dilewatkan agar modul ini tak bergantung pada React context. */
  save: (input: Record<string, unknown>) => Promise<void>;
}

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  categoryName: string;
  progress: number; // 0..1
  status: UploadStatus;
  error: string | null;
}

interface State {
  items: UploadItem[];
  minimized: boolean;
}

const CONCURRENCY = 2;
let state: State = { items: [], minimized: false };
const listeners = new Set<() => void>();
const jobs = new Map<string, UploadJob>();
const controllers = new Map<string, AbortController>();
let seq = 0;
let running = 0;

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}
function patch(id: string, p: Partial<UploadItem>) {
  emit({ ...state, items: state.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });
}

function refreshDirectory() {
  return globalMutate((key) => typeof key === "string" && (key.startsWith("/api/document-categories") || key.startsWith("/api/directory/overview")));
}

async function runOne(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  const ctrl = new AbortController();
  controllers.set(id, ctrl);
  patch(id, { status: "mengunggah", progress: 0, error: null });
  try {
    const fileId = await uploadFileToR2(job.file, {
      signal: ctrl.signal,
      onProgress: (f) => patch(id, { progress: f }),
    });
    patch(id, { status: "menyimpan", progress: 1 });
    await job.save({
      documentNumber: job.documentNumber,
      title: job.title,
      psiType: job.psiType,
      location: job.location,
      lifecyclePhase: "Operasi",
      isCircular: false,
      routes: [],
      fileId,
      expiryDate: job.expiryDate,
      issueDate: job.issueDate,
      categoryId: job.categoryId,
    });
    patch(id, { status: "selesai" });
    jobs.delete(id);
    void refreshDirectory();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") patch(id, { status: "batal", progress: 0 });
    else patch(id, { status: "gagal", error: err instanceof Error ? err.message : "Gagal menyimpan dokumen." });
  } finally {
    controllers.delete(id);
  }
}

function pump() {
  while (running < CONCURRENCY) {
    const next = state.items.find((i) => i.status === "menunggu");
    if (!next) return;
    running += 1;
    patch(next.id, { status: "mengunggah" });
    void runOne(next.id).finally(() => {
      running -= 1;
      pump();
    });
  }
}

export function enqueueUploads(list: UploadJob[]) {
  const fresh: UploadItem[] = list.map((j) => {
    const id = `u${++seq}`;
    jobs.set(id, j);
    return { id, name: j.file.name, size: j.file.size, categoryName: j.categoryName, progress: 0, status: "menunggu", error: null };
  });
  // Antrean baru menggantikan daftar lama yang sudah selesai (seperti Drive), tapi yang masih berjalan dipertahankan.
  const keep = state.items.filter((i) => i.status === "menunggu" || i.status === "mengunggah" || i.status === "menyimpan" || i.status === "gagal");
  emit({ items: [...fresh, ...keep], minimized: false });
  pump();
}

export function cancelUpload(id: string) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  if (item.status === "menunggu") {
    jobs.delete(id);
    patch(id, { status: "batal" });
  } else if (item.status === "mengunggah") controllers.get(id)?.abort();
}

export function retryUpload(id: string) {
  if (!jobs.has(id)) return;
  patch(id, { status: "menunggu", progress: 0, error: null });
  pump();
}

export function dismissUploads() {
  for (const i of state.items) if (i.status === "menunggu" || i.status === "mengunggah") cancelUpload(i.id);
  jobs.clear();
  emit({ items: [], minimized: false });
}

export function toggleUploadTray() {
  emit({ ...state, minimized: !state.minimized });
}

export function uploadsInFlight(): boolean {
  return state.items.some((i) => i.status === "menunggu" || i.status === "mengunggah" || i.status === "menyimpan");
}

const EMPTY: State = { items: [], minimized: false };
export function useUploadQueue(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => EMPTY
  );
}
