# suzumina.click ドキュメントアーカイブ

> **📅 最終更新**: 2025年7月27日  
> **📝 理由**: Entity/Value Objectアーキテクチャ移行完了に伴う整理

## 📂 アーカイブ構造

### 2025-07 Entity/Value Object移行関連

#### `/2025-07-entity-value-object-migration/`
- **内容**: Entity/Value Objectアーキテクチャ移行（Phase 1）
- **完了日**: 2025-07-24
- **主要文書**:
  - `ENTITY_VALUE_OBJECT_MIGRATION_PLAN.md` - 移行計画書
  - `ENTITY_VALUE_OBJECT_ARCHITECTURE.md` - アーキテクチャ解説

#### `/2025-07-entity-v2-migration/`
- **内容**: Entity V2移行プロジェクト（Phase 2-6）
- **完了日**: 2025-07-26
- **主要文書**:
  - `ENTITY_MIGRATION_PROJECT.md` - プロジェクト概要
  - `NAMING_CONVENTION_MIGRATION_GUIDE.md` - 命名規則移行ガイド

#### `/2025-07-video-legacy-migration/`
- **内容**: Videoエンティティのレガシーフォーマット削除
- **完了日**: 2025-07-26
- **主要文書**:
  - `VIDEO_LEGACY_FORMAT_MIGRATION.md` - 移行手順書

#### `/2025-07-domain-docs-verbose/`
- **内容**: 詳細なドメインモデルドキュメント（簡潔版に統合）
- **アーカイブ日**: 2025-07-27
- **主要文書**:
  - `DOMAIN_MODEL.md` - 760行の詳細設計書
  - `ENTITY_VALUE_OBJECT_EXPANSION_PLAN.md` - 拡張計画

### 2025-07 パフォーマンス最適化関連

#### `/2025-07-audio-button-optimization/`
- **内容**: 音声ボタンシステムのパフォーマンス最適化
- **完了日**: 2025-07-15
- **成果**: メモリ使用量87%削減、96ボタン同時表示対応

#### `/2025-07-dlsite-optimization/`
- **内容**: DLsite API統合の最適化
- **完了日**: 2025-07-09
- **成果**: Individual Info API移行、エラー率低減

#### `/2025-07-server-actions-migration/`
- **内容**: API RoutesからServer Actionsへの移行
- **完了日**: 2025-07
- **成果**: レスポンス時間50%削減

### 初期実装ドキュメント（2025-07以前）

#### `/implementation/`
完了済みの機能実装・設計ドキュメント（歴史的価値・参考資料として保持）

- `DLSITE_DATA_STRUCTURE_SPECIFICATION.md` - DLsite統合データ構造仕様
- `BACKEND_FRONTEND_INTEGRATION.md` - Server Actions統合設計
- `WORK_DETAIL_ENHANCEMENT.md` - 作品詳細ページ強化仕様

#### `/architecture/`
システム簡素化・リージョン制限対応完了に伴いアーカイブ

- `FUNCTIONS_ARCHITECTURE_CURRENT_ARCHIVED.md` - Cloud Functions アーキテクチャ解説
- `DLSITE_REGION_RESTRICTION_DESIGN_ARCHIVED.md` - DLsite リージョン制限対応設計書
- `YOUTUBE_VIDEO_CLASSIFICATION_ARCHIVED.md` - YouTube動画種別判定ルール

#### `/analysis/`
技術分析・パフォーマンス分析・システム評価ドキュメント

- `CHARACTER_EVALUATION_SYSTEM.md` - キャラクター評価システム分析
- `DEPLOYMENT_OPTIMIZATION.md` - デプロイメント最適化分析
- `DLSITE_LOAD_IMPACT_ANALYSIS.md` - DLsite負荷影響分析

#### `/processes/`
計画されたが使用されていない、または完了したプロセス文書

- `RELEASE_PROCESS.md` - 3段階リリースプロセス
- `TEST_REORGANIZATION_PLAN.md` - テスト再編成計画

## 🎯 アーカイブの価値

### 📚 知識保持
- 設計思想・技術判断の記録
- 将来の類似機能開発時の参考資料
- システム理解のための歴史的コンテキスト

### 🔍 トラブルシューティング
- 過去の問題解決手法の参照
- 設計決定の背景理解
- デバッグ時の設計意図確認

### 🚀 将来の拡張
- 新機能開発時の設計パターン参照
- アーキテクチャ進化の履歴追跡
- チーム拡張時の知識継承

## 📋 アクセス方針

### ✅ 推奨用途
- 歴史的参照・設計コンテキスト理解
- 類似機能開発時のパターン参照
- トラブルシューティング時の背景調査

### ❌ 非推奨用途
- 現在の実装状況確認（最新ドキュメント参照）
- 開発手順・運用手順（アクティブドキュメント参照）
- API仕様・データ構造確認（現行仕様書参照）

## 🔗 現在のアクティブドキュメント

運用・開発で使用する最新情報は以下を参照：

### 🔧 開発・運用
- **[README.md](../../README.md)** - プロジェクト概要・クイックスタート
- **[CLAUDE.md](../../CLAUDE.md)** - 包括的開発者ガイド
- **[DEVELOPMENT.md](../DEVELOPMENT.md)** - 開発環境・品質基準
- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - デプロイ・運用手順

### 📊 仕様・構造
- **[FIRESTORE_STRUCTURE.md](../FIRESTORE_STRUCTURE.md)** - データベース構造（v0.3.0対応）
- **[INFRASTRUCTURE_ARCHITECTURE.md](../INFRASTRUCTURE_ARCHITECTURE.md)** - インフラ構成
- **[TODO.md](../TODO.md)** - 開発ロードマップ・現在の優先度

### 🛠️ ツール・手順
- **[GIT_WORKFLOW.md](../GIT_WORKFLOW.md)** - Git運用・ブランチ戦略
- **[QUICK_REFERENCE.md](../QUICK_REFERENCE.md)** - 日常的なコマンド参照

---

**📝 Note**: このアーカイブは知識保持・履歴管理のために維持されています。現在の開発・運用情報は上記のアクティブドキュメントを確認してください。