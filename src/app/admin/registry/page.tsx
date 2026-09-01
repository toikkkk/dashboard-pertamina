"use client";

// Admin-only browse/search over the ~2,980 real files migrated into file_registry
// (see CLAUDE.md's two-tier data model) — without this page, everything except the
// 11 curated documents seeded from mockData.ts was invisible in the product despite
// being safely stored in R2/Postgres. Deliberately does NOT fabricate PSI-workflow
// metadata (documentNumber, psiType, expiryDate, ...) for all 2,980 files at once —
// most are raw evidence photos/worksheets that were never approval-workflow objects.
// Promotion into a real curated `documents` row stays a deliberate one-at-a-time
// admin action via POST /api/registry/:id/link, same as the backend was designed for.
import React, { useState } from "react";
import useSWR from "swr";
import { usePsi } from "@/lib/psiStore";
import { ShieldAlert, Search, Download, Link2, X, CheckCircle2, ChevronLeft, ChevronRight, Archive } from "lucide-react";
import type { PSIType, LifecyclePhase } from "@/lib/mockData";

interface RegistryFile {
  id: string;
  originalFilename: string;
  originalRelativePath: string;
  category: string;
  locationRaw: string | null;
  locationCanonical: string | null;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string | null;
  needsLocationReview: boolean;
}

interface RegistrySubcategory {
  value: string;
  label: string;
  count: number;
}

interface RegistryResponse {
  items: RegistryFile[];
  total: number;
  page: number;
  pageSize: number;
  subcategories: RegistrySubcategory[];
}

const CATEGORY_LABELS: Record<string, string> = {
  "00-psi": "00. PSI",
  "01-downgrade-situation": "01. Downgrade Situation",
  "02-pha": "02. PHA",
  "03-lps": "03. LPS",
  "04-mah-sece": "04. MAH - SECE",
  "05-moc": "05. MOC",
  "07-fgds": "07. FGDS",
  "08-qra": "08. QRA",
  "10-audit-psaims": "10. Audit PSAIMS",
  uncategorized: "Tidak Terkategori",
  "app-upload": "Unggahan Aplikasi",
};

const PSI_TYPES: PSIType[] = [
  "Informasi Bahan Berbahaya",
  "Informasi Teknologi Proses",
  "Informasi Peralatan",
  "Sistem Tata Kerja",
];
const LIFECYCLE_PHASES: LifecyclePhase[] = ["Proyek", "Operasi", "Decommissioning"];

function formatBytes(n: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)}${units[i]}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LinkForm {
  documentNumber: string;
  title: string;
  psiType: PSIType;
  location: string;
  lifecyclePhase: LifecyclePhase;
  issueDate: string;
  expiryDate: string;
}

