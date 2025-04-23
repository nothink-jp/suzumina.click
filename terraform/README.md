# Terraform インフラ構成管理

## 概要

このディレクトリには、suzumina.clickプロジェクトのインフラをコードとして管理するためのTerraform設定が含まれています。Cloud Functions、Firestore、Pub/Sub、Cloud Scheduler、IAMなどのGCPリソースを一元管理します。

## 環境分離

本プロジェクトではTerraformの環境変数を使用して、以下の2つの環境を区別しています：

- **production**: 本番環境（デフォルト）
- **preview**: プレビュー環境（Pull Request確認用）

環境の切り替えは `environment` 変数を指定することで行います：

```bash
# プレビュー環境に切り替え
terraform apply -var="environment=preview"

# 本番環境（デフォルト）
terraform apply
```

## 主要ファイル構成

- `api_services.tf`: 有効化するGCP APIサービスの設定
- `backend.tf`: Terraformの状態管理設定（GCS）
- `cloudrun.tf`: Cloud Run サービスの定義
- `firebase.tf`: Firestore、Firebase関連リソース
- `function_common.tf`: 共通のCloud Functions設定
- `function_discord_auth.tf`: Discord認証関連のCloud Functions
- `function_youtube_videos.tf`: YouTube動画取得関連のCloud Functions
- `iam.tf`: IAM権限、サービスアカウント設定
- `providers.tf`: Google Cloudプロバイダー設定
- `pubsub.tf`: Pub/Subトピック定義
- `scheduler.tf`: Cloud Scheduler定義
- `secrets.tf`: Secret Manager設定
- `storage.tf`: Cloud Storage設定
- `variables.tf`: 変数定義

## Cloud Functions管理の統一

以前は一部のCloud Functionsが`firebase deploy`コマンドでデプロイされていましたが、現在はすべてのFunctionsをTerraformで管理しています。これにより以下のメリットがあります：

- インフラ全体の一元管理
- 環境（preview/production）ごとの設定分離
- IAMとの連携による適切な権限管理
- CI/CDパイプラインとの統合

**注意**: `firebase.json`にはFunctionsのコードベース設定が残っていますが、デプロイはTerraformで行っています。

## 新しいCloud Functionsの追加方法

1. `functions/src/` に必要な関数のコードを実装
2. 関数の種類に応じて適切なTerraformファイル（`function_*.tf`）に定義を追加
   - 共通の設定は `function_common.tf` に配置
   - 機能ごとに別ファイルに分けることを推奨
3. 必要なシークレット/IAM権限を設定
4. 環境変数で`ENVIRONMENT`を設定し、コード内で分岐処理が可能

## Terraform適用方法

```bash
cd terraform
# 初期化（初回のみ）
terraform init

# 変更内容確認
terraform plan -var="youtube_api_key=xxxxx"

# 適用（本番環境）
terraform apply -var="youtube_api_key=xxxxx"

# 適用（プレビュー環境）
terraform apply -var="youtube_api_key=xxxxx" -var="environment=preview"
```
