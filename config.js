/* ============================================================
   المنادي الذكي - عماد أفندي | config.js
   كل الإعدادات في مكان واحد. عدّل هنا بس.
   ============================================================ */
window.EMAD_CONFIG = {
  // --- الربط اللحظي ---
  SUPABASE_URL: "https://cuppprqsttafhzulnyyq.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cHBwcnFzdHRhZmh6dWxueXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDA5MjQsImV4cCI6MjA5NTA3NjkyNH0.pcoLbQwqmwYUyu1qmy0PFZHJZddKk1zQQD3KoTsBHIY",

  TABLE: "orders",          // اسم الجدول في Supabase
  CHANNEL: "order-status",  // اسم قناة الـ Realtime

  // --- أرقام التذاكر العشوائية (وضع الـ scan) ---
  TAKE_MIN: 1,
  TAKE_MAX: 99,

  // --- التواصل مع العميل ---
  PHONE_ENABLED: true, // إظهار خانة رقم الواتساب (اختياري) للعميل

  // --- التوقيتات ---
  POLL_MS: 2000,            // فحص الحالة كل ثانيتين (وضع محلي)
  CHIME_EVERY_MS: 3000,     // تكرار الجرس كل 3 ثواني لحد الاستلام
  READY_VIB: [400, 200, 400, 200, 800], // نمط اهتزاز الجاهزية

  // --- روابط ---
  // رابط تقييم جوجل مابس (بدّل xxx برابط مكانك الحقيقي من Google Business)
  MAPS_URL: "https://www.google.com/maps/search/?api=1&query=عماد+أفندي+كفر+الشيخ",

  // مفاتيح التخزين المحلي (لا تغيّرها)
  STORE_KEY: "emad_orders_v1",
  BC_NAME: "emad-pager",
};

/* ============================================================
   SQL إنشاء جدول Supabase (نفّذه مرة واحدة في SQL Editor):
   ------------------------------------------------------------
   create table if not exists orders (
     order_number text primary key,
     status text not null default 'preparing',
     phone text default '',
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );
   alter table orders enable row level security;
   create policy "public all" on orders
     for all using (true) with check (true);
   -- لو الجدول موجود عندك من قبل، نفّذ السطر ده بس:
   -- alter table orders add column if not exists phone text default '';
   -- فعّل Realtime للجدول من Database > Replication > orders
   ============================================================ */
