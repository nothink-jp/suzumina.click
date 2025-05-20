import type {
  FirestoreServerVideoData,
  LiveBroadcastContent,
} from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import firestore, { Timestamp } from "./firestore";
import * as logger from "./logger";

// Firestore関連の定数
const VIDEOS_COLLECTION = "videos";
const MAX_FIRESTORE_BATCH_SIZE = 500; // Firestoreのバッチ書き込み上限

/**
 * 利用可能な最大サイズのサムネイルURLを取得
 *
 * @param thumbnails - YouTube APIから返されるサムネイル情報
 * @returns 最適なサムネイルURL（見つからない場合は空文字列）
 */
function getBestThumbnailUrl(
  thumbnails?: youtube_v3.Schema$ThumbnailDetails,
): string {
  if (!thumbnails) return "";

  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
}

/**
 * YouTube APIの配信状態を型安全なLiveBroadcastContentに変換
 *
 * @param liveBroadcastContent - YouTube APIから返される配信状態
 * @returns 型安全な配信状態
 */
function convertLiveBroadcastContent(
  liveBroadcastContent: string | null | undefined,
): LiveBroadcastContent {
  if (liveBroadcastContent === "live") return "live";
  if (liveBroadcastContent === "upcoming") return "upcoming";
  return "none";
}

/**
 * YouTube API動画データをFirestore用のデータ形式に変換
 *
 * @param video - YouTube APIから返される動画データ
 * @param now - 現在のタイムスタンプ
 * @returns Firestore用の動画データ、または無効なデータの場合はnull
 */
function createVideoData(
  video: youtube_v3.Schema$Video,
  now: Timestamp,
): FirestoreServerVideoData | null {
  // 必須フィールドの検証
  if (!video.id || !video.snippet) {
    logger.warn(
      "IDまたはスニペットが不足しているため動画をスキップします:",
      // biome-ignore lint/suspicious/noExplicitAny: Complexity type of Youtube
      video as any,
    );
    return null;
  }

  // 基本データの作成
  const videoData: FirestoreServerVideoData = {
    videoId: video.id,
    title: video.snippet.title ?? "",
    description: video.snippet.description ?? "",
    publishedAt: video.snippet.publishedAt
      ? Timestamp.fromDate(new Date(video.snippet.publishedAt))
      : now,
    thumbnailUrl: getBestThumbnailUrl(video.snippet.thumbnails),
    channelId: video.snippet.channelId ?? "",
    channelTitle: video.snippet.channelTitle ?? "",
    lastFetchedAt: now,
    liveBroadcastContent: convertLiveBroadcastContent(
      video.snippet.liveBroadcastContent,
    ),
    // スニペット内の追加データを追加
    categoryId: video.snippet.categoryId ?? undefined,
    tags: video.snippet.tags ?? undefined,
  };

  // contentDetailsパートのデータがあれば追加
  if (video.contentDetails) {
    videoData.duration = video.contentDetails.duration ?? undefined;
    videoData.dimension = video.contentDetails.dimension ?? undefined;
    videoData.definition = video.contentDetails.definition ?? undefined;
    videoData.caption = video.contentDetails.caption === "true";
    videoData.licensedContent =
      video.contentDetails.licensedContent ?? undefined;
    // contentRatingオブジェクトがある場合、Record<string, string>形式に変換
    if (video.contentDetails.contentRating) {
      const contentRating: Record<string, string> = {};
      // 各プロパティを確認し、stringの値のみを抽出
      for (const [key, value] of Object.entries(
        video.contentDetails.contentRating,
      )) {
        if (typeof value === "string") {
          contentRating[key] = value;
        }
      }
      videoData.contentRating = contentRating;
    } else {
      videoData.contentRating = undefined;
    }
    // nullをundefinedに変換してregionRestrictionを設定
    if (video.contentDetails.regionRestriction) {
      videoData.regionRestriction = {
        allowed: video.contentDetails.regionRestriction.allowed || undefined,
        blocked: video.contentDetails.regionRestriction.blocked || undefined,
      };
    } else {
      videoData.regionRestriction = undefined;
    }
  }

  // statisticsパートのデータがあれば追加
  if (video.statistics) {
    videoData.statistics = {
      viewCount: Number.parseInt(video.statistics.viewCount || "0", 10) || 0,
      likeCount: Number.parseInt(video.statistics.likeCount || "0", 10) || 0,
      commentCount:
        Number.parseInt(video.statistics.commentCount || "0", 10) || 0,
      favoriteCount:
        Number.parseInt(video.statistics.favoriteCount || "0", 10) || 0,
    };
  }

  // liveStreamingDetailsパートのデータがあれば追加
  if (video.liveStreamingDetails) {
    videoData.liveStreamingDetails = {
      scheduledStartTime: video.liveStreamingDetails.scheduledStartTime
        ? Timestamp.fromDate(
            new Date(video.liveStreamingDetails.scheduledStartTime),
          )
        : undefined,
      scheduledEndTime: video.liveStreamingDetails.scheduledEndTime
        ? Timestamp.fromDate(
            new Date(video.liveStreamingDetails.scheduledEndTime),
          )
        : undefined,
      actualStartTime: video.liveStreamingDetails.actualStartTime
        ? Timestamp.fromDate(
            new Date(video.liveStreamingDetails.actualStartTime),
          )
        : undefined,
      actualEndTime: video.liveStreamingDetails.actualEndTime
        ? Timestamp.fromDate(new Date(video.liveStreamingDetails.actualEndTime))
        : undefined,
      concurrentViewers: video.liveStreamingDetails.concurrentViewers
        ? Number.parseInt(video.liveStreamingDetails.concurrentViewers, 10)
        : undefined,
    };
  }

  // playerパートからのデータを取得するには追加リクエストが必要
  // topicDetailsパートからのデータを取得
  if (video.topicDetails) {
    videoData.topicDetails = {
      topicCategories: video.topicDetails.topicCategories ?? undefined,
    };
  }

  // statusパートからのデータを取得
  if (video.status) {
    videoData.status = {
      uploadStatus: video.status.uploadStatus ?? undefined,
      privacyStatus: video.status.privacyStatus ?? undefined,
      commentStatus: video.status.license ?? undefined,
    };
  }

  // recordingDetailsパートのデータを取得
  if (video.recordingDetails) {
    videoData.recordingDetails = {
      locationDescription:
        video.recordingDetails.locationDescription ?? undefined,
      recordingDate: video.recordingDetails.recordingDate
        ? Timestamp.fromDate(new Date(video.recordingDetails.recordingDate))
        : undefined,
    };
  }
  return videoData;
}

