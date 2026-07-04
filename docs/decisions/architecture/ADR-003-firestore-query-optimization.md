# ADR-003: Firestore クエリ最適化とコンポーネント共通化

## ステータス

**置き換え済み（Superseded）**（2026-07-04・SPR-244 で確定。以下の本文は当時の提案の記録としてそのまま残す）

本 ADR は「提案中」のまま実装されず、前提も実体と乖離していた:
提案が依拠する `works.publishedAt` / `works.isR18` というフィールドは本番 works に存在しない
（実フィールドは `releaseDateISO` / `ageRating`。`audioButtons` も `publishedAt` でなく `createdAt`）。
つまり提案どおりには実装不可能な文書だった。意図した目標は別系譜で達成されている:

| Phase | 帰結 | 実際の後継 |
|---|---|---|
| Phase 1: トップページのクエリ最適化 | 別方針で達成 | home 3 セクションの `unstable_cache`(60s) + limit(10)（SPR-71） |
| Phase 2: 共通リストコンポーネント | 別名で実現 | `packages/ui` の `ConfigurableList` / `list-page-layout`（ItemList という形では作らず） |
| Phase 3: 全ページのクエリ最適化 | 逆方針で置換 | 「全件取得 + in-memory フィルタ + cache（60s〜24h）」を正式採用（SPR-213 / SPR-218） |

インデックス追加でなく「全件 + cache」が正になったため、本 ADR のインデックス表も無効
（複合インデックスの正本は terraform + live。棚卸しは SPR-213）。

## コンテキスト
価格最適化後、高レイテンシアラート（P95）が頻発しています。調査の結果、以下の問題が判明しました：

1. 全コレクションスキャンによる大量のFirestore読み取り
2. 非効率なクエリパターン（インデックス未使用）
3. 同じようなリスト表示UIが複数箇所で重複実装されている
4. 各ページで異なるクエリ実装により、保守性が低下

## 決定事項

### Phase 1: トップページのクエリ最適化（即時実施）
1. インデックスを活用した効率的なクエリへの変更
2. limit句による取得件数の制限
3. 必要最小限のフィールドのみ取得

### Phase 2: 共通リストコンポーネントの設計（次期実装）
1. 汎用的なリスト表示コンポーネントの作成
2. 統一されたページネーション機能
3. 一貫したローディング・エラー処理

### Phase 3: 全ページへの段階的展開（中期計画）
1. 動画一覧、ボタン一覧、作品一覧への適用
2. 検索結果ページの最適化
3. サークル詳細、クリエイター詳細の最適化

## 詳細設計

### 1. クエリ最適化パターン

#### Before（非効率）
```typescript
// 全ドキュメント取得後にフィルタリング
const snapshot = await worksColl.get();
const works = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(work => !isR18 || !work.isR18)
  .sort((a, b) => b.publishedAt - a.publishedAt)
  .slice(0, limit);
```

#### After（最適化）
```typescript
// インデックスを使用した効率的なクエリ
let query = worksColl
  .where('publishedAt', '>', 0)  // インデックス使用のトリガー
  .orderBy('publishedAt', 'desc')
  .limit(limit);

if (!isR18) {
  query = query.where('isR18', '==', false);
}

const snapshot = await query.get();
```

### 2. 必要なFirestoreインデックス

```yaml
# works コレクション
- collection: works
  fields:
    - fieldPath: publishedAt
      order: DESCENDING
    - fieldPath: isR18
      order: ASCENDING

- collection: works
  fields:
    - fieldPath: isR18
      order: ASCENDING
    - fieldPath: publishedAt
      order: DESCENDING

# videos コレクション
- collection: videos
  fields:
    - fieldPath: publishedAt
      order: DESCENDING

# audioButtons コレクション
- collection: audioButtons
  fields:
    - fieldPath: publishedAt
      order: DESCENDING
```

### 3. 共通リストコンポーネント設計

```typescript
// packages/ui/src/components/common/ItemList.tsx
interface ItemListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  loading?: boolean;
  error?: Error;
  emptyMessage?: string;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
}

export function ItemList<T>({ 
  items, 
  renderItem, 
  loading, 
  error,
  emptyMessage = "アイテムがありません",
  loadMore,
  hasMore 
}: ItemListProps<T>) {
  // 共通のリスト表示ロジック
}
```

### 4. Server Action の統一パターン

```typescript
// 共通の取得パターン
export async function getItems<T>(
  collection: string,
  options: {
    limit: number;
    orderBy: string;
    orderDirection: 'asc' | 'desc';
    where?: Array<[string, WhereFilterOp, any]>;
    startAfter?: any;
  }
): Promise<{ items: T[]; hasMore: boolean }> {
  // 統一されたクエリロジック
}
```

## 実装計画

### Phase 1: トップページ最適化（1-2日）
- [ ] getLatestWorks, getLatestVideos, getLatestAudioButtons の最適化
- [ ] Terraformでインデックス定義を追加
- [ ] パフォーマンステストの実施

### Phase 2: 共通コンポーネント開発（3-5日）
- [ ] ItemList コンポーネントの実装
- [ ] ページネーション機能の実装
- [ ] 既存ページでの動作確認

### Phase 3: 全体展開（1-2週間）
- [ ] 各一覧ページの移行
- [ ] 検索機能の最適化
- [ ] 詳細ページの最適化

## 期待される効果

1. **パフォーマンス向上**
   - Firestore読み取り回数: 90%削減
   - ページ読み込み時間: 50%短縮
   - レイテンシ（P95）: 2秒以下

2. **コスト削減**
   - Firestore読み取りコスト: 月額1,500円→150円
   - 全体コスト: 月額7,000円→4,000円以下

3. **開発効率向上**
   - コンポーネントの再利用性向上
   - 統一されたUXの実現
   - 保守性の向上

## リスクと対策

1. **インデックス作成時のダウンタイム**
   - 対策: Firestoreは自動でインデックスを作成するため、ダウンタイムなし

2. **既存機能への影響**
   - 対策: 段階的な移行とテストの充実

3. **複雑なクエリへの対応**
   - 対策: 必要に応じてCloud Functionsでの処理も検討

## 参考資料
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Next.js App Router Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)
- [ADR-001: DDD実装ガイドライン](./ADR-001-ddd-implementation-guidelines.md)