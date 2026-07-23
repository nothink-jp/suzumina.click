# ADR-012: ReUI の導入方針（packages/ui 閉じ込め・Base UI 変種限定・ADR-011 保守方針の継承）

## ステータス
承認済み（2026-07-23）

## コンテキスト

フロントエンド UX 調査（2026-07-23、branch: claude/reui-component-integration）で、
コンポーネントライブラリ相当を手組みしている箇所が UX の弱点として特定された:

- `packages/ui/src/components/custom/tag-input.tsx`（467行）: コンボボックスを完全手組み
  （デバウンス・キーボードナビ・IME composition・aria を自前実装。Portal 無しでクリップ懸念）
- `apps/web/src/components/price-history/price-history-chart.tsx`: チャート色が hex 直書きで
  CSS トークンと二重管理・ダークモード非対応
- 共有 EmptyState コンポーネントが無く、空表示が各所インライン文字列で散在
- 一覧フィルタ UI（`ConfigurableList`）にチップ表示・個別解除の affordance が無い

[ReUI](https://reui.io) はこれらに対応するコンポーネントを持つ shadcn 互換ライブラリで、
性質は次の通り:

- **shadcn CLI レジストリ配布（コピーイン）**。runtime npm package を持たない点は shadcn/ui と同一
  （＝ADR-011 が確立した「生成物」の扱いがそのまま適用できる）
- **Base UI / Radix UI の両変種**を提供（primitive-agnostic）。当リポジトリは PR #838 で
  packages/ui を Base UI へ全面移行済みであり、Base UI 変種と整合する
- レジストリ URL は `https://reui.io/r/{style}/{name}.json` 形式で、components.json の
  `registries` 設定を要する。**無料コンポーネントは認証・license key 不要**
  （premium blocks/icons/templates のみ Bearer license key が必要）
- MCP サーバ（`https://mcp.reui.io`、OAuth 必須・無料枠 100 req/日）は検索・API 参照・
  インストールコマンド検証を提供するが、**インストール自体は CLI で完結**する

受け皿となる既存構成:

- packages/ui は shadcn 流コピーイン構成で、保守方針は ADR-011（再生成優先・生成物は手編集しない・
  カスタマイズはトークンか `components/custom/` の wrapper）が確立済み
- components.json は packages/ui と apps/web の両方にあるが、**`ui` エイリアスは両方とも
  `@suzumina.click/ui/components/ui` を指す**（プリミティブの着地先は既に packages/ui に一本化）。
  Tailwind の css 参照も両方が `packages/ui/src/styles/globals.css` を指す（トークン正本は 1 つ）

## 決定

### 1. 導入境界: packages/ui に閉じる
- ReUI 由来コードの着地先は `packages/ui/src/components/ui/`（生成物）に限定する。
  apps/web は `@suzumina.click/ui` の exports 経由でのみ消費し、apps/web への直接インストール
  （`@/components` 側）は行わない
- `registries` 設定（`"@reui": "https://reui.io/r/{style}/{name}.json"`）は
  **packages/ui/components.json のみ**に追加する。apps/web/components.json には足さない。
  これにより「apps/web で `shadcn add @reui/...` を実行しても解決できない」状態を作り、
  誤着地を構造的に防ぐ

### 2. 変種: Base UI 版のみ
- Radix 変種は使わない（PR #838 の Base UI 移行との整合。混在は依存の逆行）
- style 互換（現行 `"style": "base-vega"` が ReUI レジストリの `{style}` として解決できるか）は
  **導入初回に検証**する。非対応の場合は shadcn 全体の style は変えず、`@reui` レジストリの URL 側に
  ReUI が提供する Base UI 系 style 名を固定値で埋め込む（例: `https://reui.io/r/<対応style>/{name}.json`）

### 3. 保守: ADR-011 を継承
- 生成物は手編集しない。更新は `pnpm dlx shadcn@latest add @reui/<name> --overwrite`
  → `pnpm exec biome check --write` の再生成で行う
- カスタマイズは theme（globals.css の semantic トークン）または `components/custom/` の
  薄い wrapper で行う。在file 編集が不可避になった場合のみ、ADR-011 の例外リストと同様に
  本 ADR へ明記する
- **出所（provenance）の正本は本 ADR 末尾の導入一覧表**とする。shadcn 公式と ReUI の
  2 レジストリ体制になるため、「どのファイルをどのコマンドで再生成するか」を表で管理する
  （生成物へのヘッダコメント追記は再生成で消えるため使わない）

### 4. 採用ゲート: 置換のみ・投機的追加の禁止
- 導入は「既存手組み実装の置換」か「具体的に特定済みの UX 欠落の充足」に限定する。
  「ReUI にあるから入れる」は理由にしない（ADR-005 の過剰一般化の禁止と同型）
- 初期スコープは調査で特定した 4 点のみ:
  1. **Chart** — price-history-chart の hex 直書き・ツールチップ白背景固定を
     ChartContainer + CSS 変数テーミングへ置換
  2. **Autocomplete** — tag-input.tsx の手組みコンボボックスを置換（Portal 化・a11y のライブラリ移管）
  3. **Empty State / Icon Stack** — 共有 EmptyState コンポーネントを新設し、散在する
     インライン空表示を統一
  4. **Filters** — works / videos 一覧のフィルタ UI で試行（チップ表示・個別解除）。
     consumer サイトには過剰の可能性があるため全一覧への展開は試行結果を見て判断
- ページレベルのブロック類（Wizard / Dashboard 等の compositions）は packages/ui の対象外。
  必要になった時に app 層での利用を個別判断する（本 ADR の範囲外＝必要なら追補）

### 5. テーマ: 桜霞 semantic トークンで発色
- ReUI 付属のトークン・色定義はそのまま持ち込まず、globals.css の既存 semantic トークン
  （`--primary` = suzuka 等）へマップする。生スケール（`suzuka-500` 等）の直書きで
  当てない（semantic role で消費する既定に従う）
- 追加トークンが必要な場合も semantic role として定義し、`pnpm lint:tokens` を通す
  （定義あり・参照なしの死にトークンを作らない）

### 6. 無料コンポーネントのみ
- license key 不要の free 範囲に限定する。premium blocks / icons / templates は導入しない
  （必要が生じたら license 管理（`REUI_LICENSE_KEY` の Secret 化）を含めて別途判断）

### 7. MCP サーバはオプション（開発支援）
- MCP 接続（`claude mcp add --transport http reui https://mcp.reui.io` + OAuth）は
  コンポーネント検索・`get_install_command` によるコマンド検証に有用だが、
  導入フローの必須要素にはしない（インストール・再生成は CLI のみで再現可能に保つ）

## 検討した代替案

- **B: apps/web へ直接インストール**（`@/components` 側に着地）— 却下。
  再利用境界（CLAUDE.md §2「再利用コンポーネントは packages/ui」）を破り、
  プリミティブの供給元が 2 箇所に分裂する
- **C: npm 依存として利用** — 不可能。ReUI は shadcn 同様 runtime package を持たない
  レジストリ配布であり、依存化は選択肢として存在しない（ADR-011 コンテキストの再確認）
- **D: 既存 shadcn 由来コンポーネントも ReUI へ全面移行** — 却下。
  動いている生成物を別供給元へ差し替える理由が無く、「他で成功したから」の過剰一般化（ADR-005）。
  ReUI は shadcn 公式レジストリに**無い**ものだけを取る補完位置づけとする

## 理由

- **軸2（予測可能性）**: 「UI プリミティブは `packages/ui/components/ui/` に居て、出所はレジストリ、
  色は semantic トークンが決める」という ADR-011 で確立した不変条件を、供給元が増えても維持する。
  読み手は ReUI 由来かどうかを意識せず同じ規約で読める
- **軸1（系の劣化）**: 供給元が 2 系統になること自体が新しい劣化ベクトル（どのレジストリで
  再生成するか分からなくなる）。provenance 一覧の一元化と registries 設定の packages/ui 限定で、
  この劣化を構造的に抑える
- **ステートレス LLM 協働（§0）**: 再生成方式の継承により「過去のローカル意図の再構築」を
  不要に保つ。導入判断の根拠（置換対象・検証項目)を本 ADR に集約し、セッションを跨いだ
  意図の復元コストを最小化する

