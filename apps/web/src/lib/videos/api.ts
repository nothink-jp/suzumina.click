import {
  getVideo as getVideoByIdAction,
  getRecentVideos as getVideos,
} from "@/actions/videos/actions";
import type {
  LiveBroadcastContent,
  PaginationParams,
  Video,
  VideoListResult,
} from "./types";

// テスト用のインターフェース
interface ThumbnailInfo {
  url: string;
  width?: number;
  height?: number;
}

interface Thumbnails {
  default?: ThumbnailInfo;
  medium?: ThumbnailInfo;
  high?: ThumbnailInfo;
}

// 拡張されたビデオデータ型（テストデータとactionsからの両方のデータを扱えるように）
interface VideoDataWithOptionalFields {
  id: string;
  title: string;
  description: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  channelId: string;
  channelTitle: string;
  lastFetchedAt?: string;
  videoType?: string;
  thumbnails?: Thumbnails;
}

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

    // Server Actionの結果をVideoオブジェクトに変換
    // VideoDataはすでにプレーンなオブジェクトになっているため、必要最小限の変換のみ行う
    const videos = result.videos.map((videoData) => {
      // サムネイル情報の取得
      // FirestoreVideoDataからサムネイルURLを取得
      const thumbnailUrl = videoData.thumbnailUrl || "";

      // ISO文字列としての日付を使用
      const publishedAtISO = videoData.publishedAt || new Date().toISOString();
      const now = new Date();
      const lastFetchedAtISO = now.toISOString();

      // LiveBroadcastContentの型を正しく設定
      // videoTypeが"upcoming"の場合は"upcoming"、それ以外は"none"
      const liveBroadcastContent: LiveBroadcastContent =
        videoData.videoType === "upcoming" ? "upcoming" : "none";

      // Video型に変換（文字列型の日付を使用）
      return {
        id: videoData.id,
        title: videoData.title,
        description: videoData.description,
        // 更新された型定義に合わせて文字列で設定
        publishedAt: publishedAtISO,
        publishedAtISO: publishedAtISO,
        thumbnailUrl,
        channelId: videoData.channelId,
        channelTitle: videoData.channelTitle,
        // 以下のプロパティは必要に応じてデフォルト値を設定
        lastFetchedAt: lastFetchedAtISO,
        lastFetchedAtISO: lastFetchedAtISO,
        liveBroadcastContent,
      };
    });

    // 最後のビデオを取得（Server Actionからは最後のビデオのIDのみが返される）
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
    const videoData = (await getVideoByIdAction(
      videoId,
    )) as VideoDataWithOptionalFields;

    // データがない場合はnullを返す
    if (!videoData) {
      return null;
    }

    // サムネイル情報の取得
    // モックデータの構造に合わせて thumbnails から取得
    let thumbnailUrl = "";
    // VideoDataWithOptionalFieldsインターフェースを使用
    if (videoData.thumbnails) {
      const thumbnails = videoData.thumbnails;
      // 優先順位: high > medium > default
      if (thumbnails.high?.url) {
        thumbnailUrl = thumbnails.high.url;
      } else if (thumbnails.medium?.url) {
        thumbnailUrl = thumbnails.medium.url;
      } else if (thumbnails.default?.url) {
        thumbnailUrl = thumbnails.default.url;
      }
    } else {
      // 後方互換性のために thumbnailUrl も確認
      thumbnailUrl = videoData.thumbnailUrl || "";
    }

    // ISO文字列としての日付を使用
    const publishedAtISO = videoData.publishedAt || new Date().toISOString();
    const now = new Date();
    const lastFetchedAtISO = now.toISOString();

    // LiveBroadcastContentの型を正しく設定
    // videoTypeが"upcoming"の場合は"upcoming"、それ以外は"none"
    const liveBroadcastContent: LiveBroadcastContent =
      videoData.videoType === "upcoming" ? "upcoming" : "none";

    // Video型として整形（文字列型の日付を使用）
    const video: Video = {
      id: videoData.id,
      title: videoData.title,
      description: videoData.description,
      publishedAt: publishedAtISO,
      publishedAtISO: publishedAtISO,
      thumbnailUrl,
      channelId: videoData.channelId,
      channelTitle: videoData.channelTitle,
      lastFetchedAt: lastFetchedAtISO,
      lastFetchedAtISO: lastFetchedAtISO,
      liveBroadcastContent,
    };

    return video;
  } catch (error) {
    console.error(`動画ID ${videoId} の取得に失敗しました:`, error);
    return null;
  }
}
