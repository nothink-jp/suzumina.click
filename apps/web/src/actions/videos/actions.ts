"use server";

/**
 * 動画関連の共通Server Actions
 *
 * このファイルには動画関連の共通アクションをエクスポートします
 */

import { formatErrorMessage, getFirestoreAdmin } from "@/lib/firebase/admin";

// 動画関連の型定義
export interface VideoData {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
  };
}

/**
 * 動画データを取得する
 *
 * @param videoId YouTubeの動画ID
 * @returns 動画データ
 */
export async function getVideo(videoId: string): Promise<VideoData | null> {
  try {
    // 動画IDのバリデーション
    if (!videoId || typeof videoId !== "string") {
      throw new Error("動画IDが指定されていません");
    }

    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();

    // 動画データを取得
    const videoDoc = await db.collection("videos").doc(videoId).get();

    if (!videoDoc.exists) {
      return null;
    }

    const videoData = videoDoc.data() as Omit<VideoData, "id">;
    return {
      id: videoDoc.id,
      ...videoData,
    };
  } catch (error) {
    console.error("動画データの取得に失敗しました:", error);
    throw new Error(
      await formatErrorMessage("動画の取得に失敗しました", error),
    );
  }
}

/**
 * 最新の動画を一覧で取得する
 *
 * @param options 取得オプション
 * @returns 動画リスト結果 (VideoListResult)
 */
export async function getRecentVideos(
  options:
    | {
        limit?: number;
        startAfter?: string;
        videoType?: string;
        lastPublishedAt?: Date;
      }
    | number = 10,
): Promise<{ videos: VideoData[]; hasMore: boolean; lastVideo?: VideoData }> {
  try {
    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();

    // 互換性のために数値の場合は limitとして扱う
    const limit = typeof options === "number" ? options : (options.limit ?? 10);
    const startAfter =
      typeof options === "object" ? options.startAfter : undefined;
    const videoType =
      typeof options === "object" ? options.videoType : undefined;
    const lastPublishedAt =
      typeof options === "object" ? options.lastPublishedAt : undefined;

    // クエリ構築
    let query = db.collection("videos").orderBy("publishedAt", "desc");

    // 特定のタイプの動画のみ取得する場合
    if (videoType) {
      query = query.where("videoType", "==", videoType);
    }

    // ページネーション - startAfterまたはlastPublishedAtが指定されている場合
    if (startAfter) {
      const lastDoc = await db.collection("videos").doc(startAfter).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    } else if (lastPublishedAt) {
      query = query.startAfter(lastPublishedAt);
    }

    // 取得数の制限（hasMoreを判断するため+1）
    query = query.limit(limit + 1);

    // クエリ実行
    const videosSnapshot = await query.get();

    if (videosSnapshot.empty) {
      return { videos: [], hasMore: false };
    }

    // hasMore判定のため、limitより1つ多く取得している
    const hasMore = videosSnapshot.size > limit;

    // 結果を整形（limitを超えた分は削除）
    const videos = videosSnapshot.docs.slice(0, limit).map((doc) => {
      const videoData = doc.data() as Omit<VideoData, "id">;
      return {
        id: doc.id,
        ...videoData,
      };
    });

    // 最後のドキュメント
    const lastVideo = hasMore ? videos[videos.length - 1] : undefined;

    return {
      videos,
      hasMore,
      lastVideo,
    };
  } catch (error) {
    console.error("動画一覧の取得に失敗しました:", error);
    throw new Error(
      await formatErrorMessage("動画の取得に失敗しました", error),
    );
  }
}

/**
 * プレイリストIDに基づいて動画一覧を取得する
 *
 * @param playlistId YouTubeのプレイリストID
 * @param limit 取得する件数（デフォルト20件）
 * @returns 動画リスト結果
 */
export async function getVideosByPlaylist(
  playlistId: string,
  limit = 20,
): Promise<{ videos: VideoData[]; hasMore: boolean }> {
  try {
    // プレイリストIDのバリデーション
    if (!playlistId) {
      throw new Error("プレイリストIDが指定されていません");
    }

    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();

    // プレイリストIDでフィルタして動画を取得
    const query = await db
      .collection("videos")
      .where("playlistId", "==", playlistId)
      .orderBy("publishedAt", "desc")
      .limit(limit + 1)
      .get();

    if (query.empty) {
      return { videos: [], hasMore: false };
    }

    // hasMore判定のため、limitより1つ多く取得している
    const hasMore = query.size > limit;

    // 結果を整形（limitを超えた分は削除）
    const videos = query.docs.slice(0, limit).map((doc) => {
      const videoData = doc.data() as Omit<VideoData, "id">;
      return {
        id: doc.id,
        ...videoData,
      };
    });

    return {
      videos,
      hasMore,
    };
  } catch (error) {
    console.error("プレイリスト動画の取得に失敗しました:", error);
    throw new Error(
      await formatErrorMessage("プレイリスト動画の取得に失敗しました", error),
    );
  }
}
