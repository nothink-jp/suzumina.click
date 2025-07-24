# Claude Workflow統合ガイド

## 概要

複数存在していたClaude関連のGitHub Actionsワークフローを1つに統合しました。

## 統合前の状況

以下の4つのワークフローが存在していました：

1. **claude-code.yml** - プレースホルダー実装（PR詳細取得のみ）
2. **claude-pr-review.yml** - 最小限のプレースホルダー実装
3. **claude-pr-review-secure.yml** - 実際のClaude API呼び出し実装
4. **claude-pr-assistant.yml.disabled** - 無効化されたプレースホルダー

## 統合後の構成

### 統合されたワークフロー: `claude-code-review.yml`

すべての機能を1つのワークフローに統合しました：

- **トリガー**: 
  - `issue_comment` (PRコメント)
  - `pull_request_review_comment` (PRレビューコメント)
- **機能**:
  - @claudeメンションの検出
  - 実際のClaude API呼び出し
  - セキュアな実装（PRコードのチェックアウトなし）
  - エラーハンドリング

### 削除されたファイル

```
.github/workflows/claude-code.yml
.github/workflows/claude-pr-review.yml
.github/workflows/claude-pr-review-secure.yml
```

## メリット

1. **メンテナンス性向上**: 1つのファイルで管理
2. **重複の排除**: 同じロジックの繰り返しを削除
3. **一貫性**: すべてのClaude関連機能が同じ実装
4. **シンプル**: ワークフロー管理が簡潔に

## 使用方法

変更なし - 今まで通り@claudeメンションで動作します：

```
@claude このコードをレビューしてください
```

## 技術的詳細

- Node.js 20を使用（v16の廃止警告対応）
- GitHub Script v7で統一
- PR番号の取得をイベントタイプに応じて適切に処理
- セキュリティ考慮事項は維持（コードチェックアウトなし）