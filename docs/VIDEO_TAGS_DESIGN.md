# VIDEO_TAGS_DESIGN

> **📅 最終更新**: 2025年7月17日  
> **📝 ステータス**: Phase 3完了 - 3層タグシステムUI実装完了  
> **🔧 対象**: videosコレクションへのタグ機能実装  
> **🆕 更新内容**: Phase 1-3実装完了、3層タグ表示システム稼働開始

## 概要

videosコレクションに3層タグシステムを実装するための設計文書

### 3層タグシステム

1. **自動タグ（プレイリストベース）** - YouTube プレイリストから自動生成
2. **自動タグ（カテゴリID）** - YouTube カテゴリIDから自動生成  
3. **手動タグ（ユーザー編集可能）** - 登録ユーザーが自由に編集

## タグデータ構造設計

### videosコレクションの拡張

#### 追加フィールド

```typescript
interface VideoDocument {
  // ... 既存フィールド
  
  // 【3層タグシステム】
  
  // 1. 自動タグ（プレイリストベース）- 新規追加
  playlistTags?: string[];           // YouTubeプレイリスト名から自動生成
  
  // 2. 自動タグ（カテゴリID）- 既存フィールドを活用
  categoryId?: string;               // YouTube投稿者が選択したカテゴリ（数値ID）
  
  // 3. 手動タグ（ユーザー編集可能）- 新規追加
  userTags: string[];                // 登録ユーザーが編集可能なタグ配列
}
```

### タグ制約

#### プレイリストタグ制約

```typescript
// 自動生成のため制約は最小限
playlistTags: z
  .array(z.string().min(1).max(50))  // プレイリスト名は長い場合があるため50文字
  .max(20, {                         // 最大20個のプレイリストまで
    message: "プレイリストタグは最大20個まで",
  })
  .optional()
  .default([]),
```

#### ユーザータグ制約（音声ボタンと同じ）

```typescript
// shared-types/src/video.ts に追加
userTags: z
  .array(z.string().min(1).max(30))
  .max(15, {
    message: "ユーザータグは最大15個まで設定できます",
  })
  .default([]),
```


### プレイリストタグ実装

#### 既存fetchYoutubeVideos関数との統合

```typescript
// apps/functions/src/services/youtube/youtube-api.ts への追加

/**
 * チャンネルのプレイリスト一覧を取得
 * 既存のクォータ管理システムを活用
 */
export async function fetchChannelPlaylists(
  youtube: youtube_v3.Youtube,
  channelId: string,
): Promise<PlaylistInfo[]> {
  // クォータチェック
  if (!canExecuteOperation("playlists")) {
    throw new Error("YouTube APIクォータが不足しています");
  }

  try {
    const response = await youtube.playlists.list({
      part: ["snippet", "contentDetails"],
      channelId: channelId,
      maxResults: 50,
    });

    // 成功時にクォータ使用量を記録
    recordQuotaUsage("playlists");
    getYouTubeQuotaMonitor().logQuotaUsage("playlists", 1, {
      channelId,
      resultCount: response.data.items?.length || 0,
    });

    return (
      response.data.items?.map((playlist) => ({
        id: playlist.id || "",
        title: playlist.snippet?.title || "",
        videoCount: playlist.contentDetails?.itemCount || 0,
        description: playlist.snippet?.description || "",
        publishedAt: playlist.snippet?.publishedAt || "",
      })) || []
    );
  } catch (error: unknown) {
    logger.error("プレイリスト取得エラー:", error);
    throw error;
  }
}

/**
 * プレイリストの動画一覧を取得
 * 既存のページネーション処理パターンを活用
 */
export async function fetchPlaylistItems(
  youtube: youtube_v3.Youtube,
  playlistId: string,
): Promise<string[]> {
  const videoIds: string[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;

  do {
    // クォータチェック
    if (!canExecuteOperation("playlistItems")) {
      logger.warn("プレイリストアイテム取得でクォータ不足", {
        playlistId,
        pageCount,
        currentVideoIds: videoIds.length,
      });
      break;
    }

    try {
      const response = await youtube.playlistItems.list({
        part: ["contentDetails"],
        playlistId: playlistId,
        maxResults: MAX_VIDEOS_PER_BATCH, // 既存の定数を活用
        pageToken: nextPageToken,
      });

      // 成功時にクォータ使用量を記録
      recordQuotaUsage("playlistItems");
      getYouTubeQuotaMonitor().logQuotaUsage("playlistItems", 1, {
        playlistId,
        pageNumber: pageCount + 1,
        resultCount: response.data.items?.length || 0,
      });

      const items = response.data.items || [];
      const batchVideoIds = items
        .map((item) => item.contentDetails?.videoId)
        .filter((id): id is string => !!id);

      videoIds.push(...batchVideoIds);
      nextPageToken = response.data.nextPageToken;
      pageCount++;

      logger.debug(`プレイリスト ${playlistId} ページ ${pageCount}: ${batchVideoIds.length}件取得`);
    } catch (error: unknown) {
      logger.error("プレイリストアイテム取得エラー:", error);
      break;
    }
  } while (nextPageToken);

  logger.info(`プレイリスト ${playlistId} 総取得動画数: ${videoIds.length}件`);
  return videoIds;
}

// 型定義の追加
interface PlaylistInfo {
  id: string;
  title: string;
  videoCount: number;
  description: string;
  publishedAt: string;
}

interface PlaylistVideoMapping {
  videoId: string;
  playlistTitles: string[];
}
```

