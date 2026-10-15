/* ============================================================
   المنادي الذكي - عماد أفندي | config.js
   كل الإعدادات في مكان واحد. عدّل هنا بس.
   ============================================================ */
window.EMAD_CONFIG = {
  // --- الربط اللحظي (اختياري) ---
  // لو سيبتهم فاضيين، المشروع هيشتغل محلياً فوراً
  // (BroadcastChannel + localStorage + Polling) بين التابات على نفس الجهاز.
  // لو عايز الربط يشتغل بين أجهزة مختلفة (موبايل العميل + تابلت الكاشير)،
  // اعمل مشروع Supabase مجاني وحط المفتاحين هنا:
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

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
