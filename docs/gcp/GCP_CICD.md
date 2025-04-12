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
gcloud run services update web-437899281 \
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

## 環境変数の確認方法

1. Cloud Run コンソール
   - サービスの詳細画面で「変数」タブを確認
   - Secret Managerとの連携状況を確認

2. アプリケーション上
   - トップページの環境変数デバッグ情報で確認
   - Secret Managerからの読み込み状況を確認

## トラブルシューティング

### 環境変数が認識されない場合

1. Secret Managerのアクセス権限確認
   - Cloud Runのサービスアカウントに適切な権限があるか確認
   - `roles/secretmanager.secretAccessor` ロールが必要

2. シークレットの値確認

   ```bash
   # シークレットの最新バージョンを確認
   gcloud secrets versions access latest \
     --secret=[SECRET_NAME]
   ```

3. Cloud Runの設定確認

   ```bash
   # サービスの設定を確認
   gcloud run services describe web-437899281 \
     --region=asia-northeast1
   ```

### セキュリティに関する注意事項

1. シークレットの管理
   - 定期的なローテーション
   - 適切なIAM権限設定
   - バージョニングの活用

2. 環境分離
   - 開発環境と本番環境で別のシークレットを使用
   - 命名規則の統一（例: `-dev`, `-prod` サフィックス）

## CI/CD パイプライン設定

### GitHub Actions での設定例

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main

env:
  PROJECT_ID: your-project-id
  SERVICE_NAME: web-437899281
  REGION: asia-northeast1

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY }}'

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Build and Deploy
        run: |
          gcloud builds submit \
            --region=$REGION \
            --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

          # Secret Managerの設定を維持したまま更新
          gcloud run deploy $SERVICE_NAME \
            --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
            --region=$REGION \
            --platform=managed \
            --allow-unauthenticated
```

## 新環境のセットアップ

1. Secret Managerでシークレットを作成

   ```bash
   # シークレットの作成
   gcloud secrets create [SECRET_NAME] \
     --replication-policy="automatic"
   
   # 初期値の設定
   echo -n "secret-value" | \
     gcloud secrets versions add [SECRET_NAME] --data-file=-
   ```

2. Cloud Runのサービスアカウント設定

   ```bash
   # サービスアカウントの作成
   gcloud iam service-accounts create [SA_NAME] \
     --display-name="Cloud Run Service Account"

   # Secret Managerアクセス権限の付与
   gcloud projects add-iam-policy-binding [PROJECT_ID] \
     --member="serviceAccount:[SA_NAME]@[PROJECT_ID].iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. Cloud Runサービスの更新

   ```bash
   gcloud run services update [SERVICE_NAME] \
     --service-account=[SA_NAME]@[PROJECT_ID].iam.gserviceaccount.com
   ```

最終更新日: 2025年4月12日
