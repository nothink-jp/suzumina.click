# Entity実装ガイドライン

**作成日**: 2025-07-26  
**更新日**: 2025-07-26  
**目的**: Next.js + Cloud Functions環境に最適化された、実用的なEntity/Value Objectアーキテクチャの実装ガイドライン

## 概要

本ドキュメントは、suzumina.clickプロジェクトにおけるEntity/Value Objectアーキテクチャの実装ガイドラインです。VideoエンティティとAudioButtonエンティティの実装経験を基に、**実用性を重視した**標準的なアプローチを定義します。

## 設計哲学

**「完璧な理論より、動く実装」** - 理想的なオブジェクト指向設計よりも、Next.js App RouterとCloud Functionsの制約下で確実に動作し、保守しやすい実装を優先します。

## 基本原則

### 1. 実用的なイミュータブル設計
- エンティティと値オブジェクトのプロパティは `private readonly` で宣言
- 状態変更は新しいインスタンスを返すメソッドとして実装
- コンストラクタのアクセシビリティは柔軟に（publicでも可）

### 2. 型安全性とバランス
- ドメインの重要な概念は値オブジェクトでラップ
- 過度な抽象化は避け、必要十分な型定義に留める
- 実行時エラーよりもnullを返す安全な設計

### 3. Next.js環境への最適化
- Server Component制約を考慮したPlain Object変換の必須化
- Firestore Timestampの柔軟な処理
- ビジネスロジックの事前計算（_computedパターン）

## 実装パターン

### エンティティの実用的な構造

```typescript
export class EntityName {
  // 1. コンストラクタ（publicでも可）
  constructor(
    private readonly _property1: ValueObject1,
    private readonly _property2: ValueObject2,
    private readonly _metadata: EntityMetadata,
    // 他のプロパティ
  ) {}

  // 2. Firestoreからの復元（最重要メソッド）
  public static fromFirestoreData(data: FirestoreData): EntityName | null {
    try {
      // Timestamp処理の例
      const convertTimestamp = (timestamp: unknown): Date | undefined => {
        if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
          return (timestamp as any).toDate();
        }
        if (typeof timestamp === "string") {
          return new Date(timestamp);
        }
        return undefined;
      };

      // 値オブジェクトの生成
      const property1 = new ValueObject1(data.property1);
      const property2 = ValueObject2.fromFirestore(data.property2);
      
      return new EntityName(property1, property2, metadata);
    } catch (error) {
      // エラーログ（握りつぶさない）
      console.error('Failed to create entity from Firestore:', error);
      return null; // エラーを投げずにnullを返す
    }
  }

  // 3. レガシーフォーマットからの変換（移行期間中）
  public static fromLegacyFormat(data: LegacyData): EntityName {
    // 段階的移行のためのヘルパー
    return new EntityName(
      // レガシーデータからの変換
    );
  }

  // 4. ゲッター（ビジネスロジックを含む）
  get id(): string { 
    return this._property1.toString(); 
  }

  get displayName(): string {
    // ビジネスロジックの例
    return `${this._property1} - ${this._property2}`;
  }

  // 5. ビジネスロジック（純粋関数として実装）
  public canPerformAction(): boolean {
    // 複雑な判定ロジック
    return this._metadata.isActive && this._property1.isValid();
  }

  // 6. 更新メソッド（新しいインスタンスを返す）
  public updateProperty(newValue: ValueObject1): EntityName {
    return new EntityName(newValue, this._property2, this._metadata);
  }

  // 7. Plain Object変換（必須 - Server Component対応）
  public toPlainObject(): EntityPlainObject {
    return {
      // すべての元データを保持
      id: this.id,
      property1: this._property1.toString(),
      property2: this._property2.toJSON(),
      metadata: {
        createdAt: this._metadata.createdAt.toISOString(),
        updatedAt: this._metadata.updatedAt.toISOString(),
      },
      
      // 計算済みプロパティ（最重要）
      _computed: {
        displayName: this.displayName,
        canPerformAction: this.canPerformAction(),
        // 他のビジネスロジックの結果をキャッシュ
      }
    };
  }

  // 8. レガシーフォーマット変換（移行期間中）
  public toLegacyFormat(): LegacyData {
    return {
      // 既存システムとの互換性維持
    };
  }
}
```

