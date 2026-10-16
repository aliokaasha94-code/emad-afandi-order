import fs from "node:fs";

const D = "smart-pager/";
function sub(file, re, rep) {
  const p = D + file;
  const s = fs.readFileSync(p, "utf8");
  const n = s.replace(re, rep);
  if (n !== s) {
    fs.writeFileSync(p, n);
    console.log("FIXED " + file + " :: " + re);
  } else {
    console.log("MISS " + file + " :: " + re);
  }
}

// index: hint review star
sub("index.html", /وادعمنا[^<]*<\//, "وادعمنا</");
// take: big emoji -> ticket icon
sub("take.html", /<div style="font-size:52px;">[^<]*<\/div>/, '<div class="big-ic"><span data-ic="ticket"></span></div>');
// kitchen: trailing emojis inside buttons that already have an icon span
sub("kitchen.js", /(<span data-ic="[a-z]+"><\/span>[^<]*?)[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u200D]+(<\/button>)/gu, "$1$2");
// kitchen: print window titles
sub("kitchen.js", /عماد أفندي [^<]*<\/h1>/, "عماد أفندي</h1>");
sub("kitchen.js", /وخد رقمك [^<]*<\/h2>/, "وخد رقمك</h2>");
