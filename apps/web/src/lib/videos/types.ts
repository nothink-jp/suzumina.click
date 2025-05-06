import type { Timestamp } from "firebase/firestore";

/**
 * 動画タイプの列挙型
 * - archived: 配信終了したアーカイブ動画
 * - upcoming: これから配信予定の動画
 * - all: すべての動画（フィルタリング用）
 */
export type VideoType = "archived" | "upcoming" | "all";

/**
 * 配信状態の列挙型
 * - none: 通常の動画（ライブ配信ではない/配信済み）
 * - live: 現在ライブ配信中の動画
 * - upcoming: これから配信予定の動画
 */
export type LiveBroadcastContent = "none" | "live" | "upcoming";

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
  liveBroadcastContent?: LiveBroadcastContent;
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
  publishedAtISO?: string; // ISO文字列形式の公開日時
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  lastFetchedAt: Date;
  lastFetchedAtISO?: string; // ISO文字列形式の最終取得日時
  liveBroadcastContent?: LiveBroadcastContent; // 配信状態
}

/**
 * ページネーション用のパラメータ
 */
export interface PaginationParams {
  limit: number;
  startAfter?: string; // IDベースのページネーションに変更
  videoType?: VideoType; // 動画種別でフィルタリング
}

/**
 * 動画一覧の取得結果
 */
export interface VideoListResult {
  videos: Video[];
  hasMore: boolean;
  lastVideo?: Video;
}
