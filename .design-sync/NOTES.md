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
- **【#690 で解決済み・2026-06-20 再 sync #5】桜霞パレット(#685)で新設された `--heart` / `--color-heart`（+ `-foreground`）accent が conventions.md に未記載だった（2026-06-20 再 sync #4 時点）**:
  ユーザーが #690 で conventions.md に heart 行（`bg-heart`/`text-heart`/`text-heart-foreground` = お気に入り/共感/新着の差し色）と minase=ミルクティー表記を追記済み。再 sync #5 の validation で heart の token/utility がすべて bound CSS に存在し検証 OK（下記 #5 知見）。**この穴は閉じた**。以下は当時の記録（履歴）:
  bound CSS には `--heart` / `--heart-foreground` / `--color-heart` / `--color-heart-foreground` が出る（heart 差し色＝
  お気に入り/共感の専用アクセント）。conventions.md は suzuka/minase しか列挙しておらず、**列挙済みの名前はすべて検証 OK
  （stale name なし）だが heart accent は未カバー**＝完全性の穴。バリデーション失敗ではないので skill は conventions.md を
  書き換えない（文面の正本は作者）。ユーザーが heart 行（例: `bg-heart`/`text-heart-foreground` を「お気に入り/共感の差し色」）を
  追記したいかは作者判断。`var(--heart)` 直参照も可。
- **suzuka/minase の名前は桜霞パレット後も不変**: 桜霞は色味（くすみローズ × ミルクティー）の hsl 値を差し替えただけで
  token 名（suzuka=ブランドローズ / minase=セカンダリ accent）は維持。conventions の「suzuka pink」表記は色味としては
  「くすみローズ」が正確だが token 名失効ではない（プロズの正確さの問題で validation 対象外）。

## 再 sync #4（2026-06-20・桜霞パレット）の知見

