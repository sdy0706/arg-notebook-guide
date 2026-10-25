// Test server for the screenshots: tools/testenv/ first, then the extension
// folder. Builds the fake ARG page (testenv/site-body.html + the content
// scripts in background.js's CONTENT_SCRIPT_FILES order), and adds the
// chrome mock (testenv/mock.js) to the extension's own pages. shoot.js
// starts it; it can also be run alone to look at the test pages:
//   node tools/server.js [port]   → http://localhost:8932/site.html?reset
const http = require("http"), fs = require("fs"), path = require("path");

const TEST_ROOT = path.resolve(__dirname, "testenv");
const EXT_ROOT = path.resolve(process.env.ARG_EXTENSION_DIR || path.join(__dirname, "../../arg-notebook-extension"));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".wasm": "application/wasm" };
const MOCK = '<script src="/seed.js"></script><script src="/mock.js"></script>';

const readExt = (f) => fs.readFileSync(path.join(EXT_ROOT, f), "utf8").replace(/\r\n/g, "\n");

function contentFiles() {
  const m = readExt("background.js").match(/const CONTENT_SCRIPT_FILES = \[([\s\S]*?)\]/);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

// The "このページから調査を始める" dialog lives in background.js and is
// injected into the page there; here it's copied out and called directly.
function dialogFn() {
  const bg = readExt("background.js");
  const i = bg.indexOf("function showNewProjectDialog");
  return bg.slice(i, bg.indexOf("\n}\n", i) + 2);
}

function sitePage(extra = "") {
  const body = fs.readFileSync(path.join(TEST_ROOT, "site-body.html"), "utf8");
  const scripts = contentFiles().map((f) => `<script src="/${f}"></script>`).join("\n");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>観測記録 #07 | 残響アーカイブ</title>${MOCK}</head><body>${body}\n${scripts}\n${extra}</body></html>`;
}

function startServer(port) {
  if (!fs.existsSync(path.join(EXT_ROOT, "manifest.json"))) {
    throw new Error(`拡張機能のフォルダが見つかりません: ${EXT_ROOT}(環境変数 ARG_EXTENSION_DIR で指定できます)`);
  }
  const server = http.createServer((req, res) => {
    // Absolute URLs arrive here too, when Chrome uses this server as its proxy.
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const send = (body, type = TYPES[".html"]) => { res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" }); res.end(body); };
    if (p === "/site.html") return send(sitePage());
    if (p === "/dialog.html") return send(sitePage(`<script>${dialogFn()}\nshowNewProjectDialog(location.origin + "/intro.html");</script>`));
    if (p === "/options.html" || p === "/tool.html") {
      return send(readExt(p).replace('<script src="icons.js"></script>', MOCK + '<script src="icons.js"></script>'));
    }
    for (const r of [TEST_ROOT, EXT_ROOT]) {
      const f = path.join(r, p);
      if (f.startsWith(r) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        return send(fs.readFileSync(f), TYPES[path.extname(f)] || "application/octet-stream");
      }
    }
    res.writeHead(404); res.end("not found");
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

module.exports = { startServer, EXT_ROOT };

if (require.main === module) {
  const port = +(process.argv[2] || 8932);
  startServer(port).then(() => console.log(`http://localhost:${port}/site.html?reset`));
}
