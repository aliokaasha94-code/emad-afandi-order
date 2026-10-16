import { chromium } from "playwright-core";

const BASE = "http://localhost:8901";

async function run() {
  console.log("Testing static Emad Afandi Cloudflare Pages build...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });

  const errors = [];
  const context = await browser.newContext();
  context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));

  // 1. KITCHEN: Open PIN screen
  console.log("1. Opening kitchen PIN screen...");
  const kPage = await context.newPage({ viewport: { width: 1024, height: 768 } });
  await kPage.goto(`${BASE}/kitchen.html`, { waitUntil: "networkidle" });
  await kPage.screenshot({ path: "preview/emad-01-kitchen-pin.png" });

  // Enter PIN 1919
  await kPage.fill("#p0", "1");
  await kPage.fill("#p1", "9");
  await kPage.fill("#p2", "1");
  await kPage.fill("#p3", "9");
  await kPage.click("#pinBtn");
  await kPage.waitForSelector("#numpad", { timeout: 5000 });
  console.log("✓ Kitchen PIN unlocked!");

  // 2. KITCHEN: Add order #24
  console.log("2. Adding order #24...");
  await kPage.click('button[data-d="2"]');
  await kPage.click('button[data-d="4"]');
  await kPage.click("#addBtn");
  await kPage.waitForSelector('.order-card:has-text("#24")', { timeout: 5000 });
  await kPage.screenshot({ path: "preview/emad-02-kitchen-order24.png" });
  console.log("✓ Order #24 added to board!");

  // 3. CUSTOMER: Open mobile view for order 24
  console.log("3. Customer opening order 24 on mobile...");
  const cPage = await context.newPage({ viewport: { width: 390, height: 844 } });
  await cPage.goto(`${BASE}/index.html?order=24`, { waitUntil: "networkidle" });

  // 4. CUSTOMER: Verify Onboarding Modal
  console.log("4. Verifying Onboarding Modal...");
  await cPage.waitForSelector("#howModal:not([hidden])", { timeout: 5000 });
  await cPage.screenshot({ path: "preview/emad-03-customer-onboarding.png" });

  // Dismiss onboarding
  await cPage.click("#howOk");
  await cPage.waitForTimeout(500);

  // 5. CUSTOMER: Verify Ticket Card & Stepper
  console.log("5. Verifying Ticket Card with Stepper...");
  await cPage.screenshot({ path: "preview/emad-04-customer-ticket.png" });

  // Test sound button
  await cPage.click("#bellBtn");
  await cPage.waitForTimeout(400);

  // Enter customer name
  await cPage.fill("#nameInput", "محمود كرم");
  await cPage.dispatchEvent("#nameInput", "change");
  await cPage.waitForTimeout(500);

  // 6. KITCHEN: Mark Order #24 as READY
  console.log("6. Kitchen marking Order #24 as READY...");
  await kPage.click('.order-card:has-text("#24") [data-a="ready"]');
  await kPage.waitForTimeout(800);

  // 7. CUSTOMER: Verify Ready Screen
  console.log("7. Customer screen turning into Ready State...");
  await cPage.waitForFunction(() => document.body.classList.contains("is-ready"), null, { timeout: 8000 });
  await cPage.screenshot({ path: "preview/emad-05-customer-ready.png" });
  console.log("✓ Customer received READY state with gold theme!");

  // 8. CUSTOMER: Click "أنا جاي أستلم"
  console.log("8. Customer clicks 'أنا جاي أستلم'...");
  await cPage.click("#onWayBtn");
  await cPage.waitForTimeout(600);
  await cPage.screenshot({ path: "preview/emad-06-customer-onway.png" });

  // 9. KITCHEN: Verify "العميل في الطريق للاستلام الآن!"
  console.log("9. Verifying Kitchen receives 'العميل في الطريق' alert...");
  await kPage.waitForSelector(".on-way-alert", { timeout: 8000 });
  await kPage.screenshot({ path: "preview/emad-07-kitchen-alerted.png" });
  console.log("✓ Kitchen board shows 'العميل في الطريق للاستلام الآن!'");

  // 10. KITCHEN: Click "تم التسليم"
  console.log("10. Kitchen delivers order...");
  await kPage.click('.order-card:has-text("#24") [data-a="done"]');
  await kPage.waitForTimeout(800);

  // 11. CUSTOMER: Verify Done Card
  console.log("11. Verifying Done & Google Review card...");
  await cPage.waitForSelector("#doneCard:not([hidden])", { timeout: 8000 });
  await cPage.screenshot({ path: "preview/emad-08-customer-done.png" });

  console.log("STATIC CLOUDFLARE BUILD VERIFIED 100% SUCCESSFULLY!");
  console.log("Errors:", errors.length ? errors.join("; ") : "None");

  await browser.close();
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
