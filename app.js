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
  const onWayBtn = $("onWayBtn");
  const onWayText = $("onWayText");
  const receivedBtn = $("receivedBtn");
  const nameInput = $("nameInput");
  const howModal = $("howModal");
  const howOk = $("howOk");
  const howClose = $("howClose");

  let bellOn = true;
  let alertSilenced = false;
  let currentStatus = "preparing";
  let sb = null;
  let bc = null;
  let wakeLockObj = null;
  let swReg = null;

  /* ---------- تسجيل Service Worker لدعم إشعارات ونغمات النظام المباشرة ---------- */
  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("sw.js", { scope: "./" });
      swReg = reg;
      return reg;
    } catch (e) {
      console.warn("SW register error:", e);
      return null;
    }
  }
  registerServiceWorker();

  let readyNotifiedOrder = null;

  /* ---------- إطلاق إشعار النظام بصوت واهتزاز قناة النوتيفيكيشن (STREAM_NOTIFICATION) ---------- */
  async function triggerSystemNotification(force) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!force && readyNotifiedOrder === orderNo) return; // منع تكرار الإشعار نهائياً
    readyNotifiedOrder = orderNo;

    const title = "عماد أفندي: طلب رقم " + orderNo + " جاهز";
    const body = "طلبك جاهز للاستلام الآن من الكاونتر";

    const options = {
      body,
      icon: "assets/logo.png",
      badge: "assets/logo.png",
      vibrate: [600, 250, 600, 250, 1000],
      tag: "emad-ready-" + orderNo, // كارت موحد يمنع تراكم إشعارات متعددة
      renotify: true, // يضمن رنين واهتزاز الموبايل في كل نداء
      silent: false, // قناة النوتيفيكيشن (STREAM_NOTIFICATION)
      data: {
        url: location.href,
        order: orderNo
      }
    };

    // 1. الأولوية للـ Service Worker على أندرويد لربطه بقناة صوت النوتيفيكيشن الرسمية
    try {
      if ("serviceWorker" in navigator) {
        const reg = swReg || (await navigator.serviceWorker.ready);
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return;
        }
      }
    } catch (e) {
      console.warn("SW showNotification error:", e);
    }

    // 2. بديل لمتصفحات سطح المكتب
    try {
      new Notification(title, options);
    } catch (e) {}
  }

  /* ---------- منع إغلاق الشاشة (Screen Wake Lock) ---------- */
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator && !wakeLockObj) {
        wakeLockObj = await navigator.wakeLock.request("screen");
        wakeLockObj.addEventListener("release", () => {
          wakeLockObj = null;
        });
      }
    } catch (e) {}
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentStatus !== "done") {
      requestWakeLock();
    }
  });

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

  let lastUpdatedAt = null;

  function listenBroadcastChannel(order) {
    try {
      if (!bc && "BroadcastChannel" in window) {
        bc = new BroadcastChannel(CFG.BC_NAME);
      }
      if (bc) {
        bc.onmessage = (ev) => {
          const m = ev.data || {};
          if (String(m.order) === String(order)) {
            if (m.status) {
              if (m.recall && currentStatus === "ready") {
                alertSilenced = false;
                ringReady(true);
              } else {
                render(m.status, m);
              }
            }
          }
        };
      }
    } catch {}

    window.addEventListener("storage", (ev) => {
      if (ev.key === CFG.STORE_KEY) {
        const store = readStore();
        if (store[order]) render(store[order].status, store[order]);
      }
    });
  }

  function initSupabase(order) {
    listenBroadcastChannel(order);

    // إظهار شاشة الانتظار فوراً للعميل دون تأخير شبكة
    const local = readStore()[order] || {};
    render(local.status || "preparing", local);

    try {
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
      sb.from(CFG.TABLE).select("*").eq("order_number", order).maybeSingle().then(({ data }) => {
        if (data && data.status) {
          lastUpdatedAt = data.updated_at;
          render(data.status, data);
        }
      });
      sb.channel(CFG.CHANNEL)
        .on("postgres_changes", { event: "*", schema: "public", table: CFG.TABLE }, (payload) => {
          const row = payload.new || {};
          if (String(row.order_number) === String(order) && row.status) {
            lastUpdatedAt = row.updated_at;
            render(row.status, row);
          }
        })
        .subscribe();

      // فحص دوري كل 1.2 ثانية كخط دفاع فوري وسريع لو انقطع الـ WebSocket في خلفية الموبايل
      setInterval(() => {
        if (!sb) return;
        sb.from(CFG.TABLE).select("*").eq("order_number", order).maybeSingle().then(({ data }) => {
          if (data && data.status) {
            const isNewStatus = data.status !== currentStatus;
            const isNewUpdate = data.updated_at && data.updated_at !== lastUpdatedAt;
            if (isNewStatus || (isNewUpdate && data.status === "ready")) {
              lastUpdatedAt = data.updated_at;
              render(data.status, data);
            }
          }
        });
      }, 1200);
    } catch (e) {
      console.warn("Supabase init error, falling back to local:", e);
      initLocal(order);
    }
  }

  /* ---------- وضع التشغيل المحلي والـ Fallback ---------- */
  function initLocal(order) {
    const s = readStore();
    const current = s[order] || {};
    render(current.status || "preparing", current);
    listenBroadcastChannel(order);

    setInterval(() => {
      const store = readStore();
      const st = store[order] ? store[order].status : "preparing";
      if (st !== currentStatus) render(st, store[order]);
    }, CFG.POLL_MS || 2000);
  }

  /* ---------- التنبيه بالرنين والاهتزاز ونوتيفيكيشن النظام ---------- */
  function ringReady(isRecall) {
    if (alertSilenced) return;

    // 1. إطلاق إشعار النظام المباشر بصوت واهتزاز قناة النوتيفيكيشن (مرة واحدة فقط)
    triggerSystemNotification(!!isRecall);

    // 2. تشغيل نغمة الويب الداخلية المتكررة
    if (window.EmadSound) {
      window.EmadSound.startChimeLoop(CFG.CHIME_EVERY_MS || 3000);
    }
    document.title = "طلبك جاهز! #" + orderNo + " - عماد أفندي";
    requestWakeLock();

    // في حال كان الصوت معلقاً، أول لمسة للشاشة تشغل الصوت فوراً
    const kickstartOnTouch = () => {
      if (!alertSilenced) {
        if (window.EmadSound) {
          window.EmadSound.unlockAudio();
          window.EmadSound.playPagerChime();
          window.EmadSound.startChimeLoop(CFG.CHIME_EVERY_MS || 3000);
        }
      }
    };
    window.addEventListener("touchstart", kickstartOnTouch, { once: true, passive: true });
    window.addEventListener("pointerdown", kickstartOnTouch, { once: true, passive: true });
    window.addEventListener("click", kickstartOnTouch, { once: true, passive: true });
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
      requestWakeLock();

      const isOnWay = meta && Boolean(meta.on_way);
      const onWayIcon = $("onWayIcon");
      if (isOnWay) {
        // العميل ضغط "أنا جاي" سابقاً: اكتم الصوت وعطّل الزر
        alertSilenced = true;
        if (window.EmadSound) window.EmadSound.stopChimeLoop();
        if (onWayBtn) {
          onWayBtn.disabled = true;
          onWayBtn.style.background = "rgba(212, 175, 55, 0.25)";
          onWayBtn.style.color = "var(--gold-bright)";
          if (onWayIcon && window.EmadIcons) onWayIcon.innerHTML = window.EmadIcons.check || '';
          if (onWayText) onWayText.textContent = "بلّغنا الكاشير إنك في الطريق";
        }
      } else {
        // جاهز جديد، أو الكاشير ضغط "إعادة النداء": فك الكتم واشحن الزر ورن مجدداً!
        alertSilenced = false;
        if (onWayBtn) {
          onWayBtn.disabled = false;
          onWayBtn.style.background = "";
          onWayBtn.style.color = "";
          if (onWayIcon && window.EmadIcons) onWayIcon.innerHTML = window.EmadIcons.coffee || '';
          if (onWayText) onWayText.textContent = "أنا جاي أستلم";
        }
        ringReady();
      }
      return;
    }

    // 3. حالة قيد التحضير (Preparing / Received)
    document.body.classList.remove("is-ready");
    readyWrapper.hidden = true;
    trackWrapper.hidden = false;
    document.title = "طلبك قيد التحضير #" + orderNo + " - عماد أفندي";
    requestWakeLock();

    if (meta && meta.items && $("orderItemsText")) {
      $("orderItemsText").textContent = meta.items;
    }
    if (meta && meta.name && nameInput && !nameInput.value) {
      nameInput.value = meta.name;
    }
  }

  /* ---------- إرسال إشارة "أنا جاي" للكاشير ---------- */
  async function sendOnWay() {
    alertSilenced = true;
    if (window.EmadSound) window.EmadSound.stopChimeLoop();

    const onWayIcon = $("onWayIcon");
    if (onWayIcon && window.EmadIcons) onWayIcon.innerHTML = window.EmadIcons.check || '';
    if (onWayText) onWayText.textContent = "بلّغنا الكاشير إنك في الطريق";
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

  /* ---------- تفعيل الصوت والتنبيهات (Audio Arming & Unlock) ---------- */
  function updateArmedUI() {
    const card = $("notifyCard");
    const title = $("notifyTitle");
    const sub = $("notifySub");
    const badge = $("notifyBadge");
    if (!card) return;

    const isAudioUnlocked = window.EmadSound && window.EmadSound.isUnlocked();
    const isNotifyGranted = "Notification" in window && Notification.permission === "granted";
    const isFullyArmed = isAudioUnlocked && isNotifyGranted;

    if (isFullyArmed) {
      card.classList.remove("needs-permission");
      card.classList.add("is-armed");
      if (title) title.textContent = "جرس المنادي مفعّل ومسلّح ✓";
      if (sub) sub.textContent = "موبايلك هيرن ويهتز تلقائياً أول ما طلبك يجهز";
      if (badge) {
        badge.innerHTML = '<span data-ic="bell"></span>';
        if (window.EmadIcons) window.EmadIcons.hydrate(badge);
      }
    } else {
      card.classList.add("needs-permission");
      card.classList.remove("is-armed");
      if (title) title.textContent = "اضغط لتفعيل جرس المنادي 🔔";
      if (sub) sub.textContent = "اضغط هنا لضمان رنين الموبايل واهتزازه فور جاهزية طلبك";
      if (badge) {
        badge.innerHTML = '<span data-ic="bell"></span>';
        if (window.EmadIcons) window.EmadIcons.hydrate(badge);
      }
    }
  }

  async function requestNotificationAccess(showConfirm) {
    if (window.EmadSound) {
      window.EmadSound.unlockAudio();
    }
    if ("Notification" in window) {
      try {
        await Notification.requestPermission();
      } catch (err) {}
    }
    updateArmedUI();
    if (showConfirm && window.EmadSound) {
      window.EmadSound.playConfirmBeep();
    }
  }

  function armAudioGlobally() {
    if (window.EmadSound) {
      window.EmadSound.unlockAudio();
    }
    updateArmedUI();
  }

  // فك حظر الصوت والنوتيفيكيشن فوراً مع أي لمسة للموبايل في أي مكان بالصفحة
  ["touchstart", "touchend", "pointerdown", "click"].forEach((evt) => {
    window.addEventListener(evt, armAudioGlobally, { passive: true });
  });

  if ($("notifyCard")) {
    $("notifyCard").addEventListener("click", (e) => {
      if (e) e.stopPropagation();
      requestNotificationAccess(true);
    });
  }

  // فحص أولي للحالة فور فتح الصفحة
  updateArmedUI();

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

      // فك حظر الصوت وتأكيده فوراً عند ضغطة الزر
      if (window.EmadSound) {
        window.EmadSound.playConfirmBeep();
      }
      updateArmedUI();

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

  window.EmadNotify = {
    triggerSystemNotification,
    updateArmedUI,
    requestNotificationAccess
  };
})();
