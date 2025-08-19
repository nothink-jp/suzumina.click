# 新機能なしで関数型移行を開始する戦略

新機能開発がない期間に、既存コードを関数型パターンへ移行する実践的なアプローチです。

## 移行優先順位

### 🎯 最優先: 低リスク・高効果の対象

#### 1. ユーティリティ関数の移行（1-3日）

現状のユーティリティ関数を関数型パターンに整理：

```typescript
// Before: 散在するヘルパー関数
// apps/web/src/utils/work-helpers.ts
export function isNewWork(work: Work | WorkPlainObject) {
  const date = work instanceof Work ? work.releaseDate : work.releaseDate;
  // 複雑な型チェック
}

// After: 統一された関数型アプローチ
// packages/shared-types/src/actions/work-utils.ts
export const WorkUtils = {
  isNewRelease: (work: WorkData): boolean => 
    isWithinDays(work.releaseDate, 30),
    
  formatPrice: (price: number, locale = 'ja'): string =>
    new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: 'JPY' 
    }).format(price),
    
  calculateDiscount: (current: number, original: number): number =>
    Math.round((1 - current / original) * 100)
} as const;
```

**メリット**:
- 既存の動作を変えない
- テストが書きやすい
- 即座に効果を実感できる

#### 2. Firestoreデータ変換層（3-5日）

```typescript
// packages/shared-types/src/transformers/firestore-transformers.ts

// Before: Entity経由の複雑な変換
const work = Work.fromFirestoreData(data);
return work.toPlainObject();

// After: 直接変換
export const FirestoreTransformers = {
  toWorkData: (doc: DocumentData): WorkData => ({
    id: doc.id,
    productId: doc.product_id || doc.productId,
    title: doc.title,
    price: {
      current: doc.price?.current || 0,
      original: doc.price?.original,
      discountRate: doc.price?.discount_rate
    },
    circle: {
      id: doc.circle_id || doc.circleId,
      name: doc.circle_name || doc.circleName
    },
    releaseDate: doc.release_date || doc.releaseDate,
    lastModified: doc.last_modified || doc.lastModified
  }),
  
  fromWorkData: (work: WorkData): DocumentData => ({
    product_id: work.productId,
    title: work.title,
    price: work.price,
    circle_id: work.circle.id,
    circle_name: work.circle.name,
    release_date: work.releaseDate,
    last_modified: work.lastModified || new Date().toISOString()
  })
};
```

### 🔄 中優先: シンプルなドメインの移行

#### 3. Metadata系の移行（1週間）

```typescript
// packages/shared-types/src/models/dlsite-metadata.ts

// 現状: 単純なインターフェース（Entity化不要）
export interface DlsiteMetadata {
  lastFullUpdate?: string;
  lastIncrementalUpdate?: string;
  totalWorks: number;
}

// 関数型アクションを追加
export const DlsiteMetadataActions = {
  needsFullUpdate: (metadata: DlsiteMetadata): boolean => {
    if (!metadata.lastFullUpdate) return true;
    const lastUpdate = new Date(metadata.lastFullUpdate);
    const daysSince = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 7;
  },
  
  updateTimestamp: (
    metadata: DlsiteMetadata, 
    type: 'full' | 'incremental'
  ): DlsiteMetadata => ({
    ...metadata,
    [type === 'full' ? 'lastFullUpdate' : 'lastIncrementalUpdate']: 
      new Date().toISOString()
  })
};
```

#### 4. Circle/Creator の簡素化（1週間）

```typescript
// packages/shared-types/src/models/circle.ts

export interface CircleData {
  readonly id: string;
  readonly name: string;
  readonly nameEn?: string;
  readonly workIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const CircleActions = {
  addWork: (circle: CircleData, workId: string): CircleData => {
    if (circle.workIds.includes(workId)) return circle;
    
    return {
      ...circle,
      workIds: [...circle.workIds, workId],
      updatedAt: new Date().toISOString()
    };
  },
  
  removeWork: (circle: CircleData, workId: string): CircleData => ({
    ...circle,
    workIds: circle.workIds.filter(id => id !== workId),
    updatedAt: new Date().toISOString()
  }),
  
  isNewCircle: (circle: CircleData): boolean =>
    isWithinDays(circle.createdAt, 90),
    
  getWorkCount: (circle: CircleData): number =>
    circle.workIds.length
};
```

### 📊 効果測定: ビフォー・アフター

#### パフォーマンス計測の実装

```typescript
// packages/shared-types/src/utils/performance.ts

export const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  return { result, duration };
};

// 使用例
const { result: workEntity, duration: entityTime } = 
  await measurePerformance('Entity Pattern', async () => {
    const entity = await Work.fromFirestoreData(data);
    return entity.toPlainObject();
  });

const { result: workData, duration: functionalTime } = 
  await measurePerformance('Functional Pattern', async () => {
    return FirestoreTransformers.toWorkData(data);
  });

console.log(`Speed improvement: ${((1 - functionalTime/entityTime) * 100).toFixed(1)}%`);
```