/**
 * Firestoreに動画データを保存
 *
 * @param videoDetails - 保存する動画詳細情報
 * @returns Promise<number> - 保存した動画数
 */
export async function saveVideosToFirestore(
  videoDetails: youtube_v3.Schema$Video[],
): Promise<number> {
  if (videoDetails.length === 0) {
    logger.debug("保存する動画情報がありません");
    return 0;
  }

  logger.debug("動画データをFirestoreに書き込み中...");
  const now = Timestamp.now();
  const videosCollection = firestore.collection(VIDEOS_COLLECTION);
  let batch = firestore.batch();
  let batchCounter = 0;
  let validVideoCount = 0;

  // 動画データをFirestoreにバッチ書き込み
  for (const video of videoDetails) {
    // 動画データを変換
    const videoData = createVideoData(video, now);
    if (!videoData || !video.id) continue;

    validVideoCount++;
    const videoRef = videosCollection.doc(video.id);
    batch.set(videoRef, videoData, { merge: true });
    batchCounter++;

    // バッチサイズの上限に達したらコミット
    if (batchCounter >= MAX_FIRESTORE_BATCH_SIZE) {
      logger.debug(
        `${batchCounter}件の動画ドキュメントのバッチをコミット中...`,
      );
      await batch
        .commit()
        .catch((err) =>
          logger.error(
            "Firestoreバッチコミット中にエラーが発生しました (ループ内):",
            err,
          ),
        );
      logger.debug(
        "バッチをコミットしました。バッチとカウンターをリセットします",
      );
      batch = firestore.batch();
      batchCounter = 0;
    }
  }

  // 残りのデータがあればコミット
  if (batchCounter > 0) {
    logger.info(
      `最終バッチ ${batchCounter}件の動画ドキュメントをコミット中...`,
    );
    await batch
      .commit()
      .then(() => {
        logger.debug("Firestoreバッチコミットが成功しました");
      })
      .catch((err) => {
        logger.error(
          "最終Firestoreバッチコミット中にエラーが発生しました:",
          err,
        );
      });
  } else {
    logger.debug("最終バッチに書き込む動画詳細がありませんでした");
  }

  return validVideoCount;
}

/**
 * 単一の動画データをFirestore用のデータ形式に変換（外部公開用）
 *
 * @param videoData - YouTube APIから返される動画データ
 * @returns Firestore用の動画データ
 */
export function convertVideoDataForFirestore(
  videoData: youtube_v3.Schema$Video,
): FirestoreServerVideoData | null {
  return createVideoData(videoData, Timestamp.now());
}
