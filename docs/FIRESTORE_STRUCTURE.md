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
  sourceVideoId: string,              // YouTube動画ID（videosコレクション参照）
  videoTitle: string,                 // 動画タイトル
  startTime: number,                  // 開始時刻（秒）
  endTime: number,                    // 終了時刻（秒）
  duration: number,                   // 再生時間（秒）

  // 分類・メタデータ
  tags?: string[],                    // タグ配列（最大10個、各タグ最大20文字）
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
- **タグ制限**: 最大10個、各タグ最大20文字

**セキュリティルール**:
- **読み取り**: 公開音声ボタンは誰でも読み取り可能、非公開は作成者のみ
- **作成・更新・削除**: 現在はServer Actionsのみで操作

## 計画中のコレクション（将来実装予定）

### 6. `users` コレクション

**目的**: ユーザープロファイルと設定

**サブコレクション**: `favorites` - ユーザーのお気に入り音声参照

### 7. ~~`audioButtons` コレクション~~ ✅ **実装完了**

~~**目的**: 実音声ファイル機能（将来検討・法的評価後）~~

**✅ 実装完了**: 上記 `audioButtons` コレクションでYouTube参照統合システムとして実装済み

## Firestore 複合インデックス

> **最終更新**: 2025-06-26 | **インデックス総数**: 12個（全て READY 状態）
> 
> **分析対象**: `apps/web/src/` のFirestoreクエリパターンを網羅的に調査

### 📊 現在のインデックス状況（Google Cloud Firestore）

#### ✅ **audioButtons コレクション** (8個)

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `createdBy + createdAt (DESC)` | [`createdBy`, `createdAt`, `__name__`] | 🔴 **未使用** | レート制限で `uploadedBy` を使用 |
| `uploadedBy + createdAt (DESC)` | [`uploadedBy`, `createdAt`, `__name__`] | ✅ **使用中** | レート制限チェック（音声ボタン作成時） |
| `isPublic + createdAt (DESC)` | [`isPublic`, `createdAt`, `__name__`] | ✅ **使用中** | `getAudioButtons()` - 基本一覧 |
| `isPublic + likeCount (DESC)` | [`isPublic`, `likeCount`, `__name__`] | ✅ **使用中** | 人気順ソート (`sortBy: "popular"`) |
| `isPublic + playCount (DESC)` | [`isPublic`, `playCount`, `__name__`] | ✅ **使用中** | 再生数順ソート (`sortBy: "mostPlayed"`) |
| `isPublic + category + createdAt (DESC)` | [`isPublic`, `category`, `createdAt`, `__name__`] | ✅ **使用中** | カテゴリフィルター |
| `isPublic + sourceVideoId + startTime (ASC)` | [`isPublic`, `sourceVideoId`, `startTime`, `__name__`] | 🔴 **未使用** | `startTime` での並び替えなし |
| `tags (CONTAINS) + isPublic + createdAt (DESC)` | [`tags`, `isPublic`, `createdAt`, `__name__`] | 🔴 **未使用** | タグフィルターはクライアントサイド |

**✅ 作成済みインデックス**:
- `uploadedBy + createdAt (DESC)` - レート制限用（2025-06-26 作成完了）

**⚠️ 必要なインデックス（未作成）**:
```hcl
# 動画別音声ボタン一覧用
resource "google_firestore_index" "audiobuttons_sourcevideoid_createdat_desc" {
  collection = "audioButtons"
  fields {
    field_path = "sourceVideoId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}
```

#### ✅ **videos コレクション** (3個)

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `liveBroadcastContent + publishedAt (ASC)` | [`liveBroadcastContent`, `publishedAt`, `__name__`] | 🔴 **未使用** | コード内でクエリなし |
| `liveBroadcastContent + publishedAt (DESC)` | [`liveBroadcastContent`, `publishedAt`, `__name__`] | 🔴 **未使用** | コード内でクエリなし |
| `videoType + publishedAt (DESC)` | [`videoType`, `publishedAt`, `__name__`] | 🔴 **未使用** | コード内でクエリなし |

**必要なインデックス（未作成）**:
- 現在のクエリパターンでは追加インデックス不要

#### ✅ **users コレクション** (2個)

| インデックス | フィールド | 使用状況 | 使用箇所 |
|-------------|------------|----------|----------|
| `isPublicProfile + createdAt (DESC)` | [`isPublicProfile`, `createdAt`, `__name__`] | ✅ **使用中** | 管理者画面ユーザー一覧 |
| `isPublicProfile + role + lastLoginAt (DESC)` | [`isPublicProfile`, `role`, `lastLoginAt`, `__name__`] | ✅ **使用中** | 管理者画面フィルター |

### 🔍 実際のクエリパターン分析

#### **audioButtons コレクション**
```typescript
// ✅ 使用中のクエリ
.where("isPublic", "==", true).orderBy("createdAt", "desc")  // 基本一覧
.where("isPublic", "==", true).where("category", "==", category).orderBy("createdAt", "desc")  // カテゴリフィルター
.where("isPublic", "==", true).orderBy("likeCount", "desc")  // 人気順
.where("isPublic", "==", true).orderBy("playCount", "desc")  // 再生数順
.where("isPublic", "==", true).where("sourceVideoId", "==", videoId)  // 動画別（ソートなし）

// ✅ インデックス対応済み
.where("uploadedBy", "==", userId).where("createdAt", ">", date)  // レート制限チェック (2025-06-26 対応完了)

// ⚠️ インデックス不足のクエリ  
.where("sourceVideoId", "==", videoId)  // 重複チェック
```

