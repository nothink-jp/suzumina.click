# Entity・Value Object アーキテクチャ移行計画

## 概要

suzumina.clickプロジェクトにおけるEntity・Value Objectアーキテクチャへの移行を安全に実施するための段階的な移行計画書。

**移行期間**: 2025年7月24日〜2025年8月7日（2週間）  
**影響範囲**: Firestore全データ、Web/Admin/Functions全アプリケーション  
**リスクレベル**: 高（データ構造の根本的変更）

## 移行による主要な変更点

### 1. Firestoreデータ構造の変更

| 旧フィールド | 新フィールド | 変更内容 |
|------------|------------|---------|
| `aggregatedInfo.dlCount` | `wishlistCount` | フィールド名変更 |
| `aggregatedInfo.reviewCount` | `rating.count` | ネスト構造変更 |
| `aggregatedInfo.reviewAverage` | `rating.stars` | 0-5スケール→0-50スケール |
| `prices.JPY` | `price.amount` | オブジェクト構造化 |
| `dates.releaseDate` | `releaseDateISO` | ISO8601形式統一 |

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

### Phase 0: 準備（7/24 実施）

#### チェックリスト
- [x] 完全なコードベースのバックアップ
- [x] Firestoreの完全バックアップ取得
- [x] 移行専用ブランチの作成（`feature/entity-value-object-migration`）
- [ ] 移行スクリプトの作成とテスト
- [ ] 互換性レイヤーの実装

#### バックアップコマンド
```bash
# Firestoreバックアップ
gcloud firestore export gs://suzumina-click-backup/pre-migration-$(date +%Y%m%d-%H%M%S) \
  --project=suzumina-click

# コードベースのタグ付け
git tag -a pre-entity-migration -m "Backup before Entity/Value Object migration"
git push origin pre-entity-migration
```

### Phase 1: 互換性レイヤーの実装（7/25-7/26）

#### 1. フロントエンド互換性レイヤー

```typescript
// apps/web/src/lib/work-data-normalizer.ts
export function normalizeWorkData(work: any): NormalizedWork {
  // 新旧両方のデータ構造に対応
  return {
    ...work,
    // 評価情報の正規化
    rating: work.rating || {
      stars: work.aggregatedInfo?.reviewAverage 
        ? Math.round(work.aggregatedInfo.reviewAverage * 10) 
        : 0,
      count: work.aggregatedInfo?.reviewCount || 0
    },
    
    // ウィッシュリスト数の正規化
    wishlistCount: work.wishlistCount ?? work.aggregatedInfo?.dlCount ?? 0,
    
    // 価格情報の正規化
    price: work.price || (work.prices?.JPY ? {
      amount: work.prices.JPY,
      currency: 'JPY'
    } : null),
    
    // 日付の正規化
    releaseDateISO: work.releaseDateISO || work.dates?.releaseDate
  };
}
```

#### 2. Server Actions/API Routes更新

各データ取得箇所に正規化処理を追加：
```typescript
export async function getWorks() {
  const snapshot = await firestore.collection('dlsiteWorks').get();
  return snapshot.docs.map(doc => normalizeWorkData(doc.data()));
}
```

### Phase 2: Cloud Functions更新（7/27-7/28）

#### 1. 新データ構造での書き込み開始

work-mapper.tsは既に新構造で実装済みのため、デプロイのみ必要。

#### 2. デプロイ手順

```bash
# Cloud Functionsのデプロイ
cd apps/functions
pnpm deploy

# 動作確認
gcloud functions logs read fetchDLsiteWorks --limit=50
```

### Phase 3: データ移行（7/29-7/31）

#### 1. 移行スクリプトの実行

```typescript
// scripts/migrate-to-entity-architecture.ts
import { FieldValue } from '@google-cloud/firestore';

export async function migrateWorkData() {
  const batch = firestore.batch();
  const snapshot = await firestore.collection('dlsiteWorks').get();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const updates: any = {};
    
    // 新フィールドが存在しない場合のみ移行
    if (!data.rating && data.aggregatedInfo) {
      updates.rating = {
        stars: Math.round((data.aggregatedInfo.reviewAverage || 0) * 10),
        count: data.aggregatedInfo.reviewCount || 0
      };
    }
    
    if (data.wishlistCount === undefined && data.aggregatedInfo?.dlCount) {
      updates.wishlistCount = data.aggregatedInfo.dlCount;
    }
    
    if (!data.price && data.prices?.JPY) {
      updates.price = {
        amount: data.prices.JPY,
        currency: 'JPY'
      };
    }
    
    if (!data.releaseDateISO && data.dates?.releaseDate) {
      updates.releaseDateISO = data.dates.releaseDate;
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
    }
  });
  
  await batch.commit();
}
```

#### 2. 検証クエリ

```typescript
// 移行状況の確認
const checkMigrationStatus = async () => {
  const snapshot = await firestore.collection('dlsiteWorks').limit(10).get();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log({
      id: doc.id,
      hasNewRating: !!data.rating,
      hasOldAggregated: !!data.aggregatedInfo,
      hasNewPrice: !!data.price,
      hasOldPrices: !!data.prices
    });
  });
};
```

### Phase 4: フロントエンドデプロイ（8/1-8/2）

#### 1. Web App デプロイ

```bash
# 手動デプロイ（テスト用）
cd apps/web
pnpm build
gcloud run deploy suzumina-click-web-test \
  --source . \
  --region=asia-northeast1 \
  --no-traffic

# トラフィック切り替え（段階的）
gcloud run services update-traffic suzumina-click-web \
  --to-revisions=NEW_REVISION=10 \
  --region=asia-northeast1
```

#### 2. 監視強化

- エラー率の監視
- レスポンスタイムの監視
- ユーザーレポートの収集

### Phase 5: クリーンアップ（8/3-8/7）

#### 1. 旧フィールドの削除

```typescript
// 既存のcleanup-legacy-fields.tsを拡張
const MIGRATION_LEGACY_FIELDS = [
  'aggregatedInfo',
  'prices',
  'dates'
];

// 削除実行（DRY RUN後に本実行）
await cleanupLegacyFields({
  dryRun: false,
  fieldsToDelete: MIGRATION_LEGACY_FIELDS
});
```

#### 2. 互換性レイヤーの削除

- normalizeWorkData関数の削除
- 直接新フィールドを参照するよう修正

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