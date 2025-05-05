"use server";

/**
 * 動画関連の共通Server Actions
 *
 * このファイルには動画関連の共通アクションをエクスポートします
 */

import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "../auth/firebase-admin";

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
      throw new Error("有効な動画IDが必要です");
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

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
      `動画データの取得に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
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
      }
    | number = 10,
): Promise<{ videos: VideoData[]; hasMore: boolean; lastVideo?: VideoData }> {
  try {
    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // 互換性のために数値の場合は limitとして扱う
    const limit = typeof options === "number" ? options : (options.limit ?? 10);
    const startAfter =
      typeof options === "object" ? options.startAfter : undefined;
    const videoType =
      typeof options === "object" ? options.videoType : undefined;

    // クエリ構築
    let query = db.collection("videos").orderBy("publishedAt", "desc");

    // 特定のタイプの動画のみ取得する場合
    if (videoType) {
      query = query.where("videoType", "==", videoType);
    }

    // startAfterが指定されている場合はページネーション
    if (startAfter) {
      query = query.startAfter(startAfter);
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
      `動画一覧の取得に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
