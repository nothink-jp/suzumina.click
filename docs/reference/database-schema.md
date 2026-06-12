# Firestore Database Structure

> **📅 最終更新**: 2026年5月22日  
> **📝 ステータス**: v0.3.12 稼働中  
> **🔧 対象**: suzumina.clickプロジェクトのCloud Firestoreデータベース構造
> **🆕 更新内容**: `dlsite_timeseries_raw` / `dlsite_timeseries_daily` コレクション削除済みとして明記（統合アーキテクチャへ移行）

## 使用中のコレクション一覧

### 1. `videos` コレクション

**目的**: 涼花みなせ様の関連YouTubeビデオデータを保存

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

### 2. `works` コレクション ✅ 実装完了・v0.3.0統合データ構造対応完了

**目的**: 涼花みなせ様の関連DLsite作品情報を保存（統合データ構造実装済み）

**ドキュメントID**: DLsite商品ID (例: `"RJ236867"`)

**データ収集状況**: 1015件完全収集済み (35%データ欠損問題解決完了)

**データ構造** (`WorkDocument` - 2025年7月26日にOptimizedFirestoreDLsiteWorkDataから名称変更):

```typescript
// Value Objects構造:
// PriceInfo: {
//   regular: number,            // 定価
//   discount?: number,          // セール価格
//   rate?: number,              // 割引率
//   campaignId?: number,        // キャンペーンID
//   locale: 'JP' | 'JP-P' | 'US' | ...
// }
//
// RatingInfo: {
//   value?: number,             // 評価値
//   count?: number,             // 評価数
//   average?: number            // 平均評価
// }
//
// FileInfo: {
//   size?: string,              // ファイルサイズ
//   duration?: string,          // 再生時間
//   format?: string,            // ファイル形式
//   tracks?: Track[]            // トラック情報
// }

{
  // === 基本識別情報 ===
  id: string,                         // FirestoreドキュメントID
  productId: string,                  // DLsite商品ID (例: "RJ236867")
  
  // === 基本作品情報（統合済み - v0.3.0対応） ===
  title: string,                      // 作品タイトル
  circle: string,                     // サークル名
  description: string,                // 作品説明
  category: WorkCategory,             // 作品カテゴリ
  workUrl: string,                    // DLsite作品ページURL
  thumbnailUrl: string,               // サムネイル画像
  highResImageUrl?: string,           // 高解像度画像（Individual Info APIから取得・/api/image-proxy対応）
  
  // === 価格・評価情報（統合済み - 優先度: infoAPI > detailPage > searchHTML） ===
  price: PriceInfo,                   // 統合価格情報（Value Object）
  rating?: RatingInfo,                // 統合評価情報（Value Object）
  salesCount?: number,                // 販売数（infoAPIから）
  
  // === サークル情報（v11.6追加 - サークル・クリエイターシステム対応） ===
  circleId: string,                   // サークルID（例: "RG23954", circlesコレクション参照用）
  
  // === 統一クリエイター情報（5種類のみ - Individual Info API取得・DLsite仕様準拠） ===
  voiceActors: string[],              // 声優（Individual Info APIから取得）
  scenario: string[],                 // シナリオ（Individual Info APIから取得）
  illustration: string[],             // イラスト（Individual Info APIから取得）
  music: string[],                    // 音楽（Individual Info APIから取得）
  author: string[],                   // 作者（声優と異なる場合のみ）
  
  // === 統一作品メタデータ（重複排除済み） ===
  releaseDate?: string,               // 販売日（ISO形式 - ソート用）
  releaseDateISO?: string,            // 販売日（ISO標準形式 - YYYY-MM-DD）
  releaseDateDisplay?: string,        // 販売日（日本語形式 - 表示用）
  seriesName?: string,                // シリーズ名
  ageRating?: string,                 // 年齢制限
  workFormat?: string,                // 作品形式
  fileFormat?: string,                // ファイル形式
  genres: string[],                   // 統合ジャンル（全ソースマージ + 重複除去）
  
  // === Individual Info API準拠フィールド（Phase 2: 段階的活用 - 2025年7月12日実装） ===
  creaters?: {                        // Individual Info API制作者情報（ID付き）
    voice_by?: Array<{                // 声優情報
      id: string,                     // 声優ID
      name: string                    // 声優名
    }>,
    scenario_by?: Array<{             // シナリオ制作者情報
      id: string,                     // 制作者ID
      name: string                    // 制作者名
    }>,
    illust_by?: Array<{               // イラスト制作者情報
      id: string,                     // 制作者ID
      name: string                    // 制作者名
    }>,
    music_by?: Array<{                // 音楽制作者情報
      id: string,                     // 制作者ID
      name: string                    // 制作者名
    }>,
    others_by?: Array<{               // その他制作者情報
      id: string,                     // 制作者ID
      name: string                    // 制作者名
    }>,
    created_by?: Array<{              // 制作者情報（directed_byから）
      id: string,                     // 制作者ID
      name: string                    // 制作者名
    }>
  },
  
  // === 詳細情報（階層化 - 低頻度アクセス） ===
  fileInfo?: FileInfo,                // ファイル詳細情報（Value Object）
  sampleImages: Array<{
    thumb: string,                    // サムネイルURL
    width?: number,                   // 幅
    height?: number                   // 高さ
  }>,
  
  // === ソース別データ（デバッグ・品質管理用） ===
  dataSources?: {
    searchResult?: {
      lastFetched: string,            // 最終取得日時
      genres: string[]                // 検索結果のジャンル
    };
    infoAPI?: {
      lastFetched: string,            // 最終取得日時
      salesCount?: number,            // API統計データ
      wishlistCount?: number,
      customGenres?: string[]
    };
    detailPage?: {
      lastFetched: string,            // 最終取得日時
      basicInfo: BasicWorkInfo,       // work_outline データ
      detailedDescription: string
    };
  },
  
  // === 高度なメタデータ（infoAPIから） ===
  makerId?: string,                   // メーカーID
  ageCategory?: number,               // 年齢カテゴリ
  options?: string,                   // 音声・体験版オプション
  rankingHistory?: Array<{
    term: "day" | "week" | "month" | "year" | "total",
    category: string,                 // ランキングカテゴリ
    rank: number,                     // 順位
    rank_date: string                 // ランキング日付
  }>,
  
  // === システム管理情報 ===
  lastFetchedAt: Timestamp,           // 全体最終更新
  createdAt: Timestamp,               // 作成日時
  updatedAt: Timestamp                // 更新日時
}
```

**✅ v11.7 Entity/Value Object構造の特徴** (2025年7月24日完全移行):

- **Entity/Value Objectアーキテクチャ**: ドメイン駆動設計に基づくValue Object分離
- **レガシーフィールド削除**: totalDownloadCount, bonusContent, isExclusive, apiGenres, apiCustomGenres, apiWorkOptions, wishlistCountを完全削除
- **Value Object統合**: PriceInfo, RatingInfo, FileInfoをValue Objectとして明確化
- **100% API-Only**: Individual Info API専用データ取得・スクレイピング完全廃止
- **重複除去**: API内データの重複を排除し、最高品質データを採用
- **DLsite制約準拠**: 5種類クリエイター制限・ジャンル vs タグ区別・トラック情報なし等
- **段階的データ取得**: minimal/standard/comprehensive戦略対応
- **データ品質追跡**: API取得状況の完全追跡
- **高解像度対応**: Individual Info APIからの高画質画像取得・プロトコル相対URL自動変換
- **画像プロキシ統合**: `/api/image-proxy` による安全なDLsite画像取得・HTTPS強制変換
- **型統一完了**: highResImageUrl型統一・extractImageUrl関数による型安全データ変換

**制約事項**:
- **DLsite仕様制限**: タグ概念なし（ジャンルのみ）・5種クリエイター固定・構造化トラック情報なし
- **API制限**: Individual Info API は厳しいレート制限・大量データ処理時間要
- **データ整合性**: API更新タイミングによる一時的不整合の可能性

**アクセスパターン**:
- **読み取り**: 公開作品は誰でも読み取り可能
- **書き込み**: Cloud Functionsのみが書き込み可能（自動データ収集）
- **更新頻度**: 15分間隔での自動収集・既存データ保持更新・100%処理成功保証

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

### 4. `dlsiteMetadata` コレクション ✅ v11.0統合メタデータ対応完了

**目的**: DLsite統合データ収集処理のメタデータを保存（15分間隔実行・タイムアウト最適化対応）

#### ドキュメント1: `"unified_data_collection_metadata"`

**データ構造** (`UnifiedDataCollectionMetadata` - v11.0統合システム対応):