#### クォータ管理システムの拡張

```typescript
// apps/functions/src/infrastructure/monitoring/youtube-quota-monitor.ts への追加

export const QUOTA_COSTS = {
  // 既存の定義...
  search: 100,
  videosFullDetails: 8,
  
  // プレイリスト関連の追加
  playlists: 1,           // playlists.list
  playlistItems: 1,       // playlistItems.list
} as const;
```

### YouTubeカテゴリID活用

```typescript
// 既存データの活用（実装済み）- 日本語化対応
const YOUTUBE_CATEGORIES = {
  "1": "映画・アニメ",              // Film & Animation
  "2": "自動車・乗り物",            // Autos & Vehicles
  "10": "音楽",                   // Music - 歌配信・音楽関連
  "15": "ペット・動物",             // Pets & Animals
  "17": "スポーツ",                // Sports
  "18": "短編映画",                // Short Movies
  "19": "旅行・イベント",            // Travel & Events
  "20": "ゲーム",                  // Gaming - ゲーム配信
  "21": "ブログ",                  // Videoblogging
  "22": "一般・ブログ",             // People & Blogs - 雑談配信
  "23": "コメディ",                // Comedy
  "24": "エンターテイメント",        // Entertainment
  "25": "ニュース・政治",           // News & Politics
  "26": "ハウツー・スタイル",        // Howto & Style
  "27": "教育",                   // Education
  "28": "科学・技術",              // Science & Technology
  "29": "非営利・社会活動",         // Nonprofits & Activism
  "30": "映画",                   // Movies
  "31": "アニメ・マンガ",           // Anime/Manga
  "32": "アクション・アドベンチャー", // Action/Adventure
  "33": "クラシック",              // Classics
  "34": "コメディ映画",            // Comedy
  "35": "ドキュメンタリー",         // Documentary
  "36": "ドラマ",                 // Drama
  "37": "家族向け",               // Family
  "38": "海外映画",               // Foreign
  "39": "ホラー",                 // Horror
  "40": "SF・ファンタジー",         // Sci-Fi/Fantasy
  "41": "スリラー",               // Thriller
  "42": "短編",                   // Shorts
  "43": "番組",                   // Shows
  "44": "予告編",                 // Trailers
} as const;

function getCategoryName(categoryId: string): string {
  return YOUTUBE_CATEGORIES[categoryId] || '未分類';
}
```

### YouTubeトピックカテゴリ活用

```typescript
// 既存データの活用（実装済み）
interface TopicDetails {
  topicCategories?: string[];        // Wikipedia URLの配列
}

// URLからカテゴリ名を抽出
function extractCategoryName(url: string): string {
  return url.split('/').pop()?.replace(/_/g, ' ') || '';
}

// 例: "https://en.wikipedia.org/wiki/Music" → "Music"
```

### 検索クエリ実装

```typescript
// 1. プレイリストタグの検索
.where("playlistTags", "array-contains", playlistTag)
.where("videoType", "==", "all")
.orderBy("publishedAt", "desc")

// 2. YouTubeカテゴリIDの検索
.where("categoryId", "==", categoryId)
.where("videoType", "==", "all")
.orderBy("publishedAt", "desc")

// 3. ユーザータグの検索
.where("userTags", "array-contains", userTag)
.where("videoType", "==", "all")
.orderBy("publishedAt", "desc")

// 複合検索（カテゴリ→ユーザータグの組み合わせ）
.where("categoryId", "==", categoryId)
.where("userTags", "array-contains", userTag)
.where("videoType", "==", "all")
.orderBy("publishedAt", "desc")

// 複合検索（プレイリスト→ユーザータグの組み合わせ）
.where("playlistTags", "array-contains", playlistTag)
.where("userTags", "array-contains", userTag)
.where("videoType", "==", "all")
.orderBy("publishedAt", "desc")
```

