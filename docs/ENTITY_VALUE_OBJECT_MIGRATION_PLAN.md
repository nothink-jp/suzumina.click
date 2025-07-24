# Entity・Value Object アーキテクチャ移行計画

## 概要

suzumina.clickプロジェクトにおけるEntity・Value Objectアーキテクチャへの移行を安全に実施するための段階的な移行計画書。

**移行期間**: 2025年7月24日〜2025年7月31日（1週間）  
**影響範囲**: Firestore旧フィールドのクリーンアップ、型定義の統合  
**リスクレベル**: 低（コードは既に新構造対応済み）  
**PR**: https://github.com/nothink-jp/suzumina.click/pull/95  
**ステータス**: **Phase 3まで完了** 🎉

## 現在の状況

### 完了したフェーズ
- **Phase 0**: 準備 ✅ (7/24)
- **Phase 1**: 現状確認 ✅ (7/24)
- **Phase 2**: コードデプロイ ✅ (7/24)
- **Phase 3**: レガシーフィールドクリーンアップ ✅ (7/24)

### 主要な成果
- Entity/Value Objectアーキテクチャへの完全移行
- 585テスト全合格
- 本番環境へのデプロイ成功
- 6,012個のレガシーフィールド削除完了

## 移行による主要な変更点

### 1. Firestoreデータ構造の変更

| 旧フィールド | 新フィールド | 変更内容 | ステータス |
|------------|------------|---------|-----------|
| `aggregatedInfo.dlCount` | 廃止 | DLsite API提供終了のため削除 | ✅ 削除済み |
| `aggregatedInfo.reviewCount` | `rating.count` | ネスト構造変更 | ✅ 移行済み |
| `aggregatedInfo.reviewAverage` | `rating.stars` | 0-5スケール→0-50スケール | ✅ 移行済み |
| `prices.JPY` | `price.amount` | オブジェクト構造化 | ✅ 移行済み |
| `dates.releaseDate` | `releaseDateISO` | ISO8601形式統一 | ✅ 移行済み |
| `isExclusive` | 廃止 | 使用されていない | ✅ 削除済み |
| `apiGenres` | 廃止 | 重複データ | ✅ 削除済み |
| `apiCustomGenres` | 廃止 | 重複データ | ✅ 削除済み |
| `apiWorkOptions` | 廃止 | 重複データ | ✅ 削除済み |

### 2. 削除されたファイル

- `apps/functions/src/services/dlsite/dlsite-api-mapper.ts`
- `apps/functions/src/services/dlsite/dlsite-api-mapper-v2.ts`
- `apps/functions/src/services/dlsite/individual-info-to-work-mapper.ts`
- `apps/functions/src/services/dlsite/individual-info-to-work-mapper-v2.ts`

### 3. 型定義の移動

```typescript
// 旧: サブディレクトリからのインポート
import { Work } from '@suzumina.click/shared-types/src/work';

// 新: ルートからのインポート
import { Work } from '@suzumina.click/shared-types';
```

## 移行フェーズ

### Phase 0: 準備（7/24 完了）

#### チェックリスト
- [x] 完全なコードベースのバックアップ
- [x] Firestoreの完全バックアップ取得
- [x] 移行専用ブランチの作成（`feature/entity-value-object-migration`）
- [x] コード修正とテスト（586テスト全合格）
- [x] 現状分析の実施（互換性レイヤー不要と判断）

#### バックアップコマンド
```bash
# Firestoreバックアップ
gcloud firestore export gs://suzumina-click-backup/pre-migration-$(date +%Y%m%d-%H%M%S) \
  --project=suzumina-click

# コードベースのタグ付け
git tag -a pre-entity-migration -m "Backup before Entity/Value Object migration"
git push origin pre-entity-migration
```

### Phase 1: 現状確認（7/25 実施予定）

#### 1. Firestoreデータ構造の確認

```bash
# 本番環境のデータ構造を確認
gcloud firestore operations list \
  --database='(default)' \
  --project=suzumina-click

# サンプルデータの確認
node -e "require('./scripts/check-data-structure.js')"
```

#### 2. 旧フィールドの使用状況分析

```typescript
// 既存のanalyzeLegacyFieldUsage関数を使用
import { analyzeLegacyFieldUsage } from './apps/functions/src/services/migration/cleanup-legacy-fields';

const analysis = await analyzeLegacyFieldUsage();
console.log('旧フィールド使用状況:', analysis);
```

**注**: 現状分析により、Webアプリケーションは既に新構造に完全対応しており、互換性レイヤーは不要と判断されました。

### Phase 2: コードデプロイ（7/26 実施予定）

#### 1. プルリクエストのマージ

```bash
# CIチェックの確認
gh pr checks 61

# レビュー承認後マージ
gh pr merge 61 --squash
```

#### 2. 自動デプロイの監視

