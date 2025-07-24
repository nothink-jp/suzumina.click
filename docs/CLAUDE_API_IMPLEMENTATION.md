# Claude API実装ガイド

## 概要

このPRで、実際のClaude APIを使用したコードレビュー機能を実装しました。

## 実装内容

### 1. カスタムGitHub Action
`/.github/actions/claude-review/action.yml`
- 再利用可能なComposite Action
- PR情報の取得とClaude APIの呼び出しを統合
- エラーハンドリング付き

### 2. 新しいワークフロー
`/.github/workflows/claude-pr-review-api.yml`
- `@claude`メンションで起動
- 実際のClaude APIを呼び出し
- レビュー結果をPRコメントとして投稿

### 3. 無効化されたワークフロー
- `claude-pr-assistant.yml` → `claude-pr-assistant.yml.disabled`
- プレースホルダー実装は無効化

## 使用方法

PRコメントで以下のようにメンションします：

```
@claude このコードをレビューしてください
```

```
@claude セキュリティの観点から確認をお願いします
```

```
@claude パフォーマンスの改善点を教えてください
```

## Claude APIの特徴

### 対応内容
- コード品質のレビュー
- バグの可能性の指摘
- パフォーマンスの提案
- セキュリティの懸念事項
- ベストプラクティスの提案

### 制限事項
- 最大10ファイルまでレビュー（コンテキストサイズ制限）
- 各ファイルの差分は最初の2000文字まで
- レスポンスは最大2048トークン

## API設定

### 必要なシークレット
- `ANTHROPIC_API_KEY`: Anthropic ConsoleのAPI Key

### API利用料
- Claude 3 Opus: 入力 $15/100万トークン、出力 $75/100万トークン
- 平均的なPRレビュー: 約$0.10-0.30

## トラブルシューティング

### エラーが発生する場合

1. **API Keyの確認**
   ```bash
   # シークレットが設定されているか確認
   https://github.com/[owner]/[repo]/settings/secrets/actions
   ```

2. **API利用制限**
   - Anthropic Consoleで利用状況を確認
   - クレジットが残っているか確認

3. **ワークフローログ**
   - GitHub Actionsタブでエラーログを確認

## セキュリティ考慮事項

- API Keyは環境変数経由でのみアクセス
- PRコードは直接チェックアウトしない
- GitHub APIを通じて安全に情報を取得

## 今後の改善案

1. **モデル選択オプション**
   - Claude 3 Sonnet（より安価）の選択肢
   - Haikuモデルでの簡易レビュー

2. **レビュー範囲の制御**
   - 特定ファイルのみレビュー
   - 言語別のレビュー設定

3. **キャッシング**
   - 同じPRへの繰り返しレビューの最適化