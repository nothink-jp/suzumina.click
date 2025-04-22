# suzumina.click プロジェクト ドキュメント

このディレクトリには、涼花みなせさんの非公式ファンサイト運営用ウェブサイトプロジェクトに関するドキュメントが含まれます。

**主な機能:**

- **Discord ギルドメンバー限定認証:** 指定された Discord サーバーのメンバーのみがログインできる認証機能を提供します。詳細は `AUTH.md` を参照してください。
- **音声ボタンサービス (バックエンド):** 涼花みなせさんの YouTube 動画情報を定期的に GCP Cloud Functions で取得し、Firestore に保存します。将来的には、これらの情報をもとに音声ボタン機能などを提供する予定です。
  - **アーキテクチャと実装詳細:** `AUDIO_BUTTON_PLAN.md`
  - **データベーススキーマ:** `SCHEMA.md`

## プロジェクト構成

**2025年4月22日のモノレポ構成移行により、ディレクトリ構造が更新されています。**

```sh
.
├── .clinerules          # Cline (開発支援AI) 設定ファイル
├── .github/             # GitHub Actions ワークフロー定義
│   └── workflows/       # CI/CD ワークフローファイル
├── .gitignore           # Git 無視リスト
├── apps/                # アプリケーションコード (モノレポ)
│   └── web/             # Next.jsウェブアプリケーション
│       ├── Dockerfile   # Next.js アプリ用コンテナ定義
│       ├── next.config.ts # Next.js 設定ファイル
│       ├── package.json # アプリケーション依存関係
│       ├── postcss.config.mjs # PostCSS 設定
│       ├── tsconfig.json # TypeScript設定
│       ├── public/      # 静的ファイル
│       └── src/         # アプリケーションソース
├── packages/            # 共有パッケージ（将来的に使用予定）
├── functions/           # Firebase Cloud Functions（認証機能のみ）
├── terraform/           # Terraform インフラ定義
├── docs/                # プロジェクトドキュメント
├── scripts/             # 開発・デプロイスクリプト
├── biome.json           # Biome (フォーマッター/リンター) 設定
├── cloudbuild.yaml      # Google Cloud Build 設定
├── skaffold.yaml        # Skaffold 設定ファイル
├── package.json         # ルート依存関係とモノレポスクリプト
├── pnpm-workspace.yaml  # pnpm ワークスペース設定
├── tsconfig.json        # ルート TypeScript 設定
└── vitest.workspace.ts  # Vitest ワークスペース設定
```

## 主要コンポーネント

- **`apps/web/`**: Next.js ウェブアプリケーション
  - **`src/app/`**: App Router ディレクトリ（ページ、レイアウト）
  - **`src/components/`**: 共通コンポーネント
  - **`src/lib/`**: ユーティリティ・サービス連携

- **`functions/`**: Firebase Cloud Functions
  - **`discordAuthCallback`**: Discord認証コールバック処理（認証専用）
  - **`fetchYouTubeVideos`**: YouTube動画情報取得バッチ

- **`terraform/`**: インフラストラクチャ定義
  - **Cloud Run**: Next.jsアプリのホスティング
  - **Cloud Functions**: バックエンド処理
  - **Firebase Auth**: Discord OAuth認証（認証機能のみ）

## ドキュメント一覧

### 設計ドキュメント

- **[開発ポリシー](./POLICY.md)**: 開発規約、コミット規約、ブランチ戦略
- **[コンポーネント設計](./COMPONENT_DESIGN.md)**: RSC/RCCの使い分け、コンポーネント設計
- **[スタイリング](./STYLING.md)**: Tailwind CSS + daisyUIの使用方針
- **[認証設計](./AUTH.md)**: Discord OAuth認証の設計と実装

### 開発ドキュメント

- **[開発環境セットアップ](./DEVELOPMENT_SETUP.md)**: 開発環境の構築手順
- **[環境変数](./ENVIRONMENT_VARIABLES.md)**: 必要な環境変数の説明
- **[デプロイ手順マニュアル](./DEPLOYMENT.md)**: CI/CDとデプロイの詳細

### インフラストラクチャ

- **[インフラ監査](./INFRA_AUDIT.md)**: 現在のインフラ構成の詳細
- **[モノレポ移行](./MONOREPO_MIGRATION.md)**: モノレポ構成とCloud Run移行の詳細

### プロダクト設計

- **[音声ボタンサービス計画](./AUDIO_BUTTON_PLAN.md)**: 音声ボタン機能の設計
- **[データモデル](./SCHEMA.md)**: Firestoreデータモデル

### プロジェクト管理

- **[TODOリスト](./TODO.md)**: 今後のタスク一覧
- **[変更履歴](./CHANGELOG.md)**: リリース履歴と変更点

## インフラストラクチャの概要

**現在のインフラストラクチャ（2025年4月22日時点）:**

- **ホスティング**: Google Cloud Run (Next.js standalone)
- **ビルドパイプライン**: Cloud Build + GitHub Actions
- **認証**: Firebase Authentication (Discord OAuth)
- **バックエンド**: Cloud Functions
- **データベース**: Firestore

**詳細情報:**
- インフラ構成の詳細は [インフラ監査レポート](./INFRA_AUDIT.md) を参照
- デプロイ手順は [デプロイ手順マニュアル](./DEPLOYMENT.md) を参照

## 開発フロー

現在のプロジェクトは以下の開発フローで運用されています:

1. **ローカル開発**: モノレポ構成で `pnpm dev` を使用
2. **コードレビュー**: GitHub Pull Requestsでレビュー
3. **デプロイ**: GitHub Actionsを使用したステージング環境へのデプロイ

**注: 2025年4月の移行計画変更により、現在はステージング環境のみで開発を行っています。**

開発環境の詳細は [開発環境セットアップガイド](./DEVELOPMENT_SETUP.md) を参照してください。
