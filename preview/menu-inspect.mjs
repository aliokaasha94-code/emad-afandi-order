import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("https://emad-menu-app.pages.dev/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "preview/menu-ref.png", fullPage: false });

const info = await page.evaluate(() => {
  const out = { title: document.title, fonts: [], images: [], bg: [], cssVars: {}, links: [] };
  document.querySelectorAll('link[rel="stylesheet"], link[href*="font"]').forEach((l) => {
    if (l.href) out.links.push(l.href.slice(0, 160));
  });
  document.querySelectorAll("img").forEach((img) => {
    out.images.push({ src: img.src.slice(0, 200), alt: img.alt, w: img.naturalWidth, h: img.naturalHeight });
  });
  const els = [document.body, ...document.querySelectorAll("header, h1, button, a")];
  const seen = new Set();
  els.slice(0, 25).forEach((el) => {
    const cs = getComputedStyle(el);
    const key = el.tagName + "|" + cs.backgroundColor + "|" + cs.color + "|" + cs.fontFamily.slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      out.bg.push({ tag: el.tagName, cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 60), bg: cs.backgroundColor, color: cs.color, font: cs.fontFamily.slice(0, 80) });
    }
  });
  for (const s of document.styleSheets) {
    try {
      for (const r of s.cssRules) {
        if (r.selectorText === ":root" || r.selectorText?.includes("root")) {
          for (let i = 0; i < r.style.length; i++) {
            const p = r.style[i];
            if (p.startsWith("--")) out.cssVars[p] = r.style.getPropertyValue(p).trim();
          }
        }
      }
    } catch { /* cross-origin */ }
  }
  return out;
});
console.log(JSON.stringify(info, null, 1).slice(0, 4000));
await browser.close();
console.log("MENU_INSPECT_DONE");
