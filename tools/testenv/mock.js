// Fake chrome.* for loading the extension's pages over plain HTTP.
// Storage lives in localStorage so the page, its tool iframes and the
// management page share it; other frames hear changes via the storage event.
(() => {
  const KEY = "__argMockStorage";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const write = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  const qs = new URLSearchParams(location.search);
  if (window === window.top && (qs.has("reset") || !localStorage.getItem(KEY)) && window.__ARG_SEED) write(window.__ARG_SEED());
  if (qs.has("reset")) { qs.delete("reset"); history.replaceState(null, "", location.pathname + (qs.toString() ? "?" + qs : "") + location.hash); }
  const listeners = [];
  const fire = (changes) => { for (const l of listeners) try { l(changes, "local"); } catch (e) { console.error(e); } };
  const diff = (before, after) => {
    const ch = {};
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) ch[k] = { oldValue: before[k], newValue: after[k] };
    }
    return ch;
  };
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    const ch = diff(JSON.parse(e.oldValue || "{}"), JSON.parse(e.newValue || "{}"));
    if (Object.keys(ch).length) fire(ch);
  });
  const pick = (d, keys) => {
    if (keys == null) return { ...d };
    if (typeof keys === "string") keys = [keys];
    if (Array.isArray(keys)) { const o = {}; for (const k of keys) if (k in d) o[k] = d[k]; return o; }
    const o = {}; for (const k of Object.keys(keys)) o[k] = k in d ? d[k] : keys[k]; return o;
  };
  const ev = () => ({ addListener() {}, removeListener() {}, hasListener() { return false; } });
  const msgListeners = [];
  window.chrome = {
    storage: {
      local: {
        async get(keys) { return structuredClone(pick(read(), keys)); },
        async set(obj) { const b = read(); const a = { ...b, ...structuredClone(obj) }; write(a); const ch = diff(b, a); if (Object.keys(ch).length) fire(ch); },
        async remove(keys) { const b = read(); const a = { ...b }; for (const k of [].concat(keys)) delete a[k]; write(a); fire(diff(b, a)); },
      },
      onChanged: { addListener: (f) => listeners.push(f), removeListener() {} },
    },
    runtime: {
      id: "mock",
      getURL: (p) => new URL("/" + p.replace(/^\//, ""), location.origin).href,
      sendMessage: async (m) => { console.log("[mock] sendMessage", m); return undefined; },
      onMessage: { addListener: (f) => msgListeners.push(f), removeListener() {} },
      onInstalled: ev(), onStartup: ev(),
    },
    tabs: {
      async query() { return [{ id: 1 }]; },
      async sendMessage(_id, msg) {
        // Hand it to the top page's content scripts (the tool iframe's "file" app).
        const top = window.top;
        if (top && top.__argMockDeliver) return top.__argMockDeliver(msg);
        return undefined;
      },
      create: ({ url }) => console.log("[mock] tabs.create", url),
    },
  };
  window.__argMockDeliver = (msg) => new Promise((resolve) => {
    let done = false;
    for (const f of msgListeners) {
      const r = f(msg, {}, (res) => { done = true; resolve(res); });
      if (r !== true && !done) continue;
    }
    setTimeout(() => { if (!done) resolve(undefined); }, 300);
  });
})();
