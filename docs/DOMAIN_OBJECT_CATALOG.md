# ドメインオブジェクトカタログ

**最終更新**: 2025-07-26  
**バージョン**: 2.0 (Entity V2統合完了)

## 概要

suzumina.clickで使用されているすべてのドメインオブジェクトの詳細な仕様とコード例を記載したカタログです。

## 実装状況

### 完全実装済み（Entity/Value Objectアーキテクチャ）
- ✅ **Video Entity** および関連値オブジェクト
- ✅ **AudioButton Entity** および関連値オブジェクト

### 部分実装済み（値オブジェクトのみ）
- ⚠️ **Work Entity** - 値オブジェクトは実装済み、エンティティクラスは未実装
- ⚠️ **User Entity** - 簡易実装のみ

## エンティティ詳細

### Work（作品）エンティティ

#### 概要
DLsite作品を表現する中核エンティティ。作品の基本情報、価格、評価などを包含します。

#### プロパティ

| プロパティ | 型 | 説明 | 必須 |
|----------|---|------|-----|
| id | string | 作品ID（例: RJ123456） | ✓ |
| title | string | 作品タイトル | ✓ |
| titleReading | string | タイトル読み（ひらがな） | |
| circleId | string | サークルID | ✓ |
| circleName | string | サークル名 | ✓ |
| brandId | string | ブランドID | |
| brandName | string | ブランド名 | |
| price | Price | 価格情報 | ✓ |
| rating | Rating | 評価情報 | ✓ |
| categories | string[] | カテゴリ一覧 | ✓ |
| voiceActors | string[] | 声優一覧 | |
| illustrators | string[] | イラストレーター一覧 | |
| writers | string[] | シナリオライター一覧 | |
| musicians | string[] | 音楽担当一覧 | |
| fileInfo | FileInfo[] | ファイル情報 | ✓ |

#### メソッド

```typescript
// カテゴリ判定
hasCategory(category: string): boolean

// 成人向け判定
isAdult(): boolean

// メインファイルタイプ取得
getMainFileType(): string

// 作品URL生成
getDLsiteUrl(): string

// サムネイルURL取得
getThumbnailUrl(size: 'small' | 'medium' | 'large'): string
```

#### 使用例

```typescript
const work: Work = {
  id: "RJ123456",
  title: "素晴らしい音声作品",
  circleId: "RG12345",
  circleName: "サンプルサークル",
  price: Price.create({
    current: 1980,
    currency: "JPY",
    original: 2200,
    discount: 10
  }),
  rating: Rating.create({
    stars: 45,
    count: 100,
    average: 4.5
  }),
  categories: ["音声作品", "ASMR", "癒し"],
  voiceActors: ["涼花みなせ"],
  fileInfo: [
    {
      type: "mp3",
      size: 150000000,
      duration: "02:30:00"
    }
  ]
};

// 使用例
if (work.isAdult()) {
  console.log("この作品は成人向けです");
}

if (work.hasCategory("ASMR")) {
  console.log("ASMR作品です");
}
```

### AudioButton（音声ボタン）エンティティ

#### 概要
YouTube動画の特定のタイムスタンプを参照し、音声クリップとして機能するエンティティ。Entity/Value Objectアーキテクチャに基づく実装。

#### 構成要素

| コンポーネント | 型 | 説明 |
|----------|---|------|
| id | AudioButtonId | ボタンの一意識別子 |
| content | AudioContent | ボタンのコンテンツ情報（テキスト、タグ等） |
| reference | AudioReference | YouTube動画への参照情報 |
| statistics | ButtonStatistics | 統計情報（再生回数、いいね等） |
| createdBy | AudioButtonCreatorInfo | 作成者情報 |
| isPublic | boolean | 公開状態 |
| createdAt | Date | 作成日時 |
| updatedAt | Date | 更新日時 |
| favoriteCount | number | お気に入り数 |

#### 主要メソッド

```typescript
// コンテンツ更新（新しいインスタンスを返す）
updateContent(content: AudioContent): AudioButton

// 公開状態更新（新しいインスタンスを返す）
updateVisibility(isPublic: boolean): AudioButton

// 統計記録メソッド（新しいインスタンスを返す）
recordPlay(): AudioButton
recordLike(): AudioButton
recordDislike(): AudioButton
incrementFavorite(): AudioButton
decrementFavorite(): AudioButton

// 分析メソッド
isPopular(): boolean
getEngagementRate(): number
getPopularityScore(): number
getEngagementRatePercentage(): number

// ユーティリティメソッド
belongsTo(creatorId: string): boolean
getSearchableText(): string
toLegacy(): LegacyAudioButtonData
static fromLegacy(data: LegacyAudioButtonData): AudioButton
```

