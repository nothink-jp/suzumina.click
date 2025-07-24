# Claude GitHub統合 - 実装状況

## 現在の実装状態

### ✅ 完了している機能

1. **GitHub App インストール**
   - https://github.com/apps/claude でインストール済み

2. **GitHub Actions ワークフロー**
   - `@claude`メンションの検知
   - PR情報の取得（タイトル、本文、差分、変更ファイル）
   - コメントへの自動応答

3. **セキュリティ対策**
   - 最小限の権限設定
   - 信頼できないコードのチェックアウト回避
   - Node.js 20の使用

### ❌ 未実装の機能

1. **Anthropic API統合**
   - API Keyの設定が必要
   - 実際のClaude APIコール実装が必要

2. **高度なコードレビュー機能**
   - コード差分の解析
   - 改善提案の生成
   - テストケースの提案

## 動作確認方法

現在の実装でできること：

1. PR #96 または PR #97 で以下のようにコメント:
   ```
   @claude hello
   ```

2. GitHub Actionsが起動し、以下の応答が返されます：
   - PR情報の確認
   - 変更ファイル数の表示
   - プレースホルダーメッセージ

## 完全な統合に必要な手順

### 1. Anthropic API Key の設定
```bash
# リポジトリ設定でシークレットを追加
https://github.com/nothink-jp/suzumina.click/settings/secrets/actions/new
Name: ANTHROPIC_API_KEY
Value: [あなたのAPI Key]
```

### 2. Claude API 統合の実装

実際のAPI呼び出しを実装する必要があります。以下は実装例：

```javascript
// ワークフロー内でのClaude API呼び出し例
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-opus-20240229',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `PRをレビューしてください:\n\n${pr_diff}`
    }]
  })
});
```

### 3. 実装オプション

#### オプション A: カスタムGitHub Action
独自のGitHub Actionを作成し、Claude APIを統合

#### オプション B: 外部サービス
- Webhookを使用して外部サービスに転送
- 外部サービスでClaude APIを呼び出し
- GitHub APIで結果を投稿

#### オプション C: GitHub App
- 専用のGitHub Appを開発
- より高度な権限管理とイベント処理

## 推奨される次のステップ

1. **まずは現在の実装でテスト**
   - PR #96 または #97 で `@claude` メンションをテスト
   - 基本的な動作を確認

2. **API Keyを設定後、簡単な統合から開始**
   - 単純なメッセージ応答から実装
   - 徐々に機能を拡張

3. **セキュリティを常に意識**
   - API Keyの安全な管理
   - レート制限の実装
   - エラーハンドリング

## 制限事項

- API利用料金が発生（従量課金）
- レート制限あり
- 大きなPRでは文字数制限に注意