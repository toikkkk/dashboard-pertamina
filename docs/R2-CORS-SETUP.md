# R2 CORS — one-time setup (blocks direct browser uploads)

## Status

**Not configured.** Verified 2026-09-17 against the live bucket `psi-moc-portal-files`.

Uploads still work today — `src/lib/uploadFile.ts` falls back to a server-side proxy
route (`POST /api/files/upload`) when the direct upload is blocked. This document is
about removing that fallback's cost, not about restoring basic functionality.

## What was measured

| Probe | Result |
|---|---|
| `GET` presigned URL, `Origin: http://localhost:3000` | `200`, `access-control-allow-origin: http://localhost:3000` |
| `OPTIONS` preflight for `PUT` (what the browser sends first) | **`403`, no `Access-Control-Allow-*` headers** |
| Server-side `PutObject`, same credentials | `200` |
| `GetBucketCors` / `PutBucketCors` with the token in `.env.local` | `AccessDenied` |

The credentials, bucket and presigning logic are all correct. Only the browser's
cross-origin `PUT` is blocked, and the API token in `.env.local` does not carry
permission to read or write the bucket's CORS policy — so **this cannot be fixed from
application code.** It needs a one-time change in the Cloudflare dashboard.

## Why it mattered

Every "Ajukan Dokumen" failed with **"Failed to fetch"**. When a browser blocks a
request at the preflight stage, `fetch()` rejects with a bare `TypeError` and no
status code — hence the vague message and no server-side log to find.

## The fix (Cloudflare dashboard)

R2 → `psi-moc-portal-files` → **Settings** → **CORS Policy** → **Add/Edit**:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://<production-domain>"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add each real origin explicitly. Avoid `"*"` here: these URLs are presigned and
short-lived, but the bucket holds confidential client safety data and there is no
reason for an arbitrary origin to be able to script uploads against it.

## Verify afterwards

```bash
pnpm tsx scripts/verify-r2-cors.ts
```

Expect `PUT PREFLIGHT status: 200` with `allow-origin` present. Uploads then return to
the direct browser→R2 path automatically — no code change, because `uploadFileToR2`
always attempts the direct `PUT` first and only falls back on a transport failure.

## Why the fallback isn't the permanent answer

The proxy route streams file bytes through a serverless function, so it is bound by the
platform request-body limit (**~4.5MB on Vercel**). Locally, and for typical documents,
that is fine. But this project's own archive contains files well past it (a 25MB PDF and
a 96MB spreadsheet are already in `file_registry`), so **large uploads will fail in
production until the CORS policy above is in place.** Treat this as required
pre-deployment work, not optional cleanup.