## タグ設計方針

### 3層タグシステム

#### 1. 自動タグ（プレイリストベース）- 最優先表示
- **自動生成**: YouTubeプレイリスト名から自動付与
- **リアルタイム性**: 投稿者が動画をプレイリストに追加/削除すると自動更新
- **具体的分類**: 「歌ってみた」「雑談配信」「ゲーム実況」「ASMR」等
- **API取得**: 日次バッチでプレイリスト情報を取得
- **コスト**: 1日60-120クォータ（現在の1-2%増）

#### 2. 自動タグ（カテゴリID）- フィルター用
- **投稿者選択**: YouTube投稿者が手動で選択したカテゴリ
- **44種類の固定カテゴリ**: 音楽、ゲーム、エンターテイメント等
- **日本語化対応**: ユーザーにとって理解しやすい日本語表示
- **既存データ活用**: 完全実装済み、追加コストなし

#### 3. 手動タグ（ユーザー編集可能）- 詳細分類
- **登録ユーザー編集**: 認証済みユーザーが自由に編集可能
- **マスターデータなし**: タグは完全に自由入力、統制なし
- **フラット構造**: 階層化やカテゴリ分けなし
- **ASMR特化**: 耳かき、囁き、バイノーラル等の専門用語
- **シンプル編集**: 直接編集、履歴記録なし
- **既存実装と統一**: 音声ボタンと同じUI/UXパターンを流用

### 想定タグ例

#### 1. プレイリストタグ（自動・最優先）
- **実際の涼花みなせプレイリスト例**:
  - 「歌ってみた」
  - 「雑談配信」
  - 「ゲーム実況」
  - 「ASMR」
  - 「朗読・音声作品」
  - 「歌枠」
  - 「コラボ」
  - 「記念配信」

#### 2. カテゴリIDタグ（自動・フィルター用）
- **10 - 音楽**: 歌配信、音楽関連
- **20 - ゲーム**: ゲーム配信、ゲーム実況
- **22 - 一般・ブログ**: 雑談配信、個人ブログ
- **24 - エンターテイメント**: エンターテイメント全般
- **23 - コメディ**: コメディ、おもしろコンテンツ
- **26 - ハウツー・スタイル**: ハウツー、スタイル
- **1 - 映画・アニメ**: 映画、アニメ関連
- **27 - 教育**: 教育・学習コンテンツ

#### 3. ユーザータグ（手動・詳細）
- **ジャンル**: 音声作品、ドラマCD、フリートーク、歌、配信アーカイブ
- **シチュエーション**: 耳かき、マッサージ、添い寝、お風呂、料理
- **感情・雰囲気**: 癒し、甘々、おねだり、お姉さん、妹系
- **技術的特徴**: バイノーラル、立体音響、囁き、方言、コスプレ
- **時間帯**: 朝、昼、夜、深夜
- **季節・イベント**: 春、夏、秋、冬、クリスマス、バレンタイン

## UI/UX設計

### 3層表示パターン

#### 動画詳細画面での表示例

```tsx
{/* 1. プレイリストタグ（最優先・自動） */}
{video.playlistTags && video.playlistTags.length > 0 && (
  <div className="mb-4">
    <h4 className="text-sm font-medium mb-2 flex items-center">
      <PlayIcon className="w-4 h-4 mr-2" />
      プレイリスト
    </h4>
    <TagList 
      tags={video.playlistTags} 
      variant="default" 
      showIcon={false} 
      size="default"
      className="bg-blue-50 border-blue-200"
    />
  </div>
)}

{/* 2. ユーザータグ（メイン・編集可能） */}
<div className="mb-4">
  <div className="flex items-center justify-between mb-2">
    <h4 className="text-sm font-medium flex items-center">
      <TagIcon className="w-4 h-4 mr-2" />
      タグ
    </h4>
    {isAuthenticated && (
      <EditButton onClick={() => setEditMode(true)} size="sm">
        編集
      </EditButton>
    )}
  </div>
  {editMode ? (
    <UserTagEditor 
      initialTags={video.userTags}
      onSave={handleTagSave}
      onCancel={() => setEditMode(false)}
    />
  ) : (
    <TagList 
      tags={video.userTags} 
      variant="outline" 
      showIcon={true} 
      size="default"
    />
  )}
</div>

{/* 3. YouTubeカテゴリ（フィルター用・自動） */}
{video.categoryId && (
  <div className="mb-4">
    <h4 className="text-sm font-medium mb-2">カテゴリ</h4>
    <TagList 
      tags={[getCategoryName(video.categoryId)]} 
      variant="secondary" 
      showIcon={false}
      size="sm"
    />
  </div>
)}
```

