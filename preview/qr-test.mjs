import { chromium } from "playwright-core";

const base = "http://localhost:8901";
const errors = [];
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
ctx.on("page", (p) => p.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message)));

// 1) وضع الـ scan: take.html → رقم عشوائي
const t = await ctx.newPage();
await t.goto(`${base}/take.html`, { waitUntil: "networkidle", timeout: 30000 });
await t.screenshot({ path: "preview/pg-take.png" });
await t.click("#takeBtn");
await t.waitForURL(/index\.html\?order=/, { timeout: 8000 });
const takeNum = new URL(t.url()).searchParams.get("order");
console.log("TAKE_RANDOM_NUM=" + takeNum);
const prep = await t.textContent("#statusLine");
console.log("TAKE_PREPARING=" + (prep.includes("بيتعمل") ? "OK" : "FAIL"));

// 2) العميل يسيب رقم واتساب
await t.fill("#phoneInput", "01012345678");
await t.dispatchEvent("#phoneInput", "change");
await t.click("#bellBtn");

// 3) المطبخ: PIN → الكارت فيه QR + واتساب
const k = await ctx.newPage();
await k.goto(`${base}/kitchen.html`, { waitUntil: "networkidle", timeout: 30000 });
await k.fill("#p0", "1"); await k.fill("#p1", "9"); await k.fill("#p2", "1"); await k.fill("#p3", "9");
await k.click("#pinBtn");
await k.waitForSelector(".order-card", { timeout: 8000 });
await k.waitForSelector('.order-card a.btn-wa[href^="https://wa.me/201012345678"]', { timeout: 10000 });
console.log("KITCHEN_WA=OK");
const qrCount = await k.locator("img.qr").count();
console.log("KITCHEN_QR_COUNT=" + qrCount);
const takeLink = await k.locator("#copyTake").count();
console.log("TAKE_LINK=" + (takeLink === 1 ? "OK" : "FAIL"));
await k.screenshot({ path: "preview/pg-kitchen-qr.png", fullPage: true });

// 4) زرار نسخ لينك العميل
await k.click(".order-card [data-a='copy']");
await k.waitForFunction(() => document.querySelector(".order-card [data-a='copy']").textContent.includes("تم النسخ"), null, { timeout: 5000 });
console.log("COPY_BTN=OK");

console.log("JS_ERRORS=" + (errors.length ? errors.join(" | ") : "none"));
await browser.close();
console.log("QR_TEST_DONE");
