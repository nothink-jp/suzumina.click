# Terraform管理ガイド

suzumina.clickプロジェクトのTerraformインフラ管理のためのツールとベストプラクティス。

## 🚀 クイックスタート

### 即座のロック解除（緊急時）

```bash
cd terraform

# 1. 現在のロック状況を確認
make lock-status

# 2. 緊急時は自動解除（5分以上経過したロック）
make emergency-unlock

# 3. 手動解除（ロックIDが分かっている場合）
make unlock ID=1750667738400125
```

### 通常の運用フロー

```bash
# 1. 設定確認とフォーマット
make validate fmt

# 2. 変更プランの確認
make plan

# 3. 安全な適用（自動ロック処理付き）
make apply
```

## 🔧 ツールの説明

### 1. 自動ロック管理スクリプト (`scripts/tf-lock-check.sh`)

#### 機能
- **自動ロック検出**: ロック状態を自動チェック
- **古いロック削除**: 5分以上経過したロックを自動削除
- **安全な実行**: プラン→適用の安全なワークフロー
- **タイムアウト対応**: 30分でタイムアウト設定

#### 使用方法
```bash
./scripts/tf-lock-check.sh status    # ロック状況確認
./scripts/tf-lock-check.sh cleanup   # 古いロック削除
./scripts/tf-lock-check.sh apply     # 安全な適用
./scripts/tf-lock-check.sh unlock ID # 手動解除
```

### 2. Makefile コマンド

| コマンド | 説明 | 安全性 |
|---------|-----|-------|
| `make help` | ヘルプ表示 | ✅ 安全 |
| `make init` | Terraform初期化 | ✅ 安全 |
| `make validate` | 設定ファイル検証 | ✅ 安全 |
| `make fmt` | コードフォーマット | ✅ 安全 |
| `make plan` | 実行プラン確認 | ✅ 安全 |
| `make apply` | **自動適用** | ⚠️ 変更あり |
| `make apply-manual` | 手動確認後適用 | ⚠️ 変更あり |
| `make lock-status` | ロック状況確認 | ✅ 安全 |
| `make unlock ID=xxx` | 手動ロック解除 | ⚠️ 注意 |
| `make cleanup` | 古いロック削除 | ⚠️ 注意 |
| `make emergency-unlock` | 緊急ロック解除 | 🚨 緊急時のみ |

## 🔒 ロック問題の対応フロー

### Step 1: 状況確認
```bash
make lock-status
```

### Step 2: 自動解決を試行
```bash
# 5分以上経過したロックを自動削除
make cleanup
```

### Step 3: 手動解除（必要時）
```bash
# エラーメッセージからロックIDを取得して実行
make unlock ID=1750667738400125
```

### Step 4: 緊急時対応
```bash
# 全てのロックを強制解除（最終手段）
make emergency-unlock
```

## 📋 ベストプラクティス

### 1. 日常運用
```bash
# 毎回この順序で実行
make validate fmt    # 設定確認
make plan           # 変更内容確認
make apply          # 安全な適用
```

### 2. チーム開発時の注意点
- **同時実行を避ける**: 複数人で同時にterraform applyしない
- **作業予告**: Slackなどで作業開始を通知
- **短時間で完了**: 長時間のロックを避ける

### 3. ロック予防策
- **定期的なapply**: 変更を溜め込まない
- **プラン確認**: 想定外の変更がないか事前チェック
- **タイムアウト設定**: 30分で自動終了

## 🚨 トラブルシューティング

### よくある問題と解決法

#### 1. "Error acquiring the state lock"
```bash
# 解決法1: 自動クリーンアップ
make cleanup

# 解決法2: 手動解除
make unlock ID=<LOCK_ID>

# 解決法3: 緊急解除
make emergency-unlock
```

#### 2. "googleapi: Error 412: conditionNotMet"
```bash
# ロックファイルの競合状態
# 少し待ってから再実行
sleep 30 && make apply
```

#### 3. タイムアウトでロックが残る
```bash
# 30分後に自動削除されるが、手動でも可能
make cleanup
```

### ログ確認方法
```bash
# Cloud Storageのロックファイル確認
gsutil ls gs://suzumina-click-tfstate/terraform/state/
gsutil cat gs://suzumina-click-tfstate/terraform/state/production.tflock
```

## ⚙️ 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `TF_VAR_FILE` | `terraform.tfvars` | 設定ファイルパス |
| `SCRIPT_DIR` | `scripts` | スクリプトディレクトリ |

## 📚 関連ドキュメント

- **[プロジェクト概要](../README.md)** - メインプロジェクト情報
- **[インフラアーキテクチャ](../docs/INFRASTRUCTURE_ARCHITECTURE.md)** - 全体設計・認証設定
- **[デプロイ戦略](../docs/DEPLOYMENT_STRATEGY.md)** - デプロイ・運用方針
- **[Terraform公式ドキュメント](https://www.terraform.io/docs)** - Terraformの基本情報
- **[Google Cloud Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)** - GCPプロバイダー情報

---

**🔴 重要**: 本番環境での操作は必ず事前にプランを確認してから実行してください。