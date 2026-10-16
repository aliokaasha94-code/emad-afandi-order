"use client";

import { useCallback, useEffect, useState } from "react";
import { playPagerChime, unlockAudio } from "@/lib/sound";

interface Order {
  id: string;
  order_number: string;
  items: string;
  customer_name?: string;
  customer_on_way?: boolean;
  status: "received" | "preparing" | "ready";
  created_at: string;
  ready_at: string | null;
}

export default function DashboardClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"board" | "numpad" | "counter">("board");
  const [padValue, setPadValue] = useState("");
  const [itemsValue, setItemsValue] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [lastOrder, setLastOrder] = useState<{
    trackUrl: string;
    qrDataUrl: string;
    order_number: string;
    items?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [localIp, setLocalIp] = useState("192.168.0.28:3000");
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Detect current hostname
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLocalIp(window.location.host);
    }
  }, []);

  // 1. Fetch Active Orders
  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/branches/active?branch=emad-kafrelsheikh", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        setOrders(data.orders);
      }
    } catch {
      // keep existing
    }
  }, []);

  // Poll orders every 3 seconds
  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Create Order
  async function handleCreateOrder(num?: string) {
    const orderNo = num || padValue.trim();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/tokens/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNo || undefined,
          items: itemsValue.trim(),
          customerName: nameValue.trim(),
          branchSlug: "emad-kafrelsheikh",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setLastOrder({
          trackUrl: data.trackUrl,
          qrDataUrl: data.qrDataUrl,
          order_number: data.order.order_number,
          items: itemsValue.trim(),
        });
        setPadValue("");
        setItemsValue("");
        setNameValue("");
        if (soundEnabled) {
          unlockAudio();
          playPagerChime();
        }
        loadOrders();
      } else {
        alert(`فشل إنشاء الطلب: ${data.error}`);
      }
    } finally {
      setLoading(false);
    }
  }

  // Advance Order Status
  async function advance(orderId: string, to: string) {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: to as Order["status"] } : o))
    );

    try {
      const res = await fetch("/api/v1/orders/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, to }),
      });
      const data = await res.json();
      if (data.ok) {
        if (to === "ready" && soundEnabled) {
          unlockAudio();
          playPagerChime();
        }
        loadOrders();
      } else {
        loadOrders();
      }
    } catch {
      loadOrders();
    }
  }

  // Copy helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      window.prompt("انسخ الرابط:", text);
    }
  };

  // Numpad key click
  const handleNumClick = (digit: string) => {
    if (digit === "C") setPadValue("");
    else if (digit === "B") setPadValue((prev) => prev.slice(0, -1));
    else if (padValue.length < 5) setPadValue((prev) => prev + digit);
  };

  return (
    <div className="min-h-screen bg-[#121517] text-white">
      {/* ------------------------------------------------------------- */}
      {/* Top Bar                                                       */}
      {/* ------------------------------------------------------------- */}
      <header className="no-print border-b border-white/10 bg-[#16191D] px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B5FF14] text-xl font-bold text-[#121517]">
              ☕
            </div>
            <div>
              <h1 className="font-cairo text-lg font-black tracking-wide text-white">
                عماد أفندي <span className="text-[#B5FF14]">| المنادي الذكي</span>
              </h1>
              <p className="text-xs text-white/50">فرع كفر الشيخ • شاشة الكاشير والمطبخ</p>
            </div>
          </div>

          {/* Wi-Fi Local IP address badge */}
          <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 text-xs font-mono text-white/80 border border-white/10">
            <span>🌐 رابط الموبايل:</span>
            <span className="font-bold text-[#B5FF14]" dir="ltr">http://{localIp}</span>
            <button
              onClick={() => copyToClipboard(`http://${localIp}`)}
              className="rounded-lg bg-white/10 px-2 py-1 text-white hover:bg-white/20"
            >
              {copiedLink ? "✓ تم" : "نسخ"}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 rounded-2xl bg-black/40 p-1 border border-white/5">
            <button
              onClick={() => setActiveTab("board")}
              className={`rounded-xl px-4 py-2 font-cairo text-sm font-bold transition ${
                activeTab === "board"
                  ? "bg-[#B5FF14] text-[#121517]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              📋 لوحة المطبخ ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("numpad")}
              className={`rounded-xl px-4 py-2 font-cairo text-sm font-bold transition ${
                activeTab === "numpad"
                  ? "bg-[#B5FF14] text-[#121517]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              🔢 كيبورد الأرقام
            </button>
            <button
              onClick={() => setActiveTab("counter")}
              className={`rounded-xl px-4 py-2 font-cairo text-sm font-bold transition ${
                activeTab === "counter"
                  ? "bg-[#B5FF14] text-[#121517]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              📱 شاشة الكاونتر
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: KITCHEN DISPLAY BOARD (KDS)                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "board" ? (
        <main className="mx-auto max-w-7xl p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-cairo text-2xl font-black">الطلبات النشطة</span>
              <span className="rounded-full bg-[#B5FF14]/20 px-3 py-1 font-cairo text-xs font-bold text-[#B5FF14]">
                {orders.length} طلب نشط
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  soundEnabled
                    ? "border-[#B5FF14]/40 bg-[#B5FF14]/10 text-[#B5FF14]"
                    : "border-white/10 text-white/50"
                }`}
              >
                {soundEnabled ? "🔊 صوت التنبيه مفعّل" : "🔇 الصوت مكتوم"}
              </button>
              <button
                onClick={loadOrders}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
              >
                تحديث الآن ⟳
              </button>
              <button
                onClick={() => setActiveTab("numpad")}
                className="rounded-xl bg-[#B5FF14] px-4 py-2 font-cairo text-sm font-black text-[#121517] hover:bg-[#A3EA0B]"
              >
                + أوردر جديد
              </button>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 py-20 text-center">
              <div className="text-5xl">☕</div>
              <h3 className="mt-4 font-cairo text-xl font-bold text-white/80">مفيش طلبات نشطة حالياً</h3>
              <p className="mt-2 text-sm text-white/50">الدنيا رايقة.. اضغط على &quot;+ أوردر جديد&quot; لبدء تسجيل الطلبات.</p>
              <button
                onClick={() => setActiveTab("numpad")}
                className="mt-6 rounded-2xl bg-[#B5FF14] px-6 py-3 font-cairo text-sm font-bold text-[#121517]"
              >
                تسجيل طلب جديد
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orders.map((o) => {
                const isReady = o.status === "ready";
                const isOnWay = Boolean(o.customer_on_way);
                return (
                  <article
                    key={o.id}
                    className={`relative overflow-hidden rounded-3xl border p-5 transition-all ${
                      isOnWay
                        ? "border-[#B5FF14] bg-[#B5FF14]/10 shadow-[0_0_20px_rgba(181,255,20,0.25)] ring-2 ring-[#B5FF14]"
                        : isReady
                        ? "border-[#B5FF14]/50 bg-[#16191D]"
                        : "border-white/10 bg-[#16191D]"
                    }`}
                  >
                    {/* Header: Order Number + Status Badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-white/50">رقم الطلب</span>
                        <div
                          dir="ltr"
                          className={`font-outfit text-4xl font-black ${
                            isReady ? "text-[#B5FF14]" : "text-white"
                          }`}
                        >
                          #{o.order_number}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            isReady
                              ? "bg-[#B5FF14] text-[#121517]"
                              : o.status === "preparing"
                              ? "bg-amber-400/20 text-amber-300"
                              : "bg-white/10 text-white/70"
                          }`}
                        >
                          {isReady ? "🔔 جاهز للاستلام" : o.status === "preparing" ? "⏳ قيد التحضير" : "استلمنا الطلب"}
                        </span>
                        {o.customer_name ? (
                          <span className="text-xs font-bold text-white/70">
                            👤 {o.customer_name}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Customer Items */}
                    {o.items ? (
                      <div className="mt-3 rounded-2xl bg-black/30 p-3 text-sm text-white/90">
                        {o.items}
                      </div>
                    ) : null}

                    {/* "أنا جاي" Indicator for Barista! */}
                    {isOnWay ? (
                      <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[#B5FF14] py-2.5 px-3 font-cairo text-sm font-black text-[#121517] animate-pulse">
                        <span>🚶</span>
                        <span>العميل في الطريق للكاونتر الآن!</span>
                      </div>
                    ) : null}

                    {/* Action Buttons */}
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      {o.status === "received" ? (
                        <button
                          onClick={() => advance(o.id, "preparing")}
                          className="min-h-[48px] rounded-xl bg-amber-400 py-3 font-cairo text-sm font-black text-[#121517] hover:bg-amber-300"
                        >
                          ابدأ التحضير ⏳
                        </button>
                      ) : null}

                      {o.status === "preparing" ? (
                        <button
                          onClick={() => advance(o.id, "ready")}
                          className="min-h-[48px] rounded-xl bg-[#B5FF14] py-3 font-cairo text-sm font-black text-[#121517] hover:bg-[#A3EA0B]"
                        >
                          طلبك جاهز! 🔔
                        </button>
                      ) : null}

                      {isReady ? (
                        <>
                          <button
                            onClick={() => advance(o.id, "ready")}
                            className="min-h-[48px] rounded-xl bg-amber-400 py-3 font-cairo text-sm font-black text-[#121517] hover:bg-amber-300"
                          >
                            رن تاني 🔁
                          </button>
                          <button
                            onClick={() => advance(o.id, "picked_up")}
                            className="min-h-[48px] rounded-xl bg-white py-3 font-cairo text-sm font-black text-[#121517] hover:bg-white/90"
                          >
                            تم التسليم ✓
                          </button>
                        </>
                      ) : null}

                      <button
                        onClick={() => advance(o.id, "cancelled")}
                        className="rounded-xl border border-white/10 bg-white/5 py-3 font-cairo text-xs text-white/50 hover:bg-red-500/20 hover:text-red-400"
                      >
                        إلغاء ✕
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: NUMPAD FAST ENTRY (الكاشير السريع)                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "numpad" ? (
        <main className="mx-auto max-w-md p-6">
          <div className="rounded-3xl border border-white/10 bg-[#16191D] p-6 shadow-2xl">
            <h2 className="text-center font-cairo text-xl font-black text-white">
              إدخال رقم الطلب (الكاشير)
            </h2>
            <p className="mt-1 text-center text-xs text-white/50">
              اكتب رقم البون المطبوع من الكاشير أو اضغط إنشاء مباشرة
            </p>

            {/* Big Number View */}
            <div
              dir="ltr"
              className="mt-4 flex h-20 items-center justify-center rounded-2xl bg-black/50 font-outfit text-5xl font-black tracking-wider text-[#B5FF14] border border-white/10"
            >
              {padValue ? `#${padValue}` : "–"}
            </div>

            {/* Item notes / Customer name input */}
            <div className="mt-4 space-y-2">
              <input
                type="text"
                value={itemsValue}
                onChange={(e) => setItemsValue(e.target.value)}
                placeholder="تفاصيل الطلب (مثال: 2 تركي زيادة، 1 كابتشينو)"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white placeholder-white/40 focus:border-[#B5FF14] focus:outline-none"
              />
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="اسم العميل (اختياري)"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-[#B5FF14] focus:outline-none"
              />
            </div>

            {/* Numpad Grid */}
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "B"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleNumClick(key)}
                  className={`h-14 rounded-2xl font-outfit text-2xl font-bold shadow transition active:scale-95 ${
                    key === "C"
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 font-cairo text-base"
                      : key === "B"
                      ? "bg-white/10 text-white hover:bg-white/20 font-cairo text-base"
                      : "bg-white/5 text-white hover:bg-white/15 border border-white/5"
                  }`}
                >
                  {key === "C" ? "مسح" : key === "B" ? "⌫" : key}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <button
              onClick={() => handleCreateOrder()}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B5FF14] py-4 font-cairo text-lg font-black text-[#121517] shadow-xl hover:bg-[#A3EA0B] active:scale-95 disabled:opacity-50"
            >
              <span>+</span>
              <span>{loading ? "جاري الإنشاء..." : "إنشاء الطلب وتوليد QR"}</span>
            </button>
          </div>

          {/* Generated QR View for Cashier */}
          {lastOrder ? (
            <div className="mt-6 rounded-3xl border border-[#B5FF14]/30 bg-[#16191D] p-6 text-center">
              <span className="text-xs text-white/50">الطلب الأخير جاهز</span>
              <div dir="ltr" className="font-outfit text-4xl font-black text-[#B5FF14]">
                #{lastOrder.order_number}
              </div>

              {/* QR Image */}
              <div className="mx-auto mt-4 w-48 rounded-2xl bg-white p-3 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lastOrder.qrDataUrl} alt="QR" className="h-full w-full object-contain" />
              </div>

              <p className="mt-3 break-all font-mono text-xs text-white/40" dir="ltr">
                {lastOrder.trackUrl}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-white py-2.5 font-cairo text-xs font-bold text-[#121517] hover:bg-white/90"
                >
                  🖨️ طباعة ريسيت
                </button>
                <button
                  onClick={() => copyToClipboard(lastOrder.trackUrl)}
                  className="rounded-xl border border-white/10 bg-white/5 py-2.5 font-cairo text-xs font-bold text-white hover:bg-white/10"
                >
                  {copiedLink ? "✓ تم النسخ" : "🔗 نسخ الرابط"}
                </button>
              </div>

              {/* Thermal Receipt Print layout */}
              <div className="print-only hidden text-black text-center font-mono">
                <h1 style={{ fontSize: "28px", fontWeight: "bold" }}>عماد أفندي</h1>
                <p style={{ fontSize: "14px" }}>كفر الشيخ • قهوتك على مزاجك</p>
                <hr style={{ margin: "8px 0" }} />
                <h2 style={{ fontSize: "40px", fontWeight: "900" }}>#{lastOrder.order_number}</h2>
                {lastOrder.items ? <p style={{ fontSize: "14px" }}>{lastOrder.items}</p> : null}
                <hr style={{ margin: "8px 0" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lastOrder.qrDataUrl} alt="Receipt QR" style={{ width: "200px", margin: "0 auto" }} />
                <p style={{ fontSize: "12px", marginTop: "8px" }}>امسح الكود وتابع طلبك على موبايلك</p>
              </div>
            </div>
          ) : null}
        </main>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: CUSTOMER FACING COUNTER DISPLAY (شاشة الكاونتر)        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "counter" ? (
        <main className="flex min-h-[85vh] flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md rounded-[36px] border border-white/10 bg-[#16191D] p-8 shadow-2xl">
            <div className="flex items-center justify-center gap-2">
              <span className="font-cairo text-2xl font-black text-white">عماد أفندي</span>
              <span className="text-2xl">☕</span>
            </div>
            <p className="mt-1 font-cairo text-sm text-[#B5FF14]">
              امسح الكود بكاميرا موبايلك لمتابعة طلبك
            </p>

            {lastOrder ? (
              <>
                <div dir="ltr" className="mt-4 font-outfit text-5xl font-black text-white">
                  #{lastOrder.order_number}
                </div>
                <div className="mx-auto mt-4 w-64 rounded-3xl bg-white p-4 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lastOrder.qrDataUrl} alt="QR" className="h-full w-full object-contain" />
                </div>
                <p className="mt-4 font-cairo text-xs text-white/50">
                  بدون تطبيق • بدون تسجيل • جوالك هيرن أول ما يجهز
                </p>
              </>
            ) : (
              <div className="py-16 text-white/50">
                <p className="text-4xl">📱</p>
                <p className="mt-3 font-cairo text-sm">
                  بمجرد إنشاء أي طلب من الكاشير، سيظهر الـ QR هنا تلقائياً ليمسحه العميل.
                </p>
              </div>
            )}
          </div>
        </main>
      ) : null}
    </div>
  );
}
