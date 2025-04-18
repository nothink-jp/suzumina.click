/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
// import { onMessagePublished } from "firebase-functions/v2/pubsub"; // Using raw CloudEvent handler instead
// import type { Request } from "firebase-functions/v2/https"; // Removed unused import
// import type { Response } from "express"; // Removed unused import
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import axios from "axios";
import type { AxiosError } from "axios";
import type { FirebaseAuthError } from "firebase-admin/auth";
import { google } from "googleapis";
import type { youtube_v3 } from "googleapis";
import type { CloudEvent } from "@google-cloud/functions-framework"; // Import CloudEvent type

// Define the structure received directly in event.data for Pub/Sub messages via gcloud/scheduler?
// It seems the 'message' wrapper might be missing in some delivery scenarios.
interface SimplePubSubData {
  data?: string; // Base64 encoded message data might be directly here
  messageId?: string; // Or message_id? Check logged event
  publishTime?: string; // Or publish_time? Check logged event
  attributes?: { [key: string]: string };
}


// Firebase Admin SDK の初期化 (一度だけ実行)
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const firestore = admin.firestore();

// --- Constants ---
const SUZUKA_MINASE_CHANNEL_ID = "UChiMMOhl6FpzjoRqvZ5rcaA";

// --- Interfaces ---
interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  email: string | null;
}
interface DiscordGuild {
  id: string;
  name: string;
}
interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  publishedAt: admin.firestore.Timestamp;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  lastFetchedAt: admin.firestore.Timestamp;
}

