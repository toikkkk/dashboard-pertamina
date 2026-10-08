"use client";

// "Terakhir dibuka" dan "Favorit" per akun, disimpan di browser (localStorage) — murni kenyamanan
// per-viewer, bukan data bersama: tidak ikut ke perangkat lain dan boleh hilang. Kuncinya memuat id
// user supaya dua akun di satu browser tidak saling melihat daftar. Entri yang dokumennya sudah
// dihapus disaring oleh pemanggil (dicocokkan dengan daftar dokumen), bukan di sini.
import { useCallback, useEffect, useState } from "react";
import { readPref, writePref } from "@/lib/localPref";

export interface DocRef {
  id: string;
  title: string;
  location: string;
  number: string;
  category: string | null;
  ts: number;
}

const MAX_RECENT = 12;
const MAX_FAVS = 60;
const EVENT = "psi:docrefs";

const key = (userId: string, kind: "recent" | "favs") => `psi.${kind}.${userId}`;

function load(userId: string, kind: "recent" | "favs"): DocRef[] {
  const raw = readPref(key(userId, kind));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.id === "string") : [];
  } catch {
    return [];
  }
}

function save(userId: string, kind: "recent" | "favs", list: DocRef[]) {
  writePref(key(userId, kind), JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

/** Catat satu dokumen sebagai baru dibuka (dipanggil dari halaman dokumen). */
export function recordOpened(userId: string, ref: Omit<DocRef, "ts">) {
  const next = [{ ...ref, ts: Date.now() }, ...load(userId, "recent").filter((r) => r.id !== ref.id)].slice(0, MAX_RECENT);
  save(userId, "recent", next);
}

export function useDocRefs(userId: string | null) {
  const [recent, setRecent] = useState<DocRef[]>([]);
  const [favs, setFavs] = useState<DocRef[]>([]);

  const refresh = useCallback(() => {
    if (!userId) {
      setRecent([]);
      setFavs([]);
      return;
    }
    setRecent(load(userId, "recent"));
    setFavs(load(userId, "favs"));
  }, [userId]);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const isFav = useCallback((id: string) => favs.some((f) => f.id === id), [favs]);

  const toggleFav = useCallback(
    (ref: Omit<DocRef, "ts">) => {
      if (!userId) return;
      const cur = load(userId, "favs");
      const next = cur.some((f) => f.id === ref.id) ? cur.filter((f) => f.id !== ref.id) : [{ ...ref, ts: Date.now() }, ...cur].slice(0, MAX_FAVS);
      save(userId, "favs", next);
    },
    [userId]
  );

  return { recent, favs, isFav, toggleFav };
}
