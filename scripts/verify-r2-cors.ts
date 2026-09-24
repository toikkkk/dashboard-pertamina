// Checks whether the R2 bucket's CORS policy allows the browser's direct upload PUT.
// Run after configuring CORS in the Cloudflare dashboard (see docs/R2-CORS-SETUP.md).
//
// Exists because the failure it detects is invisible from application logs: when a
// browser blocks a request at the preflight stage, fetch() rejects with a bare
// TypeError and no status code, so the only way to confirm the cause is to send the
// preflight yourself, exactly as the browser would.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ORIGIN = process.env.VERIFY_ORIGIN ?? "http://localhost:3000";

async function main() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket || !process.env.R2_ENDPOINT) {
    console.error("R2_BUCKET_NAME / R2_ENDPOINT missing from .env.local");
    process.exit(1);
  }

  const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: bucket,
      Key: "documents/app-uploads/_cors-check/probe.pdf",
      ContentType: "application/pdf",
    }),
    { expiresIn: 120 }
  );

  const res = await fetch(url, {
    method: "OPTIONS",
    headers: {
      Origin: ORIGIN,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });

  const allowOrigin = res.headers.get("access-control-allow-origin");
  console.log(`Bucket:   ${bucket}`);
  console.log(`Origin:   ${ORIGIN}`);
  console.log(`Preflight status: ${res.status}`);
  console.log(`  allow-origin : ${allowOrigin ?? "(ABSENT)"}`);
  console.log(`  allow-methods: ${res.headers.get("access-control-allow-methods") ?? "(ABSENT)"}`);

  if (res.ok && allowOrigin) {
    console.log("\nPASS — direct browser->R2 uploads will work for this origin.");
  } else {
    console.log(
      "\nFAIL — the browser will block the upload PUT and the UI would show " +
        '"Failed to fetch".\nUploads currently survive only via the server-proxy ' +
        "fallback (POST /api/files/upload), which is subject to the platform's\n" +
        "~4.5MB body limit. See docs/R2-CORS-SETUP.md."
    );
    process.exitCode = 1;
  }
}

main();