```bash
# Cloud Runのデプロイ状況確認
gcloud run services describe suzumina-click-web \
  --region=asia-northeast1 \
  --format="value(status.latestReadyRevisionName)"

# Cloud Functionsのデプロイ確認
gcloud functions list --filter="name:fetchDLsiteWorks"
```

### Phase 3: 旧フィールドクリーンアップ（7/24 完了）✅

#### 1. ドライラン実行 ✅

```bash
pnpm cleanup:dry-run
```

**ドライラン結果（2025-07-24T03:54実施）:**
- 削除対象ドキュメント数: 1,503件
- 削除対象フィールド数: 6,012件

#### 2. 本番実行 ✅

```bash
# バックアップ作成（2025-07-24T12:55）
gcloud firestore export gs://suzumina-click-backup/pre-cleanup-20250724-125506 \
  --project=suzumina-click

# クリーンアップ実行（2025-07-24T03:55）
pnpm cleanup:execute
```

**クリーンアップ結果:**
- 処理ドキュメント数: 1,503件
- 成功: 1,503件
- 失敗: 0件
- 削除完了フィールド:
  - `isExclusive`: 1,503件 ✅
  - `apiGenres`: 1,503件 ✅
  - `apiCustomGenres`: 1,503件 ✅
  - `apiWorkOptions`: 1,503件 ✅

#### 3. 検証 ✅

```bash
pnpm cleanup:analyze
```

**検証結果（2025-07-24T03:56）:**
- すべてのレガシーフィールドが削除済み
- エラーなし

### Phase 4: 監視とフォローアップ（7/24-7/25）

#### 1. システム監視

```bash
# エラー率の確認
gcloud logging read "severity>=ERROR AND resource.type=cloud_run_revision" \
  --limit=50 \
  --format=json

# パフォーマンスメトリクス
gcloud monitoring dashboards list
```

#### 2. ユーザーフィードバック収集

- GitHubイシューの監視
- Discord通知の確認
- パフォーマンスレポートの確認

### Phase 5: 完了と文書化（7/25）

#### 1. 移行完了の確認

- [x] 全テストの合格確認（585テスト合格）
- [x] 本番環境の正常動作確認（Phase 2で確認済み）
- [ ] パフォーマンスメトリクスの確認
- [x] 旧フィールドの完全削除確認（Phase 3で完了）

#### 2. ドキュメント更新

- [ ] FIRESTORE_STRUCTURE.mdの更新
- [x] UBIQUITOUS_LANGUAGE.mdの確認（wishlistCount削除済み）
- [ ] 開発ガイドの更新

## 緊急時対応

### ロールバック手順

#### 1. アプリケーションのロールバック

```bash
# Cloud Runの即座のロールバック
gcloud run services update-traffic suzumina-click-web \
  --to-revisions=pre-migration-revision=100 \
  --region=asia-northeast1

# Cloud Functionsのロールバック
gcloud functions deploy fetchDLsiteWorks \
  --source=gs://suzumina-click-backup/functions-pre-migration \
  --region=asia-northeast1
```

#### 2. データのロールバック

```bash
# Firestoreの復元（最終手段）
gcloud firestore import gs://suzumina-click-backup/pre-migration-20250724
```

### 問題発生時の連絡先

- プロジェクトオーナー: [連絡先]
- 技術リード: [連絡先]
- 緊急対応チーム: [連絡先]

## 成功基準

1. **機能面**
   - すべてのページが正常に表示される
   - データの作成・更新・削除が正常に動作
   - 検索・フィルタリングが正常に動作

2. **パフォーマンス面**
   - レスポンスタイム: P99 < 2秒を維持
   - エラー率: < 0.1%

3. **データ整合性**
   - 全作品データが新フィールドを持つ
   - 旧フィールドが完全に削除される

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|-------|------|
| データ移行失敗 | 高 | バックアップからの復元手順確立 |
| 表示崩れ | 中 | 互換性レイヤーによる段階的移行 |
| パフォーマンス劣化 | 中 | 監視強化と即座のロールバック |
| APIエラー増加 | 高 | エラーハンドリング強化 |

## 移行後のタスク

1. **ドキュメント更新**
   - FIRESTORE_STRUCTURE.mdの更新
   - API仕様書の更新
   - 開発ガイドの更新

2. **モニタリング継続**
   - 2週間の集中監視期間
   - パフォーマンスメトリクスの記録

3. **最適化**
   - インデックスの見直し
   - クエリの最適化

---

**作成日**: 2025年7月24日  
**作成者**: Claude AI Assistant  
**承認者**: [承認者名]  
**最終更新**: 2025年7月24日

## 変更履歴

- 2025年7月24日: 初版作成
- 2025年7月24日: 現状分析により互換性レイヤー不要と判断、計画を簡略化
- 2025年7月24日: Phase 0完了、Phase 1実施結果を反映、PR番号を95に更新
- 2025年7月24日: Phase 2完了、本番環境へのデプロイ成功
- 2025年7月24日: Phase 3完了、全レガシーフィールド削除成功（6,012フィールド）