#### **videos コレクション**
```typescript
// ✅ 使用中のクエリ（シンプルクエリのみ）
.doc(videoId).get()  // ID による取得
.collection("videos").get()  // 全件取得（少数のため）
```

#### **users コレクション**
```typescript
// ✅ 使用中のクエリ
.where("isPublicProfile", "==", true).orderBy("createdAt", "desc")  // 公開ユーザー一覧
.where("isPublicProfile", "==", true).where("role", "==", role).orderBy("lastLoginAt", "desc")  // 管理者フィルター
```

### 🚨 最適化推奨事項

#### **🗑️ 削除推奨インデックス**（コスト最適化）

```bash
# 1. audioButtons - createdBy → uploadedBy フィールド使用のため不要
gcloud firestore indexes composite delete \
  projects/suzumina-click/databases/\(default\)/collectionGroups/audioButtons/indexes/CICAgOi3voUJ

# 2. audioButtons - startTime 並び替えなしのため不要  
gcloud firestore indexes composite delete \
  projects/suzumina-click/databases/\(default\)/collectionGroups/audioButtons/indexes/CICAgJjmiJEK

# 3. audioButtons - クライアントサイドフィルターのため不要
gcloud firestore indexes composite delete \
  projects/suzumina-click/databases/\(default\)/collectionGroups/audioButtons/indexes/CICAgOi3kJAK

# 4-6. videos - コード内でクエリなしのため全て不要
gcloud firestore indexes composite delete \
  projects/suzumina-click/databases/\(default\)/collectionGroups/videos/indexes/CICAgNi47oMK
gcloud firestore indexes composite delete \
  projects/suzumina-click/databases/\(default\)/collectionGroups/videos/indexes/CICAgJiUsZIK  
gcloud firestore indexes composite delete \
  projects/suzumina-click/databases/\(default\)/collectionGroups/videos/indexes/CICAgJiH2JAK
```

#### **➕ 追加推奨インデックス**
```bash
# 高頻度クエリ用インデックスをTerraformで追加
# ✅ 完了: terraform apply -target=google_firestore_index.audiobuttons_uploadedby_createdat_desc (2025-06-26)
terraform apply -target=google_firestore_index.audiobuttons_sourcevideoid_createdat_desc  
```

#### **📊 コスト影響試算**
- **削除済み**: 旧 audioReferences インデックス 2個
- **削除推奨**: 未使用インデックス 6個 → **月額約$12削減**
- **追加推奨**: 必要インデックス 2個 → 月額約$4增加
- **純減**: 月額約$8コスト削減効果

## データ収集パターン

1. **YouTubeビデオ**: 毎時19分にCloud Scheduler → Pub/Sub → Cloud Function経由で取得
2. **DLsite作品**: 10分間隔でCloud Scheduler → Pub/Sub → Cloud Function経由で取得
3. **データ処理**: Firestore書き込みでは500ドキュメントのバッチ操作制限を使用
4. **型安全性**: すべてのデータ構造でZodスキーマを使用してサーバー/クライアント形式間の変換と検証を実施

## アクセスパターン

- **パブリック読み取り**: `videos`、`dlsiteWorks`、公開`audioButtons`
- **管理者書き込み**: `videos`と`dlsiteWorks`はCloud Functionsのみが書き込み可能
- **ユーザー制御**: `audioButtons`はServer Actionsで作成・更新・削除（実装完了、運用準備完了）
- **認証制御**: `audioButtons`と`users`コレクション（実装完了）
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

---

## 📅 インデックス分析ログ

### 2025-06-26 uploadedBy インデックス追加完了

**実行した操作**:
- ✅ `audiobuttons_uploadedby_createdat_desc` インデックスを Terraform で追加
- ✅ 既存インデックス（ID: CICAgOi3voUL）を Terraform にインポート
- ✅ 音声ボタン作成時の FAILED_PRECONDITION エラーを修正
- ✅ ドキュメントを最新状態に更新

**解決した問題**:
- 🔴 → ✅ レート制限クエリ `.where("uploadedBy", "==", userId).where("createdAt", ">", date)` が正常動作
- 🔴 → ✅ 音声ボタン作成時の Firestore インデックスエラーを解消

**現在の状況**:
- **インデックス総数**: 12個（audioButtons: 8個、videos: 3個、users: 2個）
- **未使用インデックス**: 依然として 6個が削除推奨状態
- **必要インデックス**: `sourceVideoId + createdAt` が 1個残り

### 2025-06-25 audioReferences → audioButtons 統合完了

**実行した操作**:
- ✅ audioReferences コレクションのインデックス 2個を手動削除
- ✅ audioButtons コレクションのインデックス 7個を確認（全て READY）
- ✅ `apps/web/src/` 全体のFirestoreクエリパターンを網羅的調査

**発見した問題**:
- 🔴 `uploadedBy` フィールド用インデックスが未作成（レート制限クエリで高頻度使用）
- 🔴 `sourceVideoId` 用インデックスが未作成（動画別表示で使用）
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