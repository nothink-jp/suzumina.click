# Entity実装ガイドライン

**作成日**: 2025-07-26  
**目的**: VideoエンティティのEntity/Value Objectアーキテクチャ実装から得られた知見を基に、他のエンティティ実装の標準ガイドラインを定める

## 概要

本ドキュメントは、suzumina.clickプロジェクトにおけるEntity/Value Objectアーキテクチャの実装ガイドラインです。VideoエンティティとAudioButtonエンティティの実装経験を基に、今後のエンティティ実装の標準的なアプローチを定義します。

## 基本原則

### 1. イミュータブル設計
- すべてのエンティティと値オブジェクトはイミュータブルとして設計する
- 状態変更は新しいインスタンスを返すメソッドとして実装する
- コンストラクタはprivateとし、ファクトリメソッドを提供する

### 2. 型安全性
- プリミティブ型の直接使用を避け、値オブジェクトでラップする
- 型ガードを活用して実行時の型安全性を確保する
- ジェネリクスは最小限に留め、明示的な型定義を優先する

### 3. ドメインロジックの集約
- ビジネスロジックはエンティティ内に実装する
- 外部サービスへの依存は避け、純粋関数として実装する
- 計算結果はメソッドまたはgetterとして提供する

## 実装パターン

### エンティティの基本構造

```typescript
export class EntityName {
  // 1. プライベートコンストラクタ
  private constructor(
    private readonly id: EntityId,
    private readonly property1: ValueObject1,
    private readonly property2: ValueObject2,
    // ...
  ) {}

  // 2. ファクトリメソッド
  public static create(params: CreateParams): EntityName {
    // バリデーション
    // 値オブジェクトの生成
    // エンティティの生成
    return new EntityName(id, property1, property2);
  }

  // 3. Firestoreからの復元
  public static fromFirestore(data: FirestoreData): EntityName | null {
    try {
      // データの検証
      // 値オブジェクトへの変換
      // エンティティの生成
      return new EntityName(id, property1, property2);
    } catch (error) {
      // エラーログ
      return null;
    }
  }

  // 4. レガシーフォーマットからの変換（移行期間中のみ）
  public static fromLegacy(data: LegacyData): EntityName {
    // レガシーデータの変換
    // エンティティの生成
    return new EntityName(id, property1, property2);
  }

  // 5. ゲッター（必要最小限）
  get id(): string { return this.id.toString(); }

  // 6. ビジネスロジック
  public businessMethod(): BusinessResult {
    // ドメインロジックの実装
  }

  // 7. 更新メソッド（新しいインスタンスを返す）
  public updateProperty(newValue: ValueObject1): EntityName {
    return new EntityName(this.id, newValue, this.property2);
  }

  // 8. Firestore保存用変換
  public toFirestore(): FirestoreData {
    return {
      id: this.id.toString(),
      property1: this.property1.toFirestore(),
      property2: this.property2.toFirestore(),
      _metadata: {
        version: 'v2',
        updatedAt: new Date().toISOString()
      }
    };
  }

  // 9. Plain Object変換（Server Component用）
  public toPlainObject(): EntityPlainObject {
    return {
      // 元データ
      id: this.id.toString(),
      property1: this.property1.toString(),
      property2: this.property2.toJSON(),
      
      // 計算済みプロパティ
      _computed: {
        derivedValue1: this.calculateDerivedValue1(),
        derivedValue2: this.calculateDerivedValue2(),
      }
    };
  }

  // 10. レガシーフォーマット変換（移行期間中のみ）
  public toLegacyFormat(): LegacyData {
    return {
      // レガシー形式へのマッピング
    };
  }
}
```

### 値オブジェクトの基本構造

```typescript
export class ValueObjectName {
  // 1. プライベートコンストラクタ
  private constructor(private readonly value: string) {}

  // 2. ファクトリメソッド
  public static create(value: string): ValueObjectName {
    // バリデーション
    if (!this.isValid(value)) {
      throw new Error(`Invalid ${ValueObjectName.name}: ${value}`);
    }
    return new ValueObjectName(value);
  }

  // 3. バリデーション
  private static isValid(value: string): boolean {
    // バリデーションロジック
    return true;
  }

  // 4. 値の取得
  public toString(): string {
    return this.value;
  }

  // 5. 等価性判定
  public equals(other: ValueObjectName): boolean {
    return this.value === other.value;
  }

  // 6. Firestore保存用（必要な場合）
  public toFirestore(): any {
    return this.value;
  }
}
```

## Server ComponentsとClient Components間の連携

### Plain Object変換パターン

```typescript
// 1. Plain Object型定義
export interface EntityPlainObject {
  // 元データをすべて保持
  id: string;
  property1: string;
  property2: any;
  
  // 計算済みプロパティ
  _computed: {
    // ビジネスロジックの結果をキャッシュ
    derivedValue1: boolean;
    derivedValue2: string;
    // ...
  };
}

// 2. Server Action
export async function getEntities(): Promise<{ items: EntityPlainObject[] }> {
  const entities = await fetchEntitiesFromFirestore();
  const plainObjects = entities.map(e => e.toPlainObject());
  return { items: plainObjects };
}

// 3. Client Component
export function EntityComponent({ entity }: { entity: EntityPlainObject }) {
  // _computedプロパティから計算済み値を使用
  const { derivedValue1, derivedValue2 } = entity._computed;
  
  return (
    <div>
      <h3>{entity.property1}</h3>
      {derivedValue1 && <Badge>Special</Badge>}
      <p>{derivedValue2}</p>
    </div>
  );
}
```