```typescript
{
  // 基本実行情報
  lastFetchedAt: Timestamp,                    // 最終取得日時
  isInProgress: boolean,                       // 処理中フラグ（並行実行防止）
  lastSuccessfulCompleteFetch?: Timestamp,     // 最終成功完了日時
  lastError?: string,                          // 最終エラー内容
  
  // 処理統計情報（v11.0タイムアウト最適化対応）
  totalWorks?: number,                         // 総作品数（1,484件 → 1,500件対応）
  processedWorks?: number,                     // 処理済み作品数（100%達成保証）
  basicDataUpdated?: number,                   // 基本データ更新数
  timeSeriesCollected?: number,                // 時系列データ収集数
  
  // v11.0和集合アクセス機能統計
  regionOnlyIds?: number,                      // 現在リージョン専用ID数
  assetOnlyIds?: number,                       // アセットファイル専用ID数
  unionTotalIds?: number,                      // 和集合総ID数（完全性保証）
  regionDifferenceDetected?: boolean,          // リージョン差異検出フラグ
  
  // v11.0高頻度実行対応
  executionFrequency?: "*/15 * * * *",         // 15分間隔実行設定
  lastBatchStartTime?: Timestamp,              // 最新バッチ開始時刻
  lastBatchEndTime?: Timestamp,                // 最新バッチ終了時刻
  averageExecutionTime?: number,               // 平均実行時間（秒）
  timeoutOptimizationEnabled?: boolean         // タイムアウト最適化フラグ
}
```

#### ドキュメント2: `"dataIntegrityCheck"`

**データ構造** (`DataIntegrityCheckMetadata`):

```typescript
{
  // 最新の実行結果
  latest: {
    timestamp: string,                         // 実行日時（ISO 8601形式）
    checks: {
      circleWorkCounts: {                      // Circleの作品数チェック
        checked: number,                       // チェックしたサークル数
        mismatches: number,                    // 不整合発見数
        fixed: number                          // 修正数
      },
      orphanedCreators: {                      // 孤立したCreatorマッピング
        checked: number,                       // チェックしたCreator数
        found: number,                         // 孤立発見数
        cleaned: number                        // クリーンアップ数
      },
      workCircleConsistency: {                 // Work-Circle相互参照
        checked: number,                       // チェックした作品数
        mismatches: number,                    // 不整合発見数
        fixed: number                          // 修正数
      },
      creatorWorkRestore?: {                   // 削除されたCreator-Work関連の復元
        checked: number,                       // チェックした作品数
        restored: number,                      // 復元したマッピング数
        creatorsCreated: number                // 作成したCreatorドキュメント数
      }
    },
    totalIssues: number,                       // 総問題数
    totalFixed: number,                        // 総修正数
    executionTimeMs: number                    // 実行時間（ミリ秒）
  },
  
  // メタデータ
  lastCheckedAt: Timestamp,                    // 最終チェック日時
  updatedAt: Timestamp                         // 最終更新日時
}
```

**サブコレクション**: `history`
- 過去の実行履歴を保存（最大10件）
- ドキュメントID: 実行日時のISO文字列

### 5. `audioButtons` コレクション ✅ 実装完了

**目的**: ユーザー作成の音声ボタンデータを保存（YouTube タイムスタンプ参照統合システム）

**ドキュメントID**: 自動生成ID（Firestore自動生成または UUID）

**データ構造** (`FirestoreAudioButtonData`):

```typescript
{
  // 基本情報
  id: string,                         // 音声ボタンID
  title: string,                      // 音声ボタンタイトル（1-100文字）
  description?: string,               // 音声ボタン説明（最大500文字）
  
  // YouTube動画参照情報
  videoId: string,                    // YouTube動画ID（videosコレクション参照。旧称 sourceVideoId）
  videoTitle: string,                 // 動画タイトル
  startTime: number,                  // 開始時刻（秒）
  endTime: number,                    // 終了時刻（秒）
  duration: number,                   // 再生時間（秒）

  // 分類・メタデータ
  tags?: string[],                    // タグ配列（最大10個、各タグ最大30文字）
  category: string,                   // カテゴリ（必須）

  // ユーザー・権限情報
  createdBy: string,                  // 作成者Discord ID
  createdByName: string,              // 作成者表示名
  isPublic: boolean,                  // 公開/非公開設定

  // 統計情報
  playCount: number,                  // 再生回数
  likeCount: number,                  // いいね数
  viewCount: number,                  // 表示回数

  // 管理情報
  createdAt: Timestamp,               // 作成日時
  updatedAt: Timestamp                // 更新日時
}
```

**制約事項**:
- **時間制限**: 最大参照時間5分
- **タイトル制限**: 1-100文字
- **説明制限**: 最大500文字
- **タグ制限**: 最大10個、各タグ最大30文字

**セキュリティルール**:
- **読み取り**: 公開音声ボタンは誰でも読み取り可能、非公開は作成者のみ
- **作成・更新・削除**: 現在はServer Actionsのみで操作

## 完了済みコレクション

### 6. `users` コレクション ✅ 実装完了

**目的**: ユーザープロファイルと設定

**ドキュメントID**: Discord ユーザーID

**データ構造** (`FirestoreUserData`):

```typescript
{
  // 基本情報
  id: string,                         // Discord ユーザーID
  username: string,                   // Discord ユーザー名
  discriminator?: string,             // Discord ディスクリミネーター
  displayName?: string,               // 表示名
  avatar?: string,                    // アバターURL
  
  // 権限情報
  guildMember: boolean,               // ギルドメンバーシップ状態
  isPublicProfile: boolean,           // プロファイル公開設定
  
  // 統計情報
  audioButtonsCreated: number,        // 作成した音声ボタン数
  totalPlays: number,                 // 総再生数
  totalLikes: number,                 // 総いいね数
  favoritesCount: number,             // お気に入り数
  
  // タイムスタンプ
  createdAt: Timestamp,               // 作成日時
  updatedAt: Timestamp,               // 更新日時
  lastLoginAt?: Timestamp             // 最終ログイン日時
}
```

#### サブコレクション: `users/{userId}/favorites` ✅ 実装完了

**目的**: ユーザーごとのお気に入り音声ボタン管理

**ドキュメントID**: 音声ボタンID

**データ構造** (`FirestoreFavoriteData`):

```typescript
{
  audioButtonId: string,              // 音声ボタンID (audioButtonsコレクション参照)
  addedAt: string                     // お気に入り登録日時（ISO 8601）
}
```

> **注記（SPR-174 監査・2026-06-13）**: 旧記述はパフォーマンス用に `title` / `sourceVideoId` / `category` /
> `duration` を非正規化キャッシュする構造だったが、現行は最小スキーマ（`audioButtonId` + `addedAt`）で、
> 表示時に audioButtons を都度 join する方式に移行済み。正本は
> `packages/shared-types/src/entities/favorite.ts` の `FirestoreFavoriteSchema`。

**制約事項**:
- 同一ユーザーが同じ音声ボタンを重複してお気に入り登録不可
- ドキュメントIDが音声ボタンIDと同一のため、自動的に一意性保証

**アクセスパターン**:
- **読み取り**: ユーザー本人のみ可能
- **書き込み**: Server Actions経由のみで操作
- **削除**: 音声ボタン削除時に関連お気に入りも自動削除

#### サブコレクション: `users/{userId}/top10` ✅ 実装完了

**目的**: ユーザーの10選ランキング管理

**ドキュメントID**: "ranking"

**データ構造** (`UserTop10List`):

```typescript
{
  userId: string,                      // ユーザーID
  rankings: {
    [rank: number]: {                  // キー: 1-10の順位
      workId: string,                  // 作品ID
      workTitle?: string,              // 作品タイトル（表示用キャッシュ）
      updatedAt: Timestamp,            // この順位に設定された日時
    } | null,                          // null = その順位は空き
  },
  lastUpdatedAt: Timestamp,            // 最終更新日時
  totalCount: number,                  // 現在の10選登録数（0-10）
}
```

**制約事項**:
- ユーザーあたり1つの10選リストのみ
- 最大10作品まで
- 順位の重複不可

**アクセスパターン**:
- **読み取り**: ユーザー本人のみ可能
- **書き込み**: Server Actions経由のみで操作
- **トランザクション**: 順位変更時は評価データと同期

**実装状況**: ✅ 完全実装済み
- スタック型挿入アルゴリズム実装完了
- Top10RankModalコンポーネント実装完了
- 順位入れ替え・押し出し処理実装完了

### 7. `evaluations` コレクション ✅ 実装完了

**目的**: DLsite作品に対するユーザー評価を保存

**ドキュメントID**: `{userId}_{workId}` (例: `"123456789_RJ01414353"`)

**データ構造** (`FirestoreWorkEvaluation`):

