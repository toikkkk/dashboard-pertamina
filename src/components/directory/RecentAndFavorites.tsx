"use client";

// Jalan pintas di puncak Direktori: dokumen yang baru dibuka dan yang ditandai favorit (per akun, tersimpan
// di browser). Hanya dokumen yang masih ada (dicocokkan dengan daftar dokumen) yang ditampilkan; seluruh
// strip tersembunyi bila keduanya kosong — tanpa teks kosong/penjelasan.
import React, { useMemo } from "react";
import Link from "next/link";
import { Clock, FileText, Star } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { useDocRefs, type DocRef } from "@/lib/recentDocs";

function Column({ title, icon: Icon, color, items }: { title: string; icon: typeof Clock; color: string; items: DocRef[] }) {
  if (items.length === 0) return null;
  return (
    <section className="min-w-0 flex-1 bg-white border border-[#D8E1E4] rounded-[14px] overflow-hidden">
      <h3 className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold tracking-[.05em] uppercase text-[#6b6e72] border-b border-[#EEF2F4]">
        <Icon className="w-3.5 h-3.5" strokeWidth={2.2} style={{ color }} />
        {title}
      </h3>
      <ul>
        {items.map((d) => (
          <li key={d.id}>
            <Link href={`/document/${d.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-[#F0F4F6] transition-colors duration-150">
              <FileText className="w-[18px] h-[18px] flex-shrink-0 text-[#DC2626]" strokeWidth={1.6} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold text-[#0F172A] truncate">{d.title}</span>
                <span className="block text-[11px] text-[#9a9da0] truncate">{d.location}{d.category ? ` · ${d.category}` : ""}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function RecentAndFavorites() {
  const { allDocuments, activeUser } = usePsi();
  const { recent, favs } = useDocRefs(activeUser.id);
  const existing = useMemo(() => new Set(allDocuments.map((d) => d.id)), [allDocuments]);
  const keep = (list: DocRef[]) => list.filter((d) => existing.has(d.id)).slice(0, 5);
  const recentShown = keep(recent);
  const favsShown = keep(favs);
  if (recentShown.length === 0 && favsShown.length === 0) return null;
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-6">
      <Column title="Terakhir dibuka" icon={Clock} color="#0F3B59" items={recentShown} />
      <Column title="Favorit" icon={Star} color="#B45309" items={favsShown} />
    </div>
  );
}
