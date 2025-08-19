# 関数型パターン実装集

suzumina.clickで実際に使える関数型パターンのレシピ集です。
コピー&ペーストで使える実装例を提供します。

## 目次

1. [基本パターン](#基本パターン)
2. [実装パターン](#実装パターン)
3. [Next.js統合パターン](#nextjs統合パターン)
4. [エラーハンドリング](#エラーハンドリング)
5. [テストパターン](#テストパターン)

---

## 基本パターン

### 1. イミュータブル更新パターン

```typescript
// ❌ Bad: ミュータブルな更新
function updateWork(work: Work, title: string): void {
  work.title = title; // 元のオブジェクトを変更
}

// ✅ Good: イミュータブルな更新
function updateWork(work: WorkData, title: string): WorkData {
  return {
    ...work,
    title,
    lastModified: new Date().toISOString()
  };
}

// ネストした更新
function updateWorkPrice(work: WorkData, newPrice: number): WorkData {
  return {
    ...work,
    price: {
      ...work.price,
      current: newPrice,
      discountRate: work.price.original 
        ? Math.round((1 - newPrice / work.price.original) * 100)
        : undefined
    },
    lastModified: new Date().toISOString()
  };
}

// 配列の更新
function addTag(work: WorkData, tag: string): WorkData {
  return {
    ...work,
    tags: [...(work.tags || []), tag]
  };
}

// 条件付き更新
function conditionalUpdate(work: WorkData, updates: Partial<WorkData>): WorkData {
  return {
    ...work,
    ...updates,
    lastModified: new Date().toISOString()
  };
}
```

### 2. 型安全なBranded Types

```typescript
// packages/shared-types/src/types/branded.ts

/**
 * Branded Type: 構造的には同じでも型レベルで区別
 */
type Brand<T, B> = T & { __brand: B };

// ドメイン固有のID型
export type WorkId = Brand<string, 'WorkId'>;
export type CircleId = Brand<string, 'CircleId'>;
export type UserId = Brand<string, 'UserId'>;

// スマートコンストラクタ
export const WorkId = {
  create: (id: string): WorkId | null => {
    if (!/^RJ\d{6,8}$/.test(id)) return null;
    return id as WorkId;
  },
  
  parse: (id: string): WorkId => {
    const result = WorkId.create(id);
    if (!result) throw new Error(`Invalid WorkId: ${id}`);
    return result;
  },
  
  is: (id: string): id is WorkId => {
    return /^RJ\d{6,8}$/.test(id);
  }
};

// 使用例
function fetchWork(id: WorkId): Promise<WorkData> {
  // WorkId型なので検証済みであることが保証される
  return firestore.collection('works').doc(id).get();
}

// コンパイルエラー: string は WorkId ではない
// fetchWork("RJ123456"); 

// 正しい使い方
const workId = WorkId.create("RJ123456");
if (workId) {
  await fetchWork(workId);
}
```

### 3. パイプライン合成パターン

```typescript
// packages/shared-types/src/utils/pipe.ts

/**
 * シンプルなpipe実装（fp-tsを使わない場合）
 */
export function pipe<A, B>(value: A, fn1: (a: A) => B): B;
export function pipe<A, B, C>(value: A, fn1: (a: A) => B, fn2: (b: B) => C): C;
export function pipe<A, B, C, D>(
  value: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D
): D;
export function pipe(value: any, ...fns: Function[]): any {
  return fns.reduce((acc, fn) => fn(acc), value);
}

// 使用例: Work データの変換パイプライン
const processWork = (rawData: any): WorkData | null => {
  return pipe(
    rawData,
    normalizeFieldNames,
    validateRequiredFields,
    enrichWithComputedFields,
    applyBusinessRules
  );
};

const normalizeFieldNames = (data: any) => ({
  id: data.id || data._id,
  productId: data.product_id || data.productId,
  title: data.title || data.name,
  // ...
});

const validateRequiredFields = (data: any): any | null => {
  if (!data.id || !data.title) return null;
  return data;
};

const enrichWithComputedFields = (data: any) => ({
  ...data,
  _computed: {
    thumbnailUrl: `/api/thumbnail/${data.productId}`,
    isNewRelease: isWithinDays(data.releaseDate, 30)
  }
});
```

---

## 実装パターン

### 4. リポジトリパターン（関数型）

```typescript
// packages/shared-types/src/repositories/work-repository.ts

import { Result, ok, err } from '../core/result';

/**
 * リポジトリインターフェース（関数の集合）
 */
export interface WorkRepository {
  findById: (id: WorkId) => Promise<Result<WorkData, Error>>;
  findByCircle: (circleId: CircleId) => Promise<Result<WorkData[], Error>>;
  save: (work: WorkData) => Promise<Result<void, Error>>;
  delete: (id: WorkId) => Promise<Result<void, Error>>;
}

/**
 * Firestore実装
 */
export const createFirestoreWorkRepository = (
  firestore: Firestore
): WorkRepository => {
  const collection = firestore.collection('works');
  
  return {
    findById: async (id) => {
      try {
        const doc = await collection.doc(id).get();
        if (!doc.exists) {
          return err(new Error(`Work ${id} not found`));
        }
        const data = transformFirestoreToWork(doc.data());
        return ok(data);
      } catch (error) {
        return err(error as Error);
      }
    },
    
    findByCircle: async (circleId) => {
      try {
        const snapshot = await collection
          .where('circle.id', '==', circleId)
          .get();
        
        const works = snapshot.docs
          .map(doc => transformFirestoreToWork(doc.data()))
          .filter(Boolean) as WorkData[];
        
        return ok(works);
      } catch (error) {
        return err(error as Error);
      }
    },
    
    save: async (work) => {
      try {
        await collection.doc(work.id).set(work);
        return ok(undefined);
      } catch (error) {
        return err(error as Error);
      }
    },
    
    delete: async (id) => {
      try {
        await collection.doc(id).delete();
        return ok(undefined);
      } catch (error) {
        return err(error as Error);
      }
    }
  };
};

// 使用例（DIパターン）
export const useWorkRepository = () => {
  const firestore = getFirestore();
  return createFirestoreWorkRepository(firestore);
};
```

### 5. ユースケースパターン

```typescript
// packages/shared-types/src/usecases/update-work-price.ts

import { Result, ok, err } from '../core/result';
import { WorkRepository } from '../repositories/work-repository';
import { WorkActions } from '../actions/work-actions';

/**
 * ユースケース: 作品価格更新
 * - ビジネスロジックの調整役
 * - 副作用を含む処理
 */
export const createUpdateWorkPriceUseCase = (
  repository: WorkRepository,
  notifier?: (work: WorkData) => Promise<void>
) => {
  return async (
    workId: WorkId,
    newPrice: number,
    originalPrice?: number
  ): Promise<Result<WorkData, Error>> => {
    // 1. 現在のデータ取得
    const workResult = await repository.findById(workId);
    if (isErr(workResult)) {
      return workResult;
    }
    
    const currentWork = workResult.value;
    
    // 2. ビジネスルール適用
    if (newPrice < 0) {
      return err(new Error('Price cannot be negative'));
    }
    
    if (originalPrice && newPrice > originalPrice) {
      return err(new Error('Discounted price cannot exceed original price'));
    }
    
    // 3. 更新処理（純粋関数）
    const updatedWork = WorkActions.updatePrice(
      currentWork,
      newPrice,
      originalPrice
    );
    
    // 4. 永続化
    const saveResult = await repository.save(updatedWork);
    if (isErr(saveResult)) {
      return err(saveResult.error);
    }
    
    // 5. 通知（オプション）
    if (notifier && WorkActions.isOnSale(updatedWork)) {
      await notifier(updatedWork).catch(console.error);
    }
    
    return ok(updatedWork);
  };
};

// 使用例
const updateWorkPrice = createUpdateWorkPriceUseCase(
  useWorkRepository(),
  async (work) => {
    // セール通知を送信
    await sendSaleNotification(work);
  }
);

const result = await updateWorkPrice(workId, 980, 1480);
```

### 6. 集約パターン（関数型）

```typescript
// packages/shared-types/src/aggregates/circle-aggregate.ts

/**
 * サークル集約: サークルと作品の一貫性を保つ
 */
export interface CircleAggregate {
  readonly circle: CircleData;
  readonly works: readonly WorkData[];
  readonly statistics: {
    readonly totalWorks: number;
    readonly averageRating: number;
    readonly totalSales: number;
  };
}

export const CircleAggregateActions = {
  /**
   * 作品追加（一貫性チェック付き）
   */
  addWork: (
    aggregate: CircleAggregate,
    work: WorkData
  ): Result<CircleAggregate, Error> => {
    // ビジネスルール: 同じサークルの作品のみ追加可能
    if (work.circle.id !== aggregate.circle.id) {
      return err(new Error('Work belongs to different circle'));
    }
    
    // ビジネスルール: 重複チェック
    if (aggregate.works.some(w => w.id === work.id)) {
      return err(new Error('Work already exists'));
    }
    
    // 新しい集約を作成
    const newWorks = [...aggregate.works, work];
    const newAggregate: CircleAggregate = {
      ...aggregate,
      works: newWorks,
      statistics: calculateStatistics(newWorks)
    };
    
    return ok(newAggregate);
  },
  
  /**
   * 統計情報の再計算
   */
  recalculateStatistics: (aggregate: CircleAggregate): CircleAggregate => ({
    ...aggregate,
    statistics: calculateStatistics(aggregate.works)
  })
};

const calculateStatistics = (works: readonly WorkData[]) => {
  const ratings = works
    .map(w => w.rating?.average)
    .filter((r): r is number => r !== undefined);
  
  return {
    totalWorks: works.length,
    averageRating: ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : 0,
    totalSales: works.reduce((sum, w) => sum + (w.salesCount || 0), 0)
  };
};
```

---

## Next.js統合パターン

### 7. Server Component データフェッチング

```typescript
// apps/web/src/app/works/[id]/page.tsx

import { cache } from 'react';
import { WorkActions } from '@suzumina.click/shared-types';
import { fetchWork } from '@/lib/firestore';

// React cacheでリクエスト内でのデータ共有
const getCachedWork = cache(async (id: string) => {
  const result = await fetchWork(id);
  if (isErr(result)) throw result.error;
  return result.value;
});

export default async function WorkPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const work = await getCachedWork(params.id);
  
  // 並列データフェッチ
  const [relatedWorks, circleInfo] = await Promise.all([
    fetchRelatedWorks(work.circle.id),
    fetchCircleInfo(work.circle.id)
  ]);
  
  return (
    <WorkLayout>
      <WorkDetail work={work} />
      <CircleInfo circle={circleInfo} />
      <RelatedWorks works={relatedWorks} />
    </WorkLayout>
  );
}

// Client Component に渡すデータは自動的にシリアライズされる
function WorkDetail({ work }: { work: WorkData }) {
  'use client';
  
  // クライアントでも同じ型が使える（PlainObjectなので）
  const formattedPrice = WorkActions.formatPrice(work);
  
  return <div>{formattedPrice}</div>;
}
```

### 8. Server Action パターン

```typescript
// apps/web/src/app/works/actions.ts

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { WorkActions, WorkRepository } from '@suzumina.click/shared-types';

// 入力検証スキーマ
const UpdatePriceSchema = z.object({
  workId: z.string(),
  newPrice: z.number().min(0),
  originalPrice: z.number().min(0).optional()
});

/**
 * Server Action: フォームから直接呼び出し可能
 */
export async function updateWorkPrice(formData: FormData) {
  // 1. 入力検証
  const parsed = UpdatePriceSchema.safeParse({
    workId: formData.get('workId'),
    newPrice: Number(formData.get('newPrice')),
    originalPrice: formData.get('originalPrice') 
      ? Number(formData.get('originalPrice'))
      : undefined
  });
  
  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors
    };
  }
  
  const { workId, newPrice, originalPrice } = parsed.data;
  
  try {
    // 2. リポジトリ取得
    const repository = useWorkRepository();
    
    // 3. 現在のデータ取得
    const workResult = await repository.findById(workId);
    if (isErr(workResult)) {
      return { error: 'Work not found' };
    }
    
    // 4. ビジネスロジック適用
    const updated = WorkActions.updatePrice(
      workResult.value,
      newPrice,
      originalPrice
    );
    
    // 5. 保存
    await repository.save(updated);
    
    // 6. キャッシュ無効化
    revalidatePath(`/works/${workId}`);
    revalidatePath('/works');
    
    return { success: true, data: updated };
  } catch (error) {
    console.error('Failed to update price:', error);
    return { error: 'Internal server error' };
  }
}

// Client Component から使用
export function PriceUpdateForm({ work }: { work: WorkData }) {
  'use client';
  
  return (
    <form action={updateWorkPrice}>
      <input type="hidden" name="workId" value={work.id} />
      <input 
        type="number" 
        name="newPrice" 
        defaultValue={work.price.current}
      />
      <input 
        type="number" 
        name="originalPrice" 
        defaultValue={work.price.original}
      />
      <button type="submit">更新</button>
    </form>
  );
}
```

### 9. Streaming SSR パターン

```typescript
// apps/web/src/app/works/page.tsx

import { Suspense } from 'react';
import { WorkListSkeleton } from '@/components/skeletons';

export default function WorksPage() {
  return (
    <div>
      <h1>作品一覧</h1>
      
      {/* 高速な初期レンダリング */}
      <Suspense fallback={<WorkListSkeleton />}>
        <WorkList />
      </Suspense>
      
      {/* 低優先度のコンテンツ */}
      <Suspense fallback={<div>Loading recommendations...</div>}>
        <Recommendations />
      </Suspense>
    </div>
  );
}

async function WorkList() {
  // データフェッチング（ストリーミング対応）
  const works = await fetchWorks();
  
  return (
    <div className="grid">
      {works.map(work => (
        <WorkCard key={work.id} work={work} />
      ))}
    </div>
  );
}

// 段階的なデータロード
async function Recommendations() {
  // 重いクエリ（ストリーミングで後から表示）
  const recommendations = await fetchRecommendations();
  
  return (
    <div>
      {recommendations.map(work => (
        <WorkCard key={work.id} work={work} />
      ))}
    </div>
  );
}
```

---

## エラーハンドリング

### 10. Result型パターン

```typescript
// packages/shared-types/src/core/result-extensions.ts

/**
 * Result型の拡張ユーティリティ
 */
export const ResultUtils = {
  /**
   * 複数のResultをまとめる
   */
  combine: <T, E>(...results: Result<T, E>[]): Result<T[], E> => {
    const errors = results.filter(isErr);
    if (errors.length > 0) {
      return err(errors[0].error);
    }
    
    const values = results.filter(isOk).map(r => r.value);
    return ok(values);
  },
  
  /**
   * Result配列を変換
   */
  traverse: <T, U, E>(
    items: T[],
    fn: (item: T) => Result<U, E>
  ): Result<U[], E> => {
    const results: U[] = [];
    
    for (const item of items) {
      const result = fn(item);
      if (isErr(result)) {
        return result;
      }
      results.push(result.value);
    }
    
    return ok(results);
  },
  
  /**
   * エラーを変換
   */
  mapError: <T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> => {
    if (isErr(result)) {
      return err(fn(result.error));
    }
    return result;
  },
  
  /**
   * デフォルト値を提供
   */
  unwrapOr: <T, E>(result: Result<T, E>, defaultValue: T): T => {
    return isOk(result) ? result.value : defaultValue;
  }
};

// 使用例
const fetchMultipleWorks = async (ids: string[]): Promise<Result<WorkData[], Error>> => {
  const results = await Promise.all(
    ids.map(id => fetchWork(id))
  );
  
  return ResultUtils.combine(...results);
};

// エラー変換
const result = await fetchWork(id);
const mappedResult = ResultUtils.mapError(
  result,
  error => ({ 
    code: 'WORK_NOT_FOUND',
    message: error.message 
  })
);
```

### 11. エラーリカバリパターン

```typescript
// packages/shared-types/src/patterns/error-recovery.ts

/**
 * リトライ付きフェッチ
 */
export const withRetry = async <T>(
  fn: () => Promise<Result<T, Error>>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<Result<T, Error>> => {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    const result = await fn();
    
    if (isOk(result)) {
      return result;
    }
    
    lastError = result.error;
    
    // リトライ可能なエラーかチェック
    if (!isRetryableError(lastError)) {
      return result;
    }
    
    // 指数バックオフ
    await new Promise(resolve => 
      setTimeout(resolve, delay * Math.pow(2, i))
    );
  }
  
  return err(lastError || new Error('Max retries exceeded'));
};

const isRetryableError = (error: Error): boolean => {
  return error.message.includes('UNAVAILABLE') ||
         error.message.includes('DEADLINE_EXCEEDED');
};

// フォールバック付きフェッチ
export const withFallback = async <T>(
  primary: () => Promise<Result<T, Error>>,
  fallback: () => Promise<Result<T, Error>>
): Promise<Result<T, Error>> => {
  const primaryResult = await primary();
  
  if (isOk(primaryResult)) {
    return primaryResult;
  }
  
  console.warn('Primary failed, trying fallback:', primaryResult.error);
  return fallback();
};

// 使用例
const fetchWorkWithRecovery = async (id: string) => {
  return withRetry(
    () => withFallback(
      () => fetchWorkFromFirestore(id),
      () => fetchWorkFromCache(id)
    )
  );
};
```

---

## テストパターン

### 12. 純粋関数のテスト

```typescript
// packages/shared-types/src/__tests__/work-actions.test.ts

import { describe, it, expect } from 'vitest';
import { WorkActions } from '../actions/work-actions';

describe('WorkActions', () => {
  describe('updatePrice', () => {
    it('should calculate discount rate correctly', () => {
      const work: WorkData = {
        id: 'work-1',
        productId: 'RJ123456',
        title: 'Test Work',
        price: { current: 1000 },
        circle: { id: 'circle-1', name: 'Test Circle' },
        releaseDate: '2024-01-01T00:00:00Z'
      };
      
      const updated = WorkActions.updatePrice(work, 800, 1000);
      
      expect(updated.price.current).toBe(800);
      expect(updated.price.original).toBe(1000);
      expect(updated.price.discountRate).toBe(20);
      expect(updated.lastModified).toBeDefined();
    });
    
    it('should handle price without original', () => {
      const work = createMockWork();
      const updated = WorkActions.updatePrice(work, 500);
      
      expect(updated.price.current).toBe(500);
      expect(updated.price.original).toBeUndefined();
      expect(updated.price.discountRate).toBeUndefined();
    });
  });
  
  describe('isNewRelease', () => {
    it('should return true for recent releases', () => {
      const work = createMockWork({
        releaseDate: new Date().toISOString()
      });
      
      expect(WorkActions.isNewRelease(work)).toBe(true);
    });
    
    it('should return false for old releases', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      
      const work = createMockWork({
        releaseDate: oldDate.toISOString()
      });
      
      expect(WorkActions.isNewRelease(work)).toBe(false);
    });
  });
});

// テスト用ヘルパー
function createMockWork(overrides?: Partial<WorkData>): WorkData {
  return {
    id: 'test-id',
    productId: 'RJ000000',
    title: 'Test Title',
    price: { current: 1000 },
    circle: { id: 'circle-1', name: 'Test Circle' },
    releaseDate: '2024-01-01T00:00:00Z',
    ...overrides
  };
}
```

### 13. リポジトリのモックテスト

```typescript
// packages/shared-types/src/__tests__/work-repository.test.ts

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createFirestoreWorkRepository } from '../repositories/work-repository';
import { ok, err } from '../core/result';

describe('WorkRepository', () => {
  let mockFirestore: any;
  let repository: WorkRepository;
  
  beforeEach(() => {
    // Firestoreモック作成
    mockFirestore = {
      collection: vi.fn().mockReturnThis(),
      doc: vi.fn().mockReturnThis(),
      get: vi.fn(),
      set: vi.fn(),
      where: vi.fn().mockReturnThis()
    };
    
    repository = createFirestoreWorkRepository(mockFirestore);
  });
  
  describe('findById', () => {
    it('should return work when found', async () => {
      const mockData = { id: 'RJ123456', title: 'Test' };
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => mockData
      });
      
      const result = await repository.findById('RJ123456' as WorkId);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.id).toBe('RJ123456');
      }
    });
    
    it('should return error when not found', async () => {
      mockFirestore.get.mockResolvedValue({
        exists: false
      });
      
      const result = await repository.findById('RJ999999' as WorkId);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not found');
      }
    });
  });
});
```

### 14. 統合テスト

```typescript
// apps/web/src/__tests__/integration/update-work-price.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { createUpdateWorkPriceUseCase } from '@suzumina.click/shared-types';
import { createMockRepository } from '../mocks/repository';

describe('UpdateWorkPrice Integration', () => {
  let useCase: ReturnType<typeof createUpdateWorkPriceUseCase>;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let notificationsSent: WorkData[] = [];
  
  beforeEach(() => {
    notificationsSent = [];
    mockRepository = createMockRepository();
    
    useCase = createUpdateWorkPriceUseCase(
      mockRepository,
      async (work) => {
        notificationsSent.push(work);
      }
    );
  });
  
  it('should update price and send notification for sale items', async () => {
    // Arrange
    const workId = WorkId.create('RJ123456')!;
    const originalWork = createMockWork({
      id: workId,
      price: { current: 1000 }
    });
    
    mockRepository.seed([originalWork]);
    
    // Act
    const result = await useCase(workId, 800, 1000);
    
    // Assert
    expect(isOk(result)).toBe(true);
    
    if (isOk(result)) {
      expect(result.value.price.current).toBe(800);
      expect(result.value.price.discountRate).toBe(20);
    }
    
    // 通知が送信されたことを確認
    expect(notificationsSent).toHaveLength(1);
    expect(notificationsSent[0].id).toBe(workId);
  });
  
  it('should reject negative prices', async () => {
    const workId = WorkId.create('RJ123456')!;
    mockRepository.seed([createMockWork({ id: workId })]);
    
    const result = await useCase(workId, -100);
    
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain('negative');
    }
  });
});
```

---

## パフォーマンス最適化

### 15. メモ化パターン

```typescript
// packages/shared-types/src/utils/memoize.ts

/**
 * 計算結果のメモ化
 */
export function memoize<Args extends unknown[], Result>(
  fn: (...args: Args) => Result
): (...args: Args) => Result {
  const cache = new Map<string, Result>();
  
  return (...args: Args): Result => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// 高コストな計算をメモ化
export const calculateWorkScore = memoize((work: WorkData): number => {
  // 複雑な計算
  const ratingScore = (work.rating?.average || 0) * 20;
  const reviewScore = Math.min((work.rating?.count || 0) / 10, 10);
  const recencyScore = WorkActions.isNewRelease(work) ? 10 : 0;
  
  return ratingScore + reviewScore + recencyScore;
});

// WeakMap を使ったオブジェクトキャッシュ
const workScoreCache = new WeakMap<WorkData, number>();

export function getWorkScore(work: WorkData): number {
  if (workScoreCache.has(work)) {
    return workScoreCache.get(work)!;
  }
  
  const score = calculateWorkScore(work);
  workScoreCache.set(work, score);
  return score;
}
```

---

## まとめ

このクックブックで紹介したパターンは、すべて**実際のコードにコピー&ペースト**して使えるように設計されています。

### 採用の指針

1. **新規機能**: 関数型パターンから始める
2. **既存コード**: 段階的に移行
3. **複雑なドメイン**: Entity パターンと併用

### チェックリスト

- [ ] イミュータブルデータ構造を使っている
- [ ] 純粋関数でビジネスロジックを表現している
- [ ] Result型でエラーハンドリングしている
- [ ] RSCとの相性を考慮している
- [ ] テストが書きやすい設計になっている

---

**最終更新**: 2025-08-18  
**バージョン**: 1.0.0