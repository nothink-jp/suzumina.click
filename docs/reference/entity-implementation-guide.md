# Entity実装ガイド

このガイドは、suzumina.clickプロジェクトでEntity/Value Objectパターンを実装する際の参考ドキュメントです。

## 実装前の確認事項

Entity実装を開始する前に、必ず以下を確認してください：

1. [ADR-001: DDD実装ガイドライン](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) - 実装判断基準
2. [ADR-002: Entity実装の教訓](../decisions/architecture/ADR-002-entity-implementation-lessons.md) - 過去の実装から学ぶ

## Entity実装パターン

### 1. 基本構造

```typescript
import { BaseEntity, type EntityValidatable } from "./base/entity";

export class SomeEntity extends BaseEntity<SomeEntity> 
  implements EntityValidatable<SomeEntity> {
  
  constructor(
    private readonly _id: SomeId,
    private readonly _name: SomeName,
    // ... other value objects
  ) {
    super();
    // validation logic
  }
  
  // Getters
  get id(): SomeId { return this._id; }
  
  // Business logic methods
  someBusinessMethod(): SomeEntity {
    // return new instance (immutability)
  }
  
  // Entity interface implementations
  isValid(): boolean { /* ... */ }
  getValidationErrors(): string[] { /* ... */ }
  clone(): SomeEntity { /* ... */ }
  equals(other: SomeEntity): boolean { /* ... */ }
  
  // Factory methods
  static create(...args): SomeEntity { /* ... */ }
  static fromFirestoreData(data: any): SomeEntity { /* ... */ }
  
  // Conversion methods
  toFirestore(): FirestoreData { /* ... */ }
  toPlainObject(): PlainObject { /* ... */ }
}
```

### 2. Value Object実装

```typescript
export class SomeId {
  constructor(private readonly value: string) {
    // validation
    if (!value || value.trim().length === 0) {
      throw new Error("ID cannot be empty");
    }
  }
  
  toString(): string { return this.value; }
  
  equals(other: SomeId): boolean {
    return other instanceof SomeId && this.value === other.value;
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

各Entityには包括的なテストが必要です：

```typescript
describe("SomeEntity", () => {
  describe("constructor", () => {
    it("should create valid entity", () => { /* ... */ });
    it("should throw on invalid data", () => { /* ... */ });
  });
  
  describe("business logic", () => {
    it("should perform business operation", () => { /* ... */ });
  });
  
  describe("validation", () => {
    it("should validate correctly", () => { /* ... */ });
  });
  
  describe("serialization", () => {
    it("should convert to/from Firestore", () => { /* ... */ });
    it("should convert to PlainObject", () => { /* ... */ });
  });
});
```

## 実装チェックリスト

- [ ] ビジネスルールを5個以上リストアップ
- [ ] Value Objectの必要性を検討
- [ ] 不変性（Immutability）の確保
- [ ] 包括的なバリデーション
- [ ] Firestore変換メソッド
- [ ] PlainObject変換メソッド（Server Components用）
- [ ] 単体テスト（カバレッジ100%目標）
- [ ] ドキュメント更新

## 参考実装

成功例：
- [Video Entity](../../packages/shared-types/src/entities/video.ts)
- [Work Entity](../../packages/shared-types/src/entities/work.ts)

## 注意事項

1. **YAGNI原則**: 必要になるまで実装しない
2. **段階的実装**: 最小限から始めて徐々に拡張
3. **ROI考慮**: 実装コストが利益を上回る場合は見送る

詳細な判断基準は [ADR-001](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) を参照してください。