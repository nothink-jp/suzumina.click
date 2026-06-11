# Domain Object Catalog

This catalog provides detailed specifications for all domain objects in the suzumina.click system.

## Related Documentation

- [Entity Implementation Guide](entity-implementation-guide.md) - How to implement entities
- [ADR-001: DDD Implementation Guidelines](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) - When to use entities
- [ADR-005: Entity Implementation Lessons](../decisions/architecture/ADR-005-entity-implementation-lessons.md) - Learning from experience
- [ADR-002: TypeScript Type Safety Enhancement](../decisions/architecture/ADR-002-typescript-type-safety-enhancement.md) - Type safety patterns

## Entities

All entities now extend `BaseEntity<T>` and implement `EntityValidatable<T>` interface.

### Work

**Location**: `packages/shared-types/src/entities/work-entity.ts`
**Pattern**: Entity with Result-based factory methods

```typescript
class Work extends BaseEntity<Work> implements EntityValidatable<Work> {
  // Private constructor - use factory methods
  private constructor(...) { ... }
  
  // Factory method returns Result type
  static fromFirestoreData(data: WorkDocument): Result<Work, DatabaseError> {
    // Validation and construction logic
  }
  
  // Validation methods
  isValid(): boolean
  getValidationErrors(): string[]
  
  // Business methods
  toPlainObject(): WorkPlainObject
  equals(other: Work): boolean
  clone(): Work
}
```

### Video

**Location**: `packages/shared-types/src/entities/video.ts`
**Pattern**: Entity with Result-based factory methods

```typescript
class Video extends BaseEntity<Video> implements EntityValidatable<Video> {
  // Private constructor
  private constructor(...) { ... }
  
  // Factory method returns Result type
  static fromFirestoreData(data: FirestoreServerVideoData): Result<Video, DatabaseError> {
    // Validation and construction logic
  }
  
  // Validation methods
  isValid(): boolean
  getValidationErrors(): string[]
  
  // Business methods
  toPlainObject(): VideoPlainObject
  getVideoType(): VideoComputedProperties["videoType"]
  canCreateAudioButton(): boolean
}
```

### AudioButton

**Location**: `packages/shared-types/src/entities/audio-button.ts`
**Pattern**: Entity with BaseEntity inheritance

```typescript
class AudioButton extends BaseEntity<AudioButton> {
  // Entity implementation
}
```

## Value Objects

> **2026-06 (SPR-181) 更新**: かつて `packages/shared-types/src/value-objects/` に存在した
> クラス VO 一式（WorkId / WorkTitle / WorkPrice / WorkRating / WorkCreators / Circle /
> DateRange / Price / Rating、video 系 Channel / VideoContent / VideoMetadata /
> VideoStatistics、base/*）は **全て削除済み**。apps/web・apps/functions・packages/ui からの
> import がゼロの死蔵層だったため。実運用のデータ表現と変換は以下に一本化されている。

**現在の正本（Work / Video のデータ表現）**

- **PlainObject**: `packages/shared-types/src/plain-objects/`（`work-plain.ts` / `circle-plain.ts` ほか）
  — RSC 境界を越える正本のデータ形。
- **Transformers**: `packages/shared-types/src/transformers/`（Firestore ⇔ PlainObject 変換）。
- **Operations**: `packages/shared-types/src/operations/`（PlainObject に対する表示・集計などの純関数）。
- **検証・整形ユーティリティ**: `packages/shared-types/src/utilities/`
  （例: 日付正規化は `utilities/formatters/date-optimizer.ts` の `optimizeDateFormats`、
  ID 検証は `utilities/validators/dlsite-ids.ts`）。

新たにクラス VO を再導入する場合は CLAUDE.md の「Entity化のゲート」を先に通すこと
（ビジネスルール5個以上 / 明確な状態遷移 / 複雑な不変条件のいずれか）。

## Type System Enhancements

### Branded Types

**Location**: `packages/shared-types/src/core/branded-types.ts`

```typescript
// Nominal typing for domain IDs
type WorkId = Brand<string, 'WorkId'>
type CircleId = Brand<string, 'CircleId'>
type VideoId = Brand<string, 'VideoId'>
type ChannelId = Brand<string, 'ChannelId'>
type UserId = Brand<string, 'UserId'>
```

### Result Pattern

**Location**: `packages/shared-types/src/core/result.ts`

```typescript
// Functional error handling
type Result<T, E> = Ok<T> | Err<E>

// Domain-specific error types
type ValidationError = { field: string; message: string }
type NotFoundError = { entity: string; message: string }
type DatabaseError = { entity: string; message: string }
```

## Conversion Utilities

### Work Conversions

**Location**: `packages/shared-types/src/utilities/work-conversions.ts`

```typescript
// All conversion functions return Result types
function convertToWorkPlainObject(
  data: WorkDocument | null | undefined
): Result<WorkPlainObject, NotFoundError | DatabaseError>

function convertToWorkPlainObjects(
  dataArray: WorkDocument[]
): Result<WorkPlainObject[], DatabaseError>

function normalizeToWorkPlainObject(
  data: WorkDocument | WorkPlainObject | null | undefined
): Result<WorkPlainObject, NotFoundError | DatabaseError>
```

## Business Rules

### Work Business Rules

1. **Work ID Format**: Must match `/^RJ\d{6,8}$/`
2. **Price**: Must be non-negative, discount cannot exceed original price
3. **Rating**: Stars 0-5, count >= 0, average 0-5
4. **Creators**: Each creator must have ID and name
5. **Title**: Cannot be empty, max 500 characters

### Video Business Rules

1. **Video ID**: Must be 11 characters YouTube ID
2. **Channel ID**: Must start with "UC" and be 24 characters
3. **Audio Button Creation**: Only allowed for archived streams > 15 minutes
4. **Live Detection**: Based on liveBroadcastContent and liveStreamingDetails

### Validation Rules

1. **All factory methods return Result types** - No exceptions thrown
2. **Private constructors** - Object creation only through factory methods
3. **Immutability** - All value objects are immutable
4. **Validation on creation** - All validation happens in factory methods

## Migration Notes

### From Legacy to Result Pattern

```typescript
// Before (Legacy)
const work = Work.fromFirestoreDataLegacy(data); // throws or returns null
if (!work) {
  // handle error
}

// After (Result Pattern)
const result = Work.fromFirestoreData(data);
if (result.isErr()) {
  console.error(result.error.message);
  return;
}
const work = result.value;
```

### Value Object Creation

> **2026-06 (SPR-181) 更新**: クラス VO（`WorkTitle.create()` / `WorkPrice.create()` など Result
> パターンのファクトリ）は**削除済み**。Work / Video のデータは PlainObject + Zod スキーマ +
> `transformers/` の変換関数で扱う（上記「Value Objects」節を参照）。

---

**Last Updated**: 2026-06-11
**Version**: 0.5.0
**Note**: SPR-181 で `value-objects/` のクラス VO 一式を削除。データ表現は plain-objects + transformers + operations に一本化。