#### 視覚的区別と優先度

| タイプ | バリアント | アイコン | サイズ | 優先度 | 編集 | 用途 |
|------|---------|---------|------|---------|------|------|
| プレイリスト | default + 青背景 | PlayIcon | default | 1位 | × | 最優先分類 |
| ユーザータグ | outline | TagIcon | default | 2位 | ✓ | メイン分類 |
| カテゴリID | secondary | × | sm | 3位 | × | フィルター |

#### 表示箇所別対応

1. **動画一覧画面**: プレイリストタグ+ユーザータグのみ表示（スペース節約）
2. **動画詳細画面**: 3層すべて表示
3. **検索・フィルター**: 3つの独立したフィルターオプションとして提供

#### ユーザータグ編集機能

```tsx
interface UserTagEditorProps {
  initialTags: string[];
  onSave: (tags: string[]) => Promise<void>;
  onCancel: () => void;
}

function UserTagEditor({ initialTags, onSave, onCancel }: UserTagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
      <TagInput 
        tags={tags}
        onChange={setTags}
        maxTags={15}
        maxLength={30}
        placeholder="タグを入力してEnterキーで追加"
      />
      <div className="flex gap-2">
        <Button 
          onClick={() => onSave(tags)}
          disabled={isSaving}
          size="sm"
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
        <Button 
          onClick={onCancel}
          variant="outline"
          size="sm"
        >
          キャンセル
        </Button>
      </div>
    </div>
  );
}
```

### 管理機能

#### プレイリストタグ管理（自動）
1. **自動取得**: 日次バッチでYouTubeプレイリスト情報を取得
2. **自動更新**: プレイリスト変更の自動反映
3. **表示制御**: 特定プレイリストの表示/非表示設定
4. **管理画面**: プレイリストタグの一覧・統計表示

#### ユーザータグ管理（手動・編集可能）
1. **編集権限**: 認証済みユーザーのみ編集可能
2. **シンプル編集**: 直接編集、履歴記録なし
3. **信頼ベース**: 認証ユーザーを信用、モデレーションなし
4. **一括編集**: 管理者による複数動画への一括タグ適用

#### 統計・分析機能
1. **3層タグ統計**: 各層別の使用頻度・動画数
2. **プレイリスト分析**: プレイリスト別動画分布
3. **クロス分析**: プレイリスト×ユーザータグの相関
4. **トレンド分析**: タグ使用頻度の時系列変化

#### 権限・信頼システム
1. **編集権限**: 認証ユーザー > 管理者
2. **信頼ベース**: 認証ユーザーを信用、検証なし
3. **制限なし**: レート制限も設けない

## 実装段階

### Phase 1: 基盤構築（fetchYoutubeVideos統合）✅ 完了

- [x] **既存YouTubeAPI統合拡張**
  - [x] `youtube-quota-monitor.ts`: プレイリスト関連クォータ定義追加
  - [x] `youtube-api.ts`: `fetchChannelPlaylists`関数追加
  - [x] `youtube-api.ts`: `fetchPlaylistItems`関数追加
- [x] **Cloud Functions統合**
  - [x] `fetchYouTubeVideos`関数にプレイリスト取得処理を統合
  - [x] プレイリスト→動画マッピング生成処理追加
  - [x] 動画データ保存時に`playlistTags`フィールド追加
- [x] **データスキーマ拡張**
  - [x] `shared-types/src/video.ts`: `playlistTags`フィールド追加
  - [x] `shared-types/src/video.ts`: `userTags`フィールド追加
  - [x] Zodバリデーションスキーマ更新
- [x] **Firestoreインデックス設定**
  - [x] `playlistTags`配列インデックス設定
  - [x] `userTags`配列インデックス設定
  - [x] 複合インデックス設定（検索用）

### Phase 2: ユーザータグ編集機能✅ 完了

- [x] ユーザータグ編集コンポーネント作成
  - [x] TagInput（入力フィールド）
  - [x] UserTagEditor（編集モーダル）
  - [x] EditButton（編集ボタン）