```typescript
{
  // 基本識別情報
  id: string,                          // ドキュメントID（複合キー）
  workId: string,                      // DLsite作品ID (例: "RJ01414353")
  userId: string,                      // Discord ユーザーID
  
  // 評価タイプ（排他的）
  evaluationType: 'top10' | 'star' | 'ng',
  
  // 評価詳細（条件付きフィールド）
  top10Rank?: number,                  // 1-10 (evaluationType === 'top10'の時のみ)
  starRating?: 1 | 2 | 3,              // 星評価 (evaluationType === 'star'の時のみ)
  
  // メタデータ
  createdAt: Timestamp,                // 初回評価日時
  updatedAt: Timestamp                 // 最終更新日時
}
```

**制約事項**:
- 1作品につき1ユーザー1評価のみ
- 評価タイプは排他的（同時に複数の評価タイプは設定不可）
- 10選評価は最大10作品まで

**アクセスパターン**:
- **読み取り**: ユーザー本人のみ可能（将来的に公開設定を追加予定）
- **書き込み**: Server Actions経由のみで操作
- **削除**: 評価の削除時、10選からも自動削除

**実装状況**: ✅ 完全実装済み
- WorkEvaluationコンポーネント統合完了
- Server Actions実装完了
- トランザクション処理実装完了

### 8. `dlsite_timeseries_raw` コレクション ❌ 削除済み（統合アーキテクチャへ移行）

> **注記**: このコレクションは旧アーキテクチャのものです。現在は `works/{workId}/priceHistory` サブコレクション（セクション10参照）で価格履歴を管理しています。以下は参照用の記録として残しています。

**旧目的**: DLsite作品の時系列生データを保存（高頻度データ収集・日次集計の元データ）

**ドキュメントID**: `{workId}_{YYYY-MM-DD}_{HH-mm-ss}`

**データ構造** (`TimeSeriesRawData`):

```typescript
{
  // 基本識別情報
  workId: string,                     // 作品ID (例: "RJ01234567")
  date: string,                       // 収集日 (YYYY-MM-DD)
  time: string,                       // 収集時刻 (HH:mm:ss)
  timestamp: Timestamp,               // 収集タイムスタンプ
  
  // 地域別価格情報（6地域対応）
  regionalPrices: {
    JP: number,                       // 日本価格
    US: number,                       // 米国価格
    EU: number,                       // 欧州価格
    CN: number,                       // 中国価格
    TW: number,                       // 台湾価格
    KR: number                        // 韓国価格
  },
  
  // 動的データ
  discountRate: number,               // 割引率
  campaignId?: number,                // キャンペーンID
  wishlistCount?: number,             // ウィッシュリスト数
  ratingAverage?: number,             // 評価平均
  ratingCount?: number,               // 評価数
  
  // ランキング情報
  rankDay?: number,                   // 日次ランキング
  rankWeek?: number,                  // 週次ランキング
  rankMonth?: number,                 // 月次ランキング
  
  // システム情報
  createdAt: Timestamp                // データ作成日時
}
```

**データ保持期間**: 7日間（自動削除・コスト最適化）

### 9. `dlsite_timeseries_daily` コレクション ❌ 削除済み（統合アーキテクチャへ移行）

> **注記**: このコレクションは旧アーキテクチャのものです。参照用の記録として残しています。

**旧目的**: 時系列生データから日次集計された永続保存データ（価格履歴・ランキング推移API用）

**ドキュメントID**: `{workId}_{YYYY-MM-DD}`

**データ構造** (`TimeSeriesDailyAggregate`):

```typescript
{
  // 基本識別情報
  workId: string,                     // 作品ID
  date: string,                       // 集計対象日 (YYYY-MM-DD)
  
  // 価格集計（最安値追跡）
  lowestPrices: {
    JP: number,                       // 各地域の日次最安値
    US: number,
    EU: number,
    CN: number,
    TW: number,
    KR: number
  },
  maxDiscountRate: number,            // 最大割引率
  activeCampaignIds: number[],        // アクティブキャンペーンID一覧
  
  // 統計集計（最大値追跡）
  maxWishlistCount?: number,          // 最大ウィッシュリスト数
  maxRatingAverage?: number,          // 最高評価平均
  maxRatingCount?: number,            // 最大評価数
  
  // ランキング集計（最高順位 = 最小数値）
  bestRankDay?: number,               // 日次最高ランキング
  bestRankWeek?: number,              // 週次最高ランキング
  bestRankMonth?: number,             // 月次最高ランキング
  
  // 集計メタデータ
  dataPointCount: number,             // 生データポイント数
  firstCaptureTime: string,           // 初回収集時刻
  lastCaptureTime: string,            // 最終収集時刻
  
  // システム情報
  createdAt: Timestamp,               // 集計データ作成日時
  updatedAt: Timestamp                // 最終更新日時
}
```

**データ保持期間**: 永続保存（長期分析用）

#### サブコレクション: `works/{workId}/priceHistory` ✅ v0.3.4価格履歴実装完了

**目的**: DLsite作品の詳細価格履歴データ（サブコレクション方式・全履歴保持）

**ドキュメントID**: `YYYY-MM-DD` (例: `"2025-07-20"`)

**データ構造** (`PriceHistoryDocument`)：

```typescript
{
  // 基本識別情報
  workId: string,                     // 親作品ID (例: "RJ01414353")
  date: string,                       // YYYY-MM-DD
  capturedAt: string,                 // 記録日時（ISO形式）
  
  // 価格データ（Individual Info API準拠）
  localePrices: LocalePrice[],        // 多通貨価格配列（API生データ）
  
  // JPY価格サマリー（表示・統計用）
  regularPrice: number,               // 定価（JPY）
  discountPrice?: number,             // セール価格（JPY、セール時のみ）
  discountRate: number,               // 割引率（%）
  campaignId?: number,                // キャンペーンID
  
  // 価格変動検知
  priceChanged: boolean,              // 前日から価格変更あり
  newCampaign: boolean,               // 新しいキャンペーン開始
  
  // 収集メタデータ
  dataSource: 'individual_api',       // データ取得元
  apiCallCount: number,               // API呼び出し回数（その日）
  collectionVersion: string           // データ収集バージョン
}
```

**特徴**:
- **全履歴保持**: システム開始日からの完全な価格推移を永続保存
- **サブコレクション方式**: 作品ごとの独立管理・Firestore 1MB制限回避
- **多通貨対応**: JPY/USD/EUR/CNY/TWD/KRW価格データ保持
- **価格変動検知**: 日次の価格変更・キャンペーン開始の自動検出
- **二重割引問題解決**: Individual Info API正しい価格抽出ロジック実装済み

**アクセスパターン**:
- **読み取り**: Next.js Server Actions経由でクライアントに提供
- **書き込み**: Cloud Functions（Individual Info API収集）のみ
- **クエリ**: 期間指定・通貨フィルタリング対応

**インデックス要件**:
- `date (ASC)`: 期間指定クエリ用
- `date (DESC)`: 最新データ取得用

### 10. `circles` コレクション ✅ v11.6新規実装完了

**目的**: DLsiteサークル（制作グループ）情報を保存

**ドキュメントID**: サークルID (例: `"RG23954"`)

**データ構造** (`CircleData`):

```typescript
{
  // 基本識別情報
  circleId: string,                   // サークルID（DLsiteのmaker_id）
  name: string,                       // サークル名（日本語）
  nameEn?: string,                    // サークル名（英語、オプション）
  
  // 統計情報
  workCount: number,                  // 関連作品数（統計情報・非正規化）
  
  // メタデータ
  lastUpdated: Timestamp,             // 最終更新日時
  createdAt: Timestamp,               // 初回登録日時
}
```

**特徴**:
- **Fire-and-Forget更新**: メイン処理に影響しない非同期更新
- **統計情報管理**: workCountによる作品数追跡
- **Individual Info API連携**: maker_id/maker_name自動抽出

**アクセスパターン**:
- **読み取り**: 公開サークルページ・作品詳細ページのサークルリンク
- **書き込み**: Cloud Functions（Individual Info API収集）のみ
- **クエリ**: サークルID直接アクセス・作品数順ソート

### 11. `creatorWorkMappings` コレクション ✅ v11.6新規実装完了

**目的**: クリエイターと作品の関連情報を効率的にクエリするための非正規化データ

**ドキュメントID**: `{creatorId}_{workId}` (例: `"28165_RJ01414353"`)

**データ構造** (`CreatorWorkMapping`):

```typescript
{
  // 基本識別情報
  creatorId: string,                  // クリエイターID（Individual Info APIのcreater.id）
  workId: string,                     // 作品ID（DLsiteのproduct_id）
  creatorName: string,                // クリエイター名（表示用）
  
  // 役割情報
  types: CreatorType[],               // クリエイタータイプ配列（複数役割対応）
  
  // 関連情報
  circleId: string,                   // 所属サークルID
  
  // メタデータ
  createdAt: Timestamp,               // マッピング作成日時
}

// クリエイタータイプ定義
type CreatorType = "voice" | "illustration" | "scenario" | "music" | "other";
```

