# ADR-011: shadcn/ui の保守方針（再生成優先・未使用削除・テーマトークン v4 互換化）

## ステータス
承認済み（SPR-61）

## コンテキスト
`packages/ui/src/components/ui/` の shadcn/ui ベースコンポーネントは「コピーイン（fork/vendor）」形式で取り込まれている。
これらを最新化する際、従来は「`--overwrite` 厳禁・差分単位で手マージ」という前提で運用しようとしていた。

SPR-61 で全コンポーネントの upstream 差分を精査し、Storybook で実描画検証した結果、次が判明した:

- **保護すべき独自カスタマイズはほとんど無かった。** local と upstream の差分は、ほぼ全てが
  「旧 upstream テンプレート + Biome 整形（タブ・セミコロン・import 順）」と、prettier-plugin-tailwindcss による
  **Tailwind class の並べ替え churn** だった。
- local は Biome 整形のため、**class 順を upstream に合わせても将来の `shadcn diff` ノイズは消えない**
  （Biome が再整形でタブ/セミコロン/import 順を必ず書き換えるため、byte 一致は構造的に不可能）。
- shadcn/ui は**ランタイムのコンポーネント package を持たない**設計のため、「非fork（依存パッケージ）化」は
  別ライブラリへの移行という大工事でしか達成できず、shadcn の利点（完全な所有権・Tailwind テーマ統合）を捨てることになる。
- 約半数が**利用 0・story 0・index 未 export の死蔵コード**だった（一括 add の残骸）。
- ブランド色は「コンポーネント」ではなく `globals.css` 側で当たっており、しかも **トークン規約が Tailwind v3 流儀
  （HSL 三つ組）のまま v4 の `@theme` と噛み合わず**、それを糊付けする `!important` ワークアラウンドが何層も積まれていた（後述）。

痛みの根源は「fork であること」ではなく、**「生成物を手編集していること」「使わないものまで抱えていること」
「テーマトークンが v4 と不整合でワークアラウンドが必要になっていたこと」**だった。

## 決定

### A. 保守方針
1. **未使用コンポーネントは削除する（YAGNI）。** 必要になったら `shadcn add` で一瞬で再生成できる。
2. **生成物（`components/ui/**`）は手編集しない。** 更新は
   `pnpm dlx shadcn@latest add <c> --overwrite` → `pnpm exec biome check --write` で**再生成**する（手マージ儀式は廃止）。
   components.json のエイリアス設定により、import は `@suzumina.click/ui/...` へ自動書換される。
3. **カスタマイズは生成物の外へ置く。** theme（`globals.css` の CSS 変数）または薄い wrapper（`components/custom/`）で行う。
   在file 編集がどうしても不可避なものだけを「例外」として本 ADR に明記する。
4. **Biome は変更しない。** 「再生成 + 再整形」方針では upstream との byte 一致を追う必要がないため、
   prettier 二重化も Biome の class sorter 導入も不要。class 並べ替え churn は**追うこと自体をやめる**。

### B. テーマトークンの Tailwind v4 互換化（ワークアラウンド層の撤去）
**根本原因**: トークンは `--primary: 340 75% 55%;`（生の HSL 三つ組）で、`@theme` が `--color-primary: var(--primary);` と
マップしていた。これだと Tailwind 自動生成の `bg-primary` は `background-color: var(--color-primary)` = `background-color: 340 75% 55%`
= **不正値**で効かない。これを糊付けするため **4 層のワークアラウンド**が積み上がっていた:
1. 手動ユーティリティ再定義（`.bg-primary { background-color: hsl(var(--primary)); }` 等）— 固定セットのみで variant 形を含まない。
2. `@media (prefers-color-scheme: dark)` 内の `!important` ボタン色強制（"Dark Reader 対策"）。
3. `[data-slot="switch"|"tabs-trigger"][data-state]` への `!important` 直書き（手動層が変換しない data-state variant を補うため）。
4. `:root` のダークトークンを `@media (prefers-color-scheme: dark)` で上書きする死にブロック（後続の `:root` ライト値に上書きされ無効）。

