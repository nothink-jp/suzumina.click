# Google Cloud Platform プロジェクト設定

このドキュメントでは、suzumina.clickのGCPプロジェクト設定と基本インフラストラクチャの要件について説明します。

## 目次

- [GCPプロジェクト基本設定](#gcpプロジェクト基本設定)
- [必要なAPIの有効化](#必要なapiの有効化)
- [サービスアカウント設定](#サービスアカウント設定)
- [リソース命名規則](#リソース命名規則)
- [関連ドキュメント](#関連ドキュメント)

## GCPプロジェクト基本設定

- **プロジェクトID**: `suzumina-click-dev`（検証環境用）
- **リージョン**: `asia-northeast1`（東京リージョン）
- **組織**: 個人プロジェクト（組織なし）
- **請求先アカウント**: 個人クレジットカード連携

## 必要なAPIの有効化

以下のAPIを有効化する必要があります：

| API名 | 目的 |
|------|------|
| Cloud Run API | Webアプリケーションのデプロイ |
| Cloud Functions API | サーバーレス関数の実行 |
| Cloud Build API | CI/CDパイプラインの構築 |
| Container Registry API | Dockerイメージの保存 |
| Artifact Registry API | コンテナイメージとパッケージの保存 |
| Secret Manager API | 機密情報の管理 |
| Cloud Scheduler API | ジョブのスケジューリング |
| Cloud Tasks API | 分散タスクの管理 |
| Firestore API | NoSQLデータベースの利用 |
| Cloud Storage API | オブジェクトストレージの利用 |
| YouTube Data API v3 | YouTubeデータの取得 |

APIの有効化はGCPコンソールまたは以下のgcloudコマンドで実行できます：

```bash
# 例: YouTubeデータAPIを有効化
gcloud services enable youtube.googleapis.com --project=suzumina-click-dev
```

## サービスアカウント設定

プロジェクトでは以下のサービスアカウントを使用します：

1. **CI/CDデプロイメント用サービスアカウント**
   - 名前: `github-actions-deployer@suzumina-click-dev.iam.gserviceaccount.com`
   - 役割:
     - Cloud Run Admin
     - Cloud Functions Admin
     - Cloud Build Editor
     - Storage Admin
     - Artifact Registry Writer
     - Service Account User

2. **アプリケーション実行用サービスアカウント**
   - 名前: `app-runtime@suzumina-click-dev.iam.gserviceaccount.com`
   - 役割:
     - Firestore User
     - Storage Object User
     - Secret Manager Secret Accessor

3. **YouTube API連携用サービスアカウント**
   - 名前: `youtube-api-client@suzumina-click-dev.iam.gserviceaccount.com`
   - 役割:
     - カスタム（YouTube API専用の最小権限）

## リソース命名規則

GCPリソースは以下の命名規則に従います：

| リソースタイプ | 命名規則 | 例 |
|--------------|---------|-----|
| Cloud Run サービス | `{service-name}` | `web`, `api` |
| Cloud Functions | `{function-name}` | `app`, `hello-python` |
| Cloud Run Jobs | `{job-type}-job[-{language}]` | `data-sync-job`, `report-job-python` |
| Scheduler Jobs | `{job-name}-scheduler` | `data-sync-scheduler` |
| Storage Buckets | `suzumina-click-dev-{purpose}` | `suzumina-click-dev-uploads` |
| Secrets | `{service}-{purpose}-{env}` | `youtube-api-key-dev` |

## 関連ドキュメント

- [全体概要](GCP_OVERVIEW.md)
- [Webアプリケーション設計](GCP_WEB_APP.md)
- [API設計](GCP_FUNCTIONS.md)
- [CI/CD設計](GCP_CICD.md)
- [セキュリティ設計](GCP_SECURITY.md)

## 最終更新日

2025年4月2日
