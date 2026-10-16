"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playPagerChime, startChimeLoop, stopChimeLoop, unlockAudio, vibrate } from "@/lib/sound";

type Status = "received" | "preparing" | "ready" | "picked_up" | "cancelled";

interface Snapshot {
  ok: boolean;
  id?: string;
  order_number?: string;
  items?: string;
  customer_name?: string;
  customer_on_way?: boolean;
  status?: Status;
  queue_ahead?: number;
  error?: string;
}

export default function TrackClient({ token }: { token: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [showHow, setShowHow] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [onWaySent, setOnWaySent] = useState(false);
  const [soundTested, setSoundTested] = useState(false);
  const wasReady = useRef(false);

  // 1. Fetch Order Status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/orders/status?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as Snapshot;
      if (data.ok) {
        setSnap(data);
        if (data.customer_name && !customerName) {
          setCustomerName(data.customer_name);
        }
        if (data.customer_on_way) {
          setOnWaySent(true);
        }

        // Trigger alarm when state transitions to READY
        if (data.status === "ready" && !wasReady.current) {
          wasReady.current = true;
          startChimeLoop(3000);
          document.title = `🔔 طلبك جاهز #${data.order_number} - عماد أفندي`;
        }
        if (data.status !== "ready") {
          wasReady.current = false;
          stopChimeLoop();
        }
      } else {
        setSnap(data);
      }
    } catch {
      // offline / keep last state
    }
  }, [token, customerName]);

  // Poll status every 2.5 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2500);
    return () => {
      clearInterval(interval);
      stopChimeLoop();
    };
  }, [fetchStatus]);

  // Check if first-time user needs the onboarding modal
  useEffect(() => {
    try {
      const seen = localStorage.getItem("emad_how_seen_v2");
      if (!seen) {
        setShowHow(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Dismiss onboarding & unlock audio + notifications
  const handleOnboardingDismiss = async () => {
    unlockAudio();
    playPagerChime();
    vibrate([200, 100, 200]);
    setSoundTested(true);
    setShowHow(false);
    try {
      localStorage.setItem("emad_how_seen_v2", "1");
    } catch {
      // ignore
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }
  };

  // Test sound manually
  const handleTestSound = () => {
    unlockAudio();
    playPagerChime();
    vibrate([300, 150, 300]);
    setSoundTested(true);
  };

  // "أنا جاي" action
  const handleOnWay = async () => {
    stopChimeLoop();
    setOnWaySent(true);
    try {
      await fetch("/api/v1/orders/on-way", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch {
      // ignore
    }
  };

  // Save customer name
  const handleSaveName = async (val: string) => {
    setCustomerName(val);
    try {
      await fetch("/api/v1/orders/update-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: val }),
      });
    } catch {
      // ignore
    }
  };

  if (!snap) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F9F8F3] px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-espresso/20 border-t-espresso" />
        <p className="mt-4 font-cairo text-lg font-bold text-espresso/80">بنحمّل تفاصيل طلبك...</p>
      </div>
    );
  }

  if (!snap.ok) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F9F8F3] px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
          ✕
        </div>
        <h1 className="mt-4 font-cairo text-2xl font-black text-espresso">الرابط غير صحيح أو منتهي</h1>
        <p className="mt-2 max-w-xs text-sm text-espresso/70">
          تأكد من مسح كود QR من ريسيت الكاشير أو الكاونتر.
        </p>
      </div>
    );
  }

  const isReady = snap.status === "ready";
  const isDone = snap.status === "picked_up";
  const isCancelled = snap.status === "cancelled";
  const step = snap.status === "received" ? 1 : snap.status === "preparing" ? 2 : 3;

  // -------------------------------------------------------------
  // VIEW 1: ORDER READY! (The Lime Green Experience - Image 1)
  // -------------------------------------------------------------
  if (isReady) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-between bg-[#B5FF14] px-5 py-8 text-[#121517] select-none transition-colors duration-500">
        {/* Top Header */}
        <header className="flex w-full max-w-sm items-center justify-between">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="rounded-full bg-black/10 px-3 py-1.5 text-xs font-bold backdrop-blur-sm"
          >
            {lang === "ar" ? "English 文A" : "عربي"}
          </button>
          <div className="flex items-center gap-2">
            <span className="font-cairo text-base font-extrabold text-[#121517]">عماد أفندي</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-lg">
              ☕
            </div>
          </div>
        </header>

        {/* Center Content */}
        <section className="flex w-full max-w-sm flex-col items-center text-center">
          {/* Bell Icon in rounded box */}
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#121517] shadow-xl animate-bounce">
            <svg
              className="h-10 w-10 text-[#B5FF14]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 6 14h12a1 1 0 0 0 .707-1.707L18 11.586V8a6 6 0 0 0-6-6zm0 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3z" />
            </svg>
          </div>

          <h1 className="mt-6 font-cairo text-4xl font-black tracking-tight text-[#121517]">
            {lang === "ar" ? "طلبك جاهز!" : "Your order is ready!"}
          </h1>
          <p className="mt-2 text-lg font-bold text-[#121517]/80">
            {lang === "ar" ? "تفضّل استلمه من الكاونتر" : "Please pick it up from the counter"}
          </p>

          {/* Dark Order Number Card with Watermark */}
          <div className="relative mt-7 w-full rounded-[32px] bg-[#121517] p-8 shadow-2xl">
            {/* Watermark Stamp */}
            <div className="watermark-stamp">
              {lang === "ar" ? "جاهز" : "READY"}
            </div>

            <p className="text-sm font-semibold text-white/70">
              {lang === "ar" ? "ورجيهم هالرقم" : "Show them this number"}
            </p>

            <div
              dir="ltr"
              className="mt-2 font-outfit text-[clamp(4.5rem,22vw,6.5rem)] font-black leading-none tracking-tight text-[#B5FF14] drop-shadow-[0_0_25px_rgba(181,255,20,0.4)]"
            >
              {snap.order_number}
            </div>

            {snap.items ? (
              <p className="mt-3 text-xs text-white/50">{snap.items}</p>
            ) : null}
          </div>
        </section>

        {/* Floating "أنا جاي" Pill Button */}
        <footer className="w-full max-w-sm pt-4">
          <button
            onClick={handleOnWay}
            disabled={onWaySent}
            className={`flex w-full items-center justify-center gap-3 rounded-full py-5 text-xl font-black shadow-xl transition-transform active:scale-95 ${
              onWaySent
                ? "bg-[#121517]/20 text-[#121517] cursor-default"
                : "bg-[#121517] text-[#B5FF14] hover:bg-black"
            }`}
          >
            <span>🚶</span>
            <span>{onWaySent ? (lang === "ar" ? "✓ بلّغنا الكاشير إنك جاي" : "✓ Staff notified: On the way") : (lang === "ar" ? "أنا جاي" : "I'm on my way")}</span>
          </button>
        </footer>
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: PICKED UP / COMPLETED
  // -------------------------------------------------------------
  if (isDone) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F9F8F3] px-6 text-center">
        <div className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-lg border border-[#E9E7DF]">
          <div className="text-3xl text-amber-400">★★★★★</div>
          <h2 className="mt-4 font-cairo text-2xl font-black text-[#14171A]">
            بالهنا والشفا!
          </h2>
          <p className="mt-2 text-sm text-[#727B83]">
            يومك جميل مع عماد أفندي.. قهوتك دايماً على مزاجك.
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=عماد+أفندي+كفر+الشيخ"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#14171A] py-4 font-cairo text-base font-bold text-white shadow-md active:scale-95"
          >
            <span>⭐</span>
            <span>قيّمنا على جوجل مابس</span>
          </a>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: IN PROGRESS / PREPARING (The Ticket Card - Image 2)
  // -------------------------------------------------------------
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between bg-[#F9F8F3] px-5 py-6 text-[#14171A]">
      {/* Top Header */}
      <header className="flex w-full max-w-sm items-center justify-between">
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="rounded-full border border-[#E9E7DF] bg-white px-3 py-1.5 text-xs font-bold text-[#14171A] shadow-sm"
        >
          {lang === "ar" ? "English 文A" : "عربي"}
        </button>

        <div className="flex items-center gap-2">
          <span className="font-cairo text-base font-extrabold text-[#14171A]">عماد أفندي</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E5A823]/20 text-[#A67512] font-bold">
            ☕
          </div>
        </div>
      </header>

      {/* Main Ticket Section */}
      <div className="w-full max-w-sm space-y-4 my-auto">
        {/* Perforated Ticket Card */}
        <section className="ticket-card border border-[#E9E7DF] p-6 text-center">
          <div className="ticket-notch-left" />
          <div className="ticket-notch-right" />
          <div className="ticket-divider" />

          {/* Top Half of Ticket */}
          <div className="pb-8">
            <p className="text-sm font-semibold text-[#727B83]">
              {lang === "ar" ? "رقم طلبك" : "Your Order Number"}
            </p>
            <div
              dir="ltr"
              className="mt-1 font-outfit text-[clamp(4rem,20vw,5.5rem)] font-black leading-none tracking-tight text-[#14171A]"
            >
              {snap.order_number}
            </div>
            {snap.items ? (
              <p className="mt-2 text-xs font-medium text-[#727B83]">{snap.items}</p>
            ) : null}
          </div>

          {/* Bottom Half of Ticket */}
          <div className="pt-8">
            {/* 3-Step Stepper */}
            <div className="flex items-center justify-between px-2">
              {/* Step 1: استلمنا طلبك */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14171A] text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="mt-2 text-xs font-bold text-[#14171A]">
                  {lang === "ar" ? "استلمنا طلبك" : "Received"}
                </span>
              </div>

              {/* Connector line 1-2 */}
              <div className="h-[3px] flex-1 bg-[#14171A] mx-2" />

              {/* Step 2: قيد التحضير */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                    step >= 2
                      ? "bg-[#B5FF14] text-[#14171A] animate-pulse-subtle shadow-[0_0_12px_rgba(181,255,20,0.6)]"
                      : "bg-[#E9E7DF] text-[#727B83]"
                  }`}
                >
                  2
                </div>
                <span className="mt-2 text-xs font-bold text-[#14171A]">
                  {lang === "ar" ? "قيد التحضير" : "Preparing"}
                </span>
              </div>

              {/* Connector line 2-3 */}
              <div className="h-[3px] flex-1 bg-[#E9E7DF] mx-2" />

              {/* Step 3: جاهز */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                    step >= 3
                      ? "bg-[#B5FF14] text-[#14171A]"
                      : "bg-[#E9E7DF] text-[#727B83]"
                  }`}
                >
                  3
                </div>
                <span className="mt-2 text-xs font-medium text-[#727B83]">
                  {lang === "ar" ? "جاهز" : "Ready"}
                </span>
              </div>
            </div>

            {/* Smart Banner inside card */}
            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[#F4F3EE] p-4 text-center">
              <span className="text-lg">🕒</span>
              <div className="text-right">
                <p className="font-cairo text-sm font-extrabold text-[#14171A]">
                  {lang === "ar" ? "رح نرنّلك أول ما يجهز" : "We will ring you once ready"}
                </p>
                <p className="text-xs text-[#727B83]">
                  {typeof snap.queue_ahead === "number" && snap.queue_ahead > 0
                    ? (lang === "ar" ? `قدامك ${snap.queue_ahead} طلبات في الانتظار` : `${snap.queue_ahead} orders ahead`)
                    : (lang === "ar" ? "طلبك هو التالي" : "Your order is up next!")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Notification Status Card */}
        <section className="flex items-center justify-between rounded-3xl border border-[#E9E7DF] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B5FF14] text-[#14171A]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-cairo text-sm font-bold text-[#14171A]">
                {lang === "ar" ? "التنبيه مفّعل" : "Alert Active"}
              </p>
              <p className="text-xs text-[#727B83]">
                {lang === "ar" ? "رح يوصلك تنبيه حتى لو سكّرت الصفحة ✓" : "Alert works even if page closed ✓"}
              </p>
            </div>
          </div>

          <button
            onClick={handleTestSound}
            className="rounded-xl border border-[#E9E7DF] bg-[#F9F8F3] px-3 py-2 text-xs font-bold text-[#14171A] hover:bg-black/5 active:scale-95"
          >
            {soundTested ? "✓ تمام الصوت" : (lang === "ar" ? "🔊 جرّب الصوت" : "🔊 Test")}
          </button>
        </section>

        {/* Customer Name Optional Input */}
        <div className="relative">
          <input
            type="text"
            value={customerName}
            onChange={(e) => handleSaveName(e.target.value)}
            placeholder={lang === "ar" ? "✏️ اسمك (اختياري)" : "✏️ Your Name (Optional)"}
            className="w-full rounded-2xl border border-transparent bg-white/70 px-4 py-3 text-center text-sm font-medium text-[#14171A] placeholder-[#727B83] shadow-sm focus:border-[#14171A] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-sm pt-4 text-center">
        <p className="text-xs font-medium text-[#727B83]">
          {lang === "ar" ? "بواسطة عماد أفندي ☕ • قهوتك على مزاجك" : "Powered by Emad Afandi ☕"}
        </p>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* ONBOARDING MODAL / BOTTOM SHEET (Image 3)                     */}
      {/* ------------------------------------------------------------- */}
      {showHow ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-t-[36px] sm:rounded-[36px] bg-[#F9F8F3] p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4">
              <button
                onClick={() => setShowHow(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-lg font-bold hover:bg-black/10"
              >
                ✕
              </button>
              <span className="text-xs font-bold text-[#727B83]">
                {lang === "ar" ? "عماد أفندي" : "Emad Afandi"}
              </span>
            </div>

            {/* Modal Title */}
            <h2 className="mt-2 text-center font-cairo text-2xl font-black text-[#14171A]">
              {lang === "ar" ? "هيك بيشتغل النظام" : "How It Works"}
            </h2>

            {/* 3 Illustrated Step Cards */}
            <div className="mt-6 grid grid-cols-3 gap-2">
              {/* Card 1 */}
              <div className="flex flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm border border-[#E9E7DF]">
                <div className="relative flex h-14 w-12 items-center justify-center rounded-xl border-2 border-[#14171A] bg-white">
                  <span className="font-outfit text-sm font-bold">1</span>
                </div>
                <span className="mt-2 font-cairo text-xs font-bold text-[#14171A]">
                  {lang === "ar" ? "هذا رقم طلبك" : "Your number"}
                </span>
              </div>

              {/* Card 2 */}
              <div className="flex flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm border border-[#E9E7DF]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#B5FF14]/30 text-2xl">
                  ♨️
                </div>
                <span className="mt-2 font-cairo text-xs font-bold text-[#14171A]">
                  {lang === "ar" ? "المحل بحضّر طلبك" : "Preparing"}
                </span>
              </div>

              {/* Card 3 */}
              <div className="flex flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm border border-[#E9E7DF]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#B5FF14] text-2xl animate-pulse">
                  🔔
                </div>
                <span className="mt-2 font-cairo text-xs font-bold text-[#14171A]">
                  {lang === "ar" ? "جوالك برنّ لما يجهز" : "Phone rings"}
                </span>
              </div>
            </div>

            {/* Modal Action Button */}
            <div className="mt-8 text-center">
              <button
                onClick={handleOnboardingDismiss}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-[#121517] py-4 font-cairo text-lg font-black text-white shadow-xl hover:bg-black active:scale-95"
              >
                <span className="text-[#B5FF14]">🔔</span>
                <span>{lang === "ar" ? "تمام، رنّلي لما يجهز" : "Got it, ring me!"}</span>
              </button>
              <p className="mt-3 text-xs text-[#727B83]">
                {lang === "ar"
                  ? "بعدها رح يسألك المتصفح: اضغط «سماح»"
                  : "Then browser will ask: click 'Allow'"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
