# Firestore Database Structure

suzumina.clickプロジェクトで使用されているCloud Firestoreデータベースの構造とドキュメント定義

## コレクション一覧

### 1. `videos` コレクション

**目的**: 鈴鹿みなせの関連YouTubeビデオデータを保存

**ドキュメントID**: YouTube動画ID (例: `"dQw4w9WgXcQ"`)

**データ構造** (`FirestoreServerVideoData`):

```typescript
{
  // 基本動画情報
  id?: string,
  videoId: string,                    // YouTube動画ID (必須)
  title: string,                      // 動画タイトル
  description: string,                // 動画説明
  channelId: string,                  // チャンネルID
  channelTitle: string,               // チャンネル名
  publishedAt: Timestamp,             // 動画公開日
  thumbnailUrl: string,               // サムネイルURL
  lastFetchedAt: Timestamp,           // 最終取得日時
  
  // コンテンツ分類
  videoType?: "all" | "archived" | "upcoming",
  liveBroadcastContent?: "none" | "live" | "upcoming",
  
  // 拡張動画詳細
  duration?: string,                  // ISO 8601形式 (例: "PT1H2M3S")
  dimension?: string,                 // "2d" または "3d"
  definition?: string,                // "hd" または "sd"
  caption?: boolean,                  // 字幕有無
  licensedContent?: boolean,          // ライセンスコンテンツ
  contentRating?: Record<string, string>,
  regionRestriction?: {
    allowed?: string[],               // 許可地域
    blocked?: string[]                // ブロック地域
  },
  
  // 統計情報
  statistics?: {
    viewCount?: number,               // 再生回数
    likeCount?: number,               // いいね数
    dislikeCount?: number,            // 低評価数
    favoriteCount?: number,           // お気に入り数
    commentCount?: number             // コメント数
  },
  
  // ライブ配信詳細
  liveStreamingDetails?: {
    scheduledStartTime?: Timestamp,   // 予定開始時刻
    scheduledEndTime?: Timestamp,     // 予定終了時刻
    actualStartTime?: Timestamp,      // 実際の開始時刻
    actualEndTime?: Timestamp,        // 実際の終了時刻
    concurrentViewers?: number        // 同時視聴者数
  },
  
  // 追加メタデータ
  categoryId?: string,                // カテゴリID
  tags?: string[],                    // タグ配列
  topicDetails?: {
    topicCategories?: string[]        // トピックカテゴリ
  },
  status?: {
    uploadStatus?: string,            // アップロード状況
    privacyStatus?: string,           // プライバシー設定
    commentStatus?: string            // コメント設定
  },
  recordingDetails?: {
    locationDescription?: string,      // 撮影場所
    recordingDate?: Timestamp         // 撮影日
  }
}
```

### 2. `dlsiteWorks` コレクション

**目的**: 鈴鹿みなせの関連DLsite作品情報を保存

**ドキュメントID**: DLsite商品ID (例: `"RJ236867"`)

**データ構造** (`FirestoreServerDLsiteWorkData`):

