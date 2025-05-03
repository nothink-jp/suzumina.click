# 音声クリップ機能設計書

このドキュメントでは、suzumina.click プロジェクトにおける音声クリップ機能の設計について詳細に記述します。

## 1. 概要

動画から特定の音声部分を切り出し、クリップとして再生できる「音声クリップ機能」を実装します。具体的には以下の機能を提供します：

1. 動画視聴中に特定の区間（開始時間と終了時間）を指定して音声クリップを作成
2. 作成したクリップにタイトルやフレーズテキストを付与
3. 動画詳細ページに音声クリップを表示
4. クリップをクリックすると対応する音声を再生
5. ログインユーザーと紐づけ、クリップの作成者情報を表示
6. 同一動画内で時間帯が重複する音声クリップの作成を防止
7. 動画タイムライン上の既存音声クリップの範囲を可視化

## 2. データモデル

### 2.1 音声クリップのデータモデル

```mermaid
erDiagram
    videos ||--o{ audioClips : "関連付け"
    users ||--o{ audioClips : "作成"
    users ||--o{ audioClipFavorites : "お気に入り"
    audioClips ||--o{ audioClipFavorites : "登録される"

    videos {
        string videoId PK "YouTubeビデオID"
        string title "ビデオタイトル"
        string description "説明文"
        timestamp publishedAt "公開日時"
        string thumbnailUrl "サムネイルURL"
        string channelId "チャンネルID"
        string channelTitle "チャンネル名"
        timestamp lastFetchedAt "最終取得日時"
    }

    users {
        string uid PK "ユーザーID"
        string displayName "表示名"
        string email "メールアドレス"
        string photoURL "プロフィール画像URL"
        timestamp createdAt "作成日時"
        timestamp lastLoginAt "最終ログイン日時"
    }

    audioClips {
        string clipId PK "クリップID"
        string videoId FK "関連動画ID"
        string title "クリップタイトル"
        string phrase "フレーズテキスト"
        number startTime "開始時間（秒）"
        number endTime "終了時間（秒）"
        string audioUrl "音声ファイルURL（オプション）"
        string userId FK "作成者ID"
        string userName "作成者表示名"
        string userPhotoURL "作成者プロフィール画像URL"
        boolean isPublic "公開設定"
        array tags "タグ"
        number playCount "再生回数"
        number favoriteCount "お気に入り数"
        timestamp createdAt "作成日時"
        timestamp updatedAt "更新日時"
    }

    audioClipFavorites {
        string userId FK "ユーザーID"
        string clipId FK "クリップID"
        timestamp createdAt "登録日時"
    }
```

### 2.2 型定義

