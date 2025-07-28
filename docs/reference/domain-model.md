# ドメインモデル設計（簡易版）

**最終更新**: 2025-07-27  
**目的**: suzumina.clickプロジェクトのドメインモデルの簡潔な参照ドキュメント

## エンティティ一覧

### 1. Work（作品）
DLsite作品を表現する中核エンティティ

**主要プロパティ**
- `id`: 作品ID（例: RJ123456）
- `title`: 作品タイトル
- `price`: 価格情報（値オブジェクト）
- `rating`: 評価情報（値オブジェクト）
- `creators`: クリエイター情報（値オブジェクト）

**Firestore型**: `WorkDocument`（旧: OptimizedFirestoreDLsiteWorkData）

### 2. AudioButton（音声ボタン）
YouTube動画の特定タイムスタンプを参照する音声再生ボタン

**主要プロパティ**
- `id`: ボタンID
- `content`: テキストとタグ（値オブジェクト）
- `reference`: YouTube動画参照情報（値オブジェクト）
- `statistics`: 統計情報（値オブジェクト）

**特徴**: DLsite作品への直接参照なし、YouTube動画IDのみ保持

### 3. Video（動画）
YouTube動画メタデータを管理

**主要プロパティ**
- `content`: 動画基本情報（値オブジェクト）
- `metadata`: タイトル、説明等（値オブジェクト）
- `statistics`: 再生数、いいね数等（値オブジェクト）
- `channel`: チャンネル情報（値オブジェクト）

**特徴**: DLsite作品への直接参照なし

### 4. User（ユーザー）
認証されたユーザー情報

**主要プロパティ**
- `id`: ユーザーID
- `email`: メールアドレス
- `role`: ユーザー権限
- `createdAt/updatedAt`: タイムスタンプ

## 値オブジェクト一覧

### 作品関連
- **Price**: 価格情報（current, original, discount, currency）
- **Rating**: 評価情報（stars, count, average）
- **WorkCreators**: クリエイター情報（voice_by, illustration_by等）
- **FileInfo**: ファイル情報（type, size, duration）

### 音声ボタン関連
- **AudioContent**: ボタンテキストとカテゴリ
- **AudioReference**: YouTube動画参照（videoId, timestamp）
- **ButtonStatistics**: 再生数、いいね数等

### 動画関連
- **VideoContent**: 動画ID、公開日等
- **VideoMetadata**: タイトル、説明、時間
- **VideoStatistics**: 再生数、いいね数
- **Channel**: チャンネル情報

## エンティティ間の関係

```
AudioButton → Video (sourceVideoIdで参照)
User → Work (お気に入り、評価)
User → AudioButton (作成者、お気に入り)

※ Work ↔ Video/AudioButton の直接関連なし
```

## 実装状況

### ✅ 完全実装（Entity/Value Objectパターン）
- Work エンティティと関連値オブジェクト
- Video エンティティと関連値オブジェクト  
- AudioButton エンティティと関連値オブジェクト

### ⏳ 部分実装
- User エンティティ（簡易実装のみ）

## ファイル構成

```
packages/shared-types/src/
├── entities/           # エンティティ定義
│   ├── work.ts        # WorkDocument型とWorkエンティティ
│   ├── audio-button.ts # AudioButtonエンティティ
│   ├── video.ts       # Videoエンティティ
│   └── user.ts        # User型定義
├── value-objects/      # 値オブジェクト
│   ├── work/          # Work関連の値オブジェクト
│   ├── audio-button/  # AudioButton関連
│   └── video/         # Video関連
└── plain-objects/      # Server Component用Plain Object型
```

## 設計原則

1. **不変性**: 値オブジェクトは不変
2. **カプセル化**: ビジネスロジックは適切なドメインオブジェクトに配置
3. **Plain Object変換**: Next.js Server Componentsとの連携用
4. **型安全性**: TypeScript strict modeで完全な型安全性

## Entity Implementation Patterns

### Basic Entity Structure

```typescript
export class EntityName {
  // Private readonly properties
  constructor(
    private readonly _id: EntityId,
    private readonly _content: ContentValueObject,
    private readonly _metadata: MetadataValueObject
  ) {}

  // Firestore restoration (required)
  static fromFirestoreData(data: FirestoreData): EntityName | null {
    try {
      const id = new EntityId(data.id);
      const content = ContentValueObject.fromData(data);
      const metadata = MetadataValueObject.fromData(data);
      
      return new EntityName(id, content, metadata);
    } catch (error) {
      console.error('Failed to create entity:', error);
      return null;
    }
  }

  // Plain Object conversion (for Server Components)
  toPlainObject(): EntityPlainObject {
    return {
      id: this._id.value,
      content: this._content.toPlainObject(),
      metadata: this._metadata.toPlainObject(),
      _computed: {
        displayName: this.getDisplayName(),
        isValid: this.isValid(),
      }
    };
  }
}
```

### Value Object Structure

```typescript
export class ValueObjectName {
  constructor(private readonly _value: string) {
    this.validate();
  }

  private validate(): void {
    if (!this._value || this._value.length === 0) {
      throw new Error('Value cannot be empty');
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: ValueObjectName): boolean {
    return this._value === other._value;
  }

  toPlainObject(): string {
    return this._value;
  }
}
```

### Implementation Guidelines

1. **Error Handling**: Use null returns instead of throwing errors
2. **Validation**: Validate in constructors and factory methods
3. **Immutability**: All properties should be readonly
4. **Type Safety**: Use TypeScript strict mode
5. **Server Components**: Always provide toPlainObject() method

---

最終更新: 2025-07-28