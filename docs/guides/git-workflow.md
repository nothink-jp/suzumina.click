# Git ワークフロー・ブランチ戦略

suzumina.click プロジェクトのGit運用ガイド（Claude Code連携最適化）

## 🎯 Session Branch 戦略

### 基本概念

Claude Codeとの協働開発に最適化されたブランチ戦略。認知負荷最小で効率的な履歴管理を実現。

```text
main ← session/YYYYMMDD-HHMM ← 開発作業
 ↓              ↓                ↓
本番環境    セッション単位      Claude Code
        履歴管理            作業ブランチ
```

### 📋 基本ワークフロー（4ステップ）

#### 1. セッション開始

```bash
./scripts/git-claude-start
# → mainから最新取得 + session/YYYYMMDD-HHMM ブランチ作成・切り替え
```

#### 2. 開発作業指示

```text
Claude Codeに対する指示例：
「音声ボタンのお気に入り機能を追加して下さい」
「管理者ダッシュボードのユーザー統計を修正して下さい」
「TypeScriptエラーを修正して下さい」
```

#### 3. 品質確認

```bash
# Claude Code作業完了後、品質チェック実行
pnpm check          # lint + typecheck + test
pnpm build          # ビルド確認
```

#### 4. セッション終了

```bash
./scripts/git-claude-done
# → mainブランチに切り替え + マージ + セッションブランチ削除

git push origin main
# → リモートにpush（デプロイトリガー）
```

## 🔧 実装機能

### Git Hooks 自動警告

- mainブランチ直接push時に3秒警告
- Session Branch戦略の推奨メッセージ表示

### スクリプト詳細

#### `./scripts/git-claude-start`

```bash
#!/bin/bash
# mainブランチから最新を取得
git checkout main
git pull origin main

# セッションブランチ作成・切り替え
session_name="session/$(date +%Y%m%d-%H%M)"
git checkout -b "$session_name"

echo "✅ Session branch created: $session_name"
echo "🚀 Ready for Claude Code development"
```

#### `./scripts/git-claude-done`

```bash
#!/bin/bash
# 現在のブランチ名を取得
current_branch=$(git branch --show-current)

# mainブランチに切り替え
git checkout main

# セッションブランチをマージ（--no-ff でマージコミット作成）
git merge --no-ff "$current_branch"

# セッションブランチを削除
git branch -d "$current_branch"

echo "✅ Session completed and merged to main"
echo "💡 Don't forget: git push origin main"
```

## 📂 ブランチ命名規則

### Session Branch (推奨)
- **session/YYYYMMDD-HHMM**: Claude Codeセッション単位
- 例: `session/20250705-1430`, `session/20250705-2100`

### 機能ブランチ (必要時のみ)
- **feature/[task]-YYYYMMDD-HHMM**: 新機能開発
- **fix/[task]-YYYYMMDD-HHMM**: バグ修正
- **docs/[task]-YYYYMMDD-HHMM**: ドキュメント更新
- **chore/[task]-YYYYMMDD-HHMM**: その他（リファクタリング・設定変更）

## ⚡ 高速化・最適化

### CI/CD最適化

#### 問題
- **過剰なデプロイトリガー**: packages配下の変更で全アプリがデプロイ
- **冗長なテスト実行**: 各デプロイワークフローで同じテストを重複実行
- **過度なセキュリティスキャン**: 個人開発には不要な毎日実行

#### 解決策
- **パス指定トリガー**: アプリ別変更検知
- **共通テストワークフロー**: 重複削除
- **軽量セキュリティ**: 必要最小限のスキャン

### 軽量PR Workflow（任意）

```bash
# PR作成・確認（デプロイなし）
git checkout -b review/feature-name
git push origin review/feature-name
# → GitHub PR作成（レビュー目的・デプロイトリガーなし）

# マージ後セッション完了
git checkout main
git pull origin main
git branch -d review/feature-name
```

## 🎯 Session Branch戦略の利点

### 認知負荷最小化
- ブランチ名を考える必要なし（タイムスタンプ自動生成）
- 4ステップの単純なワークフロー
- Claude Codeとの連携に最適

### 履歴管理の改善
- セッション単位での明確な履歴
- ロールバックが容易
- 作業内容の追跡可能

### 運用効率化
- 自動化スクリプトによる操作簡素化
- 品質チェックの統合
- デプロイタイミングの制御

## 📊 効果測定

### Before (mainブランチ直接開発)
- 認知負荷: 高（ブランチ戦略なし）
- 履歴管理: 困難（直接push）
- ロールバック: 困難（コミット単位）

### After (Session Branch戦略)
- 認知負荷: 最小（4ステップ）
- 履歴管理: 明確（セッション単位）
- ロールバック: 容易（マージコミット単位）

## 🚨 緊急時対応

### Hot Fix (緊急修正)

```bash
# mainブランチで直接修正（例外的）
git checkout main
# 緊急修正作業
git add . && git commit -m "hotfix: 緊急修正"
git push origin main
```

### ロールバック

```bash
# 前セッションの状態に戻す
git revert -m 1 HEAD
git push origin main

# または特定コミットまで戻す
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

## 📚 関連ドキュメント

- **[デプロイメントガイド](./DEPLOYMENT_GUIDE.md)** - CI/CD・本番デプロイ
- **[開発ガイド](./DEVELOPMENT.md)** - 開発環境・品質基準
- **[クイックリファレンス](./QUICK_REFERENCE.md)** - 日常的なコマンド
- **[プロジェクト概要](../README.md)** - 全体構成・技術スタック