import { chromium } from "playwright-core";

const base = "http://localhost:8901";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

const t = await ctx.newPage();
await t.goto(`${base}/take.html`, { waitUntil: "networkidle", timeout: 30000 });
await t.click("#takeBtn");
await t.waitForURL(/index\.html\?order=/, { timeout: 8000 });
console.log("STORE_T=" + (await t.evaluate(() => localStorage.getItem("emad_orders_v1"))));

const k = await ctx.newPage();
k.on("pageerror", (e) => console.log("K_PAGEERROR=" + e.message));
k.on("console", (m) => { if (m.type() === "error") console.log("K_CONSOLE=" + m.text().slice(0, 200)); });
await k.goto(`${base}/kitchen.html`, { waitUntil: "networkidle", timeout: 30000 });
console.log("STORE_K_BEFORE=" + (await k.evaluate(() => localStorage.getItem("emad_orders_v1"))));
await k.fill("#p0", "1"); await k.fill("#p1", "9"); await k.fill("#p2", "1"); await k.fill("#p3", "9");
await k.click("#pinBtn");
await k.waitForSelector("#numpad", { timeout: 5000 });
await k.waitForTimeout(3000);
console.log("STORE_K_AFTER=" + (await k.evaluate(() => localStorage.getItem("emad_orders_v1"))));
console.log("CARDS=" + (await k.locator(".order-card").count()));
console.log("ORDERS_HTML=" + ((await k.innerHTML("#orders")) || "").slice(0, 200));
await browser.close();
console.log("PROBE_DONE");
