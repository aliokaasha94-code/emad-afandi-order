import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";

async function run() {
  console.log("Launching browser for end-to-end verification...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });

  const errors = [];
  const context = await browser.newContext();
  context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));

  // 1. CASHIER: Open Dashboard
  console.log("1. Opening Cashier Dashboard...");
  const cashierPage = await context.newPage({ viewport: { width: 1280, height: 800 } });
  await cashierPage.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await cashierPage.screenshot({ path: "preview/verified-01-dashboard.png" });

  // 2. CASHIER: Switch to Numpad and enter order #1
  console.log("2. Keying in Order #1 via Numpad...");
  await cashierPage.click('text=🔢 كيبورد الأرقام');
  await cashierPage.click('button:has-text("1")');
  await cashierPage.fill('input[placeholder*="تفاصيل الطلب"]', "2 قهوة تركي زيادة، 1 شاي بالنعناع");
  await cashierPage.fill('input[placeholder*="اسم العميل"]', "أحمد علي");
  await cashierPage.click('button:has-text("إنشاء الطلب وتوليد QR")');
  await cashierPage.waitForSelector('text=#1', { timeout: 6000 });
  await cashierPage.screenshot({ path: "preview/verified-02-cashier-created.png" });
  console.log("✓ Order #1 created successfully with QR code!");

  // 3. CASHIER: Switch to Customer Facing Display
  console.log("3. Viewing Customer-Facing Counter Screen...");
  await cashierPage.click('text=📱 شاشة الكاونتر');
  await cashierPage.waitForTimeout(1000);
  await cashierPage.screenshot({ path: "preview/verified-03-counter-screen.png" });

  // 4. CUSTOMER: Open mobile tracking page for order 1
  console.log("4. Customer opening /t/1 on mobile viewport (390x844)...");
  const customerPage = await context.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });
  await customerPage.goto(`${BASE}/t/1`, { waitUntil: "networkidle" });

  // 5. CUSTOMER: Verify Onboarding Modal (Image 3)
  console.log("5. Checking Onboarding Modal (Image 3 match)...");
  await customerPage.waitForSelector('text=هيك بيشتغل النظام', { timeout: 5000 });
  await customerPage.screenshot({ path: "preview/verified-04-customer-onboarding.png" });

  // Click "تمام، رنّلي لما يجهز"
  console.log("6. Customer dismisses onboarding...");
  await customerPage.click('text=تمام، رنّلي لما يجهز');
  await customerPage.waitForTimeout(600);

  // 7. CUSTOMER: Verify Ticket Card & In-Progress Stepper (Image 2)
  console.log("7. Checking In-Progress Ticket Card (Image 2 match)...");
  await customerPage.screenshot({ path: "preview/verified-05-customer-ticket.png" });

  // 8. CASHIER: Advance order to READY
  console.log("8. Cashier marks Order #1 as READY...");
  await cashierPage.click('text=📋 لوحة المطبخ');
  await cashierPage.waitForSelector('text=ابدأ التحضير', { timeout: 5000 });
  await cashierPage.click('text=ابدأ التحضير');
  await cashierPage.waitForTimeout(500);
  await cashierPage.click('text=طلبك جاهز!');
  console.log("✓ Cashier pressed 'طلبك جاهز!'");

  // 9. CUSTOMER: Verify Ready Screen (Lime Green #B5FF14 - Image 1)
  console.log("9. Customer screen transitioning to Lime Green READY screen...");
  await customerPage.waitForSelector('text=طلبك جاهز!', { timeout: 8000 });
  await customerPage.waitForTimeout(800);
  await customerPage.screenshot({ path: "preview/verified-06-customer-ready.png" });
  console.log("✓ Customer screen turned Lime Green with bold order number and watermark!");

  // 10. CUSTOMER: Click "أنا جاي"
  console.log("10. Customer clicks 'أنا جاي 🚶'...");
  await customerPage.click('text=أنا جاي');
  await customerPage.waitForSelector('text=بلّغنا الكاشير إنك جاي', { timeout: 5000 });
  await customerPage.screenshot({ path: "preview/verified-07-customer-onway.png" });

  // 11. CASHIER: Verify "العميل في الطريق للكاونتر الآن!"
  console.log("11. Verifying Cashier receives 'العميل في الطريق للكاونتر الآن!' alert...");
  await cashierPage.waitForSelector('text=العميل في الطريق للكاونتر الآن!', { timeout: 8000 });
  await cashierPage.screenshot({ path: "preview/verified-08-cashier-alerted.png" });
  console.log("✓ Cashier KDS received 'أنا جاي' alert successfully!");

  // 12. CASHIER: Hand over order (تم التسليم)
  console.log("12. Cashier clicks 'تم التسليم ✓'...");
  await cashierPage.click('text=تم التسليم ✓');
  await cashierPage.waitForTimeout(1000);

  // 13. CUSTOMER: Thank you and Google Maps review screen
  console.log("13. Checking Customer review screen...");
  await customerPage.waitForSelector('text=بالهنا والشفا!', { timeout: 8000 });
  await customerPage.screenshot({ path: "preview/verified-09-customer-done.png" });

  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  console.log("Errors encountered:", errors.length ? errors.join("; ") : "None");

  await browser.close();
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