## 結果

- **良い点**: 手組み実装 4 領域がライブラリ管理へ移り、保守面積が減る（特に tag-input 467行）。
  Base UI 移行（PR #838）の投資が ReUI の Base UI 変種でそのまま活きる。
  境界・保守・テーマの規約が既存 ADR-011 と同型で、新しい運用ルールをほぼ増やさない
- **悪い点 / 留意**:
  - **recharts 依存の重複**: chart.tsx（packages/ui）と price-history-chart（apps/web、
    recharts プリミティブを直接 import）の両方が recharts に依存するため、**両 package.json に
    同一バージョン（3.9.2）で保持**する。バージョン更新時は両方を揃えること
    （ズレると pnpm が二重インスタンス化し context 共有が壊れる）
  - **IME 検証が必須**: Autocomplete 置換では日本語入力の composition 挙動
    （変換確定 Enter が候補選択に誤爆しないか）を最初に検証する。現行 tag-input は
    これを明示処理しており、退行させない。検証不合格なら置換を見送り、現行実装を維持する
  - **style 互換は未検証**: `base-vega` が ReUI レジストリで解決できるかは導入初回の検証項目
    （決定 2 のフォールバックで吸収）
  - **無料枠の変動リスク**: ReUI の free/premium 境界は同社の事業判断で変わりうる。
    コピーインなので導入済みコードは影響を受けないが、再生成が有償化した場合は
    その時点のコードを凍結し在file 例外へ移す

