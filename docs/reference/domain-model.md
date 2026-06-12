# ドメインモデル設計（簡易版）

**最終更新**: 2026-06-12  
**目的**: suzumina.clickプロジェクトのドメインモデルの簡潔な参照ドキュメント

> **2026-06 (SPR-174 監査) 更新**: 各エンティティの「主要プロパティ」を shared-types の現行正本型
> （`plain-objects/` の `*PlainObject`・`types/` のドキュメント型）に揃えた。クラスとしての
> エンティティ・値オブジェクトは廃止済み（クラス VO は SPR-181 で削除）。本文中の「値オブジェクト」は
> PlainObject のネストしたプロパティ群を指す概念表記であり、クラスを意味しない。

## エンティティ一覧

### 1. Work（作品）
DLsite作品を表現する中核データ。RSC 境界を越える正本は `WorkPlainObject`
（`packages/shared-types/src/plain-objects/work-plain.ts`）。

**主要プロパティ**（`WorkPlainObject`。フラットなスカラ + ネストした plain object 群）
- `id` / `productId`: 作品ID（例: RJ01234567）
- `title` / `circle` / `circleId?` / `description` / `category`: 基本情報
- `workUrl` / `thumbnailUrl`: 表示用 URL
- `price`: 価格情報（`WorkPricePlain`: current / original? / discount? / currency / isDiscounted …）
- `rating?`: 評価情報（`WorkRatingPlain`: stars / count / average …）
- `creators`: クリエイター情報（`WorkCreatorsPlain`: voiceActors / scenario / illustration / music / others）
- `salesStatus` / `series?` / `genres` / `sampleImages`: 販売状態・付随情報
- `createdAt` / `updatedAt` / `lastFetchedAt`: タイムスタンプ（ISO 文字列）
- `_computed`: 表示・派生値（`WorkComputedProperties`）

**Firestore型**: `WorkDocument`（`packages/shared-types/src/entities/work/work-document-schema.ts`。旧: OptimizedFirestoreDLsiteWorkData）

### 2. AudioButton（音声ボタン）
YouTube動画の特定タイムスタンプを参照する音声再生ボタン。正本型は
`packages/shared-types/src/types/audio-button.ts`。

**主要プロパティ**（`AudioButtonDocument` のフラット構造。`stats` のみネスト）
- `buttonText` / `description?`: 表示テキスト・補足
- `videoId` / `videoTitle` / `videoThumbnailUrl?`: 参照する YouTube 動画
- `startTime` / `endTime` / `duration`: 再生区間（秒）
- `tags`: 分類タグ
- `creatorId` / `creatorName`: 作成者
- `isPublic`: 公開設定
- `stats`: 集計（playCount / likeCount / dislikeCount / favoriteCount / engagementRate）
- `createdAt` / `updatedAt`: タイムスタンプ（ISO 文字列）

アプリ層の正本は `AudioButton`（= `AudioButtonDocument` + `id` + `_computed`。PlainObject 別名は `AudioButtonPlainObject`）。

**特徴**: DLsite作品への直接参照なし、YouTube動画ID（`videoId`）のみ保持

### 3. Video（動画）
YouTube動画メタデータを管理。RSC 境界を越える正本は `VideoPlainObject`
（`packages/shared-types/src/plain-objects/video-plain.ts`。`types/firestore/video.ts` の
`FirestoreServerVideoData` を継承し、タイムスタンプを文字列化 + `_computed` を付与）。

**主要プロパティ**（`VideoPlainObject` のフラット構造 + ネストしたオブジェクト群）
- `videoId` / `title` / `description`: 基本情報
- `channelId` / `channelTitle`: チャンネル情報（フラットに保持）
- `publishedAt` / `lastFetchedAt`: タイムスタンプ（PlainObject では ISO 文字列）
- `thumbnailUrl` / `thumbnails?`: サムネイル（既定 + 解像度別）
- `videoType?` / `liveBroadcastContent?`: 種別・配信状態
- `duration?`: 再生時間
- `tags?`: 4層タグ（playlistTags / userTags / contentTags）
- `statistics?`: viewCount / likeCount / dislikeCount / favoriteCount / commentCount
- `liveStreamingDetails?`: 配信予定・実時刻（PlainObject では文字列）/ concurrentViewers
- `audioButtonCount?` / `hasAudioButtons?`: 音声ボタン集計
- `_computed`: 種別判定・URL 等の派生値（`VideoComputedProperties`）

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

