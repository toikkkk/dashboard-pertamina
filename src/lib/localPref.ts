// localStorage bisa melempar galat (mode privat, data situs diblokir) — dibungkus agar
// preferensi UI (sidebar, pilihan dashboard, dsb.) tidak pernah membuat halaman gagal render.
export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // preferensi tidak tersimpan; tidak masalah, nilainya hanya kenyamanan
  }
}

// Penanda "baru saja masuk" (sessionStorage): kartu login keluar ke atas, dan AppShell
// membacanya untuk memainkan gerak masuk dashboard dari bawah, jadi keduanya bersambung.
export const ENTER_FLAG = "shell.enter";

export function takeEnterFlag(): boolean {
  try {
    const v = window.sessionStorage.getItem(ENTER_FLAG);
    if (v) window.sessionStorage.removeItem(ENTER_FLAG);
    return v === "1";
  } catch {
    return false;
  }
}