### レジストリ実態の検証結果（2026-07-23・Chart 導入時）

- **style 互換**: `https://reui.io/r/base-vega/<name>.json` は無料ブロック（`c-*` 系）で HTTP 200 解決
  を確認。決定 2 のフォールバック（style 固定 URL）は不要だった
- **無料/有償の境界**: `@reui/chart` 等の**プリミティブ単体は license key 必須（401）**。
  無料なのは `c-chart-1` のような番号付きブロック（example compositions）で、その
  registryDependencies は **shadcn 公式レジストリの `chart` プリミティブ**を指していた
- **帰結**: Chart プリミティブは代替案 D の方針（公式に有るものは公式から）どおり
  **shadcn 公式レジストリから導入**した。ReUI レジストリの実利用は、公式に無い
  Autocomplete / Filters 等の導入時に改めて無料範囲を確認して判断する

### Autocomplete → Combobox への計画変更（2026-07-23・実装時の判明事項）

着手前に ReUI `@reui/autocomplete` の無料範囲確認と IME 検証を行ったところ、次が判明した:

- **プリミティブ自体は無料**（`error` なし・200・license 不要。Chart の `@reui/chart` とは対照的）
- **しかし形が合わない**: `tag-input.tsx` の実際の用途は「複数チップ＋フリーテキスト追加＋候補提示」で、
  ReUI/Base UI の `Autocomplete` は単一選択（chips 非対応）。適合するのは
  **Base UI の `Combobox`**（`multiple`・`Chips`・"Creatable" free-text パターンを標準搭載）
- ReUI の Combobox ラッパー（`@reui/combobox`）は **license key 必須（401）**。無料ブロック
  `c-combobox-1` の registryDependencies も有償の `combobox` を指す