// --- Helper Functions ---
function getDiscordAvatarUrl(userId: string, avatarHash: string | null): string | undefined {
    if (!avatarHash) return undefined;
    const format = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}?size=128`;
}

// --- Cloud Functions ---

// Discord 認証コールバック関数 (変更なし)
export const discordAuthCallback = onRequest(
  {
    region: "asia-northeast1",
    secrets: ["DISCORD_CLIENT_SECRET", "DISCORD_CLIENT_ID", "DISCORD_REDIRECT_URI", "DISCORD_TARGET_GUILD_ID"],
  },
  async (request, response) => {
    // ... (discordAuthCallback implementation remains the same) ...
    // --- CORS Headers ---
    const allowedOrigin = "https://suzumina-click-firebase.web.app"; // TODO: Consider making this configurable
    response.set("Access-Control-Allow-Origin", allowedOrigin);
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.set("Access-Control-Max-Age", "3600");

    // --- Handle Preflight (OPTIONS) Request ---
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    // --- Handle Actual Request (Expecting POST) ---
    logger.info("Discord Auth Callback received", { method: request.method });

    if (request.method !== "POST") {
      logger.error("Method Not Allowed (Should be POST)", { method: request.method });
      response.status(405).send("Method Not Allowed");
      return;
    }

    const code = request.body.code as string | undefined;

    if (!code) {
      logger.error("Authorization code not found in request body");
      response.status(400).send({ success: false, error: "Authorization code is required." });
      return;
    }

    // process.env からすべての設定値を取得
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    const targetGuildId = process.env.DISCORD_TARGET_GUILD_ID;

    if (!clientId || !clientSecret || !redirectUri || !targetGuildId) {
        logger.error("Discord configuration environment variables (from secrets) are not set correctly.", {
            clientIdExists: !!clientId,
            clientSecretExists: !!clientSecret,
            redirectUriExists: !!redirectUri,
            targetGuildIdExists: !!targetGuildId,
        });
        response.status(500).send({ success: false, error: "Server configuration error." });
        return;
    }

    try {
      // --- 1. Discord からアクセストークンを取得 ---
      logger.info("Requesting Discord access token...");
      const tokenResponse = await axios.post<{ access_token: string }>(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      const accessToken = tokenResponse.data.access_token;
      logger.info("Discord access token obtained.");

      // --- 2. Discord からユーザー情報を取得 ---
      logger.info("Fetching Discord user info...");
      const userResponse = await axios.get<DiscordUser>("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const discordUser = userResponse.data;
      const discordUserId = discordUser.id;
      const discordUsername = discordUser.username;
      const discordEmail = discordUser.email; // string | null
      const discordAvatarHash = discordUser.avatar;
      const discordAvatarUrl = getDiscordAvatarUrl(discordUserId, discordAvatarHash);
      logger.info("Discord user info fetched", { discordUserId, discordUsername, discordEmail, discordAvatarUrl });

      // --- 3. Discord から所属ギルド情報を取得 ---
      logger.info("Fetching Discord user guilds...");
      const guildsResponse = await axios.get<DiscordGuild[]>("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userGuilds = guildsResponse.data;
      logger.info("Discord user guilds fetched", { guildCount: userGuilds.length });

      // --- 4. ターゲットギルドに所属しているか確認 ---
      const isMember = userGuilds.some((guild: DiscordGuild) => guild.id === targetGuildId);

      if (!isMember) {
        logger.warn("User is not a member of the target guild", { discordUserId, targetGuildId });
        response.status(403).send({ success: false, error: "Guild membership required." });
        return;
      }
      logger.info("User is a member of the target guild", { discordUserId });

      // --- 5. Firebase Auth ユーザー情報の更新または作成 ---
      // 更新/作成するユーザー情報を準備 (email が null の場合は undefined に変換)
      const userProperties = {
        displayName: discordUsername,
        photoURL: discordAvatarUrl,
        email: discordEmail ?? undefined, // nullish coalescing operator を使用
      };

      try {
        // 既存ユーザーの情報を更新
        logger.info("Updating Firebase user...", { uid: discordUserId, properties: userProperties });
        await admin.auth().updateUser(discordUserId, userProperties);
        logger.info("Firebase user updated.", { uid: discordUserId });
      } catch (error: unknown) {
        const firebaseAuthError = error as FirebaseAuthError;
        if (firebaseAuthError.code === 'auth/user-not-found') {
          // ユーザーが存在しない場合は新規作成
          logger.info("Firebase user not found, creating new user...", { uid: discordUserId, properties: userProperties });
          await admin.auth().createUser({
            uid: discordUserId,
            ...userProperties,
          });
          logger.info("Firebase user created.", { uid: discordUserId });
        } else {
          // その他の Firebase Auth エラーは再スロー
          logger.error("Error updating/creating Firebase user:", error);
          throw error;
        }
      }

      // --- 6. Firebase カスタムトークンを生成 ---
      logger.info("Creating Firebase custom token...");
      const customToken = await admin.auth().createCustomToken(discordUserId);
      logger.info("Firebase custom token created", { discordUserId });

      // --- 7. カスタムトークンを返す ---
      response.status(200).send({ success: true, customToken });

    } catch (error: unknown) {
      logger.error("Error during Discord auth callback:", error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error("Axios error details:", {
            status: axiosError.response?.status,
            data: axiosError.response?.data,
            message: axiosError.message,
        });
      } else if (error instanceof Error) {
        logger.error("Generic error details:", { message: error.message, stack: error.stack });
      }
      response.status(500).send({ success: false, error: "Internal server error." });
    }
  }
);


// YouTube動画情報を定期的に取得してFirestoreに保存する関数 (Raw CloudEvent Handler - Adapted)
export const fetchYouTubeVideos = async (event: CloudEvent<SimplePubSubData>): Promise<void> => {
    logger.info("Entered fetchYouTubeVideos function (Raw CloudEvent Handler - Adapted)");
    // logger.info("Received raw event:", JSON.stringify(event, null, 2)); // REMOVED: Debug log

    // Access data directly from event.data (assuming it's the SimplePubSubData structure)
    const messageData = event.data; // The whole data part of the event
    if (!messageData) {
        logger.error("Event data is missing.", { event });
        return;
    }

    // Log attributes if they exist (might be top-level or inside messageData depending on exact format)
    const attributes = messageData.attributes ?? event.attributes; // Check both places
    if (attributes) {
        logger.info("Received attributes:", attributes);
    }

    // Decode base64 data if it exists directly in event.data.data
    let decodedData: string | undefined;
    if (messageData.data) {
        try {
            decodedData = Buffer.from(messageData.data, 'base64').toString('utf-8');
            logger.info("Decoded message data:", decodedData);
            // Optional: Parse if the decoded data is JSON
            // try {
            //   const jsonData = JSON.parse(decodedData);
            //   logger.info("Parsed JSON data:", jsonData);
            // } catch (parseErr) {
            //   logger.warn("Decoded data is not valid JSON.", { decodedData });
            // }
        } catch (err) {
            logger.error("Failed to decode base64 message data:", err);
        }
    } else {
        logger.info("No base64 data found in event.data.data");
    }

    // --- Rest of the function logic remains the same ---

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      logger.error("YOUTUBE_API_KEY secret not found in environment variables.");
      return;
    }

    const youtube = google.youtube({
      version: "v3",
      auth: apiKey,
    });

    const videosCollection = firestore.collection("videos");
    const now = FieldValue.serverTimestamp();

    try {
      logger.info(`Fetching video IDs for channel: ${SUZUKA_MINASE_CHANNEL_ID}`);
      const allVideoIds: string[] = [];
      let nextPageToken: string | undefined = undefined;

      do {
        const searchResponse: youtube_v3.Schema$SearchListResponse = (await youtube.search.list({
          part: ["id"],
          channelId: SUZUKA_MINASE_CHANNEL_ID,
          maxResults: 50,
          type: ["video"],
          order: "date",
          pageToken: nextPageToken,
        })).data;

        const videoIds = searchResponse.items
          ?.map((item) => item.id?.videoId)
          .filter((id): id is string => !!id) ?? [];

        allVideoIds.push(...videoIds);
        nextPageToken = searchResponse.nextPageToken ?? undefined;
        logger.info(`Fetched ${videoIds.length} video IDs. Next page token: ${nextPageToken}`);

      } while (nextPageToken);

      logger.info(`Total video IDs fetched: ${allVideoIds.length}`);
      if (allVideoIds.length === 0) {
        logger.info("No videos found for the channel.");
        return;
      }

      logger.info("Fetching video details...");
      const videoDetails: youtube_v3.Schema$Video[] = [];
      for (let i = 0; i < allVideoIds.length; i += 50) {
        const batchIds = allVideoIds.slice(i, i + 50);
        const videoResponse: youtube_v3.Schema$VideoListResponse = (await youtube.videos.list({
          part: ["snippet", "contentDetails", "statistics"],
          id: batchIds,
          maxResults: 50,
        })).data;

        if (videoResponse.items) {
          videoDetails.push(...videoResponse.items);
        }
        logger.info(`Fetched details for ${videoResponse.items?.length ?? 0} videos (Batch ${i / 50 + 1})`);
      }
      logger.info(`Total video details fetched: ${videoDetails.length}`);

      logger.info("Writing video data to Firestore...");
      const batch = firestore.batch();
      let batchCounter = 0;
      const maxBatchSize = 500;

      for (const video of videoDetails) {
        if (!video.id || !video.snippet) {
          logger.warn("Skipping video due to missing ID or snippet:", video);
          continue;
        }

        const videoData: YouTubeVideoData = {
          videoId: video.id,
          title: video.snippet.title ?? "",
          description: video.snippet.description ?? "",
          publishedAt: video.snippet.publishedAt ? admin.firestore.Timestamp.fromDate(new Date(video.snippet.publishedAt)) : admin.firestore.Timestamp.now(),
          thumbnailUrl: video.snippet.thumbnails?.default?.url ?? "",
          channelId: video.snippet.channelId ?? "",
          channelTitle: video.snippet.channelTitle ?? "",
          lastFetchedAt: now as admin.firestore.Timestamp,
        };

        const videoRef = videosCollection.doc(video.id);
        batch.set(videoRef, videoData, { merge: true });
        batchCounter++;

        if (batchCounter >= maxBatchSize) {
          logger.info(`Committing batch of ${batchCounter} video documents...`);
          await batch.commit().catch((err) => logger.error("Error committing Firestore batch:", err));
          logger.warn(`Batch size limit (${maxBatchSize}) reached. Committed current batch. For channels > ${maxBatchSize} videos, consider adjustments.`);
        }
      }

      if (batchCounter > 0) {
        logger.info(`Committing final batch of ${batchCounter} video documents...`);
        await batch.commit();
        logger.info("Firestore batch commit successful.");
      } else {
         logger.info("No video details to commit to Firestore.");
      }

      logger.info("fetchYouTubeVideos function finished successfully.");

    } catch (error: unknown) {
      logger.error("Error in fetchYouTubeVideos function:", error);
      // throw error; // Consider re-throwing for retries if appropriate
    }
}; // End of fetchYouTubeVideos
