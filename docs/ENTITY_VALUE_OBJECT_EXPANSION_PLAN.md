# Entity/Value Object アーキテクチャ拡張計画

## 概要

Entity/Value Objectアーキテクチャの第2フェーズとして、残された改善項目の実施と、videos、audioButtons等の他エンティティへの適用計画を定義します。

## Part 1: 命名規則の簡潔化

### 現状の課題

現在の型名は機能的だが冗長：
- `OptimizedFirestoreDLsiteWorkData` → 提案: `Work`
- `DLsiteRawApiResponse` → 提案: `DLsiteApiResponse`
- `UnifiedDataCollectionMetadata` → 提案: `CollectionMetadata`
- `FirestoreFieldTimestamp` → 提案: `Timestamp`

### 実装アプローチ

#### Phase 1: エイリアス導入（影響最小化）
```typescript
// packages/shared-types/src/aliases/index.ts
export type Work = OptimizedFirestoreDLsiteWorkData;
export type DLsiteApiResponse = DLsiteRawApiResponse;
export type CollectionMetadata = UnifiedDataCollectionMetadata;
export type Timestamp = FirestoreFieldTimestamp;

// 段階的移行のための再エクスポート
export {
  OptimizedFirestoreDLsiteWorkData,
  DLsiteRawApiResponse,
  UnifiedDataCollectionMetadata,
  FirestoreFieldTimestamp
};
```

#### Phase 2: 段階的置換
1. 新規コードでは簡潔な名前を使用
2. テストファイルから順次更新
3. ビジネスロジックの更新
4. 最後にデータベース層を更新

#### Phase 3: 旧名称の廃止
```typescript
// 廃止予定マーク
/**
 * @deprecated Use `Work` instead
 */
export type OptimizedFirestoreDLsiteWorkData = Work;
```

### リスクと対策

| リスク | 対策 |
|--------|------|
| 型の不整合 | TypeScriptコンパイラによる検証 |
| インポートエラー | エイリアスによる段階的移行 |
| ドキュメント不整合 | 自動生成ツールの活用 |

## Part 2: スキーマバージョニング戦略

### WorkV2スキーマ設計

```typescript
// packages/shared-types/src/entities/work-v2.ts
export interface WorkV2 {
  // 基本情報
  id: string;
  version: 2; // スキーマバージョン
  
  // 簡潔な構造
  basic: {
    title: string;
    circle: CircleInfo;
    categories: Category[];
  };
  
  // 価格と評価（Value Objects）
  pricing: Price;
  rating: Rating;
  
  // メタデータ
  meta: {
    created: Timestamp;
    modified: Timestamp;
    source: DataSource;
  };
}
```

### マイグレーション関数

```typescript
// packages/shared-types/src/migrations/work-migration.ts
export function migrateWorkV1ToV2(v1: Work): WorkV2 {
  return {
    id: v1.id,
    version: 2,
    basic: {
      title: v1.title,
      circle: {
        id: v1.circleId,
        name: v1.circleName,
        type: v1.creatorType
      },
      categories: v1.categories.map(normalizeCategory)
    },
    pricing: v1.price,
    rating: v1.rating,
    meta: {
      created: v1.createdAt,
      modified: v1.updatedAt,
      source: 'dlsite'
    }
  };
}

// 逆方向マイグレーション（互換性維持）
export function migrateWorkV2ToV1(v2: WorkV2): Work {
  // 実装省略
}
```

## Part 3: Video エンティティのEntity/Value Object化

### 現状分析

```typescript
// 現在の構造（フラット）
interface Video {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: Date;
  duration: string;
  viewCount: number;
  likeCount: number;
  thumbnail: string;
  // ... 多数のフィールド
}
```

### 提案: Entity/Value Object構造

```typescript
// packages/shared-types/src/entities/video.ts
export interface Video {
  // エンティティID
  id: string;
  
  // 基本情報
  metadata: VideoMetadata;
  
  // チャンネル情報（Value Object）
  channel: Channel;
  
  // 統計情報（Value Object）
  statistics: VideoStatistics;
  
  // コンテンツ情報（Value Object）  
  content: VideoContent;
  
  // 関連情報
  relatedWorkIds: string[];
  tags: VideoTag[];
}

// packages/shared-types/src/value-objects/video-metadata.ts
export const VideoMetadata = z.object({
  title: z.string(),
  description: z.string(),
  publishedAt: z.date(),
  duration: z.string()
}).transform(data => ({
  ...data,
  
  // ビジネスロジック
  isRecent: () => {
    const days = Math.floor(
      (Date.now() - data.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return days <= 7;
  },
  
  getDurationInSeconds: () => {
    // PT15M33S → 933秒
    return parseDuration(data.duration);
  },
  
  getFormattedDuration: () => {
    // 933 → "15:33"
    return formatDuration(data.duration);
  }
}));

// packages/shared-types/src/value-objects/channel.ts
export const Channel = z.object({
  id: z.string(),
  title: z.string(),
  customUrl: z.string().optional(),
  subscriberCount: z.number().optional()
}).transform(data => ({
  ...data,
  
  getChannelUrl: () => 
    `https://youtube.com/channel/${data.id}`,
  
  isVerified: () => 
    data.subscriberCount && data.subscriberCount > 100000,
  
  equals: (other: unknown) => {
    if (!isChannelType(other)) return false;
    return data.id === other.id;
  }
}));

