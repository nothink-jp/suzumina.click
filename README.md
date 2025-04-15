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
- **バックエンド/認証:** [Firebase](https://firebase.google.com/) (Authentication, Cloud Functions, Hosting)
- **パッケージマネージャー:** [pnpm](https://pnpm.io/)
- **インフラストラクチャ:** [Terraform](https://www.terraform.io/)

## 🚀 はじめに

### 前提条件

- [Node.js](https://nodejs.org/) (LTS 推奨)
- [pnpm](https://pnpm.io/installation)

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

## ☁️ デプロイ

このプロジェクトはバックエンドサービスに Firebase を利用しており、Firebase Hosting にデプロイされています。Cloud Functions も利用しています。

Next.js アプリをデプロイする最も簡単な方法は、Next.js の作成者による [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) を使用することです。

詳細については、[Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) を確認してください。

## 🏗️ インフラストラクチャ (Terraform)

Firebase 環境 (Hosting, Functions, Secret Manager など) は Terraform を使用して管理されています。

### 前提条件

- [Terraform CLI](https://developer.hashicorp.com/terraform/install)
- [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install)
- Google Cloud への認証 (`gcloud auth application-default login` を実行)

### 環境構築手順

1.  **Terraform ディレクトリへ移動:**
    ```bash
    cd terraform
    ```
2.  **Secret Manager の値設定:**
    Terraform は Secret Manager のシークレット自体は作成・管理しますが、その**値**は管理しません。以下のシークレットに対応する値を Google Cloud Console または `gcloud` CLI を使用して設定してください。
    - `DISCORD_CLIENT_ID`
    - `DISCORD_CLIENT_SECRET`
    - `DISCORD_REDIRECT_URI`
    - `DISCORD_TARGET_GUILD_ID`

    `gcloud` CLI を使用する場合の例 (各 `<YOUR_...>` を実際の値に置き換えてください):
    ```bash
    echo -n "<YOUR_DISCORD_CLIENT_ID>" | gcloud secrets versions add DISCORD_CLIENT_ID --data-file=- --project=suzumina-click-firebase
    echo -n "<YOUR_DISCORD_CLIENT_SECRET>" | gcloud secrets versions add DISCORD_CLIENT_SECRET --data-file=- --project=suzumina-click-firebase
    echo -n "<YOUR_DISCORD_REDIRECT_URI>" | gcloud secrets versions add DISCORD_REDIRECT_URI --data-file=- --project=suzumina-click-firebase
    echo -n "<YOUR_DISCORD_TARGET_GUILD_ID>" | gcloud secrets versions add DISCORD_TARGET_GUILD_ID --data-file=- --project=suzumina-click-firebase
    ```
3.  **Terraform の初期化:**
    必要なプロバイダープラグインをダウンロードします。
    ```bash
    terraform init
    ```
4.  **Terraform の適用:**
    インフラストラクチャの変更を計画し、適用します。
    ```bash
    terraform apply
    ```
    (確認プロンプトが表示されたら `yes` を入力)

これで、Terraform によって Firebase 環境が構築・更新されます。

## 📚 ドキュメント

プロジェクトの詳細な設計やポリシーについては、`docs/` ディレクトリ内のドキュメントを参照してください。

- `docs/README.md`: ドキュメントの概要
- `docs/POLICY.md`: 開発ポリシー
- `docs/COMPONENT_DESIGN.md`: コンポーネント設計
- `docs/STYLING.md`: スタイリングガイドライン
- `docs/AUTH_DESIGN.md`: 認証設計
- `docs/ENVIRONMENT_VARIABLES.md`: 環境変数について
- `docs/TODO.md`: TODO リスト