#### AudioContent（音声コンテンツ）値オブジェクト

| プロパティ | 型 | 説明 |
|----------|---|------|
| text | ButtonText | ボタンの表示テキスト |
| category | ButtonCategory? | カテゴリ（greeting, emotion等） |
| tags | ButtonTags | タグのコレクション |

**主要メソッド:**
```typescript
// 検索用テキスト生成
getSearchableText(): string

// カテゴリ自動推論
extractCategory(): ButtonCategory | undefined
```

#### AudioReference（音声参照）値オブジェクト

| プロパティ | 型 | 説明 |
|----------|---|------|
| videoId | AudioVideoId | YouTube動画ID |
| videoTitle | AudioVideoTitle | 動画タイトル |
| startTimestamp | Timestamp | 開始時刻 |
| endTimestamp | Timestamp? | 終了時刻（オプション） |

**主要メソッド:**
```typescript
// 再生時間（秒）取得
getDuration(): number

// YouTube URL生成
getYouTubeUrl(): string

// 埋め込みURL生成
getYouTubeEmbedUrl(): string

// プレーンオブジェクトへの変換
toPlainObject(): {
  videoId: string
  videoTitle: string
  timestamp: number
  endTimestamp?: number
}
```

#### ButtonStatistics（ボタン統計）値オブジェクト

| プロパティ | 型 | 説明 |
|----------|---|------|
| viewCount | ButtonViewCount | 再生回数 |
| likeCount | ButtonLikeCount | いいね数 |
| dislikeCount | ButtonDislikeCount | 低評価数 |
| lastUsedAt | Date? | 最終使用日時 |

**統計メソッド:**
```typescript
// 統計更新（新しいインスタンスを返す）
incrementView(): ButtonStatistics
addLike(): ButtonStatistics
addDislike(): ButtonStatistics
removeLike(): ButtonStatistics
removeDislike(): ButtonStatistics

// 分析メソッド
isPopular(): boolean  // 再生回数100以上
getEngagementRate(): number  // (いいね + 低評価) / 再生回数
```

### Video（動画）エンティティ

#### 概要
YouTube動画の情報を管理するエンティティ。Entity/Value Objectアーキテクチャに基づく実装。

#### 構成要素

| コンポーネント | 型 | 説明 |
|----------|---|------|
| content | VideoContent | 動画の基本コンテンツ情報 |
| metadata | VideoMetadata | 動画のメタデータ |
| channel | Channel | チャンネル情報 |
| statistics | VideoStatistics? | 統計情報 |
| tags | Tags | タグ情報（プレイリスト、ユーザー、コンテンツ） |
| audioButtonInfo | AudioButtonInfo | 音声ボタン関連情報 |
| liveStreamingDetails | LiveStreamingDetails? | ライブ配信詳細 |

#### 主要メソッド

```typescript
// プレーンオブジェクトへの変換
toPlainObject(): object

// レガシー形式への変換
toLegacyFormat(): LegacyVideoData

// レガシー形式からの生成
static fromLegacyFormat(data: LegacyVideoData): Video
```

#### VideoContent（動画コンテンツ）値オブジェクト

| プロパティ | 型 | 説明 |
|----------|---|------|
| id | VideoId | YouTube動画ID |
| publishedAt | PublishedAt | 公開日時 |
| privacyStatus | PrivacyStatus | プライバシー設定（public/private/unlisted） |
| uploadStatus | UploadStatus | アップロード状態 |
| contentDetails | ContentDetails? | コンテンツ詳細 |
| embedHtml | string? | 埋め込みHTML |
| tags | string[]? | タグリスト |

#### VideoMetadata（動画メタデータ）値オブジェクト

| プロパティ | 型 | 説明 |
|----------|---|------|
| title | VideoTitle | 動画タイトル |
| description | VideoDescription | 動画説明 |
| duration | VideoDuration? | 動画時間（ISO 8601形式） |
| dimension | string? | 動画の次元（2d/3d） |
| definition | string? | 解像度（hd/sd） |
| hasCaption | boolean? | 字幕の有無 |
| isLicensedContent | boolean? | ライセンスコンテンツかどうか |

#### VideoStatistics（動画統計）値オブジェクト

| プロパティ | 型 | 説明 |
|----------|---|------|
| viewCount | ViewCount | 視聴回数 |
| likeCount | LikeCount? | 高評価数 |
| dislikeCount | DislikeCount? | 低評価数 |
| favoriteCount | number? | お気に入り数 |
| commentCount | CommentCount? | コメント数 |

