# suzumina.click

[suzumina.click](https://suzumina.click)のウェブサイトソースコード

## 開発環境

### 必要条件

- Node.js >= 22
- [bun](https://bun.sh) >= 1.2.8

### 使用技術

- [Next.js](https://nextjs.org/) 15.2.4
- [React](https://react.dev/) 19.1.0
- [TypeScript](https://www.typescriptlang.org/) 5.8.2
- [Turbo](https://turbo.build/) 2.4.4
- [Biome](https://biomejs.dev/) 1.9.4

## プロジェクト構成

このプロジェクトは[Turborepo](https://turbo.build/repo)を使用したモノレポ構成です。

### 主要ディレクトリ

- `apps/web`: メインの[Next.js](https://nextjs.org/)アプリケーション
- `docs`: プロジェクト関連ドキュメント (設計、TODOリストなど)
- `iac`: Infrastructure as Code (Terraform) ファイル
- `packages`: 共有パッケージ (現在は空、将来的に `typescript-config` などを配置予定)

各パッケージ/アプリケーションは100% [TypeScript](https://www.typescriptlang.org/)で記述されています。

### 開発ツール

- [Biome](https://biomejs.dev/): リンターとフォーマッター
- [CSpell](https://cspell.org/): スペルチェッカー
- [Turbo](https://turbo.build/): ビルドシステム

## 開発手順

### インストール

```bash
bun install
```

### 開発サーバーの起動

```bash
bun run dev
```

### ビルド

```bash
bun run build
```

### 型チェック

```bash
bun run check-types
```

### リントとフォーマット

```bash
# リントチェック
bun run check

# フォーマットチェック
bun run format

# リントとフォーマットの自動修正
bun run ci:fix
```

### スペルチェック

```bash
bun run spell-check
```

## デプロイ手順 (概要)

通常、デプロイはGitHub ActionsによるCI/CDパイプラインで自動化されます。以下は手動でのデプロイ手順の概要です。

### 前提条件

- Google Cloud SDK (`gcloud`) がインストール・設定済みであること。
- GCPプロジェクトへの適切な権限があること。
- Artifact Registryリポジトリが作成済みであること (`iac/` で管理)。
- Cloud Runサービスが作成済みであること (`iac/` で管理)。

### 手順

1. **Dockerイメージのビルド:**

    ```bash
    # プロジェクトルートから実行
    docker build -t asia-northeast1-docker.pkg.dev/suzumina-click-dev/suzumina-click-dev-docker-repo/web:latest -f apps/web/Dockerfile .
    ```

    - `suzumina-click-dev`: GCPプロジェクトID
    - `suzumina-click-dev-docker-repo`: Artifact Registryリポジトリ名
    - `web`: イメージ名 (任意)
    - `latest`: タグ (任意、コミットハッシュなどが推奨)

2. **Artifact Registryへのプッシュ:**

    ```bash
    # gcloud 認証ヘルパーの設定 (初回のみ)
    gcloud auth configure-docker asia-northeast1-docker.pkg.dev

    # イメージのプッシュ
    docker push asia-northeast1-docker.pkg.dev/suzumina-click-dev/suzumina-click-dev-docker-repo/web:latest
    ```

3. **Cloud Runへのデプロイ:**

    ```bash
    gcloud run deploy web \
      --image asia-northeast1-docker.pkg.dev/suzumina-click-dev/suzumina-click-dev-docker-repo/web:latest \
      --region asia-northeast1 \
      --project suzumina-click-dev \
      --platform managed \
      --allow-unauthenticated # 必要に応じて変更
    ```

    - `web`: Cloud Runサービス名

**注意:** 上記は基本的な手順です。実際のCI/CDパイプラインでは、サービスアカウント認証 (Workload Identity Federation)、環境変数の設定、シークレットの参照などが追加されます。詳細は `docs/gcp/GCP_CICD.md` (作成予定) を参照してください。

## CI/CD

以下のチェックが自動実行されます：

1. コードの型チェック
2. リントチェック
3. フォーマットチェック
4. Markdownリントチェック
5. スペルチェック

## リモートキャッシュ

Turborepoの[リモートキャッシュ](https://turbo.build/repo/docs/core-concepts/remote-caching)機能を使用して、チーム間でのビルドキャッシュの共有が可能です。

### キャッシュの設定

```bash
# Vercelへのログイン
bunx turbo login

# リモートキャッシュの設定
bunx turbo link
```

## 参考リンク

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
