# DLsiteパーサー開発・デバッグガイド

DLsiteパーサーの開発・改善・デバッグのための包括的ツールセットです。

## 🎯 概要

DLsiteのHTML構造変化によりパーサーが正常に動作しない場合の調査・修正を効率化するツール群です。

### 🆕 自動監視システムとの連携

リファクタリング（2025年7月4日）により、以下の自動システムが実装されています：

- **`dlsite-health-monitor.ts`**: 構造健全性の自動監視
- **`parser-config.ts`**: パーサー設定の外部管理
- **`error-handler.ts`**: 包括的エラー処理

これらのシステムと連携して、問題の早期発見と迅速な対応を実現します。

## 🛠️ 利用可能なツール

### 1. 🚀 クイックテスト（推奨・最初に使用）

実際のDLsite作品を使って素早くパーサーの動作確認を行います。

```bash
# 全サンプル作品のテスト
cd apps/functions
pnpm debug:quick

# 特定の作品IDをテスト
pnpm debug:quick RJ01052559
```

**出力例:**
```
🧪 Testing RJ01052559...
  📥 Fetching page...
  📄 HTML received: 45231 characters
  🔧 Parsing detail data...
  🔧 Testing search parser...
  ✅ Success! Data summary:
    📀 Tracks: 5
    📁 File info: ✓
    👥 Creator info: ✓
    🎁 Bonus content: ✗
    🖼️  High-res image: ✓
    📝 Description: ✓
```

### 2. 🔍 詳細デバッグツール

より詳細な分析とHTMLダンプ機能付きのテストツール。

```bash
# サンプルページのバッチテスト
pnpm debug:parser

# 特定作品の詳細テスト  
pnpm debug:parser --product-id RJ123456

# ローカルHTMLファイルのテスト
pnpm debug:parser --html-file ./debug-output/sample.html

# 失敗分析レポート
pnpm debug:parser --analyze-failures
```

**出力ファイル:**
- `debug-output/{productId}_raw.html` - 取得した生のHTML
- `debug-output/{productId}_result.json` - 抽出結果の詳細
- `debug-output/test_summary.json` - 全体サマリー

### 3. 📊 HTML構造変化監視

DLsiteのHTML構造変化を継続的に監視し、パーサー修正の必要性を早期検出します。

```bash
# ベースライン作成（初回）
pnpm debug:baseline

# 現在のページとベースラインを比較
pnpm debug:compare

# 継続監視開始（1時間間隔）
pnpm debug:monitor

# 30分間隔で監視
pnpm debug:monitor --interval 30
```

## 📁 デバッグ出力ディレクトリ

```
apps/functions/debug-output/
├── baselines/              # HTML構造のベースライン
│   ├── RJ123456_baseline.json
│   └── RJ123456_baseline.html
├── change-reports/         # 変化検出レポート
│   ├── RJ123456_change_1234567890.json
│   └── overall_report_1234567890.json  
├── RJ123456_raw.html      # 取得したHTML
├── RJ123456_result.json   # パース結果
└── test_summary.json      # テスト全体サマリー
```

## 🐛 トラブルシューティング手順

### 1. パーサーが動作しない場合

```bash
# Step 1: クイックテストで現状確認
pnpm debug:quick

# Step 2: 特定の作品で詳細確認
pnpm debug:parser --product-id <失敗したID>

# Step 3: HTMLを保存して構造確認
ls debug-output/<ID>_raw.html
```

### 2. データ抽出率が低い場合

```bash
# Step 1: ベースライン作成
pnpm debug:baseline

# Step 2: 構造変化の確認
pnpm debug:compare

# Step 3: 具体的な変化の特定
cat debug-output/change-reports/overall_report_*.json
```

### 3. 新しいセレクターの調査

保存されたHTMLファイルをブラウザで開き、DevToolsでセレクターを調査：

```bash
# HTMLファイルを保存
pnpm debug:parser --product-id RJ123456

# ブラウザでHTMLを開く
open debug-output/RJ123456_raw.html
```

## 🔧 パーサー修正ワークフロー

### 🆕 改善されたワークフロー（自動監視システム対応）

#### 1. 自動監視アラートの確認

