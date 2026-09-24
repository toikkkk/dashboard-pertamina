// SIMULASI SEMENTARA — sisi klien dari "multi-akun per tab" (lihat auth/session.ts).
// Aktif HANYA bila NEXT_PUBLIC_SIM_MULTI_SESSION=true. Membungkus window.fetch sekali:
//  - setiap permintaan ke /api/ membawa token sesi tab ini (sessionStorage) di header
//    x-sim-session, sehingga tiap tab bisa login sebagai akun berbeda;
//  - setelah login/daftar berhasil, token dari respons disimpan ke sessionStorage;
//  - setelah logout, token dihapus.
// Tanpa sakelar, file ini tidak melakukan apa pun. Untuk mengembalikan perilaku asli
// cukup hapus variabel env itu.
export const SIM_MULTI_SESSION = process.env.NEXT_PUBLIC_SIM_MULTI_SESSION === "true";

const KEY = "psi_sim_session_token";
const HEADER = "x-sim-session";

type PatchedWindow = Window & { __simFetchPatched?: boolean };

export function installSimSessionFetch(): void {
  if (!SIM_MULTI_SESSION || typeof window === "undefined") return;
  const w = window as PatchedWindow;
  if (w.__simFetchPatched) return;
  w.__simFetchPatched = true;

  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = url.startsWith(window.location.origin) ? url.slice(window.location.origin.length) : url;
    const isApi = path.startsWith("/api/");

    let nextInit = init;
    if (isApi) {
      let token: string | null = null;
      try {
        token = sessionStorage.getItem(KEY);
      } catch {}
      if (token) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        headers.set(HEADER, token);
        nextInit = { ...init, headers };
      }
    }

    const res = await original(input, nextInit);

    if (isApi && res.ok) {
      try {
        if (/^\/api\/auth\/(login|register)(\?|$)/.test(path)) {
          const body = await res.clone().json();
          if (body?.simToken) sessionStorage.setItem(KEY, body.simToken);
        } else if (/^\/api\/auth\/logout(\?|$)/.test(path)) {
          sessionStorage.removeItem(KEY);
        }
      } catch {}
    }
    return res;
  };
}

// Dijalankan saat modul dimuat di browser — sebelum SWR/komponen mana pun sempat fetch.
installSimSessionFetch();
