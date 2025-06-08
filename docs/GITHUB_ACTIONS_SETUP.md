# GitHub Actions セットアップガイド

このドキュメントは、Cloud Functions を自動デプロイするための GitHub Actions ワークフローの設定手順を説明します。

## 前提条件

1. Terraform による GCP インフラストラクチャの構築が完了していること
2. GitHub リポジトリが `nothink-jp/suzumina.click` であること

## GitHub Secrets の設定

以下の **2つの Secrets** を GitHub リポジトリに設定するだけで済みます：

### 1. GCP_PROJECT_ID
- **値**: あなたの GCP プロジェクト ID
- **例**: `my-project-12345`

### 2. GCP_PROJECT_NUMBER
- **値**: あなたの GCP プロジェクト番号
- **例**: `123456789012`

> **簡素化**: サービスアカウントメールアドレスと Workload Identity Provider はワークフロー内で自動的に構築されます

## 値の取得方法

### GCP_PROJECT_NUMBER の取得

```bash
# Terraform から出力値を取得
cd terraform
terraform output project_number

# または gcloud コマンドで取得
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
```

### 自動構築される値（設定不要）

ワークフローで自動的に以下の値が構築されます：

- **サービスアカウント**: `cloud-functions-deployer-sa@{GCP_PROJECT_ID}.iam.gserviceaccount.com`
- **Workload Identity Provider**: `projects/{GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/providers/github-provider`

## GitHub Secrets の設定手順

1. GitHub リポジトリの **Settings** > **Secrets and variables** > **Actions** に移動
2. **New repository secret** をクリック
3. 上記の **2つの値** をそれぞれ設定

## デプロイされる関数

このワークフローは以下の Cloud Functions をデプロイします：

| 関数名 | エントリーポイント | Pub/Sub トリガー |
|--------|-------------------|------------------|
| `fetchYouTubeVideos` | `fetchYouTubeVideos` | `youtube-video-fetch-trigger` |
| `fetchDLsiteWorks` | `fetchDLsiteWorks` | `dlsite-works-fetch-trigger` |

## デプロイ設定

- **ランタイム**: Node.js 22
- **リージョン**: asia-northeast1  
- **トリガー**: Pub/Sub (各関数専用のトピック)
- **認証**: Workload Identity Federation

## トラブルシューティング

### よくある問題

1. **Workload Identity Pool が見つからない**
   - Terraform apply が完了していることを確認
   - PROJECT_NUMBER が正しいことを確認

2. **サービスアカウントの権限エラー**
   - `cloud-functions-deployer-sa` に適切な権限が付与されていることを確認
   - IAM設定を再確認

3. **Pub/Sub トピックが見つからない**
   - `terraform/pubsub.tf` で定義されたトピックが作成済みであることを確認

### ログの確認

GitHub Actions のログで詳細なエラー情報を確認できます：
- **Actions** タブ > 失敗したワークフロー実行 > ステップの詳細

### 手動テスト

```bash
# Cloud Functions が正しくデプロイされているか確認
gcloud functions list --region=asia-northeast1

# Pub/Sub トピックの確認  
gcloud pubsub topics list