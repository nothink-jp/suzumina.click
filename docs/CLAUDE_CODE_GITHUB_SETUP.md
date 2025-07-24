# Claude Code GitHub統合セットアップガイド

## セットアップ完了状況

### ✅ 完了済み
1. **Claude GitHub Appのインストール**
   - https://github.com/apps/claude でインストール済み
   - `nothink-jp/suzumina.click` リポジトリに設定

2. **GitHub Actionsワークフローの作成**
   - `.github/workflows/claude-code.yml` - メインワークフロー
   - `.github/workflows/claude-pr-review.yml` - PRレビュー用ワークフロー

### ⏳ 必要な設定

#### 1. Anthropic API Keyの設定
以下のURLでリポジトリシークレットを追加してください：
https://github.com/nothink-jp/suzumina.click/settings/secrets/actions/new

- **Name**: `ANTHROPIC_API_KEY`
- **Value**: あなたのAnthropic API Key

#### 2. API Keyの取得方法
1. https://console.anthropic.com/ にアクセス
2. API Keys セクションに移動
3. 新しいAPI Keyを作成（または既存のものを使用）
4. キーをコピーして上記のGitHub Secretsに設定

## 使用方法

PR内でClaude Codeを呼び出すには、コメントで `@claude` をメンションします：

### 例：
```
@claude このPRのコードをレビューして、改善点を教えてください
```

```
@claude このテストが失敗する理由を教えて、修正方法を提案してください
```

```
@claude このコンポーネントのパフォーマンスを改善する方法を提案してください
```

## 動作確認

1. PR #96 (https://github.com/nothink-jp/suzumina.click/pull/96) でテスト
2. コメントに `@claude hello` と入力
3. GitHub Actionsが起動し、Claudeが応答することを確認

## トラブルシューティング

### Actionsが起動しない場合
- GitHub Appの権限を確認
- ワークフローファイルが正しい場所にあるか確認
- リポジトリのActions設定を確認

### API Keyエラーの場合
- Secretsが正しく設定されているか確認
- API Keyが有効か確認
- API利用制限に達していないか確認