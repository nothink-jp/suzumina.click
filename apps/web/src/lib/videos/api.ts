import {
  getVideo as getVideoByIdAction,
  getRecentVideos as getVideos,
} from "@/actions/videos/actions";
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
    // パラメータの整形
    const options = {
      limit: params.limit,
      // startAfterはstring型としてそのまま渡す
      startAfter: params.startAfter,
      // videoTypeが"all"の場合はundefinedとして扱う
      videoType: params.videoType === "all" ? undefined : params.videoType,
    };

    // Server Actionを呼び出す
    const result = await getVideos(options);

    // VideoData[]をVideo[]に変換
    const videos = result.videos.map((videoData) => {
      // サムネイル情報の抽出
      const thumbnailUrl =
        videoData.thumbnails?.high?.url ||
        videoData.thumbnails?.medium?.url ||
        videoData.thumbnails?.default?.url ||
        "";

      // 日付文字列をDate型に変換
      let publishedAt: Date;
      try {
        publishedAt = dayjs(videoData.publishedAt).toDate();
      } catch (e) {
        publishedAt = new Date();
      }

      // Video型に変換
      return {
        id: videoData.id,
        title: videoData.title,
        description: videoData.description,
        publishedAt,
        publishedAtISO: videoData.publishedAt,
        thumbnailUrl,
        channelId: videoData.channelId,
        channelTitle: videoData.channelTitle,
        // 以下のプロパティはVideoDataにない可能性があるため、デフォルト値を設定
        lastFetchedAt: new Date(),
        lastFetchedAtISO: new Date().toISOString(),
        liveBroadcastContent: "none",
      } as Video;
    });

    // 最後のビデオを取得
    const lastVideo = videos.length > 0 ? videos[videos.length - 1] : undefined;

    return {
      videos,
      hasMore: result.hasMore,
      lastVideo,
    };
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
    const videoData = await getVideoByIdAction(videoId);

    // データがない場合はnullを返す
    if (!videoData) {
      return null;
    }

    // VideoData型からVideo型へ変換
    // サムネイル情報の抽出
    const thumbnailUrl =
      videoData.thumbnails?.high?.url ||
      videoData.thumbnails?.medium?.url ||
      videoData.thumbnails?.default?.url ||
      "";

    // 日付文字列をDate型に変換
    let publishedAt: Date;
    try {
      publishedAt = dayjs(videoData.publishedAt).toDate();
    } catch (e) {
      publishedAt = new Date();
    }

    // Video型として整形
    const video: Video = {
      id: videoData.id,
      title: videoData.title,
      description: videoData.description,
      publishedAt,
      publishedAtISO: videoData.publishedAt,
      thumbnailUrl,
      channelId: videoData.channelId,
      channelTitle: videoData.channelTitle,
      // 以下のプロパティはVideoDataにない可能性があるため、デフォルト値を設定
      lastFetchedAt: new Date(),
      lastFetchedAtISO: new Date().toISOString(),
      liveBroadcastContent: "none",
    };

    return video;
  } catch (error) {
    console.error(`動画ID ${videoId} の取得に失敗しました:`, error);
    return null;
  }
}
