import type { Timestamp } from "firebase/firestore";

/**
 * 動画タイプの列挙型
 * - all: すべての動画
 * - archived: アーカイブ済み動画
 * - upcoming: 今後配信される動画
 */
export type VideoType = "all" | "archived" | "upcoming";

/**
 * 配信状態の列挙型
 * - none: ライブ配信ではない通常の動画
 * - live: 現在ライブ配信中
 * - upcoming: 今後配信予定
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
 * 動画情報の型定義
 * サーバーコンポーネントとクライアントコンポーネント間でシリアライズ可能なデータ構造
 */
export interface Video {
  id: string;
  title: string;
  description: string;
  publishedAtISO: string; // ISOフォーマット文字列として保持
  lastFetchedAtISO: string; // ISOフォーマット文字列として保持
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  liveBroadcastContent?: LiveBroadcastContent;

  // 以下のプロパティは非推奨となり、いずれ削除予定
  /** @deprecated ISOフォーマット文字列を使用してください */
  publishedAt?: string; // 旧APIとの互換性のために残す（文字列型に変更）
  /** @deprecated ISOフォーマット文字列を使用してください */
  lastFetchedAt?: string; // 旧APIとの互換性のために残す（文字列型に変更）
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
