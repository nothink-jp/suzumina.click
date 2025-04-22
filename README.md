# suzumina.click

Next.js で構築された Web アプリケーションプロジェクトです。

## ✨ 技術スタック

- **フレームワーク:** [Next.js](https://nextjs.org/) (v15) - App Router & Turbopack
- **言語:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [React](https://react.dev/) (v19)
- **スタイリング:** [Tailwind CSS](https://tailwindcss.com/) (v4) + [daisyUI](https://daisyui.com/)
- **Lint/Format:** [Biome](https://biomejs.dev/)
- **テスト:** [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)
- **コンポーネントライブラリ/ドキュメント:** [Storybook](https://storybook.js.org/)
- **バックエンド/認証:** [Firebase](https://firebase.google.com/) (認証のみ)
- **ホスティング:** [Google Cloud Run](https://cloud.google.com/run)
- **パッケージマネージャー:** [pnpm](https://pnpm.io/)
- **インフラストラクチャ:** [Terraform](https://www.terraform.io/)

## 🚀 はじめに

### 前提条件

- [Node.js](https://nodejs.org/) (LTS 推奨)
- [pnpm](https://pnpm.io/installation)
- [Docker](https://www.docker.com/) (コンテナテスト用)

### インストール

1.  リポジトリをクローンします:
    ```bash
    git clone <repository-url>
    cd suzumina.click
    ```
2.  依存関係をインストールします:
    ```bash
    pnpm install
    ```

### 開発サーバーの起動

Turbopack を使用して開発サーバーを起動します:

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと、結果が表示されます。

## 🛠️ 利用可能なスクリプト

- `pnpm dev`: Turbopack を使用して開発サーバーを起動します。
- `pnpm build`: プロダクション用にアプリケーションをビルドします。
- `pnpm start`: プロダクションサーバーを起動します。
- `pnpm lint`: Biome を使用してコードベースをリントします。
- `pnpm format`: Biome を使用してコードベースをフォーマットします。
- `pnpm check`: Biome のリントとフォーマットチェックを実行します。
- `pnpm test`: Vitest を使用してテストを実行します。
- `pnpm test:watch`: ウォッチモードでテストを実行します。
- `pnpm storybook`: Storybook 開発サーバーを起動します。
- `pnpm build-storybook`: デプロイ用に Storybook をビルドします。

## ✨ 主な機能

- **Discord 認証:** 特定の Discord ギルドメンバーのみがログインできる認証機能。
- **プロフィール表示:** ログインユーザーのプロフィール情報を表示するページ。
- **基本的なレイアウト:** ヘッダーとフッターを含む基本的なページレイアウト。

## ☁️ デプロイとインフラストラクチャ

このプロジェクトは Google Cloud Run 上にホスティングされており、Firebase Authentication を認証サービスとして利用しています。

デプロイ方法と設定の詳細については、以下のドキュメントを参照してください：

- [デプロイ手順マニュアル](./docs/DEPLOYMENT.md) - GitHub Actionsによるデプロイ方法やステージング環境の構成
- [インフラ構成監査レポート](./docs/INFRA_AUDIT.md) - 現在のインフラ構成の詳細な解説

### インフラストラクチャの概要

- **ホスティング**: Google Cloud Run (コンテナベース)
- **ビルドパイプライン**: Google Cloud Build + GitHub Actions
- **認証サービス**: Firebase Authentication (Discord OAuth)
- **データベース**: Firestore
- **バックエンド処理**: Cloud Functions

## 📚 ドキュメント

プロジェクトの詳細な設計やポリシーについては、`docs/` ディレクトリ内のドキュメントを参照してください。

- [ドキュメント概要](./docs/README.md): プロジェクト構造とドキュメント一覧
- [開発ポリシー](./docs/POLICY.md): 開発に関する方針と規約
- [コンポーネント設計](./docs/COMPONENT_DESIGN.md): React/Next.jsコンポーネントの設計指針
- [スタイリングガイドライン](./docs/STYLING.md): TailwindとdaisyUIの使用方針
- [認証設計](./docs/AUTH.md): Discord OAuthを使用した認証の実装
- [環境変数](./docs/ENVIRONMENT_VARIABLES.md): 必要な環境変数の説明
- [開発環境セットアップ](./docs/DEVELOPMENT_SETUP.md): 開発環境の構築手順
- [モノレポ移行](./docs/MONOREPO_MIGRATION.md): モノレポ構成への移行詳細
- [TODOリスト](./docs/TODO.md): 今後の開発タスク
