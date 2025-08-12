# TypeScript型安全性強化 実装ガイド

このガイドは、packages/shared-typesの型安全性強化とDDDパターン統一の実装方法を説明します。

> **実装ステータス**: ✅ 完了 (2025-08-11)
> - すべての値オブジェクトがBaseValueObjectを継承
> - すべてのエンティティがBaseEntityを継承  
> - Result/Eitherパターンを全面採用
> - Branded Typesを導入
> - レガシーメソッドを完全削除

## 目次
1. [概要](#概要)
2. [前提条件](#前提条件)
3. [実装パターン](#実装パターン)
4. [移行手順](#移行手順)
5. [テスト戦略](#テスト戦略)
6. [トラブルシューティング](#トラブルシューティング)

## 概要

このプロジェクトでは、以下の技術を使用してTypeScriptの型安全性を強化します：

- **Branded Types**: プリミティブ型に意味的な区別を追加
- **Result/Either パターン**: エラーを値として扱う
- **Zod**: ランタイムスキーマバリデーション
- **BaseEntity/BaseValueObject**: DDDパターンの統一

## 前提条件

### 必要なパッケージ

```bash
# 必須パッケージのインストール（インストール済み）
pnpm add neverthrow tiny-invariant

# 開発用パッケージ
pnpm add -D @types/node
```

> **Note**: Zodは削除されました。すべてのバリデーションはResult型を返すファクトリメソッドで実装されています。

### TypeScript設定

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

## 実装パターン

### 1. Branded Types

#### 基本実装

```typescript
// packages/shared-types/src/core/branded-types.ts
declare const __brand: unique symbol;
export type Brand<K, T> = K & { [__brand]: T };

// ID型の定義
export type WorkId = Brand<string, 'WorkId'>;
export type CircleId = Brand<string, 'CircleId'>;
export type UserId = Brand<string, 'UserId'>;
```

#### ファクトリ関数

```typescript
import { invariant } from 'tiny-invariant';

export const WorkId = {
  of: (value: string): WorkId => {
    invariant(
      value.match(/^RJ\d{6,8}$/),
      `Invalid WorkId format: ${value}`
    );
    return value as WorkId;
  },
  
  isValid: (value: string): value is WorkId => {
    return /^RJ\d{6,8}$/.test(value);
  }
};
```

#### 使用例

```typescript
// ✅ Good: 型安全
const workId = WorkId.of("RJ123456");
processWork(workId); // WorkIdを要求する関数

// ❌ Bad: コンパイルエラー
processWork("RJ123456"); // string型はWorkId型ではない
```

### 2. Result/Either パターン

#### 基本実装

```typescript
import { Result, ok, err } from 'neverthrow';

export type ValidationError = {
  field: string;
  message: string;
};

export type DomainError = 
  | ValidationError
  | { type: 'NotFound'; id: string }
  | { type: 'Unauthorized' }
  | { type: 'DatabaseError'; detail: string };
```

#### 値オブジェクトでの使用

```typescript
export class WorkTitle extends BaseValueObject<WorkTitle> {
  private constructor(
    private readonly value: string,
    private readonly masked: boolean = false
  ) {
    super();
  }
  
  static create(value: string): Result<WorkTitle, ValidationError> {
    // バリデーション
    if (!value || value.trim().length === 0) {
      return err({
        field: 'title',
        message: 'Title cannot be empty'
      });
    }
    
    if (value.length > 200) {
      return err({
        field: 'title',
        message: 'Title must be 200 characters or less'
      });
    }
    
    return ok(new WorkTitle(value));
  }
  
  // チェーン可能な操作
  mask(): WorkTitle {
    return new WorkTitle(this.value, true);
  }
  
  toString(): string {
    return this.masked ? '***' : this.value;
  }
}
```

#### エラーハンドリング

```typescript
// 関数型スタイル
const result = WorkTitle.create(input)
  .map(title => title.mask())
  .mapErr(error => ({
    ...error,
    timestamp: new Date()
  }));

// パターンマッチング風
if (result.isOk()) {
  console.log('Success:', result.value);
} else {
  console.error('Error:', result.error);
}

// 非同期処理
import { ResultAsync } from 'neverthrow';

function fetchWork(id: WorkId): ResultAsync<Work, DomainError> {
  return ResultAsync.fromPromise(
    database.findWork(id.toString()),
    (error) => ({ type: 'DatabaseError', detail: String(error) })
  ).andThen(data => 
    data ? ok(Work.fromData(data)) : err({ type: 'NotFound', id: id.toString() })
  );
}
```

### 3. Zodスキーマ統合

#### スキーマ定義

```typescript
import { z } from 'zod';

// 基本スキーマ
const WorkDataSchema = z.object({
  id: z.string().regex(/^RJ\d{6,8}$/),
  title: z.string().min(1).max(200),
  circle: z.object({
    id: z.string(),
    name: z.string().min(1)
  }),
  price: z.number().int().min(0),
  releaseDate: z.date(),
  categories: z.array(z.enum(['ADV', 'SOU', 'RPG', 'MOV'])),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

// 型の自動生成
export type WorkData = z.infer<typeof WorkDataSchema>;
```

#### エンティティクラスとの統合

```typescript
export class Work extends BaseEntity<Work> implements EntityValidatable<Work> {
  private constructor(
    private readonly data: WorkData,
    private readonly computed: {
      popularity: number;
      isNew: boolean;
    }
  ) {
    super();
  }
  
  static create(input: unknown): Result<Work, z.ZodError | DomainError> {
    // Zodでバリデーション
    const parseResult = WorkDataSchema.safeParse(input);
    if (!parseResult.success) {
      return err(parseResult.error);
    }
    
    // ビジネスルールの検証
    const data = parseResult.data;
    if (data.releaseDate > new Date()) {
      return err({
        type: 'ValidationError',
        field: 'releaseDate',
        message: 'Release date cannot be in the future'
      });
    }
    
    // 計算済みプロパティ
    const computed = {
      popularity: calculatePopularity(data),
      isNew: isWithinDays(data.releaseDate, 30)
    };
    
    return ok(new Work(data, computed));
  }
  
  // ゲッター
  get id(): WorkId { return WorkId.of(this.data.id); }
  get title(): string { return this.data.title; }
  get popularity(): number { return this.computed.popularity; }
  
  // ビジネスロジック
  applyDiscount(rate: number): Result<Work, ValidationError> {
    if (rate < 0 || rate > 1) {
      return err({
        field: 'rate',
        message: 'Discount rate must be between 0 and 1'
      });
    }
    
    const newData = {
      ...this.data,
      price: Math.floor(this.data.price * (1 - rate))
    };
    
    return Work.create(newData);
  }
  
  // EntityValidatable実装
  isValid(): boolean {
    return WorkDataSchema.safeParse(this.data).success;
  }
  
  getValidationErrors(): string[] {
    const result = WorkDataSchema.safeParse(this.data);
    if (result.success) return [];
    return result.error.issues.map(issue => 
      `${issue.path.join('.')}: ${issue.message}`
    );
  }
  
  // BaseEntity実装
  clone(): Work {
    return new Work(
      structuredClone(this.data),
      { ...this.computed }
    );
  }
  
  equals(other: Work): boolean {
    return this.data.id === other.data.id;
  }
}
```

### 4. 値オブジェクトの完全実装

```typescript
export class WorkPrice extends BaseValueObject<WorkPrice> 
  implements ValidatableValueObject<WorkPrice> {
  
  private constructor(
    private readonly amount: number,
    private readonly currency: 'JPY' | 'USD' = 'JPY',
    private readonly includesTax: boolean = true
  ) {
    super();
  }
  
  static create(
    amount: number,
    currency: 'JPY' | 'USD' = 'JPY'
  ): Result<WorkPrice, ValidationError> {
    if (amount < 0) {
      return err({
        field: 'amount',
        message: 'Price cannot be negative'
      });
    }
    
    if (!Number.isInteger(amount) && currency === 'JPY') {
      return err({
        field: 'amount',
        message: 'JPY prices must be integers'
      });
    }
    
    return ok(new WorkPrice(amount, currency));
  }
  
  static fromPlainObject(obj: unknown): Result<WorkPrice, ValidationError> {
    const schema = z.object({
      amount: z.number(),
      currency: z.enum(['JPY', 'USD']).optional(),
      includesTax: z.boolean().optional()
    });
    
    const result = schema.safeParse(obj);
    if (!result.success) {
      return err({
        field: 'price',
        message: 'Invalid price object'
      });
    }
    
    return WorkPrice.create(
      result.data.amount,
      result.data.currency
    );
  }
  
  // 値の取得
  getAmount(): number { return this.amount; }
  getCurrency(): 'JPY' | 'USD' { return this.currency; }
  
  // ビジネスロジック
  withTax(rate: number = 0.1): WorkPrice {
    if (!this.includesTax) {
      const newAmount = Math.floor(this.amount * (1 + rate));
      return new WorkPrice(newAmount, this.currency, true);
    }
    return this;
  }
  
  convertTo(targetCurrency: 'JPY' | 'USD', rate: number): Result<WorkPrice, ValidationError> {
    if (this.currency === targetCurrency) {
      return ok(this);
    }
    
    const newAmount = Math.floor(this.amount * rate);
    return WorkPrice.create(newAmount, targetCurrency);
  }
  
  // フォーマット
  format(): string {
    const formatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: this.currency
    });
    return formatter.format(this.amount);
  }
  
  // ValidatableValueObject実装
  isValid(): boolean {
    return this.amount >= 0 && 
           (this.currency === 'USD' || Number.isInteger(this.amount));
  }
  
  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (this.amount < 0) {
      errors.push('Price cannot be negative');
    }
    if (this.currency === 'JPY' && !Number.isInteger(this.amount)) {
      errors.push('JPY prices must be integers');
    }
    return errors;
  }
  
  // BaseValueObject実装
  clone(): WorkPrice {
    return new WorkPrice(this.amount, this.currency, this.includesTax);
  }
  
  toPlainObject(): object {
    return {
      amount: this.amount,
      currency: this.currency,
      includesTax: this.includesTax
    };
  }
}
```

## 移行手順

### ✅ Phase 1: 準備（完了）

1. ✅ パッケージインストール（neverthrow, tiny-invariant）
2. ✅ 基本型定義の作成（core/branded-types.ts, core/result.ts）
3. ✅ 既存テストの確認

### ✅ Phase 2: 値オブジェクト移行（完了）

1. ✅ BaseValueObject継承の追加
2. ✅ ValidatableValueObject実装
3. ✅ Result型への移行
4. ✅ テストの更新（全34テスト通過）

### ✅ Phase 3: エンティティ移行（完了）

1. ✅ BaseEntity継承の追加（Work, Video, AudioButton）
2. ✅ EntityValidatable実装
3. ✅ プライベートコンストラクタ + ファクトリメソッドパターン
4. ✅ ビジネスロジックの移動

### ✅ Phase 4: Branded Types導入（完了）

1. ✅ 型定義の作成（WorkId, CircleId, VideoId等）
2. ✅ ファクトリ関数の実装
3. ✅ 既存コードの更新
4. ✅ 型ガードの追加

### ✅ Phase 5: レガシーコード削除（完了）

1. ✅ すべてのlegacyメソッドを削除
2. ✅ Zodスキーマを削除
3. ✅ Server Actions を Result型対応に更新
4. ✅ 全テストを Result型対応に更新

## テスト戦略

### 値オブジェクトのテスト

```typescript
describe('WorkPrice', () => {
  describe('create', () => {
    it('should create valid price', () => {
      const result = WorkPrice.create(1000, 'JPY');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getAmount()).toBe(1000);
      }
    });
    
    it('should reject negative price', () => {
      const result = WorkPrice.create(-100, 'JPY');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.field).toBe('amount');
      }
    });
  });
  
  describe('business logic', () => {
    it('should apply tax correctly', () => {
      const price = WorkPrice.create(1000, 'JPY').unwrapOr(null);
      expect(price).not.toBeNull();
      
      const withTax = price!.withTax(0.1);
      expect(withTax.getAmount()).toBe(1100);
    });
  });
});
```

### プロパティベーステスト

```typescript
import fc from 'fast-check';

describe('WorkPrice properties', () => {
  it('should always be non-negative', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.constantFrom('JPY', 'USD'),
        (amount, currency) => {
          const result = WorkPrice.create(amount, currency as any);
          return result.isOk() && result.value.getAmount() >= 0;
        }
      )
    );
  });
});
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. 型の不一致エラー

```typescript
// 問題
const id: string = "RJ123456";
processWork(id); // エラー: string は WorkId ではない

// 解決
const id = WorkId.of("RJ123456");
processWork(id); // OK
```

#### 2. Result型のチェーン

```typescript
// 問題: ネストしたResult
const result = createWork(data)
  .andThen(work => work.applyDiscount(0.2))
  .andThen(work => saveWork(work));

// エラーハンドリング
result.match(
  work => console.log('Success:', work),
  error => console.error('Error:', error)
);
```

#### 3. Zodエラーの処理

```typescript
function handleZodError(error: z.ZodError): ValidationError[] {
  return error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message
  }));
}
```

## ベストプラクティス

### DO ✅

1. **早期リターン**: エラーは早期に返す
2. **不変性**: 値オブジェクトは常に不変
3. **型の明示**: 暗黙的な型変換を避ける
4. **テスト駆動**: 実装前にテストを書く
5. **段階的移行**: 小さな単位で移行

### DON'T ❌

1. **型アサーションの乱用**: `as` の使用は最小限に
2. **any型**: 使用禁止
3. **例外のスロー**: Result型を使用
4. **グローバル状態**: 純粋関数を優先
5. **過度な抽象化**: YAGNI原則を守る

## 参考資料

- [ADR-002: TypeScript型安全性強化](../decisions/architecture/ADR-002-typescript-type-safety-enhancement.md)
- [Domain Model Documentation](../reference/domain-model.md)
- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [Zod公式ドキュメント](https://zod.dev/)
- [Neverthrow公式ドキュメント](https://github.com/supermacro/neverthrow)