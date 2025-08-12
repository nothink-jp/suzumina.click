# TypeScript型安全性強化 サンプルコード集

実際の移行作業で使用できるコード例を示します。

## 目次
1. [Before/After比較](#beforeafter比較)
2. [実装パターン例](#実装パターン例)
3. [エラーハンドリング例](#エラーハンドリング例)
4. [テストコード例](#テストコード例)
5. [マイグレーション例](#マイグレーション例)

## Before/After比較

### 値オブジェクト実装の改善

#### Before: 基本的なクラス実装

```typescript
// packages/shared-types/src/value-objects/work/work-id.ts (現在)
export class WorkId {
  constructor(private readonly value: string) {
    if (!value || !value.match(/^RJ\d{6,8}$/)) {
      throw new Error(`Invalid WorkId: ${value}`);
    }
  }
  
  toString(): string {
    return this.value;
  }
  
  equals(other: WorkId): boolean {
    return other instanceof WorkId && this.value === other.value;
  }
  
  clone(): WorkId {
    return new WorkId(this.value);
  }
}

// 使用例
try {
  const id = new WorkId("RJ123456");
  console.log(id.toString());
} catch (error) {
  console.error("Invalid ID");
}
```

#### After: 型安全な実装

```typescript
// packages/shared-types/src/value-objects/work/work-id.ts (改善後)
import { BaseValueObject, ValidatableValueObject } from '../base/value-object';
import { Result, ok, err } from '../../core/result';
import { Brand } from '../../core/branded-types';

// Branded Type定義
export type WorkIdBrand = Brand<string, 'WorkId'>;

export class WorkId extends BaseValueObject<WorkId> 
  implements ValidatableValueObject<WorkId> {
  
  private constructor(private readonly value: string) {
    super();
  }
  
  // ファクトリメソッド（Result型）
  static create(value: string): Result<WorkId, ValidationError> {
    const validation = WorkId.validate(value);
    if (validation.isValid) {
      return ok(new WorkId(value));
    }
    return err({
      field: 'workId',
      message: validation.error!
    });
  }
  
  // Branded Type生成
  toBrandedType(): WorkIdBrand {
    return this.value as WorkIdBrand;
  }
  
  // バリデーション
  private static validate(value: string): { isValid: boolean; error?: string } {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'WorkId cannot be empty' };
    }
    if (!value.match(/^RJ\d{6,8}$/)) {
      return { isValid: false, error: 'WorkId must match pattern RJ[0-9]{6,8}' };
    }
    return { isValid: true };
  }
  
  // ValidatableValueObject実装
  isValid(): boolean {
    return WorkId.validate(this.value).isValid;
  }
  
  getValidationErrors(): string[] {
    const validation = WorkId.validate(this.value);
    return validation.isValid ? [] : [validation.error!];
  }
  
  // Plain Object変換
  toPlainObject(): string {
    return this.value;
  }
  
  static fromPlainObject(obj: unknown): Result<WorkId, ValidationError> {
    if (typeof obj !== 'string') {
      return err({
        field: 'workId',
        message: 'WorkId must be a string'
      });
    }
    return WorkId.create(obj);
  }
  
  // その他のメソッド
  toString(): string {
    return this.value;
  }
  
  clone(): WorkId {
    return new WorkId(this.value);
  }
}

// 使用例
const result = WorkId.create("RJ123456");
result.match(
  id => console.log(`Valid ID: ${id.toString()}`),
  error => console.error(`Error: ${error.message}`)
);
```

### エンティティ実装の改善

#### Before: 基本的なエンティティ

```typescript
// packages/shared-types/src/entities/video.ts (現在)
export class Video {
  constructor(
    public readonly id: string,
    public readonly content: VideoContent,
    public readonly metadata: VideoMetadata,
    public readonly statistics: VideoStatistics,
    public readonly channel: Channel,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
  
  isLiveStream(): boolean {
    return this.metadata.isLiveStream();
  }
  
  clone(): Video {
    return new Video(
      this.id,
      this.content.clone(),
      this.metadata.clone(),
      this.statistics.clone(),
      this.channel.clone(),
      new Date(this.createdAt),
      new Date(this.updatedAt)
    );
  }
}
```

#### After: DDDパターン準拠

```typescript
// packages/shared-types/src/entities/video.ts (改善後)
import { BaseEntity, EntityValidatable } from './base/entity';
import { Result, ok, err } from '../core/result';
import { z } from 'zod';

// Zodスキーマ定義
const VideoDataSchema = z.object({
  id: z.string().min(1),
  contentId: z.string(),
  title: z.string(),
  description: z.string(),
  publishedAt: z.date(),
  duration: z.string().optional(),
  channelId: z.string(),
  channelTitle: z.string(),
  viewCount: z.number().int().min(0),
  likeCount: z.number().int().min(0).optional(),
  commentCount: z.number().int().min(0).optional()
});

type VideoData = z.infer<typeof VideoDataSchema>;

export class Video extends BaseEntity<Video> implements EntityValidatable<Video> {
  private constructor(
    private readonly data: VideoData,
    private readonly content: VideoContent,
    private readonly metadata: VideoMetadata,
    private readonly statistics: VideoStatistics,
    private readonly channel: Channel,
    private readonly timestamps: {
      createdAt: Date;
      updatedAt: Date;
    }
  ) {
    super();
  }
  
  // ファクトリメソッド
  static create(input: unknown): Result<Video, z.ZodError | ValidationError> {
    // Zodバリデーション
    const parseResult = VideoDataSchema.safeParse(input);
    if (!parseResult.success) {
      return err(parseResult.error);
    }
    
    const data = parseResult.data;
    
    // Value Objects生成
    const contentResult = VideoContent.create({
      id: data.contentId,
      publishedAt: data.publishedAt,
      duration: data.duration
    });
    
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }
    
    // 他のValue Objectsも同様に生成...
    
    return ok(new Video(
      data,
      contentResult.value,
      metadata,
      statistics,
      channel,
      {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ));
  }
  
  // ビジネスロジック
  isLiveStream(): boolean {
    return this.metadata.isLiveStream();
  }
  
  isArchived(): boolean {
    const daysSincePublished = 
      (Date.now() - this.data.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSincePublished > 30 && this.isLiveStream();
  }
  
  canCreateAudioButton(): Result<void, ValidationError> {
    if (!this.isArchived()) {
      return err({
        field: 'video',
        message: 'Audio buttons can only be created from archived streams'
      });
    }
    return ok(undefined);
  }
  
  // EntityValidatable実装
  isValid(): boolean {
    return VideoDataSchema.safeParse(this.data).success &&
           this.content.isValid() &&
           this.metadata.isValid() &&
           this.statistics.isValid() &&
           this.channel.isValid();
  }
  
  getValidationErrors(): string[] {
    const errors: string[] = [];
    
    const dataResult = VideoDataSchema.safeParse(this.data);
    if (!dataResult.success) {
      errors.push(...dataResult.error.issues.map(i => i.message));
    }
    
    errors.push(...this.content.getValidationErrors());
    errors.push(...this.metadata.getValidationErrors());
    errors.push(...this.statistics.getValidationErrors());
    errors.push(...this.channel.getValidationErrors());
    
    return errors;
  }
  
  // BaseEntity実装
  equals(other: Video): boolean {
    return this.data.id === other.data.id;
  }
  
  clone(): Video {
    return new Video(
      structuredClone(this.data),
      this.content.clone(),
      this.metadata.clone(),
      this.statistics.clone(),
      this.channel.clone(),
      {
        createdAt: new Date(this.timestamps.createdAt),
        updatedAt: new Date(this.timestamps.updatedAt)
      }
    );
  }
  
  // Plain Object変換
  toPlainObject(): VideoPlainObject {
    return {
      ...this.data,
      content: this.content.toPlainObject(),
      metadata: this.metadata.toPlainObject(),
      statistics: this.statistics.toPlainObject(),
      channel: this.channel.toPlainObject(),
      createdAt: this.timestamps.createdAt.toISOString(),
      updatedAt: this.timestamps.updatedAt.toISOString()
    };
  }
}
```

## 実装パターン例

### 複雑な値オブジェクトの実装

```typescript
// packages/shared-types/src/value-objects/work/work-creators.ts
import { BaseValueObject, ValidatableValueObject } from '../base/value-object';
import { Result, ok, err } from '../../core/result';
import { z } from 'zod';

// クリエイター型定義
const CreatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['author', 'illustrator', 'voice_actor', 'scenario', 'music'])
});

type Creator = z.infer<typeof CreatorSchema>;

export class WorkCreators extends BaseValueObject<WorkCreators> 
  implements ValidatableValueObject<WorkCreators> {
  
  private constructor(
    private readonly creators: readonly Creator[]
  ) {
    super();
  }
  
  static create(creators: unknown[]): Result<WorkCreators, ValidationError> {
    // 配列バリデーション
    if (!Array.isArray(creators)) {
      return err({
        field: 'creators',
        message: 'Creators must be an array'
      });
    }
    
    if (creators.length === 0) {
      return err({
        field: 'creators',
        message: 'At least one creator is required'
      });
    }
    
    // 各クリエイターのバリデーション
    const validatedCreators: Creator[] = [];
    for (const [index, creator] of creators.entries()) {
      const result = CreatorSchema.safeParse(creator);
      if (!result.success) {
        return err({
          field: `creators[${index}]`,
          message: result.error.issues[0].message
        });
      }
      validatedCreators.push(result.data);
    }
    
    // 重複チェック
    const ids = new Set<string>();
    for (const creator of validatedCreators) {
      if (ids.has(creator.id)) {
        return err({
          field: 'creators',
          message: `Duplicate creator ID: ${creator.id}`
        });
      }
      ids.add(creator.id);
    }
    
    return ok(new WorkCreators(Object.freeze(validatedCreators)));
  }
  
  // クエリメソッド
  getByType(type: Creator['type']): Creator[] {
    return this.creators.filter(c => c.type === type);
  }
  
  hasType(type: Creator['type']): boolean {
    return this.creators.some(c => c.type === type);
  }
  
  getMainCreator(): Creator | undefined {
    return this.creators.find(c => c.type === 'author') || this.creators[0];
  }
  
  // 変換メソッド
  add(creator: Creator): Result<WorkCreators, ValidationError> {
    if (this.creators.some(c => c.id === creator.id)) {
      return err({
        field: 'creator',
        message: `Creator ${creator.id} already exists`
      });
    }
    
    return WorkCreators.create([...this.creators, creator]);
  }
  
  remove(creatorId: string): Result<WorkCreators, ValidationError> {
    const filtered = this.creators.filter(c => c.id !== creatorId);
    if (filtered.length === 0) {
      return err({
        field: 'creators',
        message: 'Cannot remove last creator'
      });
    }
    
    return ok(new WorkCreators(Object.freeze(filtered)));
  }
  
  // ValidatableValueObject実装
  isValid(): boolean {
    return this.creators.length > 0 &&
           this.creators.every(c => CreatorSchema.safeParse(c).success);
  }
  
  getValidationErrors(): string[] {
    const errors: string[] = [];
    
    if (this.creators.length === 0) {
      errors.push('At least one creator is required');
    }
    
    this.creators.forEach((creator, index) => {
      const result = CreatorSchema.safeParse(creator);
      if (!result.success) {
        errors.push(`creators[${index}]: ${result.error.issues[0].message}`);
      }
    });
    
    return errors;
  }
  
  // BaseValueObject実装
  clone(): WorkCreators {
    return new WorkCreators(structuredClone(this.creators));
  }
  
  toPlainObject(): Creator[] {
    return structuredClone(this.creators);
  }
  
  static fromPlainObject(obj: unknown): Result<WorkCreators, ValidationError> {
    if (!Array.isArray(obj)) {
      return err({
        field: 'creators',
        message: 'Invalid creators data'
      });
    }
    return WorkCreators.create(obj);
  }
}
```

### Branded Typesの実践的使用

```typescript
// packages/shared-types/src/core/ids.ts
import { Brand } from './branded-types';
import { invariant } from 'tiny-invariant';

// ID型定義
export type WorkId = Brand<string, 'WorkId'>;
export type CircleId = Brand<string, 'CircleId'>;
export type UserId = Brand<string, 'UserId'>;
export type VideoId = Brand<string, 'VideoId'>;

// ファクトリ関数とバリデーション
export const WorkId = {
  of(value: string): WorkId {
    invariant(
      /^RJ\d{6,8}$/.test(value),
      `Invalid WorkId format: ${value}`
    );
    return value as WorkId;
  },
  
  isValid(value: string): value is WorkId {
    return /^RJ\d{6,8}$/.test(value);
  },
  
  parse(value: unknown): WorkId {
    invariant(typeof value === 'string', 'WorkId must be a string');
    return WorkId.of(value);
  }
};

export const CircleId = {
  of(value: string): CircleId {
    invariant(value.length > 0, 'CircleId cannot be empty');
    return value as CircleId;
  },
  
  isValid(value: string): value is CircleId {
    return value.length > 0;
  }
};

// 使用例
function processWork(workId: WorkId, circleId: CircleId): void {
  // 型安全な処理
  console.log(`Processing work ${workId} from circle ${circleId}`);
}

// コンパイル時エラー
// processWork("RJ123456", "circle001"); // Error: string is not WorkId

// 正しい使用
const workId = WorkId.of("RJ123456");
const circleId = CircleId.of("circle001");
processWork(workId, circleId); // OK
```

## エラーハンドリング例

### Result型を使った包括的エラーハンドリング

```typescript
// packages/shared-types/src/services/work-service.ts
import { Result, ok, err, ResultAsync } from 'neverthrow';

type ServiceError = 
  | { type: 'NotFound'; id: string }
  | { type: 'ValidationFailed'; errors: ValidationError[] }
  | { type: 'DatabaseError'; message: string }
  | { type: 'NetworkError'; message: string };

export class WorkService {
  // 同期的な操作
  validateWork(data: unknown): Result<Work, ServiceError> {
    return Work.create(data).mapErr(error => {
      if (error instanceof z.ZodError) {
        return {
          type: 'ValidationFailed' as const,
          errors: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        };
      }
      return {
        type: 'ValidationFailed' as const,
        errors: [error]
      };
    });
  }
  
  // 非同期操作
  async findWork(id: WorkId): Promise<Result<Work, ServiceError>> {
    try {
      const data = await database.findById(id.toString());
      
      if (!data) {
        return err({
          type: 'NotFound' as const,
          id: id.toString()
        });
      }
      
      return this.validateWork(data);
    } catch (error) {
      return err({
        type: 'DatabaseError' as const,
        message: String(error)
      });
    }
  }
  
  // ResultAsyncを使った非同期チェーン
  updateWork(
    id: WorkId,
    updates: Partial<WorkData>
  ): ResultAsync<Work, ServiceError> {
    return ResultAsync.fromPromise(
      database.findById(id.toString()),
      (error): ServiceError => ({
        type: 'DatabaseError',
        message: String(error)
      })
    )
    .andThen(data => {
      if (!data) {
        return err({
          type: 'NotFound' as const,
          id: id.toString()
        });
      }
      return ok({ ...data, ...updates });
    })
    .andThen(data => this.validateWork(data))
    .andThen(work => 
      ResultAsync.fromPromise(
        database.save(work.toPlainObject()),
        (error): ServiceError => ({
          type: 'DatabaseError',
          message: String(error)
        })
      ).map(() => work)
    );
  }
}

// 使用例
const service = new WorkService();

// エラーハンドリング
const result = await service.findWork(WorkId.of("RJ123456"));

result.match(
  work => {
    console.log(`Found work: ${work.title}`);
  },
  error => {
    switch (error.type) {
      case 'NotFound':
        console.log(`Work not found: ${error.id}`);
        break;
      case 'ValidationFailed':
        console.log('Validation errors:', error.errors);
        break;
      case 'DatabaseError':
        console.error('Database error:', error.message);
        break;
    }
  }
);
```

## テストコード例

### 値オブジェクトのテスト

```typescript
// packages/shared-types/src/value-objects/work/__tests__/work-id.test.ts
import { describe, it, expect } from 'vitest';
import { WorkId } from '../work-id';

describe('WorkId', () => {
  describe('create', () => {
    it('should create valid WorkId', () => {
      const result = WorkId.create('RJ123456');
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('RJ123456');
      }
    });
    
    it('should reject empty string', () => {
      const result = WorkId.create('');
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.field).toBe('workId');
        expect(result.error.message).toContain('empty');
      }
    });
    
    it('should reject invalid format', () => {
      const testCases = [
        'RJ12345',    // too short
        'RJ123456789', // too long
        'XX123456',    // wrong prefix
        'RJ12345a',    // contains letter
      ];
      
      testCases.forEach(value => {
        const result = WorkId.create(value);
        expect(result.isErr()).toBe(true);
      });
    });
  });
  
  describe('fromPlainObject', () => {
    it('should parse valid string', () => {
      const result = WorkId.fromPlainObject('RJ123456');
      expect(result.isOk()).toBe(true);
    });
    
    it('should reject non-string', () => {
      const result = WorkId.fromPlainObject(123456);
      expect(result.isErr()).toBe(true);
    });
  });
  
  describe('validation', () => {
    it('should validate correctly', () => {
      const id = WorkId.create('RJ123456').unwrapOr(null);
      expect(id).not.toBeNull();
      expect(id!.isValid()).toBe(true);
      expect(id!.getValidationErrors()).toHaveLength(0);
    });
  });
});
```

### エンティティのテスト

```typescript
// packages/shared-types/src/entities/__tests__/video.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Video } from '../video';

describe('Video', () => {
  let validData: any;
  
  beforeEach(() => {
    validData = {
      id: 'video123',
      contentId: 'content123',
      title: 'Test Video',
      description: 'Test Description',
      publishedAt: new Date('2024-01-01'),
      duration: 'PT10M30S',
      channelId: 'channel123',
      channelTitle: 'Test Channel',
      viewCount: 1000,
      likeCount: 100,
      commentCount: 10
    };
  });
  
  describe('create', () => {
    it('should create valid video', () => {
      const result = Video.create(validData);
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const video = result.value;
        expect(video.isValid()).toBe(true);
        expect(video.getValidationErrors()).toHaveLength(0);
      }
    });
    
    it('should reject invalid data', () => {
      const invalidData = { ...validData, id: '' };
      const result = Video.create(invalidData);
      
      expect(result.isErr()).toBe(true);
    });
  });
  
  describe('business logic', () => {
    it('should identify live streams', () => {
      const liveData = {
        ...validData,
        duration: undefined // Live streams have no duration
      };
      
      const result = Video.create(liveData);
      expect(result.isOk()).toBe(true);
      
      if (result.isOk()) {
        expect(result.value.isLiveStream()).toBe(true);
      }
    });
    
    it('should check if audio button creation is allowed', () => {
      // Recent live stream
      const recentLive = {
        ...validData,
        duration: undefined,
        publishedAt: new Date()
      };
      
      const video1 = Video.create(recentLive).unwrapOr(null);
      expect(video1).not.toBeNull();
      expect(video1!.canCreateAudioButton().isErr()).toBe(true);
      
      // Archived live stream
      const archivedLive = {
        ...validData,
        duration: undefined,
        publishedAt: new Date('2023-01-01')
      };
      
      const video2 = Video.create(archivedLive).unwrapOr(null);
      expect(video2).not.toBeNull();
      expect(video2!.canCreateAudioButton().isOk()).toBe(true);
    });
  });
});
```

## マイグレーション例

### 段階的移行のためのアダプターパターン

```typescript
// packages/shared-types/src/migration/work-adapter.ts

// 旧インターフェース（既存コードとの互換性）
export interface LegacyWork {
  id: string;
  title: string;
  price: number;
  // ...
}

// 新旧変換アダプター
export class WorkAdapter {
  // 旧→新
  static fromLegacy(legacy: LegacyWork): Result<Work, ValidationError> {
    return Work.create({
      id: legacy.id,
      title: legacy.title,
      price: legacy.price,
      // マッピング
    });
  }
  
  // 新→旧
  static toLegacy(work: Work): LegacyWork {
    const plain = work.toPlainObject();
    return {
      id: plain.id,
      title: plain.title,
      price: plain.price,
      // 逆マッピング
    };
  }
  
  // 移行期間用のファサード
  static createCompatible(data: LegacyWork | unknown): LegacyWork | Work {
    if (isLegacyWork(data)) {
      // 旧形式の場合は変換を試みる
      const result = WorkAdapter.fromLegacy(data);
      if (result.isOk()) {
        console.warn('Legacy Work format used. Please migrate to new format.');
        return result.value;
      }
      return data; // 変換失敗時は旧形式のまま
    }
    
    // 新形式の場合
    const result = Work.create(data);
    if (result.isOk()) {
      return result.value;
    }
    
    throw new Error(`Invalid work data: ${JSON.stringify(result.error)}`);
  }
}

function isLegacyWork(data: unknown): data is LegacyWork {
  return typeof data === 'object' &&
         data !== null &&
         'id' in data &&
         'title' in data &&
         'price' in data &&
         !('_brand' in data); // 新形式にはブランドがある
}
```

### 既存APIの段階的更新

```typescript
// packages/shared-types/src/api/work-api.ts

export class WorkAPI {
  // 旧API（deprecation警告付き）
  /**
   * @deprecated Use findWorkSafe() instead. Will be removed in v2.0.0
   */
  async findWork(id: string): Promise<Work | null> {
    console.warn('findWork() is deprecated. Use findWorkSafe() instead.');
    
    const result = await this.findWorkSafe(WorkId.of(id));
    return result.match(
      work => work,
      _error => null
    );
  }
  
  // 新API（Result型）
  async findWorkSafe(id: WorkId): Promise<Result<Work, ServiceError>> {
    try {
      const data = await fetch(`/api/works/${id}`).then(r => r.json());
      return Work.create(data).mapErr(error => ({
        type: 'ValidationFailed' as const,
        errors: [error]
      }));
    } catch (error) {
      return err({
        type: 'NetworkError' as const,
        message: String(error)
      });
    }
  }
  
  // 移行ヘルパー
  static migrateToSafeAPI<T>(
    unsafeCall: () => Promise<T | null>
  ): Promise<Result<T, { type: 'LegacyError'; message: string }>> {
    return unsafeCall()
      .then(data => 
        data ? ok(data) : err({ type: 'LegacyError' as const, message: 'Not found' })
      )
      .catch(error => 
        err({ type: 'LegacyError' as const, message: String(error) })
      );
  }
}
```

## まとめ

これらのサンプルコードは、実際の移行作業で参考にできる実装パターンを示しています。重要なポイント：

1. **段階的移行**: アダプターパターンで新旧コードの共存を実現
2. **型安全性**: Branded TypesとResult型で実行時エラーを削減
3. **テスタビリティ**: Result型により予測可能なテストが可能
4. **保守性**: 明確なエラーハンドリングとバリデーション

各コード例は実際のプロジェクトに合わせてカスタマイズしてください。