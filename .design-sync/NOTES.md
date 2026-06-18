# design-sync NOTES — @suzumina.click/ui

claude.ai/design への同期に関する、リポジトリ固有の前提と落とし穴。次回 sync が
ここを読めば今回のデバッグを再現せずに済む。

## コマンド規約（pnpm-only / CLAUDE.md §1）

このリポジトリは **pnpm のみ**。`npm` / `npx` は禁止（`npx` も npm ランタイム）。design-sync skill の
既定コマンドは `npx storybook build` / `.ds-sync` での `npm i` / `npx playwright install` を使うが、
本リポジトリでは以下の pnpm 等価に置換すること（PR #668 レビュー指摘）:

- **sb-reference 再ビルド**: `cfg.buildCmd` は
  `pnpm --filter @suzumina.click/ui exec storybook build -c .storybook -o ../../.design-sync/sb-reference`
  （`storybook` bin は packages/ui のみ・root に hoist されないため `pnpm exec`(root) では解決不可 →
  `--filter ... exec` が必須。cwd が packages/ui になるのでパスはパッケージ相対）。
- **`.ds-sync` の converter deps**: `npm i esbuild ts-morph @types/react playwright` の代わりに
  `(cd .ds-sync && pnpm add esbuild ts-morph @types/react playwright)`、chromium は
  `(cd .ds-sync && pnpm exec playwright install chromium)`。`.ds-sync` は独自 package.json + gitignore。
  - **⚠️ ただし lockfile からは隔離されない（2026-06-18 #2 で判明・旧記述は誤り）**: `pnpm add` を
    `.ds-sync` 内で実行すると pnpm が root の pnpm-workspace.yaml まで遡り、`.ds-sync` を ad-hoc
    ワークスペースメンバーとして root `pnpm-lock.yaml` に `  .ds-sync:` importer 行を**追記する**
    （workspace glob は `apps/*`/`packages/*` のみだが cwd 由来で attach される）。`.ds-sync` は
    gitignore 対象なのでこの lockfile 変更は不要なノイズ → **deps install 後に
    `git checkout pnpm-lock.yaml` で必ず復元**してから handoff すること（commit に混ぜない）。
- **fresh-clone / 古い node_modules で storybook build が `MODULE_NOT_FOUND`
  （`storybook/dist/bin/dispatcher.js`）**: dev-deps bump 後などに node_modules が lockfile と
  ズレていると storybook bin が不完全展開で落ちる。`pnpm install --frozen-lockfile`（root）で
  修復してから sb-reference をビルドする（frozen なので lockfile は書き換わらない）。

## 前提（このリポジトリの特殊性）

- **dist を持たない / TSX ソース直配布**: `packages/ui` の `build` は no-op（`echo`）。
  consumer（apps/web 等）は `exports` マップ経由でソースを直接読む。converter は
  `dist/` を bundle するため、全コンポーネントを集約した barrel `packages/ui/ds-entry.tsx`
  を作成し `cfg.entry` で指定している。**コンポーネントを追加したら barrel に
  `export *` 行を足す**（UI は `src/components/ui/<name>`、Custom は `custom/index` 経由）。
- **自己参照エイリアス**: コンポーネントは `@suzumina.click/ui/lib/utils` /
  `@suzumina.click/ui/components/ui/*` の形で自パッケージを import する。tsconfig
  `paths: {"@suzumina.click/ui/*": ["./src/*"]}` で解決されるため `cfg.tsconfig` 必須。
- **`--node-modules` は `packages/ui/node_modules`**（react/radix-ui/cva 等がここで解決）。
- **shared-types は型のみ**: コンポーネントの `@suzumina.click/shared-types` import は
  すべて `import type`（esbuild が消去）。ランタイム値 import は無し → bundle 不要。

## フォント（要監視・[FONT_MISSING] 候補）

- ブランドフォントは **M PLUS Rounded 1c**。本番(apps/web)は `next/font` で self-host、
  Storybook は `.storybook/preview-head.html` で Google Fonts CDN から読み込み + body に適用。
- globals.css の既定 font-family はシステム丸ゴシックスタック（M PLUS は @font-face 未定義）。
  → Storybook reference は実フォントで描画するが、preview 側に同等の手当てが無いと
  text-heavy コンポーネントで compare がズレる。solo phase の text-heavy で要確認。

## Storybook 構成