export default function AdminRegistryPage() {
  const { activeUser, locations } = usePsi();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("ALL");
  const [subcategory, setSubcategory] = useState("ALL");
  const [page, setPage] = useState(1);

  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [form, setForm] = useState<LinkForm | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (category !== "ALL") params.set("category", category);
  if (subcategory !== "ALL") params.set("subcategory", subcategory);
  params.set("page", String(page));

  const { data, isLoading, mutate } = useSWR<RegistryResponse>(
    activeUser.isRegionalAdmin ? `/api/registry?${params.toString()}` : null,
    fetcher
  );

  if (!activeUser.isRegionalAdmin) {
    return (
      <div className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] py-[60px] px-5 text-center">
        <ShieldAlert className="w-8 h-8 text-[#c3c6c9] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-bold text-[#3a3d40] mb-1">Halaman khusus Admin Regional</p>
        <p className="text-[12.5px] text-[#9a9da0]">Anda tidak memiliki wewenang untuk mengakses arsip registry.</p>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const runSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const openLink = (file: RegistryFile) => {
    if (linkingId === file.id) {
      setLinkingId(null);
      setForm(null);
      return;
    }
    setLinkError(null);
    setLinkingId(file.id);
    const today = new Date();
    const expiry = new Date(today);
    expiry.setFullYear(expiry.getFullYear() + 5);
    setForm({
      documentNumber: "",
      title: file.originalFilename.replace(/\.[^.]+$/, ""),
      psiType: PSI_TYPES[0],
      location: file.locationCanonical ?? locations[0]?.locationName ?? "",
      lifecyclePhase: "Operasi",
      issueDate: today.toISOString().slice(0, 10),
      expiryDate: expiry.toISOString().slice(0, 10),
    });
  };

  const submitLink = async (fileId: string) => {
    if (!form) return;
    if (!form.documentNumber.trim() || !form.title.trim()) {
      setLinkError("Nomor dokumen dan judul wajib diisi.");
      return;
    }
    setLinking(true);
    setLinkError(null);
    try {
      const res = await fetch(`/api/registry/${fileId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Gagal menautkan dokumen (${res.status}).`);
      }
      setLinkingId(null);
      setForm(null);
      setLinkSuccess(fileId);
      setTimeout(() => setLinkSuccess(null), 3000);
      mutate();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Gagal menautkan dokumen.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Archive className="w-4 h-4 text-[#0369A1]" strokeWidth={1.8} />
        <h1 className="font-heading text-[15px] font-bold text-[#0F172A]">Arsip Registry</h1>
      </div>
      <div className="flex flex-wrap gap-2.5 mb-4 mt-4">
        <form onSubmit={runSearch} className="relative flex-1 min-w-[220px] max-w-[360px]">
          <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama berkas..."
            className="w-full min-h-[36px] pl-[32px] pr-3 py-1.5 text-[12.5px] border border-[#D6DEE8] rounded-[2px]"
          />
        </form>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSubcategory("ALL");
            setPage(1);
          }}
          className="text-[12.5px] px-2.5 py-1.5 border border-[#D6DEE8] rounded-[2px] bg-white font-semibold min-h-[36px]"
        >
          <option value="ALL">Semua Kategori</option>
          {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
            <option key={slug} value={slug}>{label}</option>
          ))}
        </select>
        {category !== "ALL" && (data?.subcategories.length ?? 0) > 1 && (
          <select
            value={subcategory}
            onChange={(e) => {
              setSubcategory(e.target.value);
              setPage(1);
            }}
            className="text-[12.5px] px-2.5 py-1.5 border border-[#D6DEE8] rounded-[2px] bg-white font-semibold min-h-[36px] animate-fadeIn"
          >
            <option value="ALL">Semua Sub-Kategori</option>
            {data?.subcategories.map((s) => (
              <option key={s.value} value={s.value}>{s.label} ({s.count.toLocaleString("id-ID")})</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] overflow-hidden">
        {isLoading ? (
          <div className="py-14 text-center text-[12.5px] text-[#9a9da0]">Memuat arsip…</div>
        ) : items.length === 0 ? (
          <div className="py-14 px-5 text-center">
            <Search className="w-[30px] h-[30px] text-[#c3c6c9] mx-auto mb-2.5" strokeWidth={1.5} />
            <p className="text-[13px] text-[#9a9da0]">Tidak ada berkas yang cocok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-[#fafafb]">
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Nama Berkas</th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Kategori</th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Lokasi</th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Ukuran</th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Diunggah</th>
                  <th className="text-right px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <React.Fragment key={f.id}>
                    <tr className="border-t border-[#f0f0f1] hover:bg-[#fafafb] transition-colors">
                      <td className="px-3.5 py-3 font-semibold text-[#0F172A] max-w-[280px]">
                        <div className="truncate" title={f.originalRelativePath}>{f.originalFilename}</div>
                      </td>
                      <td className="px-3.5 py-3 text-[#6b6e72]">{CATEGORY_LABELS[f.category] ?? f.category}</td>
                      <td className="px-3.5 py-3 text-[#6b6e72]">
                        {f.locationCanonical ?? f.locationRaw ?? (
                          <span className="text-[11px] font-semibold text-[#B45309]">Perlu ditinjau</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-[#6b6e72] whitespace-nowrap">{formatBytes(f.sizeBytes)}</td>
                      <td className="px-3.5 py-3 text-[#6b6e72] whitespace-nowrap">{fmtDate(f.uploadedAt)}</td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        {linkSuccess === f.id ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#15803D]">
                            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                            Tertaut
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/api/files/${f.id}/download`}
                              download
                              className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[2px] border border-[#D6DEE8] text-[#3a3d40] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
                            >
                              <Download className="w-3 h-3" strokeWidth={2} />
                              Unduh
                            </a>
                            <button
                              onClick={() => openLink(f)}
                              className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[2px] border border-[#0369A1] text-[#0369A1] hover:bg-[#E0F2FE] active:scale-[0.97] transition-all duration-200"
                            >
                              <Link2 className="w-3 h-3" strokeWidth={2} />
                              Jadikan Dokumen
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {linkingId === f.id && form && (
                      <tr>
                        <td colSpan={6} className="p-0 border-t border-[#f0f0f1]">
                          <div className="bg-[#f7f8f8] px-5 py-[18px] animate-fadeInUp">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[12.5px] font-bold text-[#3a3d40]">Jadikan Dokumen Resmi — {f.originalFilename}</p>
                              <button onClick={() => openLink(f)} aria-label="Batal" className="text-[#9a9da0] hover:text-[#0F172A]">
                                <X className="w-4 h-4" strokeWidth={2} />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3.5 mb-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Nomor Dokumen</label>
                                <input
                                  type="text"
                                  value={form.documentNumber}
                                  onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                                  placeholder="mis. PSI-MLG-2026-045"
                                  className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#D6DEE8] rounded-[2px]"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Judul Dokumen</label>
                                <input
                                  type="text"
                                  value={form.title}
                                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                                  className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#D6DEE8] rounded-[2px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Jenis PSI</label>
                                <select
                                  value={form.psiType}
                                  onChange={(e) => setForm({ ...form, psiType: e.target.value as PSIType })}
                                  className="w-full min-h-[34px] px-2 py-1 text-[12.5px] border border-[#D6DEE8] rounded-[2px] bg-white"
                                >
                                  {PSI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Lokasi</label>
                                <select
                                  value={form.location}
                                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                                  className="w-full min-h-[34px] px-2 py-1 text-[12.5px] border border-[#D6DEE8] rounded-[2px] bg-white"
                                >
                                  {locations.map((l) => <option key={l.locationName} value={l.locationName}>{l.locationName}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Fase</label>
                                <select
                                  value={form.lifecyclePhase}
                                  onChange={(e) => setForm({ ...form, lifecyclePhase: e.target.value as LifecyclePhase })}
                                  className="w-full min-h-[34px] px-2 py-1 text-[12.5px] border border-[#D6DEE8] rounded-[2px] bg-white"
                                >
                                  {LIFECYCLE_PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Tanggal Terbit</label>
                                <input
                                  type="date"
                                  value={form.issueDate}
                                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                                  className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#D6DEE8] rounded-[2px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Tanggal Kedaluwarsa</label>
                                <input
                                  type="date"
                                  value={form.expiryDate}
                                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                                  className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#D6DEE8] rounded-[2px]"
                                />
                              </div>
                            </div>
                            {linkError && <p className="mb-2.5 text-[11.5px] font-semibold text-[#DC2626]">{linkError}</p>}
                            <div className="flex gap-2">
                              <button
                                onClick={() => submitLink(f.id)}
                                disabled={linking}
                                className="text-xs font-bold px-3.5 py-2 rounded-[2px] border border-[#0369A1] bg-[#0369A1] hover:bg-[#075985] active:scale-[0.97] text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {linking ? "Menyimpan…" : "Simpan sebagai Dokumen"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openLink(f)}
                                disabled={linking}
                                className="text-xs font-bold px-3.5 py-2 rounded-[2px] border border-[#D6DEE8] bg-white hover:bg-[#f0f0f1] active:scale-[0.97] transition-all duration-200 disabled:opacity-60"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#f0f0f1] bg-[#fafafb]">
            <span className="text-[11.5px] text-[#9a9da0]">
              Halaman {page} dari {totalPages} · {total.toLocaleString("id-ID")} berkas total
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[2px] border border-[#D6DEE8] hover:bg-white active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[2px] border border-[#D6DEE8] hover:bg-white active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
