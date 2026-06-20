# @suzumina.click/ui v0.3.13

涼花みなせファンサイト用 UI コンポーネントライブラリ（Storybook統合・包括的テストスイート実装完了）

## 🎯 概要

本パッケージは、suzumina.click プロジェクト専用のUIコンポーネントライブラリです。shadcn/ui ベースのデザインシステムと、涼花みなせブランドに特化したデザイントークンを提供します。

## 🧱 技術スタック

バージョンの正は `package.json`（ここには固定しない）。基盤は以下:

- **Tailwind CSS v4**（`@theme` + CSS 変数駆動。`tailwind.config` は廃止）
- **React 19 / Next.js 16**
- **radix-ui 統合パッケージ**（個別 `@radix-ui/react-*` ではなく単一 `radix-ui` から import。new-york style）
- **Storybook 10**（react-vite / a11y / vitest アドオン。a11y 違反は CI fail）
- **shadcn/ui**（new-york / baseColor=stone）。保守方針は [ADR-011](../../docs/decisions/frontend/ADR-011-shadcn-ui-maintenance-policy.md)

## 📦 パッケージ構成

```text
packages/ui/src/components/
├── ui/            # shadcn/ui ベースコンポーネント (29個)
├── custom/        # プロジェクト独自コンポーネント (14個)
└── design-tokens/ # デザイントークン Storybook (MDX)
```

## 🎨 デザイントークン

### ブランドカラーパレット（桜霞パレット）

正本は [`src/styles/globals.css`](src/styles/globals.css) の `:root` / `.dark`（HSL・50〜950 の全段、
ダークは 50↔950 反転）。全段の値はここに転記しない（drift 防止 / SPR-205）。下表は役割と
**アンカー(500) の参考値**のみ — パレット改訂時は globals.css を正として同期すること:

| スケール | 役割 | アンカー(500) | 備考 |
|---|---|---|---|
| `suzuka` | メイン（primary）= **くすみローズ** | `#B9315F`（白文字 ≈5.7:1） | dusty rose。`--primary` / `--ring` が指す |
| `minase` | サブ（secondary）= **ミルクティー暖色** | `#C9A887`（明色・暗文字専用） | 淡い暖色*サーフェス*。前景/アクセントには使わない |
| `heart`  | アクセント差し色 = **鮮やかピンクレッド** | `#DC1840`（白文字 ≈4.9:1） | favorite / like / 新着強調**専用**。`bg-heart` / `text-heart-foreground` |

AA の使い分け: minase は明色のため**塗りには暗文字**（`bg-minase-50…200 text-minase-900` /
`bg-minase-500 text-minase-950` ≈6:1）、白文字は `minase-800`+ のみ。`text-minase-{400…600}` /
`text-secondary` を明色背景の文字色に使わない（≈2.2 で AA 未満）。鮮やかな差し色が要るときは `heart` を使う。

### デザイントークン構成

- **Color Palette**: ブランドカラー + セマンティックカラー
- **Typography**: フォントサイズ・行間・ウェイトの体系的定義
- **Spacing**: 4px基準の一貫したスペーシングシステム
- **Borders & Shadows**: 角丸・ボーダー・シャドウの統一ルール
- **Icons**: Lucide React アイコンセット（200+アイコン）

## 🚀 開発

### セットアップ

```bash
# パッケージインストール
pnpm install

# Storybook 起動
pnpm storybook
```

### Storybook

UI コンポーネント + デザイントークンの統合 Storybook を提供：

```bash
# Storybook 起動 (ポート 6006)
pnpm storybook

# Storybook ビルド
pnpm build-storybook
```

**Storybook カテゴリ**:
- `UI/` - shadcn/ui 標準コンポーネント
- `Custom/` - プロジェクト独自コンポーネント  
- `Design Tokens/` - カラー・スペース・タイポグラフィ・アイコン

### 品質管理

