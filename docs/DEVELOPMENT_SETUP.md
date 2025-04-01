# 開発環境セットアップ計画

## 1. 前提条件

### 必要なツール

- Node.js v22
- Bun
- Docker Desktop
- Google Cloud SDK
- Git

### GCPプロジェクト設定

- プロジェクトID: `suzumina-click-dev`
- リージョン: `asia-northeast1`
- 必要なAPIの有効化（GCP Console上で実施）

## 2. 開発環境セットアップ進捗状況

### ✅ 2.1 基本環境のセットアップ（完了）

```bash
# 1. 依存関係のインストール
bun install

# 2. Biomeの設定確認
bun run lint
```

- [x] Turborepo構成の確立
- [x] TypeScript設定の共通化（packages/typescript-config）
- [x] Biome、markdownlint、cspellなどの開発ツールセットアップ
- [x] 基本的なスクリプト（build、dev、lint等）の設定

### ✅ 2.2 Web アプリケーション (apps/web)（完了）

- [x] Next.js + Reactの最新バージョンセットアップ
- [x] TypeScript設定の適用
- [x] Dockerfile作成
- [x] Cloud Run用のデプロイ設定
- [x] ローカル開発環境の動作確認
  - `bun run dev` (localhost:3000)で開発サーバー動作確認済み
  - `docker build`と`docker run`で本番環境（localhost:8080）動作確認済み
- [ ] 基本的なページレイアウトの実装

### ❌ 2.3 APIエンドポイント (apps/functions)（未着手）

1. TypeScript環境のセットアップ
2. ローカル開発サーバーの設定
3. サンプルAPIの実装

### ❌ 2.4 バッチ処理 (apps/jobs)（未着手）

1. TypeScript環境のセットアップ
2. Dockerfileの作成
3. サンプルジョブの実装

## 3. 開発フロー

### 3.1 ローカル開発

```bash
# Webアプリケーション開発
cd apps/web
bun run dev

# API開発
cd apps/functions
bun run dev

# バッチジョブ開発
cd apps/jobs
bun run dev:job-name
```

### 3.2 テスト

各プロジェクトでユニットテストを実行：

```bash
bun run test
```

### 3.3 ビルド & デプロイ

```bash
# Webアプリケーション
cd apps/web
docker build -t gcr.io/suzumina-click-dev/web .
docker push gcr.io/suzumina-click-dev/web

# Functions
cd apps/functions
bun run deploy

# Jobs
cd apps/jobs
docker build -t gcr.io/suzumina-click-dev/jobs .
docker push gcr.io/suzumina-click-dev/jobs
```

## 4. 次のステップ（優先順位順）

1. ✨ Web アプリケーションの基本実装
   - コンポーネント構造の設計と実装（ヘッダー、フッター等）

2. 🔧 APIエンドポイントの実装
   - apps/functions ディレクトリの作成
   - TypeScript環境のセットアップ
   - サンプルAPIの実装

3. 🔄 CI/CDパイプラインの構築
   - GitHub Actionsの設定
   - 自動テスト・デプロイの設定

4. 📦 バッチ処理の実装
   - apps/jobs ディレクトリの作成
   - 基本的な処理フローの実装

5. ⚙️ GCP関連設定
   - 認証情報の設定
   - 監視・ロギングの設定
   - セキュリティ設定の調整
