"use server";

import { getAdminFirestore } from "@/lib/videos/server";
import type { Video, VideoListResult } from "@/lib/videos/types";
import type { VideoType } from "@/lib/videos/types";
import dayjs from "dayjs";

/**
 * 動画一覧を取得するServer Action
 * @param options 取得オプション
 * @returns 動画一覧とページネーション情報
 */
export async function getVideos(options: {
  limit?: number;
  startAfter?: string;
  videoType?: VideoType;
}): Promise<VideoListResult> {
  try {
    const limit_count = options.limit || 10;

    // Firestoreインスタンスの取得
    const db = getAdminFirestore();

    // クエリの基本構築
    let videosQuery = db.collection("videos").orderBy("publishedAt", "desc");

    // 動画タイプによるフィルタリング
    if (options.videoType === "archived") {
      videosQuery = db
        .collection("videos")
        .where("liveBroadcastContent", "in", ["none"])
        .orderBy("publishedAt", "desc");
    } else if (options.videoType === "upcoming") {
      videosQuery = db
        .collection("videos")
        .where("liveBroadcastContent", "in", ["upcoming", "live"])
        .orderBy("publishedAt", "asc"); // 予定配信は古い順（近い将来のものから）
    }

    // 開始日時によるページネーション
    if (options.startAfter) {
      try {
        const parsed = dayjs(options.startAfter);

        // dayjsで無効な日付を明示的にチェック
        if (!parsed.isValid()) {
          console.warn("無効な日付形式です:", options.startAfter);
        } else {
          const startAfterDate = parsed.toDate();
          videosQuery = videosQuery.startAfter(startAfterDate);
        }
      } catch (error) {
        console.warn("startAfterの処理中にエラーが発生しました:", error);
      }
    }

    // 次ページがあるか確認するために1つ多く取得
    videosQuery = videosQuery.limit(limit_count + 1);

    // データの取得
    const snapshot = await videosQuery.get();
    const videos: Video[] = [];

    // 結果の処理
    for (const doc of snapshot.docs) {
      if (videos.length < limit_count) {
        // 実際に返すのは指定された数まで
        const data = doc.data();
        const publishedAt = data.publishedAt?.toDate();
        const lastFetchedAt = data.lastFetchedAt?.toDate();

        videos.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          publishedAt: publishedAt || new Date(),
          publishedAtISO: publishedAt?.toISOString(),
          thumbnailUrl: data.thumbnailUrl || "",
          channelId: data.channelId || "",
          channelTitle: data.channelTitle || "",
          lastFetchedAt: lastFetchedAt || new Date(),
          lastFetchedAtISO: lastFetchedAt?.toISOString(),
          liveBroadcastContent: data.liveBroadcastContent,
        });
      }
    }

    // 次のページがあるかどうか
    const hasMore = snapshot.size > limit_count;

    return {
      videos,
      hasMore,
      lastVideo: videos.length > 0 ? videos[videos.length - 1] : undefined,
    };
  } catch (error) {
    console.error("動画リスト取得中にエラーが発生しました:", error);
    return { videos: [], hasMore: false };
  }
}

/**
 * 特定の動画IDの詳細を取得するServer Action
 * @param videoId 動画ID
 * @returns 動画詳細情報、存在しない場合はnull
 */
export async function getVideoById(videoId: string): Promise<Video | null> {
  try {
    // Firestoreインスタンスの取得
    const db = getAdminFirestore();

    // 動画ドキュメントの取得
    const videoRef = db.collection("videos").doc(videoId);
    const videoDoc = await videoRef.get();

    // 存在チェック
    if (!videoDoc.exists) {
      return null;
    }

    // データの変換
    const data = videoDoc.data();
    if (!data) {
      return null;
    }

    const publishedAt = data.publishedAt?.toDate();
    const lastFetchedAt = data.lastFetchedAt?.toDate();

    return {
      id: videoDoc.id,
      title: data.title || "",
      description: data.description || "",
      publishedAt: publishedAt || new Date(),
      publishedAtISO: publishedAt?.toISOString(),
      thumbnailUrl: data.thumbnailUrl || "",
      channelId: data.channelId || "",
      channelTitle: data.channelTitle || "",
      lastFetchedAt: lastFetchedAt || new Date(),
      lastFetchedAtISO: lastFetchedAt?.toISOString(),
      liveBroadcastContent: data.liveBroadcastContent,
    };
  } catch (error) {
    console.error(`動画ID ${videoId} の取得中にエラーが発生しました:`, error);
    return null;
  }
}
