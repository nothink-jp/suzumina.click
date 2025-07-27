# ドメインモデル設計書

**最終更新**: 2025-07-26  
**バージョン**: 2.0 (Entity V2統合完了)

## 概要

suzumina.clickプロジェクトのドメイン駆動設計（DDD）に基づくドメインモデルの詳細な設計書です。エンティティ、値オブジェクト、およびそれらの関係性について記述します。

## 更新履歴

- 2025-07-26: Entity V2統合完了、V2サフィックス削除
- 2025-07-15: VideoおよびAudioButtonエンティティのEntity/Value Objectアーキテクチャ採用
- 2025-07-01: 初版作成

## ドメインモデル全体図

```mermaid
graph TB
    %% エンティティ
    Work[Work<br/>作品エンティティ]
    User[User<br/>ユーザーエンティティ]
    AudioButton[AudioButton<br/>音声ボタンエンティティ]
    Video[Video<br/>動画エンティティ]
    
    %% 値オブジェクト
    Price[Price<br/>価格値オブジェクト]
    Rating[Rating<br/>評価値オブジェクト]
    DateRange[DateRange<br/>日付範囲値オブジェクト]
    CreatorType[CreatorType<br/>クリエイタータイプ値オブジェクト]
    WorkCategory[WorkCategory<br/>作品カテゴリ値オブジェクト]
    
    %% 関係性
    Work --> Price
    Work --> Rating
    Work --> DateRange
    Work --> CreatorType
    Work --> WorkCategory
    
    AudioButton --> Video
    AudioButton -.->|sourceVideoId| Video
    
    User --> Work
    User --> AudioButton
    
    style Work fill:#f9f,stroke:#333,stroke-width:4px
    style User fill:#f9f,stroke:#333,stroke-width:4px
    style AudioButton fill:#f9f,stroke:#333,stroke-width:4px
    style Video fill:#f9f,stroke:#333,stroke-width:4px
    
    style Price fill:#bbf,stroke:#333,stroke-width:2px
    style Rating fill:#bbf,stroke:#333,stroke-width:2px
    style DateRange fill:#bbf,stroke:#333,stroke-width:2px
    style CreatorType fill:#bbf,stroke:#333,stroke-width:2px
    style WorkCategory fill:#bbf,stroke:#333,stroke-width:2px
```

## エンティティ（Entities）

### 1. Work（作品）

作品は本システムの中核となるエンティティです。

```mermaid
classDiagram
    class Work {
        +string id
        +string title
        +string circleId
        +string circleName
        +Price price
        +Rating rating
        +FileInfo[] fileInfo
        +string[] categories
        +DateRange dateRange
        +hasCategory(category) boolean
        +isAdult() boolean
        +getMainFileType() string
    }
    
    Work --> Price
    Work --> Rating
    Work --> FileInfo
    Work --> DateRange
```

**責務:**
- DLsite作品の基本情報を保持
- 作品の分類判定（カテゴリ、成人向けなど）
- ファイル情報の管理

### 2. AudioButton（音声ボタン）

YouTube動画の特定タイムスタンプを参照する音声ボタンエンティティです。Entity/Value Objectアーキテクチャに基づく実装です。

**注意**: AudioButtonはDLsite作品（Work）を直接参照しません。YouTube動画のIDとタイムスタンプのみを保持します。

```mermaid
classDiagram
    class AudioButton {
        +AudioButtonId id
        +AudioContent content
        +AudioReference reference
        +ButtonStatistics statistics
        +AudioButtonCreatorInfo createdBy
        +boolean isPublic
        +Date createdAt
        +Date updatedAt
        +number favoriteCount
        +updateContent(content) AudioButton
        +updateVisibility(isPublic) AudioButton
        +recordPlay() AudioButton
        +recordLike() AudioButton
        +recordDislike() AudioButton
        +incrementFavorite() AudioButton
        +decrementFavorite() AudioButton
        +isPopular() boolean
        +getEngagementRate() number
        +getPopularityScore() number
        +getEngagementRatePercentage() number
        +belongsTo(creatorId) boolean
        +getSearchableText() string
        +toLegacy() LegacyAudioButtonData
        +static fromLegacy(data) AudioButton
    }
    
    class AudioContent {
        +ButtonText text
        +ButtonCategory category
        +ButtonTags tags
        +getSearchableText() string
        +extractCategory() ButtonCategory
    }
    
    class AudioReference {
        +AudioVideoId videoId
        +AudioVideoTitle videoTitle
        +Timestamp startTimestamp
        +Timestamp endTimestamp
        +getDuration() number
        +getYouTubeUrl() string
        +getYouTubeEmbedUrl() string
        +toPlainObject() object
    }
    
    class ButtonStatistics {
        +ButtonViewCount viewCount
        +ButtonLikeCount likeCount
        +ButtonDislikeCount dislikeCount
        +Date lastUsedAt
        +incrementView() ButtonStatistics
        +addLike() ButtonStatistics
        +addDislike() ButtonStatistics
        +removeLike() ButtonStatistics
        +removeDislike() ButtonStatistics
        +isPopular() boolean
        +getEngagementRate() number
    }
    
    AudioButton --> AudioContent
    AudioButton --> AudioReference
    AudioButton --> ButtonStatistics
```

