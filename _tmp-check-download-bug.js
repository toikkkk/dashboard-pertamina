const { chromium } = require("playwright");
const BASE = "https://dashboard-pertamina.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  let downloadFired = false;
  page.on("download", (d) => {
    downloadFired = true;
    console.log("!!! DOWNLOAD EVENT FIRED !!! suggestedFilename:", d.suggestedFilename(), "url:", d.url());
  });

  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.waitForSelector('input[placeholder="Email"]', { timeout: 20000 });
  await page.fill('input[placeholder="Email"]', "ir.irwan.kurniawan@gmail.com");
  await page.fill('input[placeholder="Kata Sandi"]', "Demo12345!");
  await page.click("button.font-heading:has-text('Masuk')");
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });

  await page.goto(`${BASE}/admin/registry`, { waitUntil: "load" });
  await page.waitForSelector("table tbody tr", { timeout: 20000 });

  console.log("--- Clicking 'Lihat' on first row (a PDF) ---");
  await page.fill('input[placeholder="Cari nama berkas..."]', "ECA-FT MALANG_SIGN");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  await page.click("text=Lihat");
  await page.waitForTimeout(3000);
  console.log("Download fired after clicking Lihat on PDF:", downloadFired);
  console.log("Modal visible:", await page.locator(".fixed.inset-0").count() > 0);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