## Mapperの実装

### 基本構造

```typescript
// 1. 外部APIからエンティティへの変換
export function mapExternalAPIToEntity(
  apiData: ExternalAPIData
): EntityName | null {
  try {
    // データ検証
    // 値オブジェクトへの変換
    // エンティティの生成
    return EntityName.create({
      // マッピング
    });
  } catch (error) {
    logger.error('Mapping failed', { error });
    return null;
  }
}

// 2. バッチ処理用
export function mapMultipleWithErrors(
  apiDataArray: ExternalAPIData[]
): BatchMappingResult {
  const entities: EntityName[] = [];
  const errors: MappingError[] = [];
  
  for (const apiData of apiDataArray) {
    const entity = mapExternalAPIToEntity(apiData);
    if (entity) {
      entities.push(entity);
    } else {
      errors.push({
        id: apiData.id,
        reason: 'Mapping failed'
      });
    }
  }
  
  return { entities, errors };
}
```

## テスト戦略

### 1. エンティティのテスト

```typescript
describe('EntityName', () => {
  describe('create', () => {
    it('正常なパラメータでエンティティを作成できる', () => {
      const entity = EntityName.create(validParams);
      expect(entity).toBeDefined();
    });

    it('不正なパラメータで例外を投げる', () => {
      expect(() => EntityName.create(invalidParams)).toThrow();
    });
  });

  describe('ビジネスロジック', () => {
    it('ビジネスルールに従って正しく計算する', () => {
      const entity = EntityName.create(params);
      expect(entity.businessMethod()).toBe(expectedResult);
    });
  });

  describe('toPlainObject', () => {
    it('計算済みプロパティを含むPlain Objectを返す', () => {
      const entity = EntityName.create(params);
      const plain = entity.toPlainObject();
      expect(plain._computed).toBeDefined();
      expect(plain._computed.derivedValue1).toBe(true);
    });
  });
});
```

### 2. 値オブジェクトのテスト

```typescript
describe('ValueObjectName', () => {
  describe('create', () => {
    it('有効な値で値オブジェクトを作成できる', () => {
      const vo = ValueObjectName.create('valid-value');
      expect(vo.toString()).toBe('valid-value');
    });

    it('無効な値で例外を投げる', () => {
      expect(() => ValueObjectName.create('invalid')).toThrow();
    });
  });

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      const vo1 = ValueObjectName.create('value');
      const vo2 = ValueObjectName.create('value');
      expect(vo1.equals(vo2)).toBe(true);
    });
  });
});
```

## 移行戦略

### 1. 段階的移行

1. **Phase 1**: エンティティとMapperの実装
2. **Phase 2**: Server Actionsでの使用開始
3. **Phase 3**: Client Componentsの更新
4. **Phase 4**: レガシーコードの非推奨化
5. **Phase 5**: レガシーコードの削除

### 2. 互換性の維持

```typescript
// 移行期間中は両方のフォーマットをサポート
export class EntityService {
  async getEntity(id: string): Promise<EntityName | LegacyEntity> {
    const data = await fetchFromFirestore(id);
    
    // V2フォーマットの場合
    if (data._metadata?.version === 'v2') {
      return EntityName.fromFirestore(data);
    }
    
    // レガシーフォーマットの場合
    return new LegacyEntity(data);
  }
}
```

## チェックリスト

新しいエンティティを実装する際のチェックリスト：

- [ ] エンティティクラスの作成
  - [ ] プライベートコンストラクタ
  - [ ] createファクトリメソッド
  - [ ] fromFirestoreメソッド
  - [ ] toPlainObjectメソッド
  - [ ] ビジネスロジックメソッド
- [ ] 値オブジェクトの作成
  - [ ] バリデーションロジック
  - [ ] equalsメソッド
  - [ ] toStringメソッド
- [ ] Mapperの実装
  - [ ] 外部API → エンティティ
  - [ ] エラーハンドリング
- [ ] Plain Object型定義
  - [ ] _computedプロパティ
- [ ] テストの作成
  - [ ] エンティティテスト
  - [ ] 値オブジェクトテスト
  - [ ] Mapperテスト
- [ ] ドキュメントの更新
  - [ ] DOMAIN_MODEL.md
  - [ ] DOMAIN_OBJECT_CATALOG.md

## 参考実装

- `packages/shared-types/src/entities/video.ts`
- `packages/shared-types/src/entities/audio-button.ts`
- `apps/functions/src/services/mappers/video-mapper.ts`
- `apps/web/src/actions/video-actions.ts`

## 今後の展開

このガイドラインは、以下のエンティティの実装に適用される予定です：

1. **Work（作品）エンティティ**
   - DLsite作品情報の管理
   - 価格、評価、カテゴリなどの値オブジェクト

2. **User（ユーザー）エンティティ**
   - ユーザー情報の管理
   - 権限、プリファレンスなどの値オブジェクト

3. **Evaluation（評価）エンティティ**
   - 作品評価の管理
   - 評価タイプ、スコアなどの値オブジェクト

各エンティティの実装時には、このガイドラインに従いつつ、ドメイン固有の要件に応じて適切に調整することが推奨されます。