**責務:**
- YouTube動画の特定位置への参照管理（値オブジェクトによる構造化）
- 再生用URLの生成と埋め込みURL生成
- 統計情報の管理とエンゲージメント分析
- お気に入り機能のサポート
- ビジネスロジック（人気度スコア、エンゲージメント率）の計算
- レガシー形式との相互変換

**関係性:**
- AudioButton → Video: sourceVideoIdを通じてYouTube動画を参照
- AudioButton ↛ Work: DLsite作品との直接的な関連付けはなし

### 3. Video（動画）

YouTube動画情報を管理するエンティティです。Entity/Value Objectアーキテクチャに基づく実装です。

**注意**: VideoエンティティはDLsite作品（Work）を直接参照しません。YouTube APIから取得した動画メタデータのみを保持します。

```mermaid
classDiagram
    class Video {
        +VideoContent content
        +VideoMetadata metadata
        +Channel channel
        +VideoStatistics statistics
        +Tags tags
        +AudioButtonInfo audioButtonInfo
        +LiveStreamingDetails liveStreamingDetails
        +toPlainObject() object
        +toLegacyFormat() LegacyVideoData
        +static fromLegacyFormat() Video
    }
    
    class VideoContent {
        +VideoId id
        +PublishedAt publishedAt
        +PrivacyStatus privacyStatus
        +UploadStatus uploadStatus
        +ContentDetails contentDetails
        +string embedHtml
        +string[] tags
    }
    
    class VideoMetadata {
        +VideoTitle title
        +VideoDescription description
        +VideoDuration duration
        +string dimension
        +string definition
        +boolean hasCaption
        +boolean isLicensedContent
    }
    
    class VideoStatistics {
        +ViewCount viewCount
        +LikeCount likeCount
        +DislikeCount dislikeCount
        +number favoriteCount
        +CommentCount commentCount
        +getTotalInteractions() number
        +getLikePercentage() number
        +getEngagementMetrics() object
    }
    
    Video --> VideoContent
    Video --> VideoMetadata
    Video --> Channel
    Video --> VideoStatistics
```

**責務:**
- YouTube動画メタデータの保持（値オブジェクトによる構造化）
- 統計情報の計算とエンゲージメント分析
- レガシー形式との相互変換
- チャンネル情報の管理

**関係性:**
- Video ↛ Work: DLsite作品との直接的な関連付けはなし
- Video ← AudioButton: 複数のAudioButtonから参照される可能性あり

### 4. User（ユーザー）

認証されたユーザーを表すエンティティです。

```mermaid
classDiagram
    class User {
        +string id
        +string email
        +string name
        +string image
        +UserRole role
        +Date createdAt
        +Date updatedAt
        +isAdmin() boolean
        +canEvaluateWorks() boolean
    }
    
    User --> UserRole
```

**責務:**
- ユーザー認証情報の管理
- 権限判定
- プロフィール情報の保持

## 値オブジェクト（Value Objects）

### 1. Price（価格）

作品の価格情報を表す値オブジェクトです。

```mermaid
classDiagram
    class Price {
        +number current
        +string currency
        +number original
        +number discount
        +number point
        +hasDiscount() boolean
        +isExpensive() boolean
        +formatWithCurrency() string
        +equals(other) boolean
    }
```

**特性:**
- 不変性（Immutable）
- 通貨を含む価格の完全な表現
- ビジネスロジックのカプセル化

### 2. Rating（評価）

作品の評価情報を表す値オブジェクトです。