```typescript
{
  // 基本作品情報
  id: string,                         // FirestoreドキュメントID
  productId: string,                  // DLsite商品ID (例: "RJ236867")
  title: string,                      // 作品タイトル
  circle: string,                     // サークル名
  author?: string[],                  // 声優名配列
  description: string,                // 作品説明
  category: "ADV" | "SOU" | "RPG" | "MOV" | "MNG" | ..., // 作品カテゴリ
  workUrl: string,                    // DLsite作品ページURL
  thumbnailUrl: string,               // サムネイルURL
  
  // 価格情報
  price: {
    current: number,                  // 現在価格（円）
    original?: number,                // 元価格（セール時）
    currency: string,                 // 通貨（デフォルト: "JPY"）
    discount?: number,                // 割引率
    point?: number                    // ポイント還元
  },
  
  // 評価・レビュー
  rating?: {
    stars: number,                    // 1-5星評価
    count: number,                    // 評価数
    reviewCount?: number,             // レビュー数
    ratingDetail?: Array<{
      review_point: number,           // 1-5点
      count: number,                  // 該当数
      ratio: number                   // 割合（%）
    }>,
    averageDecimal?: number           // 平均評価（小数点）
  },
  
  // 売上・人気
  salesCount?: number,                // 売上数
  wishlistCount?: number,             // ウィッシュリスト数
  totalDownloadCount?: number,        // 総DL数
  
  // コンテンツ詳細
  ageRating?: string,                 // 年齢制限
  tags: string[],                     // 作品タグ配列
  sampleImages: Array<{
    thumb: string,                    // サムネイルURL
    width?: number,                   // 幅
    height?: number                   // 高さ
  }>,
  isExclusive: boolean,               // 独占配信フラグ
  
  // 高度なメタデータ
  makerId?: string,                   // メーカーID
  ageCategory?: number,               // 年齢カテゴリ
  registDate?: string,                // 作品登録日
  options?: string,                   // 音声・体験版オプション
  rankingHistory?: Array<{
    term: "day" | "week" | "month" | "year" | "total",
    category: string,                 // ランキングカテゴリ
    rank: number,                     // 順位
    rank_date: string                 // ランキング日付
  }>,
  
  // キャンペーン・シリーズ情報
  campaignInfo?: {
    campaignId?: string,              // キャンペーンID
    discountCampaignId?: number,      // 割引キャンペーンID
    discountEndDate?: string,         // 割引終了日
    discountUrl?: string              // 割引URL
  },
  seriesInfo?: {
    titleId?: string,                 // シリーズID
    titleName?: string,               // シリーズ名
    titleWorkCount?: number,          // シリーズ作品数
    isTitleCompleted?: boolean        // シリーズ完結フラグ
  },
  
  // 翻訳情報
  translationInfo?: { /* 翻訳関連メタデータ */ },
  languageDownloads?: Array<{ /* 言語別DL情報 */ }>,
  salesStatus?: { /* 各種販売フラグ */ },
  
  // タイムスタンプ
  lastFetchedAt: Timestamp,           // 最終取得日時
  createdAt: Timestamp,               // 作成日時
  updatedAt: Timestamp                // 更新日時
}
```

### 3. `youtubeMetadata` コレクション

**目的**: YouTubeデータ取得処理のメタデータを保存

**ドキュメントID**: `"fetch_metadata"`

**データ構造** (`FetchMetadata`):

```typescript
{
  lastFetchedAt: Timestamp,           // 最終取得日時
  nextPageToken?: string,             // YouTube APIページネーショントークン
  isInProgress: boolean,              // 処理中フラグ（並行実行防止）
  lastError?: string,                 // 最終エラー内容
  lastSuccessfulCompleteFetch?: Timestamp // 最終成功完了日時
}
```

### 4. `dlsiteMetadata` コレクション

**目的**: DLsiteデータ取得処理のメタデータを保存

**ドキュメントID**: `"fetch_metadata"`

**データ構造** (`FetchMetadata`):

```typescript
{
  lastFetchedAt: Timestamp,           // 最終取得日時
  currentPage?: number,               // 現在処理中のページ
  isInProgress: boolean,              // 処理中フラグ
  lastError?: string,                 // 最終エラー内容
  lastSuccessfulCompleteFetch?: Timestamp, // 最終成功完了日時
  totalWorks?: number                 // 総作品数
}
```

### 5. `audioButtons` コレクション ✅ 実装完了

**目的**: ユーザー作成の音声ボタンデータを保存（音声ファイルアップロード機能）

**ドキュメントID**: 自動生成ID（Firestore自動生成または UUID）

**データ構造** (`FirestoreServerAudioButtonData`):

```typescript
{
  // 基本情報
  id: string,                         // 音声ボタンID
  title: string,                      // 音声ボタンタイトル（1-100文字）
  description?: string,               // 音声ボタン説明（最大500文字）
  category: "voice" | "bgm" | "se" | "talk" | "singing" | "other", // カテゴリ
  tags?: string[],                    // タグ配列（最大10個、各タグ最大20文字）

  // 音声ファイル情報
  audioUrl: string,                   // Cloud Storage音声ファイルURL
  duration: number,                   // 音声の長さ（秒数）
  fileSize: number,                   // ファイルサイズ（バイト数）
  format: "opus" | "aac" | "mp3" | "wav" | "flac", // 音声フォーマット

  // 元動画情報（オプション）
  sourceVideoId?: string,             // 元YouTubeビデオID（videosコレクション参照）
  sourceVideoTitle?: string,          // 元動画タイトル
  startTime?: number,                 // 元動画での開始時刻（秒）
  endTime?: number,                   // 元動画での終了時刻（秒）

  // ユーザー・権限情報
  uploadedBy?: string,                // アップロードユーザーID（将来のユーザー認証用）
  isPublic: boolean,                  // 公開/非公開設定

  // 統計情報
  playCount: number,                  // 再生回数
  likeCount: number,                  // いいね数

  // 管理情報
  createdAt: Timestamp,               // 作成日時
  updatedAt: Timestamp                // 更新日時
}
```