### 値オブジェクトの実用的な構造

```typescript
export class ValueObjectName {
  // 1. コンストラクタ（状況に応じてpublic/private）
  constructor(private readonly value: string) {
    // コンストラクタ内でバリデーション
    if (!this.isValid(value)) {
      throw new Error(`Invalid ${ValueObjectName.name}: ${value}`);
    }
  }

  // 2. バリデーション（private static推奨）
  private isValid(value: string): boolean {
    // ドメインルールに基づく検証
    return value.length > 0 && value.length <= 100;
  }

  // 3. 値の取得（必須）
  public toString(): string {
    return this.value;
  }

  // 4. 等価性判定（推奨）
  public equals(other: ValueObjectName): boolean {
    return this.value === other.value;
  }

  // 5. 変換メソッド（必要に応じて）
  public toUpperCase(): ValueObjectName {
    return new ValueObjectName(this.value.toUpperCase());
  }

  // 6. Plain Object変換（Server Component対応）
  public toJSON(): any {
    return this.value;
  }
}

// より複雑な値オブジェクトの例
export class VideoStatistics {
  constructor(
    private readonly _viewCount: ViewCount,
    private readonly _likeCount?: LikeCount,
    private readonly _dislikeCount?: DislikeCount,
  ) {}

  // ビジネスロジックを含むメソッド
  getTotalInteractions(): number {
    const likes = this._likeCount?.toNumber() ?? 0;
    const dislikes = this._dislikeCount?.toNumber() ?? 0;
    return likes + dislikes;
  }

  // エンゲージメント率の計算
  getEngagementRate(): number {
    const views = this._viewCount.toNumber();
    if (views === 0) return 0;
    return (this.getTotalInteractions() / views) * 100;
  }

  // Plain Object変換
  toJSON() {
    return {
      viewCount: this._viewCount.toNumber(),
      likeCount: this._likeCount?.toNumber(),
      dislikeCount: this._dislikeCount?.toNumber(),
      // 計算値も含める
      totalInteractions: this.getTotalInteractions(),
      engagementRate: this.getEngagementRate(),
    };
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

### 実用的なMapper構造

```typescript
// 1. 外部APIからエンティティへの変換
export function mapYouTubeToVideoEntity(
  youtubeVideo: youtube_v3.Schema$Video,
  additionalData?: AdditionalData
): Video | null {
  try {
    // 必須フィールドの検証
    if (!youtubeVideo.id || !youtubeVideo.snippet) {
      logger.warn("Missing required fields", {
        hasId: !!youtubeVideo.id,
        hasSnippet: !!youtubeVideo.snippet,
      });
      return null;
    }

    // 値オブジェクトの生成（ヘルパー関数を活用）
    const channel = createChannelFromYouTube(youtubeVideo.snippet);
    const content = createVideoContentFromYouTube(youtubeVideo);
    const metadata = createVideoMetadataFromYouTube(youtubeVideo);
    const statistics = youtubeVideo.statistics
      ? createVideoStatisticsFromYouTube(youtubeVideo.statistics)
      : undefined;

    // エンティティの生成（コンストラクタ直接使用も可）
    return new Video(
      content,
      metadata,
      channel,
      statistics,
      additionalData?.tags,
      additionalData?.audioButtonInfo
    );
  } catch (error) {
    // エラーログだが、例外は投げない
    logger.error("Failed to map YouTube video", {
      videoId: youtubeVideo.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

// 2. ヘルパー関数の例
function createChannelFromYouTube(
  snippet: youtube_v3.Schema$VideoSnippet
): Channel | null {
  if (!snippet.channelId || !snippet.channelTitle) {
    return null;
  }
  return new Channel(
    new ChannelId(snippet.channelId),
    new ChannelTitle(snippet.channelTitle)
  );
}

// 3. バッチ処理（エラー情報付き）
export function mapYouTubeVideosWithErrors(
  youtubeVideos: youtube_v3.Schema$Video[]
): BatchMappingResult {
  const videos: Video[] = [];
  const errors: MappingError[] = [];

  for (const youtubeVideo of youtubeVideos) {
    const video = mapYouTubeToVideoEntity(youtubeVideo);
    if (video) {
      videos.push(video);
    } else {
      errors.push({
        videoId: youtubeVideo.id || "unknown",
        field: "mapping",
        reason: "Failed to create Video entity",
      });
    }
  }

  return {
    videos,
    errors,
    totalProcessed: youtubeVideos.length,
    successCount: videos.length,
    failureCount: errors.length,
  };
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

## 実装時の重要ポイント

### Next.js + Cloud Functions環境での注意点

1. **Firestore Timestamp処理**
   - Cloud Functions環境とNext.js環境で異なる形式
   - 柔軟な変換関数を用意する

2. **null安全性**
   - fromFirestoreDataは失敗時にnullを返す
   - エラーを投げるより安全な設計

3. **Plain Object変換の最適化**
   - _computedプロパティで計算結果をキャッシュ
   - Client Componentでの再計算を避ける

4. **段階的移行のサポート**
   - レガシー形式との相互変換メソッド
   - 移行期間中の互換性維持

## チェックリスト

新しいエンティティを実装する際のチェックリスト：

### 必須項目 ⭐
- [ ] **fromFirestoreData()メソッド** - Firestoreからの復元（nullを返せる）
- [ ] **toPlainObject()メソッド** - Server Component対応
- [ ] **_computedプロパティ** - ビジネスロジックの事前計算
- [ ] **値オブジェクトの活用** - 重要なドメイン概念の表現
- [ ] **イミュータブル設計** - private readonlyプロパティ

### 推奨項目 ✅
- [ ] fromLegacyFormat() / toLegacyFormat() - 移行期間のサポート
- [ ] ビジネスロジックのgetter実装
- [ ] 更新メソッド（新インスタンスを返す）
- [ ] 値オブジェクトのtoString() / toJSON()
- [ ] 適切なエラーハンドリング（nullを返す）

### オプション項目 ⚡
- [ ] createファクトリメソッド（必要な場合）
- [ ] プライベートコンストラクタ（必要な場合）
- [ ] equalsメソッド（値オブジェクト）
- [ ] toFirestore()メソッド（必要な場合）

### テスト項目 🧪
- [ ] fromFirestoreDataのnull安全性テスト
- [ ] toPlainObjectの_computedプロパティテスト
- [ ] ビジネスロジックの境界値テスト
- [ ] Timestamp変換のテスト

## 参考実装

- `packages/shared-types/src/entities/video.ts`
- `packages/shared-types/src/entities/audio-button.ts`
- `apps/functions/src/services/mappers/video-mapper.ts`
- `apps/web/src/actions/video-actions.ts`

## 実装の優先順位

エンティティ実装時に最も重要なのは：

1. **Server Component対応** - toPlainObject()と_computed
2. **Firestore連携** - fromFirestoreDataとTimestamp処理
3. **型安全性** - 値オブジェクトによるドメイン表現
4. **実用性** - 過度な抽象化を避ける

## 今後の展開

このガイドラインは、以下のエンティティの実装に適用されます：

### 1. Work（作品）エンティティ
```typescript
// 実装イメージ
export class Work {
  constructor(
    private readonly _id: WorkId,
    private readonly _title: WorkTitle,
    private readonly _price: Price,
    private readonly _rating: Rating,
    // ...
  ) {}

  // 最重要メソッド
  static fromFirestoreData(data: FirestoreWorkData): Work | null
  toPlainObject(): WorkPlainObject
}
```

### 2. User（ユーザー）エンティティ
- 認証情報と権限管理
- プリファレンスの値オブジェクト化

### 3. Evaluation（評価）エンティティ
- 作品評価の集約
- 評価統計の計算ロジック

## ファイル配置方針

### packages/shared-types配下の構造

```
packages/shared-types/src/
├── entities/              # エンティティクラス
│   ├── video.ts          # Video エンティティ
│   ├── audio-button.ts   # AudioButton エンティティ
│   ├── work.ts           # Work エンティティ（実装予定）
│   └── user.ts           # User エンティティ（実装予定）
├── value-objects/         # 値オブジェクト
│   ├── video/            # Video関連の値オブジェクト
│   │   ├── video-content.ts
│   │   ├── video-metadata.ts
│   │   ├── video-statistics.ts
│   │   └── channel.ts
│   ├── audio-button/     # AudioButton関連の値オブジェクト
│   │   ├── audio-content.ts
│   │   ├── audio-reference.ts
│   │   └── button-statistics.ts
│   ├── work/             # Work関連の値オブジェクト
│   │   ├── price.ts
│   │   ├── rating.ts
│   │   ├── date-range.ts
│   │   └── creator-type.ts
│   └── common/           # 共通の値オブジェクト
│       ├── timestamp.ts
│       ├── id.ts
│       └── metadata.ts
├── plain-objects/         # Plain Object型定義
│   ├── video-plain.ts
│   ├── audio-button-plain.ts
│   └── work-plain.ts
└── utils/                 # 共通ユーティリティ
    ├── date-parser.ts
    ├── number-parser.ts
    └── validators.ts
```

### apps/functions配下のMapper配置

```
apps/functions/src/
├── services/
│   ├── mappers/           # APIデータ → エンティティ変換
│   │   ├── video-mapper.ts      # YouTube API → Video Entity
│   │   ├── audio-button-mapper.ts # Firestore → AudioButton Entity
│   │   └── work-mapper.ts       # DLsite API → Work Entity
│   └── converters/        # エンティティ → 永続化データ変換
│       ├── video-converter.ts    # Video Entity → Firestore
│       └── work-converter.ts     # Work Entity → Firestore
```

### apps/web配下のアクション配置

```
apps/web/src/
├── actions/               # Server Actions
│   ├── video-actions.ts  # Video関連のServer Actions
│   ├── audio-button-actions.ts # AudioButton関連
│   └── work-actions.ts   # Work関連
├── hooks/                 # Client側のカスタムフック
│   ├── use-video.ts
│   └── use-audio-button.ts
└── components/
    └── [entity-name]/     # エンティティ固有のコンポーネント
```

### ファイル配置の原則

1. **エンティティとその値オブジェクトは密接に配置**
   - エンティティ: `entities/[entity-name].ts`
   - 値オブジェクト: `value-objects/[entity-name]/`
   
2. **Plain Object型定義は独立**
   - Server/Client境界で使用される型は別ディレクトリ
   - `plain-objects/[entity-name]-plain.ts`

3. **Mapperは変換の方向で分離**
   - 外部API → エンティティ: `services/mappers/`
   - エンティティ → 永続化: `services/converters/`

4. **テストファイルの配置**
   ```
   packages/shared-types/src/
   ├── entities/
   │   └── __tests__/
   │       ├── video.test.ts
   │       └── audio-button.test.ts
   └── value-objects/
       └── video/
           └── __tests__/
               ├── video-content.test.ts
               └── video-statistics.test.ts
   ```

### 命名規則

1. **ファイル名**
   - エンティティ: `[entity-name].ts` (kebab-case)
   - 値オブジェクト: `[value-object-name].ts` (kebab-case)
   - Mapper: `[source]-mapper.ts`
   - Plain Object: `[entity-name]-plain.ts`

2. **クラス名**
   - エンティティ: `EntityName` (PascalCase)
   - 値オブジェクト: `ValueObjectName` (PascalCase)
   - Plain Object型: `EntityNamePlainObject`

3. **ディレクトリ名**
   - すべてkebab-caseで統一
   - 複数形は使用しない（例: `entity` ではなく `entities`）

### インポートパス

```typescript
// エンティティのインポート
import { Video } from '@suzumina.click/shared-types/entities/video';
import { AudioButton } from '@suzumina.click/shared-types/entities/audio-button';

// 値オブジェクトのインポート
import { VideoContent } from '@suzumina.click/shared-types/value-objects/video/video-content';
import { Price } from '@suzumina.click/shared-types/value-objects/work/price';

// Plain Objectのインポート
import type { VideoPainObject } from '@suzumina.click/shared-types/plain-objects/video-plain';

// ユーティリティのインポート
import { parseDate } from '@suzumina.click/shared-types/utils/date-parser';
```

### バンドル最適化

1. **Tree-shaking対応**
   - 各ファイルは独立してインポート可能
   - barrel export (`index.ts`) は避ける

2. **型定義とランタイムコードの分離**
   - Plain Object型定義は `type` でエクスポート
   - ランタイムコードを含まない

## まとめ

**「動くコードが正義」** - Next.js + Cloud Functions環境で確実に動作し、開発者が理解しやすく、保守しやすい実装を心がけましょう。理論的な純粋性よりも、実際のプロジェクトでの有用性を優先します。