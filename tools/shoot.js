// Takes the guide's screenshots (images/*@2x.png) with headless Chrome over
// the DevTools protocol, using the real extension's scripts on a made-up ARG
// site (see server.js and testenv/).
//   node tools/shoot.js              → every scene below
//   node tools/shoot.js menu toolbox → only those scenes
// Chrome reaches the test server as its proxy, so the pages show up as
// http://echo-archive.example/… rather than localhost.
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { startServer } = require("./server");

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://echo-archive.example";
const OUT = path.resolve(__dirname, "../images");
const ONLY = process.argv.slice(2);
const SERVER_PORT = 8932;
const PORT = 9333; // Chrome's DevTools port
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Helpers defined in the page before each scene's steps.
const HELPERS = `
window.__h = {
  host: () => [...document.documentElement.children].find((e) => e.shadowRoot && e.id !== "__argNotebookNewProjectHost"),
  q(sel) { return this.host().shadowRoot.querySelector(sel); },
  qa(sel) { return [...this.host().shadowRoot.querySelectorAll(sel)]; },
  click(sel) { const el = typeof sel === "string" ? this.q(sel) : sel; if (!el) throw new Error("no " + sel); el.click(); },
  rectOf(els, pad = 16) {
    els = els.filter(Boolean).map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height);
    const x1 = Math.min(...els.map((r) => r.left)) - pad, y1 = Math.min(...els.map((r) => r.top)) - pad;
    const x2 = Math.max(...els.map((r) => r.right)) + pad, y2 = Math.max(...els.map((r) => r.bottom)) + pad;
    const x = Math.max(0, x1), y = Math.max(0, y1);
    return { x, y, width: Math.min(innerWidth, x2) - x, height: Math.min(innerHeight, y2) - y };
  },
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  async type(el, text) { el.focus(); el.value = text; el.dispatchEvent(new Event("input", { bubbles: true })); },
};`;