```typescript
// apps/web/src/lib/audioclips/types.ts

import type { Timestamp } from "firebase/firestore";

/**
 * Firestoreから取得した音声クリップデータの型
 */
export interface AudioClipData {
  clipId: string;        // クリップID（自動生成）
  videoId: string;       // 関連動画ID
  title: string;         // クリップタイトル
  phrase: string;        // フレーズテキスト
  startTime: number;     // 開始時間（秒）
  endTime: number;       // 終了時間（秒）
  audioUrl?: string;     // 音声ファイルURL（オプション）
  createdAt: Timestamp;  // 作成日時
  updatedAt: Timestamp;  // 更新日時
  
  // ユーザー関連情報
  userId: string;        // 作成者のユーザーID
  userName: string;      // 作成者の表示名
  userPhotoURL?: string; // 作成者のプロフィール画像URL
  isPublic: boolean;     // 公開設定（true: 全体公開, false: 作成者のみ）
  
  // 追加情報
  tags?: string[];       // タグ（検索用）
  playCount: number;     // 再生回数
  favoriteCount: number; // お気に入り数
}

/**
 * アプリケーション内で使用する音声クリップの型
 */
export interface AudioClip {
  id: string;            // クリップID
  videoId: string;       //関連動画ID
  title: string;         // クリップタイトル
  phrase: string;        // フレーズテキスト
  startTime: number;     // 開始時間（秒）
  endTime: number;       // 終了時間（秒）
  audioUrl?: string;     // 音声ファイルURL（オプション）
  createdAt: Date;       // 作成日時
  updatedAt: Date;       // 更新日時
  
  // ユーザー関連情報
  userId: string;        // 作成者のユーザーID
  userName: string;      // 作成者の表示名
  userPhotoURL?: string; // 作成者のプロフィール画像URL
  isPublic: boolean;     // 公開設定
  
  // 追加情報
  tags?: string[];       // タグ（検索用）
  playCount: number;     // 再生回数
  favoriteCount: number; // お気に入り数
  
  // UI表示用の追加情報
  duration: number;        // 再生時間（秒）
  formattedDuration: string; // フォーマット済み再生時間（例: "0:15"）
}

/**
 * お気に入り登録データの型
 */
export interface AudioClipFavorite {
  userId: string;        // ユーザーID
  clipId: string;        // クリップID
  createdAt: Timestamp;  // 登録日時
}

/**
 * 音声クリップ検索パラメータ
 */
export interface AudioClipSearchParams {
  videoId?: string;      // 特定の動画のクリップのみ取得
  userId?: string;       // 特定のユーザーのクリップのみ取得
  tags?: string[];       // 特定のタグを持つクリップのみ取得
  query?: string;        // フレーズやタイトルで検索
  limit: number;         // 取得件数
  startAfter?: Date;     // ページネーション用
  includePrivate?: boolean; // 非公開クリップも含めるか（自分のクリップ取得時のみtrue）
}

/**
 * 音声クリップ一覧の取得結果
 */
export interface AudioClipListResult {
  clips: AudioClip[];  // クリップ一覧
  hasMore: boolean;    // さらにデータがあるか
  lastClip?: AudioClip; // 最後のクリップ（ページネーション用）
}

/**
 * タイムライン上の時間範囲の型
 * 作成済み音声クリップの範囲を表示するために使用
 */
export interface TimeRange {
  start: number;       // 開始時間（秒）
  end: number;         // 終了時間（秒）
  clipId: string;      // 関連するクリップID
  title: string;       // クリップのタイトル
  color?: string;      // 表示色（オプション）
}

/**
 * 重複チェック結果の型
 */
export interface OverlapCheckResult {
  isOverlapping: boolean;  // 重複しているかどうか
  overlappingClips: AudioClip[]; // 重複しているクリップのリスト
}
```

### 2.3 Firestore セキュリティルール

```javascript
// firestore.rules に追加

// audioClips コレクション
match /audioClips/{clipId} {
  // 読み取り権限: 公開クリップは全員、非公開クリップは作成者のみ
  allow read: if resource.data.isPublic == true || 
              (request.auth != null && resource.data.userId == request.auth.uid);
  
  // 作成権限: 認証済みユーザーのみ、自分のユーザー情報のみ設定可能
  allow create: if request.auth != null && 
                request.resource.data.userId == request.auth.uid;
  
  // 更新権限: 作成者のみ、特定フィールドのみ更新可能
  allow update: if request.auth != null && 
                resource.data.userId == request.auth.uid &&
                request.resource.data.userId == request.auth.uid &&
                request.resource.data.videoId == resource.data.videoId;
  
  // 削除権限: 作成者のみ
  allow delete: if request.auth != null && 
                resource.data.userId == request.auth.uid;
}

// audioClipFavorites コレクション
match /audioClipFavorites/{favoriteId} {
  // 読み取り権限: 関連ユーザーのみ
  allow read: if request.auth != null && 
              resource.data.userId == request.auth.uid;
  
  // 作成権限: 認証済みユーザーのみ、自分のIDのみ設定可能
  allow create: if request.auth != null && 
                request.resource.data.userId == request.auth.uid;
  
  // 削除権限: 作成者のみ
  allow delete: if request.auth != null && 
                resource.data.userId == request.auth.uid;
}
```

## 3. コンポーネント設計

### 3.1 ファイル構造

