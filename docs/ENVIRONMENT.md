# suzumina.click 環境変数設定ガイド

本ドキュメントでは、suzumina.clickプロジェクトで必要な環境変数設定について説明します。

## 🔧 必要な環境変数

### Google Cloud Platform設定

#### 本番環境
```bash
# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=suzumina-click-firebase

# Google Cloud認証（本番環境）
# Application Default Credentials (ADC) を使用
# Cloud Run/Cloud Functions では自動的に設定される
```

#### 開発環境
```bash
# Google Cloud認証（開発環境）
# ADCを使用（gcloud auth application-default login で設定）
GOOGLE_CLOUD_PROJECT_ID=suzumina-click-firebase
```

### Next.js Web Application

#### 開発環境 (.env.local)
```bash
# 不要 - ADCを使用してGoogle Cloudに認証
# Firestoreクライアント設定はコード内で直接指定
```

#### 本番環境 (Cloud Run環境変数)
```bash
# Cloud Runでは自動的に設定される認証情報を使用
# 追加の環境変数は現在不要
```

## 🏗️ インフラ設定

### Google Cloud Firestore
- **プロジェクト**: `suzumina-click-firebase`
- **データベースモード**: Native mode
- **リージョン**: asia-northeast1 (Tokyo)

### Google Cloud Storage
- **音声ファイル用バケット**: `suzumina-click-audio-files`
- **リージョン**: asia-northeast1 (Tokyo)
- **ライフサイクル管理**: 30日後にColdline移行

### Cloud Functions
- **Node.js ランタイム**: 22
- **メモリ**: 512MB (default)
- **タイムアウト**: 540秒 (default)

## 🔐 認証設定

### Application Default Credentials (ADC)

#### 開発環境
```bash
# Google Cloud SDKインストール
brew install google-cloud-sdk

# ADC設定
gcloud auth application-default login

# プロジェクト設定
gcloud config set project suzumina-click-firebase
```

#### 本番環境
- Cloud Run/Cloud Functions: 自動的にサービスアカウント認証
- GitHub Actions: Workload Identity連携

## 📁 設定ファイル構造

```
suzumina.click/
├── apps/web/
│   ├── next.config.mjs           # Next.js設定
│   └── src/lib/firestore.ts      # Firestore接続設定
├── apps/functions/
│   └── src/index.ts              # Cloud Functions設定
├── terraform/
│   ├── variables.tf              # インフラ変数定義
│   └── *.tf                      # リソース定義
└── docs/
    ├── ENVIRONMENT.md            # 本ドキュメント
    └── README.md                 # プロジェクト概要
```

## 🚀 デプロイ設定

### GitHub Actions環境変数
```yaml
# .github/workflows/deploy.yml で設定
env:
  GOOGLE_CLOUD_PROJECT_ID: suzumina-click-firebase
  WORKLOAD_IDENTITY_PROVIDER: projects/123456789/locations/global/workloadIdentityPools/github/providers/github-provider
  SERVICE_ACCOUNT: github-actions@suzumina-click-firebase.iam.gserviceaccount.com
```

### Terraform変数
```hcl
# terraform/variables.tf
variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
  default     = "suzumina-click-firebase"
}

variable "region" {
  description = "Google Cloud Region"
  type        = string
  default     = "asia-northeast1"
}
```

## 🔍 設定確認方法

### 開発環境での確認
```bash
# ADC設定確認
gcloud auth application-default print-access-token

# プロジェクト設定確認
gcloud config get-value project

# Firestore接続テスト
cd apps/web && pnpm dev
# → http://localhost:3000 で動画一覧が表示されれば成功
```

### 本番環境での確認
```bash
# Cloud Run サービス確認
gcloud run services list --region=asia-northeast1

# Functions デプロイ確認
gcloud functions list --region=asia-northeast1

# Firestore データ確認
gcloud firestore databases list
```

## 📋 セキュリティ設定

### Firestore Security Rules
```javascript
// 音声ボタンコレクション読み取り制限
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 音声ボタン - 公開分のみ読み取り可能
    match /audioButtons/{buttonId} {
      allow read: if resource.data.isPublic == true;
      allow write: if false; // 将来的にユーザー認証後に許可
    }
    
    // 動画・作品データ - 読み取りのみ
    match /{collection}/{document} {
      allow read: if collection in ['videos', 'dlsiteWorks'];
      allow write: if false;
    }
  }
}
```

### Cloud Storage IAM
```bash
# 音声ファイル読み取り専用アクセス
# allUsers: objectViewer (音声ファイル再生用)
# Service Account: objectAdmin (アップロード用)
```

## 🚨 本番環境チェックリスト

### デプロイ前確認
- [ ] ADC設定完了
- [ ] プロジェクトID確認
- [ ] Firestore接続テスト
- [ ] Cloud Storage権限確認
- [ ] セキュリティルール適用
- [ ] GitHub Actions設定

### 本番確認
- [ ] Web アプリケーション動作確認
- [ ] 音声ボタン機能テスト
- [ ] データ取得・表示確認
- [ ] エラーログ監視
- [ ] パフォーマンス監視

---

**最終更新**: 2025年6月17日  
**担当**: suzumina.click開発チーム