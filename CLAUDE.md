# ARG Notebook の説明ページ(GitHub ページ)

Chrome 拡張機能「ARG Notebook」の使い方の説明ページ。拡張機能の本体は別の非公開リポジトリ(`sdy0706/arg-notebook-extension`)にある。

## 考え方

- **見た目と表示の仕組みは `kit/` にまとめてあり、ふだんは触らない。**
- **説明を直すときは `content/*.md` だけを直す。** HTML や CSS は書かない。
- 手順・画像・注意書きなどは、下の「部品」を使って短く書く。きれいに表示するのはキットの役目。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | 使い方のページのひな形。`body` の `data-md` に、表示する md を順番に並べる |
| `privacy.html` | プライバシーポリシーのひな形(`content/privacy.md` を表示) |
| `content/NN-*.md` | 使い方の中身。章ごとに 1 ファイル。番号順につなげて 1 ページにする |
| `content/privacy.md` | プライバシーポリシーの中身 |
| `images/` | 画面の画像(PNG) |
| `kit/guide.js` | md を読み込んで表示する。見出しから目次を作る。部品を組み立てる |
| `kit/guide.css` | 見た目のすべて(色は拡張機能の管理画面と同じ) |
| `kit/vendor/marked.umd.js` | md を HTML にする変換スクリプト(marked 18.0.14、MIT)。手を入れない |
| `tools/shoot.js` | 画面の画像を撮り直すスクリプト(下の「画像の撮り直し」) |
| `tools/server.js` | 撮影用のテストサーバー。拡張機能の本物のスクリプトを読み込む |
| `tools/testenv/` | 撮影用の架空の ARG サイト(`site-body.html`)、架空の調査データ(`seed.js`)、`chrome` API の模擬(`mock.js`) |
| `.nojekyll` | GitHub ページの変換(Jekyll)を止め、md をそのまま公開するための空ファイル |

## md の書き方

- 普通の md が使える(見出し・箇条書き・番号付きリスト・表・太字・リンク・`コード`・引用・`<kbd>`)。
- 各章のファイルは `## 章の名前` で始める。`#` は `01-intro.md`(ページの題名)と `privacy.md` だけで使う。
- 目次には `##` の見出しが自動で並ぶ。`###` は目次には出ない。
- 章を足すときは `content/` にファイルを作り、`index.html` の `data-md` にも足す。
- 拡張機能の画面の名前(探索ログ・収集ボックス・ツールボックス・管理画面など)と、右クリックメニューの文言は、本体の表示とそろえる。

## 部品

コードブロックの言語名に部品の名前を書く。

### steps — 手順

1 行に 1 つ。番号は自動で付く。行の中で太字やリンクも使える。

````md
```steps
導入ページを開く
右クリック →「ARG Notebook: このページから調査を始める」
調査の名前を入れて「作成」を押す
```
````

### figure — 画像

1 行目に画像のパス、2 行目から説明文。押すと大きく表示される。画像がまだないときは「画像準備中」の枠が出る。

ファイル名が `@2x` で終わる画像(`overview@2x.png` など)は 2 倍の解像度で撮ったものとして、半分の幅で表示する(本文の幅より広くはならない)。画面の画像は 2 倍で撮って `@2x` を付ける。

````md
```figure
images/overview.png
ページの上に探索ログと収集ボックスが重なって表示されます
```
````

### tip / note / warn — 囲み

`tip` は緑の「ヒント」、`note` は青の「メモ」、`warn` は赤の「注意」。中は普通の md。

````md
```tip
導入ページにはパネルは表示されません。
```
````

### menu — 右クリックメニュー

1 行に 1 項目。選ぶ項目の先頭に `> ` を付ける(項目が 1 つだけなら付けなくてよい)。

````md
```menu
ARG Notebook: このページを保存
> ARG Notebook: このページから調査を始める
```
````

### faq — よくある質問

`Q:` で質問、次の行から答え(先頭の `A:` は省いてもよい)。答えは普通の md。押すと開く。

````md
```faq
Q: パネルが表示されません
A: 調査ページのドメインが登録されているか確かめてください。

Q: データはどこに保存されますか?
A: お使いのブラウザの中だけです。
```
````

