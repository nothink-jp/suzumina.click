// functions/src/youtube.ts
import * as logger from "firebase-functions/logger";
import { Timestamp } from "firebase-admin/firestore"; // Timestamp をインポート (FieldValue は不要になった)
import { google } from "googleapis";
import type { youtube_v3 } from "googleapis";
import type { CloudEvent } from "@google-cloud/functions-framework";
import { initializeFirebaseAdmin, firestore } from "./firebaseAdmin";
import {
  SUZUKA_MINASE_CHANNEL_ID,
  type SimplePubSubData,
  type YouTubeVideoData,
} from "./common";

initializeFirebaseAdmin();

export const fetchYouTubeVideos = async (
  event: CloudEvent<SimplePubSubData>,
): Promise<void> => {
  logger.info(
    "Entered fetchYouTubeVideos function (Raw CloudEvent Handler - Adapted)",
  );

  const messageData = event.data;
  if (!messageData) {
    logger.error("Event data is missing.", { event });
    return;
  }

  const attributes = messageData.attributes ?? event.attributes;
  if (attributes) {
    logger.info("Received attributes:", attributes);
  }

  if (messageData.data) {
    try {
      const decodedData = Buffer.from(messageData.data, "base64").toString(
        "utf-8",
      );
      logger.info("Decoded message data:", decodedData);
    } catch (err) {
      logger.error("Failed to decode base64 message data:", err);
      // デコード失敗したら処理を中断する
      return;
    }
  } else {
    logger.info("No base64 data found in event.data.data");
  }

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
  const now = Timestamp.now();

  try {
    logger.info(`Fetching video IDs for channel: ${SUZUKA_MINASE_CHANNEL_ID}`);
    const allVideoIds: string[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const searchResponse: youtube_v3.Schema$SearchListResponse = (
        await youtube.search.list({
          part: ["id"],
          channelId: SUZUKA_MINASE_CHANNEL_ID,
          maxResults: 50,
          type: ["video"],
          order: "date",
          pageToken: nextPageToken,
        })
      ).data;

      const videoIds =
        searchResponse.items
          ?.map((item) => item.id?.videoId)
          .filter((id): id is string => !!id) ?? [];
      allVideoIds.push(...videoIds);
      nextPageToken = searchResponse.nextPageToken ?? undefined;
      logger.info(
        `Fetched ${videoIds.length} video IDs. Next page token: ${nextPageToken}`,
      );
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
      const videoResponse: youtube_v3.Schema$VideoListResponse = (
        await youtube.videos.list({
          part: ["snippet", "contentDetails", "statistics"],
          id: batchIds,
          maxResults: 50,
        })
      ).data;
      if (videoResponse.items) {
        videoDetails.push(...videoResponse.items);
      }
      logger.info(
        `Fetched details for ${videoResponse.items?.length ?? 0} videos (Batch ${i / 50 + 1})`,
      );
    }
    logger.info(`Total video details fetched: ${videoDetails.length}`);

    logger.info("Writing video data to Firestore...");
    let batch = firestore.batch();
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
        publishedAt: video.snippet.publishedAt
          ? Timestamp.fromDate(new Date(video.snippet.publishedAt))
          : Timestamp.now(),
        thumbnailUrl: video.snippet.thumbnails?.default?.url ?? "",
        channelId: video.snippet.channelId ?? "",
        channelTitle: video.snippet.channelTitle ?? "",
        lastFetchedAt: now,
      };

      const videoRef = videosCollection.doc(video.id);
      batch.set(videoRef, videoData, { merge: true });
      batchCounter++;

      if (batchCounter >= maxBatchSize) {
        logger.info(`Committing batch of ${batchCounter} video documents...`);
        // エラーをログに記録するが、処理は続行する（エラーがあっても次のバッチへ）
        await batch
          .commit()
          .catch((err) =>
            logger.error("Error committing Firestore batch (in loop):", err),
          );
        logger.info("Batch committed. Resetting batch and counter.");
        batch = firestore.batch();
        batchCounter = 0;
      }
    }

    if (batchCounter > 0) {
      logger.info(
        `Committing final batch of ${batchCounter} video documents...`,
      );
      // 最後のバッチコミットにも .catch() を追加
      await batch.commit().then(() => {
        logger.info("Firestore batch commit successful.");
      }).catch((err) => {
        logger.error("Error committing final Firestore batch:", err);
        // ここでエラーを再スローするかどうかは要件による
        // 再スローしない場合、外側の catch には到達しない
      });
    } else {
      logger.info(
        "No video details to commit to Firestore in the final batch.",
      );
    }

    // 最終的な成功ログ (バッチコミットのエラーがあってもここには到達する可能性がある)
    logger.info("fetchYouTubeVideos function finished processing.");
  } catch (error: unknown) {
    // YouTube API エラーや予期せぬエラーはこちらで捕捉
    logger.error("Error in fetchYouTubeVideos function (outer catch):", error);
  }
};
