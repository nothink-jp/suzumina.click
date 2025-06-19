import {
  type AudioReferenceCategory,
  type FirestoreAudioReferenceData,
  type FrontendAudioReferenceData,
  type CreateAudioReferenceInput,
  type YouTubeVideoInfo,
  FrontendAudioReferenceSchema,
  formatTimestamp,
  formatTimeRange,
  createYouTubeUrl,
  createYouTubeEmbedUrl,
  createYouTubeThumbnailUrl,
} from "./audio-reference";

/**
 * Firestoreデータをフロントエンド表示用に変換するヘルパー関数
 */
export function convertToFrontendAudioReference(
  data: FirestoreAudioReferenceData,
): FrontendAudioReferenceData {
  const frontendData: FrontendAudioReferenceData = {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    tags: data.tags,
    
    // YouTube動画情報
    videoId: data.videoId,
    videoTitle: data.videoTitle,
    videoThumbnailUrl: data.videoThumbnailUrl || createYouTubeThumbnailUrl(data.videoId),
    channelId: data.channelId,
    channelTitle: data.channelTitle,
    
    // タイムスタンプ情報
    startTime: data.startTime,
    endTime: data.endTime,
    duration: data.duration,

    // 統計情報
    playCount: data.playCount,
    likeCount: data.likeCount,
    viewCount: data.viewCount,

    // 管理情報
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdAtISO: data.createdAt,
    updatedAtISO: data.updatedAt,

    // 表示用の追加情報
    durationText: formatTimestamp(data.duration),
    timestampText: formatTimeRange(data.startTime, data.endTime),
    youtubeUrl: createYouTubeUrl(data.videoId, data.startTime),
    youtubeEmbedUrl: createYouTubeEmbedUrl(data.videoId, data.startTime, data.endTime),
  };

  // データの検証
  try {
    return FrontendAudioReferenceSchema.parse(frontendData);
  } catch (error) {
    console.error("音声リファレンスフロントエンド変換中のスキーマ検証エラー:", error);

    // エラー時でも最低限のデータを返す
    const now = new Date().toISOString();
    return {
      id: data.id,
      title: data.title,
      description: data.description || "",
      category: data.category,
      tags: data.tags || [],
      videoId: data.videoId,
      videoTitle: data.videoTitle,
      videoThumbnailUrl: data.videoThumbnailUrl || createYouTubeThumbnailUrl(data.videoId),
      channelId: data.channelId,
      channelTitle: data.channelTitle,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      playCount: data.playCount,
      likeCount: data.likeCount,
      viewCount: data.viewCount,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdAtISO: data.createdAt,
      updatedAtISO: data.updatedAt,
      durationText: formatTimestamp(data.duration),
      timestampText: formatTimeRange(data.startTime, data.endTime),
      youtubeUrl: createYouTubeUrl(data.videoId, data.startTime),
      youtubeEmbedUrl: createYouTubeEmbedUrl(data.videoId, data.startTime, data.endTime),
    };
  }
}

/**
 * 作成用入力データをFirestoreデータに変換するヘルパー関数
 */
export function convertCreateInputToFirestoreAudioReference(
  input: CreateAudioReferenceInput,
  videoInfo: YouTubeVideoInfo,
  clientIp?: string,
): Omit<FirestoreAudioReferenceData, "id"> {
  const now = new Date().toISOString();
  const duration = input.endTime - input.startTime;

  // IPアドレスのハッシュ化（レート制限用）
  const hashedIp = clientIp ? hashIpAddress(clientIp) : undefined;

  return {
    title: input.title,
    description: input.description,
    category: input.category,
    tags: input.tags,
    
    // YouTube動画情報
    videoId: input.videoId,
    videoTitle: videoInfo.title,
    videoThumbnailUrl: videoInfo.thumbnailUrl || createYouTubeThumbnailUrl(input.videoId),
    channelId: videoInfo.channelId,
    channelTitle: videoInfo.channelTitle,
    
    // タイムスタンプ情報
    startTime: input.startTime,
    endTime: input.endTime,
    duration,

    // 匿名投稿設定
    createdBy: "anonymous",
    createdByIp: hashedIp,

    // 公開設定
    isPublic: input.isPublic,

    // 統計情報
    playCount: 0,
    likeCount: 0,
    viewCount: 0,

    // 管理情報
    createdAt: now,
    updatedAt: now,

    // モデレーション情報
    isReported: false,
    reportCount: 0,
    moderationStatus: "approved",
  };
}