```mermaid
classDiagram
    class Rating {
        +number stars
        +number count
        +number average
        +isEmpty() boolean
        +getStarRating() number
        +formatAverage() string
        +equals(other) boolean
    }
```

**特性:**
- 評価の統計情報を一元管理
- 星評価への変換ロジック
- 表示用フォーマット機能

### 3. DateRange（日付範囲）

作品の販売期間を表す値オブジェクトです。

```mermaid
classDiagram
    class DateRange {
        +Date releaseDate
        +Date registeredDate
        +Date modifiedDate
        +getAge() number
        +isNew() boolean
        +formatRelease() string
        +parseDate(raw) Date
    }
```

**特性:**
- 複数の日付を統合管理
- 日付解析ロジックの集約
- 経過期間の計算

### 4. CreatorType（クリエイタータイプ）

クリエイターの種別を表す値オブジェクトです。

```mermaid
classDiagram
    class CreatorType {
        +string type
        +string displayName
        +isCircle() boolean
        +isBrand() boolean
        +isCreator() boolean
        +getIcon() string
    }
```

**特性:**
- クリエイター種別の厳密な定義
- 表示用情報の提供
- 種別判定メソッド

## ユーティリティ関数

ドメインオブジェクト全体で使用される共通のユーティリティ関数です。

### 日付解析ユーティリティ

```typescript
// packages/shared-types/src/utils/date-parser.ts

// 文字列を安全にDate型に変換
parseDate(dateString: string | null | undefined): Date | undefined

// 有効な日付文字列かを判定
isValidDateString(dateString: string): boolean
```

### 数値解析ユーティリティ

```typescript
// packages/shared-types/src/utils/number-parser.ts

// 文字列を安全に数値に変換（NaNの場合はundefined）
safeParseNumber(value: string | null | undefined): number | undefined

// 比率を計算（分母が0以下の場合は0を返す）
calculateRatio(numerator: number, denominator: number): number

// パーセンテージ表示文字列を生成
formatPercentage(numerator: number, denominator: number, decimals = 1): string
```

**特性:**
- 安全な型変換（エラーを投げずにundefinedを返す）
- 境界値の適切な処理（0除算、負の値など）
- 一貫性のある数値フォーマット

## Entity/Value Objectアーキテクチャ実装状況

### 完全実装済み
- ✅ **Work Entity** - DLsite作品エンティティ
  - WorkId, WorkTitle, WorkPrice, WorkRating, WorkCreators等の値オブジェクト
  - Plain Object変換パターン実装済み
  - Firestore形式との相互変換サポート
  - ビジネスロジック（カテゴリ判定、新作判定、人気度判定）実装済み
- ✅ **Video Entity** - YouTube動画エンティティ
  - VideoContent, VideoMetadata, VideoStatistics, Channel等の値オブジェクト
  - Plain Object変換パターン実装済み
  - レガシー形式との相互変換サポート
- ✅ **AudioButton Entity** - 音声ボタンエンティティ
  - AudioContent, AudioReference, ButtonStatistics等の値オブジェクト
  - ビジネスロジック（人気度、エンゲージメント率）実装済み
  - Plain Object変換パターン実装済み

### 未実装（今後の計画）
- ⏳ **User Entity** - ユーザーエンティティ
  - 現在は簡易実装のみ
  - UserRole値オブジェクトの実装が必要
- ⏳ **Evaluation Entity** - 評価エンティティ
  - 作品評価システム用
  - Top10Ranking, StarRating, NgEvaluation等の値オブジェクトが必要
- ⏳ **PriceHistory Entity** - 価格履歴エンティティ
  - 価格推移追跡用
  - PriceSnapshot値オブジェクトの実装が必要

## 実装ガイドライン

新しいエンティティを実装する際は、以下のドキュメントを参照してください：
- `/docs/ENTITY_IMPLEMENTATION_GUIDELINES.md` - 実装ガイドライン
- `/docs/ENTITY_SERIALIZATION_PATTERN.md` - Server Component連携パターン

## ドメインサービス

### WorkAggregator

複数の作品を集計・分析するドメインサービスです。

```mermaid
classDiagram
    class WorkAggregator {
        +aggregateByCategory(works) Map
        +calculatePriceStatistics(works) PriceStats
        +findTopRatedWorks(works, limit) Work[]
        +groupByCircle(works) Map
    }
    
    WorkAggregator ..> Work
```

### PriceCalculator