```bash
# Lint + Format (Biome)
pnpm lint
pnpm format

# テスト (Vitest, happy-dom unit + coverage)
pnpm test
pnpm test:coverage

# Storybook の story を play(interaction)/a11y テストとして browser モードで実行
# （vitest + playwright。a11y 違反は CI fail＝"error" ゲート。CI: storybook-test.yml）
pnpm test:storybook

# Chromatic 視覚回帰（要 CHROMATIC_PROJECT_TOKEN。--only-changed で変更 story のみ）
pnpm chromatic

# 型チェック
pnpm typecheck
```

## 📋 コンポーネント一覧

### shadcn/ui (29個)

基盤UIコンポーネント - プロジェクト間で完全再利用可能

```typescript
import { Button, Card, Input, Dialog } from "@suzumina.click/ui/components/ui";
```

### Custom Components

プロジェクト特化コンポーネント - suzumina.click 専用機能

```typescript
import { AudioButton, SearchFilterPanel } from "@suzumina.click/ui/components/custom";
```

## 🛠️ 使用方法

### Web App での利用

```typescript
// shadcn/ui コンポーネント
import { Button } from "@suzumina.click/ui/components/ui/button";

// カスタムコンポーネント
import { AudioButton } from "@suzumina.click/ui/components/custom/audio-button";

// ブランドカラー使用例
<Button className="bg-suzuka-500 hover:bg-suzuka-600">
  メインCTA
</Button>

<Button className="bg-minase-500 hover:bg-minase-600 text-minase-950">
  セカンダリCTA（ミルクティーは明色のため暗文字）
</Button>
```

### shadcn/ui コンポーネントの追加・更新（再生成方式）

[ADR-011](../../docs/decisions/frontend/ADR-011-shadcn-ui-maintenance-policy.md) の方針：**生成物は手編集せず再生成**する。手マージは行わない。

```bash
cd packages/ui
# 追加・更新（更新時は --overwrite）
pnpm dlx shadcn@latest add <component> --overwrite
# 再整形（class 並べ替え churn は追わない）
pnpm exec biome check --write src/components/ui
```

更新時の注意:

- **in-file 例外は再生成後に復元する**: `button.tsx`（モバイル touch-target・追加 size）/ `tabs.tsx`（active=ブランド色）/ `toggle.tsx`（active=ブランド色）。
  `git checkout -- <file>` で戻す。
- 新規追加時は `index.ts` の barrel export と Storybook ストーリー作成を推奨。
- ブランド色は原則 `globals.css` の semantic トークン（`--primary`=suzuka 等）で当てる。在file 直書きは最後の手段。

## ⚙️ 設定

### Biome.js

デザイントークン Storybook は lint 除外設定済み：

```json
{
  "overrides": [
    {
      "includes": ["**/src/components/design-tokens/*.stories.tsx"],
      "linter": { "enabled": false },
      "formatter": { "enabled": false }
    }
  ]
}
```

### TypeScript

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

## 🎯 メンテナンス方針

- **デザイントークン変更**: 対応する Storybook を必ず更新
- **新規コンポーネント**: Storybook ストーリー作成を推奨
- **ブランドカラー**: suzuka/minase colors の一貫性維持
- **Chromatic**: 視覚回帰を CI 導入済み（`chromatic.yml`）。ui 変更時のみ + TurboSnap(`--only-changed`) で無料枠を節約。PR では差分をレビュー（GH チェックはブロックしない段階的導入）、main push で新ベースラインを自動採用。ハード gate 化は将来 `exitZeroOnChanges` を外して切替可能

## 📚 関連ドキュメント

- **[プロジェクト概要](../../README.md)** - メインプロジェクト情報
- **[ドキュメントインデックス](../../docs/README.md)** - プロジェクトドキュメント
- **[開発ガイド](../../docs/guides/development.md)** - 設計原則・コーディング規約
- **[CLAUDE.md](../../CLAUDE.md)** - AI開発ガイドライン