const SITE = `${BASE}/site.html?reset`;
const SCENES = [
  { name: "overview", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-pages"]');
      __h.click('[data-action="toggle-words"]');` },
  { name: "pages-list", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-pages"]');`,
    clip: `__h.rectOf([__h.q('.arg-pages-panel')])` },
  { name: "pages-grid", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-pages"]');
      __h.click('[data-pages-view="grid"]');`,
    clip: `__h.rectOf(__h.qa('.arg-page-grid, .arg-section-header-title, .arg-section-header-progress'), 16)` },
  { name: "pages-detail", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-pages"]');
      await __h.wait(200);
      const { arg_pages } = await chrome.storage.local.get('arg_pages');
      __h.click('[data-edit-id="' + arg_pages.find((p) => p.title === '観測記録 #07').id + '"]');`,
    clip: `__h.rectOf(__h.qa('[data-el="pages-detail"] :is(input, select, textarea, button, label, a)'), 16)` },
  { name: "pill", url: SITE, w: 1280, h: 800, steps: ``,
    clip: `__h.rectOf([__h.q('.arg-pages-panel'), __h.q('.arg-words-panel'), __h.q('.arg-toolbox')], 12)` },
  { name: "collect-words", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-words"]');`,
    clip: `__h.rectOf([__h.q('.arg-words-panel')])` },
  { name: "collect-clues", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-words"]');
      __h.click('[data-words-tab="clues"]');`,
    clip: `__h.rectOf([__h.q('.arg-words-panel')])` },
  { name: "toolbox", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-launcher"]');`,
    clip: `__h.rectOf([__h.q('.arg-toolbox')])` },
  { name: "tool-files", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-launcher"]');
      __h.click('[data-open-tool="files"]');
      await __h.wait(1200);
      __h.q('.arg-tool-window iframe').contentDocument.querySelector('[data-files-view="grid"]').click();
      await __h.wait(800);`,
    clip: `__h.rectOf([__h.q('.arg-tool-window')])` },
  { name: "tool-mojibake", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-launcher"]');
      __h.click('[data-open-tool="mojibake"]');
      await __h.wait(1000);
      const d = __h.q('.arg-tool-window iframe').contentDocument;
      await __h.type(d.getElementById('mojibake-input'), '縺薙ｓ縺ｫ縺｡縺ｯ');
      await __h.wait(1200);`,
    clip: `__h.rectOf([__h.q('.arg-tool-window')])` },
  { name: "tool-morse", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-launcher"]');
      __h.click('[data-open-tool="morse"]');
      await __h.wait(1000);
      const d = __h.q('.arg-tool-window iframe').contentDocument;
      await __h.type(d.getElementById('morse-input'), '・・・ －－－ ・・・');
      await __h.wait(1200);`,
    clip: `__h.rectOf([__h.q('.arg-tool-window')])` },
  { name: "lightbox", url: SITE, w: 1280, h: 800, steps: `
      __h.click('[data-action="toggle-launcher"]');
      __h.click('[data-open-tool="files"]');
      await __h.wait(1200);
      const d = __h.q('.arg-tool-window iframe').contentDocument;
      const item = [...d.querySelectorAll('.files-item')].find((e) => e.textContent.includes('poster'));
      item.click();
      await __h.wait(800);` },
  { name: "menu", url: SITE, w: 1280, h: 800, steps: `
      const el = document.getElementById('sel');
      const r = document.createRange(); r.selectNodeContents(el);
      getSelection().removeAllRanges(); getSelection().addRange(r);
      const b = el.getBoundingClientRect();
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: b.left + 10, clientY: b.bottom + 4, button: 2 }));`,
    clip: `__h.rectOf([document.getElementById('sel'), __h.q('.arg-ctxmenu')], 24)` },
  { name: "start-dialog", url: `${BASE}/dialog.html?reset`, w: 1280, h: 800, steps: `await __h.wait(300);`,
    clip: `(() => { const s = document.getElementById('__argNotebookNewProjectHost').shadowRoot; const box = [...s.querySelectorAll('*')].filter((e) => getComputedStyle(e).position !== 'fixed' && e.getBoundingClientRect().width > 200 && e.getBoundingClientRect().width < 800).sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0]; return __h.rectOf([box], 24); })()` },
  { name: "manager-home", url: `${BASE}/options.html?reset`, w: 400, h: 340, steps: `await __h.wait(300);` },
  { name: "manager-list", url: `${BASE}/options.html?reset`, w: 400, h: 370, steps: `
      document.querySelector('[data-app="list"]').click();` },
  { name: "manager-detail", url: `${BASE}/options.html?reset`, w: 400, h: 745, steps: `
      document.querySelector('[data-app="list"]').click();
      await __h.wait(200);
      document.querySelector('.project-tile').click();` },
  { name: "manager-settings", url: `${BASE}/options.html?reset`, w: 400, h: 1000, steps: `
      document.querySelector('[data-app="settings"]').click();` },
];

async function main() {
  const unknown = ONLY.filter((n) => !SCENES.some((s) => s.name === n));
  if (unknown.length) throw new Error(`知らない場面: ${unknown.join(", ")}(使えるのは ${SCENES.map((s) => s.name).join(", ")})`);
  fs.mkdirSync(OUT, { recursive: true });
  const server = await startServer(SERVER_PORT);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "arg-guide-chrome-"));
  const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    "--no-first-run", `--proxy-server=http://127.0.0.1:${SERVER_PORT}`, "--hide-scrollbars", "--lang=ja", "about:blank"], { stdio: "ignore" });
  try {
    let targets;
    for (let i = 0; i < 50; i++) {
      try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break; } catch { await sleep(200); }
    }
    const page = targets.find((t) => t.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r, { once: true }));
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
      else if (m.method) events.push(m);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params }));
    });
    const evaluate = async (expr) => {
      const r = await send("Runtime.evaluate", { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

    for (const s of SCENES) {
      if (ONLY.length && !ONLY.includes(s.name)) continue;
      await send("Emulation.setDeviceMetricsOverride", { width: s.w, height: s.h, deviceScaleFactor: 2, mobile: false });
      events.length = 0;
      await send("Page.navigate", { url: s.url });
      for (let i = 0; i < 100 && !events.some((e) => e.method === "Page.loadEventFired"); i++) await sleep(100);
      await sleep(700);
      try {
        await evaluate(HELPERS + s.steps);
        await sleep(600);
        const clip = s.clip ? await evaluate(`${HELPERS} return ${s.clip};`) : null;
        const shot = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
        const file = path.join(OUT, `${s.name}@2x.png`);
        fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
        console.log("ok", s.name, clip ? `${Math.round(clip.width)}x${Math.round(clip.height)}` : `${s.w}x${s.h}`);
      } catch (err) {
        console.log("FAIL", s.name, err.message);
      }
    }
    ws.close();
  } finally {
    chrome.kill();
    server.close();
    setTimeout(() => fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 }), 500);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