**特徴**:
- **非正規化設計**: クエリ効率化のためのデータ重複
- **複数役割対応**: 1人のクリエイターが複数の役割を担当可能
- **バッチ処理対応**: 大量データの効率的処理
- **重複処理防止**: 同一クリエイター・作品ペアの統合管理

**アクセスパターン**:
- **読み取り**: クリエイターページ・作品検索・統計分析
- **書き込み**: Cloud Functions（Individual Info API収集）のみ
- **クエリ**: creatorId検索・workId逆引き・types配列検索

✅ 全コレクションの実装が完了し、本番稼働中です（v11.6サークル・クリエイターシステム + v11.0時系列データ基盤 + v0.3.4価格履歴システム含む）。

## Firestore 複合インデックス

> **最終更新**: 2025-07-19 | **完全実装状況調査完了** + Terraform管理統合 + 正確なコスト最適化計画
> 
> **分析対象**: `apps/web/src/` 全体のFirestoreクエリ実装を詳細調査・videos/works/audioButtons全機能の使用状況確認済み

### 📊 現在のインデックス状況（Google Cloud Firestore）

#### ✅ **audioButtons コレクション** (8個使用中 + 1個削除推奨 + 3個フォールバック用)

> **⚠️ 実デプロイ検証（2026-06-13 / SPR-174）**: `gcloud firestore indexes composite list`（本番 `suzumina-click` / `(default)`）で確認。
> **動画別音声ボタンの参照フィールドは live でも `videoId`**（`sourceVideoId` のインデックスは存在しない）。
> よってコードの `.where("videoId", …)` クエリは正しく裏付けられており、FAILED_PRECONDITION のリスクはない。
> なおこの表は 2025-07-19 時点のスナップショットで、以下は live と乖離（本タスクのスコープ外・別途整理）:
> 統計ソートは live では `stats.playCount` / `stats.likeCount`（flat な `playCount` / `likeCount` は旧称）、
> 作成者系は新 `creatorId` インデックスが追加済みだが旧 `createdBy` 系も未削除で残存（drift）。
> 正確なフィールドパスの正本は `terraform/firestore_indexes*.tf` と上記 live 一覧。

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `isPublic + createdAt (DESC)` | [`isPublic`, `createdAt`, `__name__`] | ✅ **使用中** | `/buttons` 一覧・オートコンプリート |
| `isPublic + playCount (DESC)` | [`isPublic`, `playCount`, `__name__`] | ✅ **使用中** | 再生数順ソート |
| `isPublic + likeCount (DESC)` | [`isPublic`, `likeCount`, `__name__`] | ✅ **使用中** | 人気順ソート |
| `videoId + isPublic + createdAt (DESC)` | [`videoId`, `isPublic`, `createdAt`, `__name__`] | ✅ **使用中** | 動画別音声ボタン（新着順） |
| `videoId + isPublic + stats.likeCount (DESC)` | [`videoId`, `isPublic`, `stats.likeCount`, `__name__`] | ✅ **使用中** | 動画別音声ボタン（人気順） |
| `videoId + isPublic + stats.playCount (DESC)` | [`videoId`, `isPublic`, `stats.playCount`, `__name__`] | ✅ **使用中** | 動画別音声ボタン（再生数順） |
| `tags (ARRAY_CONTAINS) + isPublic + createdAt (DESC)` | [`tags`, `isPublic`, `createdAt`, `__name__`] | ✅ **使用中** | タグフィルター（クライアント補完） |
| `createdBy + createdAt (DESC)` | [`createdBy`, `createdAt`, `__name__`] | ✅ **使用中** | ユーザー統計・管理・レート制限 |
| `isPublic + videoId + startTime (ASC)` | [`isPublic`, `videoId`, `startTime`, `__name__`] | 🔴 **削除済み** | 時間順ソート機能未実装。terraform で削除完了・live 非存在（`firestore_indexes.tf:113`） |
| `createdBy + createdAt (ASC)` | [`createdBy`, `createdAt`, `__name__`] | 🔶 **フォールバック** | レート制限・範囲クエリ用 |
| `createdBy + isPublic + createdAt (DESC)` | [`createdBy`, `isPublic`, `createdAt`, `__name__`] | 🔶 **フォールバック** | マイページ機能（無効化中） |
| `createdBy + isPublic + playCount (DESC)` | [`createdBy`, `isPublic`, `playCount`, `__name__`] | 🔶 **フォールバック** | マイページソート（無効化中） |

#### ✅ **videos コレクション** (4個使用中 + 8個削除推奨)

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `liveBroadcastContent + publishedAt (DESC)` | [`liveBroadcastContent`, `publishedAt`, `__name__`] | ✅ **使用中** | 動画種別フィルター（配信アーカイブ等） |
| `liveBroadcastContent + publishedAt (ASC)` | [`liveBroadcastContent`, `publishedAt`, `__name__`] | ✅ **使用中** | 動画種別フィルター（古い順） |
| `categoryId + publishedAt (DESC)` | [`categoryId`, `publishedAt`, `__name__`] | ✅ **使用中** | カテゴリフィルター（ゲーム・エンタメ） |
| `categoryId + publishedAt (ASC)` | [`categoryId`, `publishedAt`, `__name__`] | ✅ **使用中** | カテゴリフィルター（古い順） |
| `videoType + publishedAt (DESC)` | [`videoType`, `publishedAt`, `__name__`] | 🔴 **削除推奨** | videoType機能未実装 |
| `liveStreamingDetails.* + publishedAt` | 6個の組み合わせ | 🔴 **削除推奨** | 配信詳細フィルター未実装 |

#### ✅ **users コレクション** (2個 - 全て使用中)

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `isPublicProfile + createdAt (DESC)` | [`isPublicProfile`, `createdAt`, `__name__`] | ✅ **使用中** | 公開ユーザー一覧 |

#### ⚠️ **works コレクション** (0個 - 全件取得方式)

**実装方式**: 全件取得 + クライアントサイドフィルタリング
```typescript
// 作品一覧は複合インデックスを使用しない
const allSnapshot = await firestore.collection("works").get();
```

**フィルタリング**: カテゴリ・価格・評価・検索 全てクライアントサイド実行
**インデックス**: 既存の複合インデックス（外部管理）は実際には未使用

#### ✅ **contacts コレクション** (2個 - 新規追加必要)

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `status + createdAt (DESC)` | [`status`, `createdAt`, `__name__`] | ⚠️ **未設定** | 管理者お問い合わせフィルター |
| `priority + createdAt (DESC)` | [`priority`, `createdAt`, `__name__`] | ⚠️ **未設定** | 優先度別管理 |

#### ✅ **favorites サブコレクション** (1個 - Collection Group用)

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `audioButtonId + createdAt (DESC)` | [`audioButtonId`, `createdAt`, `__name__`] | ⚠️ **未設定** | お気に入り統計・管理者機能 |

### 📋 **インデックス使用状況サマリー** (2025-07-19確定)

#### **✅ 使用中 (14個)**
- **audioButtons**: 8個（基本一覧・動画別・タグ・統計）
- **videos**: 4個（動画種別・カテゴリフィルター）  
- **users**: 2個（管理者機能）

#### **🔴 削除推奨 (8個)**
- **videos**: 7個（videoType 1個 + liveStreamingDetails 6個）
- **audioButtons**: 1個（startTime未実装・削除完了済み）

#### **⚠️ 新規追加必要 (5個)**
- **contacts**: 2個（管理者機能で必須）
- **favorites**: 1個（Collection Group統計用）
- **priceHistory**: 2個（価格履歴システムで必須）

#### **🔶 フォールバック用 (3個)**
- **audioButtons**: マイページ用（現在無効化中だが保持）

#### **ℹ️ 対象外**
- **works**: 全件取得方式のため複合インデックス不要
- **時系列データ**: 外部管理インデックス使用

#### 🔍 **2025-07-19 総合分析結果** - 全21個の複合インデックス要件特定

以下は `apps/web/src/` 全体のFirestoreクエリを完全分析して特定した複合インデックス要件です：

##### **audioButtons コレクション** (13個の要件)

