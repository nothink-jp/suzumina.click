// functions/src/common.ts
import type * as admin from "firebase-admin"; // type を追加

// --- Interfaces ---
export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  email: string | null;
}
export interface DiscordGuild {
  id: string;
  name: string;
}
export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  publishedAt: admin.firestore.Timestamp; // admin.firestore.Timestamp を使用
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  lastFetchedAt: admin.firestore.Timestamp; // admin.firestore.Timestamp を使用
}

// Define the structure received directly in event.data for Pub/Sub messages via gcloud/scheduler?
// It seems the 'message' wrapper might be missing in some delivery scenarios.
export interface SimplePubSubData {
  data?: string; // Base64 encoded message data might be directly here
  messageId?: string; // Or message_id? Check logged event
  publishTime?: string; // Or publish_time? Check logged event
  attributes?: { [key: string]: string };
}

// --- Helper Functions ---
export function getDiscordAvatarUrl(
  userId: string,
  avatarHash: string | null,
): string | undefined {
  if (!avatarHash) return undefined;
  const format = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}?size=128`;
}

// --- Constants ---
export const SUZUKA_MINASE_CHANNEL_ID = "UChiMMOhl6FpzjoRqvZ5rcaA";
