// functions/src/youtube.ts
import * as logger from "firebase-functions/logger";
import { Timestamp } from "firebase-admin/firestore";
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

/**
 * YouTubeから水瀬鈴花チャンネルの動画情報を取得し、Firestoreに保存する関数
 * 
 * 1. Pub/Subからのトリガーを受け取る
 * 2. YouTube Data APIを使用してチャンネルの動画リストを取得
 * 3. 各動画の詳細情報を取得
 * 4. 取得した情報をFirestoreに保存
 * 
 * @param event - Pub/SubトリガーからのCloudEvent
 * @returns Promise<void> - 非同期処理の完了を表すPromise
 */
export const fetchYouTubeVideos = async (
  event: CloudEvent<SimplePubSubData>,
): Promise<void> => {
  logger.info(
    "fetchYouTubeVideos 関数を開始しました (Raw CloudEvent Handler - Adapted)",
  );

  // イベントデータの検証
  const messageData = event.data;
  if (!messageData) {
    logger.error("イベントデータが不足しています", { event });
    return;
  }

  // 属性情報の処理
  const attributes = messageData.attributes ?? event.attributes;
  if (attributes) {
    logger.info("受信した属性情報:", attributes);
  }

  // Base64エンコードされたデータがあれば復号
  if (messageData.data) {
    try {
      const decodedData = Buffer.from(messageData.data, "base64").toString(
        "utf-8",
      );
      logger.info("デコードされたメッセージデータ:", decodedData);
    } catch (err) {
      logger.error("Base64メッセージデータのデコードに失敗しました:", err);
      // デコード失敗したら処理を中断する
      return;
    }
  } else {
    logger.info("Base64データはイベント内に見つかりませんでした");
  }

  // YouTube API キーの取得と検証
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    logger.error("環境変数に YOUTUBE_API_KEY が設定されていません");
    return;
  }

  // YouTubeクライアント初期化
  const youtube = google.youtube({
    version: "v3",
    auth: apiKey,
  });

  const videosCollection = firestore.collection("videos");
  const now = Timestamp.now();

  try {
    logger.info(`チャンネル ${SUZUKA_MINASE_CHANNEL_ID} の動画IDを取得中`);
    const allVideoIds: string[] = [];
    let nextPageToken: string | undefined = undefined;

    // ページネーションを使用して全動画IDを取得
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
        `${videoIds.length}件の動画IDを取得しました。次ページトークン: ${nextPageToken}`,
      );
    } while (nextPageToken);

    logger.info(`取得した動画ID合計: ${allVideoIds.length}件`);
    if (allVideoIds.length === 0) {
      logger.info("チャンネルに動画が見つかりませんでした");
      return;
    }

    logger.info("動画の詳細情報を取得中...");
    const videoDetails: youtube_v3.Schema$Video[] = [];
    
    // YouTube API の制限（最大50件）に合わせてバッチ処理
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
        `${videoResponse.items?.length ?? 0}件の動画詳細を取得しました（バッチ ${i / 50 + 1}）`,
      );
    }
    logger.info(`取得した動画詳細合計: ${videoDetails.length}件`);

    logger.info("動画データをFirestoreに書き込み中...");
    let batch = firestore.batch();
    let batchCounter = 0;
    const maxBatchSize = 500; // Firestoreのバッチ書き込み上限

    // 動画データをFirestoreにバッチ書き込み
    for (const video of videoDetails) {
      if (!video.id || !video.snippet) {
        logger.warn("IDまたはスニペットが不足しているため動画をスキップします:", video);
        continue;
      }

      // Firestoreに保存するデータの作成
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

      // バッチサイズの上限に達したらコミット
      if (batchCounter >= maxBatchSize) {
        logger.info(`${batchCounter}件の動画ドキュメントのバッチをコミット中...`);
        await batch
          .commit()
          .catch((err) =>
            logger.error("Firestoreバッチコミット中にエラーが発生しました (ループ内):", err),
          );
        logger.info("バッチをコミットしました。バッチとカウンターをリセットします");
        batch = firestore.batch();
        batchCounter = 0;
      }
    }

    // 残りのデータがあればコミット
    if (batchCounter > 0) {
      logger.info(
        `最終バッチ ${batchCounter}件の動画ドキュメントをコミット中...`,
      );
      await batch.commit().then(() => {
        logger.info("Firestoreバッチコミットが成功しました");
      }).catch((err) => {
        logger.error("最終Firestoreバッチコミット中にエラーが発生しました:", err);
      });
    } else {
      logger.info(
        "最終バッチに書き込む動画詳細がありませんでした",
      );
    }

    logger.info("fetchYouTubeVideos 関数の処理を完了しました");
  } catch (error: unknown) {
    // YouTube API エラーや予期せぬエラーはこちらで捕捉
    logger.error("fetchYouTubeVideos 関数で例外が発生しました:", error);
  }
};