価格計算に関するビジネスロジックを提供するドメインサービスです。

```mermaid
classDiagram
    class PriceCalculator {
        +calculateDiscountRate(price) number
        +convertCurrency(price, targetCurrency) Price
        +calculateTotalWithTax(prices) number
        +comparePrice(price1, price2) number
    }
    
    PriceCalculator ..> Price
```

## 集約（Aggregate）

### Work集約

作品を中心とした集約です。

```mermaid
graph TB
    subgraph "Work Aggregate"
        Work[Work<br/>集約ルート]
        Price[Price]
        Rating[Rating]
        WorkCreators[WorkCreators]
        DateRange[DateRange]
        
        Work --> Price
        Work --> Rating
        Work --> WorkCreators
        Work --> DateRange
    end
    
    style Work fill:#f96,stroke:#333,stroke-width:4px
```

**集約の境界:**
- 作品とその属性情報は一貫性を保つ必要がある
- 価格、評価、クリエイター情報は作品と共に更新される
- 作品IDを通じてのみ外部から参照可能

### User集約

ユーザーとその関連情報の集約です。

```mermaid
graph TB
    subgraph "User Aggregate"
        User[User<br/>集約ルート]
        WorkEvaluation[WorkEvaluation]
        Favorite[Favorite]
        
        User --> WorkEvaluation
        User --> Favorite
    end
    
    style User fill:#f96,stroke:#333,stroke-width:4px
```

### AudioButton集約

音声ボタンとその関連情報の集約です。

```mermaid
graph TB
    subgraph "AudioButton Aggregate"
        AudioButton[AudioButton<br/>集約ルート]
        AudioContent[AudioContent]
        AudioReference[AudioReference]
        ButtonStatistics[ButtonStatistics]
        
        AudioButton --> AudioContent
        AudioButton --> AudioReference
        AudioButton --> ButtonStatistics
    end
    
    style AudioButton fill:#f96,stroke:#333,stroke-width:4px
```

**集約の境界:**
- 音声ボタンとその属性情報は一貫性を保つ必要がある
- コンテンツ、参照情報、統計情報は音声ボタンと共に更新される
- YouTube動画IDを通じて動画を参照するが、Video集約とは独立

### Video集約

YouTube動画とその関連情報の集約です。

```mermaid
graph TB
    subgraph "Video Aggregate"
        Video[Video<br/>集約ルート]
        VideoContent[VideoContent]
        VideoMetadata[VideoMetadata]
        VideoStatistics[VideoStatistics]
        Channel[Channel]
        
        Video --> VideoContent
        Video --> VideoMetadata
        Video --> VideoStatistics
        Video --> Channel
    end
    
    style Video fill:#f96,stroke:#333,stroke-width:4px
```

**集約の境界:**
- 動画とその属性情報は一貫性を保つ必要がある
- メタデータ、統計情報、チャンネル情報は動画と共に更新される
- 動画IDを通じてのみ外部から参照可能

## リポジトリインターフェース

```typescript
// Work集約のリポジトリ
interface WorkRepository {
  findById(id: string): Promise<Work | null>
  findByIds(ids: string[]): Promise<Work[]>
  findByCircle(circleId: string): Promise<Work[]>
  save(work: Work): Promise<void>
  saveMany(works: Work[]): Promise<void>
}

// User集約のリポジトリ
interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  save(user: User): Promise<void>
}

// Video集約のリポジトリ
interface VideoRepository {
  findById(id: string): Promise<Video | null>
  findByIds(ids: string[]): Promise<Video[]>
  findByChannelId(channelId: string): Promise<Video[]>
  save(video: Video): Promise<void>
  saveMany(videos: Video[]): Promise<void>
}
```

## インフラストラクチャ層マッパー

### Video Mapper

YouTube API レスポンスをVideo Entityに変換するマッパーです。

```typescript
// apps/functions/src/services/mappers/video-mapper.ts

// YouTube API → Video Entity
mapYouTubeToVideoEntity(
  youtubeVideo: youtube_v3.Schema$Video,
  playlistTags?: string[],
  userTags?: string[]
): Video | null

// 複数動画の一括マッピング
mapYouTubeVideosToEntities(
  youtubeVideos: youtube_v3.Schema$Video[],
  playlistTagsMap?: Map<string, string[]>,
  userTagsMap?: Map<string, string[]>
): Video[]

// エラー詳細付きマッピング
mapYouTubeVideosWithErrors(
  youtubeVideos: youtube_v3.Schema$Video[],
  playlistTagsMap?: Map<string, string[]>,
  userTagsMap?: Map<string, string[]>
): BatchMappingResult

// レガシー形式との相互変換
mapVideoEntityToLegacy(video: Video): LegacyVideoData
mapLegacyToVideoEntity(legacyData: LegacyVideoData): Video
```