```
apps/web/
├── src/
│   ├── app/
│   │   ├── videos/
│   │   │   └── [videoId]/
│   │   │       └── page.tsx            # 動画詳細ページ（音声クリップ一覧を含む）
│   │   └── api/
│   │       └── audioclips/
│   │           ├── route.ts            # 音声クリップAPI
│   │           └── [clipId]/
│   │               └── route.ts        # 個別クリップAPI
│   ├── components/
│   │   └── audioclips/                 # 音声クリップ関連コンポーネント
│   │       ├── AudioClipButton.tsx     # 音声クリップ
│   │       ├── AudioClipCreator.tsx    # 音声クリップ作成フォーム
│   │       ├── AudioClipList.tsx       # 音声クリップ一覧
│   │       ├── AudioClipPlayer.tsx     # 音声クリップ再生コンポーネント
│   │       └── TimelineVisualization.tsx # タイムライン可視化コンポーネント
│   └── lib/
│       └── audioclips/                 # 音声クリップ関連ロジック
│           ├── types.ts                # 型定義
│           ├── api.ts                  # クライアントAPI
│           ├── utils.ts                # ユーティリティ関数
│           └── validation.ts           # 重複チェックなどのバリデーション
```

### 3.2 コンポーネント構成

```mermaid
graph TD
    A[動画詳細ページ] --> B[YouTubeEmbed]
    A --> C[VideoInfo]
    A --> D[AudioClipCreator]
    D --> H[TimelineVisualization]
    A --> E[AudioClipList]
    E --> F[AudioClipButton x N]
    F --> G[AudioClipPlayer]
```

### 3.3 主要コンポーネントの役割

#### AudioClipButton
- 音声クリップを表すボタンコンポーネント
- クリップのタイトル、作成者、再生時間を表示
- クリック時に音声を再生
- お気に入り登録/解除機能

#### AudioClipCreator
- 音声クリップを作成するフォームコンポーネント
- 開始時間・終了時間の設定（現在の再生位置から取得）
- タイトル、フレーズテキスト、公開設定の入力
- プレビュー機能
- 作成ボタン
- **重複チェック機能**（新規追加）
- **タイムライン可視化との連携**（新規追加）

#### AudioClipList
- 特定の動画に関連する音声クリップ一覧を表示
- ページネーション機能
- フィルタリング機能（人気順、新着順など）

#### AudioClipPlayer
- 音声クリップを再生するコンポーネント
- 再生/一時停止ボタン
- 再生位置表示
- 音量調整

#### TimelineVisualization（新規コンポーネント）
- 動画のタイムライン上に既存の音声クリップの範囲を可視化
- 異なる色で各クリップの範囲を表示
- マウスオーバーで詳細表示
- クリックで対応する音声クリップにジャンプ
- ドラッグ操作による時間範囲の選択をサポート

## 4. 重複防止機能の設計

### 4.1 重複チェックロジック

```typescript
// apps/web/src/lib/audioclips/validation.ts

/**
 * 音声クリップの時間範囲が既存のクリップと重複するかチェックする関数
 * @param videoId 動画ID
 * @param startTime 開始時間（秒）
 * @param endTime 終了時間（秒）
 * @param excludeClipId 除外するクリップID（更新時に自分自身を除外）
 * @returns 重複チェック結果
 */
export async function checkTimeRangeOverlap(
  videoId: string,
  startTime: number,
  endTime: number,
  excludeClipId?: string
): Promise<OverlapCheckResult> {
  // 同じ動画の全ての音声クリップを取得
  const existingClips = await getAudioClipsByVideo({ videoId, limit: 1000 });
  
  // 重複チェック
  const overlappingClips = existingClips.clips.filter(clip => {
    // 更新時は自分自身を除外
    if (excludeClipId && clip.id === excludeClipId) {
      return false;
    }
    
    // 以下の条件で重複と判定
    // 1. 新規範囲が既存範囲に完全に含まれる
    // 2. 新規範囲が既存範囲を完全に含む
    // 3. 新規範囲の開始点が既存範囲内にある
    // 4. 新規範囲の終了点が既存範囲内にある
    return (
      (startTime >= clip.startTime && startTime < clip.endTime) || 
      (endTime > clip.startTime && endTime <= clip.endTime) ||
      (startTime <= clip.startTime && endTime >= clip.endTime)
    );
  });
  
  return {
    isOverlapping: overlappingClips.length > 0,
    overlappingClips
  };
}

/**
 * 指定された動画の全ての音声クリップの時間範囲を取得する関数
 * @param videoId 動画ID
 * @returns 時間範囲の配列
 */
export async function getVideoTimeRanges(videoId: string): Promise<TimeRange[]> {
  // 同じ動画の全ての音声クリップを取得
  const clipList = await getAudioClipsByVideo({ videoId, limit: 1000 });
  
  // TimeRange形式に変換
  return clipList.clips.map(clip => ({
    start: clip.startTime,
    end: clip.endTime,
    clipId: clip.id,
    title: clip.title
  }));
}
```

