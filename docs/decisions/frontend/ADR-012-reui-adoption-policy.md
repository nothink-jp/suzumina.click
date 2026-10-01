# ADR-012: ReUI の導入方針（packages/ui 閉じ込め・Base UI 変種限定・ADR-011 保守方針の継承）

## ステータス
承認済み（2026-07-23）。**結果として ReUI 由来のコンポーネントは 0 件**（2026-10-01 追記）

> 採用候補 4 点は、Chart = shadcn 公式／Combobox = `@base-ui/react` 直接（ReUI 版は license 必須だった）／
> EmptyState・Filters = 手書きで着地し、唯一 ReUI から入れた Icon Stack も導入直後に撤去した（下記「導入一覧」が正本）。
> `packages/ui/components.json` の `@reui` レジストリ設定だけが残っている。

## コンテキスト

フロントエンド UX 調査（2026-07-23）で、コンポーネントライブラリ相当を手組みしている箇所が弱点として特定された:
`custom/tag-input.tsx` の完全手組みコンボボックス（IME・キーボード・aria を自前実装、Portal 無し）、
price-history-chart の hex 直書き色（トークンと二重管理・ダークモード非対応）、共有 EmptyState の不在、
`ConfigurableList` のフィルタに個別解除の affordance が無いこと。

[ReUI](https://reui.io) はこれらに対応する部品を持つ shadcn 互換ライブラリで、shadcn と同じく
**CLI レジストリ配布（コピーイン・runtime package なし）**、Base UI / Radix の両変種を提供する
（当リポジトリは PR #838 で packages/ui を Base UI へ移行済み）。受け皿の packages/ui は
ADR-011（再生成優先・生成物は手編集しない・カスタマイズはトークンか `components/custom/`）が確立済みで、
packages/ui・apps/web 両方の components.json の `ui` エイリアスは既に packages/ui を指している。

## 決定

1. **導入境界は packages/ui に閉じる**。着地先は `packages/ui/src/components/ui/` に限定し、apps/web は
   `@suzumina.click/ui` 経由でのみ消費する。`@reui` の `registries` 設定は **packages/ui/components.json のみ**に置き、
   apps/web で `shadcn add @reui/...` が解決できない状態にして誤着地を構造的に防ぐ
2. **Base UI 変種のみ**（Radix 混在は PR #838 への逆行）。style は `base-vega` で解決できることを確認済み
3. **保守は ADR-011 を継承**。生成物は手編集せず `shadcn add ... --overwrite` → `biome check --write` で再生成する。
   出所（provenance）の正本は末尾の導入一覧表（生成物へのヘッダコメントは再生成で消えるため使わない）
4. **採用ゲートは置換のみ**。既存手組みの置換か特定済み UX 欠落の充足に限り、「ReUI にあるから」は理由にしない
   （ADR-005 の過剰一般化の禁止）。初期スコープは Chart / Autocomplete / Empty State・Icon Stack / Filters の 4 点
5. **テーマは既存 semantic トークンで発色**。ReUI 付属の色定義は持ち込まず、追加トークンも semantic role として
   定義し `pnpm lint:tokens` を通す
6. **無料コンポーネントのみ**。premium は導入しない（必要なら license の Secret 化を含めて別途判断）
7. **MCP サーバ（mcp.reui.io）は任意の開発支援**。インストール・再生成は CLI のみで再現可能に保つ

## 検討した代替案

- **apps/web へ直接インストール** — 却下。再利用境界（再利用コンポーネントは packages/ui）を破り供給元が分裂する
- **npm 依存として利用** — 不可能。runtime package が存在しない
- **既存 shadcn 由来コンポーネントも ReUI へ全面移行** — 却下。動いている生成物を差し替える理由が無い。
  ReUI は shadcn 公式に**無い**ものだけを取る補完位置づけ（＝公式/upstream に有るものはそちらから）

## 理由

- **軸2（予測可能性）**: 「プリミティブは `packages/ui/components/ui/`・出所はレジストリ・色は semantic トークン」という
  ADR-011 の不変条件を、供給元が増えても維持する
- **軸1（系の劣化）**: 供給元 2 系統化は「どのレジストリで再生成するか分からなくなる」劣化ベクトル。
  provenance の一元化と registries の packages/ui 限定で抑える

## ReUI が使われなかった理由（2026-07〜10）

- **Chart**: `@reui/chart` 等のプリミティブ単体は license 必須（401）で、無料ブロックの依存先は shadcn 公式の `chart` だった
  → 公式から導入
- **Combobox**: 実用途は「複数チップ＋フリーテキスト＋候補」で、単一選択の Autocomplete は形が合わない。
  `@reui/combobox` は license 必須（401）、一方 `@base-ui/react/combobox` 本体は無料（既存依存）
  → ReUI を経由せず直接ラップした `combobox.tsx` を新設（Autocomplete は不要に）

### Icon Stack 撤去の決定

唯一 ReUI（無料）から入れた Icon Stack は、`EmptyState` の `icon` と `illustrated` が「組み合わせて初めて意味を持つ」
optional prop 対になり、`illustrated` だけ渡すと無音で何も描画されない罠を型で防げなかった（PR #844 レビュー）。
装飾は UX 課題（空表示の重複・不揃い）の解決に不要な上乗せだったため、prop ごと撤去した。
`empty-state` 完成品は ReUI 側で有償のため、EmptyState は手書きの合成コンポーネント
（未使用だった `ListPageEmptyState` を削除して一本化）。

### Filters の実装

`@reui/filters` は無料だったが、中身は Airtable 的な汎用クエリビルダー（単一ファイル約 72k 文字・依存多数）で、
欠けていたのは「複数条件のうち 1 つだけ解除する」affordance のみ。無料だから採用するのは Icon Stack と同型の
過剰一般化になるため、既存 `ConfigurableList` に個別解除チップだけを手書きで足した。

## 導入一覧（provenance 正本・実装時に更新）

| コンポーネント | 供給元 | 着地先 | 置換対象 | 再生成コマンド | 状態 |
|---|---|---|---|---|---|
| Chart | shadcn 公式 | `packages/ui/src/components/ui/chart.tsx` | price-history-chart の色管理 | `pnpm dlx shadcn@latest add chart --overwrite` | **導入済み**（2026-07-23） |
| Combobox | `@base-ui/react` 直接（ReUI 非経由） | `packages/ui/src/components/ui/combobox.tsx` | `custom/tag-input.tsx` | 手書き（shadcn/ReUI 生成物ではないため再生成コマンド無し。ADR-011 対象外） | **導入済み**（2026-07-23） |
| ~~Icon Stack~~ | ReUI（無料） | ~~`packages/ui/src/components/ui/icon-stack.tsx`~~ | — | — | **導入後に撤去**（2026-07-23。理由は上記「Icon Stack 撤去の決定」参照） |
| Empty State | 手書き（合成コンポーネント） | `packages/ui/src/components/custom/empty-state.tsx` | 散在するインライン空表示 + 未使用だった `ListPageEmptyState` | — | **導入済み**（2026-07-23、Icon Stack 撤去後の最終形） |
| Filters | 手書き（合成コンポーネント。ReUI は不採用） | `packages/ui/src/components/custom/configurable-list/configurable-list-active-filter-chips.tsx` | `ConfigurableList` フィルタ UI の個別解除 affordance 欠落 | — | **導入済み**（2026-07-24。詳細は上記「Filters の実装」参照） |

### 再生成・依存の留意

- recharts は packages/ui（chart.tsx）と apps/web（price-history-chart が直接 import）の両 package.json に依存がある。
  **同一バージョンに揃える**こと（ズレると pnpm が二重インスタンス化し context 共有が壊れる）
- chart.tsx の再生成時は registryDependencies の `card` 上書きを No で除外し、`ChartStyle` の `biome-ignore` を再付与する

## 参考

- [ADR-011: shadcn/ui の保守方針](ADR-011-shadcn-ui-maintenance-policy.md)
- [ADR-005: Entity実装の教訓](../architecture/ADR-005-entity-implementation-lessons.md)（過剰一般化の禁止）
- [ReUI Installation](https://reui.io/docs/installation)
- PR #838（packages/ui の Base UI 全面移行）