**決定**: `@theme` のトークンを v4 互換に直し、上記ワークアラウンド層を撤去する。
1. `@theme` の `--color-*: var(--*)` を **`hsl(var(--*))`** に変更（32 個）。これで Tailwind 自動生成のユーティリティ
   （`bg-primary` / `data-[state=checked]:bg-primary` / opacity 修飾子 等）がすべて有効値になる。
2. 手動ユーティリティ再定義層（セマンティック分）を撤去 → 自動生成に委ねる。
3. `data-slot` への `!important` override 層を撤去 → 色はコンポーネント側の Tailwind クラスから出す。
4. "Dark Reader 対策" の `@media dark !important` ブロックと、死んでいる `:root` ダークブロックを撤去。
5. `tabs.tsx` の active を semantic トークンに正規化（`bg-suzuka-600` 直書き → `bg-primary` / `text-primary-foreground` / `border-primary`）。
6. 未使用の `switch-subtle` / `switch-minase` variant override を削除。

**保持**: suzuka / minase のブランドパレット用手動ユーティリティ（`.bg-suzuka-500` 等。`@theme` 非対象で実使用される）。
`.dark` クラス用トークンブロックは正規の class-based dark（`@custom-variant dark`）と整合するため保持（将来のダーク対応の土台）。

> **重要な事実**: この web アプリは **light-only**（next-themes の ThemeProvider 無し / `.dark` 付与コード無し /
> `layout.tsx` に `darkreader-lock` meta）。OS のダーク設定で自動ダーク化する意図のブロックは機能しておらず、不要だった。

### ブランドカラーの適用箇所（最終状態）
ワークアラウンド撤去後、ブランド色は **semantic トークン**で当たる:
`globals.css` の `--primary`=suzuka（light=500 / dark=400）、`--ring`/`--focus-ring`=suzuka（SPR-61 で light モードに残っていた
青バグを修正）、`--accent`=暖色ニュートラル（同じく青系デフォルト残りを修正）。upstream が `bg-primary` / `ring-ring` /
`bg-accent` を使うコンポーネントは**トークン経由で自動的に正しい色になる**。新しいブランド要求は、まず
「semantic トークンで表現できないか」を問う。在file 直書きは最後の手段。

### 在file 編集の例外リスト（regenerate 時は要復元・要除外）
**(1) 設計/視覚カスタマイズ**（再生成すると意図が失われる。再生成後 `git checkout -- <file>` で復元する）
- `button.tsx` — モバイルの touch-target（`h-11 ... sm:h-9` 等。テスト保護された a11y 決定）と追加 size
  （`xs` / `icon-xs` / `icon-sm` / `icon-lg`）・dark variant。globals.css に button override は無く、これは真に in-file。
- `tabs.tsx` — active タブを**ブランド色にする設計**（`data-[state=active]:bg-primary` 等）。upstream tabs は active を
  中立色（`bg-background`）にするためトークンだけでは出ない設計差。`!important` override 撤去後は在file の token クラスが実効する。
- `toggle.tsx` — `toggleVariants` の active(on) を**ブランド色にする設計**（`data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`）。
  upstream は中立色（`bg-accent`）。`toggle-group` の `ToggleGroupItem` はこの `toggleVariants` を経由するため、ここを直すと
  group 側も連動してブランド色になる（home-search のトグル選択状態が弱くならない）。`toggle-group.tsx` 自体は pure upstream
  （2026 の再設計版 = `variant`/`size`/`spacing` + context）を採用し、在file 例外は `toggle.tsx` 1 点に集約した。

> `carousel` / `pagination` / `dialog` / `alert-dialog` は `button` に依存するため、それらを
> `--overwrite` すると `button.tsx` も巻き込み上書きされる。**再生成後は必ず `button.tsx` を復元する。**

**(2) 依存バージョン非互換**: 該当なし（`calendar` を削除したため）。
- 旧: `calendar.tsx` は `react-day-picker@10.0.1` 適応済みだが shadcn registry が v9 世代のままで再生成不可、という例外だった。
  だが calendar は **app 未使用（story のみ）** と判明し、SPR-123 で削除（`react-day-picker` / `date-fns` も除去）。
  必要になれば `shadcn add calendar`（v10 対応版が出てから）で再生成する。

