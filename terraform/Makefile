# Terraform Management Makefile
# 安全で効率的なTerraform操作のためのツール

.PHONY: help init plan apply destroy lock-status unlock cleanup validate fmt import-indexes list-indexes

# デフォルトのヘルプ
help:
	@echo "Terraform Management Commands:"
	@echo ""
	@echo "  make init          - Terraform初期化"
	@echo "  make validate      - 設定ファイルの検証"
	@echo "  make fmt           - コードフォーマット"
	@echo "  make plan          - 実行プランの確認"
	@echo "  make apply         - 安全な変更適用"
	@echo "  make destroy       - インフラ削除（要注意）"
	@echo ""
	@echo "Lock Management:"
	@echo "  make lock-status   - ロック状態確認"
	@echo "  make unlock ID=xxx - 手動ロック解除"
	@echo "  make cleanup       - 古いロック自動削除"
	@echo ""
	@echo "Firestore Management:"
	@echo "  make list-indexes  - 既存インデックス一覧表示"
	@echo "  make import-indexes - 既存インデックスを自動インポート"
	@echo "  make check-indexes - 簡易インデックス確認（推奨）"
	@echo ""
	@echo "Environment Variables:"
	@echo "  TF_VAR_FILE        - terraform.tfvars ファイルパス（デフォルト: terraform.tfvars）"

# 設定変数
TF_VAR_FILE ?= terraform.tfvars
SCRIPT_DIR = scripts

# Terraform初期化
init:
	@echo "🚀 Terraform初期化を実行中..."
	terraform init
	@echo "✅ 初期化完了"

# 設定ファイル検証
validate:
	@echo "🔍 Terraform設定を検証中..."
	terraform validate
	@echo "✅ 検証完了"

# コードフォーマット
fmt:
	@echo "🎨 Terraformコードをフォーマット中..."
	terraform fmt -recursive
	@echo "✅ フォーマット完了"

# 実行プラン確認
plan:
	@echo "📋 Terraform実行プランを確認中..."
	@if [ ! -f "$(TF_VAR_FILE)" ]; then \
		echo "❌ エラー: $(TF_VAR_FILE) が見つかりません"; \
		exit 1; \
	fi
	terraform plan -var-file="$(TF_VAR_FILE)"

# 安全な変更適用
apply:
	@echo "🔄 安全なTerraform適用を実行中..."
	@./$(SCRIPT_DIR)/tf-lock-check.sh apply

# 手動プラン後適用（通常のワークフロー）
apply-manual:
	@echo "📋 実行プランを確認してから適用..."
	@if [ ! -f "$(TF_VAR_FILE)" ]; then \
		echo "❌ エラー: $(TF_VAR_FILE) が見つかりません"; \
		exit 1; \
	fi
	terraform plan -var-file="$(TF_VAR_FILE)"
	@echo ""
	@read -p "この変更を適用しますか？ (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		terraform apply -var-file="$(TF_VAR_FILE)"; \
	else \
		echo "適用をキャンセルしました"; \
	fi

# インフラ削除（危険）
destroy:
	@echo "⚠️  警告: インフラを削除します"
	@echo "この操作は元に戻せません！"
	@read -p "本当に削除しますか？ (DELETE): " confirm; \
	if [ "$$confirm" = "DELETE" ]; then \
		terraform destroy -var-file="$(TF_VAR_FILE)"; \
	else \
		echo "削除をキャンセルしました"; \
	fi

# ロック管理
lock-status:
	@echo "🔒 Terraformロック状態を確認中..."
	@./$(SCRIPT_DIR)/tf-lock-check.sh status

unlock:
	@if [ -z "$(ID)" ]; then \
		echo "❌ エラー: ロックIDが必要です"; \
		echo "使用方法: make unlock ID=1234567890"; \
		exit 1; \
	fi
	@echo "🔓 ロック $(ID) を解除中..."
	@./$(SCRIPT_DIR)/tf-lock-check.sh unlock $(ID)

cleanup:
	@echo "🧹 古いロックをクリーンアップ中..."
	@./$(SCRIPT_DIR)/tf-lock-check.sh cleanup

# 開発用コマンド
dev-setup: init validate fmt
	@echo "🛠️  開発環境セットアップ完了"

# 本番適用前チェック
pre-production: validate fmt plan
	@echo "🚀 本番適用前チェック完了"
	@echo "問題なければ 'make apply' を実行してください"

# 緊急時復旧
emergency-unlock:
	@echo "🚨 緊急ロック解除モード"
	@echo "現在のロック状況："
	@./$(SCRIPT_DIR)/tf-lock-check.sh status || true
	@echo ""
	@read -p "すべてのロックを強制解除しますか？ (EMERGENCY): " confirm; \
	if [ "$$confirm" = "EMERGENCY" ]; then \
		./$(SCRIPT_DIR)/tf-lock-check.sh cleanup; \
		echo "緊急解除完了"; \
	else \
		echo "緊急解除をキャンセルしました"; \
	fi

# Firestoreインデックス管理
list-indexes:
	@echo "📋 Firestoreインデックス一覧を表示中..."
	@./$(SCRIPT_DIR)/list-firestore-indexes.sh

import-indexes:
	@echo "🔄 既存Firestoreインデックスをインポート中..."
	@./$(SCRIPT_DIR)/import-firestore-indexes.sh

check-indexes:
	@echo "🔍 Firestoreインデックス簡易確認..."
	@./$(SCRIPT_DIR)/simple-firestore-import.sh