### 4.2 サーバーサイドバリデーション

```typescript
// apps/web/src/app/api/audioclips/route.ts (POST部分)

// POST: 音声クリップ作成
export async function POST(request: Request) {
  // ユーザー認証チェック
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }
  
  // リクエストボディの解析
  const data = await request.json();
  
  // バリデーション
  if (!data.videoId || !data.title || data.startTime === undefined || data.endTime === undefined) {
    return Response.json({ error: "必須項目が不足しています" }, { status: 400 });
  }
  
  if (data.endTime <= data.startTime) {
    return Response.json({ error: "終了時間は開始時間よりも後である必要があります" }, { status: 400 });
  }
  
  // 重複チェック
  const overlapCheck = await checkTimeRangeOverlap(
    data.videoId,
    data.startTime,
    data.endTime
  );
  
  if (overlapCheck.isOverlapping) {
    return Response.json({
      error: "指定した時間範囲が既存のクリップと重複しています",
      overlappingClips: overlapCheck.overlappingClips
    }, { status: 409 });  // 409 Conflictを返す
  }
  
  // クリップ作成処理
  // ...（以降は既存の処理）
}
```

## 5. タイムライン可視化コンポーネントの設計

### 5.1 TimelineVisualization コンポーネント

```typescript
// apps/web/src/components/audioclips/TimelineVisualization.tsx

import { useState, useEffect, useRef } from 'react';
import { TimeRange } from '@/lib/audioclips/types';
import { getVideoTimeRanges, formatTime } from '@/lib/audioclips/validation';

interface TimelineVisualizationProps {
  videoId: string;
  videoDuration: number; // 動画の総再生時間（秒）
  currentTime?: number;  // 現在の再生位置（秒）
  onRangeSelect?: (start: number, end: number) => void;
  onClipClick?: (clipId: string) => void;
}

export default function TimelineVisualization({
  videoId,
  videoDuration,
  currentTime,
  onRangeSelect,
  onClipClick
}: TimelineVisualizationProps) {
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<{start: number, end: number} | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // 時間範囲データの取得
  useEffect(() => {
    async function fetchTimeRanges() {
      setIsLoading(true);
      try {
        const ranges = await getVideoTimeRanges(videoId);
        setTimeRanges(ranges);
      } catch (error) {
        console.error("時間範囲の取得に失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTimeRanges();
  }, [videoId]);
  
  // 秒数をタイムライン上の位置（パーセント）に変換
  const secondsToPercent = (seconds: number) => {
    return (seconds / videoDuration) * 100;
  };
  
  // 選択範囲のスタイル
  const getSelectedRangeStyle = () => {
    if (!selectedRange) return {};
    
    return {
      left: `${secondsToPercent(selectedRange.start)}%`,
      width: `${secondsToPercent(selectedRange.end - selectedRange.start)}%`,
      backgroundColor: 'rgba(255, 255, 0, 0.3)'
    };
  };
  
  // タイムライン上でのドラッグ操作処理
  const handleTimelineInteraction = () => {
    // マウスイベントによる範囲選択の実装
    // ...
  };
  
  // レンダリング
  return (
    <div className="w-full mt-4 mb-2">
      <h3 className="text-sm font-medium mb-1">タイムライン</h3>
      
      <div 
        ref={timelineRef}
        className="relative h-8 bg-gray-200 rounded w-full cursor-pointer"
        onClick={handleTimelineInteraction}
      >
        {/* 現在再生位置マーカー */}
        {currentTime !== undefined && (
          <div 
            className="absolute top-0 h-full w-0.5 bg-red-500 z-20"
            style={{ left: `${secondsToPercent(currentTime)}%` }}
          />
        )}
        
        {/* 既存の音声クリップ範囲の表示 */}
        {timeRanges.map(range => (
          <div
            key={range.clipId}
            className="absolute h-full rounded"
            style={{
              left: `${secondsToPercent(range.start)}%`,
              width: `${secondsToPercent(range.end - range.start)}%`,
              backgroundColor: range.color || 'rgba(59, 130, 246, 0.5)',
              zIndex: 10
            }}
            title={`${range.title} (${formatTime(range.start)} - ${formatTime(range.end)})`}
            onClick={(e) => {
              e.stopPropagation();
              onClipClick?.(range.clipId);
            }}
          />
        ))}
        
        {/* 選択中の範囲 */}
        {selectedRange && (
          <div
            className="absolute h-full z-15"
            style={getSelectedRangeStyle()}
          />
        )}
        
        {/* 時間マーカー（10秒ごと） */}
        {Array.from({ length: Math.floor(videoDuration / 10) }).map((_, i) => (
          <div
            key={`marker-${i}`}
            className="absolute h-2 w-px bg-gray-400 bottom-0"
            style={{ left: `${secondsToPercent((i + 1) * 10)}%` }}
          />
        ))}
      </div>
      
      {/* 時間表示（開始・中間・終了） */}
      <div className="flex justify-between text-xs mt-1 text-gray-600">
        <span>0:00</span>
        <span>{formatTime(videoDuration / 2)}</span>
        <span>{formatTime(videoDuration)}</span>
      </div>
      
      {isLoading && <p className="text-sm text-gray-500">タイムラインデータを読み込み中...</p>}
    </div>
  );
}
```