## 拡張機能を直したときのメンテナンス

拡張機能の機能や画面を変えたら、拡張機能側の README・仕様書と合わせて、ここも直す。

1. 下の対応表で、直す md と撮り直す画像を探す。
2. md を直す。新しい機能は、近い章に足すか、新しい章のファイルを作って `index.html` の `data-md` に足す。
3. 画面が変わったら、その場面の画像を撮り直す。新しい画面は `tools/shoot.js` の `SCENES` に場面を足す。
4. 手元で表示を確かめる(下の「確認のしかた」)。
5. コミットして push する(数分で公開中のページに反映される)。

### 対応表

| 拡張機能で変わったところ(仕様書の章) | 直す md | 撮り直す画像(場面の名前) |
|---|---|---|
| 探索ログ(`03-pages`) | `04-pages.md` | `pill`、`pages-list`、`pages-grid`、`pages-detail`、`overview` |
| 収集ボックス(`04-collect`) | `05-collect.md` | `collect-words`、`collect-clues`、`overview` |
| ファイル・ライトボックス・ビューワー(`05-files-lightbox`) | `06-toolbox.md` | `tool-files`、`lightbox` |
| ツールボックス・文字化け変換・モールス信号(`06-toolbox`、`tools.js`) | `06-toolbox.md` | `toolbox`、`tool-mojibake`、`tool-morse` |
| 右クリックメニュー(`07-menu`) | `08-menu.md`(調査の始め方が変わったら `03-start.md` も) | `menu`、`start-dialog` |
| 管理画面(`08-layout-misc` の 8.4) | `07-manager.md` | `manager-home`、`manager-list`、`manager-detail`、`domain-dialog`、`manager-settings` |
| 導入ページ・調査ページの登録(`08-layout-misc` の 8.7、`07-menu`) | `03-start.md`、`09-faq.md`(URL の範囲は `07-manager.md` も) | `start-dialog`、`domain-dialog`、`manager-detail` |
| 保存するデータ・権限(`02-data`、`manifest.json` の `permissions`) | `privacy.md` | — |
| 対応する Chrome のバージョン(`manifest.json` の `minimum_chrome_version`) | `02-install.md` | — |
| よくある問い合わせ・つまずきやすい点 | `09-faq.md` | — |

パネルの名前・ボタンの名前・右クリックメニューの文言が変わったときは、全部の md を検索して直す(例:`grep -rn "収集ボックス" content/`)。

### 画像の撮り直し

```
node tools/shoot.js                      # すべての場面
node tools/shoot.js menu collect-words   # 指定した場面だけ
```

- 拡張機能のフォルダは、このリポジトリの隣(`../arg-notebook-extension`)を使う。別の場所なら環境変数 `ARG_EXTENSION_DIR` で指定する。Chrome の場所は `CHROME_PATH` で変えられる。
- 画面に表示されない Chrome(ヘッドレス)を開き、架空の ARG サイト「残響アーカイブ」の上で本物のパネルを操作して、`images/<場面>@2x.png` に保存する。ページは `http://echo-archive.example/` として表示される(テストサーバーを Chrome のプロキシにしているため)。
- 場面ごとに架空の調査データ(`testenv/seed.js`)から始め直す。写したいデータ(ページ・キーワード・メモ・ファイル)を変えるときは `seed.js` を直す。
- 撮れたら、画像を開いて見た目を確かめる。パネルの部品の名前(クラス名など)が変わると、その場面は `FAIL` と表示されて撮れない。そのときは `shoot.js` の場面の操作を直す。
- テスト用ページは本物の拡張機能ではない(`chrome` API を真似ている)ので、細かい違いがありうる。実機の確認はユーザーに頼む。
- 撮影のテストページを自分で見たいときは `node tools/server.js` を起動し、`http://localhost:8932/site.html?reset`(架空の ARG サイト)や `http://localhost:8932/options.html`(管理画面)を開く。

## 確認のしかた

- md を `fetch` で読むので、`index.html` をファイルとして直接開くと表示されない。このフォルダで簡単な HTTP サーバーを立てて開く(例: `npx http-server -p 8080`)。
- GitHub ページでは `main` の一番上のフォルダをそのまま公開する。
