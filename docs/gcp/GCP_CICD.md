# Cloud Run デプロイ手順

## 環境変数の管理

### Secret Managerを使用した環境変数の管理

現在、以下の環境変数がSecret Managerで管理されています：

```bash
Secret:nextauth-url-dev:latest
Secret:nextauth-secret-dev:latest
Secret:discord-client-id-dev:latest
Secret:discord-client-secret-dev:latest
Secret:discord-guild-id-dev:latest
Secret:auth-trust-host-dev:latest
Secret:database-url-dev:latest
```

### 環境変数の更新手順

1. Secret Managerで値を更新する場合：

```bash
# 新しいバージョンのシークレットを作成
gcloud secrets versions add [SECRET_NAME] \
  --data-file=/path/to/secret.txt
```

2. Cloud Run サービスの環境変数を更新する場合：

```bash
# 既存の環境変数を維持したまま更新
gcloud run services update web \
  --region=asia-northeast1 \
  --set-secrets=\
NEXTAUTH_URL=nextauth-url-dev:latest,\
NEXTAUTH_SECRET=nextauth-secret-dev:latest,\
DISCORD_CLIENT_ID=discord-client-id-dev:latest,\
DISCORD_CLIENT_SECRET=discord-client-secret-dev:latest,\
DISCORD_GUILD_ID=discord-guild-id-dev:latest,\
AUTH_TRUST_HOST=auth-trust-host-dev:latest,\
DATABASE_URL=database-url-dev:latest
```

### Cloud Run設定

現在の設定：

```bash
# サービス情報
サービス名: web
リージョン: asia-northeast1
URL: https://web-437899281.asia-northeast1.run.app

# 環境変数（ビルドインのみ）
NODE_ENV: production
NEXT_TELEMETRY_DISABLED: 1
PORT: 3000

# シークレット
AUTH_TRUST_HOST: auth-trust-host-dev:latest
DATABASE_URL: database-url-dev:latest
DISCORD_CLIENT_ID: discord-client-id-dev:latest
DISCORD_CLIENT_SECRET: discord-client-secret-dev:latest
DISCORD_GUILD_ID: discord-guild-id-dev:latest
NEXTAUTH_SECRET: nextauth-secret-dev:latest
NEXTAUTH_URL: nextauth-url-dev:latest

# コンピュートリソース
メモリ: 512Mi
CPU: 1000m
最小インスタンス: 0
最大インスタンス: 10
タイムアウト: 300s
同時実行数: 80

# ネットワーク設定
VPCコネクタ: suzumina-vpc-connector
Egress: all-traffic

# サービスアカウント
app-runtime@suzumina-click-dev.iam.gserviceaccount.com
```

## CI/CD パイプライン設定

GitHub Actionsを使用して、ビルドからデプロイまでを自動化しています：

### GitHub Actions ワークフロー

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main

env:
  PROJECT_ID: suzumina-click-dev
  SERVICE_NAME: web
  REGION: asia-northeast1
  DOCKER_REPOSITORY: suzumina-click-docker-repo
  REGISTRY: asia-northeast1-docker.pkg.dev
  SERVICE_ACCOUNT: app-runtime@suzumina-click-dev.iam.gserviceaccount.com

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4
      
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/357597616909/locations/global/workloadIdentityPools/github-actions/providers/github-actions
          service_account: github-actions-deployer@suzumina-click-dev.iam.gserviceaccount.com

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: |
          gcloud auth configure-docker ${{ env.REGISTRY }}

      - name: Get version
        id: version
        run: |
          VERSION="v0.1.2-$(date +%Y%m%d-%H%M%S)"
          echo "VERSION=${VERSION}" >> $GITHUB_ENV

      - name: Build and Push
        run: |
          IMAGE_URL=${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.DOCKER_REPOSITORY }}/${{ env.SERVICE_NAME }}:${{ env.VERSION }}
          
          # NODE_ENV=productionを明示的に指定してビルド
          docker build \
            --build-arg NEXT_TELEMETRY_DISABLED=1 \
            -t ${IMAGE_URL} \
            .
          
          docker push ${IMAGE_URL}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --image ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.DOCKER_REPOSITORY }}/${{ env.SERVICE_NAME }}:${{ env.VERSION }} \
            --region ${{ env.REGION }} \
            --platform managed \
            --allow-unauthenticated \
            --memory 512Mi \
            --cpu 1000m \
            --min-instances 0 \
            --max-instances 10 \
            --port 3000 \
            --service-account ${{ env.SERVICE_ACCOUNT }} \
            --vpc-connector suzumina-vpc-connector \
            --vpc-egress all-traffic \
            --set-env-vars NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1 \
            --set-secrets=\
AUTH_TRUST_HOST=auth-trust-host-dev:latest,\
DATABASE_URL=database-url-dev:latest,\
DISCORD_CLIENT_ID=discord-client-id-dev:latest,\
DISCORD_CLIENT_SECRET=discord-client-secret-dev:latest,\
DISCORD_GUILD_ID=discord-guild-id-dev:latest,\
NEXTAUTH_SECRET=nextauth-secret-dev:latest,\
NEXTAUTH_URL=nextauth-url-dev:latest

      - name: Display service URL
        run: |
          gcloud run services describe ${{ env.SERVICE_NAME }} \
            --region ${{ env.REGION }} \
            --format='value(status.url)'
```

## トラブルシューティング

### GitHub Actions

1. ビルドログの確認
   - GitHub Actionsのワークフローページでログを確認
   - 各ステップの詳細な出力を確認可能

2. デプロイ失敗時の確認

   ```bash
   # デプロイされているイメージの確認
   gcloud run services describe web \
     --region=asia-northeast1 \
     --format='value(spec.template.spec.containers[0].image)'

   # サービスのリビジョン履歴
   gcloud run revisions list \
     --service=web \
     --region=asia-northeast1

   # リビジョンの詳細確認
   gcloud run revisions describe [REVISION_NAME] \
     --region=asia-northeast1
   ```

### アプリケーションログ

```bash
# 最新のログを確認
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=web" \
  --limit=50

# エラーログのみを確認
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=web AND severity>=ERROR" \
  --limit=20
```

### Workload Identity Federation

1. 権限の確認

   ```bash
   # サービスアカウントの権限確認
   gcloud projects get-iam-policy $PROJECT_ID \
     --flatten="bindings[].members" \
     --format='table(bindings.role)' \
     --filter="bindings.members:$SERVICE_ACCOUNT"
   ```

2. GitHub Actionsの設定確認

   ```bash
   # Workload Identity Poolの確認
   gcloud iam workload-identity-pools describe github-actions \
     --location=global

   # プロバイダーの確認
   gcloud iam workload-identity-pools providers describe github-actions \
     --workload-identity-pool=github-actions \
     --location=global
   ```

最終更新日: 2025年4月12日