### 5.2 AudioClipCreator との連携

```typescript
// apps/web/src/components/audioclips/AudioClipCreator.tsx（一部抜粋）

export default function AudioClipCreator({ videoId, youtubePlayerRef }) {
  // 状態管理
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [title, setTitle] = useState('');
  const [phrase, setPhrase] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlapError, setOverlapError] = useState<OverlapCheckResult | null>(null);
  
  // タイムライン上での範囲選択ハンドラ
  const handleRangeSelect = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    
    // 範囲選択時に重複チェックを行う
    checkOverlap(start, end);
  };
  
  // 重複チェック関数
  const checkOverlap = async (start: number, end: number) => {
    try {
      const result = await checkTimeRangeOverlap(videoId, start, end);
      if (result.isOverlapping) {
        setOverlapError(result);
      } else {
        setOverlapError(null);
      }
    } catch (error) {
      console.error("重複チェックに失敗しました:", error);
    }
  };
  
  // 作成ボタン押下時の処理
  const handleCreate = async () => {
    // バリデーション
    if (!title) {
      setError("タイトルを入力してください");
      return;
    }
    
    if (endTime <= startTime) {
      setError("終了時間は開始時間よりも後である必要があります");
      return;
    }
    
    // 最終重複チェック
    const overlapCheck = await checkTimeRangeOverlap(videoId, startTime, endTime);
    if (overlapCheck.isOverlapping) {
      setOverlapError(overlapCheck);
      setError("指定した時間範囲が既存のクリップと重複しています");
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      // クリップ作成処理
      // ...（以降は既存の処理）
    } catch (error) {
      // エラー処理
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <div className="mb-8 p-4 border rounded-lg bg-gray-50">
      <h2 className="text-lg font-bold mb-4">音声クリップを作成</h2>
      
      {/* タイムライン可視化コンポーネント */}
      <TimelineVisualization
        videoId={videoId}
        videoDuration={youtubePlayerRef?.current?.getDuration() || 0}
        currentTime={youtubePlayerRef?.current?.getCurrentTime() || 0}
        onRangeSelect={handleRangeSelect}
      />
      
      {/* 重複エラー表示 */}
      {overlapError && overlapError.isOverlapping && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
          <p className="font-bold">選択した時間範囲が既存のクリップと重複しています：</p>
          <ul className="list-disc list-inside mt-1">
            {overlapError.overlappingClips.map(clip => (
              <li key={clip.id}>
                "{clip.title}" ({formatTime(clip.startTime)} - {formatTime(clip.endTime)})
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* 以下、既存のフォーム要素 */}
      {/* ... */}
    </div>
  );
}
```