```bash
# ヘルスチェックの実行
pnpm tsx src/utils/dlsite-health-monitor.ts

# ログで問題を確認
# "DLsite構造健全性チェック失敗" や "解析成功率が低下" などのメッセージ
```

#### 2. 問題の詳細調査

```bash
# 現状の把握
pnpm debug:quick

# 詳細分析
pnpm debug:parser --analyze-failures
```

#### 3. HTML構造の調査

```bash
# 最新HTMLの保存
pnpm debug:parser --product-id <問題のID>

# 構造変化の確認
pnpm debug:compare
```

#### 4. パーサー設定の更新

```typescript
// src/utils/parser-config.ts で設定を更新
// 新しいセレクターを追加
parserConfig.updateFieldConfig('title', {
  selectors: {
    primary: ['.new-title-class'], // 新しいセレクター
    secondary: ['.work_name a'],    // 既存のフォールバック
  }
});
```

#### 5. 修正の検証

```bash
# 修正後のテスト
pnpm debug:quick

# 問題が解決していることを確認
pnpm test
```

## 📈 成功指標

### クイックテストの理想的な結果

- **成功率**: 80%以上
- **トラック情報抽出**: 60%以上
- **ファイル情報抽出**: 70%以上  
- **クリエイター情報抽出**: 80%以上
- **高解像度画像取得**: 70%以上

### 警告サイン

以下の場合はパーサー修正が必要:

- 成功率 < 50%
- "HTML too short" エラーが多発
- 特定のデータタイプが全く取得できない
- HTML構造変化監視で大幅な変更を検出

## 💡 開発のコツ

### 1. セレクターの堅牢性向上

```typescript
// 悪い例: 単一セレクター
const title = $('.work_name a').text();

// 良い例: フォールバック付き
const title = $('.work_name a').text() || 
              $('.product-title').text() || 
              $('h1.title').text() || 
              '';
```

### 2. エラーハンドリングの改善

```typescript
try {
  const data = complexParsing();
  return data;
} catch (error) {
  logger.debug('Parsing failed, trying fallback method', { error });
  return fallbackParsing();
}
```

### 3. 段階的なデバッグ

```typescript
// デバッグ用の詳細ログ
logger.debug('HTML structure check', {
  hasMainTable: $('.work_1col_table').length > 0,
  rowCount: $('.work_1col_table tr').length,
  sampleText: $('.work_name').first().text().substring(0, 50)
});
```

## 🚀 定期メンテナンス

### 🆕 自動監視による継続的チェック

自動監視システムが定期的に健全性をチェックしています：

- **`dlsite-health-monitor.ts`**: 1時間ごとに自動実行（Cloud Scheduler経由）
- **成功率の自動追跡**: パーサー設定マネージャーが統計を記録
- **アラート**: 成功率が閾値を下回ると自動通知

### 手動チェック（推奨）

#### 週次チェック

```bash
# 自動監視レポートの確認
pnpm tsx src/utils/dlsite-health-monitor.ts

# パーサーの健全性確認
pnpm debug:quick

# HTML構造の変化確認
pnpm debug:compare
```

#### 月次チェック

```bash
# ベースラインの更新
pnpm debug:baseline

# 詳細な分析レポート
pnpm debug:parser --analyze-failures

# パーサー設定の最適化
# 成功率の低いセレクターを特定して更新
```

## 🆘 サポート

パーサーの問題が解決しない場合:

1. `debug-output/` ディレクトリの全ファイルを確認
2. HTMLファイルをブラウザで開いてDLsiteの表示と比較
3. 新しいセレクターパターンを特定
4. パーサーコードを段階的に修正
5. テストで検証

---

**初版作成**: 2025年7月3日  
**最終更新**: 2025年7月4日（自動監視システム対応）  
**対象バージョン**: v0.2.6+  
**更新周期**: 必要に応じて

### 関連ドキュメント

- [Cloud Functions 技術評価・改善報告書](./CLOUD_FUNCTIONS_TECHNICAL_REPORT.md)
- パーサー設定: `src/utils/parser-config.ts`
- 健全性監視: `src/utils/dlsite-health-monitor.ts`
- デバッグガイド: `PARSER_DEBUGGING_GUIDE.md` (このドキュメント)