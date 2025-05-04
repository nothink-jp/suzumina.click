import {
  getVideoById as getVideoByIdAction,
  getVideos,
} from "@/app/actions/videos";
import dayjs from "dayjs";
import type { PaginationParams, Video, VideoListResult } from "./types";

/**
 * 最新の動画リストを取得する
 * クライアントサイドでの使用を想定
 * @param params ページネーションパラメータ
 * @returns 動画リストと次ページ情報
 */
export async function getRecentVideos(
  params: PaginationParams = { limit: 10 },
): Promise<VideoListResult> {
  try {
    // Server Actionを呼び出す
    const data = await getVideos({
      limit: params.limit,
      startAfter: params.startAfter
        ? dayjs(params.startAfter).toISOString()
        : undefined,
      videoType: params.videoType,
    });

    // レスポンスデータの日付文字列をDate型に変換
    if (data.videos && Array.isArray(data.videos)) {
      data.videos = data.videos.map((video: Video) => {
        // publishedAtISOがある場合は、それを使用してpublishedAtを上書き
        if (video.publishedAtISO) {
          try {
            const date = dayjs(video.publishedAtISO);
            if (date.isValid()) {
              video.publishedAt = date.toDate();
            }
          } catch (error) {
            console.error("publishedAtの変換中にエラーが発生しました:", error);
          }
        }

        // lastFetchedAtISOがある場合は、それを使用してlastFetchedAtを上書き
        if (video.lastFetchedAtISO) {
          try {
            const date = dayjs(video.lastFetchedAtISO);
            if (date.isValid()) {
              video.lastFetchedAt = date.toDate();
            }
          } catch (error) {
            console.error(
              "lastFetchedAtの変換中にエラーが発生しました:",
              error,
            );
          }
        }

        return video;
      });
    }

    return data;
  } catch (error) {
    console.error("動画リストの取得に失敗しました:", error);
    return { videos: [], hasMore: false };
  }
}

/**
 * 特定の動画IDの詳細を取得する
 * クライアントサイドでの使用を想定
 * @param videoId 動画ID
 * @returns 動画詳細情報、存在しない場合はnull
 */
export async function getVideoById(videoId: string): Promise<Video | null> {
  try {
    // Server Actionを呼び出す
    const data = await getVideoByIdAction(videoId);

    // 日付文字列をDate型に変換
    if (data) {
      // publishedAtISOがある場合は、それを使用してpublishedAtを上書き
      if (data.publishedAtISO) {
        try {
          const date = dayjs(data.publishedAtISO);
          if (date.isValid()) {
            data.publishedAt = date.toDate();
          }
        } catch (error) {
          console.error("publishedAtの変換中にエラーが発生しました:", error);
        }
      }

      // lastFetchedAtISOがある場合は、それを使用してlastFetchedAtを上書き
      if (data.lastFetchedAtISO) {
        try {
          const date = dayjs(data.lastFetchedAtISO);
          if (date.isValid()) {
            data.lastFetchedAt = date.toDate();
          }
        } catch (error) {
          console.error("lastFetchedAtの変換中にエラーが発生しました:", error);
        }
      }
    }

    return data;
  } catch (error) {
    console.error(`動画ID ${videoId} の取得に失敗しました:`, error);
    return null;
  }
}
