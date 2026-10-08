"use client";

// Shared client-side upload helper.
//
// Primary path: presign -> direct browser->R2 PUT -> confirm. That avoids sending
// file bytes through a serverless function, which matters because several real files
// in this domain exceed Vercel's ~4.5MB request-body ceiling.
//
// Fallback path (added 2026-09-17): the direct PUT currently fails in the browser
// because the R2 bucket has no CORS policy — the mandatory OPTIONS preflight against
// the presigned PUT URL returns 403 with no Access-Control-Allow-* headers, so the
// browser blocks the request and `fetch` rejects with a bare TypeError. That is what
// surfaced in the UI as "Failed to fetch" on every "Ajukan Dokumen". Verified
// directly: preflight 403 / ACAO absent, while an identical server-side PutObject
// with the same credentials returns 200. The API token in .env.local also cannot
// install a CORS policy (PutBucketCors -> AccessDenied), so this can't be fixed in
// code alone — see docs/R2-CORS-SETUP.md for the one-time dashboard step.
//
// The direct PUT is still attempted FIRST and only falls back to the server proxy on
// a network/CORS-class failure. Once CORS is configured, uploads silently return to
// the direct path with no code change. A genuine HTTP error from R2 (403 expired
// signature, 5xx) is NOT treated as a CORS symptom — those still throw, so a real
// storage misconfiguration stays visible instead of being masked by the fallback.
export interface UploadOptions {
  /** Dipanggil berulang dengan 0..1 selama byte berkas dikirim (progres sungguhan, bukan perkiraan). */
  onProgress?: (fraction: number) => void;
  /** Membatalkan unggahan yang sedang berjalan (kartu progres bergaya Drive). */
  signal?: AbortSignal;
}

export async function uploadFileToR2(file: File, opts: UploadOptions = {}): Promise<string> {
  try {
    return await uploadViaPresignedPut(file, opts);
  } catch (err) {
    if (!isLikelyCorsOrNetworkFailure(err)) throw err;
    // Preflight/network-blocked: retry through the server, which has no CORS gate.
    opts.onProgress?.(0);
    return await uploadViaServerProxy(file, opts);
  }
}

// fetch() belum punya progres unggah, jadi byte dikirim lewat XHR. Network/CORS gagal → status 0.
function xhrSend(
  method: "PUT" | "POST",
  url: string,
  body: XMLHttpRequestBodyInit,
  headers: Record<string, string>,
  opts: UploadOptions
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) return reject(new DOMException("Dibatalkan", "AbortError"));
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => resolve({ status: 0, text: "" });
    xhr.onabort = () => reject(new DOMException("Dibatalkan", "AbortError"));
    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}

class R2TransportError extends Error {}

function isLikelyCorsOrNetworkFailure(err: unknown): boolean {
  return err instanceof R2TransportError;
}

async function uploadViaPresignedPut(file: File, opts: UploadOptions): Promise<string> {
  const presignRes = await fetch("/api/files/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  });
  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => ({}));
    // A rejected presign is a real, actionable server response (e.g. disallowed file
    // type) — surface it as-is rather than retrying through the proxy, which would
    // reject it identically.
    throw new Error(body.error || "Gagal menyiapkan unggahan berkas.");
  }
  const { fileId, uploadUrl } = await presignRes.json();

  const put = await xhrSend("PUT", uploadUrl, file, { "Content-Type": file.type || "application/octet-stream" }, opts);
  // Status 0 (bukan respons non-2xx) = tanda CORS/preflight atau offline — kasus yang dilayani fallback.
  if (put.status === 0) throw new R2TransportError("Unggahan langsung ke penyimpanan diblokir.");
  if (put.status < 200 || put.status >= 300) throw new Error("Gagal mengunggah berkas ke penyimpanan.");

  const confirmRes = await fetch(`/api/files/${fileId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  // Previously unchecked: a failed confirm left the row 'pending', and
  // /api/files/:id/download 404s on any non-'uploaded' row — so the document saved
  // successfully but its file was permanently unviewable, with no error shown.
  if (!confirmRes.ok) {
    const body = await confirmRes.json().catch(() => ({}));
    throw new Error(body.error || "Berkas terunggah tetapi gagal dikonfirmasi.");
  }

  return fileId as string;
}

async function uploadViaServerProxy(file: File, opts: UploadOptions): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await xhrSend("POST", "/api/files/upload", form, {}, opts);
  let body: { error?: string; fileId?: string } = {};
  try { body = JSON.parse(res.text); } catch { /* respons bukan JSON */ }
  if (res.status < 200 || res.status >= 300 || !body.fileId) throw new Error(body.error || "Gagal mengunggah berkas.");
  return body.fileId;
}