- [x] 権限チェック機能（認証ユーザーのみ）
- [x] Server Actions実装（シンプルタグ更新）

### Phase 3: UI実装（3層表示）✅ 完了

- [x] TagListコンポーネント拡張（3層対応）
- [x] 動画詳細画面での3層表示実装
- [x] 動画一覧画面での3層表示実装
- [x] プレイリストタグ専用スタイル（青背景）
- [x] ユーザータグ編集インターフェース
- [x] アイコン追加（PlayIcon、TagIcon）
- [x] ThreeLayerTagDisplayコンポーネント作成
- [x] YouTubeカテゴリ名日本語化ユーティリティ

### Phase 4: 検索・フィルター

- [ ] 3層検索システム実装
  - [ ] プレイリストタグ検索
  - [ ] ユーザータグ検索
  - [ ] カテゴリID検索
- [ ] 複合フィルタリング実装
- [ ] 3層タグハイライト表示機能

### Phase 5: 管理機能

- [ ] 管理画面での3層タグ統計表示
- [ ] プレイリストタグ管理インターフェース

### Phase 6: 将来の拡張機能（今回は実装しない）

- [ ] プレイリスト・カテゴリベースのタグ推薦
- [ ] 3層関連タグ表示
- [ ] 3層タグベース推薦システム
- [ ] タグトレンド分析機能

## データ移行計画

### 既存データへの3層タグ適用方法

#### 1. プレイリストタグ（自動）
- **完全自動**: YouTubeプレイリスト情報を即座に取得・適用
- **リアルタイム反映**: 新しいプレイリスト追加時の自動更新
- **履歴データ**: 過去の動画にも遡ってプレイリスト情報を適用

#### 2. カテゴリIDタグ（既存データ活用）
- **即座に利用可能**: 既存の`categoryId`フィールドを活用
- **追加コストなし**: 新たなAPI取得やデータ移行不要

#### 3. ユーザータグ（手動・段階的）
- **初期タグなし**: 新規フィールドのため初期値は空配列
- **ユーザー主導**: 認証ユーザーによる段階的なタグ付け
- **管理者支援**: 初期段階での管理者による基本タグ設定

#### 4. 移行スケジュール（fetchYoutubeVideos統合版）
1. **Week 1**: 
   - YouTubeAPI統合拡張（`youtube-api.ts`, `youtube-quota-monitor.ts`）
   - データスキーマ拡張（`shared-types`）
   - Cloud Functions統合（`fetchYouTubeVideos`修正）
2. **Week 2**: 
   - Firestoreインデックス設定
   - プレイリストタグ自動生成テスト
   - ユーザータグ編集機能実装
3. **Week 3**: UI実装・3層表示
4. **Week 4**: 検索・フィルター統合

**統合メリット**: 既存の堅牢なYouTube API基盤を活用し、開発期間を短縮

## パフォーマンス考慮事項

### インデックス設計（3層対応）

```javascript
// 1. プレイリストタグ用インデックス
db.collection('videos').index(['playlistTags', 'publishedAt']);
db.collection('videos').index(['playlistTags', 'statistics.viewCount']);
db.collection('videos').index(['playlistTags', 'videoType']);

// 2. ユーザータグ用インデックス
db.collection('videos').index(['userTags', 'publishedAt']);
db.collection('videos').index(['userTags', 'statistics.viewCount']);
db.collection('videos').index(['userTags', 'videoType']);

// 3. YouTubeカテゴリID用インデックス（既存）
db.collection('videos').index(['categoryId', 'publishedAt']);
db.collection('videos').index(['categoryId', 'statistics.viewCount']);
db.collection('videos').index(['categoryId', 'videoType']);

// 複合インデックス（カテゴリ × ユーザータグ）
db.collection('videos').index(['categoryId', 'userTags', 'publishedAt']);
db.collection('videos').index(['playlistTags', 'userTags', 'publishedAt']);
```

### キャッシュ戦略（3層対応）

- **プレイリストタグキャッシュ**: 人気プレイリスト・動画数の1時間キャッシュ
- **ユーザータグキャッシュ**: 人気ユーザータグ・使用頻度の30分キャッシュ
- **3層検索結果キャッシュ**: 検索結果の15分キャッシュ
- **タグ統計キャッシュ**: 各層別統計データの6時間キャッシュ

### APIクォータ管理

