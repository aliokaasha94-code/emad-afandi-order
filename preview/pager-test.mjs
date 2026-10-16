import { chromium } from "playwright-core";

const base = "http://localhost:8901";
const errors = [];
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
ctx.on("page", (p) => p.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message)));

// 1) المطبخ: PIN
const k = await ctx.newPage();
await k.goto(`${base}/kitchen.html`, { waitUntil: "networkidle", timeout: 30000 });
await k.screenshot({ path: "preview/pg-kitchen-pin.png" });
await k.fill("#p0", "1"); await k.fill("#p1", "9"); await k.fill("#p2", "1"); await k.fill("#p3", "9");
await k.click("#pinBtn");
await k.waitForSelector("#numpad", { timeout: 5000 });

// 2) إضافة أوردر 24 من الـ numpad
await k.click('button[data-d="2"]');
await k.click('button[data-d="4"]');
await k.click("#addBtn");
await k.waitForSelector(".order-card", { timeout: 5000 });
console.log("KITCHEN_ADD_OK");

// 3) العميل يفتح ?order=24
const c = await ctx.newPage();
await c.goto(`${base}/index.html?order=24`, { waitUntil: "networkidle", timeout: 30000 });
const prep = await c.textContent("#statusLine");
console.log("CUSTOMER_PREPARING=" + (prep.includes("بيتعمل") ? "OK" : "FAIL:" + prep));
// كارت الشرح يظهر أول مرة ويتقفل
console.log("HOW_CARD=" + (await c.locator("#howCard:not([hidden])").count() === 1 ? "OK" : "FAIL"));
await c.click("#howOk");
console.log("HOW_DISMISS=" + (await c.locator("#howCard:not([hidden])").count() === 0 ? "OK" : "FAIL"));
await c.screenshot({ path: "preview/pg-customer-preparing.png" });

// 4) الجرس يدق مع كل ضغطة.. دوس مرتين واتأكد إنه شغال ومفتوح
await c.click("#bellBtn");
await c.click("#bellBtn");
const bellTxt = await c.textContent("#bellBtn");
const bellEnabled = await c.locator("#bellBtn").isEnabled();
console.log("BELL_REPLAY=" + (bellTxt.includes("شغال") && bellEnabled ? "OK" : "FAIL:" + bellTxt));
await k.click('.order-card [data-a="ready"]');
await c.waitForFunction(() => document.body.classList.contains("is-ready"), null, { timeout: 8000 });
const readyTxt = await c.textContent("#statusLine");
console.log("CUSTOMER_READY=" + (readyTxt.includes("طلبك جهز") ? "OK" : "FAIL"));
await c.screenshot({ path: "preview/pg-customer-ready.png" });
await k.screenshot({ path: "preview/pg-kitchen-main.png" });

// 5) إعادة النداء ثم التسليم
await k.click('.order-card [data-a="recall"]');
await k.click('.order-card [data-a="done"]');
await c.waitForSelector("#doneCard:not([hidden])", { timeout: 8000 });
await c.waitForTimeout(1000);
console.log("CUSTOMER_DONE=OK");
await c.screenshot({ path: "preview/pg-customer-done.png" });

console.log("JS_ERRORS=" + (errors.length ? errors.join(" | ") : "none"));
await browser.close();
console.log("PAGER_TEST_DONE");
