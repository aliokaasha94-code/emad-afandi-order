/* ============================================================
   المنادي الذكي - عماد أفندي | Service Worker (sw.js)
   دعم إشعارات النظام المباشرة (System Notifications)
   صوت واهتزاز على قناة نوتيفيكيشن الموبايل (STREAM_NOTIFICATION)
   ============================================================ */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// استقبال طلب إظهار الإشعار من الصفحة الرئيسية
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data && data.type === "SHOW_NOTIFICATION") {
    const title = data.title || "عماد أفندي: طلبك جاهز";
    const options = data.options || {};
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// الضغط على الإشعار: تركيز الصفحة المفتوحة أو فتح الرابط
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
