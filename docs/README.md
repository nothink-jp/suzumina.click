# suzumina.click プロジェクト ドキュメント

このディレクトリには、涼花みなせさんの非公式ファンサイト運営用ウェブサイトプロジェクトに関するドキュメントが含まれます。

**主な機能:**

*   Discord ギルドメンバー限定の認証機能。
*   **音声ボタンサービス:** 涼花みなせさんの YouTube 動画情報を定期的に取得し、将来的には動画の切り抜き音声を利用した音声ボタンを提供します (バックエンド機能実装済み)。

## ディレクトリ構成

```
.
├── .clinerules          # Cline (開発支援AI) 設定ファイル
├── .firebaserc          # Firebase プロジェクト設定 (ローカル)
├── .gitignore           # Git 無視リスト
├── biome.json           # Biome (フォーマッター/リンター) 設定
├── firebase.json        # Firebase デプロイ設定 (Hosting, Functions)
├── functions/           # Firebase Cloud Functions コード
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── lib/             # (ビルド後JS出力先)
│   └── src/
│       └── index.ts     # Functions エントリーポイント (discordAuthCallback, fetchYouTubeVideos)
├── next.config.ts       # Next.js 設定ファイル
├── package.json         # 依存関係とスクリプト (ルート)
├── pnpm-lock.yaml       # 依存関係ロックファイル
├── pnpm-workspace.yaml  # pnpm ワークスペース設定
├── postcss.config.mjs   # PostCSS 設定ファイル
├── public/              # 静的ファイル (現在は空)
├── README.md            # プロジェクトルートのREADME
├── src/                 # Next.js アプリケーションソースコード
│   ├── app/             # App Router コア
│   │   ├── favicon.ico
│   │   ├── globals.css  # グローバルCSS
│   │   ├── layout.tsx   # ルートレイアウト (RSC)
│   │   ├── page.tsx     # ルートページ (RSC)
│   │   ├── page.test.tsx # ルートページテスト
│   │   ├── _components/ # ルートページ固有コンポーネント
│   │   │   └── HeadlessUiDisclosureExample.tsx
│   │   │   └── HeadlessUiDisclosureExample.test.tsx
│   │   ├── auth/        # 認証関連ページ
│   │   │   └── discord/
│   │   │       └── callback/
│   │   │           ├── CallbackClient.tsx # 認証コールバック処理 (RCC)
│   │   │           └── page.tsx         # 認証コールバックページ (RSC + Suspense)
│   │   └── profile/     # プロフィールページ
│   │       ├── page.tsx
│   │       └── page.test.tsx
│   ├── components/      # 共通コンポーネント
│   │   ├── layout/      # レイアウト関連
│   │   │   ├── Footer.stories.tsx
│   │   │   ├── Footer.test.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.stories.tsx
│   │   │   ├── Header.test.tsx
│   │   │   └── Header.tsx
│   │   └── ui/          # UI 部品
│   │       └── AuthButton.tsx
│   └── lib/             # ライブラリ、ユーティリティ
│       ├── .gitkeep
│       └── firebase/    # Firebase 関連
│           ├── AuthProvider.tsx
│           └── client.ts
├── terraform/           # Terraform インフラ定義
│   ├── firebase.tf
│   ├── functions.tf
│   ├── iam.tf
│   ├── providers.tf
│   ├── pubsub.tf
│   ├── scheduler.tf
│   ├── secrets.tf
│   ├── storage.tf
│   ├── terraform.tfvars.example
│   └── variables.tf
├── tsconfig.json        # TypeScript 設定ファイル (ルート)
├── vitest.config.ts     # Vitest 設定ファイル
├── vitest.setup.ts      # Vitest セットアップファイル
├── vitest.shims.d.ts    # Vitest 型定義シム
└── vitest.workspace.ts  # Vitest ワークスペース設定 (あれば)
```

## 主要ディレクトリ/ファイル説明

- **`docs/`**: プロジェクト関連ドキュメント。
- **`functions/`**: Firebase Cloud Functions のソースコードと設定。Discord 認証コールバック (`discordAuthCallback`) や YouTube 動画情報取得バッチ (`fetchYouTubeVideos`) などを担当。
- **`public/`**: ビルド時にそのままコピーされる静的ファイル。現在は空。
- **`src/`**: Next.js アプリケーションのソースコード。
    - **`src/app/`**: Next.js App Router の規約に基づいたディレクトリ。
        - **`layout.tsx`**: ルートレイアウト。`AuthProvider` でラップ。
        - **`page.tsx`**: ホームページ。
        - **`auth/discord/callback/`**: Discord 認証後のコールバック処理ページ。
        - **`profile/`**: プロフィール表示ページ。
        - **`_components/`**: 各ページ/レイアウトに固有のコンポーネント。
    - **`src/components/`**: アプリケーション全体で再利用される共通コンポーネント。
        - **`layout/`**: ヘッダー、フッターなど。
        - **`ui/`**: ボタンなどの汎用 UI 部品 (`AuthButton` など)。
    - **`src/lib/`**: ユーティリティ関数や外部サービス連携コード。
        - **`firebase/`**: Firebase Client SDK の初期化 (`client.ts`) や認証プロバイダー (`AuthProvider.tsx`)。
- **`terraform/`**: Terraform を使用した GCP インフラストラクチャ定義。
- **`firebase.json`, `.firebaserc`**: Firebase デプロイ設定 (主に Hosting)。
- **`next.config.ts`**: Next.js 設定 (画像最適化ドメインなど)。
- **`biome.json`, `package.json`, `pnpm-*.yaml`, `postcss.config.mjs`, `tsconfig.json`**: プロジェクトのビルド、フォーマット、依存関係管理などの設定。
- **`vitest.*.ts`**: Vitest (テストフレームワーク) の設定ファイル。