| 優先度 | インデックス構成 | 現在の状況 | 使用箇所 |
|-------|----------------|-----------|----------|
| 🔴 **高** | `isPublic + createdAt (DESC)` | ✅ **設定済み** | `/buttons` 一覧・検索結果 |
| 🔴 **高** | `isPublic + playCount (DESC)` | ✅ **設定済み** | 再生数順ソート |
| 🔴 **高** | `isPublic + likeCount (DESC)` | ✅ **設定済み** | 人気順ソート |
| 🔴 **高** | `videoId + isPublic + createdAt (DESC)` | ✅ **設定済み** | 動画別音声ボタン |
| 🔴 **高** | `videoId + isPublic + stats.playCount (DESC)` | ✅ **設定済み** | 動画別再生数順 |
| 🔴 **高** | `videoId + isPublic + stats.likeCount (DESC)` | ✅ **設定済み** | 動画別人気順 |
| 🔴 **高** | `tags (ARRAY_CONTAINS) + isPublic + createdAt (DESC)` | ✅ **設定済み** | タグフィルター |
| 🔴 **高** | `createdBy + createdAt (DESC)` | ✅ **設定済み** | ユーザー統計・管理 |
| 🟡 **中** | `createdBy + isPublic + createdAt (DESC)` | ✅ **設定済み** | マイページ（フォールバック） |
| 🟡 **中** | `createdBy + isPublic + playCount (DESC)` | ✅ **設定済み** | マイページソート（フォールバック） |
| 🟡 **中** | `createdBy + createdAt (ASC)` | ✅ **設定済み** | レート制限・範囲クエリ |
| 🟢 **低** | `category + isPublic + createdAt (DESC)` | ⚠️ **未設定** | カテゴリフィルター（将来機能） |
| 🟢 **低** | `isPublic + videoId + startTime (ASC)` | 🔴 **削除済み** | 時間順ソート（未実装・削除完了済み） |

##### **videos コレクション** (3個の要件)

| 優先度 | インデックス構成 | 現在の状況 | 使用箇所 |
|-------|----------------|-----------|----------|
| 🟢 **低** | `publishedAt (DESC)` | ✅ **単一フィールド** | 動画一覧（単純ソート） |
| 🔴 **削除推奨** | `liveBroadcastContent + publishedAt (DESC)` | 🔴 **未使用** | コード内でクエリなし |
| 🔴 **削除推奨** | `videoType + publishedAt (DESC)` | 🔴 **未使用** | コード内でクエリなし |

##### **users コレクション** (2個の要件)

| 優先度 | インデックス構成 | 現在の状況 | 使用箇所 |
|-------|----------------|-----------|----------|
| 🔴 **高** | `isPublicProfile + createdAt (DESC)` | ✅ **設定済み** | 公開ユーザー一覧 |

##### **favorites サブコレクション** (1個の要件) - Collection Group

| 優先度 | インデックス構成 | 現在の状況 | 使用箇所 |
|-------|----------------|-----------|----------|
| 🟡 **中** | `audioButtonId + createdAt (DESC)` | ⚠️ **未設定** | お気に入り統計・管理者機能 |

##### **contacts コレクション** (2個の要件)

| 優先度 | インデックス構成 | 現在の状況 | 使用箇所 |
|-------|----------------|-----------|----------|
| 🔴 **高** | `status + createdAt (DESC)` | ⚠️ **未設定** | 管理者お問い合わせフィルター |
| 🟡 **中** | `priority + createdAt (DESC)` | ⚠️ **未設定** | 優先度別お問い合わせ管理 |

### 📈 **マイページ不具合対応の成果** (2025-07-19実装完了)

先日報告された「マイページをクリックすると音声ボタン一覧の取得に失敗しました」エラーの修正により、以下の最適化を実装しました：

#### **🔧 実装されたフォールバック戦略**

```typescript
// 複合クエリを試行 → 失敗時はシンプルクエリにフォールバック
try {
  // 最適化されたクエリ（複合インデックス使用）
  let query = firestore.collection("audioButtons")
    .where("createdBy", "==", discordId);
  if (orderBy === "newest" || orderBy === "oldest") {
    query = query.orderBy("createdAt", direction);
  }
  snapshot = await query.get();
} catch (indexError) {
  // フォールバック: 最もシンプルなクエリ
  const simpleQuery = firestore.collection("audioButtons")
    .where("createdBy", "==", discordId);
  snapshot = await simpleQuery.get();
  // クライアントサイドでソート・フィルタリング
}
```

#### **✅ 解決された問題**

1. **複合インデックス不足**: `createdBy + isPublic + orderBy` 組み合わせでインデックスエラー
2. **耐障害性向上**: インデックス未作成時も機能継続
3. **クライアントサイドフィルタリング**: 複合クエリ不要でコスト最適化
4. **型安全性強化**: `FrontendAudioButtonData[]` 明示的型定義

#### **📊 パフォーマンス影響**

- **成功ケース**: 変更なし（既存インデックス使用）
- **フォールバック**: わずかな増加（クライアントサイドソート）
- **障害耐性**: 100%機能継続保証

### ✅ **Terraformインデックス管理統合完了** (2025-07-22)

#### **✅ 完了事項**

1. **重要インデックス4個の追加・インポート完了**:
   - `contacts_status_createdat_desc` (ID: `CICAgLjyrJEK`)
   - `contacts_priority_createdat_desc` (ID: `CICAgOj3gpIJ`)
   - `videos_categoryid_publishedat_desc` (ID: `CICAgNir3tgI`)
   - `videos_categoryid_publishedat_asc` (ID: `CICAgOj35osL`)

2. **サークル・クリエイター機能インデックス追加完了**:
   - `circles_name_workcount_desc`
   - `creatormappings_creatorid_workid`
   - `creatormappings_creatorid_types`
   - `dlsiteworks_circleid_registdate_desc`

3. **terraform apply成功・インフラ安定稼働**:
   ```bash
   # 完了済み操作
   terraform import google_firestore_index.contacts_status_createdat_desc "projects/suzumina-click/databases/(default)/collectionGroups/contacts/indexes/CICAgLjyrJEK"
   terraform import google_firestore_index.contacts_priority_createdat_desc "projects/suzumina-click/databases/(default)/collectionGroups/contacts/indexes/CICAgOj3gpIJ"
   terraform import google_firestore_index.videos_categoryid_publishedat_desc "projects/suzumina-click/databases/(default)/collectionGroups/videos/indexes/CICAgNir3tgI"
   terraform import google_firestore_index.videos_categoryid_publishedat_asc "projects/suzumina-click/databases/(default)/collectionGroups/videos/indexes/CICAgOj35osL"
   terraform apply --auto-approve # SUCCESS
   ```

#### **📊 管理状況**

- **Terraform管理対象**: 20個の複合インデックス
- **インポート完了**: 既存4個の重要インデックス
- **新規追加完了**: サークル・クリエイター4個
- **状態同期**: 完全同期済み
- **本番稼働**: 全機能正常動作中

#### **💰 修正されたコスト影響試算** (月額換算)

| 操作 | インデックス数 | 月額コスト変化 | 累計効果 |
|------|---------------|----------------|----------|
| **追加**: contacts 管理者機能 | +2個 | +$4 | +$4 |
| **追加**: favorites Collection Group | +1個 | +$2 | +$6 |
| **削除**: videos 未使用インデックス | -7個 | -$14 | -$8 |
| **削除**: audioButtons 未使用 | -1個 | -$2 | **-$10** |
| **合計** | **-5個** | **純減 -$10/月** | **年間 -$120 削減** |

**📊 詳細内訳** (2025-07-22更新):
- **videos 削除対象**: videoType(1個) + liveStreamingDetails関連(6個) = 7個
- **audioButtons 削除対象**: startTime未使用(1個) = 1個  
- **videos 保持**: liveBroadcastContent(2個) + categoryId(2個) = 4個 ✅ **実際に使用中**
- **サークル・クリエイター新規追加**: circles(2個) + creatorWorkMappings(3個) + works(1個) = 6個

### 🎯 **実装優先度マトリックス**

#### **🔴 即座に実装 (今週中)**
- サークル・クリエイターシステムインデックス（機能要件）
- `contacts` コレクション管理者インデックス（機能要件）
- 未使用インデックス削除（コスト最適化）

#### **🟡 1ヶ月以内に実装**
- Collection Group `favorites` インデックス（統計機能強化）
- `priceHistory` サブコレクションインデックス（価格履歴機能強化）
- 将来機能用カテゴリフィルターインデックス

#### **🟢 将来検討**
- DLsite作品複合フィルター拡張
- 高度な検索機能対応インデックス

#### ✅ **dlsite_timeseries_raw コレクション** (1個) - v11.0新規追加

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `date + workId + timestamp (ASC)` | [`date`, `workId`, `timestamp`, `__name__`] | ✅ **使用中** | 日次集計処理・時系列データ取得 |

#### ✅ **favorites サブコレクション** (Collection Group) - 新規必要

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `audioButtonId + addedAt (DESC)` | [`audioButtonId`, `addedAt`, `__name__`] | ⚠️ **未作成** | お気に入り一括確認・管理者機能 |

#### ✅ **priceHistory サブコレクション** (Collection Group) - v0.3.4新規追加

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `date (ASC)` | [`date`, `__name__`] | ⚠️ **未設定** | 期間指定価格履歴取得（Server Actions） |
| `date (DESC)` | [`date`, `__name__`] | ⚠️ **未設定** | 最新価格履歴取得（統計計算） |

