# Entity Serialization Pattern for Next.js Server/Client Components

## 概要

Next.js App RouterのServer ComponentsからClient Componentsへエンティティを渡す際の制約を解決するためのパターンです。クラスインスタンスは直接シリアライズできないため、Plain Objectへの変換が必要です。

## 問題

```typescript
// ❌ これはエラーになる
export async function getVideoTitles() {
  const videos = await fetchVideos(); // Video Entityの配列
  return { items: videos }; // Error: Only plain objects can be passed to Client Components
}
```

## 解決策: Computed Properties Pattern

エンティティのデータを保持しつつ、ビジネスロジックの計算結果を`_computed`プロパティに格納するパターンを採用します。

### 1. Plain Object型定義

```typescript
export interface VideoPlainObject extends FirestoreServerVideoData {
  // 計算済みプロパティ
  _computed: {
    isArchived: boolean;
    isPremiere: boolean;
    isLive: boolean;
    isUpcoming: boolean;
    canCreateButton: boolean;
    videoType: 'normal' | 'archived' | 'premiere' | 'live' | 'upcoming';
    thumbnailUrl: string;
    youtubeUrl: string;
  };
}
```

### 2. Entity側の実装

```typescript
export class Video {
  toPlainObject(): VideoPlainObject {
    return {
      // すべての元データを保持
      id: this.id,
      videoId: this.videoId,
      title: this.title,
      description: this.description,
      channelId: this.channelId,
      channelTitle: this.channelTitle,
      publishedAt: this.publishedAt,
      duration: this.duration,
      liveBroadcastContent: this.liveBroadcastContent,
      liveStreamingDetails: this.liveStreamingDetails,
      statistics: this.statistics,
      playlistTags: this.playlistTags,
      userTags: this.userTags,
      audioButtonCount: this.audioButtonCount,
      hasAudioButtons: this.hasAudioButtons,
      lastFetchedAt: this.lastFetchedAt,
      
      // 計算済みプロパティ
      _computed: {
        isArchived: this.isArchivedStream(),
        isPremiere: this.isPremiere(),
        isLive: this.isLiveStream(),
        isUpcoming: this.isUpcomingStream(),
        canCreateButton: this.canCreateAudioButton(),
        videoType: this.getVideoType(),
        thumbnailUrl: this.thumbnailUrl,
        youtubeUrl: this.getYouTubeUrl(),
      }
    };
  }
}
```

### 3. Server Component側

```typescript
// Server Action
export async function getVideoTitles() {
  const firestore = getFirestore();
  const snapshot = await firestore.collection("videos").get();
  
  const videos = snapshot.docs
    .map(doc => Video.fromFirestoreData(doc.data()))
    .filter(video => video !== null);
    
  // Plain Objectに変換してから返す
  const plainVideos = videos.map(v => v.toPlainObject());
  
  return {
    items: plainVideos,
    total: plainVideos.length
  };
}
```

### 4. Client Component側

```typescript
interface VideoCardProps {
  video: VideoPlainObject;
}

export function VideoCard({ video }: VideoCardProps) {
  // 計算済みプロパティを使用
  const { isArchived, canCreateButton, videoType } = video._computed;
  
  return (
    <div>
      <h3>{video.title}</h3>
      {isArchived && <Badge>配信アーカイブ</Badge>}
      {canCreateButton && <CreateButtonLink videoId={video.videoId} />}
    </div>
  );
}
```

## 利点

1. **データ損失防止**: すべてのフィールドが保持される
2. **認知負荷低減**: `_computed`で計算済み値であることが明確
3. **型安全性**: TypeScriptによる完全な型チェック
4. **パフォーマンス**: ビジネスロジックの計算結果をキャッシュ
5. **段階的移行**: 既存コードを徐々に更新可能

## 設計原則

1. **完全性**: 元データのすべてのフィールドを保持する
2. **明示性**: 計算済み値は`_computed`プロパティに格納
3. **不変性**: Plain Objectは読み取り専用として扱う
4. **単一責任**: ビジネスロジックはEntityに集約

## 今後の展開

このパターンは他のエンティティ（AudioButton、DLsiteWork等）にも適用予定ですが、まずはVideoエンティティで実証します。

## 実装ステータス

- [x] Phase 1: VideoPlainObject型定義
- [x] Phase 2: Video.toPlainObject()実装
- [x] Phase 3: Server Actions更新
- [x] Phase 4: Client Components更新
- [x] Phase 5: テスト作成・更新
- [x] Phase 6: デプロイ・検証

## 実装完了日

2025-07-26

## 注意事項

- `_computed`プロパティはClient Component側で再計算しない
- Plain Object化の際にCircular Referenceに注意
- Date型は文字列として保存される点に注意