/* ============================================================
   المنادي الذكي - عماد أفندي | app.js (شاشة العميل)
   - رقم الأوردر من ?order=
   - Supabase Realtime لو المفاتيح موجودة
   - وإلا: BroadcastChannel + storage event + Polling (محلي)
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.EMAD_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const orderNo = new URLSearchParams(location.search).get("order");
  const enterCard = $("enterCard");
  const trackCard = $("trackCard");
  const doneCard = $("doneCard");
  const orderNoEl = $("orderNo");
  const statusLine = $("statusLine");
  const bellBtn = $("bellBtn");
  const onWayBtn = $("onWayBtn");
  const receivedBtn = $("receivedBtn");
  const liveHint = $("liveHint");

  let bellOn = false;
  let currentStatus = "preparing";
  let sb = null;

  /* ---------- مخزن محلي ---------- */
  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(CFG.STORE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function localStatus(order) {
    const row = readStore()[order];
    return row ? row.status : "preparing";
  }
  async function setStatusDone(order) {
    if (useSupabase() && sb) {
      await sb.from(CFG.TABLE).update({ status: "done", updated_at: new Date().toISOString() }).eq("order_number", order);
    } else {
      const s = readStore();
      if (s[order]) {
        s[order].status = "done";
        s[order].updatedAt = Date.now();
        try {
          localStorage.setItem(CFG.STORE_KEY, JSON.stringify(s));
        } catch { /* مساحة ممتلئة */ }
        bcPost({ order, status: "done", ts: Date.now() });
      }
    }
    render("done");
  }

  /* ---------- Supabase ---------- */
  function useSupabase() {
    return !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  }
  function initSupabase(order) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    sb.from(CFG.TABLE).select("status").eq("order_number", order).maybeSingle().then(({ data }) => {
      if (data && data.status) render(data.status);
    });
    sb.channel(CFG.CHANNEL)
      .on("postgres_changes", { event: "*", schema: "public", table: CFG.TABLE }, (payload) => {
        const row = payload.new || {};
        if (String(row.order_number) === String(order) && row.status) render(row.status);
      })
      .subscribe();
  }

  /* ---------- Fallback محلي ---------- */
  let bc = null;
  function bcPost(msg) {
    try {
      if (!bc && "BroadcastChannel" in window) bc = new BroadcastChannel(CFG.BC_NAME);
      if (bc) bc.postMessage(msg);
    } catch { /* المتصفح لا يدعمها */ }
  }
  function initLocal(order) {
    render(localStatus(order));
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel(CFG.BC_NAME);
        bc.onmessage = (ev) => {
          const m = ev.data || {};
          if (String(m.order) === String(order)) {
            if (m.status) {
              // إعادة النداء: لو جاهز أصلاً، شغّل الجرس من جديد
              if (m.recall && currentStatus === "ready") ringReady();
              else render(m.status);
            }
          }
        };
      }
    } catch { /* تجاهل */ }
    window.addEventListener("storage", (ev) => {
      if (ev.key === CFG.STORE_KEY) render(localStatus(order));
    });
    setInterval(() => {
      const st = localStatus(order);
      if (st !== currentStatus) render(st);
    }, CFG.POLL_MS || 2000);
  }

  /* ---------- العرض ---------- */
  function vibrate() {
    try {
      if (navigator.vibrate) navigator.vibrate(CFG.READY_VIB || [400, 200, 400, 200, 800]);
    } catch { /* لا يدعم */ }
  }

  function ringReady() {
    vibrate();
    if (bellOn && window.EmadSound) window.EmadSound.startChimeLoop(CFG.CHIME_EVERY_MS || 3000);
    else if (window.EmadSound) window.EmadSound.playPagerChime();
    document.title = "طلبك جاهز! - عماد أفندي";
  }

  function render(status) {
    currentStatus = status;
    if (status === "done") {
      trackCard.hidden = true;
      doneCard.hidden = false;
      document.body.classList.remove("is-ready");
      if (window.EmadSound) window.EmadSound.stopChimeLoop();
      document.title = "بالهنا والشفا! - عماد أفندي";
      return;
    }
    doneCard.hidden = true;
    trackCard.hidden = false;
    if (status === "ready") {
      document.body.classList.add("is-ready");
      trackCard.classList.add("card-ready");
      statusLine.innerHTML = "طلبك جهز!<br><small>استلمه من عند الكاونتر</small>";
      onWayBtn.hidden = false;
      receivedBtn.hidden = false;
      bellBtn.hidden = true;
      liveHint.textContent = "طلبك مستنيك عند الكاونتر";
      ringReady();
    } else {
      document.body.classList.remove("is-ready");
      trackCard.classList.remove("card-ready");
      statusLine.textContent = "طلبك بيتعمل دلوقتي..";
      onWayBtn.hidden = true;
      receivedBtn.hidden = true;
      bellBtn.hidden = false;
      document.title = "عماد أفندي | تابع طلبك";
    }
  }

  /* ---------- رقم الواتساب (للتواصل) ---------- */
  const phoneInput = $("phoneInput");
  if (CFG.PHONE_ENABLED === false && $("phoneBox")) $("phoneBox").hidden = true;
  function normalizePhone(v) {
    let d = String(v || "").replace(/\D/g, "");
    if (d.length === 11 && d.startsWith("01")) d = "2" + d; // مصر: 01x → 201x
    if (d.length === 10 && d.startsWith("1")) d = "20" + d;
    return d;
  }
  async function savePhone() {
    if (!phoneInput || !orderNo) return;
    const phone = normalizePhone(phoneInput.value);
    if (!phone) return;
    if (useSupabase() && sb) {
      await sb.from(CFG.TABLE).update({ phone, updated_at: new Date().toISOString() }).eq("order_number", orderNo);
    } else {
      const s = readStore();
      if (s[orderNo]) {
        s[orderNo].phone = phone;
        s[orderNo].updatedAt = Date.now();
        try {
          localStorage.setItem(CFG.STORE_KEY, JSON.stringify(s));
        } catch { /* مساحة ممتلئة */ }
        bcPost({ order: orderNo, status: currentStatus, ts: Date.now() });
      }
    }
  }
  if (phoneInput) {
    const holder = phoneInput.getAttribute("placeholder") || "";
    // الـ placeholder يتمسح لوحده أول ما العميل يدوس في الخانة
    phoneInput.addEventListener("focus", () => phoneInput.setAttribute("placeholder", ""));
    phoneInput.addEventListener("blur", () => {
      if (!phoneInput.value) phoneInput.setAttribute("placeholder", holder);
    });
    phoneInput.addEventListener("change", savePhone);
  }

  /* ---------- الأحداث ---------- */
  bellBtn.addEventListener("click", () => {
    savePhone();
    if (window.EmadSound) window.EmadSound.unlockAudio();
    bellOn = true;
    // الجرس يدق مع كل ضغطة.. مهما داس العميل يجرب براحته
    if (window.EmadSound) window.EmadSound.playPagerChime();
    bellBtn.innerHTML = window.EmadIcons.check + "الجرس شغال.. جرّبه تاني";
  });

  onWayBtn.addEventListener("click", () => {
    if (window.EmadSound) window.EmadSound.stopChimeLoop();
    onWayBtn.textContent = "مستنيينك عند الكاونتر";
    onWayBtn.disabled = true;
  });

  receivedBtn.addEventListener("click", () => setStatusDone(orderNo));

  $("goBtn").addEventListener("click", () => {
    const v = $("orderInput").value.trim();
    if (!v) return;
    location.search = "?order=" + encodeURIComponent(v);
  });

  /* ---------- بدء ---------- */
  $("mapsLink").href = CFG.MAPS_URL || "#";
  // كارت شرح الخطوات: يظهر أول مرة بس
  try {
    if (orderNo && !localStorage.getItem("emad_how_seen") && $("howCard") && $("howOk")) {
      $("howCard").hidden = false;
      const hideHow = () => {
        $("howCard").hidden = true;
        try {
          localStorage.setItem("emad_how_seen", "1");
        } catch { /* خاصية غير متاحة */ }
      };
      $("howOk").addEventListener("click", hideHow);
    }
  } catch { /* خاصية غير متاحة */ }
  if (!orderNo) {
    enterCard.hidden = false;
  } else {
    orderNoEl.textContent = orderNo;
    if (useSupabase()) initSupabase(orderNo);
    else initLocal(orderNo);
  }
})();
