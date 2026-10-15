/* ============================================================
   المنادي الذكي - عماد أفندي | app.js (شاشة العميل)
   الهوية البصرية الفاخرة لعماد أفندي + تجربة ناديني الذكية
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.EMAD_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const orderNo = new URLSearchParams(location.search).get("order");
  const enterCard = $("enterCard");
  const trackWrapper = $("trackWrapper");
  const readyWrapper = $("readyWrapper");
  const doneCard = $("doneCard");
  const orderNoEl = $("orderNo");
  const readyOrderNoEl = $("readyOrderNo");
  const bellBtn = $("bellBtn");
  const onWayBtn = $("onWayBtn");
  const onWayText = $("onWayText");
  const receivedBtn = $("receivedBtn");
  const nameInput = $("nameInput");
  const howModal = $("howModal");
  const howOk = $("howOk");
  const howClose = $("howClose");

  let bellOn = true;
  let currentStatus = "preparing";
  let sb = null;
  let bc = null;

  /* ---------- التخزين المحلي والـ BroadcastChannel ---------- */
  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(CFG.STORE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeStore(s) {
    try {
      localStorage.setItem(CFG.STORE_KEY, JSON.stringify(s));
    } catch { /* مساحة ممتلئة */ }
  }

  function bcPost(msg) {
    try {
      if (!bc && "BroadcastChannel" in window) bc = new BroadcastChannel(CFG.BC_NAME);
      if (bc) bc.postMessage(msg);
    } catch { /* لا يدعم */ }
  }

  function localStatus(order) {
    const row = readStore()[order];
    return row ? row.status : "preparing";
  }

  /* ---------- Supabase (إذا كان مفعلاً) ---------- */
  function useSupabase() {
    return !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  }

  function initSupabase(order) {
    try {
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
      sb.from(CFG.TABLE).select("*").eq("order_number", order).maybeSingle().then(({ data }) => {
        if (data && data.status) render(data.status, data);
      });
      sb.channel(CFG.CHANNEL)
        .on("postgres_changes", { event: "*", schema: "public", table: CFG.TABLE }, (payload) => {
          const row = payload.new || {};
          if (String(row.order_number) === String(order) && row.status) {
            render(row.status, row);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn("Supabase init error, falling back to local:", e);
    }
  }

  /* ---------- وضع التشغيل المحلي والـ Fallback ---------- */
  function initLocal(order) {
    const s = readStore();
    const current = s[order] || {};
    render(current.status || "preparing", current);

    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel(CFG.BC_NAME);
        bc.onmessage = (ev) => {
          const m = ev.data || {};
          if (String(m.order) === String(order)) {
            if (m.status) {
              if (m.recall && currentStatus === "ready") ringReady();
              else render(m.status, m);
            }
          }
        };
      }
    } catch { /* تجاهل */ }

    window.addEventListener("storage", (ev) => {
      if (ev.key === CFG.STORE_KEY) {
        const store = readStore();
        if (store[order]) render(store[order].status, store[order]);
      }
    });

    setInterval(() => {
      const store = readStore();
      const st = store[order] ? store[order].status : "preparing";
      if (st !== currentStatus) render(st, store[order]);
    }, CFG.POLL_MS || 2000);
  }

  /* ---------- التنبيه بالرنين والاهتزاز ---------- */
  function ringReady() {
    if (window.EmadSound) {
      window.EmadSound.startChimeLoop(CFG.CHIME_EVERY_MS || 3500);
    }
    document.title = "🔔 طلبك جاهز! #" + orderNo + " - عماد أفندي";
  }

  /* ---------- عرض الحالات المختلفة (UI States) ---------- */
  function render(status, meta) {
    currentStatus = status;

    // 1. حالة تم الاستلام (Done)
    if (status === "done" || status === "picked_up") {
      trackWrapper.hidden = true;
      readyWrapper.hidden = true;
      doneCard.hidden = false;
      document.body.classList.remove("is-ready");
      if (window.EmadSound) window.EmadSound.stopChimeLoop();
      document.title = "بالهنا والشفا! - عماد أفندي";
      return;
    }

    doneCard.hidden = true;

    // 2. حالة الطلب جاهز (Ready)
    if (status === "ready") {
      trackWrapper.hidden = true;
      readyWrapper.hidden = false;
      document.body.classList.add("is-ready");
      ringReady();
      return;
    }

    // 3. حالة قيد التحضير (Preparing / Received)
    document.body.classList.remove("is-ready");
    readyWrapper.hidden = true;
    trackWrapper.hidden = false;
    document.title = "طلبك قيد التحضير #" + orderNo + " - عماد أفندي";

    if (meta && meta.items && $("orderItemsText")) {
      $("orderItemsText").textContent = meta.items;
    }
    if (meta && meta.name && nameInput && !nameInput.value) {
      nameInput.value = meta.name;
    }
  }

  /* ---------- إرسال إشارة "أنا جاي" للكاشير ---------- */
  async function sendOnWay() {
    if (window.EmadSound) window.EmadSound.stopChimeLoop();
    onWayText.textContent = "✓ بلّغنا الكاشير إنك في الطريق";
    onWayBtn.disabled = true;
    onWayBtn.style.background = "rgba(212, 175, 55, 0.25)";
    onWayBtn.style.color = "var(--gold-bright)";

    // حفظ في Supabase لو متاح
    if (useSupabase() && sb) {
      try {
        await sb.from(CFG.TABLE).update({ on_way: true, updated_at: new Date().toISOString() }).eq("order_number", orderNo);
      } catch (e) {
        console.warn("Error updating on_way to Supabase:", e);
      }
    }

    // حفظ في المخزن المحلي والإرسال عبر BroadcastChannel
    const s = readStore();
    if (s[orderNo]) {
      s[orderNo].on_way = true;
      s[orderNo].updatedAt = Date.now();
      writeStore(s);
    }
    bcPost({ order: orderNo, status: "ready", on_way: true, ts: Date.now() });
  }

  /* ---------- حفظ اسم العميل للباريستا ---------- */
  async function saveCustomerName(val) {
    val = (val || "").trim();
    if (!orderNo || !val) return;

    if (useSupabase() && sb) {
      try {
        await sb.from(CFG.TABLE).update({ name: val, updated_at: new Date().toISOString() }).eq("order_number", orderNo);
      } catch (e) {}
    }

    const s = readStore();
    if (s[orderNo]) {
      s[orderNo].name = val;
      writeStore(s);
    }
    bcPost({ order: orderNo, name: val, status: currentStatus, ts: Date.now() });
  }

  /* ---------- إنهاء الطلب عند الاستلام ---------- */
  async function setStatusDone(order) {
    if (useSupabase() && sb) {
      try {
        await sb.from(CFG.TABLE).update({ status: "done", updated_at: new Date().toISOString() }).eq("order_number", order);
      } catch (e) {}
    }

    const s = readStore();
    if (s[order]) {
      s[order].status = "done";
      s[order].updatedAt = Date.now();
      writeStore(s);
      bcPost({ order, status: "done", ts: Date.now() });
    }

    render("done");
  }

  /* ---------- الأحداث والتفاعلات ---------- */
  if (onWayBtn) {
    onWayBtn.addEventListener("click", sendOnWay);
  }

  if (receivedBtn) {
    receivedBtn.addEventListener("click", () => setStatusDone(orderNo));
  }

  if (bellBtn) {
    bellBtn.addEventListener("click", () => {
      if (window.EmadSound) {
        window.EmadSound.unlockAudio();
        window.EmadSound.playPagerChime();
        if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
      }
      bellBtn.innerHTML = '<span data-ic="check"></span>✓ تمام الصوت شغال';
      if (window.EmadIcons) window.EmadIcons.hydrate(bellBtn);
    });
  }

  if (nameInput) {
    nameInput.addEventListener("change", () => saveCustomerName(nameInput.value));
  }

  if ($("goBtn")) {
    $("goBtn").addEventListener("click", () => {
      const v = $("orderInput").value.trim();
      if (!v) return;
      location.search = "?order=" + encodeURIComponent(v);
    });
  }

  /* ---------- نافذة الشرح الترحيبية (Onboarding Modal) ---------- */
  function setupOnboarding() {
    try {
      const seen = localStorage.getItem("emad_how_v3");
      if (!seen && orderNo && howModal) {
        howModal.hidden = false;
      }
    } catch (e) {}

    const dismissModal = () => {
      if (howModal) howModal.hidden = true;
      try {
        localStorage.setItem("emad_how_v3", "1");
      } catch (e) {}

      // فك حظر الصوت في متصفحات الموبايل فوراً عند ضغطة الزر
      if (window.EmadSound) {
        window.EmadSound.unlockAudio();
        window.EmadSound.playPagerChime();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }

      // طلب إذن التنبيهات
      if ("Notification" in window) {
        try {
          Notification.requestPermission();
        } catch (e) {}
      }
    };

    if (howOk) howOk.addEventListener("click", dismissModal);
    if (howClose) howClose.addEventListener("click", dismissModal);
  }

  /* ---------- الإقلاع الأولي ---------- */
  setupOnboarding();

  if (!orderNo) {
    enterCard.hidden = false;
  } else {
    orderNoEl.textContent = orderNo;
    readyOrderNoEl.textContent = orderNo;

    if (useSupabase()) {
      initSupabase(orderNo);
    } else {
      initLocal(orderNo);
    }
  }

  if (window.EmadIcons) window.EmadIcons.hydrate();
})();
