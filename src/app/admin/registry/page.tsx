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
import {
  ShieldAlert, Search, Download, Link2, X, CheckCircle2, ChevronLeft, ChevronRight, Archive, Eye,
  ArrowUp, ArrowDown, ArrowUpDown, FileText, FileSpreadsheet, FileImage, FileVideo, FileArchive, Presentation, File as FileGeneric,
} from "lucide-react";
import type { PSIType, LifecyclePhase } from "@/lib/mockData";
import RegistryPreviewModal from "@/components/RegistryPreviewModal";
import CategoryPickerField from "@/components/CategoryPickerField";
import LocationPickerField from "@/components/LocationPickerField";
import { useDocumentCategories } from "@/lib/useDocumentCategories";

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

// Per-extension icon + color — the single biggest thing that made this table hard to
// scan while sorting (e.g. by Ukuran) was that every row looked identical regardless
// of file type. Colors reuse the app's existing semantic palette rather than
// introducing new ones (PDF/doc red-adjacent, spreadsheet green, image violet,
// video/brand blue, archive amber) — never the only signal (filename + extension
// text stay visible too), just a faster visual anchor when scanning many rows.
function FileTypeIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "#DC2626" }} strokeWidth={1.8} />;
  if (["xlsx", "xls", "xlsm", "csv"].includes(ext)) return <FileSpreadsheet className="w-4 h-4 flex-shrink-0" style={{ color: "#15803D" }} strokeWidth={1.8} />;
  if (["doc", "docx"].includes(ext)) return <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "#1D4ED8" }} strokeWidth={1.8} />;
  if (["ppt", "pptx"].includes(ext)) return <Presentation className="w-4 h-4 flex-shrink-0" style={{ color: "#EA580C" }} strokeWidth={1.8} />;
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) return <FileImage className="w-4 h-4 flex-shrink-0" style={{ color: "#6D28D9" }} strokeWidth={1.8} />;
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return <FileVideo className="w-4 h-4 flex-shrink-0" style={{ color: "#0F3B59" }} strokeWidth={1.8} />;
  if (["zip", "rar", "7z"].includes(ext)) return <FileArchive className="w-4 h-4 flex-shrink-0" style={{ color: "#B45309" }} strokeWidth={1.8} />;
  return <FileGeneric className="w-4 h-4 flex-shrink-0 text-[#9a9da0]" strokeWidth={1.8} />;
}

