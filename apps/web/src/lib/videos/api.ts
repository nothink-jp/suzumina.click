import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type Firestore,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { app } from "../firebase/client";
import type {
  PaginationParams,
  Video,
  VideoData,
  VideoListResult,
} from "./types";
import dayjs from "dayjs";

/**
 * Firestoreインスタンスを取得する
 * クライアントサイドでのみ使用可能
 */
function getFirestoreInstance(): Firestore | null {
  if (!app) {
    console.error("Firebaseアプリが初期化されていません");
    return null;
  }
  return getFirestore(app);
}

/**
 * Firestoreから最新の動画リストを取得する
 * @param params ページネーションパラメータ
 * @returns 動画リストと次ページ情報
 */
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
    // サーバーサイドAPIを呼び出す
    let url = `/api/videos?limit=${params.limit}`;

    // startAfterパラメータがある場合は、ISOString形式に変換して追加
    if (params.startAfter) {
      try {
        // dayjsを使用して安全に日付を処理
        const date = dayjs(params.startAfter);
        if (date.isValid()) {
          url += `&startAfter=${date.toISOString()}`;
        } else {
          console.warn("無効な日付パラメータ:", params.startAfter);
        }
      } catch (error) {
        console.error("日付パラメータの処理中にエラーが発生しました:", error);
      }
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

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
 * @param videoId 動画ID
 * @returns 動画詳細情報、存在しない場合はnull
 */
/**
 * 特定の動画IDの詳細を取得する
 * クライアントサイドでの使用を想定
 * @param videoId 動画ID
 * @returns 動画詳細情報、存在しない場合はnull
 */
export async function getVideoById(videoId: string): Promise<Video | null> {
  try {
    // サーバーサイドAPIを呼び出す
    const response = await fetch(`/api/videos/${videoId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

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

/**
 * FirestoreのVideoDataをアプリケーション用のVideo型に変換
 * @param id ドキュメントID
 * @param data Firestoreから取得したデータ
 * @returns 変換後のVideoオブジェクト
 */
function convertToVideo(id: string, data: VideoData): Video {
  return {
    id,
    title: data.title,
    description: data.description,
    publishedAt: data.publishedAt.toDate(),
    thumbnailUrl: data.thumbnailUrl,
    channelId: data.channelId,
    channelTitle: data.channelTitle,
    lastFetchedAt: data.lastFetchedAt.toDate(),
  };
}
