# デプロイメントガイド

suzumina.click の本番デプロイ・運用リファレンス

## 🚀 デプロイメント概要

**運用環境**: 本番のみ (Production)  
**自動デプロイ**: GitHub Actions (main ブランチ)  
**インフラ**: Google Cloud Platform  
**アプリケーション**: Web App (Cloud Run) + Admin App (Cloud Run) + Cloud Functions (データ収集)

```text
開発 → main ブランチ → GitHub Actions → 本番デプロイ
  ↓         ↓              ↓           ↓
ローカル   統合・PR     自動テスト    本番環境
テスト    レビュー      + ビルド     自動リリース
```

## 📋 GitHub Actions CI/CD

### 1. Web Application (Cloud Run)

**ファイル**: `.github/workflows/deploy-cloud-run.yml`

**トリガー条件:**
- `main`ブランチへのpush（Web関連ファイル変更時）
- 手動実行（`workflow_dispatch`）

**デプロイフロー:**
1. **品質チェック**
   - pnpm依存関係インストール
   - TypeScript型チェック・ESLint・テスト実行

2. **イメージビルド & プッシュ**
   - Docker イメージビルド（`apps/web/Dockerfile`）
   - Artifact Registry へプッシュ（`{sha}` と `latest`タグ）

3. **Cloud Run デプロイ**
   - 環境変数とSecret Manager連携
   - リソース制限（CPU: 1, Memory: 2Gi）
   - 自動スケーリング（0-10インスタンス）

4. **デプロイ後処理**
   - パブリックアクセス設定・ヘルスチェック
   - 古いイメージのクリーンアップ

### 2. Admin Application (Cloud Run)

**ファイル**: `.github/workflows/deploy-admin-cloud-run.yml`

**特徴:**
- **0インスタンス運用**: 通常時はインスタンス数0
- **管理者専用認証**: Discord OAuth + 管理者ID制限
- **セキュリティ強化**: IAM + 環境変数による二重認証

### 3. Cloud Functions (データ収集)

**ファイル**: `.github/workflows/deploy-cloud-functions.yml`

**機能:**
- DLsite作品データ収集 (20分間隔)
- YouTube動画データ収集 (毎時19分)
- データ品質監視・エラーハンドリング

## 🔧 ローカル開発・テスト

### 基本開発フロー

```bash
# ローカル開発・テスト
pnpm dev              # 開発サーバー
pnpm test             # 単体テスト実行
pnpm check            # Lint + 型チェック
pnpm build            # 本番ビルド確認
```

### アプリ別開発

```bash
# Web App開発
cd apps/web && pnpm dev

# Admin App開発  
cd apps/admin && pnpm dev

# Cloud Functions開発
cd apps/functions && pnpm dev
```

## 📊 運用状況確認

### Web App (Cloud Run)

```bash
# サービス稼働状況
gcloud run services describe suzumina-click-web --region=asia-northeast1

# 最新リビジョン確認
gcloud run revisions list --service=suzumina-click-web --region=asia-northeast1

# ログ確認（直近1時間）
gcloud logs read "resource.type=cloud_run_revision" --since="1h"
```

### ヘルスチェック

```bash
# アプリケーション応答確認
curl -I https://suzumina.click/

# Firestore接続確認
curl https://suzumina.click/api/health

# 管理者アプリ確認
curl -I https://admin.suzumina.click/
```

### Cloud Functions監視

```bash
# Functions実行状況
gcloud functions logs read fetchDLsiteWorks --region=asia-northeast1

# スケジューラー状況  
gcloud scheduler jobs list --location=asia-northeast1

# Pub/Sub メッセージ確認
gcloud pubsub topics list
```

## 🚨 緊急対応・トラブルシューティング

### トラフィック制御

```bash
# トラフィック停止（緊急時）
gcloud run services update-traffic suzumina-click-web \
  --to-revisions=REVISION_NAME=0 --region=asia-northeast1

# 前リビジョンへの緊急ロールバック
gcloud run services update-traffic suzumina-click-web \
  --to-latest --region=asia-northeast1
```

