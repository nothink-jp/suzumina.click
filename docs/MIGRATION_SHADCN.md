# shadcn/uiへの移行計画

## 概要

現在のカスタムUIコンポーネントライブラリから[shadcn/ui](https://ui.shadcn.com/)への移行計画です。

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
   - Tailwind CSSによる柔軟なスタイリング
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

1. 必要なパッケージのインストール
   ```bash
   bun add -D tailwindcss postcss autoprefixer
   bun add -D @types/node
   bun add class-variance-authority clsx tailwind-merge
   bun add @radix-ui/react-slot
   ```

2. Tailwind CSSの設定
   ```bash
   bunx tailwindcss init -p
   ```

3. tailwind.config.jsの設定
   ```javascript
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     darkMode: ["class"],
     content: [
       "./pages/**/*.{ts,tsx}",
       "./components/**/*.{ts,tsx}",
       "./app/**/*.{ts,tsx}",
       "./src/**/*.{ts,tsx}",
     ],
     prefix: "",
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
   }
   ```

4. globals.cssの更新
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
       --background: 222.2 84% 4.9%;
       --foreground: 210 40% 98%;
       --card: 222.2 84% 4.9%;
       --card-foreground: 210 40% 98%;
       --popover: 222.2 84% 4.9%;
       --popover-foreground: 210 40% 98%;
       --primary: 210 40% 98%;
       --primary-foreground: 222.2 47.4% 11.2%;
       --secondary: 217.2 32.6% 17.5%;
       --secondary-foreground: 210 40% 98%;
       --muted: 217.2 32.6% 17.5%;
       --muted-foreground: 215 20.2% 65.1%;
       --accent: 217.2 32.6% 17.5%;
       --accent-foreground: 210 40% 98%;
       --destructive: 0 62.8% 30.6%;
       --destructive-foreground: 210 40% 98%;
       --border: 217.2 32.6% 17.5%;
       --input: 217.2 32.6% 17.5%;
       --ring: 212.7 26.8% 83.9%;
     }
   }
 
   @layer base {
     * {
       @apply border-border;
     }
     body {
       @apply bg-background text-foreground;
     }
   }
   ```

### フェーズ2: コンポーネントの移行（予想時間: 4時間）

1. **Button**の移行
   - shadcn/uiのButtonコンポーネントをインストール
   - カスタムプロパティの統合
   - アプリケーション名に基づくアラート機能の移植

2. **Card**の移行
   - shadcn/uiのCardコンポーネントをインストール
   - UTMパラメータ機能の統合
   - スタイリングの調整

3. **Code**の移行
   - 新しいCodeブロックコンポーネントの作成
   - シンタックスハイライト機能の追加検討

### フェーズ3: アプリケーションの更新（予想時間: 4時間）

1. 既存のインポートパスの更新
2. コンポーネントのプロパティ更新
3. スタイリングの調整

### フェーズ4: テストと検証（予想時間: 2時間）

1. ビジュアルレグレッションテスト
2. アクセシビリティテスト
3. レスポンシブデザインの確認

## リスク管理

1. **互換性の問題**
   - 既存のスタイリングシステムとの競合
   - propsの型の違いによるエラー

2. **パフォーマンスへの影響**
   - Tailwind CSSの追加によるバンドルサイズの増加
   - 初期ロード時間への影響

3. **学習曲線**
   - チームメンバーのTailwind CSS習得
   - shadcn/uiの使用方法の理解

## ロールバック計画

1. 既存のUIコンポーネントのバックアップ
2. 段階的な移行によるリスク軽減
3. 問題発生時の切り戻し手順の整備

## 成功基準

1. 全てのコンポーネントが正常に動作すること
2. アクセシビリティスコアの向上
3. デザインの一貫性確保
4. パフォーマンス指標の維持

## タイムライン

- フェーズ1: 2時間
- フェーズ2: 4時間
- フェーズ3: 4時間
- フェーズ4: 2時間

合計予想時間: 12時間

## 次のステップ

1. チームでの計画レビュー
2. 環境セットアップの開始
3. プロトタイプコンポーネントの作成
4. テスト戦略の詳細化