**制約事項**:
- **ファイルサイズ制限**: 最大10MB
- **音声長制限**: 最大5分
- **タイトル制限**: 1-100文字
- **説明制限**: 最大500文字
- **タグ制限**: 最大10個、各タグ最大20文字

**セキュリティルール**:
- **読み取り**: 公開音声ボタンは誰でも読み取り可能、非公開は作成者のみ
- **作成・更新・削除**: 現在はServer Actionsのみで操作（Phase 2でクライアント側実装予定）

## 計画中のコレクション（将来実装予定）

### 6. `users` コレクション

**目的**: ユーザープロファイルと設定

**サブコレクション**: `favorites` - ユーザーのお気に入りクリップ

### 7. `audioReferences` コレクション

**目的**: 軽量な音声リファレンス（音声ファイルを伴わない、時間範囲のみの参照）

**データ構造**（実装済み・セキュリティルール設定済み）:

```typescript
{
  title: string,                      // 音声リファレンスタイトル
  startTime: number,                  // 開始時刻（秒）
  endTime: number,                    // 終了時刻（秒）
  videoId: string,                    // YouTube動画ID
  isPublic: boolean,                  // 公開/非公開設定
  createdBy: string,                  // 作成者ユーザーID
  createdAt: Timestamp                // 作成日時
}
```

## データベースインデックス

### videosコレクション:
- `liveBroadcastContent` (ASC) + `publishedAt` (DESC)
- `liveBroadcastContent` (ASC) + `publishedAt` (ASC)
- `videoType` (ASC) + `publishedAt` (DESC) + `__name__` (DESC)

### audioButtonsコレクション:
- `isPublic` (ASC) + `createdAt` (DESC) - 基本的な音声ボタン一覧取得
- `isPublic` (ASC) + `playCount` (DESC) - 人気順ソート
- `isPublic` (ASC) + `likeCount` (DESC) - いいね順ソート
- `isPublic` (ASC) + `category` (ASC) + `createdAt` (DESC) - カテゴリフィルター
- `isPublic` (ASC) + `sourceVideoId` (ASC) + `startTime` (ASC) - 元動画別表示
- `tags` (CONTAINS) + `isPublic` (ASC) + `createdAt` (DESC) - タグ検索

## データ収集パターン

1. **YouTubeビデオ**: 毎時19分にCloud Scheduler → Pub/Sub → Cloud Function経由で取得
2. **DLsite作品**: 10分間隔でCloud Scheduler → Pub/Sub → Cloud Function経由で取得
3. **データ処理**: Firestore書き込みでは500ドキュメントのバッチ操作制限を使用
4. **型安全性**: すべてのデータ構造でZodスキーマを使用してサーバー/クライアント形式間の変換と検証を実施

## アクセスパターン

- **パブリック読み取り**: `videos`、`dlsiteWorks`、公開`audioButtons`
- **管理者書き込み**: `videos`と`dlsiteWorks`はCloud Functionsのみが書き込み可能
- **ユーザー制御**: `audioButtons`はServer Actionsで作成・更新・削除（実装完了、運用準備完了）
- **認証制御**: `audioReferences`と`users`コレクション（将来実装）
- **セキュリティルール**: Terraform管理のFirestoreセキュリティルールで実装

### 音声ボタンアクセスパターン詳細:
- **読み取り**: 公開音声ボタン（`isPublic: true`）は誰でも読み取り可能
- **非公開読み取り**: 非公開音声ボタンは作成者のみ読み取り可能（将来のユーザー認証実装時）
- **書き込み**: 現在はNext.js Server Actionsのみで操作
- **Cloud Storage**: 音声ファイルはパブリック読み取り可能、アプリケーションのみ書き込み可能

## 型定義の場所

- **共有型定義**: `packages/shared-types/src/`
- **Firestore変換ユーティリティ**: `packages/shared-types/src/firestore-utils.ts`
- **Zodスキーマ**: 各型定義ファイル内で定義（video.ts, work.ts, audio-button.ts）

### 音声ボタン関連型定義:
- **`audio-button.ts`**: 音声ボタンの全型定義とZodスキーマ
  - `FirestoreAudioButtonData`: Firestore保存用
  - `FrontendAudioButtonData`: フロントエンド表示用
  - `CreateAudioButtonInput`: 音声ボタン作成用
  - `AudioButtonQuery`: 検索・フィルター用
  - `AudioFileUploadInfo`: ファイルアップロード用
- **型変換関数**: `convertToFrontendAudioButton()` - Firestore → フロントエンド変換
- **シリアライズ関数**: RSC/RCC間の安全なデータ渡し用