## 6. API設計

### 6.1 クライアントAPI

```typescript
// apps/web/src/lib/audioclips/api.ts

// 主要な関数
export async function getAudioClipsByVideo(params: AudioClipSearchParams): Promise<AudioClipListResult>;
export async function getAudioClipsByUser(params: AudioClipSearchParams): Promise<AudioClipListResult>;
export async function createAudioClip(data: AudioClipCreateData): Promise<AudioClip>;
export async function updateAudioClip(clipId: string, data: Partial<AudioClipUpdateData>): Promise<void>;
export async function deleteAudioClip(clipId: string): Promise<void>;
export async function incrementPlayCount(clipId: string): Promise<void>;
export async function toggleFavorite(clipId: string, userId: string, isFavorite: boolean): Promise<void>;
```

### 6.2 サーバーサイドAPI

```typescript
// apps/web/src/app/api/audioclips/route.ts

// GET: 音声クリップ一覧取得
// パラメータ: videoId, userId, limit, startAfter, includePrivate

// POST: 音声クリップ作成（重複チェック機能追加）
// ボディ: videoId, title, phrase, startTime, endTime, isPublic, tags

// apps/web/src/app/api/audioclips/[clipId]/route.ts

// GET: 特定の音声クリップ取得

// PATCH: 音声クリップ更新（重複チェック機能追加）
// ボディ: title, phrase, isPublic, tags

// DELETE: 音声クリップ削除

// POST /play: 再生回数インクリメント

// POST /favorite: お気に入り登録/解除
```

## 7. 実装フェーズ

### フェーズ1: データモデルとAPI更新
- 型定義の更新 (`src/lib/audioclips/types.ts`)
- Firestoreセキュリティルールの更新
- クライアントAPIの更新 (`src/lib/audioclips/api.ts`)
- サーバーサイドAPIの更新 (`src/app/api/audioclips/route.ts`)

### フェーズ2: 重複チェック機能の実装
- バリデーションロジックの実装 (`src/lib/audioclips/validation.ts`)
- サーバーサイドAPIに重複チェック追加
- 重複エラー表示UIの実装

### フェーズ3: タイムライン可視化の実装
- TimelineVisualizationコンポーネントの実装
- AudioClipCreatorとの連携
- ドラッグによる範囲選択機能の実装

### フェーズ4: 既存コンポーネントの更新
- AudioClipコンポーネントのリネームと更新
- AudioClipListコンポーネントの更新
- 動画詳細ページへの統合

## 8. 技術的考慮事項

### 8.1 音声再生方法

音声クリップの再生には、以下の2つの方法を検討します：

1. **YouTube Player APIを利用する方法**
   - YouTubeプレーヤーの特定の時間から再生を開始し、指定時間で停止
   - メリット: 追加のストレージが不要、YouTubeの著作権ポリシーに準拠
   - デメリット: プレーヤーの読み込みが必要、UIが制限される

2. **音声ファイルを抽出して保存する方法**
   - Cloud Functionsで動画から音声を抽出し、Cloud Storageに保存
   - メリット: 高速な再生、カスタムUIの実装が容易
   - デメリット: ストレージコストの増加、著作権の問題

初期実装では、シンプルさと著作権の観点から**YouTube Player APIを利用する方法**を採用します。

### 8.2 パフォーマンス最適化

- 音声クリップデータのキャッシング
- ページネーションによるデータ量の制限
- タイムライン可視化のレンダリング最適化
- 遅延読み込み（Lazy Loading）の実装

### 8.3 セキュリティ考慮事項

- ユーザー認証の確認
- Firestoreセキュリティルールの適切な設定
- APIエンドポイントでの入力バリデーション
- 重複チェックの二重実装（クライアント・サーバー両方）

## 9. 将来的な拡張性

- 音声クリップのエクスポート機能
- 共有機能（SNSへの投稿）
- 高度な検索機能（音声認識による検索など）
- ユーザープロフィールページでの作成クリップ一覧表示
- タイムラインのカスタマイズ機能（色分けなど）