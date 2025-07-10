# Cloud Functions - 管理・開発スクリプト一覧

suzumina.clickのCloud Functionsプロジェクトで使用できる管理スクリプト、開発ツール、メンテナンススクリプトの一覧です。

## 📋 目次

- [基本コマンド](#基本コマンド)
- [開発・デバッグツール](#開発デバッグツール)
- [DLsite関連管理ツール](#dlsite関連管理ツール)
- [失敗分析・補完ツール](#失敗分析補完ツール)
- [監視・通知システム](#監視通知システム)
- [メンテナンス・管理ツール](#メンテナンス管理ツール)
- [テスト・品質管理](#テスト品質管理)

---

## 基本コマンド

### 開発・ビルド
```bash
# 開発サーバー起動
pnpm dev

# TypeScript型チェック
pnpm typecheck

# コードフォーマット・lint
pnpm lint
pnpm format
pnpm check

# クリーンアップ
pnpm clean
```

---

## 開発・デバッグツール

### 🔍 データ処理デバッグ
```bash
# Individual Info APIレスポンスから作品データ変換のデバッグ
pnpm debug:processing
# ファイル: src/development/debug-data-processing.ts
# 用途: APIレスポンス → 作品データの変換過程を詳細分析
```

### 🔍 Firestore データ確認
```bash
# 年齢カテゴリ情報の確認
pnpm debug:age-categories
# ファイル: src/development/check-age-categories.ts
# 用途: Firestoreの年齢制限カテゴリデータを検証
```

### 🔍 Firestore保存テスト
```bash
# Firestore保存処理の直接テスト
pnpm debug:firestore-save
# ファイル: src/development/test-firestore-save.ts
# 用途: 特定作品IDでのFirestore保存処理をテスト・失敗原因特定
```

---

## DLsite関連管理ツール

### 📊 作品ID収集
```bash
# DLsite全作品IDを収集してJSONファイル保存
pnpm collect:work-ids
# ファイル: src/development/collect-work-ids.ts
# 出力: src/assets/dlsite-work-ids.json
# 用途: リージョン差異対応のための基準データ作成
```

### 🧪 Individual Info API直接テスト
```bash
# 特定作品IDでIndividual Info APIを直接テスト
pnpm debug:individual-api
# ファイル: src/development/individual-api-test.ts
# 用途: API失敗作品の取得可能性をローカル環境で確認
```

---

## 失敗分析・補完ツール

### 📊 失敗作品分析
```bash
# 詳細な失敗作品ID分析
pnpm analyze:failures
# ファイル: src/development/analyze-failed-work-ids.ts
# 用途: 失敗パターン分析・原因特定・統計レポート生成
```

### ⚡ 簡易失敗分析
```bash
# 簡易失敗作品特定
pnpm debug:quick-analysis
# ファイル: src/development/quick-failure-analysis.ts
# 用途: 既知の総作品数（1484件）から失敗作品を高速特定
```

### 🏥 ローカル補完収集 ⭐
```bash
# 失敗作品のローカル環境での補完収集
pnpm local:supplement
# ファイル: src/development/run-local-supplement.ts
# 用途: Cloud Functions失敗作品をローカル環境で補完・Firestoreに保存
# 📋 Phase 2完了機能: ハイブリッド収集システム
```

---

## 監視・通知システム

### 🔍 失敗率監視 ⭐
```bash
# 失敗率監視システムの手動実行
pnpm monitor:failure-rate
# ファイル: src/development/run-failure-rate-monitor.ts
# 用途: 失敗率チェック・アラート送信・監視統計表示
# 📋 Phase 3実装機能: メール通知による自動アラート
```

### 📈 週次健全性レポート ⭐
```bash
# 週次システム健全性レポート送信
pnpm notify:weekly-report
# ファイル: src/development/run-weekly-report.ts
# 用途: 週次統計レポート生成・メール送信・システム状況評価
# 📋 Phase 3実装機能: 包括的なシステム健全性レポート
```

---

## メンテナンス・管理ツール

### 🔧 メタデータリセット
```bash
# DLsite統合データ収集のメタデータリセット
pnpm reset:metadata
# ファイル: src/development/reset-metadata.ts
# 用途: 「前回の処理が完了していません」エラーの解決
```

### 🔧 バッチ処理ロックリセット
```bash
# バッチ処理ロックの手動リセット
node scripts/reset-batch-lock.js
# ファイル: scripts/reset-batch-lock.js
# 用途: バッチ処理が異常終了した場合のロック解除
```

---

## テスト・品質管理

### 🧪 テスト実行
```bash
# 全テスト実行
pnpm test

# テスト監視モード
pnpm test:watch

# カバレッジレポート生成
pnpm test:coverage
```

---

## 📁 ファイル構成

```
apps/functions/
├── src/
│   ├── development/          # 開発・管理ツール
│   │   ├── analyze-failed-work-ids.ts      # 失敗作品詳細分析
│   │   ├── check-age-categories.ts         # 年齢カテゴリデータ確認
│   │   ├── collect-work-ids.ts             # 作品ID収集ツール
│   │   ├── debug-data-processing.ts        # データ変換デバッグ
│   │   ├── individual-api-test.ts          # Individual Info APIテスト
│   │   ├── local-supplement-collector.ts   # ローカル補完収集エンジン
│   │   ├── quick-failure-analysis.ts       # 簡易失敗分析
│   │   ├── reset-metadata.ts               # メタデータリセット
│   │   ├── run-failure-rate-monitor.ts     # 失敗率監視実行スクリプト
│   │   ├── run-local-supplement.ts         # ローカル補完実行スクリプト
│   │   ├── run-weekly-report.ts            # 週次レポート実行スクリプト
│   │   └── test-firestore-save.ts          # Firestore保存テスト
│   ├── endpoints/            # Cloud Functions エンドポイント
│   ├── infrastructure/       # インフラ層（DB、設定、監視）
│   ├── services/            # ビジネスロジック層
│   └── shared/              # 共通ユーティリティ
├── scripts/
│   └── reset-batch-lock.js   # バッチロックリセット
└── package.json             # スクリプト定義
```

---

## 🚀 主要機能・システム

### DLsite統合データ収集システム
- **メインFunction**: `fetchDLsiteWorksIndividualAPI`
- **実行頻度**: 15分間隔（Cloud Scheduler）
- **処理内容**: Individual Info API統合取得 + 時系列データ収集
- **タイムアウト最適化**: 並列処理・バッチ分割による100%成功率達成

### ハイブリッド収集システム（Phase 1-2完了）
1. **自動収集**: Cloud Functions による定期実行
2. **失敗検出**: 失敗作品の自動追跡・分類（`failure-tracker.ts`）
3. **ローカル補完**: 失敗作品のローカル環境での補完収集
4. **統合保存**: 成功データのFirestore統合保存・回復記録

### 監視・通知システム（Phase 3実装）
1. **失敗率監視**: 閾値超過時の自動メール通知（`failure-rate-monitor.ts`）
2. **メール通知**: HTML・テキスト形式での詳細レポート（`email-service.ts`）
3. **週次レポート**: システム健全性の定期的な分析・報告
4. **Cloud Functions統合**: 定期実行・HTTP APIによる通知システム

### 時系列データ基盤
- **生データ収集**: 7日間保持（`dlsite_timeseries_raw`）
- **日次集計**: 永続保存（`dlsite_timeseries_daily`）
- **価格履歴API**: 集計データによる高速分析

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 「前回の処理が完了していません」エラー
```bash
pnpm reset:metadata
# または
node scripts/reset-batch-lock.js
```

#### バッチ処理が途中で停止
```bash
node scripts/reset-batch-lock.js
```

#### 失敗作品の補完収集
```bash
# 失敗分析
pnpm analyze:failures

# ローカル補完実行
pnpm local:supplement
```

#### Individual Info API テスト
```bash
# 特定作品IDのAPI取得テスト
pnpm debug:individual-api
```

---

## 📊 監視・統計

### 失敗追跡システム
- **失敗分類**: TIMEOUT, NETWORK_ERROR, API_ERROR, REGION_RESTRICTION等
- **統計取得**: 総失敗数、回復数、未回復数の自動集計
- **自動クリーンアップ**: 30日経過した回復済み記録の削除

### データ完全性
- **実装前**: 74% (222/300件)
- **実装後**: 95%+達成可能（ハイブリッドシステムによる補完）

---

## 📝 開発ガイドライン

### 新しいスクリプトの追加
1. `src/development/` にTypeScriptファイル作成
2. `package.json` にスクリプトコマンド追加
3. 本README.mdに説明追加
4. 必要に応じてテストファイル作成

### ログ・エラーハンドリング
- `src/shared/logger.ts` の構造化ログを使用
- エラー分類は `failure-tracker.ts` の `FAILURE_REASONS` に準拠
- 失敗作品は追跡システムに自動記録

### データアクセス
- Firestore操作は `src/services/*/firestore.ts` を使用
- Individual Info APIは `user-agent-manager.ts` のヘッダー生成を使用
- レート制限・リトライは各サービス層で実装

---

**最終更新**: 2025年7月10日  
**バージョン**: v11.0（統合アーキテクチャ + ハイブリッド収集システム完了）