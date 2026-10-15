/* ============================================================
   المنادي الذكي - عماد أفندي | kitchen.js (شاشة الباريستا)
   - PIN: من config (الافتراضي 1919)
   - Numpad + كروت نشطة + تايمر + جاهز/إعادة/تسليم
   - Supabase لو المفاتيح موجودة، وإلا تخزين محلي لحظي
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.EMAD_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const ordersEl = $("orders");

  let sb = null;
  let bc = null;
  let pad = "";
  let cache = {}; // order -> {status, createdAt, updatedAt}
  let lastSig = "";

  /* ---------- PIN ---------- */
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
    } catch { /* خاصية غير متاحة */ }
    boot();
  }
  $("pinBtn").addEventListener("click", () => {
    const pin = inputs.map((x) => x.value).join("");
    if (pin === (CFG.KITCHEN_PIN || "1919")) {
      $("pinErr").textContent = "";
      unlock();
    } else {
      $("pinErr").textContent = "PIN غلط، حاول تاني";
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

  /* ---------- المخزن ---------- */
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
    } catch { /* مساحة ممتلئة */ }
  }
  function bcPost(msg) {
    try {
      if (!bc && "BroadcastChannel" in window) bc = new BroadcastChannel(CFG.BC_NAME);
      if (bc) bc.postMessage(msg);
    } catch { /* لا يدعم */ }
  }
  function trackUrl(order) {
    const base = location.href.replace(/kitchen\.html.*$/, "");
    return base + "index.html?order=" + encodeURIComponent(order);
  }
  function takeUrl() {
    return location.href.replace(/kitchen\.html.*$/, "") + "take.html";
  }
  function qrSrc(url) {
    return "https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=" + encodeURIComponent(url);
  }
  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch {
      window.prompt("انسخ اللينك:", t);
      return false;
    }
  }
  function waLink(phone) {
    return "https://wa.me/" + String(phone || "").replace(/\D/g, "");
  }

  async function addOrder(order) {
    order = String(order).trim();
    if (!order) return;
    if (useSupabase() && sb) {
      await sb.from(CFG.TABLE).upsert(
        { order_number: order, status: "preparing", updated_at: new Date().toISOString() },
        { onConflict: "order_number" }
      );
      await refresh();
    } else {
      const s = readStore();
      s[order] = { status: "preparing", createdAt: Date.now(), updatedAt: Date.now() };
      writeStore(s);
      bcPost({ order, status: "preparing", ts: Date.now() });
      render();
    }
  }

  async function setStatus(order, status, recall) {
    if (useSupabase() && sb) {
      await sb.from(CFG.TABLE).update({ status, updated_at: new Date().toISOString() }).eq("order_number", order);
      await refresh();
    } else {
      const s = readStore();
      // نُبقي الصف بحالة done (لا نحذفه) حتى يرى العميل شاشة الشكر،
      // وقائمة المطبخ أصلاً تخفي الـ done. يُنظَّف القديم في refresh().
      if (s[order]) {
        s[order].status = status;
        s[order].updatedAt = Date.now();
      }
      writeStore(s);
      bcPost({ order, status, ts: Date.now(), recall: !!recall });
      render();
    }
    if (status === "ready" && window.EmadSound) window.EmadSound.playPagerChime();
  }

  async function refresh() {
    if (useSupabase() && sb) {
      const { data } = await sb.from(CFG.TABLE).select("*").neq("status", "done").order("created_at", { ascending: true });
      cache = {};
      (data || []).forEach((r) => {
        cache[r.order_number] = {
          status: r.status,
          phone: r.phone || "",
          createdAt: new Date(r.created_at || Date.now()).getTime(),
          updatedAt: new Date(r.updated_at || Date.now()).getTime(),
        };
      });
    } else {
      const s = readStore();
      const now = Date.now();
      cache = {};
      Object.keys(s).forEach((k) => {
        // تنظيف الطلبات المنتهية (done منذ أكثر من ساعتين)
        if (s[k].status === "done" && now - (s[k].updatedAt || now) > 2 * 3600 * 1000) {
          delete s[k];
          return;
        }
        if (s[k].status !== "done") cache[k] = s[k];
      });
      writeStore(s);
    }
    render();
  }

  /* ---------- العرض ---------- */
  function fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return "منذ " + m + ":" + String(r).padStart(2, "0");
  }

  function render() {
    const keys = Object.keys(cache).sort((a, b) => cache[a].createdAt - cache[b].createdAt);
    // لو مفيش تغيير في الأوردرات/الحالات، متعيدش بناء الـ DOM (عشان الأنيميشن ميشتغلش كل ثانيتين)
    const sig = keys.map((k) => k + ":" + cache[k].status + ":" + (cache[k].phone || "")).join("|");
    if (sig === lastSig) return;
    lastSig = sig;
    $("activeCount").textContent = keys.length + " نشط";
    ordersEl.innerHTML = "";
    if (!keys.length) {
      ordersEl.innerHTML = '<p class="hint" style="grid-column:1/-1">مفيش أوردرات نشطة.. الدنيا رايقة</>';
      return;
    }
    keys.forEach((order) => {
      const o = cache[order];
      const card = document.createElement("div");
      card.className = "order-card" + (o.status === "ready" ? " is-ready" : "");
      card.innerHTML =
        '<div class="num">#' + escapeHtml(order) + "</div>" +
        '<div class="timer" data-t="' + o.createdAt + '"><span class="livedot"></span>' + fmt(Date.now() - o.createdAt) + "</div>" +
        '<div class="row">' +
        (o.status === "ready"
          ? '<button class="btn btn-gold" data-a="recall"><span data-ic="refresh"></span>إعادة النداء </button>'
          : '<button class="btn btn-green" data-a="ready"><span data-ic="bell"></span>جاهز للاستلام </button>') +
        '<button class="btn btn-red" data-a="done"><span data-ic="check"></span>تم التسليم </button>' +
        "</div>" +
        '<img class="qr" style="width:130px;height:130px;" loading="lazy" alt="QR ' + escapeHtml(order) + '" src="' + escapeHtml(qrSrc(trackUrl(order))) + '" />' +
        (o.phone
          ? '<a class="btn btn-wa" target="_blank" rel="noopener" href="' + escapeHtml(waLink(o.phone)) + '">واتساب العميل <span dir="ltr">' + escapeHtml(o.phone) + "</span></a>"
          : "") +
        '<button class="btn btn-ghost" data-a="copy"><span data-ic="copy"></span>نسخ لينك العميل </button>';
      card.querySelector('[data-a="ready"]')?.addEventListener("click", () => setStatus(order, "ready"));
      card.querySelector('[data-a="recall"]')?.addEventListener("click", () => setStatus(order, "ready", true));
      card.querySelector('[data-a="done"]').addEventListener("click", () => setStatus(order, "done"));
      card.querySelector('[data-a="copy"]').addEventListener("click", async (e) => {
        const ok = await copyText(trackUrl(order));
        const b = e.target.closest("button");
        if (ok && b) {
          b.textContent = "تم النسخ ✓";
          setTimeout(() => (b.textContent = "نسخ لينك العميل"), 1500);
        }
      });
      ordersEl.appendChild(card);
    });
  if (window.EmadIcons) window.EmadIcons.hydrate(ordersEl);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  setInterval(() => {
    document.querySelectorAll(".timer[data-t]").forEach((el) => {
      el.innerHTML = '<span class="livedot"></span>' + fmt(Date.now() - Number(el.dataset.t));
    });
  }, 1000);

  /* ---------- Numpad ---------- */
  $("numpad").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-d]");
    if (!b || b.id === "addBtn") return;
    const d = b.dataset.d;
    if (d === "C") pad = "";
    else if (d === "B") pad = pad.slice(0, -1);
    else if (pad.length < 4) pad += d;
    $("padView").textContent = pad === "" ? "–" : "#" + pad;
  });
  $("addBtn").addEventListener("click", () => {
    if (!pad) return;
    addOrder(pad);
    pad = "";
    $("padView").textContent = "–";
  });

  /* ---------- بدء ---------- */
  function boot() {
    // QR الكاونتر الثابت (وضع الرقم العشوائي)
    const tu = takeUrl();
    $("takeQr").src = qrSrc(tu);
    $("copyTake").addEventListener("click", async () => {
      const ok = await copyText(tu);
      if (ok) {
        $("copyTake").textContent = "تم النسخ ✓";
        setTimeout(() => ($("copyTake").textContent = "نسخ اللينك"), 1500);
      }
    });
    $("printTake").addEventListener("click", () => {
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(
        "<html dir='rtl'><head><title>QR الكاونتر - عماد أفندي</title></head>" +
          "<body style='text-align:center;font-family:sans-serif;padding:40px;'>" +
          "<h1>عماد أفندي</h1><h2>امسح الكود وخد رقمك</h2>" +
          "<img src='" + qrSrc(tu) + "' style='width:320px;height:320px;' />" +
          "<p>" + tu.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</p>" +
          "<script>onload=()=>{print();}<\/script></body></html>"
      );
      w.document.close();
    });
    if (useSupabase() && window.supabase) {
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
      refresh();
      sb.channel(CFG.CHANNEL)
        .on("postgres_changes", { event: "*", schema: "public", table: CFG.TABLE }, () => refresh())
        .subscribe();
      setInterval(refresh, 5000);
    } else {
      refresh();
      try {
        if ("BroadcastChannel" in window) {
          bc = new BroadcastChannel(CFG.BC_NAME);
          bc.onmessage = () => refresh();
        }
      } catch { /* تجاهل */ }
      window.addEventListener("storage", (e) => {
        if (e.key === CFG.STORE_KEY) refresh();
      });
      setInterval(refresh, CFG.POLL_MS || 2000);
    }
  }
})();
