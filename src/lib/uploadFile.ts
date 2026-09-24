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
export async function uploadFileToR2(file: File): Promise<string> {
  try {
    return await uploadViaPresignedPut(file);
  } catch (err) {
    if (!isLikelyCorsOrNetworkFailure(err)) throw err;
    // Preflight/network-blocked: retry through the server, which has no CORS gate.
    return await uploadViaServerProxy(file);
  }
}

class R2TransportError extends Error {}

function isLikelyCorsOrNetworkFailure(err: unknown): boolean {
  return err instanceof R2TransportError;
}

async function uploadViaPresignedPut(file: File): Promise<string> {
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

  let putRes: Response;
  try {
    putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
  } catch {
    // fetch() rejecting (rather than resolving non-2xx) is the CORS/preflight or
    // offline signature — this is the case the fallback exists for.
    throw new R2TransportError("Unggahan langsung ke penyimpanan diblokir.");
  }
  if (!putRes.ok) throw new Error("Gagal mengunggah berkas ke penyimpanan.");

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

async function uploadViaServerProxy(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/files/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Gagal mengunggah berkas.");
  }
  const { fileId } = await res.json();
  return fileId as string;
}
