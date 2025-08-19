# Domain Object Catalog

This catalog provides detailed specifications for all domain objects in the suzumina.click system.

## Related Documentation

- [Entity Implementation Guide](entity-implementation-guide.md) - How to implement entities
- [ADR-001: DDD Implementation Guidelines](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) - When to use entities
- [ADR-002: Entity Implementation Lessons](../decisions/architecture/ADR-002-entity-implementation-lessons.md) - Learning from experience
- [ADR-002: TypeScript Type Safety Enhancement](../decisions/architecture/ADR-002-typescript-type-safety-enhancement.md) - Type safety patterns

## Entities

All entities now extend `BaseEntity<T>` and implement `EntityValidatable<T>` interface.

### Work

**Location**: `packages/shared-types/src/entities/work/` (modularized)
**Pattern**: Entity with Result-based factory methods
**Note**: Refactored from single 1,352-line file to 9 modules (2025-08-18)

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

All value objects now extend `BaseValueObject<T>` and implement `ValidatableValueObject<T>` interface.
They use the Result pattern for error handling.

### Work Value Objects

#### WorkId

**Location**: `packages/shared-types/src/value-objects/work/work-id.ts`
**Pattern**: Value Object with Branded Type

```typescript
class WorkId extends BaseValueObject<WorkId> implements ValidatableValueObject<WorkId> {
  // Private constructor
  private constructor(private readonly value: WorkIdBrand) { ... }
  
  // Factory method returns Result type
  static create(value: string): Result<WorkId, ValidationError> {
    // Format: RJ + 6-8 digits
  }
  
  // Validation
  isValid(): boolean
  getValidationErrors(): string[]
  
  // Serialization
  toPlainObject(): string
  static fromPlainObject(obj: unknown): Result<WorkId, ValidationError>
}
```

#### WorkTitle

**Location**: `packages/shared-types/src/value-objects/work/work-title.ts`
**Pattern**: Complex Value Object with multiple fields

```typescript
class WorkTitle extends BaseValueObject<WorkTitle> {
  static create(
    value: string,
    masked?: string,
    kana?: string,
    altName?: string
  ): Result<WorkTitle, ValidationError>
  
  // Business methods
  toDisplayString(preferMasked?: boolean): string
  getSearchableText(): string
}
```

#### WorkPrice

**Location**: `packages/shared-types/src/value-objects/work/work-price.ts`
**Pattern**: Value Object with business logic

```typescript
class WorkPrice extends BaseValueObject<WorkPrice> {
  static create(
    current: number,
    original?: number,
    discountRate?: number,
    currency?: string
  ): Result<WorkPrice, ValidationError>
  
  // Business methods
  isOnSale(): boolean
  getDiscountAmount(): number
  format(): string
}
```

#### WorkRating

**Location**: `packages/shared-types/src/value-objects/work/work-rating.ts`

```typescript
class WorkRating extends BaseValueObject<WorkRating> {
  static create(
    stars: number,
    count: number,
    average: number,
    reviewCount?: number,
    distribution?: RatingDistribution
  ): Result<WorkRating, ValidationError>
  
  // Business methods
  hasRatings(): boolean
  isHighlyRated(): boolean
  getReliability(): RatingReliability
}
```

#### WorkCreators

**Location**: `packages/shared-types/src/value-objects/work/work-creators.ts`

```typescript
class WorkCreators extends BaseValueObject<WorkCreators> {
  static create(
    voiceActors?: CreatorInfo[],
    scenario?: CreatorInfo[],
    illustration?: CreatorInfo[],
    music?: CreatorInfo[],
    others?: CreatorInfo[]
  ): Result<WorkCreators, ValidationError>
  
  // Query methods
  hasVoiceActors(): boolean
  getPrimaryVoiceActor(): CreatorInfo | undefined
  getAllUniqueNames(): string[]
}
```

#### Circle

**Location**: `packages/shared-types/src/value-objects/work/circle.ts`
**Pattern**: Value Object with Branded Type

```typescript
class Circle extends BaseValueObject<Circle> {
  static create(id: string, name: string, nameEn?: string): Result<Circle, ValidationError>
  
  toUrl(): string
  toDisplayString(preferEnglish?: boolean): string
}
```

### Video Value Objects

#### VideoId

**Location**: `packages/shared-types/src/value-objects/video/video-content.ts`
**Pattern**: Value Object with Branded Type

```typescript
class VideoId extends BaseValueObject<VideoId> {
  // YouTube video ID (11 characters)
  static create(value: string): Result<VideoId, ValidationError>
  
  toThumbnailUrl(quality?: "default" | "medium" | "high"): string
  toYouTubeUrl(): string
}
```

#### Channel

**Location**: `packages/shared-types/src/value-objects/video/channel.ts`

```typescript
class Channel extends BaseValueObject<Channel> {
  // YouTube channel information
  static create(channelId: string, channelTitle: string): Result<Channel, ValidationError>
}
```

### Reusable Value Objects

#### DateRange

**Location**: `packages/shared-types/src/value-objects/work/date-range.ts`

```typescript
class DateRangeValueObject extends BaseValueObject<DateRangeValueObject> {
  static create(original: string, iso: string, display: string): Result<DateRangeValueObject, ValidationError>
  
  toDate(): Date
  daysFromNow(): number
  relative(): string
}
```

#### Price

**Location**: `packages/shared-types/src/value-objects/work/price.ts`

```typescript
class PriceValueObject extends BaseValueObject<PriceValueObject> {
  static create(amount: number, currency: string, ...): Result<PriceValueObject, ValidationError>
  
  isFree(): boolean
  isDiscounted(): boolean
  format(): string
}
```

#### Rating

**Location**: `packages/shared-types/src/value-objects/work/rating.ts`

```typescript
class RatingValueObject extends BaseValueObject<RatingValueObject> {
  static create(stars: number, count: number, average: number): Result<RatingValueObject, ValidationError>
  
  hasRatings(): boolean
  isHighlyRated(): boolean
  reliability(): RatingReliability
}
```

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

```typescript
// Before (Constructor or Zod)
const title = new WorkTitle("タイトル"); // throws
const price = Price.parse({ amount: 1000, currency: "JPY" }); // Zod

// After (Result Pattern)
const titleResult = WorkTitle.create("タイトル");
if (titleResult.isOk()) {
  const title = titleResult.value;
}

const priceResult = WorkPrice.create(1000, undefined, undefined, "JPY");
if (priceResult.isOk()) {
  const price = priceResult.value;
}
```

---

**Last Updated**: 2025-08-18
**Version**: 0.4.1
**Note**: Work Entity modularized. RSC constraints documented. All APIs use Result pattern for error handling.