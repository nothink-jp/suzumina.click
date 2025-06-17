# 軽量インフラ設計案 - suzumina.click

## 🎯 設計思想

個人開発の取り回しやすさとコスト効率を最重視した軽量設計案です。

### 現状の課題

- **環境分離の複雑さ**: 3つのGCPプロジェクト（prod/dev/firebase）管理の負荷
- **コスト効率**: 複数プロジェクトでのリソース重複による無駄
- **運用負荷**: 個人開発者には過剰な環境分離
- **データ分散**: Firestore/Storageが複数箇所に分散

### 設計原則

✅ **シンプルさ優先**: 運用負荷を最小化
✅ **コスト最適化**: 無駄なリソース重複を避ける
✅ **GitHub Actions活用**: 既存のCI/CDインフラを最大限活用
✅ **データ統合**: 大容量データを一箇所に集約
✅ **段階的移行**: 既存環境からの無理のない移行

## 🏗️ 推奨案: 単一プロジェクト + 環境分離

### アーキテクチャ概要

```
suzumina-click (単一GCPプロジェクト)
├── prod-*        (本番環境リソース)
├── dev-*         (開発環境リソース)
├── shared-*      (共有リソース)
└── domain-*      (ドメイン管理)
```

**核心的なメリット**:
- 🏷️ **1つのGCPプロジェクト**: 請求・権限管理が単純
- 💾 **データ統合**: Firestore/Storageを共有して重複コストを削減
- 🚀 **GitHub Actions中心**: 既存のCI/CDパイプラインを活用
- 🌐 **ドメイン一元管理**: Cloud DNS一箇所で管理

## 📋 詳細設計

### 1. GCPプロジェクト構成

#### 単一プロジェクト: `suzumina-click`

```yaml
# 環境分離の命名規則
Production:
  - Functions: prod-fetch-youtube, prod-fetch-dlsite
  - Storage: prod-audio-files, prod-web-assets
  - Scheduler: prod-youtube-scheduler, prod-dlsite-scheduler
  - Pub/Sub: prod-youtube-trigger, prod-dlsite-trigger

Development:
  - Functions: dev-fetch-youtube, dev-fetch-dlsite
  - Storage: dev-audio-files, dev-web-assets
  - Scheduler: dev-youtube-scheduler, dev-dlsite-scheduler
  - Pub/Sub: dev-youtube-trigger, dev-dlsite-trigger

Shared:
  - Firestore: shared-database (prodとdevで異なるcollection)
  - Storage: shared-audio-storage (prodとdevで異なるフォルダ)
  - Secret Manager: shared-secrets
  - Cloud DNS: suzumina.click ドメイン管理
```

### 2. 共有リソース戦略

#### データベース統合
```
Cloud Firestore (shared-database)
├── production/
│   ├── videos/
│   ├── works/
│   └── audioClips/
└── development/
    ├── videos/
    ├── works/
    └── audioClips/
```

#### ストレージ統合
```
Cloud Storage (shared-audio-storage)
├── production/
│   ├── audio-files/
│   └── thumbnails/
├── development/
│   ├── audio-files/
│   └── thumbnails/
└── backups/
```

### 3. ドメイン・ネットワーク設計

#### Cloud DNS統合管理
```
suzumina.click (メインドメイン)
├── @ (本番) → Cloud Run / Vercel
├── www → @ にリダイレクト
├── dev → 開発環境
├── api → API エンドポイント
└── cdn → CDN配信 (将来)
```

### 4. GitHub Actions最適化

#### 単一workflowで環境切り替え
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Set Environment
        run: |
          if [[ ${{ github.ref }} == 'refs/heads/main' ]]; then
            echo "ENV=prod" >> $GITHUB_ENV
            echo "PROJECT_ID=suzumina-click" >> $GITHUB_ENV
          else
            echo "ENV=dev" >> $GITHUB_ENV
            echo "PROJECT_ID=suzumina-click" >> $GITHUB_ENV
          fi
      
      - name: Deploy Functions
        run: |
          gcloud functions deploy ${ENV}-fetch-youtube \
            --project=${PROJECT_ID}
          gcloud functions deploy ${ENV}-fetch-dlsite \
            --project=${PROJECT_ID}
