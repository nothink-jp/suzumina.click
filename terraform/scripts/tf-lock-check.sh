#!/bin/bash

# Terraform Lock Management Script
# Usage: ./tf-lock-check.sh [unlock|status|apply]

set -e

TFSTATE_BUCKET="suzumina-click-tfstate"
LOCK_PATH="terraform/state/production.tflock"

# 色付きメッセージ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ロック状態を確認
check_lock_status() {
    log_info "Terraformロック状態を確認中..."
    
    if gsutil ls "gs://${TFSTATE_BUCKET}/${LOCK_PATH}" 2>/dev/null; then
        log_warn "ロックファイルが存在します"
        
        # ロック詳細情報を表示
        gsutil cat "gs://${TFSTATE_BUCKET}/${LOCK_PATH}" 2>/dev/null || {
            log_error "ロック詳細の取得に失敗しました"
            return 1
        }
        return 1
    else
        log_info "ロックは検出されませんでした"
        return 0
    fi
}

# 古いロックを自動削除（5分以上経過した場合）
auto_cleanup_old_locks() {
    log_info "古いロックの自動クリーンアップを確認中..."
    
    if gsutil ls "gs://${TFSTATE_BUCKET}/${LOCK_PATH}" 2>/dev/null; then
        # ロックファイルの作成時刻を取得
        LOCK_TIME=$(gsutil stat "gs://${TFSTATE_BUCKET}/${LOCK_PATH}" | grep "Creation time" | awk '{print $3, $4}')
        LOCK_TIMESTAMP=$(date -d "$LOCK_TIME" +%s 2>/dev/null || echo "0")
        CURRENT_TIMESTAMP=$(date +%s)
        
        # 5分 = 300秒
        if [ $((CURRENT_TIMESTAMP - LOCK_TIMESTAMP)) -gt 300 ]; then
            log_warn "5分以上経過した古いロックを削除します..."
            gsutil rm "gs://${TFSTATE_BUCKET}/${LOCK_PATH}"
            log_info "古いロックを削除しました"
        else
            log_warn "ロックは比較的新しいため、手動確認が必要です"
            return 1
        fi
    fi
}

# 安全なTerraform実行
safe_terraform_apply() {
    log_info "安全なTerraform実行を開始..."
    
    # ロック状況確認
    if ! check_lock_status; then
        log_warn "ロックが検出されました。自動クリーンアップを試行..."
        if ! auto_cleanup_old_locks; then
            log_error "手動でのロック解除が必要です"
            exit 1
        fi
    fi
    
    # Plan実行
    log_info "Terraform planを実行中..."
    if ! terraform plan -detailed-exitcode; then
        case $? in
            1)
                log_error "Terraform planでエラーが発生しました"
                exit 1
                ;;
            2)
                log_info "変更が検出されました。Applyを継続します"
                ;;
        esac
    else
        log_info "変更はありません"
        exit 0
    fi
    
    # Apply実行
    log_info "Terraform applyを実行中..."
    terraform apply -auto-approve || {
        log_error "Terraform applyが失敗しました"
        exit 1
    }
    
    log_info "Terraform applyが正常に完了しました"
}

# 手動ロック解除
manual_unlock() {
    local lock_id="$1"
    
    if [ -z "$lock_id" ]; then
        log_error "ロックIDが指定されていません"
        echo "Usage: $0 unlock <LOCK_ID>"
        exit 1
    fi
    
    log_warn "ロックID ${lock_id} を手動解除します..."
    terraform force-unlock "$lock_id"
}

# メイン処理
case "$1" in
    "status")
        check_lock_status
        ;;
    "unlock")
        manual_unlock "$2"
        ;;
    "apply")
        safe_terraform_apply
        ;;
    "cleanup")
        auto_cleanup_old_locks
        ;;
    *)
        echo "Usage: $0 {status|unlock <LOCK_ID>|apply|cleanup}"
        echo ""
        echo "Commands:"
        echo "  status          - ロック状態を確認"
        echo "  unlock <ID>     - 指定したロックIDを強制解除"
        echo "  apply           - 安全なTerraform apply実行"
        echo "  cleanup         - 古いロック（5分以上）を自動削除"
        exit 1
        ;;
esac