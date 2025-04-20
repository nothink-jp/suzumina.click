# suzumina.click プロジェクト ドキュメント

このディレクトリには、涼花みなせさんの非公式ファンサイト運営用ウェブサイトプロジェクトに関するドキュメントが含まれます。

**主な機能:**

- **Discord ギルドメンバー限定認証:** 指定された Discord サーバーのメンバーのみがログインできる認証機能を提供します。詳細は `docs/AUTH_DESIGN.md` を参照してください。
- **音声ボタンサービス (バックエンド):** 涼花みなせさんの YouTube 動画情報を定期的に GCP Cloud Functions で取得し、Firestore に保存します。将来的には、これらの情報をもとに音声ボタン機能などを提供する予定です。
  - **アーキテクチャと実装詳細:** `docs/AUDIO_BUTTON_PLAN.md`
  - **データベーススキーマ:** `docs/SCHEMA.md`

## ディレクトリ構成

```sh
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
│   └── src/             # Functions ソースコード
│       ├── common.test.ts
│       ├── common.ts
│       ├── discordAuth.test.ts
│       ├── discordAuth.ts
│       ├── firebaseAdmin.test.ts
│       ├── firebaseAdmin.ts
│       ├── index.ts     # Functions エントリーポイント (discordAuthCallback, fetchYouTubeVideos)
│       ├── youtube.test.ts
│       └── youtube.ts
├── next.config.ts       # Next.js 設定ファイル
├── package.json         # 依存関係とスクリプト (ルート)
├── pnpm-lock.yaml       # 依存関係ロックファイル
├── pnpm-workspace.yaml  # pnpm ワークスペース設定
├── postcss.config.mjs   # PostCSS 設定ファイル
├── public/              # 静的ファイル (favicon など)
│   └── favicon.ico
├── README.md            # プロジェクトルートのREADME
├── src/                 # Next.js アプリケーションソースコード
│   ├── app/             # App Router コア
│   │   ├── favicon.ico  # (public/ に移動推奨)
│   │   ├── globals.css  # グローバルCSS
│   │   ├── layout.test.tsx
│   │   ├── layout.tsx   # ルートレイアウト (RSC)
│   │   ├── page.test.tsx
│   │   ├── page.tsx     # ルートページ (RSC)
│   │   ├── _components/ # ルートページ/レイアウト固有コンポーネント
│   │   │   ├── HeadlessUiDisclosureExample.test.tsx
│   │   │   └── HeadlessUiDisclosureExample.tsx
│   │   ├── auth/        # 認証関連ページ
│   │   │   └── discord/
│   │   │       └── callback/
│   │   │           ├── CallbackClient.test.tsx
│   │   │           ├── CallbackClient.tsx # 認証コールバック処理 (RCC)
│   │   │           ├── page.test.tsx
│   │   │           └── page.tsx         # 認証コールバックページ (RSC + Suspense)
│   │   └── profile/     # プロフィールページ
│   │       ├── page.test.tsx
│   │       └── page.tsx
│   ├── components/      # 共通コンポーネント
│   │   ├── layout/      # レイアウト関連
│   │   │   ├── Footer.stories.tsx
│   │   │   ├── Footer.test.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.stories.tsx
│   │   │   ├── Header.test.tsx
│   │   │   └── Header.tsx
│   │   └── ui/          # UI 部品
│   │       ├── AuthButton.stories.tsx
│   │       ├── AuthButton.test.tsx
│   │       └── AuthButton.tsx
│   └── lib/             # ライブラリ、ユーティリティ
│       └── firebase/    # Firebase 関連
│           ├── AuthProvider.test.tsx
│           ├── AuthProvider.tsx
│           ├── client.test.ts
│           └── client.ts
├── terraform/           # Terraform インフラ定義
│   ├── .terraform.lock.hcl
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

- **`docs/`**: プロジェクト関連ドキュメント。設計方針、API仕様、環境変数設定などが含まれます。
- **`functions/`**: Firebase Cloud Functions のソースコードと設定。Discord 認証コールバック (`discordAuthCallback`) や YouTube 動画情報取得バッチ (`fetchYouTubeVideos`) などを担当。
- **`public/`**: ビルド時にそのままコピーされる静的ファイル (例: `favicon.ico`)。
- **`src/`**: Next.js アプリケーションのソースコード。
  - **`src/app/`**: Next.js App Router の規約に基づいたディレクトリ。各ルート (ページ) やレイアウトを定義します。
    - **`layout.tsx`**: アプリケーション全体の基本レイアウト。`AuthProvider` など、共通のコンテキストを提供します。
    - **`page.tsx`**: ホームページ (`/`) のコンテンツ。
    - **`auth/discord/callback/`**: Discord 認証後のリダイレクト先ページ。認証コードを処理し、ログインを実行します。
    - **`profile/`**: ログインユーザーのプロフィール表示ページ。
    - **`_components/`**: 特定のページやレイアウトに固有のコンポーネントを配置するディレクトリ (例: `src/app/_components/`)。
  - **`src/components/`**: アプリケーション全体で再利用される共通コンポーネント。
    - **`layout/`**: ヘッダー (`Header.tsx`)、フッター (`Footer.tsx`) など、レイアウトを構成するコンポーネント。
    - **`ui/`**: ボタン (`AuthButton.tsx`)、カード、入力フォームなど、汎用的な UI 部品。
  - **`src/lib/`**: ユーティリティ関数、外部サービス連携コード、カスタムフックなど。
    - **`firebase/`**: Firebase Client SDK の初期化 (`client.ts`) や認証状態を管理するコンテキストプロバイダー (`AuthProvider.tsx`)。
- **`terraform/`**: Terraform を使用した GCP インフラストラクチャ (Firestore, Cloud Functions, Pub/Sub, Scheduler, Secret Manager など) の定義ファイル。
- **`firebase.json`, `.firebaserc`**: Firebase CLI の設定ファイル。主に Hosting と Functions のデプロイ設定。
- **`next.config.ts`**: Next.js の設定ファイル (ビルドオプション、環境変数、リダイレクトなど)。
- **`biome.json`, `package.json`, `pnpm-*.yaml`, `postcss.config.mjs`, `tsconfig.json`**: プロジェクトのビルド、フォーマット、依存関係管理、TypeScript コンパイルなどの設定ファイル。
- **`vitest.*.ts`**: Vitest (テストフレームワーク) の設定ファイル。

## 関連ドキュメント

- **設計・開発ポリシー:** `docs/POLICY.md`
- **コンポーネント設計:** `docs/COMPONENT_DESIGN.md`
- **スタイリング:** `docs/STYLING.md`
- **認証設計:** `docs/AUTH_DESIGN.md`
- **環境変数:** `docs/ENVIRONMENT_VARIABLES.md`
- **音声ボタンサービス計画:** `docs/AUDIO_BUTTON_PLAN.md`
- **データベーススキーマ:** `docs/SCHEMA.md`
- **タスクリスト:** `docs/TODO.md`
- **変更履歴:** `docs/CHANGELOG.md`
