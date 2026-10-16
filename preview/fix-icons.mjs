import fs from "node:fs";

const D = "smart-pager/";
const jobs = {
  "index.html": [
    [/<script src="config\.js"><\/script>/, '<script src="config.js"></script>\n  <script src="icons.js"></script>'],
    [/id="enterTitle"|دخل رقم الأوردر[^<]*</, 'دخل رقم الأوردر اللي على الريسيت</'],
    [/id="bellBtn">[^<]*</, 'id="bellBtn"><span data-ic="bell"></span>اضغط هنا لتفعيل جرس النداء</'],
    [/id="onWayBtn" hidden>[^<]*</, 'id="onWayBtn" hidden><span data-ic="walk"></span>أنا في طريقي للاستلام</'],
    [/id="receivedBtn" hidden>[^<]*</, 'id="receivedBtn" hidden><span data-ic="check"></span>استلمت</'],
    [/id="goBtn">[^<]*</, 'id="goBtn"><span data-ic="back"></span>تابع طلبك</'],
    [/id="mapsLink"([^>]*)>[^<]*</, 'id="mapsLink"$1><span data-ic="pin"></span>قيّمنا على خرائط جوجل</'],
    [/id="statusLine">[^<]*</, 'id="statusLine">طلبك قيد التحضير بكل حب</'],
    [/id="liveHint">[^<]*</, 'id="liveHint">اقعد براحتك.. أول ما طلبك يجهز هننده عليك</'],
    [/for="phoneInput">[^<]*</, 'for="phoneInput">سيب رقم الواتساب (اختياري) عشان نتواصل معاك</'],
    [/بالهنا والشفا![^<]*</, 'بالهنا والشفا! يومك جميل مع عماد أفندي</'],
  ],
  "kitchen.html": [
    [/<script src="config\.js"><\/script>/, '<script src="config.js"></script>\n  <script src="icons.js"></script>'],
    [/id="pinBtn">[^<]*</, 'id="pinBtn"><span data-ic="lock"></span>دخول</'],
    [/id="addBtn"([^>]*)>[^<]*</, 'id="addBtn"$1><span data-ic="plus"></span>إضافة</'],
    [/id="copyTake">[^<]*</, 'id="copyTake"><span data-ic="copy"></span>نسخ اللينك</'],
    [/id="printTake">[^<]*</, 'id="printTake"><span data-ic="printer"></span>اطبع</'],
    [/دخل PIN الكاشير[^<]*</, 'دخل PIN الكاشير</'],
    [/<p class="hint">العميل يمسح[^<]*<\/p>\n?/, ''],
    [/[^\s] أوردر جديد/, '<span data-ic="plus"></span>أوردر جديد'],
    [/(<span class="font-head"[^>]*>)[^<]*?(QR الكاشير الثابت)/, '$1$2'],
    [/اطبعه وحطه على الكاشير[^<]*</, 'اطبعه وحطه على الكاشير — العميل يمسحه وياخد رقم عشوائي لوحده</'],
  ],
  "take.html": [
    [/<script src="config\.js"><\/script>/, '<script src="config.js"></script>\n  <script src="icons.js"></script>'],
    [/id="takeBtn">[^<]*</, 'id="takeBtn"><span data-ic="ticket"></span>استلم رقمك</'],
    [/دوس الزرار وهيطلعلك رقم أوردر عشوائي<br \/>وهنتابع معاك لحد ما طلبك يجهز[^<]*</, 'دوس الزرار وهيطلعلك رقم أوردر عشوائي<br />وهنتابع معاك لحد ما طلبك يجهز</'],
  ],
  "app.js": [
    [/bellBtn\.textContent = ok \? "[^"]*" : "[^"]*";/, 'bellBtn.innerHTML = window.EmadIcons.check + (ok ? "الجرس مفعّل" : "الجرس مفعّل (لو مسمعتش دوس تاني)");'],
    [/statusLine\.innerHTML = "[^"]*";/, 'statusLine.innerHTML = "طلبك جاهز للاستلام يا فندم!<br><small>اتفضل استلم من عند الكاشير</small>";'],
    [/onWayBtn\.textContent = "[^"]*";/, 'onWayBtn.textContent = "مستنيينك عند الكاشير يا فندم";'],
    [/document\.title = "🔔 طلبك جاهز! - عماد أفندي";/, 'document.title = "طلبك جاهز! - عماد أفندي";'],
    [/liveHint\.textContent = "[^"]*";/, 'liveHint.textContent = "رقمك بينوّر عند الكاشير";'],
    [/statusLine\.textContent = "[^"]*قيد التحضير[^"]*";/, 'statusLine.textContent = "طلبك قيد التحضير بكل حب";'],
  ],
  "kitchen.js": [
    [/data-a="ready">جاهز للاستلام/, 'data-a="ready"><span data-ic="bell"></span>جاهز للاستلام'],
    [/data-a="recall">إعادة النداء/, 'data-a="recall"><span data-ic="refresh"></span>إعادة النداء'],
    [/data-a="done">تم التسليم/, 'data-a="done"><span data-ic="check"></span>تم التسليم'],
    [/data-a="copy">نسخ لينك العميل/, 'data-a="copy"><span data-ic="copy"></span>نسخ لينك العميل'],
    [/>واتساب العميل [^<]*<span/, '>واتساب العميل <span'],
    [/b\.textContent = "نسخ لينك العميل [^"]*"/, 'b.textContent = "نسخ لينك العميل"'],
    [/b\.textContent = "اتنسخ [^"]*"/, 'b.textContent = "تم النسخ ✓"'],
    [/\$\("copyTake"\)\.textContent = "اتنسخ [^"]*"/, '$("copyTake").textContent = "تم النسخ ✓"'],
    [/\$\("copyTake"\)\.textContent = "نسخ اللينك [^"]*"/, '$("copyTake").textContent = "نسخ اللينك"'],
    [/الدنيا رايقة [^<"]*</, 'الدنيا رايقة</'],
    [/PIN غلط، حاول تاني [^<"]*"/, 'PIN غلط، حاول تاني"'],
    [/ordersEl\.appendChild\(card\);\n    \}\);/, 'ordersEl.appendChild(card);\n    });\n  if (window.EmadIcons) window.EmadIcons.hydrate(ordersEl);'],
  ],
  "take.js": [
    [/btn\.textContent = "بنجهز رقمك\.\.\. [^"]*";/, 'btn.textContent = "بنجهز رقمك...";'],
    [/btn\.textContent = "استلم رقمك [^"]*";/, 'btn.textContent = "استلم رقمك";'],
    [/err\.textContent = "[^"]*";/, 'err.textContent = "حصلت مشكلة، دوس تاني";'],
  ],
};

let total = 0;
for (const [file, rules] of Object.entries(jobs)) {
  let s = fs.readFileSync(D + file, "utf8");
  for (const [re, rep] of rules) {
    const n = s;
    s = s.replace(re, rep);
    if (s !== n) total++;
  }
  fs.writeFileSync(D + file, s);
}
console.log("REPLACED=" + total);
