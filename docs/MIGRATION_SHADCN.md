# shadcn/uiへの移行計画

## 概要

現在のカスタムUIコンポーネントライブラリから[shadcn/ui](https://ui.shadcn.com/)への移行計画です。ここでは、最新のTailwind CSS 4に対応した環境セットアップと移行手順を示します。

## 現状分析

### 既存のUIコンポーネント

1. **Button**
   - クライアントサイドのインタラクティブコンポーネント
   - カスタムクラス対応
   - アプリケーション名を使用したアラート機能

2. **Card**
   - リンクカードコンポーネント
   - UTMパラメータ付きリンク
   - タイトルと説明テキスト

3. **Code**
   - シンプルなコードブロック表示
   - カスタムクラス対応

### 現在の課題

1. デザインシステムの一貫性が限定的
2. アクセシビリティ対応が不十分
3. 再利用可能なコンポーネントの不足

## shadcn/uiの利点

1. **堅牢な基盤**
   - Radix UIベースの優れたアクセシビリティ
   - Tailwind CSS 4による柔軟なスタイリング
   - TypeScript完全対応

2. **豊富なコンポーネント**
   - 基本的なUIコンポーネント
   - フォーム要素
   - ダイアログ、ポップオーバー等の高度なコンポーネント

3. **カスタマイズ性**
   - コンポーネントのソースコードを直接制御可能
   - プロジェクト固有のニーズに合わせた調整が容易

## 移行手順

### フェーズ1: 環境整備（予想時間: 2時間）

1. **必要なパッケージのインストール**

   最新のTailwind CSS 4および関連パッケージをインストールします。
   ```bash
   bun add -D tailwindcss@latest postcss autoprefixer
   bun add -D @types/node
   bun add class-variance-authority clsx tailwind-merge
   bun add @radix-ui/react-slot
   ```

2. **Tailwind CSSの設定**

   Tailwind CSS 4用の初期設定を作成します。
   ```bash
   bunx tailwindcss init -p
   ```

3. **tailwind.config.jsの設定**

   以下は最新のTailwind CSS 4に合わせた設定例です：
   ```javascript
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     darkMode: ["class"],
     content: [
       "./pages/**/*.{ts,tsx,js,jsx}",
       "./components/**/*.{ts,tsx,js,jsx}",
       "./app/**/*.{ts,tsx,js,jsx}",
       "./src/**/*.{ts,tsx,js,jsx}",
     ],
     theme: {
       container: {
         center: true,
         padding: "2rem",
         screens: {
           "2xl": "1400px",
         },
       },
       extend: {
         colors: {
           border: "hsl(var(--border))",
           input: "hsl(var(--input))",
           ring: "hsl(var(--ring))",
           background: "hsl(var(--background))",
           foreground: "hsl(var(--foreground))",
           primary: {
             DEFAULT: "hsl(var(--primary))",
             foreground: "hsl(var(--primary-foreground))",
           },
           secondary: {
             DEFAULT: "hsl(var(--secondary))",
             foreground: "hsl(var(--secondary-foreground))",
           },
           destructive: {
             DEFAULT: "hsl(var(--destructive))",
             foreground: "hsl(var(--destructive-foreground))",
           },
           muted: {
             DEFAULT: "hsl(var(--muted))",
             foreground: "hsl(var(--muted-foreground))",
           },
           accent: {
             DEFAULT: "hsl(var(--accent))",
             foreground: "hsl(var(--accent-foreground))",
           },
           popover: {
             DEFAULT: "hsl(var(--popover))",
             foreground: "hsl(var(--popover-foreground))",
           },
           card: {
             DEFAULT: "hsl(var(--card))",
             foreground: "hsl(var(--card-foreground))",
           },
         },
         borderRadius: {
           lg: "var(--radius)",
           md: "calc(var(--radius) - 2px)",
           sm: "calc(var(--radius) - 4px)",
         },
       },
     },
     plugins: [],
   }
   ```

4. **globals.cssの更新**

   最新のTailwind CSS 4を使用するため、グローバルスタイルも更新します。
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
    
   @layer base {
     :root {
       --background: 0 0% 100%;
       --foreground: 222.2 84% 4.9%;
       --card: 0 0% 100%;
       --card-foreground: 222.2 84% 4.9%;
       --popover: 0 0% 100%;
       --popover-foreground: 222.2 84% 4.9%;
       --primary: 222.2 47.4% 11.2%;
       --primary-foreground: 210 40% 98%;
       --secondary: 210 40% 96.1%;
       --secondary-foreground: 222.2 47.4% 11.2%;
       --muted: 210 40% 96.1%;
       --muted-foreground: 215.4 16.3% 46.9%;
       --accent: 210 40% 96.1%;
       --accent-foreground: 222.2 47.4% 11.2%;
       --destructive: 0 84.2% 60.2%;
       --destructive-foreground: 210 40% 98%;
       --border: 214.3 31.8% 91.4%;
       --input: 214.3 31.8% 91.4%;
       --ring: 222.2 84% 4.9%;
       --radius: 0.5rem;
     }
    
     .dark {
       /* ダークモード用変数の更新が必要な場合はここに記述 */
     }
   }
   ```

### フェーズ2: コンポーネントの移行（予想時間: 4時間）

1. **Buttonの移行**
   - shadcn/uiのButtonコンポーネントに置き換え、必要なカスタム機能（アラート機能など）を統合

2. **Cardの移行**
   - shadcn/uiのCardコンポーネントに合わせてUTMパラメータ付きリンクの実装を更新

3. **Codeの移行**
   - shadcn/uiのデザインパターンに沿ったCodeコンポーネントを再実装

### フェーズ3: アプリケーションの更新（予想時間: 4時間）

1. 既存のインポートパスを一括でshadcn/uiへ変更
2. プロパティやクラス名の調整
3. テーマやスタイリングの細部調整

### フェーズ4: テストと検証（予想時間: 2時間）

1. ビジュアルレグレッションテストの実施
2. アクセシビリティの再確認
3. レスポンシブデザインのチェック

## リスク管理

1. **互換性の問題**
   - 既存のスタイリングとの競合
   - 型定義の不整合によるエラー

2. **パフォーマンスへの影響**
   - Tailwind CSS 4導入に伴うバンドルサイズの変化
   - 初期ロードタイムへの影響

3. **学習曲線**
   - チームのTailwind CSS 4への習熟
   - shadcn/uiの新しいコンポーネント使用法の理解

## ロールバック計画

1. 既存UIコンポーネントのバックアップ保持
2. 移行を段階的に実施し、各フェーズで動作確認を実施
3. 問題発生時は、直前のバージョンに迅速に戻す手順を明確化

## 成功基準

1. 全コンポーネントの正常動作と一貫性のあるデザイン
2. アクセシビリティスコアの維持または向上
3. パフォーマンスへの影響が最小限であること

## タイムライン

- フェーズ1: 2時間
- フェーズ2: 4時間
- フェーズ3: 4時間
- フェーズ4: 2時間

合計予想時間: 12時間

## 次のステップ

1. チーム内での計画レビュー
2. 環境セットアップとプロトタイプ作成の開始
3. 詳細なテスト戦略の策定