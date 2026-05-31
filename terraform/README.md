# Terraform管理ガイド

suzumina.clickプロジェクトのTerraformインフラ管理ガイド。

## 🚀 基本操作

### 通常の運用フロー

```bash
cd terraform

# 1. 設定確認とフォーマット
terraform validate
terraform fmt

# 2. 変更プランの確認
terraform plan

# 3. 変更適用
terraform apply
```

### ロック問題が発生した場合

```bash
# ロック状況確認
gsutil ls gs://suzumina-click-tfstate/terraform/state/production.tflock

# 手動ロック解除（ロックIDはエラーメッセージから取得）
terraform force-unlock <LOCK_ID>

# または直接ロックファイルを削除
gsutil rm gs://suzumina-click-tfstate/terraform/state/production.tflock
```

## 📋 ベストプラクティス

### 1. 日常運用
```bash
# 毎回この順序で実行
terraform validate   # 設定確認
terraform fmt       # フォーマット
terraform plan      # 変更内容確認
terraform apply     # 変更適用
```

### 2. チーム開発時の注意点
- **同時実行を避ける**: 複数人で同時にterraform applyしない
- **作業予告**: 事前に作業開始を通知
- **短時間で完了**: 長時間のロックを避ける

### 3. ロック予防策
- **定期的なapply**: 変更を溜め込まない
- **プラン確認**: 想定外の変更がないか事前チェック

## 🚨 トラブルシューティング

### よくある問題と解決法

#### 1. "Error acquiring the state lock"
```bash
# 解決法1: 手動ロック解除
terraform force-unlock <LOCK_ID>

# 解決法2: 直接ロックファイル削除
gsutil rm gs://suzumina-click-tfstate/terraform/state/production.tflock
```

#### 2. "googleapi: Error 412: conditionNotMet"
```bash
# ロックファイルの競合状態
# 少し待ってから再実行
sleep 30 && terraform apply
```

#### 3. "Revision ... is not ready" / "Image '...web:<sha>' not found" (SPR-67)

Cloud Run の image は **GitHub Actions（`deploy-web.yml`）が `gcloud run deploy` でデプロイ**し、
Terraform は `data.google_cloud_run_v2_service.current` 経由で稼働中サービスの image を
読み取って追従する（`terraform/cloud_run.tf`）。これにより state に古い image SHA は残らず、
通常運用でこのエラーは発生しない。

万一発生した場合（例: `-refresh=false` で apply した／state が長期間古いまま）の復旧:

```bash
# 1. state を実体に同期（最優先。これだけで解消することが多い）
terraform apply -refresh-only

# 2. 差分を確認してから適用
terraform plan
terraform apply
```

> ⚠️ `terraform apply -refresh=false` は state を古いままにし image 乖離を再発させるため使用しない。

### 初回 apply / 災害復旧（サービス未作成）

Cloud Run サービスがまだ存在しない状態では上記 data source が読めず `plan` が失敗する。
その場合は **一度だけ** bootstrap モードで `:latest` 起動する:

```bash
# 1. サービスを :latest で新規作成
terraform apply -var="cloud_run_bootstrap=true"

# 2. GitHub Actions（Deploy Web）でアプリ image を本デプロイ

# 3. 以降は通常運用（bootstrap=false がデフォルト）に戻す
terraform plan
```

### ログ確認方法
```bash
# Cloud Storageのロックファイル確認
gsutil ls gs://suzumina-click-tfstate/terraform/state/
gsutil cat gs://suzumina-click-tfstate/terraform/state/production.tflock
```

## 📚 関連ドキュメント

- **[プロジェクト概要](../README.md)** - メインプロジェクト情報
- **[インフラアーキテクチャ](../docs/reference/infrastructure-architecture.md)** - 全体設計・認証設定
- **[デプロイガイド](../docs/guides/deployment.md)** - デプロイ・運用方針
- **[Terraform公式ドキュメント](https://www.terraform.io/docs)** - Terraformの基本情報
- **[Google Cloud Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)** - GCPプロバイダー情報

---

**🔴 重要**: 本番環境での操作は必ず事前にプランを確認してから実行してください。