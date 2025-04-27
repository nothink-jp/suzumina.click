import type { Timestamp } from "firebase/firestore";

/**
 * Firestoreから取得した動画データの型
 * Firestoreのデータ構造に合わせた型定義
 */
export interface VideoData {
  videoId: string;
  title: string;
  description: string;
  publishedAt: Timestamp;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  lastFetchedAt: Timestamp;
}

/**
 * アプリケーション内で使用する動画データの型
 * TimestampをDate型に変換し、使いやすい形に整形
 */
export interface Video {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  lastFetchedAt: Date;
}

/**
 * ページネーション用のパラメータ
 */
export interface PaginationParams {
  limit: number;
  startAfter?: Date;
}

/**
 * 動画一覧の取得結果
 */
export interface VideoListResult {
  videos: Video[];
  hasMore: boolean;
  lastVideo?: Video;
}