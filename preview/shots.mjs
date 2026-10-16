import { chromium } from "playwright-core";

const base = "http://localhost:3000";
async function issue(items) {
  const r = await fetch(`${base}/api/v1/tokens/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, branchSlug: "emad-kafrelsheikh" }),
  });
  return r.json();
}
async function advance(orderId, to) {
  await fetch(`${base}/api/v1/orders/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, to }),
  });
}

const a = await issue("2 شاي نعناع");
const b = await issue("1 قهوة تركي زيادة");
await advance(b.order.id, "preparing");
const c = await issue("1 مانجو فريش");
await advance(c.order.id, "preparing");
await advance(c.order.id, "ready");

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mob.goto(`${base}/`, { waitUntil: "networkidle", timeout: 30000 });
await mob.screenshot({ path: "preview/01-home.png" });
await mob.goto(`${base}/dashboard`, { waitUntil: "networkidle", timeout: 30000 });
await mob.screenshot({ path: "preview/05-dashboard-mobile.png" });
await mob.goto(`${base}/t/${a.token}`, { waitUntil: "networkidle", timeout: 30000 });
await mob.screenshot({ path: "preview/03-track-received.png" });
await mob.goto(`${base}/t/${c.token}`, { waitUntil: "networkidle", timeout: 30000 });
await mob.screenshot({ path: "preview/04-track-ready.png" });
const desk = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await desk.goto(`${base}/dashboard`, { waitUntil: "networkidle", timeout: 30000 });
await desk.screenshot({ path: "preview/02-dashboard.png" });
await browser.close();
console.log("SHOTS_OK");