### 再生成後の正規化
`biome check --write` 後、unsafe lint 指摘が残ることがある（例: 最新 pagination は `<nav role="navigation">` で
`a11y/noRedundantRoles` に当たる）。**lint ゲートを通すための手当て（`--unsafe` 含む）は再生成フローの一部として許容**する。

## 理由
- ステートレス LLM 協働の観点（CLAUDE.md §0）: 手マージは「過去のローカル意図」を毎回再構築させる高コスト作業だが、
  その意図はほぼ存在しなかった。再生成方式は意図の再構築を不要にする。
- churn 最小（軸1）: class 並べ替えを追わないこと、未使用コードの削除、4 層のワークアラウンドを 1 点（`@theme` の `hsl()` 包み）で
  不要化することで、無意味な大規模 diff と保守負債を恒久的に減らす。
- 予測可能性（軸2）: 「生成物は upstream そのもの（＋Biome 整形）」「色はコンポーネントの className が決める」という不変条件が、
  読み手の驚きを減らす。`!important` で外から黙って見た目を上書きする状態（読んでも色が分からない）を解消。

## 検証結果（SPR-61: 全コンポーネントで方針が成立するか）
全 shadcn コンポーネントに本方針を適用し、Storybook で実描画検証した結論: **成立する。**
- 保守対象を **45 → 28 に削減**（未使用 17 個を削除: overlay 6 + その他 11）。
- 維持 28 個のうち **26 個は再生成で安全**に最新化（className トークン集合比較で「保護すべき独自実装なし」を確認）。
- **在file 例外は 3 個**: `button`（touch-target 設計）/ `tabs`（active タブのブランド色＝upstream との設計差）/ `calendar`（依存非互換）。
  当初 button/badge/switch/tabs の 4 個を例外候補としたが、ブランド色が globals.css 側で当たっていると判明 → トークン規約を
  v4 互換化して switch・badge を再生成、tabs は token クラス（`bg-primary`）に正規化、ワークアラウンド層を撤去した。
- 検出手法: ① local と upstream の className を**順序無視のトークン集合**で比較し差集合で「再生成で消える独自実装」を機械抽出。
  ② Storybook 実描画＋`getComputedStyle` で実効スタイルの出所（トークン / `!important` override）を確認。
  ②が無いと「component を直したつもりが globals.css に上書きされていた」ことを見逃す（当初 tabs の token 化が空振りしたのがその例）。

## 結果
- **良い点**: 更新が `add --overwrite` + `biome` の2コマンドに単純化。保守対象 45→28。「`--overwrite` 厳禁・手マージ」運用が不要に。
  ワークアラウンド 4 層を撤去（`globals.css` 約 −200 行）。switch/tabs/badge は token・在file クラスで発色し、`!important` の黙示上書きが消えた。
- **視覚デルタ（許容）**: tabs active が suzuka-600 → suzuka-500（`bg-primary`。button/badge と同色で整合）。
  switch thumb がダークグレー強制 → upstream 標準の白（suzuka トラック上で視認性は十分）。
- **悪い点 / 留意**: 在file 例外の `button` は依存解決で巻き込み上書きされるため、再生成後の復元を忘れるとカスタマイズが失われる。
  upstream のデフォルト挙動変更（例: alert-dialog の size/media 対応や header の grid レイアウト化）はそのまま取り込まれる前提。
  hover の opacity 修飾子は手動 `hsl(.../α)` から Tailwind 自動生成の `color-mix` に変わるが、実測で機能的に等価（suzuka@90% 等）。
- **残課題**: ブランドパレット（suzuka/minase）はまだ手動ユーティリティ。`@theme` に載せれば手動層を完全に無くせるが、使用箇所確認が要るため別タスク。
  light-only なので `.dark` トークン群は実質休眠（将来ダーク対応時に活きる）。

## 参考
- SPR-61: chore(ui) shadcn/ui コンポーネント群の最新化
- CLAUDE.md §0（ステートレス LLM 協働前提）/ §1（churn 最小・追加は理由を言語化）
- [ADR-005: Entity実装の教訓](../architecture/ADR-005-entity-implementation-lessons.md)（「他が成功したから」を理由にしない＝過剰一般化の禁止）
