/* ============================================================
   المنادي الذكي - عماد أفندي | take.js
   الوضع الأول: العميل يمسح QR الكاشير → رقم عشوائي متاح فوراً
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.EMAD_CONFIG || {};
  const btn = document.getElementById("takeBtn");
  const err = document.getElementById("takeErr");

  function useSupabase() {
    return !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  }
  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(CFG.STORE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  async function activeNumbers() {
    const set = new Set();
    let sb = null;
    if (useSupabase()) {
      try {
        sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
        const { data, error } = await sb.from(CFG.TABLE).select("order_number").neq("status", "done");
        if (!error && data) {
          data.forEach((r) => set.add(String(r.order_number)));
          return { set, sb };
        }
      } catch (e) {
        console.warn("Supabase activeNumbers fallback:", e);
      }
    }
    Object.keys(readStore()).forEach((k) => {
      if (readStore()[k].status !== "done") set.add(String(k));
    });
    return { set, sb };
  }

  function pickRandom(taken) {
    const min = CFG.TAKE_MIN || 1;
    const max = CFG.TAKE_MAX || 99;
    const free = [];
    for (let n = min; n <= max; n++) {
      if (!taken.has(String(n))) free.push(String(n));
    }
    if (!free.length) return String(max + 1 + Math.floor(Math.random() * 900));
    return free[Math.floor(Math.random() * free.length)];
  }

  async function createOrder(num, sb) {
    // 1. مزامنة سحابية مع Supabase (لتظهر فوراً على شاشة الكاشير/الآيباد عبر الإنترنت)
    if (sb) {
      try {
        const { error } = await sb.from(CFG.TABLE).upsert(
          { order_number: num, status: "preparing", updated_at: new Date().toISOString() },
          { onConflict: "order_number" }
        );
        if (error) console.warn("Supabase upsert error:", error);
      } catch (err) {
        console.warn("Supabase createOrder error:", err);
      }
    }

    // 2. حفظ محلي واحتياطي فوري
    const s = readStore();
    s[num] = { status: "preparing", createdAt: Date.now(), updatedAt: Date.now() };
    try {
      localStorage.setItem(CFG.STORE_KEY, JSON.stringify(s));
    } catch {}
    try {
      if ("BroadcastChannel" in window) {
        new BroadcastChannel(CFG.BC_NAME).postMessage({ order: num, status: "preparing", ts: Date.now() });
      }
    } catch {}
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.innerHTML = '<span data-ic="ticket"></span>بنجهز رقمك...';
    if (window.EmadIcons) window.EmadIcons.hydrate(btn);
    try {
      const { set, sb } = await activeNumbers();
      const num = pickRandom(set);
      await createOrder(num, sb);
      // انتقال سلس لشاشة المتابعة
      location.href = "./?order=" + encodeURIComponent(num);
    } catch (e) {
      console.error(e);
      btn.disabled = false;
      btn.innerHTML = '<span data-ic="ticket"></span>استلم رقمك';
      if (window.EmadIcons) window.EmadIcons.hydrate(btn);
      err.textContent = "حصلت مشكلة بسيطة، دوس تاني";
    }
  });
})();