// Shared between the desktop table's expand-row and the mobile card list's
// expand-section — same fields either way, just embedded in a different parent.
function LinkDocumentForm({
  form,
  setForm,
  locations,
  linkError,
  linking,
  onSubmit,
  onCancel,
}: {
  form: LinkForm;
  setForm: (f: LinkForm) => void;
  locations: { locationName: string }[];
  linkError: string | null;
  linking: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { categories: availableCategories } = useDocumentCategories(form.location);
  // Kategori sebelumnya bisa jadi milik lokasi lain kalau admin ganti Lokasi di form ini.
  React.useEffect(() => {
    if (form.categoryId) setForm({ ...form, categoryId: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.location]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Nomor Dokumen</label>
          <input
            type="text"
            value={form.documentNumber}
            onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
            placeholder="mis. PSI-MLG-2026-045"
            className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#C5CED3] rounded-[8px]"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Judul Dokumen</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#C5CED3] rounded-[8px]"
          />
        </div>
        <div>
          <LocationPickerField
            locations={locations}
            value={form.location}
            onChange={(name) => setForm({ ...form, location: name })}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Fase</label>
          <select
            value={form.lifecyclePhase}
            onChange={(e) => setForm({ ...form, lifecyclePhase: e.target.value as LifecyclePhase })}
            className="w-full min-h-[34px] px-2 py-1 text-[12.5px] border border-[#C5CED3] rounded-[8px] bg-white"
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
            className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#C5CED3] rounded-[8px]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Tanggal Kedaluwarsa</label>
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#C5CED3] rounded-[8px]"
          />
        </div>
        <div className="sm:col-span-3 sm:w-1/3">
          <CategoryPickerField
            categories={availableCategories}
            value={form.categoryId}
            onChange={(id) => setForm({ ...form, categoryId: id })}
          />
        </div>
      </div>
      {linkError && <p className="mb-2.5 text-[11.5px] font-semibold text-[#DC2626]">{linkError}</p>}
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={linking}
          className="text-xs font-bold px-3.5 py-2 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {linking ? "Menyimpan…" : "Simpan sebagai Dokumen"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={linking}
          className="text-xs font-bold px-3.5 py-2 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f0f0f1] active:scale-[0.97] transition-all duration-200 disabled:opacity-60"
        >
          Batal
        </button>
      </div>
    </>
  );
}

type SortKey = "filename" | "category" | "location" | "size" | "uploaded";

function SortableHeader({
  column,
  label,
  align = "left",
  activeSort,
  sortDir,
  onSort,
}: {
  column: SortKey;
  label: string;
  align?: "left" | "right";
  activeSort: SortKey;
  sortDir: "asc" | "desc";
  onSort: (column: SortKey) => void;
}) {
  const isActive = activeSort === column;
  return (
    <th className={`px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 hover:text-[#0F3B59] transition-colors duration-200 ${isActive ? "text-[#0F3B59]" : ""} ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        {isActive ? (
          sortDir === "asc" ? <ArrowUp className="w-3 h-3" strokeWidth={2.2} /> : <ArrowDown className="w-3 h-3" strokeWidth={2.2} />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-[#c3c6c9]" strokeWidth={2} />
        )}
      </button>
    </th>
  );
}

interface LinkForm {
  documentNumber: string;
  title: string;
  psiType: PSIType;
  location: string;
  lifecyclePhase: LifecyclePhase;
  issueDate: string;
  expiryDate: string;
  // Sub-kategori grid Direktori (2026-09-28) — tanpa ini dokumen tetap tertaut
  // tapi tidak muncul di kartu kategori manapun. Opsional, sama seperti di /upload.
  categoryId: string;
}

export default function AdminRegistryPage() {
  const { activeUser, locations } = usePsi();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("ALL");
  const [subcategory, setSubcategory] = useState("ALL");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("filename");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [form, setForm] = useState<LinkForm | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<RegistryFile | null>(null);

  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (category !== "ALL") params.set("category", category);
  if (subcategory !== "ALL") params.set("subcategory", subcategory);
  params.set("page", String(page));
  params.set("sortBy", sortBy);
  params.set("sortDir", sortDir);

  const { data, isLoading, mutate } = useSWR<RegistryResponse>(
    activeUser.isRegionalAdmin ? `/api/registry?${params.toString()}` : null,
    fetcher
  );

  if (!activeUser.isRegionalAdmin) {
    return (
      <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] py-[60px] px-5 text-center">
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

  const toggleSort = (column: SortKey) => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
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
      categoryId: "",
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
        body: JSON.stringify({ ...form, categoryId: form.categoryId || undefined }),
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
        <Archive className="w-4 h-4 text-[#0F3B59]" strokeWidth={1.8} />
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
            className="w-full min-h-[36px] pl-[32px] pr-3 py-1.5 text-[12.5px] border border-[#C5CED3] rounded-[8px]"
          />
        </form>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSubcategory("ALL");
            setPage(1);
          }}
          className="text-[12.5px] px-2.5 py-1.5 border border-[#C5CED3] rounded-[8px] bg-white font-semibold min-h-[36px]"
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
            className="text-[12.5px] px-2.5 py-1.5 border border-[#C5CED3] rounded-[8px] bg-white font-semibold min-h-[36px] animate-fadeIn"
          >
            <option value="ALL">Semua Sub-Kategori</option>
            {data?.subcategories.map((s) => (
              <option key={s.value} value={s.value}>{s.label} ({s.count.toLocaleString("id-ID")})</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] overflow-hidden">
        {isLoading ? (
          <div className="py-14 text-center text-[12.5px] text-[#9a9da0]">Memuat arsip…</div>
        ) : items.length === 0 ? (
          <div className="py-14 px-5 text-center">
            <Search className="w-[30px] h-[30px] text-[#c3c6c9] mx-auto mb-2.5" strokeWidth={1.5} />
            <p className="text-[13px] text-[#9a9da0]">Tidak ada berkas yang cocok.</p>
          </div>
        ) : (
          <>
            {/* Card list below lg — same reasoning as Directory's table: a 6-column
                table has nowhere neat to go on a narrow screen. */}
            <div className="lg:hidden divide-y divide-[#f0f0f1]">
              {items.map((f) => (
                <div key={f.id} className="p-3.5">
                  <div className="flex items-start gap-2.5 mb-2">
                    <FileTypeIcon filename={f.originalFilename} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[13px] text-[#0F172A] break-words" title={f.originalRelativePath}>{f.originalFilename}</div>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <span className="inline-flex text-[10.5px] font-semibold px-1.5 py-[2px] rounded-[8px] bg-[#F5F7F9] text-[#6b6e72] whitespace-nowrap">
                          {CATEGORY_LABELS[f.category] ?? f.category}
                        </span>
                        <span className="text-[11px] text-[#6b6e72]">
                          {f.locationCanonical ?? f.locationRaw ?? <span className="font-semibold text-[#B45309]">Perlu ditinjau</span>}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#9a9da0] mt-1 tabular-nums">{formatBytes(f.sizeBytes)} · {fmtDate(f.uploadedAt)}</div>
                    </div>
                  </div>

                  {linkSuccess === f.id ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#15803D]">
                      <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                      Tertaut
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewFile(f)}
                        className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] text-[#3a3d40] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
                      >
                        <Eye className="w-3 h-3" strokeWidth={2} />
                        Lihat
                      </button>
                      <a
                        href={`/api/files/${f.id}/download`}
                        download
                        className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] text-[#3a3d40] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
                      >
                        <Download className="w-3 h-3" strokeWidth={2} />
                        Unduh
                      </a>
                      <button
                        onClick={() => openLink(f)}
                        className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#0F3B59] text-[#0F3B59] hover:bg-[#E2E8EB] active:scale-[0.97] transition-all duration-200"
                      >
                        <Link2 className="w-3 h-3" strokeWidth={2} />
                        Jadikan Dokumen
                      </button>
                    </div>
                  )}

                  {linkingId === f.id && form && (
                    <div className="mt-3 pt-3 border-t border-[#eceded] animate-fadeInUp">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[12.5px] font-bold text-[#3a3d40]">Jadikan Dokumen Resmi</p>
                        <button onClick={() => openLink(f)} aria-label="Batal" className="text-[#9a9da0] hover:text-[#0F172A]">
                          <X className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                      <LinkDocumentForm
                        form={form}
                        setForm={setForm}
                        locations={locations}
                        linkError={linkError}
                        linking={linking}
                        onSubmit={() => submitLink(f.id)}
                        onCancel={() => openLink(f)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-[#fafafb]">
                  <SortableHeader column="filename" label="Nama Berkas" activeSort={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader column="category" label="Kategori" activeSort={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader column="location" label="Lokasi" activeSort={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader column="size" label="Ukuran" align="right" activeSort={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader column="uploaded" label="Diunggah" activeSort={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <th className="text-right px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <React.Fragment key={f.id}>
                    <tr className="border-t border-[#f0f0f1] hover:bg-[#fafafb] transition-colors">
                      <td className="px-3.5 py-3 max-w-[300px]">
                        <div className="flex items-center gap-2.5">
                          <FileTypeIcon filename={f.originalFilename} />
                          <div className="truncate font-semibold text-[#0F172A]" title={f.originalRelativePath}>{f.originalFilename}</div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="inline-flex text-[11px] font-semibold px-2 py-[3px] rounded-[8px] bg-[#F5F7F9] text-[#6b6e72] whitespace-nowrap">
                          {CATEGORY_LABELS[f.category] ?? f.category}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-[#6b6e72]">
                        {f.locationCanonical ?? f.locationRaw ?? (
                          <span className="text-[11px] font-semibold text-[#B45309]">Perlu ditinjau</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-[#6b6e72] text-right tabular-nums whitespace-nowrap">{formatBytes(f.sizeBytes)}</td>
                      <td className="px-3.5 py-3 text-[#6b6e72] whitespace-nowrap">{fmtDate(f.uploadedAt)}</td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        {linkSuccess === f.id ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#15803D]">
                            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                            Tertaut
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewFile(f)}
                              className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] text-[#3a3d40] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
                            >
                              <Eye className="w-3 h-3" strokeWidth={2} />
                              Lihat
                            </button>
                            <a
                              href={`/api/files/${f.id}/download`}
                              download
                              className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] text-[#3a3d40] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
                            >
                              <Download className="w-3 h-3" strokeWidth={2} />
                              Unduh
                            </a>
                            <button
                              onClick={() => openLink(f)}
                              className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#0F3B59] text-[#0F3B59] hover:bg-[#E2E8EB] active:scale-[0.97] transition-all duration-200"
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
                            <LinkDocumentForm
                              form={form}
                              setForm={setForm}
                              locations={locations}
                              linkError={linkError}
                              linking={linking}
                              onSubmit={() => submitLink(f.id)}
                              onCancel={() => openLink(f)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          </>
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
                className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border border-[#C5CED3] hover:bg-white active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border border-[#C5CED3] hover:bg-white active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>

      {previewFile && (
        <RegistryPreviewModal
          file={previewFile}
          categoryLabel={CATEGORY_LABELS[previewFile.category] ?? previewFile.category}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
