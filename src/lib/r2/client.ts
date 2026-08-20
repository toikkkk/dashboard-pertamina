// Cloudflare R2 is S3-API-compatible — this is the documented way to talk to it.
// Bucket is private (no public access, no r2.dev subdomain): every read goes through
// GET /api/files/:fileId/download (302 → short-lived presigned GET), every write
// through POST /api/files/presign-upload (presigned PUT, direct browser→R2 so large
// files never pass through a Vercel function's ~4.5MB body limit).
import { S3Client } from "@aws-sdk/client-s3";

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});
