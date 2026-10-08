// Uji asap keamanan (tanpa dependensi): menembak rute API TANPA login dan memastikan semuanya menolak
// (401/403/404), serta (opsional) memeriksa isi /api/bootstrap untuk dua akun.
//   node scripts/security-smoke.cjs [BASE_URL]
//   Opsional env: SMOKE_USER_EMAIL / SMOKE_USER_PASSWORD (user biasa berlokasi) — memeriksa bahwa
//   daftar user di bootstrap hanya rekan sekantor dan TANPA email. Tidak mengubah data apa pun.
const BASE = process.argv[2] || "http://localhost:3000";
const UUID = "00000000-0000-0000-0000-000000000000";

const ROUTES = [
  ["GET", "/api/documents"],
  ["GET", "/api/documents?scope=all"],
  ["POST", "/api/documents", {}],
  ["POST", "/api/documents/move", { ids: [UUID], categoryId: UUID }],
  ["PATCH", `/api/documents/${UUID}`, { categoryId: null }],
  ["POST", `/api/documents/${UUID}/revise`, {}],
  ["GET", `/api/documents/${UUID}`],
  ["GET", `/api/files/${UUID}/download`],
  ["POST", "/api/files/presign-upload", {}],
  ["GET", "/api/users"],
  ["GET", "/api/admin/audit"],
  ["PATCH", `/api/admin/users/${UUID}`, {}],
  ["DELETE", `/api/admin/users/${UUID}`],
  ["GET", "/api/registry"],
  ["POST", `/api/registry/${UUID}/link`, {}],
  ["GET", "/api/directory/overview"],
  ["GET", "/api/document-categories?location=FT%20Malang"],
  ["GET", "/api/document-categories/summary"],
  ["GET", "/api/moc"],
  ["POST", "/api/moc", {}],
  ["GET", "/api/compliance-metrics"],
  ["POST", "/api/auth/mfa/setup", {}],
  ["POST", "/api/auth/mfa/enable", { code: "123456" }],
  ["POST", "/api/auth/mfa/disable", { password: "x", code: "123456" }],
  ["GET", "/api/auth/mfa/status"],
  ["POST", `/api/admin/users/${UUID}/mfa-reset`, {}],
  ["POST", "/api/auth/resend-verification", {}],
];

(async () => {
  let bad = 0;
  for (const [method, path, body] of ROUTES) {
    const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const ok = [401, 403, 404].includes(res.status);
    if (!ok) bad++;
    console.log(`${ok ? "OK  " : "GAGAL"} ${String(res.status).padEnd(4)} ${method.padEnd(6)} ${path}`);
  }
  // /api/bootstrap tanpa sesi: tidak boleh membawa dokumen/user.
  const b = await (await fetch(BASE + "/api/bootstrap")).json();
  const empty = !b.user && (b.documents ?? []).length === 0 && (b.allDocuments ?? []).length === 0 && (b.users ?? []).length === 0;
  if (!empty) bad++;
  console.log(`${empty ? "OK  " : "GAGAL"} bootstrap tanpa sesi tidak membawa data`);

  const email = process.env.SMOKE_USER_EMAIL;
  const password = process.env.SMOKE_USER_PASSWORD;
  if (email && password) {
    const login = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: email, password }) });
    const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
    const data = await (await fetch(BASE + "/api/bootstrap", { headers: { cookie } })).json();
    const me = data.user;
    const users = data.users ?? [];
    if (me && !me.isRegionalAdmin) {
      const noEmail = users.every((u) => u.email === undefined);
      const sameLoc = users.every((u) => u.location === me.location);
      if (!noEmail || !sameLoc) bad++;
      console.log(`${noEmail ? "OK  " : "GAGAL"} user biasa tidak menerima email rekan (${users.length} user diterima)`);
      console.log(`${sameLoc ? "OK  " : "GAGAL"} user biasa hanya menerima rekan satu lokasi (${me.location})`);
    } else console.log("(akun uji adalah admin — pemeriksaan daftar user dilewati)");
  }
  console.log(bad === 0 ? "\nSEMUA LOLOS" : `\n${bad} PEMERIKSAAN GAGAL`);
  process.exit(bad === 0 ? 0 : 1);
})().catch((e) => { console.error("FATAL", e.message); process.exit(2); });