**統計メソッド:**
```typescript
// 総インタラクション数（高評価＋低評価）
getTotalInteractions(): number

// 高評価率
getLikePercentage(): number

// エンゲージメント指標
getEngagementMetrics(): {
  viewCount: number
  likeRatio: number
  commentRatio: number
  engagementRate: number
}
```

## 値オブジェクト詳細

### Price（価格）値オブジェクト

#### 概要
価格情報を表現する不変の値オブジェクト。通貨、割引、ポイントなどを含みます。

#### 構造

```typescript
interface PriceInfo {
  current: number;      // 現在価格
  currency: string;     // 通貨コード（JPY, USD等）
  original?: number;    // 定価
  discount?: number;    // 割引率（%）
  point?: number;       // 付与ポイント
}
```

#### ファクトリメソッド

```typescript
const Price = {
  create: (data: PriceInfo) => ({
    ...data,
    
    // 割引判定
    hasDiscount: () => 
      data.discount !== undefined && data.discount > 0,
    
    // 高額商品判定
    isExpensive: () => 
      data.current > 2000,
    
    // 通貨付きフォーマット
    formatWithCurrency: () => 
      `${data.currency} ${data.current.toLocaleString()}`,
    
    // 割引額計算
    getDiscountAmount: () => 
      data.original ? data.original - data.current : 0,
    
    // 等価性判定
    equals: (other: unknown): boolean => {
      if (!isPriceType(other)) return false;
      return data.current === other.current && 
             data.currency === other.currency;
    }
  })
};
```

#### 使用例

```typescript
const price = Price.create({
  current: 1980,
  currency: "JPY",
  original: 2200,
  discount: 10,
  point: 198
});

console.log(price.formatWithCurrency()); // "JPY 1,980"
console.log(price.hasDiscount());        // true
console.log(price.getDiscountAmount());  // 220
```

### Rating（評価）値オブジェクト

#### 概要
作品の評価情報を表現する値オブジェクト。

#### 構造

```typescript
interface RatingInfo {
  stars: number;    // 星の総数（0-50スケール）
  count: number;    // 評価数
  average: number;  // 平均評価
}
```

#### メソッド

```typescript
const Rating = {
  create: (data: RatingInfo) => ({
    ...data,
    
    // 評価が空か判定
    isEmpty: () => data.count === 0,
    
    // 5段階評価に変換
    getStarRating: () => data.stars / 10,
    
    // 平均評価フォーマット
    formatAverage: () => data.average.toFixed(2),
    
    // 評価レベル取得
    getLevel: (): 'excellent' | 'good' | 'average' | 'poor' => {
      const rating = data.stars / 10;
      if (rating >= 4.5) return 'excellent';
      if (rating >= 3.5) return 'good';
      if (rating >= 2.5) return 'average';
      return 'poor';
    }
  })
};
```

### DateRange（日付範囲）値オブジェクト

#### 概要
作品の各種日付を統合管理する値オブジェクト。

#### 構造

```typescript
interface DateRangeInfo {
  releaseDate: Date;      // 発売日
  registeredDate: Date;   // 登録日
  modifiedDate: Date;     // 更新日
}
```

#### メソッド

```typescript
const DateRange = {
  create: (data: DateRangeInfo) => ({
    ...data,
    
    // 経過日数取得
    getAge: () => {
      const days = Math.floor(
        (Date.now() - data.releaseDate.getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      return days;
    },
    
    // 新作判定（30日以内）
    isNew: () => {
      const days = DateRange.create(data).getAge();
      return days <= 30;
    },
    
    // 発売日フォーマット
    formatRelease: () => {
      return DateFormatter.formatDate(data.releaseDate);
    },
    
    // 日付パース
    parseDate: (raw: string) => {
      // 複数の日付形式に対応
      // "2024年1月1日", "2024-01-01", "2024/01/01"
    }
  })
};
```

### CreatorType（クリエイタータイプ）値オブジェクト

#### 概要
クリエイターの種別を表現する値オブジェクト。

#### 定義

```typescript
type CreatorTypeValue = 'circle' | 'brand' | 'creator';

interface CreatorTypeInfo {
  type: CreatorTypeValue;
  displayName: string;
}
```

#### メソッド

