# Entity実装ガイド

**最終更新**: 2025-07-27  
**目的**: suzumina.clickプロジェクトでのEntity/Value Object実装の実用的ガイド

## 設計原則

1. **実用性優先**: 完璧な理論より動く実装
2. **型安全性**: TypeScript strict modeで完全な型安全性
3. **Next.js対応**: Server Components制約を考慮

## エンティティ実装パターン

### 基本構造

```typescript
export class EntityName {
  // プライベート読み取り専用プロパティ
  constructor(
    private readonly _id: EntityId,
    private readonly _content: ContentValueObject,
    private readonly _metadata: MetadataValueObject
  ) {}

  // Firestoreからの復元（必須）
  static fromFirestoreData(data: FirestoreData): EntityName | null {
    try {
      // 値オブジェクトの生成
      const id = new EntityId(data.id);
      const content = ContentValueObject.fromData(data);
      const metadata = MetadataValueObject.fromData(data);
      
      return new EntityName(id, content, metadata);
    } catch (error) {
      console.error('Failed to create entity:', error);
      return null; // エラー時はnullを返す
    }
  }

  // Plain Object変換（Server Components用）
  toPlainObject(): EntityPlainObject {
    return {
      id: this._id.value,
      content: this._content.toPlainObject(),
      metadata: this._metadata.toPlainObject(),
      
      // 計算済みプロパティ
      _computed: {
        displayName: this.getDisplayName(),
        isValid: this.isValid(),
        // その他のビジネスロジック結果
      }
    };
  }

  // ビジネスロジック
  isValid(): boolean {
    return this._content.isValid() && this._metadata.isActive();
  }

  // 更新メソッド（新しいインスタンスを返す）
  updateContent(newContent: ContentValueObject): EntityName {
    return new EntityName(this._id, newContent, this._metadata);
  }
}
```

## 値オブジェクト実装パターン

### 基本構造

```typescript
export class ValueObjectName {
  constructor(
    private readonly _value: string,
    private readonly _metadata?: any
  ) {
    // バリデーション
    if (!this.isValid(_value)) {
      throw new Error('Invalid value');
    }
  }

  get value(): string {
    return this._value;
  }

  // バリデーションロジック
  private isValid(value: string): boolean {
    return value.length > 0 && value.length <= 100;
  }

  // Plain Object変換
  toPlainObject(): any {
    return {
      value: this._value,
      metadata: this._metadata
    };
  }

  // 等価性判定
  equals(other: ValueObjectName): boolean {
    return this._value === other._value;
  }
}
```

## Server Components連携

### 問題
クラスインスタンスは直接Client Componentsに渡せない

### 解決策: Plain Object変換

```typescript
// Server Action
export async function getEntities() {
  const entities = await fetchEntitiesFromFirestore();
  
  // Plain Objectに変換
  return entities.map(entity => entity.toPlainObject());
}

// Client Component
function EntityList({ entities }: { entities: EntityPlainObject[] }) {
  return entities.map(entity => (
    <div key={entity.id}>
      {entity._computed.displayName}
    </div>
  ));
}
```

## Firestore連携

### Timestamp処理

```typescript
const convertTimestamp = (timestamp: unknown): Date | undefined => {
  if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
    return (timestamp as any).toDate();
  }
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }
  return undefined;
};
```

## 実装チェックリスト

### エンティティ
- [ ] `fromFirestoreData`静的メソッド実装
- [ ] `toPlainObject`メソッド実装
- [ ] ビジネスロジックをメソッドとして実装
- [ ] 更新メソッドは新しいインスタンスを返す

### 値オブジェクト
- [ ] コンストラクタでバリデーション
- [ ] 不変性を保証（readonlyプロパティ）
- [ ] `equals`メソッド実装
- [ ] `toPlainObject`メソッド実装

### テスト
- [ ] Firestore形式からの変換テスト
- [ ] Plain Object変換テスト
- [ ] ビジネスロジックのテスト
- [ ] エラーケースのテスト

## ファイル構成

```
packages/shared-types/src/
├── entities/
│   └── entity-name.ts      # エンティティクラス
├── value-objects/
│   └── value-object-name.ts # 値オブジェクトクラス
└── plain-objects/
    └── entity-plain.ts      # Plain Object型定義
```

## 参考実装

- `packages/shared-types/src/entities/video.ts` - Videoエンティティ
- `packages/shared-types/src/entities/audio-button.ts` - AudioButtonエンティティ
- `packages/shared-types/src/entities/work-entity.ts` - Workエンティティ