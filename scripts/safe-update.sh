#!/bin/bash

# 安全な依存関係更新スクリプト
# Usage: ./scripts/safe-update.sh [type]
# Types: patch, minor, major, dev, security

set -e

UPDATE_TYPE=${1:-"patch"}
BRANCH_NAME="dependency-update-$(date +%Y%m%d)"

echo "🚀 Safe Dependency Update Script"
echo "Update type: $UPDATE_TYPE"
echo "Branch: $BRANCH_NAME"

# 現在の状態を保存
echo "📦 Creating backup branch..."
git stash push -m "Pre-update stash $(date)"
git checkout -b "$BRANCH_NAME"

# 更新前の状態確認
echo "🔍 Current dependency status..."
pnpm outdated || true
pnpm audit || true

# 更新タイプ別の処理
case $UPDATE_TYPE in
  "patch")
    echo "🩹 Applying patch updates..."
    pnpm update
    ;;
  "minor")
    echo "🔄 Applying minor updates..."
    pnpm update
    # 特定パッケージの個別更新
    pnpm add @types/react@latest @types/node@latest @types/react-dom@latest
    ;;
  "major")
    echo "⚡ Major update mode - Interactive selection"
    echo "Please update packages individually:"
    echo "  pnpm add package@latest"
    echo "Then run: pnpm test && pnpm typecheck && pnpm build"
    exit 0
    ;;
  "dev")
    echo "🛠️ Updating dev dependencies..."
    pnpm update --dev
    ;;
  "security")
    echo "🔒 Applying security fixes..."
    pnpm audit --fix
    ;;
  *)
    echo "❌ Invalid update type: $UPDATE_TYPE"
    echo "Valid types: patch, minor, major, dev, security"
    exit 1
    ;;
esac

# 更新後検証
echo "🧪 Running verification tests..."

# TypeScript チェック
echo "  ├─ TypeScript check..."
if ! pnpm typecheck; then
  echo "❌ TypeScript check failed"
  exit 1
fi

# リント チェック
echo "  ├─ Lint check..."
if ! pnpm lint; then
  echo "❌ Lint check failed"
  exit 1
fi

# ビルド チェック
echo "  ├─ Build check..."
if ! pnpm build; then
  echo "❌ Build check failed"
  exit 1
fi

# テスト実行
echo "  ├─ Test execution..."
if ! pnpm test; then
  echo "❌ Tests failed"
  exit 1
fi

# 更新後の状態確認
echo "📊 Post-update status..."
pnpm outdated || true
pnpm audit || true

echo "✅ Dependency update completed successfully!"
echo "📝 Next steps:"
echo "  1. Review changes: git diff main"
echo "  2. Test E2E: pnpm test:e2e"
echo "  3. Commit changes: git add . && git commit -m 'chore: update dependencies'"
echo "  4. Create PR: gh pr create"
echo "  5. Merge after review"

echo "🔄 To rollback if needed:"
echo "  git checkout main && git branch -D $BRANCH_NAME"