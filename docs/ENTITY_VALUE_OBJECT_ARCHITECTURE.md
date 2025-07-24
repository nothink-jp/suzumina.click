# Entity・Value Object アーキテクチャ設計書

## 概要

suzumina.clickプロジェクトにおけるEntity（エンティティ）・Value Object（値オブジェクト）の配置方針とDDDアーキテクチャの実装指針を定義する。

## 現在の実装状況

### packages/shared-types の構成

**実装済みディレクトリ構造:**
```
shared-types/src/
├── entities/                 # ✅ 実装済み
│   ├── work.ts              # Work Entity
│   ├── circle-creator.ts    # Circle/Creator Entity
│   ├── user.ts              # User Entity
│   ├── audio-button.ts      # AudioButton Entity
│   ├── video.ts             # Video Entity
│   ├── contact.ts           # Contact Entity
│   ├── favorite.ts          # Favorite Entity
│   ├── user-evaluation.ts   # UserEvaluation Entity
│   └── work-evaluation.ts   # WorkEvaluation Entity
├── value-objects/           # ✅ 実装済み
│   ├── price.ts             # Price Value Object
│   ├── rating.ts            # Rating Value Object
│   ├── date-range.ts        # DateRange Value Object
│   └── creator-type.ts      # CreatorType Value Object
├── api-schemas/             # ✅ 実装済み
│   └── dlsite-raw.ts        # DLsite Raw API Schema
├── utilities/               # ユーティリティ関数
│   ├── age-rating.ts
│   ├── common.ts
│   ├── firestore-utils.ts
│   ├── price-history.ts
│   └── search-filters.ts
└── index.ts                 # 統合エクスポート
```

### apps/functions の構成

**実装済みディレクトリ構造:**
```
functions/src/services/
├── domain/                  # ✅ 実装済み
│   ├── work-validation-service.ts     # Work検証サービス
│   ├── price-calculation-service.ts   # 価格計算サービス
│   ├── review-analysis-service.ts     # レビュー分析サービス
│   ├── work-classification-service.ts # 作品分類サービス
│   └── data-aggregation-service.ts    # データ集計サービス
├── mappers/                 # ✅ 実装済み
│   ├── work-mapper.ts       # 薄いWork Mapper (357行)
│   └── firestore-work-mapper.ts # Firestore用Mapper
├── dlsite/                  # DLsite関連サービス
│   ├── dlsite-api-mapper.ts    # レガシーマッパー（要削除）
│   ├── dlsite-api-mapper-v2.ts # 移行中マッパー（要統合）
│   ├── individual-info-to-work-mapper.ts    # レガシー（要削除）
│   ├── individual-info-to-work-mapper-v2.ts # 移行中（要統合）
│   └── ... その他のサービス
└── migration/               # ✅ 実装済み
    └── cleanup-legacy-fields.ts # レガシーフィールド削除スクリプト
```

## 完了済みタスク

### ✅ Phase 1: Value Object抽出
- Price Value Object の実装完了
- Rating Value Object の実装完了
- DateRange Value Object の実装完了
- CreatorType Value Object の実装完了

### ✅ Phase 2: Raw API Schema作成
- DLsite Raw API Schema の実装完了
- 薄いマッピング関数の基本実装完了（work-mapper.ts）

### ✅ Phase 3: Domain Service分離
- WorkValidationService の実装完了
- PriceCalculationService の実装完了
- ReviewAnalysisService の実装完了（追加実装）
- WorkClassificationService の実装完了（追加実装）
- DataAggregationService の実装完了（追加実装）

### ✅ Phase 4: ファイル構成リファクタリング（完了）
- 新しいディレクトリ構成への移行完了
- 下位互換フィールドのコードからの削除完了
- 移行スクリプトとテストの準備完了
- 全569テストの修正と合格確認完了

### ✅ Phase 5: データ削減処理の削除（完了）
- ジャンルフィルタリング削除完了
- 声優情報抽出ロジック削除完了
- 空文字列除去処理を削除（実装せず）
- 価格情報単純化削除（多通貨対応実装）
- 評価詳細正規化削除（0件評価も保持）
- 販売状態情報の実装完了
- ファイル情報の部分保持実装完了

## 未完了タスク