- 一方 `@base-ui/react/combobox` 本体は**無料**（`@base-ui/react` は既存の直接依存）。
  `Autocomplete.Input` は実は `Combobox` の `ComboboxInput.mjs` を re-export しているだけで、
  IME composition 安全性の実装は完全に共通

**決定**: Chart と同型の判断（代替案D＝公式/upstream に有るものはそちらから）で、
**ReUI を経由せず `@base-ui/react/combobox` を直接ラップした `combobox.tsx` を packages/ui に新設**した。
ADR-012 の初期スコープ「Autocomplete」は実質的に「Combobox」へ置き換わる
（single-select の探索用途には combobox.tsx がそのまま使えるため、Autocomplete 自体の追加導入は不要）。

### 導入一覧（provenance 正本・実装時に更新）

| コンポーネント | 供給元 | 着地先 | 置換対象 | 再生成コマンド | 状態 |
|---|---|---|---|---|---|
| Chart | shadcn 公式 | `packages/ui/src/components/ui/chart.tsx` | price-history-chart の色管理 | `pnpm dlx shadcn@latest add chart --overwrite` | **導入済み**（2026-07-23） |
| Combobox | `@base-ui/react` 直接（ReUI 非経由） | `packages/ui/src/components/ui/combobox.tsx` | `custom/tag-input.tsx` | 手書き（shadcn/ReUI 生成物ではないため再生成コマンド無し。ADR-011 対象外） | **導入済み**（2026-07-23） |
| Icon Stack / Empty State | ReUI（無料範囲を要確認） | `packages/ui/src/components/ui/`（実装時に確定） | インライン空表示の散在 | 実装時に確定 | 未着手 |
| Filters | ReUI（無料範囲を要確認） | `packages/ui/src/components/ui/filters.tsx` | ConfigurableList フィルタ UI（works/videos 試行） | 実装時に確定 | 未着手 |

### combobox.tsx（在file・手書きプリミティブ）実装ノート

- スコープは select.tsx と同等の「単一選択の探索 UI」用途に絞った（Root/Value/InputGroup/Input/
  Content(Portal+Positioner+Popup)/List/Item/Empty/Status）。`Chips`/`Chip`/`ChipRemove`/`Group`/
  `GroupLabel`/`Clear`/`Trigger`/`Icon`/`Arrow`/`Backdrop` は現状アプリに用途が無いため未実装
  （YAGNI。必要になった時点で `@base-ui/react/combobox` から追加 export する）
- **`open` の明示制御が必須**: `items` が空でも入力するとポップアップが開こうとし、対応する
  DOM（Portal/Popup）を描画していないと `aria-expanded="true"` だけが残り
  `aria-required-attr`（axe）違反になる。`enableAutocompletion=false` 相当の場面では
  `open={false}` を明示すること
- **single モードは選択後に入力欄へラベルを強制書き戻す**（Base UI 内部 `AriaCombobox.mjs`
  の `shouldFillInput = ... || (single && !inputInsidePopup)` が prop で無効化不可）。
  「選択したら入力欄をクリアして次の入力に戻る」トークナイザ的 UX には合わないため、
  tag-input.tsx では **`multiple` を指定しつつ `Chips` は描画せず、`value` を空配列に固定
  ‌して選択シグナルの取得だけに使う**（multiple モードはこの強制書き戻しの対象外になる）
- **`onInputValueChange` の `reason: "item-press"` ガードが必要**: 候補選択時に Base UI が
  「選択ラベルを入力欄に反映」しようとして `onInputValueChange` を呼ぶことがあり、
  こちらの明示クリアと競合する。`eventDetails.reason === "item-press"` を無視することで解消
- **listbox 自体にも `aria-label` が必要**（axe `aria-input-field-name`）。`ComboboxList` に
  `aria-label` を渡すこと（tag-input.tsx は `"タグ候補"` を設定）
