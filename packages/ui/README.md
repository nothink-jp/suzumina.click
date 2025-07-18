# @suzumina.click/ui v0.3.4

涼花みなせファンサイト用 UI コンポーネントライブラリ（Storybook統合・包括的テストスイート実装完了）

## 🎯 概要

本パッケージは、suzumina.click プロジェクト専用のUIコンポーネントライブラリです。shadcn/ui ベースのデザインシステムと、涼花みなせブランドに特化したデザイントークンを提供します。

## 📦 パッケージ構成

```text
packages/ui/src/components/
├── ui/           # shadcn/ui コンポーネント (51個)
├── custom/       # プロジェクト独自コンポーネント
└── design-tokens/ # デザイントークン Storybook
```

## 🎨 デザイントークン

### ブランドカラーパレット

#### suzuka colors (メインテーマ)
```css
/* 涼花みなせメインピンク - 10段階 */
--suzuka-50: #fff5fa;
--suzuka-100: #ffe0ed;
--suzuka-200: #ffc2d9;
--suzuka-300: #ff9ebf;
--suzuka-400: #ff6b9d;
--suzuka-500: #ff4785;  /* ブランドメイン */
--suzuka-600: #e0266e;
--suzuka-700: #b81d5b;
--suzuka-800: #8f1447;
--suzuka-900: #660d33;
--suzuka-950: #3d0820;
```

#### minase colors (サブテーマ)
```css
/* 涼花みなせオレンジ - 10段階 */
--minase-50: #fff8f3;
--minase-100: #ffedd5;
--minase-200: #fed7aa;
--minase-300: #fdba74;
--minase-400: #fb923c;
--minase-500: #ff7e2d;  /* ブランドサブ */
--minase-600: #ea5a0b;
--minase-700: #c2410c;
--minase-800: #9a3412;
--minase-900: #7c2d12;
--minase-950: #431407;
```

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

# テスト (Vitest)
pnpm test
pnpm test:coverage

# 型チェック
pnpm typecheck
```

## 📋 コンポーネント一覧

### shadcn/ui (51個)

基盤UIコンポーネント - プロジェクト間で完全再利用可能

```typescript
import { Button, Card, Input, Dialog } from "@suzumina.click/ui/components/ui";
```

### Custom Components

プロジェクト特化コンポーネント - suzumina.click 専用機能

```typescript
import { AudioButton, ListHeader, SearchFilterPanel } from "@suzumina.click/ui/components/custom";
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

<Button className="bg-minase-500 hover:bg-minase-600">
  セカンダリCTA
</Button>
```

### 新規 shadcn/ui コンポーネント追加

```bash
# UI Package で実行
cd packages/ui
pnpm dlx shadcn@latest add <component>

# 自動的に components/ui/ に配置
# Storybook ストーリーを作成（推奨）
```

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
- **Chromatic**: 視覚的回帰テスト対象（段階的導入）

## 📚 関連ドキュメント

- **[プロジェクト概要](../../README.md)** - メインプロジェクト情報
- **[詳細仕様](../../docs/README.md)** - 包括的プロジェクトドキュメント
- **[開発ガイド](../../docs/DEVELOPMENT.md)** - 設計原則・コーディング規約
- **[クイックリファレンス](../../docs/QUICK_REFERENCE.md)** - よく使うコマンド・即座参照
- **[CLAUDE.md](../../CLAUDE.md)** - リポジトリ指示・開発状況