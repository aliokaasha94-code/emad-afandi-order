/* ============================================================
   المنادي الذكي - عماد أفندي | kitchen.js (شاشة الباريستا والكاشير)
   الهوية الفاخرة + Numpad + تنبيه "العميل في الطريق" الحي
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.EMAD_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const ordersEl = $("orders");

  let sb = null;
  let bc = null;
  let pad = "";
  let cache = {}; // order -> { status, name, items, on_way, createdAt, updatedAt }
  let lastSig = "";
  let notifiedOnWay = new Set();

  /* ---------- بوابة الـ PIN ---------- */
  const inputs = [$("p0"), $("p1"), $("p2"), $("p3")];
  inputs.forEach((inp, i) => {
    inp.addEventListener("input", () => {
      inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
      if (inp.value && i < 3) inputs[i + 1].focus();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !inp.value && i > 0) inputs[i - 1].focus();
      if (e.key === "Enter") $("pinBtn").click();
    });
  });

  function unlock() {
    $("pinCard").hidden = true;
    const mb = $("mainBox");
    mb.hidden = false;
    mb.style.display = "flex";
    try {
      sessionStorage.setItem("emad_kitchen_ok", "1");
    } catch {}
    boot();
  }

  $("pinBtn").addEventListener("click", () => {
    const pin = inputs.map((x) => x.value).join("");
    if (pin === (CFG.KITCHEN_PIN || "1919")) {
      $("pinErr").textContent = "";
      unlock();
    } else {
      $("pinErr").textContent = "PIN غير صحيح، حاول مرة أخرى";
      inputs.forEach((x) => (x.value = ""));
      inputs[0].focus();
    }
  });

  try {
    if (sessionStorage.getItem("emad_kitchen_ok") === "1") unlock();
    else inputs[0].focus();
  } catch {
    inputs[0].focus();
  }

  /* ---------- المخزن والتزامن ---------- */
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

  function writeStore(s) {
    try {
      localStorage.setItem(CFG.STORE_KEY, JSON.stringify(s));
    } catch {}
  }

  function bcPost(msg) {
    try {
      if (!bc && "BroadcastChannel" in window) bc = new BroadcastChannel(CFG.BC_NAME);
      if (bc) bc.postMessage(msg);
    } catch {}
  }

  function baseDir() {
    try {
      const u = new URL(location.href);
      let dir = u.pathname;
      if (!dir.endsWith("/")) dir = dir.slice(0, dir.lastIndexOf("/") + 1);
      return u.origin + dir;
    } catch {
      return "./";
    }
  }

  function trackUrl(order) {
    return baseDir() + "?order=" + encodeURIComponent(order);
  }

  function takeUrl() {
    return baseDir() + "take";
  }

  function qrSrc(url) {
    return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(url);
  }

  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch {
      window.prompt("انسخ الرابط:", t);
      return false;
    }
  }

  /* ---------- تنبيهات الكيباد والأوردرات المكررة ---------- */
  function showPadAlert(msg) {
    const el = $("padAlert");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    const pv = $("padView");
    if (pv) {
      pv.classList.add("shake-error");
      setTimeout(() => pv.classList.remove("shake-error"), 600);
    }
    setTimeout(() => { el.style.display = "none"; }, 3500);
  }

  /* ---------- إدارة الطلبات ---------- */
  async function addOrder(order) {
    order = String(order).trim();
    if (!order) return;

    // 1. منع تكرار نفس الرقم لو الأوردر لسه نشط ومعملش تم التسليم
    if (cache[order] && cache[order].status !== "done") {
      showPadAlert("⚠️ الأوردر #" + order + " موجود بالفعل في الطلبات النشطة!");
      const existing = document.querySelector('.order-card[data-order="' + order + '"]');
      if (existing) {
        existing.scrollIntoView({ behavior: "smooth", block: "center" });
        existing.classList.add("highlight-pulse");
        setTimeout(() => existing.classList.remove("highlight-pulse"), 1800);
      }
      return;
    }

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    // 2. تصفير العداد وتحديث السحابة والمخزن المحلي من نقطة الصفر
    if (useSupabase() && sb) {
      try {
        await sb.from(CFG.TABLE).upsert(
          {
            order_number: order,
            status: "preparing",
            on_way: false,
            name: "",
            phone: "",
            items: "",
            created_at: nowIso,
            updated_at: nowIso
          },
          { onConflict: "order_number" }
        );
      } catch (e) {
        console.warn(e);
      }
    }

    const s = readStore();
    s[order] = {
      status: "preparing",
      createdAt: nowMs,
      updatedAt: nowMs,
      on_way: false,
      name: "",
    };
    writeStore(s);
    cache[order] = s[order];
    notifiedOnWay.delete(order);
    bcPost({ order, status: "preparing", on_way: false, ts: nowMs });
    await refresh();
  }

  async function setStatus(order, status, recall) {
    if (useSupabase() && sb) {
      try {
        await sb.from(CFG.TABLE).update({ status, updated_at: new Date().toISOString() }).eq("order_number", order);
        await refresh();
      } catch (e) {}
    } else {
      const s = readStore();
      if (s[order]) {
        s[order].status = status;
        s[order].updatedAt = Date.now();
      }
      writeStore(s);
      bcPost({ order, status, ts: Date.now(), recall: !!recall });
      render();
    }
  }

  async function refresh() {
    if (useSupabase() && sb) {
      try {
        const { data } = await sb.from(CFG.TABLE).select("*").neq("status", "done").order("created_at", { ascending: true });
        cache = {};
        (data || []).forEach((r) => {
          cache[r.order_number] = {
            status: r.status,
            name: r.name || "",
            items: r.items || "",
            on_way: Boolean(r.on_way),
            createdAt: new Date(r.created_at || Date.now()).getTime(),
            updatedAt: new Date(r.updated_at || Date.now()).getTime(),
          };
        });
      } catch (e) {}
    } else {
      const s = readStore();
      const now = Date.now();
      cache = {};
      Object.keys(s).forEach((k) => {
        if (s[k].status === "done" && now - (s[k].updatedAt || now) > 2 * 3600 * 1000) {
          delete s[k];
          return;
        }
        if (s[k].status !== "done") {
          cache[k] = s[k];
        }
      });
      writeStore(s);
    }
    render();
  }

  function fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return "منذ " + m + ":" + String(r).padStart(2, "0");
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- رسم الواجهة (Render Board) ---------- */
  function render() {
    const keys = Object.keys(cache).sort((a, b) => cache[a].createdAt - cache[b].createdAt);
    const sig = keys.map((k) => k + ":" + cache[k].status + ":" + cache[k].on_way + ":" + (cache[k].name || "")).join("|");
    if (sig === lastSig) return;
    lastSig = sig;

    $("activeCount").textContent = keys.length + " نشط";
    ordersEl.innerHTML = "";

    if (!keys.length) {
      ordersEl.innerHTML = '<p class="hint" style="grid-column:1/-1; text-align:center; padding:30px 0; font-size:16px;">مفيش أوردرات نشطة حالياً</p>';
      return;
    }

    keys.forEach((order) => {
      const o = cache[order];
      const isReady = o.status === "ready";
      const isOnWay = Boolean(o.on_way);

      // صامت تماماً بدون أي صوت على شاشة الكاشير حتى لا يقطع ساوند سيستم الكافيه
      if (isOnWay && !notifiedOnWay.has(order)) {
        notifiedOnWay.add(order);
      }

      const card = document.createElement("div");
      card.className = "order-card" + (isReady ? " is-ready" : "");
      card.dataset.order = order;

      const orderTrackUrl = trackUrl(order);

      card.innerHTML =
        '<div class="num">#' + escapeHtml(order) + "</div>" +
        (o.name ? '<div class="customer-badge"><span data-ic="user"></span>' + escapeHtml(o.name) + '</div>' : '') +
        '<div class="timer" data-t="' + o.createdAt + '"><span class="livedot"></span>' + fmt(Date.now() - o.createdAt) + "</div>" +
        (isOnWay
          ? '<div class="on-way-alert"><span data-ic="walk"></span>العميل في الطريق للاستلام الآن!</div>'
          : '') +
        '<div class="row">' +
        (isReady
          ? '<button class="btn btn-gold" data-a="recall"><span data-ic="refresh"></span>إعادة النداء</button>'
          : '<button class="btn btn-gold" data-a="ready"><span data-ic="bell"></span>جاهز للاستلام</button>') +
        '<button class="btn btn-red" data-a="done"><span data-ic="check"></span>تم التسليم</button>' +
        "</div>" +
        '<div class="card-qr-box">' +
        '<img class="card-qr-img" src="' + qrSrc(orderTrackUrl) + '" alt="QR #' + escapeHtml(order) + '" />' +
        '<div class="card-qr-sub">امسح لمتابعة طلبك</div>' +
        '</div>';

      card.querySelector('[data-a="ready"]')?.addEventListener("click", () => setStatus(order, "ready"));
      card.querySelector('[data-a="recall"]')?.addEventListener("click", () => setStatus(order, "ready", true));
      card.querySelector('[data-a="done"]').addEventListener("click", () => setStatus(order, "done"));

      ordersEl.appendChild(card);
    });

    if (window.EmadIcons) window.EmadIcons.hydrate(ordersEl);
  }

  /* ---------- نافذة عرض QR المنفصلة على الكاونتر ---------- */
  function showCounterQrModal(order, url) {
    let modal = $("qrPopupModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "qrPopupModal";
      modal.className = "modal-overlay";
      modal.innerHTML =
        '<div class="modal-content" style="text-align:center;">' +
        '<div class="modal-header">' +
        '<span style="font-weight:800; font-size:16px; color:var(--gold);">كود العميل</span>' +
        '<button class="modal-close" id="qrPopupClose"><span data-ic="close"></span></button>' +
        '</div>' +
        '<div class="order-no" id="qrPopupOrderNo"></div>' +
        '<img id="qrPopupImg" class="qr" style="width:240px; height:240px; margin:16px auto;" />' +
        '<p class="hint">امسح الكود لمتابعة طلبك</p>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector("#qrPopupClose").addEventListener("click", () => {
        modal.hidden = true;
      });
    }
    modal.querySelector("#qrPopupOrderNo").textContent = "#" + order;
    modal.querySelector("#qrPopupImg").src = qrSrc(url);
    modal.hidden = false;
    if (window.EmadIcons) window.EmadIcons.hydrate(modal);
  }

  // تحديث عدادات الوقت كل ثانية
  setInterval(() => {
    document.querySelectorAll(".timer[data-t]").forEach((el) => {
      el.innerHTML = '<span class="livedot"></span>' + fmt(Date.now() - Number(el.dataset.t));
    });
  }, 1000);

  /* ---------- كيباد الأرقام (Numpad) ---------- */
  $("numpad").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-d]");
    if (!b || b.id === "addBtn") return;
    const d = b.dataset.d;
    if (d === "C") pad = "";
    else if (d === "B") pad = pad.slice(0, -1);
    else if (pad.length < 5) pad += d;
    $("padView").textContent = pad === "" ? "–" : "#" + pad;
  });

  $("addBtn").addEventListener("click", () => {
    if (!pad) return;
    addOrder(pad);
    pad = "";
    $("padView").textContent = "–";
  });

  /* ---------- إقلاع الشاشة (Boot) ---------- */
  function boot() {
    const tu = takeUrl();
    if ($("takeQr")) $("takeQr").src = qrSrc(tu);

    if ($("copyTake")) {
      $("copyTake").addEventListener("click", async () => {
        const ok = await copyText(tu);
        if (ok) {
          $("copyTake").innerHTML = '<span data-ic="check"></span>تم النسخ';
          setTimeout(() => ($("copyTake").innerHTML = '<span data-ic="copy"></span>نسخ اللينك'), 1500);
          if (window.EmadIcons) window.EmadIcons.hydrate($("copyTake"));
        }
      });
    }

    if ($("printTake")) {
      $("printTake").addEventListener("click", () => {
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(
          "<html dir='rtl'><head><title>QR الكاونتر - عماد أفندي</title></head>" +
            "<body style='text-align:center;font-family:sans-serif;padding:40px;background:#fff;color:#000;'>" +
            "<h1 style='font-size:32px;margin-bottom:4px;'>عماد أفندي</h1>" +
            "<p style='font-size:18px;margin-top:0;'>قهوتك على أصولها</p>" +
            "<hr style='margin:20px 0;'/>" +
            "<h2>امسح الكود واستلم رقمك</h2>" +
            "<img src='" + qrSrc(tu) + "' style='width:300px;height:300px;margin:20px 0;' />" +
            "<p style='font-size:14px;direction:ltr;'>" + tu + "</p>" +
            "<script>onload=()=>{print();}<\/script></body></html>"
        );
        w.document.close();
      });
    }

    if (useSupabase() && window.supabase) {
      try {
        sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
        refresh();
        sb.channel(CFG.CHANNEL)
          .on("postgres_changes", { event: "*", schema: "public", table: CFG.TABLE }, () => refresh())
          .subscribe();
        setInterval(refresh, 3000);
      } catch (e) {
        refresh();
      }
    } else {
      refresh();
      try {
        if ("BroadcastChannel" in window) {
          bc = new BroadcastChannel(CFG.BC_NAME);
          bc.onmessage = (ev) => {
            const m = ev.data || {};
            // تحديث فوري إذا كان فيه إشعار "أنا جاي"
            if (m.order && m.on_way && cache[m.order]) {
              cache[m.order].on_way = true;
            }
            refresh();
          };
        }
      } catch {}
      window.addEventListener("storage", (e) => {
        if (e.key === CFG.STORE_KEY) refresh();
      });
      setInterval(refresh, CFG.POLL_MS || 2000);
    }
  }
})();
