# ドメインモデル設計（簡易版）

**最終更新**: 2026-05-22  
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
Discord認証されたユーザー情報

**主要プロパティ**
- `discordId`: Discord ユーザーID（17桁以上）
- `username`: Discord ユーザー名
- `displayName`: 表示名
- `guildMembership`: Suzumina Guildメンバーシップ情報
- `createdAt/updatedAt/lastLoginAt`: タイムスタンプ

**Zodスキーマ**: `FirestoreUserSchema`, `FrontendUserSchema`, `UserSessionSchema`

### 5. WorkEvaluation（作品評価）
ユーザーによる DLsite 作品への評価

**主要プロパティ**
- `workId`: 対象作品ID
- `userId`: 評価者のユーザーID
- `evaluationType`: 評価種別（`top10` / `star` / `ng`）
- `top10Rank`: 10選内の順位（1〜10、top10 のみ）
- `starRating`: 星評価（1〜3、star のみ）
- `createdAt/updatedAt`: タイムスタンプ

**特徴**: 1作品につき1ユーザー1評価のみ、評価タイプは排他的

**Zodスキーマ**: `WorkEvaluationSchema`, `EvaluationInputSchema`

### 6. UserEvaluation（ユーザー特性評価）
声優に対するユーザーの特性軸評価

**評価軸**: VoiceQuality / Personality / BehaviorExpression / AttributeCharm（各1〜5の値 + confidence + evaluatorCount）

**Zodスキーマ**: `CharacteristicAxisSchema`, `VoiceQualitySchema`, `PersonalitySchema`

### 7. Favorite（お気に入り）
ユーザーが登録した音声ボタンのお気に入り

**主要プロパティ**
- `audioButtonId`: 対象音声ボタンID
- `addedAt`: 登録日時

**Zodスキーマ**: `FirestoreFavoriteSchema`

**保存先**: `users/{userId}/favorites` サブコレクション

### 8. Contact（お問い合わせ）
ユーザーからの問い合わせデータ

**主要プロパティ**
- `category`: 問い合わせ種別（bug / feature / usage / other）
- `status`: 対応ステータス（new / reviewing / resolved）
- `priority`: 優先度（low / medium / high）

**Zodスキーマ**: `FirestoreContactDataSchema`, `ContactFormDataSchema`

## 値オブジェクト一覧

> **2026-06 (SPR-181) 更新**: 以下は概念的なデータのまとまりであり、**クラスとしての値オブジェクトは
> 廃止済み**（`packages/shared-types/src/value-objects/` を削除）。実体は PlainObject のフィールド群 +
> Zod スキーマ + `utilities/` のユーティリティで表現する。

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
User → AudioButton (作成者, Favorite)
User → Work (WorkEvaluation, UserTop10List)

Circle → Work (circleIdで参照)
CreatorWorkMapping → Work, Creator (非正規化関連)

※ Work ↔ Video/AudioButton の直接参照なし
```

## 実装状況

### ✅ 完全実装（Entity/Value Objectパターン）
- Work エンティティと関連値オブジェクト
- Video エンティティと関連値オブジェクト
- AudioButton エンティティと関連値オブジェクト

### ✅ Zodスキーマ実装（型定義・バリデーション中心）
- User（`FirestoreUserSchema` / `FrontendUserSchema` / `UserSessionSchema`）
- WorkEvaluation（`WorkEvaluationSchema` / `EvaluationInputSchema`）
- UserEvaluation（特性評価軸スキーマ群）
- Favorite（`FirestoreFavoriteSchema`）
- Contact（`FirestoreContactDataSchema`）
- Circle（`CircleDataSchema`）
- CreatorWorkMapping（`CreatorWorkMappingSchema`）

### シンプルなCRUD実装（Entity/VO パターン適用外）
- Circle（ビジネスルールが少ないため型定義のみ）
- CreatorWorkMapping（非正規化データ関連付けのみ）

詳細は [ADR-005: Entity実装の教訓](../decisions/architecture/ADR-005-entity-implementation-lessons.md) を参照

## ファイル構成

```
packages/shared-types/src/
├── core/               # ブランド型・Result型・バリデーション基盤
│   ├── ids.ts         # WorkId, CircleId, UserId等のブランド型定義
│   ├── branded-types.ts
│   ├── result.ts      # Result<T,E> / ResultAsync<T,E>
│   └── validation.ts
├── entities/           # エンティティ・Zodスキーマ定義
│   ├── work/          # Workエンティティ（ディレクトリ）
│   │   ├── work-types.ts
│   │   ├── work-schemas.ts
│   │   └── work-document-schema.ts
│   ├── circle-creator.ts # Circle / Creator / CreatorWorkMapping
│   ├── user.ts        # User型・Zodスキーマ
│   ├── favorite.ts    # Favorite Zodスキーマ
│   ├── work-evaluation.ts # WorkEvaluation Zodスキーマ
│   ├── user-evaluation.ts # UserEvaluation 特性評価スキーマ
│   └── contact.ts     # Contact Zodスキーマ
├── plain-objects/      # Server Component用Plain Object型（データ表現の正本）
├── types/
│   ├── firestore/     # Firestoreドキュメント型
│   ├── video-types.ts
│   └── audio-button.ts # AudioButton型定義
├── transformers/       # Firestore ↔ 型変換
├── utilities/          # 変換ユーティリティ
└── api-schemas/        # 外部APIスキーマ（DLsite等）
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

> **2026-06 (SPR-181) 更新**: 以下はクラス VO の参考パターンだが、shared-types では**この層を廃止済み**。
> 新規に値オブジェクトを再導入する場合は CLAUDE.md の「Entity化のゲート」を先に通すこと。

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

最終更新: 2026-05-22