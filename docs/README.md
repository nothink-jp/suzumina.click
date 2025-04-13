# suzumina.click プロジェクト ドキュメント

このディレクトリには、涼花みなせさんの非公式ファンサイト運営用ウェブサイトプロジェクトに関するドキュメントが含まれます。

## ディレクトリ構成

```
.
├── .clinerules          # Cline (開発支援AI) 設定ファイル
├── .gitignore           # Git 無視リスト
├── docs/                # プロジェクトドキュメント
│   ├── COMPONENT_DESIGN.md # コンポーネント設計ガイドライン
│   ├── INFO.md          # プロジェクト関連情報（連絡先など）
│   ├── PLAN.md          # 設計ドキュメント作成計画（一時ファイル）
│   ├── POLICY.md        # 設計・開発ポリシー
│   ├── README.md        # このファイル (ドキュメントの目次、ディレクトリ構成)
│   ├── STYLING.md       # スタイリングガイドライン
│   └── TODO.md          # プロジェクトのTODOリスト
├── next.config.ts       # Next.js 設定ファイル
├── package.json         # 依存関係とスクリプト
├── pnpm-lock.yaml       # 依存関係ロックファイル
├── postcss.config.mjs   # PostCSS 設定ファイル
├── public/              # 静的ファイル (画像など)
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md            # プロジェクトルートのREADME
├── src/                 # ソースコードルート
│   ├── app/             # Next.js App Router コア
│   │   ├── favicon.ico
│   │   ├── globals.css  # グローバルCSS
│   │   ├── layout.tsx   # ルートレイアウト (RSC)
│   │   └── page.tsx     # ルートページ (RSC)
│   └── (その他: lib/, components/ など、必要に応じて作成)
└── tsconfig.json        # TypeScript 設定ファイル
```

## 主要ディレクトリ/ファイル説明

- **`docs/`**: プロジェクト関連ドキュメント。各ファイルの内容は上記の構成図を参照。
- **`public/`**: ビルド時にそのままコピーされる静的ファイル。画像、フォントなどが配置されます。
- **`src/`**: アプリケーションのソースコード。
    - **`src/app/`**: Next.js App Router の規約に基づいたディレクトリ。ルーティング、レイアウト、ページのコア部分。
        - **`layout.tsx`**: 必須。ルートレイアウト。サーバーコンポーネント(RSC)とします。HTMLの `<html>` や `<body>` タグを含みます。
        - **`page.tsx`**: 必須。ルート (`/`) のページ。サーバーコンポーネント(RSC)とします。
        - **`globals.css`**: アプリケーション全体に適用されるグローバルスタイル。TailwindCSS の `@tailwind` ディレクティブや、最小限のカスタムグローバルスタイルを記述します。
        - **`(page)/_components/`**: 各ページ (例: `src/app/about/page.tsx`) に密接に関連するコンポーネントは、そのページのディレクトリ (例: `src/app/about/`) 配下に `_components` ディレクトリを作成し、そこに配置します（コロケーション）。
- **`next.config.ts`**: Next.js のビルド時や実行時の挙動を設定します。
- **`postcss.config.mjs`**: PostCSS の設定。TailwindCSS は PostCSS プラグインとして動作するため、このファイルが必要です。
- **`package.json`**: プロジェクトの依存関係 (ライブラリ) や、`dev`, `build`, `start` などのスクリプトを定義します。
- **`pnpm-lock.yaml`**: pnpm によって管理される正確な依存関係のバージョンを記録します。
- **`tsconfig.json`**: TypeScript コンパイラの設定を行います。
- **`.clinerules`**: このプロジェクトで使用する開発支援AI (Cline) のカスタムルール。
- **`.gitignore`**: Git のバージョン管理から除外するファイルやディレクトリを指定します。