#### ✅ **circles コレクション** (2個) - v11.6新規追加必要

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `name + workCount (DESC)` | [`name`, `workCount`, `__name__`] | ⚠️ **未設定** | サークル一覧ページ（作品数順） |
| `workCount (DESC)` | [`workCount`, `__name__`] | ⚠️ **未設定** | サークルランキング（将来機能） |

#### ✅ **creatorWorkMappings コレクション** (3個) - v11.6新規追加必要

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `creatorId + workId (ASC)` | [`creatorId`, `workId`, `__name__`] | ⚠️ **未設定** | クリエイター作品検索 |
| `creatorId + types (ARRAY_CONTAINS)` | [`creatorId`, `types`, `__name__`] | ⚠️ **未設定** | クリエイタータイプ別検索 |
| `workId + types (ARRAY_CONTAINS)` | [`workId`, `types`, `__name__`] | ⚠️ **未設定** | 作品からクリエイター検索 |

#### ✅ **works コレクション** (1個) - v11.6新規追加必要

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `circleId + registDate (DESC)` | [`circleId`, `registDate`, `__name__`] | ⚠️ **未設定** | サークル別作品一覧（新着順） |

#### 🔄 **新しく発見されたクエリパターン** (2025年7月12日調査)

**高優先度:**
1. **ユーザー統計再計算**: `audioButtons.where("createdBy", "==", discordId)` ✅ 既存インデックス使用可能
2. **お気に入り一括確認**: Collection Group Query on `favorites` ⚠️ インデックス追加必要
3. **動画年代フィルター**: `videos.where("publishedAt", ">=", startYear).orderBy("publishedAt")` ⚠️ インデックス追加検討

**用途**: 
- 日次集計バッチ処理での効率的な生データ取得
- 特定作品・期間の時系列データ高速検索
- `/api/timeseries/[workId]` APIでの価格履歴取得最適化

### 🔍 実際のクエリパターン分析 (2025年7月12日更新)

#### **audioButtons コレクション** - 最も複雑・高頻度
```typescript
// ✅ 基本一覧・検索（高頻度）
.where("isPublic", "==", true).orderBy("createdAt", "desc")  // 新着順
.where("isPublic", "==", true).orderBy("playCount", "desc")  // 再生数順
.where("isPublic", "==", true).orderBy("likeCount", "desc")  // 人気順

// ✅ 動画別音声ボタン（中頻度）
.where("videoId", "==", videoId).where("isPublic", "==", true).orderBy("createdAt", "desc")
.where("videoId", "==", videoId).where("isPublic", "==", true).orderBy("stats.playCount", "desc")
.where("videoId", "==", videoId).where("isPublic", "==", true).orderBy("stats.likeCount", "desc")

// ✅ タグ検索（中頻度）
.where("tags", "array-contains", tag).where("isPublic", "==", true).orderBy("createdAt", "desc")

// ✅ ユーザー作成ボタン・統計再計算（重要）
.where("createdBy", "==", discordId)  // 全ボタン取得（統計再計算用）
.where("createdBy", "==", discordId).where("isPublic", "==", true)  // 公開のみ

// 🔶 レート制限（現在無効化）
.where("createdBy", "==", discordId).where("createdAt", ">", timestamp)
```

#### **users コレクション**
```typescript
// ✅ 公開ユーザー一覧
.where("isPublicProfile", "==", true).orderBy("createdAt", "desc")

// ✅ 個別ユーザー情報取得
.doc(discordId).get()
```

#### **favorites サブコレクション** - Collection Group
```typescript
// ✅ 個別ユーザーのお気に入り
users/{userId}/favorites.orderBy("addedAt", "desc")

// ⚠️ Collection Group（インデックス不足）
.collectionGroup("favorites").where("audioButtonId", "==", buttonId)  // 一括確認
.collectionGroup("favorites").where("audioButtonId", "in", buttonIds)  // 複数確認
```

#### **videos コレクション** - 基本データ取得
```typescript
// ✅ シンプルクエリ
.doc(videoId).get()  // 個別動画取得
.orderBy("publishedAt", "desc").limit(100)  // 最新動画一覧

// 🔄 新規パターン（年代フィルター）
.where("publishedAt", ">=", startOfYear).where("publishedAt", "<", endOfYear).orderBy("publishedAt", "desc")
```

### 🚨 最適化推奨事項

#### **🔴 削除推奨インデックス** (コスト最適化)

**高優先度削除対象:**

1. **videos コレクション (3個)** - 全て未使用
   - `liveBroadcastContent + publishedAt (ASC/DESC)`
   - `videoType + publishedAt (DESC)`
   
2. **audioButtons コレクション (1個)** - 削除完了済み
   - `isPublic + videoId + startTime (ASC)` - 時間順ソート未実装。terraform で削除完了済み（live 非存在）

**予想コスト削減: 月額約$8 (4インデックス削除)**

#### **🔶 再有効化検討インデックス** (機能要件次第)

**中優先度:**

1. **レート制限機能復活時**
   - `createdBy + createdAt (ASC)` - 範囲クエリ用

2. **ユーザープロフィール機能拡張時**
   - `createdBy + isPublic + createdAt (DESC/ASC)`
   - `createdBy + isPublic + playCount (DESC)`

#### **➕ 新規追加推奨インデックス**

**高優先度 (Terraform設定済み):**

```bash
# Collection Group favoritesインデックス
terraform apply -target=google_firestore_index.favorites_audiobuttonid_addedat_desc

# 動画年代フィルター用
terraform apply -target=google_firestore_index.videos_publishedat_range_desc
```

**中優先度 (将来機能用):**

- DLsite作品の複合フィルター
- Cloud Functions専用の失敗分析インデックス

#### **📊 コスト影響試算**
- **削除済み**: 旧 audioReferences インデックス 2個
- **削除推奨**: 未使用インデックス 6個 → **月額約$12削減**
- **追加推奨**: 必要インデックス 2個 → 月額約$4增加
- **純減**: 月額約$8コスト削減効果

## データ収集パターン

1. **YouTubeビデオ**: 毎時30分（`30 * * * *`）にCloud Scheduler → Pub/Sub → `fetchYouTubeVideos` Cloud Function 経由で取得
2. **DLsite統合データ収集**: 2時間ごと（`3 */2 * * *`）にCloud Scheduler → Pub/Sub → `fetchDLsiteUnifiedData` Cloud Function 経由で取得。`works` / `circles` / `creatorWorkMappings` / `works/{workId}/priceHistory` に保存
3. **データ整合性チェック**: 毎週日曜3:00 JST（`0 3 * * 0`）に `checkDataIntegrity` が自動実行。結果は `dlsiteMetadata/dataIntegrityCheck` に保存
4. **データ処理**: Firestore書き込みでは500ドキュメントのバッチ操作制限を使用・チャンク分割対応
5. **型安全性**: すべてのデータ構造でZodスキーマを使用してサーバー/クライアント形式間の変換と検証を実施

## アクセスパターン

- **パブリック読み取り**: `videos`、`works`、公開`audioButtons`
- **管理者書き込み**: `videos`と`works`はCloud Functionsのみが書き込み可能
- **ユーザー制御**: `audioButtons`はServer Actionsで作成・更新・削除（実装完了、運用準備完了）
- **認証制御**: `audioButtons`、`users`、`favorites`コレクション（実装完了）
- **お気に入り機能**: `users/{userId}/favorites`サブコレクション（実装完了）
- **セキュリティルール**: Terraform管理のFirestoreセキュリティルールで実装

### 🔧 インデックス管理

#### **インデックス監視方法**
```bash
# 現在のインデックス一覧取得
gcloud firestore indexes composite list --format="table(name.segment(-3):label=COLLECTION,fields[].fieldPath:label=FIELDS,state)"

# 特定コレクションのインデックス確認
gcloud firestore indexes composite list --filter="collectionGroup:audioButtons"

# インデックス削除（例）
gcloud firestore indexes composite delete projects/suzumina-click/databases/\(default\)/collectionGroups/audioButtons/indexes/INDEX_ID
```

#### **Terraform管理**
- **設定ファイル**: `terraform/firestore_indexes.tf`
- **適用**: `terraform apply -target=google_firestore_index.INDEX_NAME`
- **インポート**: `terraform import google_firestore_index.INDEX_NAME projects/PROJECT/databases/(default)/collectionGroups/COLLECTION/indexes/INDEX_ID`

### 🎯 パフォーマンス最適化

