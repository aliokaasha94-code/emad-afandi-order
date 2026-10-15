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
    if (useSupabase()) {
      const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
      const { data } = await sb.from(CFG.TABLE).select("order_number").neq("status", "done");
      (data || []).forEach((r) => set.add(String(r.order_number)));
      return { set, sb };
    }
    Object.keys(readStore()).forEach((k) => {
      if (readStore()[k].status !== "done") set.add(String(k));
    });
    return { set, sb: null };
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
    if (sb) {
      await sb.from(CFG.TABLE).upsert(
        { order_number: num, status: "preparing", updated_at: new Date().toISOString() },
        { onConflict: "order_number" }
      );
    } else {
      const s = readStore();
      s[num] = { status: "preparing", createdAt: Date.now(), updatedAt: Date.now() };
      try {
        localStorage.setItem(CFG.STORE_KEY, JSON.stringify(s));
      } catch { /* مساحة ممتلئة */ }
      try {
        new BroadcastChannel(CFG.BC_NAME).postMessage({ order: num, status: "preparing", ts: Date.now() });
      } catch { /* لا يدعم */ }
    }
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "بنجهز رقمك...";
    try {
      const { set, sb } = await activeNumbers();
      const num = pickRandom(set);
      await createOrder(num, sb);
      // لينك نظيف يشتغل على localhost وعلى Cloudflare (clean URLs)
      location.href = "./?order=" + encodeURIComponent(num);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = "استلم رقمك";
      err.textContent = "حصلت مشكلة، دوس تاني";
    }
  });
})();
