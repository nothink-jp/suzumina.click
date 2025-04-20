// functions/src/common.ts
import type * as admin from "firebase-admin"; // type を追加

// --- インターフェース定義 ---
/**
 * Discord ユーザー情報のインターフェース
 * Discord APIから取得するユーザー情報の構造を定義
 */
export interface DiscordUser {
  /** Discord ユーザーID */
  id: string;
  /** Discord ユーザー名 */
  username: string;
  /** アバター画像のハッシュ値（nullの場合はアバター未設定） */
  avatar: string | null;
  /** ユーザーのメールアドレス（nullの場合は取得不可または未設定） */
  email: string | null;
}

/**
 * Discord ギルド（サーバー）情報のインターフェース
 * Discord APIから取得するギルド情報の構造を定義
 */
export interface DiscordGuild {
  /** Discord ギルドID */
  id: string;
  /** Discord ギルド名 */
  name: string;
}

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

// --- ヘルパー関数 ---
/**
 * Discord アバターURLを生成する
 * 
 * アバターハッシュの先頭が "a_" で始まる場合は GIF フォーマット、
 * それ以外は PNG フォーマットの URL を生成する
 * 
 * @param userId - Discord ユーザーID
 * @param avatarHash - アバターのハッシュ値（null または空文字の場合は undefined を返却）
 * @returns アバターのURL または undefined（アバターハッシュがない場合）
 */
export function getDiscordAvatarUrl(
  userId: string,
  avatarHash: string | null,
): string | undefined {
  if (!avatarHash) return undefined;
  const format = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}?size=128`;
}

// --- 定数 ---
/**
 * 水瀬鈴花のYouTubeチャンネルID
 * YouTube Data APIでチャンネル情報を取得する際に使用
 */
export const SUZUKA_MINASE_CHANNEL_ID = "UChiMMOhl6FpzjoRqvZ5rcaA";
