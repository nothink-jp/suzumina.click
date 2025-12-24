# Entity実装ガイド

このガイドは、suzumina.clickプロジェクトでEntity/Value Objectパターンを実装する際の参考ドキュメントです。

> **実装ステータス**: ✅ Result/Eitherパターン採用済み (2025-08-11)
> - すべてのファクトリメソッドがResult型を返す
> - プライベートコンストラクタパターンを採用
> - エラーを値として扱う（例外をスローしない）

> **重要な決定**: ⚠️ 関数型パターンへの移行を断念 (2025-08-19)
> - Entity/PlainObjectパターンから関数型パターンへの移行を試みたが、本番環境での表示不具合が発生
> - 現行のEntity/PlainObjectパターンを維持し、安定性を優先する方針に決定
> - 詳細は[ADR-005: Entity実装の教訓](../decisions/architecture/ADR-005-entity-implementation-lessons.md)を参照

## 実装前の確認事項

Entity実装を開始する前に、必ず以下を確認してください：

1. [ADR-001: DDD実装ガイドライン](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) - 実装判断基準
2. [ADR-005: Entity実装の教訓](../decisions/architecture/ADR-005-entity-implementation-lessons.md) - 過去の実装から学ぶ

## Entity実装パターン

### 1. 基本構造（Result型パターン）

```typescript
import { BaseEntity, type EntityValidatable } from "./base/entity";
import { Result, ok, err } from "../core/result";
import type { DatabaseError } from "../core/errors";

export class SomeEntity extends BaseEntity<SomeEntity> 
  implements EntityValidatable<SomeEntity> {
  
  // プライベートコンストラクタ（直接呼び出し不可）
  private constructor(
    private readonly _id: SomeId,
    private readonly _name: SomeName,
    // ... other value objects
  ) {
    super();
  }
  
  // Getters
  get id(): SomeId { return this._id; }
  
  // Business logic methods
  someBusinessMethod(): Result<SomeEntity, ValidationError> {
    // バリデーション
    if (!this.canPerformOperation()) {
      return err({ field: 'entity', message: 'Cannot perform operation' });
    }
    // return new instance (immutability)
    return ok(new SomeEntity(...));
  }
  
  // Entity interface implementations
  isValid(): boolean { /* ... */ }
  getValidationErrors(): string[] { /* ... */ }
  clone(): SomeEntity { /* ... */ }
  equals(other: SomeEntity): boolean { /* ... */ }
  
  // Factory methods（Result型を返す）
  static create(...args): Result<SomeEntity, ValidationError> {
    // バリデーション
    // 成功時: return ok(new SomeEntity(...))
    // 失敗時: return err({...})
  }
  
  static fromFirestoreData(data: any): Result<SomeEntity, DatabaseError> {
    // データ検証と変換
    // 成功時: return ok(new SomeEntity(...))
    // 失敗時: return err({...})
  }
  
  // Conversion methods
  toFirestore(): FirestoreData { /* ... */ }
  toPlainObject(): PlainObject { /* ... */ }
```

### 2. Value Object実装（BaseValueObject継承）

```typescript
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";
import { Result, ok, err } from "../core/result";
import type { ValidationError } from "../core/errors";

export class SomeId extends BaseValueObject<SomeId> 
  implements ValidatableValueObject<SomeId> {
  
  // プライベートコンストラクタ
  private constructor(private readonly value: string) {
    super();
  }
  
  // ファクトリメソッド（Result型を返す）
  static create(value: string): Result<SomeId, ValidationError> {
    // validation
    if (!value || value.trim().length === 0) {
      return err({ 
        field: 'id', 
        message: 'ID cannot be empty' 
      });
    }
    return ok(new SomeId(value));
  }
  
  // 値の取得
  toString(): string { return this.value; }
  getValue(): string { return this.value; }
  
  // ValidatableValueObject実装
  isValid(): boolean { 
    return this.value && this.value.trim().length > 0;
  }
  
  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.value || this.value.trim().length === 0) {
      errors.push('ID cannot be empty');
    }
    return errors;
  }
  
  // BaseValueObject実装
  equals(other: SomeId): boolean {
    return other instanceof SomeId && this.value === other.value;
  }
  
  clone(): SomeId {
    return new SomeId(this.value);
  }
  
  toPlainObject(): string {
    return this.value;
  }
}
```

### 3. PlainObject定義（Server/Client境界用）

```typescript
export interface SomePlainObject {
  id: string;
  name: string;
  // ... other properties (primitive types only)
}
```

## テスト実装

各Entityには包括的なテストが必要です（Result型対応）：

```typescript
describe("SomeEntity", () => {
  describe("create", () => {
    it("should create valid entity", () => {
      const result = SomeEntity.create(validData);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id.toString()).toBe(validData.id);
      }
    });
    
    it("should return error on invalid data", () => {
      const result = SomeEntity.create(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.field).toBe('expectedField');
        expect(result.error.message).toContain('expected message');
      }
    });
  });
  
  describe("business logic", () => {
    it("should perform business operation", () => {
      const entity = SomeEntity.create(validData).value!;
      const result = entity.someBusinessMethod();
      expect(result.isOk()).toBe(true);
    });
  });
  
  describe("validation", () => {
    it("should validate correctly", () => {
      const entity = SomeEntity.create(validData).value!;
      expect(entity.isValid()).toBe(true);
      expect(entity.getValidationErrors()).toHaveLength(0);
    });
  });
  
  describe("serialization", () => {
    it("should convert from Firestore", () => {
      const result = SomeEntity.fromFirestoreData(firestoreData);
      expect(result.isOk()).toBe(true);
    });
    
    it("should convert to PlainObject", () => {
      const entity = SomeEntity.create(validData).value!;
      const plain = entity.toPlainObject();
      expect(plain.id).toBe(validData.id);
    });
  });
});
```

## 実装チェックリスト

- [ ] ビジネスルールを5個以上リストアップ
- [ ] Value Objectの必要性を検討
- [ ] BaseEntity/BaseValueObjectを継承
- [ ] プライベートコンストラクタの使用
- [ ] Result型を返すファクトリメソッド
- [ ] 不変性（Immutability）の確保
- [ ] 包括的なバリデーション（例外をスローしない）
- [ ] Firestore変換メソッド（Result型対応）
- [ ] PlainObject変換メソッド（Server Components用）
- [ ] 単体テスト（Result型対応、カバレッジ100%目標）
- [ ] ドキュメント更新

## 参考実装

成功例：
- [Video Entity](../../packages/shared-types/src/entities/video.ts)
- [Work Entity](../../packages/shared-types/src/entities/work.ts)

## 注意事項

1. **エラーハンドリング**: 例外をスローせず、Result型でエラーを返す
2. **プライベートコンストラクタ**: すべてのEntity/Value Objectで採用
3. **YAGNI原則**: 必要になるまで実装しない
4. **段階的実装**: 最小限から始めて徐々に拡張
5. **ROI考慮**: 実装コストが利益を上回る場合は見送る

詳細な判断基準は以下を参照：
- [ADR-001: DDD実装ガイドライン](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md)
- [ADR-002: TypeScript型安全性強化](../decisions/architecture/ADR-002-typescript-type-safety-enhancement.md)

---

**最終更新**: 2025-08-11
**バージョン**: 2.0 (Result型パターン採用)