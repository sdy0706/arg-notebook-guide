// ARG Notebook guide — the kit that turns content/*.md into the page.
// The HTML pages only list which md files to show (body[data-md]); the
// header, table of contents, footer and the components below all come from
// here and guide.css, so writing the guide means writing md only.
//
// Components are fenced code blocks with one of these names (see CLAUDE.md
// for how to write each one):
//   steps   numbered steps, one per line
//   figure  an image: first line is the path, the rest is the caption
//   tip / note / warn   a colored box (the inside is ordinary md)
//   menu    a right-click menu, one item per line, "> " marks the one to pick
//   faq     questions that open on click: "Q: ..." then the answer lines

"use strict";

const SITE_NAME = "ARG Notebook";
const NAV = [
  { page: "guide", href: "index.html", label: "使い方" },
  { page: "privacy", href: "privacy.html", label: "プライバシーポリシー" },
];

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const inline = (s) => marked.parseInline(s.trim());

// Non-empty lines of a component's body, trimmed.
const linesOf = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean);

const COMPONENTS = {
  steps(text) {
    const items = linesOf(text).map((l) => `<li><span class="steps-text">${inline(l)}</span></li>`).join("");
    return `<ol class="steps">${items}</ol>`;
  },

  figure(text) {
    const [src = "", ...rest] = linesOf(text);
    const caption = rest.join(" ");
    const alt = escapeHtml(caption.replace(/[*`_[\]]/g, ""));
    return `<figure class="figure">
      <button type="button" class="figure-frame" aria-label="画像を大きく表示">
        <img src="${escapeHtml(src)}" alt="${alt}" loading="lazy">
      </button>
      ${caption ? `<figcaption>${inline(caption)}</figcaption>` : ""}
    </figure>`;
  },

  tip: (text) => callout("tip", "ヒント", text),
  note: (text) => callout("note", "メモ", text),
  warn: (text) => callout("warn", "注意", text),

  menu(text) {
    const lines = linesOf(text);
    const marked1 = lines.some((l) => l.startsWith(">"));
    const items = lines.map((l, i) => {
      const picked = marked1 ? l.startsWith(">") : lines.length === 1 && i === 0;
      const label = l.replace(/^>\s*/, "");
      return `<li class="${picked ? "picked" : ""}">${inline(label)}</li>`;
    }).join("");
    return `<div class="menu-demo"><div class="menu-demo-caption">右クリック</div><ul>${items}</ul></div>`;
  },

  faq(text) {
    const qa = [];
    for (const raw of text.split("\n")) {
      const q = raw.match(/^\s*Q[::]\s*(.*)$/);
      if (q) qa.push({ q: q[1], a: [] });
      else if (qa.length) qa[qa.length - 1].a.push(raw);
    }
    return `<div class="faq">${qa.map(({ q, a }) =>
      `<details><summary>${inline(q)}</summary><div class="faq-answer">${marked.parse(a.join("\n").replace(/^\s*A[::]\s*/, ""))}</div></details>`
    ).join("")}</div>`;
  },
};

function callout(kind, label, text) {
  return `<aside class="callout callout-${kind}"><div class="callout-label">${label}</div>${marked.parse(text)}</aside>`;
}

marked.use({
  renderer: {
    code({ text, lang }) {
      const make = COMPONENTS[(lang || "").trim()];
      return make ? make(text) : false;
    },
  },
});

// An id for a heading: its own text (so links read naturally), made unique.
function headingId(text, used) {
  const base = text.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}ー・-]/gu, "") || "section";
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

function buildHeader(page) {
  const links = NAV.map((n) =>
    `<a href="${n.href}"${n.page === page ? ' aria-current="page"' : ""}>${n.label}</a>`).join("");
  return `<header class="site-header"><div class="site-header-inner">
    <a class="site-name" href="index.html">${SITE_NAME}</a>
    <nav class="site-nav">${links}</nav>
  </div></header>`;
}

function buildToc(article) {
  const used = new Set();
  const items = [];
  for (const h of article.querySelectorAll("h2, h3")) {
    h.id = headingId(h.textContent, used);
    if (h.tagName === "H2") items.push(`<li><a href="#${h.id}">${escapeHtml(h.textContent)}</a></li>`);
  }
  if (items.length < 2) return "";
  // On a phone the contents sit above the text, so start them folded there.
  const open = matchMedia("(min-width: 801px)").matches ? " open" : "";
  return `<nav class="toc" aria-label="目次"><details${open}><summary>目次</summary><ol>${items.join("")}</ol></details></nav>`;
}

function setupLightbox() {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.innerHTML = `<img alt=""><button type="button" class="lightbox-close" aria-label="閉じる">×</button>`;
  document.body.appendChild(box);
  const close = () => { box.hidden = true; };
  box.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.addEventListener("click", (e) => {
    const frame = e.target.closest(".figure-frame");
    if (!frame) return;
    const img = frame.querySelector("img");
    if (frame.classList.contains("missing")) return;
    box.querySelector("img").src = img.src;
    box.querySelector("img").alt = img.alt;
    box.hidden = false;
  });
}

// An image that isn't there yet shows a placeholder instead of a broken icon.
function markMissingImages(root) {
  for (const img of root.querySelectorAll(".figure-frame img")) {
    const mark = () => {
      const frame = img.closest(".figure-frame");
      frame.classList.add("missing");
      frame.dataset.src = img.getAttribute("src");
    };
    if (img.complete && !img.naturalWidth) mark();
    else img.addEventListener("error", mark);
  }
}

async function render() {
  const page = document.body.dataset.page || "";
  const files = (document.body.dataset.md || "").split(/\s+/).filter(Boolean);

  let sections;
  try {
    sections = await Promise.all(files.map(async (f) => {
      const res = await fetch(f);
      if (!res.ok) throw new Error(`${f}: ${res.status}`);
      return `<section data-src="${escapeHtml(f)}">${marked.parse(await res.text())}</section>`;
    }));
  } catch (err) {
    sections = [`<p class="load-error">説明を読み込めませんでした(${escapeHtml(err.message)})。` +
      `ファイルを直接開いている場合は、簡単な HTTP サーバー経由で開いてください。</p>`];
  }

  const article = document.createElement("article");
  article.className = "content";
  article.innerHTML = sections.join("");
  const toc = buildToc(article);

  const year = new Date().getFullYear();
  document.body.insertAdjacentHTML("afterbegin", buildHeader(page) +
    `<div class="layout${toc ? " has-toc" : ""}">${toc}</div>` +
    `<footer class="site-footer">© ${year} ${SITE_NAME}</footer>`);
  document.querySelector(".layout").appendChild(article);
  markMissingImages(article);
  setupLightbox();

  // The md arrived after the browser tried to jump to #id, so jump now.
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

render();