### 手動デプロイ（緊急時のみ）

```bash
# Web App手動デプロイ
cd apps/web
docker build -t web-app .
docker tag web-app asia-northeast1-docker.pkg.dev/$PROJECT_ID/suzumina-click/suzumina-web:emergency
docker push asia-northeast1-docker.pkg.dev/$PROJECT_ID/suzumina-click/suzumina-web:emergency

gcloud run deploy suzumina-click-web \
  --image asia-northeast1-docker.pkg.dev/$PROJECT_ID/suzumina-click/suzumina-web:emergency \
  --region=asia-northeast1

# Admin App手動デプロイ
cd apps/admin  
docker build -t admin-app .
docker tag admin-app asia-northeast1-docker.pkg.dev/$PROJECT_ID/suzumina-click/suzumina-admin:emergency
docker push asia-northeast1-docker.pkg.dev/$PROJECT_ID/suzumina-click/suzumina-admin:emergency

gcloud run deploy suzumina-admin \
  --image asia-northeast1-docker.pkg.dev/$PROJECT_ID/suzumina-click/suzumina-admin:emergency \
  --region=asia-northeast1 \
  --min-instances 0 \
  --max-instances 1
```

### Cloud Functions緊急対応

```bash
# Functions再デプロイ
cd apps/functions
pnpm deploy

# スケジューラー停止/再開
gcloud scheduler jobs pause dlsite-fetch-job --location=asia-northeast1
gcloud scheduler jobs resume dlsite-fetch-job --location=asia-northeast1
```

## 🔧 環境変数・シークレット管理

### Secret Manager設定

```bash
# 重要な認証情報
gcloud secrets create NEXTAUTH_SECRET --data-file=-
gcloud secrets create DISCORD_CLIENT_SECRET --data-file=-
gcloud secrets create ADMIN_DISCORD_IDS --data-file=-

# YouTube API Key
gcloud secrets create YOUTUBE_API_KEY --data-file=-
```

### 環境変数確認

```bash
# Cloud Run環境変数確認
gcloud run services describe suzumina-click-web \
  --region=asia-northeast1 \
  --format="export" | grep -E "(env|secret)"

# Cloud Functions環境変数確認  
gcloud functions describe fetchDLsiteWorks \
  --region=asia-northeast1 \
  --format="value(environmentVariables)"
```

## 📈 監視・ログ分析

### 構造化ログ検索

```bash
# アプリケーションエラー
gcloud logs read 'severity>=ERROR' --since="1h"

# 特定機能のログ
gcloud logs read 'jsonPayload.module="audio-buttons"' --since="1h"

# パフォーマンス分析
gcloud logs read 'jsonPayload.responseTime>1000' --since="6h"
```

### メトリクス監視

- **Cloud Monitoring**: レスポンス時間・エラー率・インスタンス数
- **Uptime Checks**: 可用性監視・アラート設定
- **Custom Metrics**: 音声ボタン作成数・検索実行数

## 🎯 最適化・スケーリング

### パフォーマンス調整

```bash
# リソース制限調整
gcloud run services update suzumina-click-web \
  --cpu=2 --memory=4Gi \
  --region=asia-northeast1

# 同時リクエスト数調整
gcloud run services update suzumina-click-web \
  --concurrency=100 \
  --region=asia-northeast1

# インスタンス数調整
gcloud run services update suzumina-click-web \
  --min-instances=1 --max-instances=20 \
  --region=asia-northeast1
```

### コスト最適化

- **0インスタンス運用**: Admin Appは使用時のみ課金
- **効率的スケーリング**: トラフィックに応じた自動調整
- **リソース最適化**: CPU・メモリの適切な設定

## 📚 関連ドキュメント

- **[インフラアーキテクチャ](./INFRASTRUCTURE_ARCHITECTURE.md)** - 全体構成・設計思想
- **[開発ガイド](./DEVELOPMENT.md)** - 開発環境・品質基準
- **[Terraform設定](../terraform/README.md)** - インフラ構成管理
- **[プロジェクト概要](../README.md)** - 全体像・技術スタック