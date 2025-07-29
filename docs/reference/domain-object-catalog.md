# Domain Object Catalog

This catalog provides detailed specifications for all domain objects in the suzumina.click system.

## Related Documentation

- [Entity Implementation Guide](entity-implementation-guide.md) - How to implement entities
- [ADR-001: DDD Implementation Guidelines](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) - When to use entities
- [ADR-002: Entity Implementation Lessons](../decisions/architecture/ADR-002-entity-implementation-lessons.md) - Learning from experience

## Entities

### User

**Location**: `packages/shared-types/src/entities/user.ts`

```typescript
interface User {
  id: string;                    // Discord user ID
  displayName: string;           // Display name
  email?: string;                // Email address
  discordId: string;             // Discord ID (same as id)
  avatarUrl?: string;            // Discord avatar URL
  role: "user" | "admin";        // User role
  isActive: boolean;             // Account status
  favoriteAudioButtonIds: string[]; // Favorite audio buttons
  favoriteWorkIds: string[];     // Favorite DLsite works
  createdAt: Date;               // Account creation
  updatedAt: Date;               // Last update
  lastLoginAt?: Date;            // Last login time
}
```

### AudioButton

**Location**: `packages/shared-types/src/entities/audio-button.ts`

```typescript
interface AudioButton {
  id: string;                    // Unique identifier
  text: string;                  // Button display text
  sourceVideoId: string;         // YouTube video ID
  startTime: number;             // Start timestamp (seconds)
  endTime?: number;              // End timestamp (optional)
  duration: number;              // Duration (seconds)
  category: AudioButtonCategory; // Category
  tags: string[];                // Search tags
  createdBy: string;             // Creator user ID
  createdAt: Date;               // Creation date
  playCount: number;             // Total play count
  likeCount: number;             // Total like count
  dislikeCount: number;          // Total dislike count
  favoriteCount: number;         // Favorite count
  isActive: boolean;             // Active status
  moderationStatus: "pending" | "approved" | "rejected";
  moderatedBy?: string;          // Moderator user ID
  moderatedAt?: Date;            // Moderation date
}
```

### Video

**Location**: `packages/shared-types/src/entities/video.ts`

```typescript
interface Video {
  id: string;                    // YouTube video ID
  title: string;                 // Video title
  channelId: string;             // YouTube channel ID
  channelTitle: string;          // Channel name
  thumbnailUrl: string;          // Thumbnail URL
  duration: string;              // Duration (ISO 8601)
  publishedAt: Date;             // Publish date
  viewCount: number;             // View count
  likeCount: number;             // Like count
  commentCount: number;          // Comment count
  createdAt: Date;               // First fetch date
  updatedAt: Date;               // Last update
  audioButtonIds: string[];      // Related audio buttons
  isActive: boolean;             // Active status
}
```

### DLsiteWork

**Location**: `packages/shared-types/src/entities/dlsite-work.ts`

```typescript
interface DLsiteWork {
  id: string;                    // DLsite work ID (e.g., "RJ123456")
  title: string;                 // Work title
  circleId: string;              // Circle ID
  circleName: string;            // Circle name
  thumbnailUrl: string;          // Thumbnail URL
  description: string;           // Description
  releaseDate: Date;             // Release date
  lastModified: Date;            // Last modification
  price: DLsitePrice;            // Current price info
  categories: string[];          // Categories
  tags: string[];                // Tags
  voiceActors: string[];         // Voice actors
  ageRating: DLsiteAgeRating;   // Age rating
  fileFormat: string[];          // File formats
  fileSize: string;              // Total file size
  createdAt: Date;               // First fetch date
  updatedAt: Date;               // Last update
  affiliateUrl?: string;         // Affiliate URL
  isActive: boolean;             // Active status
}
```

### Evaluation

**Location**: `packages/shared-types/src/entities/evaluation.ts`

```typescript
interface Evaluation {
  id: string;                    // Evaluation ID
  userId: string;                // User ID
  workId: string;                // DLsite work ID
  type: "top10" | "star" | "ng"; // Evaluation type
  value?: number;                // Value (rank for top10, 1-3 for star)
  createdAt: Date;               // Creation date
  updatedAt: Date;               // Last update
}
```

## Value Objects

### AudioButtonCategory

**Location**: `packages/shared-types/src/value-objects/audio-button-category.ts`

```typescript
type AudioButtonCategory = 
  | "greeting"      // 挨拶
  | "response"      // 返事・相槌
  | "emotion"       // 感情表現
  | "situation"     // シチュエーション
  | "character"     // キャラクター
  | "singing"       // 歌
  | "mimicry"       // モノマネ
  | "material"      // 素材
  | "other";        // その他
```

### DLsitePrice

**Location**: `packages/shared-types/src/value-objects/dlsite-price.ts`

```typescript
interface DLsitePrice {
  regular: number;               // Regular price (JPY)
  sale?: number;                 // Sale price (JPY)
  discountRate?: number;         // Discount rate (0-100)
  currency: "JPY";               // Currency
  campaignEnd?: Date;            // Campaign end date
}
```

### DLsiteAgeRating

**Location**: `packages/shared-types/src/value-objects/dlsite-age-rating.ts`

```typescript
type DLsiteAgeRating = 
  | "all"          // All ages
  | "r15"          // R-15
  | "r18";         // R-18
```

### SearchQuery

**Location**: `packages/shared-types/src/value-objects/search-query.ts`

```typescript
interface SearchQuery {
  text?: string;                 // Search text
  categories?: string[];         // Category filter
  tags?: string[];               // Tag filter
  sortBy?: "newest" | "popular" | "oldest";
  limit?: number;                // Results per page
  offset?: number;               // Pagination offset
}
```

### PriceHistory

**Location**: `packages/shared-types/src/value-objects/price-history.ts`

```typescript
interface PriceHistory {
  date: Date;                    // Record date
  regularPrice: number;          // Regular price
  salePrice?: number;            // Sale price
  discountRate?: number;         // Discount rate
  campaignName?: string;         // Campaign name
  currency: "JPY";               // Currency
}
```

## Type Guards

### User Type Guards

```typescript
function isAdmin(user: User): boolean {
  return user.role === "admin" && user.isActive;
}

function isActiveUser(user: User): boolean {
  return user.isActive;
}
```

### Work Type Guards

```typescript
function isR18Work(work: DLsiteWork): boolean {
  return work.ageRating === "r18";
}

function isOnSale(work: DLsiteWork): boolean {
  return work.price.sale !== undefined && 
         work.price.sale < work.price.regular;
}
```

### Validation Functions

```typescript
function isValidWorkId(id: string): boolean {
  return /^RJ\d{6,8}$/.test(id);
}

function isValidYouTubeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}
```

## Business Rules

### Audio Button Rules

1. **Duration**: Must be between 0.1 and 300 seconds
2. **Text**: Maximum 100 characters
3. **Tags**: Maximum 10 tags per button
4. **Moderation**: Must be approved before public display

### Work Evaluation Rules

1. **Top 10**: Each user can rank up to 10 works
2. **Star Rating**: 3 levels (普通=1, 良い=2, とても良い=3)
3. **NG**: Marks work as "not interested"
4. **Exclusivity**: A work can only have one evaluation type per user

### User Permission Rules

1. **Guest**: Can view and play, cannot save favorites
2. **User**: Full access to favorites and evaluations
3. **Admin**: Additional moderation capabilities

---

**Last Updated**: 2025-07-28  
**Note**: This catalog should be updated whenever domain objects are modified.