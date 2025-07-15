#!/bin/bash

# shadcn/ui 更新チェッカー
# suzumina.click プロジェクト専用
# 作成日: 2025年7月15日

set -euo pipefail

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 関数定義
print_header() {
    echo -e "${CYAN}======================================${NC}"
    echo -e "${CYAN}  shadcn/ui 更新チェッカー${NC}"
    echo -e "${CYAN}  suzumina.click プロジェクト${NC}"
    echo -e "${CYAN}======================================${NC}"
    echo
}

print_section() {
    echo -e "${BLUE}📋 $1${NC}"
    echo
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# メイン実行
main() {
    print_header
    
    # 作業ディレクトリの確認
    if [ ! -f "package.json" ] || [ ! -d "src/components/ui" ]; then
        print_error "packages/ui ディレクトリから実行してください"
        exit 1
    fi
    
    print_section "現在のカスタマイゼーション状況"
    
    # Critical カスタマイゼーション
    echo -e "${RED}🔴 Critical カスタマイゼーション (テスト必須)${NC}"
    echo "- button.tsx: レスポンシブ + アクセシビリティ + SVG統合"
    echo "- dialog.tsx: showCloseButton 独自プロパティ"
    echo
    
    # Medium カスタマイゼーション
    echo -e "${YELLOW}🟡 Medium カスタマイゼーション (選択的対応)${NC}"
    echo "- select.tsx: size プロパティ"
    echo "- tabs.tsx: suzuka-500 カラー (涼花みなせテーマ)"
    echo "- switch.tsx: suzuka-400/500 カラー"
    echo "- card.tsx: CardAction コンポーネント"
    echo "- alert.tsx: Grid レイアウト"
    echo "- dropdown-menu.tsx: inset, variant プロパティ"
    echo "- navigation-menu.tsx: viewport 制御"
    echo "- table.tsx: レスポンシブ対応"
    echo "- pagination.tsx: isActive プロパティ"
    echo "- sheet.tsx: side プロパティ"
    echo
    
    # Low カスタマイゼーション
    echo -e "${GREEN}🟢 Low カスタマイゼーション (手動確認で十分)${NC}"
    echo "- 35コンポーネント: data-slot属性のみ"
    echo
    
    print_section "利用可能な更新確認"
    
    # shadcn/ui の更新確認
    echo "📦 shadcn/ui 更新可能コンポーネント:"
    echo
    
    if command -v pnpm &> /dev/null; then
        if pnpm dlx shadcn@canary diff --list > /dev/null 2>&1; then
            pnpm dlx shadcn@canary diff --list
        else
            print_warning "shadcn/ui の更新確認でエラーが発生しました"
        fi
    else
        print_error "pnpm がインストールされていません"
    fi
    
    echo
    
    print_section "更新前の重要確認事項"
    
    echo -e "${RED}🚨 更新前に必ず確認してください:${NC}"
    echo
    echo "1. 📋 CUSTOMIZATIONS.md を確認"
    echo "   - Critical カスタマイゼーションの詳細"
    echo "   - 更新時チェックリストの確認"
    echo
    echo "2. 🧪 現在のテスト状態確認"
    echo "   - pnpm test -- button.test.tsx"
    echo "   - pnpm test -- dialog.test.tsx"
    echo
    echo "3. 💾 バックアップの作成"
    echo "   - cp src/components/ui/button.tsx src/components/ui/button.backup.tsx"
    echo "   - cp src/components/ui/dialog.tsx src/components/ui/dialog.backup.tsx"
    echo
    echo "4. 🔍 変更内容の事前確認"
    echo "   - pnpm dlx shadcn@canary diff button"
    echo "   - pnpm dlx shadcn@canary diff dialog"
    echo
    
    print_section "推奨更新手順"
    
    echo -e "${BLUE}📖 詳細な更新手順:${NC}"
    echo "1. UPDATE_CHECKLIST.md を参照"
    echo "2. Phase 1: 更新前確認 (1時間)"
    echo "3. Phase 2: 更新実行 (1時間)"
    echo "4. Phase 3: テスト・検証 (30分)"
    echo
    
    print_section "Critical コンポーネントの詳細"
    
    echo -e "${RED}🔴 button.tsx の重要カスタマイゼーション:${NC}"
    echo "- h-11 sm:h-9 (レスポンシブサイズ)"
    echo "- focus-visible:ring-[3px] (アクセシビリティ)"
    echo "- has-[>svg]:px-3 (SVG統合)"
    echo "- transition-all (アニメーション)"
    echo "- data-slot=\"button\" (識別属性)"
    echo
    
    echo -e "${RED}🔴 dialog.tsx の重要カスタマイゼーション:${NC}"
    echo "- showCloseButton?: boolean (独自プロパティ)"
    echo "- max-w-[calc(100%-2rem)] (レスポンシブ幅)"
    echo "- データ属性アニメーション設定"
    echo "- data-slot=\"dialog-content\" (識別属性)"
    echo
    
    print_section "次回更新予定"
    
    current_month=$(date +%m)
    current_year=$(date +%Y)
    
    if [ "$current_month" -ge 7 ]; then
        next_update_year=$((current_year + 1))
        next_update_month="1月"
    else
        next_update_year=$current_year
        next_update_month="7月"
    fi
    
    echo -e "${PURPLE}📅 次回更新予定: ${next_update_year}年${next_update_month}${NC}"
    echo
    
    print_section "緊急時の対応"
    
    echo -e "${YELLOW}🚨 問題発生時の対応:${NC}"
    echo "1. バックアップからの復元"
    echo "   - cp src/components/ui/button.backup.tsx src/components/ui/button.tsx"
    echo "   - cp src/components/ui/dialog.backup.tsx src/components/ui/dialog.tsx"
    echo
    echo "2. テストの再実行"
    echo "   - pnpm test -- button.test.tsx"
    echo "   - pnpm test -- dialog.test.tsx"
    echo
    echo "3. 開発サーバーでの動作確認"
    echo "   - pnpm dev"
    echo
    
    print_section "有用なリンク"
    
    echo "📚 参考資料:"
    echo "- CUSTOMIZATIONS.md: 全カスタマイゼーション詳細"
    echo "- UPDATE_CHECKLIST.md: 詳細な更新手順"
    echo "- shadcn/ui 公式: https://ui.shadcn.com/"
    echo "- 更新履歴: https://github.com/shadcn-ui/ui/releases"
    echo
    
    print_section "実行推奨コマンド"
    
    echo -e "${GREEN}✅ 更新作業を開始する場合:${NC}"
    echo "1. cat UPDATE_CHECKLIST.md  # 詳細手順の確認"
    echo "2. cat CUSTOMIZATIONS.md   # カスタマイゼーション詳細の確認"
    echo "3. git checkout -b feature/shadcn-ui-update-$(date +%Y%m%d)  # 作業ブランチ作成"
    echo
    
    print_success "更新チェックが完了しました"
    print_info "安全な更新作業を実施してください"
    
    echo
    print_header
}

# スクリプト実行
main "$@"