```

## 🚀 実装戦略

### Phase 1: 基盤準備（1週間）

1. **新GCPプロジェクト作成**
   ```bash
   gcloud projects create suzumina-click
   gcloud config set project suzumina-click
   ```

2. **Terraform移行**
   ```bash
   # 現在のterraform/を改修
   # 環境変数で prod/dev を切り替える設計に変更
   terraform workspace new prod
   terraform workspace new dev
   ```

3. **共有リソース作成**
   - Cloud Firestore (Native mode)
   - Cloud Storage (統合バケット)
   - Secret Manager
   - Cloud DNS

### Phase 2: 開発環境移行（1週間）

1. **dev環境構築**
   ```bash
   terraform workspace select dev
   terraform plan -var="environment=dev"
   terraform apply
   ```

2. **開発用データ移行**
   - 最小限のテストデータのみ
   - 本番データは後でバックアップから復元

3. **GitHub Actions更新**
   - develop branch → dev環境デプロイ
   - main branch → prod環境デプロイ

### Phase 3: 本番環境移行（1-2週間）

1. **本番データバックアップ**
   ```bash
   # 既存 suzumina-click-firebase からエクスポート
   gcloud firestore export gs://backup-bucket/firestore-backup
   gcloud storage cp -r gs://existing-audio-files gs://backup-bucket/
   ```

2. **本番環境構築**
   ```bash
   terraform workspace select prod
   terraform plan -var="environment=prod"
   terraform apply
   ```

3. **データ移行**
   ```bash
   # 新環境にインポート
   gcloud firestore import gs://backup-bucket/firestore-backup \
     --collection-ids=videos,works,audioClips \
     --async
   ```

4. **DNS切り替え**
   ```bash
   # suzumina.click → 新環境
   # 段階的に traffic 移行
   ```

### Phase 4: 旧環境クリーンアップ（1週間）

1. **動作確認期間**: 2週間
2. **旧プロジェクト削除**: suzumina-click-firebase
3. **コスト検証**: 新環境での月額コスト確認

## 💰 コスト分析

### 現在の構成（推定）
```
suzumina-click-firebase: $30-50/月
suzumina-click-dev: $20-30/月
suzumina-click-prod: $40-60/月
---
合計: $90-140/月
```

### 新構成（推定）
```
suzumina-click (統合): $50-80/月
---
合計: $50-80/月 (40-60%コスト削減)
```

**コスト削減要因**:
- ✅ プロジェクト管理費削減
- ✅ 重複リソース削減
- ✅ 共有Firestore/Storage
- ✅ 統合監視・ログ

## 🛠️ Terraform設計

### 環境分離設計
```hcl
# terraform/variables.tf
variable "environment" {
  description = "Environment (prod/dev)"
  type        = string
  validation {
    condition     = contains(["prod", "dev"], var.environment)
    error_message = "Environment must be 'prod' or 'dev'."
  }
}

# terraform/main.tf
locals {
  prefix = var.environment
  shared_prefix = "shared"
  
  # 環境固有リソース
  function_names = {
    youtube = "${local.prefix}-fetch-youtube"
    dlsite  = "${local.prefix}-fetch-dlsite"
  }
  
  # 共有リソース
  firestore_database = "${local.shared_prefix}-database"
  storage_bucket = "${local.shared_prefix}-audio-storage"
}
```

### 共有リソース管理
```hcl
# terraform/shared.tf
resource "google_firestore_database" "shared" {
  name     = local.shared_prefix
  type     = "FIRESTORE_NATIVE"
  location_id = var.region
  
  # 環境分離はcollectionレベルで行う
  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket" "shared_audio" {
  name     = "${var.gcp_project_id}-${local.shared_prefix}-audio"
  location = var.region
  
  # 環境分離はフォルダレベルで行う
  lifecycle {
    prevent_destroy = true
  }
}
```

## 🔒 セキュリティ・権限設計

### 環境分離IAM
```hcl
# 本番環境用サービスアカウント
resource "google_service_account" "prod_youtube" {
  count        = var.environment == "prod" ? 1 : 0
  account_id   = "prod-youtube-fetcher"
  display_name = "Production YouTube Fetcher"
}

# 開発環境用サービスアカウント
resource "google_service_account" "dev_youtube" {
  count        = var.environment == "dev" ? 1 : 0
  account_id   = "dev-youtube-fetcher"
  display_name = "Development YouTube Fetcher"
}
```

### Firestore Rules環境分離
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 本番データ
    match /production/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.env == 'production';
    }
    
    // 開発データ
    match /development/{document=**} {
      allow read, write: if request.auth.token.env == 'development';
    }
  }
}
```

## 📊 移行リスクと対策

### 高リスク項目

#### 1. データ移行リスク
**リスク**: 大容量データの移行失敗
**対策**: 
- ✅ 段階的移行（小さなコレクションから）
- ✅ 完全バックアップ + 復旧テスト
- ✅ 移行中のダウンタイム最小化

