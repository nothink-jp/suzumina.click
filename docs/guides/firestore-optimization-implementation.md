# Firestore クエリ最適化実装ガイド

## 概要
このドキュメントは、suzumina.clickのFirestoreクエリ最適化の具体的な実装手順を記載します。

## Phase 1: トップページの最適化

### 1. 現状の問題点

現在のトップページでは、以下の非効率なクエリが実行されています：

```typescript
// apps/web/src/app/works/actions.ts
export async function getWorks(
  page: number = 1,
  pageSize: number = 20,
  isR18: boolean = false,
): Promise<{ works: Work[]; totalCount: number }> {
  const worksColl = getCollection("works");
  const snapshot = await worksColl.get(); // 全件取得（1000件以上）
  
  // メモリ上でフィルタリング
  const allWorks = snapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }))
    .filter((work) => isR18 || !work.isR18);
  
  // ページネーション処理
  const works = allWorks.slice((page - 1) * pageSize, page * pageSize);
  
  return { works, totalCount: allWorks.length };
}
```

**問題点:**
- 全ドキュメント（1000件以上）を毎回読み取り
- メモリ上でのフィルタリング・ソート
- 不要なデータ転送

### 2. 最適化後の実装

#### Step 1: Server Actions の修正

```typescript
// apps/web/src/app/works/actions.ts
export async function getLatestWorks(
  limit: number = 10,
  isR18: boolean = false,
): Promise<Work[]> {
  const worksColl = getCollection("works");
  
  let query = worksColl
    .where('publishedAt', '>', 0)  // インデックストリガー
    .orderBy('publishedAt', 'desc')
    .limit(limit);
  
  if (!isR18) {
    query = query.where('isR18', '==', false);
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// 同様にvideos, audioButtonsも最適化
export async function getLatestVideos(limit: number = 10): Promise<Video[]> {
  const videosColl = getCollection("videos");
  
  const query = videosColl
    .where('publishedAt', '>', 0)
    .orderBy('publishedAt', 'desc')
    .limit(limit);
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

#### Step 2: Firestore インデックスの追加

```hcl
# terraform/firestore_indexes.tf
resource "google_firestore_index" "works_published_at_desc" {
  collection = "works"
  
  fields {
    field_path = "publishedAt"
    order      = "DESCENDING"
  }
  
  fields {
    field_path = "__name__"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "works_r18_published_at" {
  collection = "works"
  
  fields {
    field_path = "isR18"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "publishedAt"
    order      = "DESCENDING"
  }
  
  fields {
    field_path = "__name__"
    order      = "DESCENDING"
  }
}
```

#### Step 3: キャッシュ戦略の更新

```typescript
// apps/web/src/lib/cache-utils.ts
export const getCachedLatestWorks = unstable_cache(
  async (limit: number, isR18: boolean) => {
    return await getLatestWorks(limit, isR18);
  },
  ["latest-works"],
  {
    tags: [CACHE_TAGS.works],
    revalidate: CACHE_DURATION.short, // 5分
  }
);
```

### 3. パフォーマンステスト

実装後、以下のメトリクスを確認：

```bash
# ローカルでのテスト
pnpm --filter @suzumina.click/web dev

# Cloud Loggingでのクエリパフォーマンス確認
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.query_time_ms>0" \
  --project=suzumina-click \
  --limit=50
```

期待される改善：
- Firestore読み取り回数: 1000+ → 30以下
- クエリ実行時間: 500ms → 50ms以下
- メモリ使用量: 大幅削減

## Phase 2: 共通コンポーネントの実装

### 1. 基本設計

```typescript
// packages/ui/src/components/common/ItemList/index.tsx
import { Suspense } from 'react';
import { ItemListContent } from './ItemListContent';
import { ItemListSkeleton } from './ItemListSkeleton';

export interface ItemListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  emptyMessage?: string;
}

export function ItemList<T>(props: ItemListProps<T>) {
  return (
    <Suspense fallback={<ItemListSkeleton />}>
      <ItemListContent {...props} />
    </Suspense>
  );
}
```

### 2. 使用例

```tsx
// apps/web/src/app/page.tsx
import { ItemList } from '@suzumina.click/ui/components/common/ItemList';
import { WorkCard } from '@/components/works/WorkCard';

export default async function HomePage() {
  const works = await getCachedLatestWorks(10, false);
  
  return (
    <ItemList
      items={works}
      renderItem={(work) => <WorkCard work={work} />}
      columns={3}
      gap="md"
      emptyMessage="作品がありません"
    />
  );
}
```

## Phase 3: 段階的展開計画

### 優先順位

1. **高優先度**（Week 1）
   - トップページ
   - 作品一覧ページ
   - 動画一覧ページ

2. **中優先度**（Week 2）
   - 検索結果ページ
   - ボタン一覧ページ
   - タグ別一覧ページ

3. **低優先度**（Week 3）
   - サークル詳細ページ
   - クリエイター詳細ページ
   - 管理画面

### 移行チェックリスト

各ページの移行時に確認すること：

- [ ] クエリの最適化（limit, where, orderBy）
- [ ] 必要なインデックスの追加
- [ ] キャッシュ戦略の実装
- [ ] 共通コンポーネントへの置き換え
- [ ] パフォーマンステストの実施
- [ ] エラーハンドリングの確認

## トラブルシューティング

### よくある問題

1. **インデックスエラー**
   ```
   Error: The query requires an index
   ```
   解決: Firebase Consoleのリンクをクリックしてインデックスを作成

2. **パフォーマンスが改善しない**
   - Cloud Loggingでクエリプランを確認
   - キャッシュが効いているか確認
   - N+1問題が発生していないか確認

3. **データの不整合**
   - キャッシュのrevalidate時間を調整
   - on-demand revalidationの実装を検討

## 参考リンク

- [Firestore Query Best Practices](https://firebase.google.com/docs/firestore/query-data/queries)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Performance Monitoring](https://console.cloud.google.com/monitoring)