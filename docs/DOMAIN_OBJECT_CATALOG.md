# ドメインオブジェクトカタログ

## 概要

suzumina.clickで使用されているすべてのドメインオブジェクトの詳細な仕様とコード例を記載したカタログです。

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
YouTube動画の特定のタイムスタンプを参照し、音声クリップとして機能するエンティティ。

#### プロパティ

| プロパティ | 型 | 説明 | 必須 |
|----------|---|------|-----|
| id | string | ボタンID | ✓ |
| videoId | string | YouTube動画ID | ✓ |
| videoTitle | string | 動画タイトル | ✓ |
| timestamp | number | 開始時刻（秒） | ✓ |
| endTimestamp | number | 終了時刻（秒） | |
| text | string | ボタンテキスト | ✓ |
| category | string | カテゴリ | |
| dlsiteWorkId | string | 関連作品ID | |
| tags | string[] | タグ一覧 | |
| createdAt | Date | 作成日時 | ✓ |
| updatedAt | Date | 更新日時 | ✓ |

#### メソッド

```typescript
// YouTube URL生成
getYouTubeUrl(): string

// 埋め込みURL生成
getEmbedUrl(): string

// タイムスタンプフォーマット
formatTimestamp(): string

// 再生時間取得
getDuration(): number
```

### Video（動画）エンティティ

#### 概要
YouTube動画の情報を管理するエンティティ。

#### プロパティ

| プロパティ | 型 | 説明 | 必須 |
|----------|---|------|-----|
| id | string | YouTube動画ID | ✓ |
| title | string | 動画タイトル | ✓ |
| description | string | 説明文 | |
| channelId | string | チャンネルID | ✓ |
| channelTitle | string | チャンネル名 | ✓ |
| publishedAt | Date | 公開日時 | ✓ |
| duration | string | 動画時間 | |
| viewCount | number | 視聴回数 | |
| likeCount | number | 高評価数 | |
| type | VideoType | 動画種別 | ✓ |
| workIds | string[] | 関連作品ID | |
| tags | string[] | タグ | |

#### VideoType列挙型

```typescript
enum VideoType {
  REGULAR = "regular",        // 通常動画
  LIVESTREAM = "livestream",  // ライブ配信
  SHORT = "short",           // ショート動画
  PREMIERE = "premiere"      // プレミア公開
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

**最終更新**: 2025年7月24日  
**バージョン**: 1.0