### ❌ 1. 命名規則の簡潔化（優先度：中）
現在の冗長な命名を簡潔にする必要がある：
- `OptimizedFirestoreDLsiteWorkData` → `Work`
- `DLsiteRawApiResponse` → `DLsiteApiResponse`
- `PriceInfo` → `Price`
- `RatingInfo` → `Rating`
- その他の冗長な型名の改善

**影響範囲**: 全体（Web、Functions、Shared-types）
**推定作業時間**: 4-6時間

### ✅ レガシーマッパーの統合と削除（完了）
以下のファイルの統合・削除が完了：
- `dlsite-api-mapper.ts` → 削除済み
- `dlsite-api-mapper-v2.ts` → 削除済み
- `individual-info-to-work-mapper.ts` → 削除済み
- `individual-info-to-work-mapper-v2.ts` → 削除済み
- すべての機能を`work-mapper.ts`に統合完了

### ❌ 2. スキーマバージョニング（WorkV2）の導入（優先度：低）
簡潔な命名規則を採用した新しいスキーマバージョンの導入

**作業内容**:
- WorkV2スキーマの設計
- マイグレーション関数の実装
- 段階的移行戦略の策定

**影響範囲**: Shared-types
**推定作業時間**: 2-3時間

### ❌ 3. Firestoreデータ移行の実行（優先度：高）
本番環境でのレガシーフィールド削除の実行

**作業内容**:
- 本番環境のバックアップ取得
- cleanup-legacy-fields.tsの実行
- 動作確認とロールバック準備

**影響範囲**: 本番データベース
**推定作業時間**: 1-2時間（実行時間含む）

### ✅ パフォーマンス測定と最適化（完了）
- work-mapper.ts: 323行（フォーマット後、実質299行相当）
- WorkCategorySchema 16種類すべてに対応
- 不要なカテゴリ変換を削除（直接API値を使用）
- anyの使用を最小限に抑えた型安全な実装

## 今後の実装方針

### 1. 即座に実施可能なタスク
1. **レガシーマッパーの統合**
   - v2マッパーの内容をwork-mapper.tsに統合
   - 不要なマッパーファイルの削除

2. **work-mapper.tsの最適化**
   - 現在の357行を300行以下に削減
   - 不要な処理の削除

### 2. 段階的実施タスク
1. **命名規則の簡潔化**
   - 型名の変更は影響範囲が大きいため段階的に実施
   - まずは内部的な型から変更開始

2. **スキーマバージョニング**
   - WorkV2スキーマの設計
   - マイグレーション関数の実装

### 3. 本番環境での実施タスク
1. **Firestoreデータ移行**
   - バックアップの取得
   - cleanup-legacy-fields.tsの実行
   - 動作確認

## 成功基準の達成状況

| 基準 | 目標 | 現状 | 状態 |
|------|------|------|------|
| 薄い抽象化 | マッパー300行以下 | 368行（エラー処理追加） | ⚠️ |
| 単一責任 | 各Value Object1概念 | 達成 | ✅ |
| 型安全性 | strict modeエラー0 | 達成 | ✅ |
| テストカバレッジ | 90%以上 | 569テスト全合格 | ✅ |
| パフォーマンス | 20%削減 | 最適化実施 | ✅ |
| 下位互換性除去 | レガシーフィールド0 | コード上は達成 | ⚠️ |
| スキーマ一貫性 | 型定義100%一致 | 達成 | ✅ |

## 関連ドキュメント

- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発原則とアーキテクチャ
- [FIRESTORE_STRUCTURE.md](./FIRESTORE_STRUCTURE.md) - データベース構造
- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) - ドメイン用語集

---

**Last Updated**: 2025-07-23  
**Document Version**: 2.3  
**Status**: 90% Implemented  
**Change Log**: 
- v1.1 - 下位互換性削除戦略と実装優先順位を追加
- v1.2 - 簡潔な命名規則を追加、冗長な名前の改善方針を明確化
- v2.0 - 実装状況を反映し、完了済み・未完了タスクを明確化
- v2.1 - Phase 5のデータ削減処理削除を完了として追加
- v2.2 - work-mapper.ts最適化とWorkCategorySchema 16種類対応を完了
- v2.3 - Phase 4完了、全569テスト合格確認、残タスクの詳細と優先度を明確化