## 実装手順

### Week 1: 基盤整備

```bash
# 1. 新しいディレクトリ構造を作成
mkdir -p packages/shared-types/src/{models,actions,transformers,validators}

# 2. 基本的な型定義を移行
touch packages/shared-types/src/models/work-data.ts
touch packages/shared-types/src/models/circle-data.ts

# 3. テスト環境を準備
touch packages/shared-types/src/__tests__/actions/work-actions.test.ts
```

### Week 2-3: 段階的移行

```typescript
// Step 1: 並行実装（既存を壊さない）
export const getWork = async (id: string) => {
  const data = await fetchFromFirestore(id);
  
  if (USE_FUNCTIONAL_PATTERN) {
    // 新しい関数型パターン
    return FirestoreTransformers.toWorkData(data);
  } else {
    // 既存のEntityパターン
    const entity = Work.fromFirestoreData(data);
    return entity.toPlainObject();
  }
};

// Step 2: A/Bテスト
export const getWorkWithComparison = async (id: string) => {
  const [entityResult, functionalResult] = await Promise.all([
    getWorkViaEntity(id),
    getWorkViaFunctional(id)
  ]);
  
  // 結果を比較
  if (!deepEqual(entityResult, functionalResult)) {
    console.warn('Results differ:', { entityResult, functionalResult });
  }
  
  return functionalResult;
};
```

### Week 4: 切り替えと検証

```typescript
// 機能フラグで段階的切り替え
export const FEATURE_FLAGS = {
  USE_FUNCTIONAL_WORK: process.env.USE_FUNCTIONAL_WORK === 'true',
  USE_FUNCTIONAL_CIRCLE: process.env.USE_FUNCTIONAL_CIRCLE === 'true',
  USE_FUNCTIONAL_CREATOR: process.env.USE_FUNCTIONAL_CREATOR === 'true',
} as const;

// 切り替え可能な実装
export const WorkService = FEATURE_FLAGS.USE_FUNCTIONAL_WORK
  ? FunctionalWorkService
  : EntityWorkService;
```

## リスク管理

### 1. 型の不整合を防ぐ

```typescript
// 移行期間中の型安全性を保証
type WorkCompatible = WorkEntity | WorkPlainObject | WorkData;

export const isWorkData = (work: WorkCompatible): work is WorkData =>
  'productId' in work && !('toPlainObject' in work);

export const normalizeWork = (work: WorkCompatible): WorkData => {
  if ('toPlainObject' in work) {
    return work.toPlainObject() as unknown as WorkData;
  }
  return work as WorkData;
};
```

### 2. テストカバレッジの維持

```typescript
// 既存テストを関数型でも実行
describe('Work Actions Compatibility', () => {
  const testCases = [
    { input: mockWork1, expected: expectedResult1 },
    { input: mockWork2, expected: expectedResult2 },
  ];
  
  testCases.forEach(({ input, expected }) => {
    it(`should handle ${input.id} correctly`, () => {
      // Entity版
      const entityResult = WorkEntity.process(input);
      expect(entityResult).toEqual(expected);
      
      // 関数型版
      const functionalResult = WorkActions.process(input);
      expect(functionalResult).toEqual(expected);
      
      // 両者が一致
      expect(functionalResult).toEqual(entityResult);
    });
  });
});
```

## チェックリスト

### 移行開始前
- [ ] パフォーマンス計測基盤の設置
- [ ] 関数型パターンのドキュメント理解
- [ ] テスト環境の準備
- [ ] 機能フラグの実装

### 移行中
- [ ] ユーティリティ関数の関数型化
- [ ] Firestore変換層の実装
- [ ] Metadata系の移行
- [ ] Circle/Creatorの簡素化
- [ ] A/Bテストの実施

### 移行後
- [ ] パフォーマンス改善の確認
- [ ] Bundle サイズ削減の確認
- [ ] テストカバレッジの維持
- [ ] ドキュメントの更新
- [ ] 不要なEntityコードの削除

## 期待される成果（1ヶ月後）

| 指標 | 現在 | 目標 | 削減率 |
|------|------|------|--------|
| Bundle Size | 292KB | 200KB | 31% |
| Cold Start | 100ms | 60ms | 40% |
| 変換処理時間 | 50ms | 10ms | 80% |
| コード行数 | 37,292行 | 25,000行 | 33% |
| テストカバレッジ | 80% | 85% | +5% |

---

**最終更新**: 2025-08-18  
**ステータス**: 実施可能