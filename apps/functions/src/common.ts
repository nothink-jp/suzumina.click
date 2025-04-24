// functions/src/common.ts
import type * as admin from "firebase-admin"; // type を追加

// --- インターフェース定義 ---

/**
 * YouTube 動画データのインターフェース
 * Firestore に保存する形式に合わせて定義
 */
export interface YouTubeVideoData {
  /** YouTube 動画ID */
  videoId: string;
  /** 動画タイトル */
  title: string;
  /** 動画説明文 */
  description: string;
  /** 動画公開日時（Firestoreのタイムスタンプ型） */
  publishedAt: admin.firestore.Timestamp;
  /** サムネイル画像URL */
  thumbnailUrl: string;
  /** チャンネルID */
  channelId: string;
  /** チャンネル名 */
  channelTitle: string;
  /** データの最終取得日時（Firestoreのタイムスタンプ型） */
  lastFetchedAt: admin.firestore.Timestamp;
}

/**
 * Pub/Sub メッセージのデータ構造
 * Cloud Scheduler や Pub/Sub を介して受け取るイベントデータの形式を定義
 */
export interface SimplePubSubData {
  /** Base64 エンコードされたメッセージデータ */
  data?: string;
  /** メッセージID */
  messageId?: string;
  /** 配信時間 */
  publishTime?: string;
  /** メッセージ属性（キーと値のペア） */
  attributes?: { [key: string]: string };
}

// --- 定数 ---
/**
 * 涼花みなせのYouTubeチャンネルID
 * YouTube Data APIでチャンネル情報を取得する際に使用
 */
export const SUZUKA_MINASE_CHANNEL_ID = "UChiMMOhl6FpzjoRqvZ5rcaA";