- `@storybook/react-vite` / Tailwind v4（PostCSS）/ `next/navigation` を
  `.storybook/mocks/next-navigation.ts` で alias。next/navigation を使うコンポーネント
  （Pagination, ConfigurableList 等）は preview bundle で要対応の可能性。
- CSS は Tailwind v4（`@import "tailwindcss"`）。converter は sb-reference から
  コンパイル済み CSS を scrape する（[CSS_FROM_STORYBOOK]）想定。

## トークン抽出スコープ（[TOKEN_SCOPE]・要遵守 / Claude Design 指示 2026-06-18）

converter は sb-reference の**コンパイル済み CSS** を scrape する（上記 [CSS_FROM_STORYBOOK]）。
放置すると Tailwind v4 が生成した内部変数・ユーティリティ定義まで「トークン」として拾い、
component-style 配下／未分類が大量に出る（報告値: 89 件 component-style 配下・141 件 未分類）。
**トークン抽出はオーサリングされた実トークンに限定する**こと。

- **含める（design token）**: `packages/ui/src/styles/globals.css` の `:root` / `.dark` / `@theme`
  配下で宣言された、色・角丸・ブランドスケール・モーションの実トークン:
  `--background, --foreground, --card*, --popover*, --primary*, --secondary*, --muted*, --accent*,
  --destructive*, --border, --input, --ring, --focus-ring*, --radius*, --suzuka-{50..950},
  --minase-{50..950}, --animate-*`（`--chart-*` / `--font-size-a11y-*` は #670 で削除済み）。
- **除外する**:
  - Tailwind 内部変数 `--tw-*` 全般。
  - ユーティリティセレクタ配下で宣言される変数（`:where(.space-y-*…)` / `.translate-x-*` 等の
    クラススコープで宣言される変数）。
  - フレームワーク設定変数（`:root` にあるが design token ではない）:
    `--color-scheme, --container-center, --container-padding, --container-screens-2xl,
    --default-border-radius`。layout config を design pane に出したい場合のみ Claude Design 判断で含める。
- **`@theme` の `--color-*` は `:root` 実トークンの別形（重複させない）**: `@theme` は `:root`/`.dark` を
  Tailwind 用に再エクスポートする層で、`--color-primary: hsl(var(--primary))` のように `:root --primary`
  を hsl ラップしただけ。`--color-X`（@theme）と `--X`（:root）は**同一の論理トークン**なので、コンパイル済み
  CSS から両方拾っても**別トークンとして二重に出さない**（論理トークン単位で 1 回。どちらの form を key に
  するかは converter の選択 — `:root` form は生値 `340 75% 48%`、`@theme --color-*` form は utility 名
  `bg-primary` 等に対応）。`@theme` 固有の純粋な追加は `--radius-xl`（radius スケール補完・`:root` 未定義）のみ。
- 正本は globals.css の `:root`/`.dark`/`@theme`。`@kind` 注釈をコンパイル済みバンドルに手書き
  しても再同期で消えるため不可 → **抽出段でこのスコープ規則を適用する**。
- 補助: root の `pnpm lint:tokens`（`scripts/lint-css-tokens.mjs`）が `:root` 実トークンの
  「定義あり・参照なし」を別途守る。母集合はこの `:root` 実トークン（フレームワーク設定変数を除く）
  ＋ `@theme` 固有分（`--radius-xl`）。

## solo phase の知見（[GENERAL] 含む）

- **[GENERAL] next.js が IIFE 初期化時に "process is not defined" で全バンドルを落とす**:
  コンポーネントが `next/link`・`next/navigation` を import → 実体の Next.js ランタイムが
  `process.env.__NEXT_*` / `process.nextTick` を参照しクラッシュ。Storybook は
  `next/navigation` のみ vite alias で mock していたが next/link は実体（vite が process を
  define するため Storybook では問題なし）。対処: `.design-sync/sync.tsconfig.json` の paths で
  `next/navigation` → 既存 Storybook mock、`next/link` → `.design-sync/shims/next-link.tsx`（素の <a>）
  に差し替え、`cfg.tsconfig` をこの sync tsconfig に向ける。esbuild の path plugin は
  main bundle と preview compile の両方に効く（preview-rebuild も同 plugin を後段登録）。
