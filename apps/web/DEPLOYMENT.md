# suzumina.click Web Application - Cloud Run Deployment Guide

このドキュメントは、suzumina.click WebアプリケーションをGoogle Cloud Runにデプロイする手順を説明します。

## 📋 前提条件

### 必要なツール
- Docker Desktop
- Google Cloud SDK (`gcloud`)
- Node.js 22
- pnpm 10

### Google Cloud プロジェクト設定
- プロジェクトID: `suzumina-click-firebase`
- リージョン: `asia-northeast1`
- 必要なAPI有効化:
  - Cloud Run API
  - Container Registry API
  - Cloud Build API

## 🚀 デプロイ方法

### 1. ローカル Docker ビルドテスト

プロジェクトルートから以下を実行：

```bash
# Docker イメージをビルド
./apps/web/scripts/docker-build.sh

# ローカルでコンテナを実行
./apps/web/scripts/docker-run.sh
```

ブラウザで `http://localhost:8080` にアクセスして動作確認。

### 2. 手動デプロイ

```bash
# Google Cloud にログイン
gcloud auth login
gcloud config set project suzumina-click-firebase

# Docker レジストリ認証
gcloud auth configure-docker

# プロジェクトルートに移動
cd /path/to/suzumina.click

# イメージをビルド
IMAGE_TAG="gcr.io/suzumina-click-firebase/suzumina-web:$(git rev-parse --short HEAD)"
docker build -f apps/web/Dockerfile -t $IMAGE_TAG .

# イメージをプッシュ
docker push $IMAGE_TAG

# Cloud Run にデプロイ
gcloud run deploy suzumina-web \
  --image $IMAGE_TAG \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 100 \
  --concurrency 1000 \
  --timeout 300 \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
  --execution-environment gen2 \
  --cpu-boost
```

### 3. GitHub Actions 自動デプロイ

GitHub リポジトリの Secrets に以下を設定：

- `WIF_PROVIDER`: Workload Identity Federation プロバイダー
- `WIF_SERVICE_ACCOUNT`: サービスアカウント
- `CLOUD_RUN_SERVICE_ACCOUNT`: Cloud Run 用サービスアカウント

`main` ブランチへのプッシュで自動デプロイが実行されます。

## 🔧 設定ファイル

### Dockerfile
- **場所**: `apps/web/Dockerfile`
- **特徴**: 
  - マルチステージビルド
  - Next.js standalone モード
  - Cloud Run 最適化（port 8080、tini init）
  - セキュリティ強化（非root ユーザー）

### Cloud Run 設定
- **場所**: `apps/web/cloud-run.yaml`
- **設定内容**:
  - リソース制限: CPU 1000m、メモリ 1Gi
  - オートスケーリング: 0-100 インスタンス
  - ヘルスチェック設定

### GitHub Actions
- **場所**: `apps/web/.github/workflows/deploy-cloud-run.yml`
- **機能**:
  - テスト実行
  - Docker ビルド・プッシュ
  - Cloud Run デプロイ
  - Workload Identity Federation 認証

## 📊 監視・ログ

### ヘルスチェック
```bash
curl https://suzumina-web-[hash]-an.a.run.app/api/health
```

### ログ確認
```bash
gcloud logs read --service=suzumina-web --region=asia-northeast1
```

### メトリクス確認
```bash
curl https://suzumina-web-[hash]-an.a.run.app/api/metrics
```

## 🛠️ トラブルシューティング

### よくある問題

#### 1. Docker ビルドエラー
```bash
# キャッシュをクリア
docker system prune -a

# 依存関係の再インストール
pnpm install --frozen-lockfile
```

#### 2. Cloud Run デプロイエラー
```bash
# サービスアカウント権限確認
gcloud projects get-iam-policy suzumina-click-firebase

# イメージの確認
gcloud container images list --repository=gcr.io/suzumina-click-firebase
```

#### 3. 起動エラー
```bash
# Cloud Run ログ確認
gcloud logs tail --service=suzumina-web --region=asia-northeast1

# ローカルでコンテナ実行
docker run -p 8080:8080 gcr.io/suzumina-click-firebase/suzumina-web:latest
```

## 🔄 デプロイ戦略

### ブルーグリーンデプロイ
```bash
# 新バージョンをデプロイ（トラフィック0%）
gcloud run deploy suzumina-web --no-traffic --revision-suffix=v2

# 段階的にトラフィックを移行
gcloud run services update-traffic suzumina-web --to-revisions=suzumina-web-v2=10

# 問題なければ100%移行
gcloud run services update-traffic suzumina-web --to-latest
```

### カナリアデプロイ
```bash
# 新バージョンに5%のトラフィックを送る
gcloud run services update-traffic suzumina-web \
  --to-revisions=suzumina-web-v1=95,suzumina-web-v2=5
```

## 📈 パフォーマンス最適化

### Next.js 設定
- `output: "standalone"` による最小化デプロイ
- イメージ最適化設定
- バンドル分割設定

### Docker 最適化
- マルチステージビルド
- .dockerignore による不要ファイル除外
- Alpine Linux ベースイメージ

### Cloud Run 最適化
- CPU boost 有効化
- 適切なリソース制限
- コールドスタート最小化

## 🔐 セキュリティ

### コンテナセキュリティ
- 非root ユーザーでの実行
- 最小権限の原則
- セキュリティヘッダー設定

### Cloud Run セキュリティ
- サービスアカウント認証
- IAM による アクセス制御
- VPC コネクタ（必要に応じて）

## 📝 関連ファイル

- `apps/web/Dockerfile` - Docker イメージ定義
- `apps/web/cloud-run.yaml` - Cloud Run サービス設定
- `apps/web/.dockerignore` - Docker ビルド除外設定
- `apps/web/scripts/docker-build.sh` - ローカルビルドスクリプト
- `apps/web/scripts/docker-run.sh` - ローカル実行スクリプト
- `apps/web/.github/workflows/deploy-cloud-run.yml` - CI/CD パイプライン