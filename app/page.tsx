"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const [orderInput, setOrderInput] = useState("");
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = orderInput.trim();
    if (!clean) return;
    router.push(`/t/${encodeURIComponent(clean)}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-[#F9F8F3] px-6 py-12 text-[#14171A]">
      <header className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#14171A] text-3xl shadow-lg">
          ☕
        </div>
        <h1 className="mt-4 font-cairo text-4xl font-black tracking-tight text-[#14171A]">
          عماد أفندي
        </h1>
        <p className="mt-2 text-base font-bold text-[#727B83]">
          ودّع أجهزة النداء والبيجر.. تابع طلبك على موبايلك
        </p>
      </header>

      {/* Center Box: Track order or cashier */}
      <div className="w-full max-w-sm space-y-4">
        {/* Track by Order Number Card */}
        <div className="rounded-[32px] border border-[#E9E7DF] bg-white p-6 shadow-sm text-center">
          <p className="font-cairo text-sm font-bold text-[#14171A]">
            معاك رقم الأوردر من الكاشير؟
          </p>
          <p className="mt-1 text-xs text-[#727B83]">
            اكتب الرقم هنا أو امسح كود QR المطبوع على الريسيت
          </p>

          <form onSubmit={handleTrack} className="mt-4 space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              placeholder="مثال: 1 أو 24"
              className="w-full rounded-2xl border border-[#E9E7DF] bg-[#F9F8F3] px-4 py-3.5 text-center font-outfit text-2xl font-black text-[#14171A] placeholder-[#727B83]/40 focus:border-[#14171A] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-[#14171A] py-3.5 font-cairo text-base font-black text-[#B5FF14] shadow-md hover:bg-black active:scale-95"
            >
              تابع حالة طلبك 🔔
            </button>
          </form>
        </div>

        {/* Cashier / Staff shortcut */}
        <div className="rounded-2xl border border-[#E9E7DF] bg-white/50 p-4 text-center">
          <span className="text-xs text-[#727B83]">أنت من فريق العمل أو الكاشير؟</span>
          <Link
            href="/dashboard"
            className="mt-2 block w-full rounded-xl bg-[#B5FF14] py-3 font-cairo text-sm font-black text-[#121517] shadow-sm hover:bg-[#A3EA0B] active:scale-95"
          >
            فتح لوحة تحكم الكاشير والمطبخ 💻
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-[#727B83]">
        فرع كفر الشيخ • شغال 100% بدون تطبيق وبدون أجهزة شحن
      </footer>
    </main>
  );
}
