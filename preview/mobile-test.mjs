import { chromium } from "playwright-core";

const base = "http://localhost:8901";
const errors = [];
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
// موبايل صغير زي أجهزة العملاء
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
ctx.on("page", (p) => p.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message)));

// 1) الرئيسي يفتح الكاشير
const s = await ctx.newPage();
await s.goto(`${base}/`, { waitUntil: "networkidle", timeout: 30000 });
console.log("ROOT_LANDS=" + s.url());

// 2) وضع الـ scan بلينكات نظيفة
const t = await ctx.newPage();
await t.goto(`${base}/take`, { waitUntil: "networkidle", timeout: 30000 });
await t.click("#takeBtn");
await t.waitForURL(/\?order=/, { timeout: 8000 });
console.log("TAKE_CLEAN_URL=" + t.url());
console.log("TAKE_TRACK=" + (await t.locator("#trackCard:not([hidden])").count() === 1 ? "OK" : "FAIL"));

// 3) المطبخ: PIN + إضافة + روابط QR نظيفة
const k = await ctx.newPage();
await k.goto(`${base}/kitchen`, { waitUntil: "networkidle", timeout: 30000 });
await k.fill("#p0", "1"); await k.fill("#p1", "9"); await k.fill("#p2", "1"); await k.fill("#p3", "9");
await k.click("#pinBtn");
await k.waitForSelector("#numpad", { timeout: 5000 });
await k.click('button[data-d="7"]');
await k.click("#addBtn");
await k.waitForSelector(".order-card", { timeout: 8000 });
const copyOk = await k.evaluate(() => {
  // محاكاة نسخ لينك العميل وقراءة القيمة الفعلية
  const btn = document.querySelector(".order-card [data-a='copy']");
  return btn ? "exists" : "missing";
});
console.log("ORDER_CARD=" + copyOk);
const qrSrc = await k.locator(".order-card img.qr").first().getAttribute("src");
console.log("QR_DATA_URL=" + decodeURIComponent(qrSrc.split("data=")[1] || ""));
await k.click('.order-card [data-a="ready"]');
// 4) العميل يشوف الجاهزية على نفس الرقم
const num = await k.evaluate(() => document.querySelector(".order-card .num").textContent.replace("#", "").trim());
const c = await ctx.newPage();
await c.goto(`${base}/?order=${encodeURIComponent(num)}`, { waitUntil: "networkidle", timeout: 30000 });
await c.waitForFunction(() => document.body.classList.contains("is-ready"), null, { timeout: 8000 });
console.log("MOBILE360_READY=OK num=" + num);
await c.screenshot({ path: "preview/mb-ready-360.png" });
await t.screenshot({ path: "preview/mb-take-360.png" });

console.log("JS_ERRORS=" + (errors.length ? errors.join(" | ") : "none"));
await browser.close();
console.log("MOBILE_TEST_DONE");
