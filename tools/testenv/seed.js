// Sample investigation shown in the guide's screenshots (a made-up ARG).
window.__ARG_SEED = () => {
  const P = "proj-echo", P2 = "proj-lighthouse";
  const base = location.origin;
  const t0 = Date.parse("2026-10-20T21:00:00+09:00");
  let n = 0;
  const at = () => t0 + (n++) * 600000;
  const page = (num, title, url, extra = {}) => ({
    id: "pg" + n, type: "page", projectId: P, domain: url.includes("mirror") ? "mirror.example" : location.hostname,
    url, title, pageNumber: num, note: "", tags: [], hitWordIds: [], createdAt: at(), ...extra,
  });
  const pages = [
    page(1, "残響アーカイブ トップ", base + "/site/index.html"),
    page(2, "調査員の手記 1", base + "/site/note1.html", { note: "日付が 1987/04/17 になっている" }),
    page(3, "調査員の手記 2", base + "/site/note2.html"),
    page(4, "閉ざされた資料室", base + "/site/archive.html", { hitWordIds: ["w2"] }),
    page(6, "観測記録 #06", base + "/site/log06.html"),
    page(7, "観測記録 #07", base + "/site.html", { hitWordIds: ["w1", "w3"], note: "背景に小さく「かがみ」の文字" }),
    page(9, "灯台守の日誌", base + "/site/diary.html"),
    page(1, "鏡の部屋 入口", "https://mirror.example/", {}),
    page(2, "鏡の部屋 第二室", "https://mirror.example/room2", {}),
  ];
  const word = (id, text, pageId) => ({ id, type: "word", projectId: P, text, pageId, createdAt: at() });
  const words = [
    word("w1", "残響", null), word("w2", "1987", "pg1"), word("w3", "かがみ", null),
    word("w4", "北の灯台", null), word("w5", "0417", "pg1"), word("w6", "ECHO", null),
  ];
  const clue = (label, text) => ({ id: "c" + n, type: "clue", projectId: P, label, text, createdAt: at() });
  const clues = [
    clue("パスワード", "mirror0417"), clue("座標", "35.6812, 139.7671"),
    clue("暗号の鍵", "ECHO"), clue("", "灯台は北にある"),
  ];
  const file = (kind, name, ext, url) => ({ id: "f" + n, type: "file", kind, projectId: P, url, name, ext, createdAt: at() });
  const files = [
    file("image", "poster.svg", "svg", base + "/assets/poster.svg"),
    file("image", "map.svg", "svg", base + "/assets/map.svg"),
    file("image", "photo.svg", "svg", base + "/assets/photo.svg"),
    file("file", "観測報告書.pdf", "pdf", base + "/assets/report.pdf"),
  ];
  return {
    arg_projects: [
      { id: P, name: "残響アーカイブ", startUrl: base + "/intro.html", createdAt: t0,
        domains: [
          { domain: location.hostname, name: "残響アーカイブ", totalPages: 12 },
          { domain: "mirror.example", name: "鏡の部屋", totalPages: 6 },
        ] },
      { id: P2, name: "灯台からの信号", startUrl: "https://lighthouse.example/", createdAt: t0 - 86400000 * 30,
        domains: [{ domain: "lighthouse.example", name: "", totalPages: 30 }] },
    ],
    arg_current_project: P,
    arg_pages: pages, arg_words: words, arg_clues: clues, arg_files: files,
    arg_ui_state: {},
    arg_word_selection: ["w3", "w1"],
  };
};