> **2026-06 (SPR-181 / SPR-174 監査) 更新**: 以下は概念的なデータのまとまりであり、**クラスとしての
> 値オブジェクトは廃止済み**（`packages/shared-types/src/value-objects/` を削除）。実体は各 `*PlainObject`
> のネストしたプロパティ群 + Zod スキーマ + `utilities/` のユーティリティで表現する。下記は現行の
> PlainObject に実在するネストオブジェクトに揃えてある。

### 作品関連
`WorkPlainObject` のネストした plain object 群：
- **`price`（`WorkPricePlain`）**: current / original? / discount? / currency / isDiscounted …
- **`rating?`（`WorkRatingPlain`）**: stars / count / average / reliability …
- **`creators`（`WorkCreatorsPlain`）**: voiceActors / scenario / illustration / music / others
- **`salesStatus`（`WorkSalesStatusPlain`） / `series?`（`WorkSeriesPlain`）**: 販売状態・シリーズ情報
- ※ ファイル情報は `fileFormat` / `fileType` / `fileSize` としてフラットに保持（旧 FileInfo VO は廃止）

### 音声ボタン関連
AudioButton はフラット構造（`AudioButtonDocument`）。唯一のネストは集計の **`stats`**
（playCount / likeCount / dislikeCount / favoriteCount / engagementRate）。
旧 AudioContent / AudioReference / ButtonStatistics の区分は廃止。

### 動画関連
`VideoPlainObject` のネストしたオブジェクト：
- **`statistics?`**: viewCount / likeCount / dislikeCount / favoriteCount / commentCount
- **`liveStreamingDetails?`**: 配信予定・実時刻（文字列）/ concurrentViewers
- **`thumbnails?`**: default / medium / high / standard / maxres
- **`tags?`**: playlistTags / userTags / contentTags（4層タグ）
- ※ チャンネルは `channelId` / `channelTitle` としてフラットに保持（旧 Channel VO は廃止）

## エンティティ間の関係

```
AudioButton → Video (videoId で参照)
User → AudioButton (作成者, Favorite)
User → Work (WorkEvaluation, UserTop10List)

Circle → Work (circleIdで参照)
CreatorWorkMapping → Work, Creator (非正規化関連)

※ Work ↔ Video/AudioButton の直接参照なし
```

## 実装状況

### ✅ PlainObject + Zod スキーマ + Transformer で実装
> **2026-06 (SPR-174 監査) 更新**: shared-types はエンティティクラス・クラス VO を持たない
> （クラス VO は SPR-181 で削除）。Work / Video / AudioButton のデータは以下の現行型に一本化。
- Work: `WorkPlainObject`（plain-objects/work-plain.ts）/ `WorkDocument`（entities/work/work-document-schema.ts）/ transformers
- Video: `VideoPlainObject`（plain-objects/video-plain.ts）
- AudioButton: `AudioButtonDocument` / `AudioButton`（types/audio-button.ts）

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

> **2026-06 (SPR-174 監査) 更新**: 以下のクラスベースのパターンは**歴史的な参考**。現行の shared-types は
> エンティティクラスを持たず（クラス VO は SPR-181 で削除）、データは PlainObject + Zod スキーマ +
> transformers で扱う。Entity / VO を新規に再導入する場合は CLAUDE.md の「Entity化のゲート」を先に通すこと。

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

最終更新: 2026-06-12（SPR-174 監査: 主要プロパティを shared-types の現行正本型に同期）