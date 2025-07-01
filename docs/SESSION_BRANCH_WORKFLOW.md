# Session Branch Workflow Guide

## 🎯 Claude Code連携セッション管理手順書

### 📋 基本フロー（4ステップ）

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

### ⚡ 高速化機能

#### Git Hooks自動警告

- mainブランチ直接push時に3秒警告
- Session Branch戦略の推奨メッセージ表示

#### 軽量PR Workflow（任意）

```bash
# セッション終了前にPR作成する場合
gh pr create --title "session/20250701-1430の変更" --body "Claude Codeセッション作業内容"
# → 変更ファイルのみの高速品質チェック実行
```

### 🔄 トラブルシューティング

#### コンフリクト発生時

```bash
./scripts/git-claude-start
# 作業中にコンフリクト発生
git checkout main && git pull
git checkout session/20250701-1430
git rebase main
# コンフリクト解決後
./scripts/git-claude-done
```

#### 緊急時の手動操作

```bash
# セッション破棄
git checkout main && git branch -D session/YYYYMMDD-HHMM

# 強制マージ（非推奨）
git checkout main && git merge --no-ff session/YYYYMMDD-HHMM --force
```

### 💡 ベストプラクティス

- **1セッション1タスク**: 関連性の高い変更のみ
- **コミット前チェック**: `pnpm check` 必須実行
- **明確な指示**: Claude Codeに具体的なタスクを指示
- **定期push**: 長時間セッションでは中間push推奨

## まとめ

suzumina.click Session Branch戦略 v1.0 - 2025年7月対応
