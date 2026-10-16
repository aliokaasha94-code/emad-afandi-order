import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    p = path.normalize(p).replace(/^(\.\.[\\/])+/, "");
    const repoRoot = process.env.PAGER_ROOT || (fs.existsSync(path.join(process.cwd(), "index.html")) ? process.cwd() : path.join(process.cwd(), "emad-afandi-order"));
    const full = path.join(repoRoot, p);
    const withHtml = full.endsWith(".html") || path.extname(full) ? null : full + ".html";
    const tryFiles = withHtml ? [full, withHtml] : [full];
    (function serve(i) {
      if (i >= tryFiles.length) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      fs.readFile(tryFiles[i], (err, data) => {
        if (err) return serve(i + 1);
        res.writeHead(200, { "Content-Type": MIME[path.extname(tryFiles[i])] || "application/octet-stream" });
        res.end(data);
      });
    })(0);
  })
  .listen(8901, () => console.log("STATIC_UP"));
