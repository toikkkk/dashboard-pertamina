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