// packages/shared-types/src/value-objects/video-statistics.ts
export const VideoStatistics = z.object({
  viewCount: z.number(),
  likeCount: z.number(),
  commentCount: z.number().optional(),
  favoriteCount: z.number().optional()
}).transform(data => ({
  ...data,
  
  getEngagementRate: () => {
    if (data.viewCount === 0) return 0;
    return (data.likeCount / data.viewCount) * 100;
  },
  
  isViral: () => 
    data.viewCount > 100000,
  
  formatViews: () => {
    if (data.viewCount >= 1000000) {
      return `${(data.viewCount / 1000000).toFixed(1)}M`;
    }
    if (data.viewCount >= 1000) {
      return `${(data.viewCount / 1000).toFixed(1)}K`;
    }
    return data.viewCount.toString();
  }
}));
```

### マッパー実装

```typescript
// apps/functions/src/services/mappers/video-mapper.ts
export class VideoMapper {
  static fromYouTubeApi(raw: YouTubeApiResponse): Video {
    return {
      id: raw.id,
      
      metadata: VideoMetadata.parse({
        title: raw.snippet.title,
        description: raw.snippet.description,
        publishedAt: new Date(raw.snippet.publishedAt),
        duration: raw.contentDetails.duration
      }),
      
      channel: Channel.parse({
        id: raw.snippet.channelId,
        title: raw.snippet.channelTitle
      }),
      
      statistics: VideoStatistics.parse({
        viewCount: parseInt(raw.statistics.viewCount),
        likeCount: parseInt(raw.statistics.likeCount),
        commentCount: parseInt(raw.statistics.commentCount)
      }),
      
      content: VideoContent.parse({
        type: this.determineVideoType(raw),
        tags: raw.snippet.tags || [],
        thumbnails: raw.snippet.thumbnails
      }),
      
      relatedWorkIds: [],
      tags: []
    };
  }
  
  private static determineVideoType(raw: YouTubeApiResponse): VideoType {
    if (raw.snippet.liveBroadcastContent === 'live') return 'livestream';
    if (raw.contentDetails.duration.includes('PT0S')) return 'short';
    return 'regular';
  }
}
```

## Part 4: AudioButton エンティティのEntity/Value Object化

### 現状分析

```typescript
// 現在の構造
interface AudioButton {
  id: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  endTimestamp?: number;
  text: string;
  category?: string;
  dlsiteWorkId?: string;
  tags?: string[];
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 提案: Entity/Value Object構造

```typescript
// packages/shared-types/src/entities/audio-button.ts
export interface AudioButton {
  // エンティティID
  id: string;
  
  // 参照情報（Value Object）
  reference: AudioReference;
  
  // コンテンツ（Value Object）
  content: AudioContent;
  
  // 統計情報（Value Object）
  statistics: ButtonStatistics;
  
  // メタデータ
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
  };
}

// packages/shared-types/src/value-objects/audio-reference.ts
export const AudioReference = z.object({
  videoId: z.string(),
  videoTitle: z.string(),
  timestamp: z.number(),
  endTimestamp: z.number().optional(),
  workId: z.string().optional()
}).transform(data => ({
  ...data,
  
  getYouTubeUrl: () => 
    `https://youtube.com/watch?v=${data.videoId}&t=${data.timestamp}`,
  
  getEmbedUrl: () => 
    `https://youtube.com/embed/${data.videoId}?start=${data.timestamp}` +
    (data.endTimestamp ? `&end=${data.endTimestamp}` : ''),
  
  getDuration: () => 
    data.endTimestamp ? data.endTimestamp - data.timestamp : null,
  
  formatTimestamp: () => {
    const hours = Math.floor(data.timestamp / 3600);
    const minutes = Math.floor((data.timestamp % 3600) / 60);
    const seconds = data.timestamp % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}));