```typescript
const CreatorType = {
  CIRCLE: { type: 'circle', displayName: 'サークル' },
  BRAND: { type: 'brand', displayName: 'ブランド' },
  CREATOR: { type: 'creator', displayName: 'クリエイター' },
  
  create: (type: CreatorTypeValue) => {
    const mapping = {
      circle: CreatorType.CIRCLE,
      brand: CreatorType.BRAND,
      creator: CreatorType.CREATOR
    };
    
    return {
      ...mapping[type],
      
      isCircle: () => type === 'circle',
      isBrand: () => type === 'brand',
      isCreator: () => type === 'creator',
      
      getIcon: () => {
        const icons = {
          circle: '🎪',
          brand: '🏢',
          creator: '👤'
        };
        return icons[type];
      }
    };
  }
};
```

## ユーティリティ関数

### 日付解析ユーティリティ

#### parseDate
日付文字列を安全にDate型に変換します。

```typescript
// packages/shared-types/src/utils/date-parser.ts
function parseDate(dateString: string | null | undefined): Date | undefined
```

**使用例:**
```typescript
parseDate("2024-01-01T00:00:00Z")  // new Date("2024-01-01T00:00:00Z")
parseDate("invalid-date")           // undefined
parseDate(null)                     // undefined
parseDate("")                       // undefined
```

#### isValidDateString
有効な日付文字列かを判定します。

```typescript
function isValidDateString(dateString: string): boolean
```

### 数値解析ユーティリティ

#### safeParseNumber
文字列を安全に数値に変換します。

```typescript
// packages/shared-types/src/utils/number-parser.ts
function safeParseNumber(value: string | null | undefined): number | undefined
```

**使用例:**
```typescript
safeParseNumber("123")        // 123
safeParseNumber("123.45")     // 123.45
safeParseNumber("invalid")    // undefined
safeParseNumber(null)         // undefined
```

#### calculateRatio
比率を計算します。分母が0以下の場合は0を返します。

```typescript
function calculateRatio(numerator: number, denominator: number): number
```

**使用例:**
```typescript
calculateRatio(50, 100)    // 0.5
calculateRatio(50, 0)      // 0
calculateRatio(50, -100)   // 0
```

#### formatPercentage
パーセンテージ表示文字列を生成します。

```typescript
function formatPercentage(
  numerator: number, 
  denominator: number, 
  decimals = 1
): string
```

**使用例:**
```typescript
formatPercentage(50, 100)       // "50.0%"
formatPercentage(33.333, 100, 2) // "33.33%"
formatPercentage(50, 0)         // "0.0%"
```

## 実装パターンとガイドライン

新しいエンティティや値オブジェクトを実装する際は、以下のドキュメントを参照してください：

- **実装ガイドライン**: `/docs/ENTITY_IMPLEMENTATION_GUIDELINES.md`
  - プライベートコンストラクタとファクトリメソッドパターン
  - イミュータブル設計
  - Plain Object変換パターン
  - テスト戦略

- **Server Component連携**: `/docs/ENTITY_SERIALIZATION_PATTERN.md`
  - _computedプロパティパターン
  - Server ComponentとClient Component間のデータ受け渡し

## ユーティリティ型

### FileInfo（ファイル情報）

```typescript
interface FileInfo {
  type: string;      // ファイルタイプ（mp3, wav等）
  size: number;      // ファイルサイズ（バイト）
  duration?: string; // 再生時間
  bitrate?: number;  // ビットレート
}
```

### WorkEvaluation（作品評価）

```typescript
interface WorkEvaluation {
  userId: string;
  workId: string;
  type: 'top10' | 'star' | 'ng';
  value?: number;  // top10の順位、star評価値
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## バリデーション関数

### 作品ID検証

```typescript
function isValidWorkId(id: string): boolean {
  return /^RJ\d{6,8}$/.test(id);
}
```

### サークルID検証

```typescript
function isValidCircleId(id: string): boolean {
  return /^RG\d{5,7}$/.test(id);
}
```

### YouTube動画ID検証

```typescript
function isValidYouTubeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}
```

## 型ガード関数

### Price型ガード

```typescript
function isPriceType(value: unknown): value is PriceInfo {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  return typeof obj.current === 'number' &&
         typeof obj.currency === 'string' &&
         (obj.original === undefined || typeof obj.original === 'number') &&
         (obj.discount === undefined || typeof obj.discount === 'number');
}
```

### Work型ガード

```typescript
function isWorkType(value: unknown): value is Work {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  return typeof obj.id === 'string' &&
         typeof obj.title === 'string' &&
         typeof obj.circleId === 'string' &&
         isPriceType(obj.price) &&
         Array.isArray(obj.categories);
}
```

---

**最終更新**: 2025年7月26日  
**バージョン**: 1.2