**特性:**
- 外部API形式からドメインモデルへの変換
- エラーハンドリングと詳細なロギング
- レガシーシステムとの互換性維持

### AudioButton Mapper

Firestore形式のデータをAudioButton Entityに変換するマッパーです。

```typescript
// apps/functions/src/services/mappers/audio-button-mapper.ts

// Firestore → AudioButton Entity
mapFirestoreToAudioButton(
  data: FirestoreAudioButtonData
): AudioButton

// 複数ボタンの一括マッピング
mapFirestoreToAudioButtons(
  documents: FirestoreAudioButtonData[]
): AudioButton[]

// AudioButton Entity → Firestore
mapAudioButtonToFirestore(
  audioButton: AudioButton
): FirestoreAudioButtonData

// エラー詳細付きマッピング
mapFirestoreToAudioButtonsWithErrors(
  documents: FirestoreAudioButtonData[]
): BatchMappingResult<AudioButton>

// レガシー形式との相互変換
mapLegacyToAudioButton(
  legacyData: LegacyAudioButtonData
): AudioButton

mapAudioButtonToLegacy(
  audioButton: AudioButton
): LegacyAudioButtonData
```

**特性:**
- Firestoreデータ形式からドメインモデルへの変換
- YouTube参照情報の検証
- 統計情報の正規化
- レガシーシステムとの互換性維持

## ドメインイベント

```mermaid
sequenceDiagram
    participant User
    participant WorkEvaluationService
    participant Work
    participant EventBus
    
    User->>WorkEvaluationService: 作品を評価
    WorkEvaluationService->>Work: 評価を更新
    WorkEvaluationService->>EventBus: WorkEvaluatedEvent発行
    EventBus-->>Analytics: イベント記録
    EventBus-->>Cache: キャッシュ更新
```

## 設計原則

### 1. 不変性（Immutability）
- すべての値オブジェクトは不変
- 変更が必要な場合は新しいインスタンスを作成

### 2. カプセル化
- ビジネスロジックは適切なドメインオブジェクトに配置
- データと振る舞いを一体化

### 3. 明示的な境界
- 集約の境界を明確に定義
- 集約間は識別子による参照のみ

### 4. ユビキタス言語
- ドメインエキスパートと同じ言語を使用
- コード内の名前はビジネス用語と一致

## 実装の配置

```
packages/shared-types/src/
├── entities/              # エンティティ定義
│   ├── work.ts           # WorkDocument型定義
│   ├── work-entity.ts    # Workエンティティクラス
│   ├── audio-button.ts   # AudioButtonエンティティクラス
│   ├── video.ts          # Videoエンティティクラス
│   └── user.ts           # ユーザー型定義
├── value-objects/         # 値オブジェクト定義
│   ├── work/
│   │   ├── work-id.ts
│   │   ├── work-title.ts
│   │   ├── work-price.ts
│   │   ├── work-rating.ts
│   │   ├── work-creators.ts
│   │   └── circle.ts
│   ├── audio-button/
│   │   ├── audio-content.ts
│   │   ├── audio-reference.ts
│   │   └── button-statistics.ts
│   └── video/
│       ├── video-content.ts
│       ├── video-metadata.ts
│       ├── video-statistics.ts
│       └── channel.ts
├── plain-objects/         # Plain Object定義
│   ├── work-plain.ts
│   ├── audio-button-plain.ts
│   └── video-plain.ts
└── domain-services/       # ドメインサービス（将来実装）
    ├── work-aggregator.ts
    └── price-calculator.ts
```

---

**最終更新**: 2025年7月27日  
**バージョン**: 2.0

## 変更履歴

### バージョン 2.0 (2025-07-27)
- Work, AudioButton, Video の実際の関係性を正確に反映
- AudioButton → Work および Video → Work の誤った関連を削除
- AudioButton → Video の正しい関係性を追加
- Work Entityの完全実装を反映
- 集約境界の詳細な定義を追加
- ファイル構造を実際の実装に合わせて更新