// packages/shared-types/src/value-objects/audio-content.ts
export const AudioContent = z.object({
  text: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  language: z.string().default('ja')
}).transform(data => ({
  ...data,
  
  hasCategory: () => 
    !!data.category,
  
  hasTag: (tag: string) => 
    data.tags.includes(tag),
  
  getDisplayText: () => 
    data.text.length > 50 ? `${data.text.slice(0, 50)}...` : data.text,
  
  getSearchableText: () => 
    [data.text, ...data.tags].join(' ').toLowerCase()
}));

// packages/shared-types/src/value-objects/button-statistics.ts
export const ButtonStatistics = z.object({
  viewCount: z.number().default(0),
  likeCount: z.number().default(0),
  dislikeCount: z.number().default(0),
  favoriteCount: z.number().default(0)
}).transform(data => ({
  ...data,
  
  getTotalEngagement: () => 
    data.likeCount + data.dislikeCount + data.favoriteCount,
  
  getLikeRatio: () => {
    const total = data.likeCount + data.dislikeCount;
    return total > 0 ? (data.likeCount / total) * 100 : 0;
  },
  
  isPopular: () => 
    data.viewCount > 1000 || data.likeCount > 50,
  
  getPopularityScore: () => {
    // 人気度スコアの計算ロジック
    const viewScore = Math.log10(data.viewCount + 1);
    const engagementScore = (data.likeCount * 2 + data.favoriteCount * 3) / 100;
    return viewScore + engagementScore;
  }
}));
```

## Part 5: 実装ロードマップ

### Phase 1: 準備（1週間）
1. **ドキュメント作成**
   - 詳細設計書の作成
   - APIドキュメントの準備
   - マイグレーションガイド作成

2. **開発環境整備**
   - 新しいディレクトリ構造の作成
   - テスト環境の準備
   - CI/CDパイプラインの更新

### Phase 2: Video Entity実装（2週間）
1. **Week 1: Value Objects実装**
   - VideoMetadata実装とテスト
   - Channel実装とテスト
   - VideoStatistics実装とテスト
   - VideoContent実装とテスト

2. **Week 2: 統合とマイグレーション**
   - VideoMapperの実装
   - 既存コードの更新
   - E2Eテストの実施
   - パフォーマンステスト

### Phase 3: AudioButton Entity実装（2週間）
1. **Week 1: Value Objects実装**
   - AudioReference実装とテスト
   - AudioContent実装とテスト
   - ButtonStatistics実装とテスト

2. **Week 2: 統合とマイグレーション**
   - AudioButtonMapperの実装
   - 既存コードの更新
   - 音声ボタンシステムの統合テスト

### Phase 4: 命名規則簡潔化（1週間）
1. **エイリアス導入**
2. **段階的置換**
3. **ドキュメント更新**

### Phase 5: デプロイと監視（1週間）
1. **段階的デプロイ**
   - ステージング環境でのテスト
   - カナリアデプロイ
   - 本番環境への展開

2. **監視とフォローアップ**
   - パフォーマンスメトリクス監視
   - エラー率の確認
   - ユーザーフィードバック収集

## 成功基準

### 技術的成功基準
- [ ] 全テストケースの合格（カバレッジ90%以上）
- [ ] TypeScript strict modeでのエラー0
- [ ] パフォーマンス劣化なし（レスポンスタイム±10%以内）
- [ ] メモリ使用量の増加なし

### ビジネス成功基準
- [ ] 既存機能の完全互換性維持
- [ ] エラー率0.1%未満
- [ ] ユーザー体験の向上
- [ ] 開発効率の向上（新機能追加時間20%削減）

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| データ不整合 | 高 | 包括的なマイグレーションテスト |
| パフォーマンス劣化 | 中 | 段階的デプロイとモニタリング |
| 型定義の破壊的変更 | 高 | 後方互換性の維持 |
| 開発期間の遅延 | 中 | バッファ期間の確保 |

## 期待される効果

### 短期的効果（3ヶ月）
1. **コード品質の向上**
   - 型安全性の強化
   - ビジネスロジックの明確化
   - テストの書きやすさ向上

2. **開発効率の向上**
   - 新機能追加の容易化
   - バグの早期発見
   - コードレビューの効率化

### 長期的効果（6ヶ月〜1年）
1. **保守性の向上**
   - 技術的負債の削減
   - ドキュメントの自動生成
   - 新規開発者のオンボーディング改善

2. **拡張性の向上**
   - 新しいエンティティの追加が容易
   - ビジネスルールの変更に柔軟対応
   - マイクロサービス化への準備

---

**作成日**: 2025年7月24日  
**バージョン**: 1.0  
**ステータス**: 計画段階