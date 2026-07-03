# @suzumina.click/functions

Cloud Functions パッケージ - DLsite作品データ収集・YouTube動画管理・データ整合性チェック

## 📋 概要

suzumina.click の Cloud Functions を管理するパッケージです。GCP Cloud Functions Gen2 で動作し、以下の機能を提供します：

- DLsite作品データの定期収集・更新
- YouTube動画情報の収集・分類
- データ整合性の自動チェック・修復
- 価格履歴の追跡

## 🚀 開発コマンド

### 基本コマンド

```bash
# ビルド
pnpm build

# 型チェック
pnpm typecheck

# Lint・フォーマット
pnpm lint
pnpm format
pnpm check

# テスト
pnpm test
pnpm test:watch
pnpm test:coverage

# クリーンアップ
pnpm clean
```

## 🛠️ 管理ツール

### 統合ツールランナー

```bash
# ツールのヘルプ表示
pnpm tools:help

# 統計情報表示
pnpm tools:stats

# レポート生成
pnpm tools:report

# メタデータリセット
pnpm tools:reset
```

### DLsite関連ツール

```bash
# region 等価性の定点観測（ローカル日本scrape vs 本番 works・read-only）
pnpm check:region-equivalence

# dry-run + raw 捕捉（スキーマdrift観測・Firestore非書き込み）
pnpm tools:capture -- --limit 20
```

### データ整合性チェック

```bash
# データ整合性チェック実行
pnpm check:integrity
```

### 価格履歴デバッグ

```bash
# 価格履歴確認
pnpm check:price-history

# 価格履歴デバッグ
pnpm debug:price-history
```

## 📁 ディレクトリ構成

```
apps/functions/src/
├── endpoints/       # Cloud Functions エンドポイント
├── services/        # ビジネスロジック層
├── infrastructure/  # インフラ層（DB、設定）
├── shared/          # 共通ユーティリティ
├── tools/           # 管理・開発ツール
│   ├── core/        # コアツール
│   └── migration/   # マイグレーションツール
├── migrations/      # データマイグレーション
└── assets/          # 静的アセット
```

## 🔧 環境設定

### 必要な環境変数

`.env` ファイルに以下を設定：

```env
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

## 📚 関連ドキュメント

- [プロジェクト概要](../../README.md)
- [ドキュメントインデックス](../../docs/README.md)
- [インフラアーキテクチャ](../../docs/reference/infrastructure-architecture.md)
- [DLsite API リファレンス](../../docs/reference/external-apis/dlsite-api.md)

---

**バージョン**: v0.3.11
**最終更新**: 2025-12-24
