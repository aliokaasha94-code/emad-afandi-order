/* ============================================================
   المنادي الذكي - عماد أفندي | icons.js
   أيقونات فيكتور (SVG) بأسلوب احترافي موحد بدل الإيموجي.
   ============================================================ */
(function () {
  "use strict";

  function svg(paths) {
    return (
      '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths +
      "</svg>"
    );
  }

  window.EmadIcons = {
    bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    plus: svg('<path d="M5 12h14"/><path d="M12 5v14"/>'),
    refresh: svg('<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/>'),
    copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    printer: svg('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
    chat: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
    lock: svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    ticket: svg('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 11v2"/><path d="M13 17v2"/>'),
    walk: svg('<circle cx="13" cy="4" r="1.6"/><path d="M13 8l-2.5 5 3 1.5L15 21"/><path d="M10.5 13 7 14"/><path d="M13.5 14.5 16 16l1 5"/>'),
    pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    back: svg('<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>'),
    star: svg('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>'),
    clock: svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    coffee: svg('<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>'),
    volume: svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'),
    close: svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  };

  // تركيب تلقائي: أي عنصر فيه data-ic="bell" يتملي بالأيقونة
  function hydrate(root) {
    (root || document).querySelectorAll("[data-ic]").forEach((el) => {
      const name = el.getAttribute("data-ic");
      if (window.EmadIcons[name] && !el.dataset.done) {
        el.insertAdjacentHTML("afterbegin", window.EmadIcons[name]);
        el.dataset.done = "1";
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => hydrate());
  } else {
    hydrate();
  }
  window.EmadIcons.hydrate = hydrate;
})();
