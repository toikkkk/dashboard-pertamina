// Cek pelanggaran CSP di halaman setelah login. Tidak menyimpan kredensial.
// Pakai (PowerShell):
//   $env:CSP_USER="email-atau-username"; $env:CSP_PW="sandi"; node scripts/csp-check.cjs [alamat]
// Alamat bawaan http://localhost:3100 (jalankan `npx next build` lalu `npx next start -p 3100` lebih dulu), atau isi
// https://www.psionevision.com untuk memeriksa produksi (header CSP Report-Only sudah terpasang di sana).
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "node_modules", "playwright"));
const B = (process.argv[2] || "http://localhost:3100").replace(/\/$/, "");
const user = process.env.CSP_USER, pw = process.env.CSP_PW;
if (!user || !pw) { console.error("Isi CSP_USER dan CSP_PW"); process.exit(1); }

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const viol = [];
  p.on("console", (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) viol.push(t.slice(0, 300)); });
  await p.goto(B + "/login", { waitUntil: "load" });
  const status = await p.evaluate(async ([identifier, password]) => {
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
    return r.status;
  }, [user, pw]);
  console.log("login:", status);
  if (status !== 200) { await b.close(); process.exit(2); }
  const pages = ["/", "/?d=moc", "/directory", "/moc", "/sampah", "/pengaturan", "/registry", "/admin/users", "/upload"];
  for (const u of pages) {
    await p.goto(B + u, { waitUntil: "load" });
    await p.waitForTimeout(2000);
    console.log(u.padEnd(14), "->", p.url().replace(B, "") || "/");
  }
  // pratinjau dokumen (PDF dan Excel dari R2) dan satu MOC: ambil id nyata lewat API sesi ini
  const ids = await p.evaluate(async () => {
    const out = { pdf: null, xls: null, moc: null };
    try {
      const bs = await (await fetch("/api/bootstrap")).json();
      const docs = bs.allDocuments || bs.documents || [];
      const kind = (d) => String(d.fileUrl || d.fileName || "").toLowerCase();
      out.pdf = (docs.find((d) => kind(d).includes(".pdf")) || {}).id || null;
      out.xls = (docs.find((d) => /\.xls/.test(kind(d))) || {}).id || null;
      if (!out.pdf && !out.xls && docs[0]) out.pdf = docs[0].id;
    } catch {}
    try {
      const m = await (await fetch("/api/moc")).json();
      const list = Array.isArray(m) ? m : m.items || m.mocs || [];
      out.moc = (list[0] || {}).id || null;
    } catch {}
    return out;
  });
  console.log("id uji:", JSON.stringify(ids));
  const targets = [ids.pdf && "/document/" + ids.pdf, ids.xls && "/document/" + ids.xls, ids.moc && "/moc/" + ids.moc, ids.moc && "/moc/" + ids.moc + "/cetak"].filter(Boolean);
  for (const u of targets) {
    await p.goto(B + u, { waitUntil: "load" });
    await p.waitForTimeout(5000);
    console.log(u.padEnd(46), "iframe:", await p.locator("iframe").count(), "tabel:", await p.locator("table").count());
  }
  console.log("\nPELANGGARAN CSP:", viol.length);
  [...new Set(viol)].forEach((v) => console.log(" -", v));
  await b.close();
  process.exit(viol.length ? 3 : 0);
})().catch((e) => { console.error("GAGAL", e.message); process.exit(1); });