#### **クエリ最適化戦略**
- **ページネーション**: 全クエリで `startAfter()` + `limit()` 使用
- **クライアントサイドフィルター**: タグ・検索テキストフィルターで複合インデックス不要
- **バッチ操作**: ユーザー統計更新で `FieldValue.increment()` 使用
- **キャッシュ戦略**: `revalidatePath()` でISRキャッシュ無効化
- **レート制限**: 24時間でユーザーあたり20回作成制限

#### ✅ **evaluations コレクション** (3個 - 実装完了対応)

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `userId + evaluationType + updatedAt (DESC)` | [`userId`, `evaluationType`, `updatedAt`, `__name__`] | ✅ **使用中** | ユーザー別評価一覧・マイページ |
| `workId + evaluationType` | [`workId`, `evaluationType`, `__name__`] | ✅ **使用中** | 作品別評価集計（統計用） |
| `evaluationType + updatedAt (DESC)` | [`evaluationType`, `updatedAt`, `__name__`] | ✅ **使用中** | 評価タイプ別一覧（管理者機能） |

**クエリパターン**:
```typescript
// ユーザーの全評価取得
.where("userId", "==", userId).orderBy("updatedAt", "desc")

// 作品の評価統計
.where("workId", "==", workId).where("evaluationType", "==", type)

// 10選評価のみ取得
.where("userId", "==", userId).where("evaluationType", "==", "top10")
```

### 📋 定期メンテナンスタスク

#### **月次タスク** (コスト最適化)

- [ ] インデックス使用状況の確認
- [ ] 新しいクエリパターンのチェック
- [ ] 未使用インデックスの洗い出し

#### **機能追加時タスク**

- [ ] 新しいFirestoreクエリのインデックス必要性算定
- [ ] パフォーマンステスト実施
- [ ] このドキュメントの更新

#### **緊急時タスク**

- [ ] インデックスエラー発生時の緊急対応
- [ ] クエリパフォーマンス問題の特定


#### **音声ボタンアクセスパターン詳細**
- **読み取り**: 公開音声ボタン（`isPublic: true`）は誰でも読み取り可能
- **非公開読み取り**: 非公開音声ボタンは作成者のみ読み取り可能（Discord認証）
- **書き込み**: Next.js Server Actionsのみで操作（型安全・認証済み）
- **レート制限**: ユーザーあたり1日20個の作成制限
- **重複チェック**: 同一動画・時間範囲での重複防止

## 型定義の場所

- **共有型定義**: `packages/shared-types/src/`
  - **エンティティ**: `packages/shared-types/src/entities/` (DLsiteWork, Circle, Creator等)
  - **Value Objects**: `packages/shared-types/src/value-objects/` (PriceInfo, RatingInfo, FileInfo等)
  - **APIスキーマ**: `packages/shared-types/src/api-schemas/` (DLsite APIレスポンス型)
  - **ユーティリティ**: `packages/shared-types/src/utilities/` (Firestore変換関数等)
- **マッパー**: `apps/functions/src/services/mappers/` (APIレスポンス→エンティティ変換)
- **Firestore変換ユーティリティ**: `packages/shared-types/src/utilities/firestore-utils.ts`
- **Zodスキーマ**: 各型定義ファイル内で定義

### 音声ボタン関連型定義 (2025年7月5日テストカバレッジ修正対応):
- **`audio-button.ts`**: 音声ボタンの全型定義とZodスキーマ
- **`favorite.ts`**: お気に入りシステムの全型定義とZodスキーマ
  - `FirestoreAudioButtonData`: Firestore保存用
  - `FrontendAudioButtonData`: フロントエンド表示用 (テストで使用)
  - `CreateAudioButtonInput`: 音声ボタン作成用
  - `AudioButtonQuery`: 検索・フィルター用
  - `AudioFileUploadInfo`: ファイルアップロード用
- **型変換関数**: `convertToFrontendAudioButton()` - Firestore → フロントエンド変換
- **シリアライズ関数**: RSC/RCC間の安全なデータ渡し用
- **テスト型修正**: `FrontendAudioButtonData`型使用・`sourceVideoId`フィールド対応・必須フィールド追加

---

## 🚀 パフォーマンス最適化結果（2025年7月実装）

### Server Actions統合による効果

1. **レスポンス時間改善**:
   - audioButtonsクエリ: 200-300ms → 100-150ms
   - 検索クエリ: 150-250ms → 50-100ms
   - 統合検索: Promise.allSettled + 3秒タイムアウト対応

2. **API Routes最適化**:
   - 維持対象: 6エンドポイント（認証・監視・プロキシ）
   - Server Actions移行対象: 3エンドポイント（データ操作）
   - オーバーヘッド削減と型安全性向上

3. **パフォーマンス監視強化**:
   - サンプリング率: 10% → 20%
   - P99レイテンシ目標: < 1.5秒
   - リアルタイムエラーハンドリング

### 期待される効果

- **API応答時間**: 30%以上短縮
- **開発効率**: API Routeパラメータ解析コード削除
- **型安全性**: 直接関数呼び出しによる向上
- **メンテナンス性**: Server Actions統一による一貫性

## 📅 データ構造変更ログ

### 2025-07-24 v11.7 Entity/Value Object移行完了・レガシーフィールド削除

**実行した操作**:
- ✅ **Entity/Value Objectアーキテクチャ移行**: DLsiteWorkエンティティとValue Object分離完了
- ✅ **レガシーフィールド削除**: 以下のフィールドをworksコレクションから完全削除:
  - `totalDownloadCount`: 総DL数（未使用）
  - `bonusContent`: 特典情報（低頻度アクセス）
  - `isExclusive`: 独占配信フラグ（未使用）
  - `apiGenres`: API標準ジャンル情報（未使用）
  - `apiCustomGenres`: APIカスタムジャンル情報（未使用）
  - `apiWorkOptions`: API作品オプション情報（未使用）
  - `wishlistCount`: ウィッシュリスト数（未使用）
- ✅ **Value Object型定義**: PriceInfo, RatingInfo, FileInfoをValue Objectとして明確化
- ✅ **shared-types更新**: エンティティ/Value Object構造に対応した型定義整理
- ✅ **マッパー実装**: DLsite APIレスポンスからエンティティへの変換ロジック分離

**技術的特徴**:
- ✅ **ドメイン駆動設計**: ビジネスロジックをエンティティに集約
- ✅ **不変性保証**: Value Objectによる安全なデータ操作
- ✅ **メンテナンス性向上**: 未使用フィールド削除によるコードベース簡素化
- ✅ **パフォーマンス最適化**: 不要データ削除によるFirestoreストレージ削減

### 2025-07-22 v11.6 サークル・クリエイターシステム実装完了・データ収集基盤統合完了

**実行した操作**:
- ✅ **サークル・クリエイター情報収集**: `circles`・`creatorWorkMappings`コレクション新規追加
- ✅ **works拡張**: `circleId`フィールド統合・サークル情報参照対応
- ✅ **Individual Info API統合**: maker_id/maker_name/creaters自動抽出・バッチ処理対応
- ✅ **Fire-and-Forget実装**: メイン処理に影響しないサークル・クリエイター情報更新
- ✅ **非正規化データ設計**: 効率的クエリのためのcreatorWorkMappings最適化
- ✅ **shared-types拡張**: CircleData・CreatorWorkMapping・CreatorType型定義完備

**実装された機能**:
- ✅ **fetchDLsiteWorksIndividualAPI統合**: サークル・クリエイター収集の本番環境適用
- ✅ **バッチ収集処理**: `batchCollectCircleAndCreatorInfo`による効率的大量データ処理
- ✅ **複数役割対応**: 1クリエイターが複数role（voice/illustration/scenario/music/other）担当可能
- ✅ **重複処理防止**: 同一クリエイター・作品ペアの統合管理・types配列統合
- ✅ **統計情報管理**: workCountによるサークル作品数追跡・自動更新

**技術的特徴**:
- ✅ **100% API-Only**: Individual Info API専用・スクレイピング不使用
- ✅ **エラー耐性**: サークル・クリエイター収集エラー時もメイン処理継続
- ✅ **型安全性**: Zodスキーマによる入力検証・shared-types活用
- ✅ **バッチ最適化**: Firestore 500操作制限対応・100作品ずつ処理
- ✅ **ログ統合**: 構造化ログによる収集状況追跡・統計情報表示

### 2025-07-19 v11.4 完全実装状況調査・Terraformインデックス管理統合・正確なコスト最適化完了

**実行した操作**:
- ✅ **全コレクション実装状況調査**: videos/works/audioButtons/contacts/favorites 全機能実装状況確認
- ✅ **Terraform管理統合**: 複合インデックス定義の過不足分析・未使用11個特定・必要3個追加
- ✅ **正確なコスト最適化**: 年間$120削減（当初$24から修正）・削除8個/追加3個の詳細計画
- ✅ **動画フィルター機能確認**: liveBroadcastContent・categoryIdインデックスが実際に使用中と判明
- ✅ **作品一覧設計思想確認**: worksは全件取得+クライアントサイドフィルタリング方式
- ✅ **実装状況ドキュメント化**: 各コレクションの実際のクエリパターンと使用状況を正確に記録