- **ポップアップは Portal で `document.body` 直下に描画される**。story/テストで候補を
  `canvasElement` スコープでクエリすると見つからない。`within(document.body)` を使うこと
- 検証: `pnpm test:storybook` で IME composition（compositionstart/compositionend +
  keyCode 229 の確定 Enter）と選択→クリアの一連フローを実ブラウザで確認済み。ただし
  **ヘッドレス自動テストと実ブラウザの手動確認で結果が食い違う場面が実際にあった**
  （single モードの強制書き戻しが自動テストでは検知されず手動確認で発覚）。
  Combobox 系の挙動変更は自動テストの green だけで判断せず、Storybook 実描画での
  目視確認を必ず併用すること

### tag-input.tsx 書き換えの要点

- 外部 API（`TagInputProps`/`TagSuggestion`）・chips 表示（Badge+Button）・バリデーション
  （必須/文字数/最大数/重複）は無変更。consumer（video-tag-editor.tsx / audio-button-tag-editor.tsx）
  はゼロ変更で動作
- 撤去できた自前実装: click-outside の `document.addEventListener('mousedown', ...)`、
  候補ハイライトの手動 index 管理、Portal 非対応の `absolute` ドロップダウン
- IME composition の判定は combobox.tsx の教訓どおり `isComposingRef`（compositionstart/end）
  ＋ `nativeEvent.isComposing`/`keyCode===229` の二重ガードを維持（片方だけでは
  jsdom テスト環境で `isComposing` が伝播しないケースがあった）

**chart.tsx の再生成時の注意**:
- registryDependencies に `card` が含まれるため上書き確認が出る → **No で card を除外**する
  （card 更新は独立に判断）
- 再生成で lint 手当てが消える: `ChartStyle` の `dangerouslySetInnerHTML` への
  `biome-ignore lint/security/noDangerouslySetInnerHtml`（理由コメント付き）を再付与する
  （ADR-011「再生成後の正規化」の一環）
- `chart.stories.tsx`（custom・在file）は再生成の対象外だが、`ChartConfig` の型シグネチャが
  変わった場合は追従が必要

**chart.stories.tsx（Storybook・在file・custom 配置）**:
- 全 ui プリミティブに story を持たせる既存慣行（29/29）に合わせて追加。`Default` は静的参照、
  `TooltipInteraction` は play 関数で (1) 系列の stroke 色が hex 直書きではなく
  `hsl(var(--info))` / `hsl(var(--destructive))` の実測値と一致すること（トークン退行の回帰検知）、
  (2) ホバーでツールチップが表示され `ChartConfig` のラベルが反映されることを検証する
- `pnpm test:storybook`（Vitest + Playwright provider の実ブラウザ、`vitest.storybook.config.ts`）で実行。
  **`pnpm verify` には含まれない**別ゲート（CI は Chromatic ワークフローが別途担当）
- 実装上の注意: recharts のマウス追跡は座標（`clientX`/`clientY`）を実測 rect から計算するため、
  `userEvent.hover`（要素中心への合成ディスパッチ）ではプロット領域内に座標が解決されず
  ツールチップが発火しないことがある。`fireEvent.mouseOver`/`mouseMove` に
  `.recharts-wrapper` の実測 `getBoundingClientRect()` から算出した明示座標を渡すこと

## 参考

- [ADR-011: shadcn/ui の保守方針](ADR-011-shadcn-ui-maintenance-policy.md)（再生成優先・生成物は手編集しない・在file 例外の管理方式）
- [ADR-005: Entity実装の教訓](../architecture/ADR-005-entity-implementation-lessons.md)（過剰一般化の禁止）
- CLAUDE.md §0（ステートレス LLM 協働）/ §1（能動ルール）/ §2（再利用コンポーネントは packages/ui）
- [ReUI Installation](https://reui.io/docs/installation) / [ReUI MCP Server](https://reui.io/docs/mcp)
- PR #838（packages/ui の Base UI 全面移行）