/**
 * RSCからRCCへ安全にデータを渡すためのシリアライズ関数
 */
export function serializeAudioReferenceForRSC(
  data: FrontendAudioReferenceData,
): string {
  return JSON.stringify(data);
}

/**
 * RCCでのデシリアライズ関数
 */
export function deserializeAudioReferenceForRCC(
  serialized: string,
): FrontendAudioReferenceData {
  try {
    const data = JSON.parse(serialized);
    return FrontendAudioReferenceSchema.parse(data);
  } catch (error) {
    console.error("音声リファレンスデシリアライズまたはスキーマ検証エラー:", error);
    throw new Error("音声リファレンスデータの形式が無効です");
  }
}

/**
 * バリデーション関数：音声リファレンスの作成可能性をチェック
 */
export function validateAudioReferenceCreation(
  input: CreateAudioReferenceInput,
  videoInfo?: YouTubeVideoInfo,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 基本的なバリデーション
  if (!input.title.trim()) {
    errors.push("タイトルは必須です");
  }

  if (input.title.length > 100) {
    errors.push("タイトルは100文字以下である必要があります");
  }

  if (input.description && input.description.length > 500) {
    errors.push("説明は500文字以下である必要があります");
  }

  // タイムスタンプバリデーション
  if (input.startTime < 0) {
    errors.push("開始時間は0以上である必要があります");
  }

  if (input.endTime <= input.startTime) {
    errors.push("終了時間は開始時間より後である必要があります");
  }

  const duration = input.endTime - input.startTime;
  if (duration < 1) {
    errors.push("音声ボタンの長さは1秒以上である必要があります");
  }

  if (duration > 60) {
    errors.push("音声ボタンの長さは60秒以下である必要があります");
  }

  // 動画情報のバリデーション
  if (videoInfo) {
    if (videoInfo.duration && input.endTime > videoInfo.duration) {
      errors.push("終了時間が動画の長さを超えています");
    }
  }

  // タグのバリデーション
  if (input.tags) {
    if (input.tags.length > 10) {
      errors.push("タグは最大10個まで設定できます");
    }

    for (const tag of input.tags) {
      if (tag.length > 20) {
        errors.push(`タグ「${tag}」は20文字以下である必要があります`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * カテゴリによる並び替え順序を定義
 */
export function getAudioReferenceCategorySortOrder(): Record<AudioReferenceCategory, number> {
  return {
    voice: 1,
    talk: 2,
    singing: 3,
    bgm: 4,
    se: 5,
    other: 6,
  };
}

/**
 * 音声リファレンスの並び替え関数
 */
export function sortAudioReferences(
  audioReferences: FrontendAudioReferenceData[],
  sortBy: "newest" | "oldest" | "popular" | "mostPlayed" | "mostLiked" = "newest",
): FrontendAudioReferenceData[] {
  return [...audioReferences].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "popular":
        // 再生数 + いいね数 * 2 + 表示数 * 0.1 の重み付けスコア
        const scoreA = a.playCount + a.likeCount * 2 + a.viewCount * 0.1;
        const scoreB = b.playCount + b.likeCount * 2 + b.viewCount * 0.1;
        return scoreB - scoreA;
      case "mostPlayed":
        return b.playCount - a.playCount;
      case "mostLiked":
        return b.likeCount - a.likeCount;
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}

/**
 * 検索条件に基づく音声リファレンスのフィルタリング
 */
export function filterAudioReferences(
  audioReferences: FrontendAudioReferenceData[],
  filters: {
    searchText?: string;
    category?: AudioReferenceCategory;
    tags?: string[];
    videoId?: string;
  },
): FrontendAudioReferenceData[] {
  return audioReferences.filter((audioReference) => {
    // テキスト検索
    if (filters.searchText) {
      const searchTerms = filters.searchText.toLowerCase().split(/\s+/);
      const searchableText = [
        audioReference.title,
        audioReference.description || "",
        audioReference.videoTitle,
        ...(audioReference.tags || []),
      ].join(" ").toLowerCase();

      const matchesSearch = searchTerms.every((term) =>
        searchableText.includes(term)
      );
      if (!matchesSearch) return false;
    }

    // カテゴリフィルター
    if (filters.category && audioReference.category !== filters.category) {
      return false;
    }

    // タグフィルター
    if (filters.tags && filters.tags.length > 0) {
      const audioReferenceTags = audioReference.tags || [];
      const hasMatchingTag = filters.tags.some((tag) =>
        audioReferenceTags.includes(tag)
      );
      if (!hasMatchingTag) return false;
    }

    // 動画IDフィルター
    if (filters.videoId && audioReference.videoId !== filters.videoId) {
      return false;
    }

    return true;
  });
}

/**
 * 音声リファレンスの統計情報を更新するためのヘルパー関数
 */
export function createStatsUpdateData(updates: {
  incrementPlayCount?: boolean;
  incrementLikeCount?: boolean;
  incrementViewCount?: boolean;
  decrementLikeCount?: boolean;
}): Record<string, number> {
  const updateData: Record<string, number> = {};

  if (updates.incrementPlayCount) {
    updateData.playCount = 1; // Firestore increment
  }

  if (updates.incrementLikeCount) {
    updateData.likeCount = 1; // Firestore increment
  }

  if (updates.incrementViewCount) {
    updateData.viewCount = 1; // Firestore increment
  }

  if (updates.decrementLikeCount) {
    updateData.likeCount = -1; // Firestore increment with negative value
  }

  return updateData;
}

/**
 * レート制限チェック用のヘルパー関数
 */
export function checkRateLimit(
  recentCreations: FirestoreAudioReferenceData[],
  clientIp?: string,
  dailyLimit: number = 20,
): { allowed: boolean; remainingQuota: number; resetTime: Date } {
  if (!clientIp) {
    return {
      allowed: true,
      remainingQuota: dailyLimit,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  const hashedIp = hashIpAddress(clientIp);
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 過去24時間での作成数をカウント
  const recentCreationsFromIp = recentCreations.filter((creation) => {
    const createdAt = new Date(creation.createdAt);
    return (
      creation.createdByIp === hashedIp &&
      createdAt > twentyFourHoursAgo
    );
  });

  const usedQuota = recentCreationsFromIp.length;
  const remainingQuota = Math.max(0, dailyLimit - usedQuota);
  const allowed = remainingQuota > 0;

  // 最も古い作成から24時間後がリセット時間
  const oldestCreation = recentCreationsFromIp
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
  
  const resetTime = oldestCreation
    ? new Date(new Date(oldestCreation.createdAt).getTime() + 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    allowed,
    remainingQuota,
    resetTime,
  };
}

/**
 * IPアドレスをハッシュ化する関数（プライバシー保護）
 */
function hashIpAddress(ip: string): string {
  // 簡単なハッシュ関数（本番環境では crypto を使用することを推奨）
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash).toString(36);
}

/**
 * Firestoreサーバーサイド（Cloud Functions）向けのデータ型定義
 * Timestampを使用するサーバーサイド向け
 */
export interface FirestoreServerAudioReferenceData {
  id: string;
  title: string;
  description?: string;
  category: AudioReferenceCategory;
  tags?: string[];

  // YouTube動画情報
  videoId: string;
  videoTitle: string;
  videoThumbnailUrl?: string;
  channelId?: string;
  channelTitle?: string;

  // タイムスタンプ情報
  startTime: number;
  endTime: number;
  duration: number;

  // 匿名投稿設定
  createdBy: "anonymous";
  createdByIp?: string;

  // 公開設定
  isPublic: boolean;

  // 統計情報
  playCount: number;
  likeCount: number;
  viewCount: number;

  // 管理情報（Firestore Timestamp型）
  createdAt: unknown; // Firestore.Timestamp型
  updatedAt: unknown; // Firestore.Timestamp型

  // モデレーション情報
  isReported: boolean;
  reportCount: number;
  moderationStatus: "approved" | "pending" | "rejected";
}