**重要な発見・修正**:
- ✅ **videos インデックス見直し**: 当初「削除推奨」とした4個が実際には使用中（重大な誤分析修正）
- ✅ **works インデックス不要**: 複合クエリを使用せず全件取得方式のため既存インデックス未使用
- ✅ **audioButtons 最適化済み**: 8個が適切に使用中・フォールバック戦略で障害耐性確保
- ✅ **コスト試算修正**: $24/年 → $120/年削減（5倍の効果）・詳細内訳提供
- ✅ **Terraform設定完備**: 即座適用可能な追加・削除コマンド・管理方針策定

### 2025-07-12 v11.2 ユーザー統計再計算機能・Firestoreインデックス最適化完了

**実行した操作**:
- ✅ ユーザー統計再計算機能実装: 管理者向け統計修正・集計バグ解決
- ✅ Firestoreクエリパターン全調査: apps/web・apps/functions・apps/admin全域分析
- ✅ インデックス使用状況最新化: 11個audioButtonsインデックス・3個無効化中特定
- ✅ 新規クエリパターン対応: Collection Group favorites・動画年代フィルター分析
- ✅ コスト最適化計画更新: 未使用インデックス4個削除で月額$8削減見込み
- ✅ FIRESTORE_STRUCTURE.md大幅更新: 最新クエリパターン・インデックス状況反映

**解決した問題**:
- ✅ ユーザー統計不整合: 17個ボタン→「1個」表示バグを管理者機能で修正可能に
- ✅ `recalculateUserStats`実装: 実際のFirestoreデータから正確な統計再計算
- ✅ インデックス監視精度向上: 使用中8個・無効化3個・未使用1個の詳細分析
- ✅ 将来機能対応: Collection Group・年代フィルター用インデックス要件特定

### 2025-07-12 v11.1 パフォーマンス最適化・Server Actions統合・P99レイテンシ改善完了

**実行した操作**:
- ✅ Next.js Turbopack永続キャッシュ最適化: ビルド時間短縮・開発体験向上
- ✅ API統合検索タイムアウト対応: Promise.allSettled + 3秒タイムアウトによる耐障害性向上
- ✅ パフォーマンス監視強化: サンプリング率20%・P99レイテンシ1.5秒目標設定
- ✅ API Routes分析・移行計画策定: 9エンドポイント分析・3エンドポイントServer Actions移行対象特定
- ✅ アーキテクチャドキュメント更新: CLAUDE.md・DEVELOPMENT.md・FIRESTORE_STRUCTURE.md最新化

**解決した問題**:
- ✅ P99レスポンス時間: 2秒超過 → 1.5秒以下目標達成見込み
- ✅ API呼び出し耐障害性: 部分エラー時も部分結果返却対応
- ✅ 開発効率向上: Turbopack最適化による高速ビルド
- ✅ 監視精度向上: 詳細パフォーマンスデータ収集

### 2025-07-10 v11.0時系列データ基盤・タイムアウト最適化・コスト最適化実装完了

**実行した操作**:
- ✅ 時系列データコレクション追加: `dlsite_timeseries_raw`・`dlsite_timeseries_daily`
- ✅ 統合メタデータ構造強化: `UnifiedDataCollectionMetadata`型対応
- ✅ 15分間隔データ収集: 高頻度時系列データ取得による精度向上
- ✅ 日次集計システム: 生データ→永続保存・価格履歴API高速化
- ✅ タイムアウト最適化: 並列処理最適化により100%処理成功保証
- ✅ Firestoreインデックス最適化: 時系列データアクセス用インデックス追加

**解決した問題**:
- ✅ DLsiteデータ処理成功率: 77.1% → 100%完全改善
- ✅ 時系列データ長期保存: 7日間制限→永続保存による詳細分析対応
- ✅ 価格履歴API高速化: 集計済みデータによる高速応答
- ✅ インフラコスト最適化: 自動ライフサイクル管理による継続的コスト削減

### 2025-07-08 DLsiteサムネイル表示システム完全修正・画像プロキシ強化

**実行した操作**:
- ✅ 画像プロキシ500エラー根本解決: `/api/image-proxy` エンドポイント機能強化
- ✅ プロトコル相対URL処理: `//img.dlsite.jp/...` → `https://img.dlsite.jp/...` 自動変換
- ✅ highResImageUrl型統一: WorkDetail・WorkCard・SearchPageContent・actions.ts 型安全修正
- ✅ HTTP→HTTPS強制変換: セキュリティ向上・CORS問題完全解決
- ✅ extractImageUrl関数活用: 型安全データ変換の徹底

**解決した問題**:
- ✅ DLsite画像表示の500エラー完全解消
- ✅ TypeScript strict mode完全パス (`pnpm typecheck` エラー0個)
- ✅ 画像表示機能の完全正常化・本番環境動作確認完了
- ✅ 既存機能・テストスイートの完全保持

### 2025-07-05 WorkDocument完全統合・テストカバレッジ修正完了

**実行した操作**:
- ✅ `WorkDocument` 統合データ構造への完全移行（当時は`OptimizedFirestoreDLsiteWorkData`として実装）
- ✅ 下位互換性コード削除: 旧 `FirestoreDLsiteWorkData` 関連コード・テスト・インポートの完全削除
- ✅ 存在しないフィールド削除: `design`・`otherCreators`・`userEvaluationCount`・`basicInfo` 参照除去
- ✅ テストカバレッジ修正: shared-types(50%)・functions(78%) 適正閾値設定
- ✅ テストデータ修正: `FrontendAudioButtonData`型対応・`sourceVideoId`フィールド統一

**解決した問題**:
- ✅ `pnpm test:coverage` 全パッケージ成功
- ✅ TypeScript strict mode 完全パス (0エラー)
- ✅ 703+件テストスイート全成功
- ✅ 不要コード削除によるメンテナンス性向上

---

## 📅 インデックス分析ログ

### 2025-06-29 createdBy インデックス設定完了

**実行した操作**:
- ✅ `audiobuttons_uploadedby_createdat_desc` インデックスを Terraform で追加
- ✅ 既存インデックス（ID: CICAgOi3voUL）を Terraform にインポート
- ✅ 音声ボタン作成時の FAILED_PRECONDITION エラーを修正
- ✅ ドキュメントを最新状態に更新

**解決した問題**:
- ✅ レート制限クエリ `.where("createdBy", "==", userId).where("createdAt", ">", date)` が正常動作
- 🔴 → ✅ 音声ボタン作成時の Firestore インデックスエラーを解消

**現在の状況**:
- **インデックス総数**: 12個（audioButtons: 8個、videos: 3個、users: 2個）
- **未使用インデックス**: 依然として 6個が削除推奨状態
- **必要インデックス**: `sourceVideoId + createdAt` が 1個残り（※当時の記録。フィールドは後に `videoId` へ改称済み）

### 2025-06-28 お気に入りシステム実装完了

**実行した操作**:
- ✅ `users/{userId}/favorites` サブコレクション実装完了
- ✅ FavoriteButton コンポーネント実装完了
- ✅ Server Actions (お気に入り登録/削除) 実装完了
- ✅ Firestore セキュリティルール更新完了

### 2025-06-25 audioReferences → audioButtons 統合完了

**実行した操作**:
- ✅ audioReferences コレクションのインデックス 2個を手動削除
- ✅ audioButtons コレクションのインデックス 7個を確認（全て READY）
- ✅ `apps/web/src/` 全体のFirestoreクエリパターンを網羅的調査

**発見した問題**:
- ✅ `createdBy` フィールド用インデックスが作成済み（レート制限クエリで使用）
- 🔴 `sourceVideoId` 用インデックスが未作成（動画別表示で使用）※当時の記録。現行は `videoId` で作成済み（2026-06-13 live 確認）
- 🔴 videos コレクションの 3個のインデックスが完全未使用
- 🔴 audioButtons コレクションの 3個のインデックスが未使用

**コスト最適化機会**:
- **現在の月額コスト**: 11インデックス × 約$2 = 約$22/月
- **最適化後**: 7インデックス × 約$2 = 約$14/月 (約$8/月削減)

**推奨アクション**:
1. 未使用インデックス 6個の削除
2. 必要インデックス 2個の追加
3. 定期的なインデックス使用状況監視

**監視方法**:

```bash
# 毎月実行推奨
gcloud firestore indexes composite list --format="table(name.segment(-3):label=COLLECTION,fields[].fieldPath:label=FIELDS,state)"

# クエリパターン変更時のチェック
grep -r "\.where\|.orderBy" apps/web/src/ --include="*.ts" | grep -v test
```