- **styling churn + story-source churn の複合 re-sync**: 桜霞パレット(#685-687)で globals.css の状態色/ブランド色 hsl が
  全面差し替え → styleSha 変化で **bundle/styling/aux 全 re-ship**（upload.styling/bundle/aux=true・deletePaths=[]）。
  加えて story ソース変更が 3 件 → **changed/pendingGrade = Alert / AlertDialog / Switch**:
  - Alert: #677(DS Phase 4 で info/success/warning status variant 追加) + #681(stories の status 色 semantic 化)。
  - AlertDialog / Switch: #681 の semantic トークン置換で story ソースが動いた（[STORY_CHANGED]）。
  3 件とも全 story image-judge で **match**（status 色は storybook/preview 両側が新パレットで一致）。
- **canary trigger は `reference_drift`**（render_churn でなく）: sb-reference を桜霞で再ビルドしたため carried-forward 組の
  reference 描画が anchor renderHashes とズレ → grades-kept で 5 件 spot-check（AudioButton / NotImplementedOverlay /
  ConfigurableList / VideoTagDisplay / TagList）。全件 fresh sheet が recorded grade(match)を維持＝両側が一緒に動いた。
  grade 書き込み後の driver 再走で **canary=null・pendingGrade=[]** になり closing receipt クリーン。
- **remote anchor は前回 sync が upload した版**（disk の remote-sync.json は前々回 = pre-#3 の残骸で renderHashes がズレていた）。
  §7.2 どおり毎回 `get_file _ds_sync.json` で取り直すこと（disk 残骸を信用しない）。

## 再 sync #5（2026-06-20・#690 桜霞整合性修正）の知見

- **styling churn + story-source churn + component-source churn の複合**（前回 #4 と同型だが churn 対象が違う）。#690 の変更:
  - `globals.css`: suzuka-600 42%→40% / suzuka-700 35%→33%（hover 段深化・白文字 AA 向上）＋ dark ミラー(300/400)。→ **styleSha 変化で bundle/styling/aux 全 re-ship**。
  - `audio-button.tsx`: AudioButton の白文字(text-white/bg-white/*)→暗文字(text-minase-950 dark:text-minase-50/bg-black/*) で AA 化。→ component source 変化で **AudioButton の renderHash churn**（canary churned=[AudioButton]）。
  - `button.stories.tsx`（CustomMinase のコメント・className 注釈のみ／視覚不変）＋ `switch.stories.tsx`（BrandColors の swatch を minase-500→**700** + コピー更新）。→ **changed/pendingGrade = Button, Switch**（[STORY_CHANGED]）。
- **disk の remote-sync.json は #4 upload 版の styleSha(8105d6…) が残っていた**＝stale（#4 の knowledge どおり）。`get_file _ds_sync.json` で取り直すと styleSha=8c08cf…（これが #690 前のアンカー＝正）。**毎回取り直しを順守**して回避。
- **grade 結果（全 match）**: Button 全 14 story / Switch 全 9 story を image-judge で match（新パレットが storybook/preview 両側で一致）。変更された swatch（Button `Custom Minase` = minase milk-tea + 暗文字, Switch `Brand Colors` = minase-700）は **STORY_CAP の先頭 6 の外**にあるため、`compare.mjs --components Button,Switch --max-stories 14` で一度だけ全 story を撮り直して目視確認した（cap は config 据え置き＝既定 6 のまま。tail 確認は手動 one-off）。
- **canary**: 1 回目の driver は sb-reference 再ビルド併発で trigger=both・5 picks（AudioButton/ConfigurableList/NotImplementedOverlay/AlertDialog/HighlightText）→ 全件 grades-kept で sheet 確認し recorded match を維持（AudioButton の白→暗文字は両側一緒に動いて一致＝「両側が一緒に動いた」パターン）。grade 確定後の closing driver は trigger=render_churn・picks=[AudioButton] のみ・**pendingGrade=[]** でクリーン。
- **conventions.md validation = drift なし**: #690 で追記された heart 行・minase=ミルクティー・AA 規則がすべて bound 成果物と一致（`--color-heart`/`--color-heart-foreground`・`.bg-heart`/`.text-heart`/`.text-heart-foreground`・`--color-info/success/warning`・`--color-suzuka-700`・`--color-minase-700/950`・`--radius-xl` すべて存在）。書き換え不要（作者所有）。**#4 で開いていた heart 完全性の穴は #690 で閉じた**。
- **upload**: atomic（pinned 再 sync）・deletePaths=[]・bundle/styling/aux=true・components=[AudioButton,Button,Switch]。プロジェクトには design agent の作成物（home/・proposals/・review/・uploads/・CLAUDE_CODE_palette-fix-brief.md・_adherence.oxlintrc.json 等）が同居するが sync 対象外で**触らない**（plan の writes/deletes glob 外）。

## 再 sync #6（2026-07-04・deps bump + DockedPanel）の知見

- **churn 内容**: story/コンポーネント source は全 41 unchanged。deps bump（#697/#726）+ DockedPanel 追加（#744）で
  bundleSha 変化 → **bundle/styling/aux? 全 re-ship・全 41 renderHash churn（trigger=render_churn）**。canary spot-check
  で全 match（両側が一緒に動いたパターン）。deletePaths=[]・aux=false。
- **DockedPanel（#744 新規・`custom/index` 経由で bundle には載る）は stories 未作成のため sync 対象外**（カード化されない）。
  Claude Design のピッカーに出したければ `docked-panel.stories.tsx` を書く（storybook shape のロスターは story 起点）。
  barrel `ds-entry.tsx` は `export * from custom/index` なので編集不要だった。
- **[GENERAL] fresh worktree/clone では canary が収束しない**: canary pick は「capture json が `pendingGrade:false`（clean）
  なものを優先、無ければランダム」。fresh clone は `.cache/compare/` が空なので毎 driver 実行ごとにランダム pick →
  fresh capture → pendingGrade が新規 3-5 件ずつ湧く（#6 では run1: Alert/Button/Input/Skeleton/ConfigurableList、
  run2: +Card/Carousel/TagInput）。**収束レシピ**: pendingGrade を grade した後、
  `compare.mjs --components <grade済み全部> --spot-check-components <同じリスト>` を一度回して capture json を
  clean 化（grades-kept・秒単位）→ 次の driver は clean 組から pick して pendingGrade=[] になる。
  grade.json を書くだけでは capture json の `pendingGrade` フラグは更新されない点が罠。
- **conventions.md validation = drift なし（書き換えず）**: 列挙名はすべて bound 成果物に存在。ただし utility の
  tree-shake 変動で今回 `.bg-minase-*` は **500 のみ**（#5 時点から減。`--minase-{50..950}` raw は :root に全段あり）。
  conventions 自身の「utility が無い shade は `var(--minase-XXX)` 直参照」ルールで実用上カバーされるので非 drift。
  Button 等の `.d.ts` は `[key: string]: unknown` の緩い形だが**アンカーと byte 一致＝#5 検証時と同一**（劣化ではない。
  variant 語彙は stories/prompt.md 側が担う）。
