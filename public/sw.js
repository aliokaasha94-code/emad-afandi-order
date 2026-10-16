// Emad Effendi Service Worker
const CACHE_NAME = "emad-effendi-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "طلبك جاهز! - عماد أفندي";
  const options = {
    body: data.body || "تفضّل استلمه من الكاونتر.. بالهنا والشفا!",
    icon: "/icon.png",
    badge: "/badge.png",
    vibrate: [400, 200, 400, 200, 800],
    data: {
      url: data.url || "/",
    },
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click notification opens/focuses the window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow(event.notification.data.url || "/");
    })
  );
});
