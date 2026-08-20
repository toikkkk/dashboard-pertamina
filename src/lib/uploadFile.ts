"use client";

// Shared client-side upload helper — presign → direct browser→R2 PUT → confirm.
// Used by both /upload (new documents) and the 5-Year Dilemma's "Revisi File" flow
// (ExpiringDocsTable.tsx), since both ultimately need the same "get me a real fileId
// for a File the user just picked" primitive. Never proxies the file's bytes through
// a Next.js API route — see /api/files/presign-upload's rationale (Vercel's function
// body-size ceiling).
export async function uploadFileToR2(file: File): Promise<string> {
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
    throw new Error(body.error || "Gagal menyiapkan unggahan berkas.");
  }
  const { fileId, uploadUrl } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error("Gagal mengunggah berkas ke penyimpanan.");

  await fetch(`/api/files/${fileId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  return fileId as string;
}