#### fetchYoutubeVideos統合でのクォータ最適化
- **既存処理コスト**: 動画検索100 + 動画詳細取得8×N = 約500-800クォータ/日
- **プレイリスト追加コスト**: 
  - チャンネルプレイリスト取得: 1クォータ
  - プレイリストアイテム取得: 1×N（プレイリスト数）
  - **推定追加**: 10-20クォータ/日（全体の2-4%増）
- **統合メリット**: 
  - 同一Cloud Function実行内で処理
  - 既存のクォータ監視システム活用
  - エラーハンドリング・リトライ機能共有
- **効率化戦略**: 
  - プレイリスト情報のキャッシュ活用
  - 変更検知による差分更新
  - 既存の日次実行スケジュールに統合

## セキュリティ・権限

### 3層タグ権限体系

#### プレイリストタグ（自動生成）
- **システム管理**: 完全自動、ユーザー編集不可
- **表示制御**: 管理者による表示/非表示設定のみ

#### ユーザータグ（編集可能）
- **認証ユーザー**: すべての動画のユーザータグ編集可能
- **管理者**: 一括編集・システム設定

#### カテゴリID（自動取得）
- **システム管理**: YouTube APIから自動取得、編集不可
- **表示制御**: 管理者による表示設定のみ

### バリデーション（3層対応）

#### プレイリストタグ
- **自動生成**: YouTubeプレイリスト名をそのまま使用
- **文字数制限**: 最大50文字（プレイリスト名の長さに対応）
- **配列上限**: 最大20個（想定プレイリスト数）

#### ユーザータグ（音声ボタンと同じ制約）
- **タグ名の長さ制限**: 1-30文字
- **タグ数の上限**: 最大15個
- **重複タグのチェック**: 同一タグの重複禁止
- **空文字タグの禁止**: 必須チェック

---

---

**ドキュメント履歴**:

- 2025-07-17: 初期設計文書作成
- 2025-07-17: 音声ボタンのタグ実装を参考にマスターデータレス設計に変更
- 2025-07-17: YouTubeトピックカテゴリを補助的タグとしてハイブリッド設計に変更
- 2025-07-17: YouTubeカテゴリIDを追加して3層タグシステムに発展
- 2025-07-17: **プレイリストベースタグ＋ユーザー編集可能タグの4層システムに拡張**
  - プレイリストタグの自動生成機能を追加
  - ユーザーによる手動タグ編集機能を追加
  - 編集履歴・モデレーション機能を追加
  - 4層タグの権限体系・UI設計を完備
- 2025-07-17: **トピックカテゴリを削除して3層システムに簡素化**
  - トピックカテゴリの日本語化の困難さを考慮し削除
  - プレイリスト・カテゴリID・ユーザータグの3層システムに確定
- 2025-07-17: **タグ編集履歴機能を削除してさらに簡素化**
  - 実装の複雑性を考慮し編集履歴機能をスコープ外に
  - シンプルな直接編集方式に変更
  - モデレーション機能も基本的なもののみに簡素化
- 2025-07-17: **基本モデレーション機能も削除して完全信頼ベースに**
  - 不適切語句検出・レート制限を削除
  - 認証ユーザーを完全に信用するシンプルな実装
  - 実装期間とメンテナンス負荷を最小化
- 2025-07-17: **タグ推薦機能も将来実装に延期**
  - 初期実装の複雑性を回避
  - Phase 6（将来の拡張機能）として分離
  - 最小限の機能で確実な実装を優先
- 2025-07-17: **🔄 fetchYoutubeVideos統合設計に更新**
  - 既存のYouTube API基盤（`youtube-api.ts`、`youtube-quota-monitor.ts`）との統合
  - Cloud Functions `fetchYouTubeVideos`関数への直接統合
  - 既存クォータ管理・エラーハンドリング・ログ機能の活用
  - 開発期間短縮と品質向上を両立
- 2025-07-17: **🎯 Phase 1-3実装完了**
  - YouTube API統合・データスキーマ拡張完了（Phase 1）
  - ユーザータグ編集機能実装完了（Phase 2）
  - 3層タグ表示UI実装完了（Phase 3）
  - ThreeLayerTagDisplay・YouTube カテゴリ日本語化実装
  - 動画詳細・一覧画面での3層タグ表示開始

> **✅ Phase 3実装完了**: 3層タグシステム（プレイリスト・ユーザー・カテゴリ）のUIが完全実装され、動画詳細・一覧画面で稼働開始。認証ユーザーによるユーザータグ編集機能も利用可能。