- **[GENERAL] sync.tsconfig.json に `"//"` コメントキーを書くと壊れる**: path plugin の
  コメント除去正規表現 `(^|[^:])//.*$` が `"//": "..."` 行を削り JSON.parse が失敗 → plugin が
  まるごと無効化される（@suzumina.click/ui/* は esbuild の per-file 自動検出で救われるため
  バンドルは通り、next alias だけ静かに効かない）。tsconfig は素の JSON にする。
- **[GENERAL] フォント M PLUS Rounded 1c は preview でも実ロードされる**: Storybook の
  preview-head.html の Google Fonts `<link>` を converter が styles.css の `@import url(...)` に
  変換（remote stylesheet scrape）。text-heavy（Card 等）の compare で実フォント一致を確認済み。
  [FONT_REMOTE] はシステム丸ゴ fallback スタックの情報表示（非ブロッキング・対処不要）。
- **Dialog "Opens" は interaction story**: play で dialog を開くため static preview では
  trigger のみ表示 → `cfg.overrides.Dialog.skip: ["ui-dialog--opens"]` で除外。
- **GRID_OVERFLOW 一括対応**: validate の suggestedOverride に従い wide=19件→cardMode "column"、
  escape=AudioPlayer→cardMode "single"(primaryStory: Default)。presentation のみで grade に影響なし。

## fan-out（§4c）の知見と skip 一覧

- **全 41 component が compare で match**（owned preview は 1 つも不要だった＝generated が忠実）。
- **[GENERAL] framing / font-metric 差は無視**: preview ページは story を全幅で frame するため、
  w-full コンポーネントが storybook の中央寄せ canvas より広く描画される／テキスト折返し位置が
  わずかに違う。content・composition・styling は全 component 同一。rubric 通り match 判定。
- **[GENERAL] play-function interaction story は skip**: storybook は play() 実行後の
  post-interaction frame を撮影するが、静的 preview は story 初期状態を忠実に描画するため永久に
  一致しない。owned .tsx で状態を捏造するのは fidelity を壊すので不可 → `cfg.overrides.<Name>.skip`
  が正規の対処（sb-error / [PORTAL?] と同 family）。
- **[GENERAL] `parameters.layout:"centered"` は reference 側を degenerate させる**: width 非依存/
  w-full コンポーネントが storybook 側で shrink-wrap で潰れる（LoadingSkeleton の Carousel/Card 等）。
  preview は全幅で忠実描画＝reference-is-the-artifact ルールで match。owned preview で再現しようとすると
  preview 自体の fidelity が下がるので作らない。
- **アセット canary（YouTubePlayer / AudioPlayer）は NOT BLOCKED**: ネットワーク egress あり。
  YouTubePlayer は live `<iframe>`（dQw4w9WgXcQ の "動画を再生できません" chrome が両 panel 同一）、
  AudioPlayer は remote 画像なし。

### 適用した skip（interaction story / sb-error）

| Component | story-id | 理由 |
|---|---|---|
| Dialog | ui-dialog--opens | play で開く interaction |
| AlertDialog | ui-alertdialog--open-interaction | play で開く interaction |
| Switch | ui-switch--toggle-interaction | play で ON にする interaction |
| Toggle | ui-toggle--toggles-on | play で押下する interaction |
| ToggleGroup | ui-togglegroup--switch-selection | play で選択変更 interaction |
| Tabs | ui-tabs--switch-tabs-interaction | play で tab 切替 interaction |
| TagInput | custom-form-taginput--add-tag-interaction | play でタグ追加 interaction |
| Progress | ui-progress--default | sb-error（storybook 側に root 描画なし） |
| AudioPlayer | custom-audio-audioplayer--auto-play | sb-error（headless・render wrapper なし） |
| LoadingSkeleton | custom-utility-loadingskeleton--form | sb-error（form variant が storybook で不可視） |

## Re-sync risks（次回 sync が監視すべき点）

- **barrel の同期**: コンポーネントを追加/削除したら `packages/ui/ds-entry.tsx` の `export *` 行を
  更新する。漏れると bundle に載らず floor card 化する。
- **next/* alias の腐敗**: 新しい `next/*` サブパス（next/image 等）を使うコンポーネントが増えると
  実体 Next.js が bundle され "process is not defined" で全 component が落ちる。
  `.design-sync/sync.tsconfig.json` の paths に shim を追加すること。現状 next/link・next/navigation のみ対応。
- **STORY_CAP の tail story**: 多くのコンポーネントが [STORY_CAP] で先頭 6 story のみ grade 済み
  （tail は verified-by-upload）。Popover / Sheet は cap 外に "Open Interaction" play story を持つので、
  `--max-stories` を上げる場合は AlertDialog 同様の skip が必要。
- **M PLUS Rounded 1c は CDN @import 依存**: preview のフォントは Google Fonts CDN 経由。CDN 不通時は
  fallback。self-host したい場合は `cfg.extraFonts` で woff2 を同梱する余地あり（現状未対応）。
- **interaction story の grade**: skip した play story は将来 storybook 側の story 構成が変わると
  story-id がズレる可能性。再 sync で [TITLE_UNMAPPED]/pairing 警告が出たら skip リストを見直す。
- **⚠️ アンカー(`_ds_sync.json`)を `remote-sync.json` に保存するときは全フィールドを欠落させない
  （2026-06-18 再 sync #3 で踏んだ）**: `DesignSync(get_file, _ds_sync.json)` の content を
  `.design-sync/.cache/remote-sync.json` に書き写す際、envelope の必須フィールド（特に `sourceHashes`＝
  41×3=123 件）を 1 つでも落とすと driver が `! remote sidecar malformed — treating as no anchor` と判定し、
  **全 41 component を added/pendingGrade 扱いで full 再検証**してしまう（anchor:"malformed"）。手書き転記で
  端折らず、`{shape,styleSha,renderHashes,sourceKeys,keyRecipe,scriptsSha,sourceHashes,auxSha,bundleSha12}`
  を完全に保存すること。保存後 `node -e` で 9 フィールド presence + renderHashes/sourceKeys=41 /
  sourceHashes=123 を検証してから driver を回すと一撃で気づける。
- **styling だけ変えた再 sync（例: DS Phase 2 のトークン semantic 化）の正常な振る舞い**: sourceKeys は
  全 41 unchanged（story ソース不変）で carried-forward、styleSha 変化で render は full tier・bundle/styling/aux
  が再 ship、`verification.canary`（trigger: render_churn/both）が render が動いた数件を grades-kept で spot-check
  する。今回 churn したのは suzuka/minase 色を直接出す **AudioButton / TagList / VideoTagDisplay** の 3 件。
  canary pick が「fully-graded carried-forward でない」component（STORY_CAP tail や primary-only sampling 由来）
  だと grades-kept でなく fresh capture → pendingGrade になるので、その分だけ画像 grade して driver を再走し
  pendingGrade を空にする（#3 では churn 3 + 初回 canary の余分 4 = Alert/HighlightText/NotImplementedOverlay/
  ListPageLayout を grade、全 match だった）。

## conventions.md 検証メモ（2026-06-18 再 sync #2）

再 sync 時の conventions.md バリデーション（書き換えず検証のみ）で判明した既知の不正確さ。
次回の検証で再発見しても新規 drift ではない。文面の正本は作者（ユーザー）に属する。

- **body フォントは M PLUS ではなくフォールバック丸ゴシックスタック**: bound `styles.css` は
  M PLUS Rounded 1c を CDN `@import` で**ロードはする**が、`body { font-family }` は globals.css の
  システム丸ゴシックフォールバックスタック（ヒラギノ丸ゴ…）であり M PLUS を**割り当てていない**
  （globals.css L228-232 のコメントが正本：self-host 不可・実適用は本番 next/font と Storybook
  preview-head が各文脈で担う）。conventions.md の「M PLUS を body に適用・inherit せよ」は実用上は
  正しい（inherit で丸ゴシックは得られる）が、bound 成果物では M PLUS そのものは適用されない。
  正確を期すなら「ブランドフォントは M PLUS（ロード済）／body は丸ゴシックフォールバックを継承／
  厳密に M PLUS を出すなら `font-family:"M PLUS Rounded 1c",…` を明示」。
- **`--color-suzuka-950` は DS Phase 2(#673)以降 bound CSS に出る（旧記述を訂正・2026-06-18 再 sync #3）**:
  Tailwind v4 は未参照の `--color-*` を tree-shake するため、以前（#672 時点）は scraped CSS の
  `--color-suzuka-*` が 50–900 のみだった。DS Phase 2 のブランド役割明文化で `suzuka-950` が参照されるように
  なり、現在は `--color-suzuka-50..950`（100 を除く各段）が出る。`--color-minase-*` は依然使用分のみ（200,400,
  500,600,700,800,950）。raw 形 `--suzuka-50..950`/`--minase-50..950` は :root に全段あり常に出る。
  conventions の例 `var(--color-suzuka-700)` は検証 OK。tree-shake は参照状況で変動するので、特定 shade の
  utility が無い場合は conventions の指示どおり raw 形 `var(--suzuka-XXX)` を使う（この方針自体は不変）。