#### 2. DNS切り替えリスク  
**リスク**: ドメイン切り替え時のサービス停止
**対策**:
- ✅ TTL短縮（移行1週間前）
- ✅ 段階的トラフィック切り替え
- ✅ ヘルスチェック + 自動ロールバック

#### 3. 依存関係リスク
**リスク**: 外部API制限・認証エラー
**対策**:
- ✅ APIキー検証と移行
- ✅ 段階的機能有効化
- ✅ フォールバック機能

### 低リスク項目

- ✅ GitHub Actions更新（branch戦略のみ）
- ✅ 監視・アラート設定（同等機能移行）
- ✅ Secret Manager移行（値コピーのみ）

## 🎯 代替案検討

### 案1: Vercel + Serverless (最軽量)
```
フロントエンド: Vercel
バックエンド: Vercel Functions
データベース: PlanetScale MySQL
ストレージ: Cloudflare R2
```
**メリット**: 超軽量、個人開発最適化
**デメリット**: 既存投資の無駄、移行コスト大

### 案2: Firebase + GitHub Actions (中間)
```
フロントエンド: Firebase Hosting
バックエンド: Cloud Functions
データベース: Cloud Firestore
ストレージ: Cloud Storage
```
**メリット**: Firebase統合の利便性
**デメリット**: Firebase特有の制約、移行メリット小

### 案3: 単一プロジェクト統合 (推奨)
```
すべて: 単一GCPプロジェクト
環境分離: リソース命名規則
CI/CD: GitHub Actions
```
**メリット**: 最適なコスト・運用バランス
**デメリット**: 一定の設計・移行コスト

## 📅 実装タイムライン

### Week 1-2: 設計・準備
- [ ] 新GCPプロジェクト作成
- [ ] Terraform改修・テスト
- [ ] GitHub Actions workflow更新

### Week 3-4: 開発環境移行
- [ ] dev環境構築
- [ ] 開発用データ移行
- [ ] 動作確認・調整

### Week 5-6: 本番環境移行
- [ ] 本番データバックアップ
- [ ] prod環境構築
- [ ] 段階的データ移行
- [ ] DNS切り替え

### Week 7-8: 安定化・クリーンアップ
- [ ] 動作監視・チューニング
- [ ] 旧環境クリーンアップ
- [ ] コスト検証・レポート

## 🔧 実装支援

### Terraformサンプル
```hcl
# terraform/terraform.tfvars.example
gcp_project_id = "suzumina-click"
environment = "prod"  # or "dev"
region = "asia-northeast1"
youtube_api_key = "your-api-key"
```

### GitHub Actions設定
```yaml
# .github/workflows/terraform.yml
name: Terraform Deploy
on:
  push:
    branches: [main, develop]
    paths: ['terraform/**']

env:
  ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'prod' || 'dev' }}
```

### 移行スクリプト
```bash
#!/bin/bash
# scripts/migrate-data.sh
set -e

SOURCE_PROJECT="suzumina-click-firebase"
TARGET_PROJECT="suzumina-click"
ENVIRONMENT=${1:-dev}

echo "Migrating data from ${SOURCE_PROJECT} to ${TARGET_PROJECT} (${ENVIRONMENT})"

# Firestore export/import
gcloud firestore export \
  --project=${SOURCE_PROJECT} \
  gs://${SOURCE_PROJECT}-backup/$(date +%Y%m%d)

gcloud firestore import \
  --project=${TARGET_PROJECT} \
  gs://${SOURCE_PROJECT}-backup/$(date +%Y%m%d) \
  --collection-ids=videos,works
```

## 🎉 期待される効果

### 運用改善
- ✅ **管理負荷 60%削減**: 単一プロジェクト管理
- ✅ **デプロイ時間 40%短縮**: 統合CI/CDパイプライン
- ✅ **監視統合**: 一元的なログ・メトリクス確認

### コスト改善
- ✅ **月額コスト 40-60%削減**: 重複リソース排除
- ✅ **データ転送費削減**: 統合ストレージ
- ✅ **管理工数削減**: 個人開発者の時間コスト削減

### 開発効率
- ✅ **環境切り替え簡素化**: branch-based deployment
- ✅ **一貫した開発体験**: prod/dev環境の構成統一
- ✅ **将来拡張性**: 段階的機能追加への対応力

**結論**: 個人開発における取り回しの良さと、実用的なコスト削減を両立できる現実的な設計案です。