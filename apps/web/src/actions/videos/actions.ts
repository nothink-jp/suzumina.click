"use server";

/**
 * 動画関連の共通Server Actions
 *
 * このファイルには動画関連の共通アクションをエクスポートします
 */

import { formatErrorMessage, getFirestoreAdmin } from "@/lib/firebase/admin";
import type { DocumentData, Query } from "firebase-admin/firestore";

// 動画関連の型定義
// シリアライズ可能なプリミティブ型とプレーンオブジェクトのみで構成
export interface VideoData {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string; // ISO文字列形式の日付
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
  };
  videoType?: string; // 動画タイプ (archived/upcoming)
  videoId?: string; // テスト互換性のために追加
}

// シリアライズ可能なプレーンなレスポンス型
interface VideoListResponse {
  videos: VideoData[];
  hasMore: boolean;
  lastVideoId?: string; // Date型ではなく文字列型のIDを使用
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

    const data = videoDoc.data();
    if (!data) return null;

    // プレーンなオブジェクトとしてデータを返す
    // 必要なデータのみ抽出し、クラスインスタンスを含まないようにする
    return {
      id: videoDoc.id,
      title: data.title || "",
      description: data.description || "",
      channelId: data.channelId || "",
      channelTitle: data.channelTitle || "",
      publishedAt:
        data.publishedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      thumbnails: {
        default: {
          url: data.thumbnails?.default?.url || "",
          width: data.thumbnails?.default?.width || 120,
          height: data.thumbnails?.default?.height || 90,
        },
        medium: {
          url: data.thumbnails?.medium?.url || "",
          width: data.thumbnails?.medium?.width || 320,
          height: data.thumbnails?.medium?.height || 180,
        },
        high: {
          url: data.thumbnails?.high?.url || "",
          width: data.thumbnails?.high?.width || 480,
          height: data.thumbnails?.high?.height || 360,
        },
      },
      videoType: data.videoType,
      videoId: data.videoId, // テスト互換性のために追加
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
 * @returns 動画リスト結果 (VideoListResponse)
 */
export async function getRecentVideos(
  options:
    | {
        limit?: number;
        startAfter?: string;
        videoType?: string;
      }
    | number = 10,
): Promise<VideoListResponse> {
  try {
    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();

    // 互換性のために数値の場合は limitとして扱う
    const limit = typeof options === "number" ? options : (options.limit ?? 10);
    const startAfter =
      typeof options === "object" ? options.startAfter : undefined;
    const videoType =
      typeof options === "object" ? options.videoType : undefined;

    // Firestoreのクエリ型を適切に扱うために、型を明示的に宣言
    const videosCollection = db.collection("videos");

    // クエリ構築を修正 - インデックスと完全に一致する順序で構築
    let query: Query<DocumentData>;

    // インデックスに合わせて、まずvideoTypeのフィルタリングを行い、その後にソートする
    if (videoType) {
      query = videosCollection
        .where("videoType", "==", videoType)
        .orderBy("publishedAt", "desc");
    } else {
      // videoTypeフィルタなしの場合は単純に日付でソート
      query = videosCollection.orderBy("publishedAt", "desc");
    }

    // ページネーション - startAfterが指定されている場合
    if (startAfter) {
      const lastDoc = await db.collection("videos").doc(startAfter).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
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
      const data = doc.data();

      // プレーンなオブジェクトとしてデータを返す
      return {
        id: doc.id,
        title: data.title || "",
        description: data.description || "",
        channelId: data.channelId || "",
        channelTitle: data.channelTitle || "",
        publishedAt:
          data.publishedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        thumbnails: {
          default: {
            url: data.thumbnails?.default?.url || "",
            width: data.thumbnails?.default?.width || 120,
            height: data.thumbnails?.default?.height || 90,
          },
          medium: {
            url: data.thumbnails?.medium?.url || "",
            width: data.thumbnails?.medium?.width || 320,
            height: data.thumbnails?.medium?.height || 180,
          },
          high: {
            url: data.thumbnails?.high?.url || "",
            width: data.thumbnails?.high?.width || 480,
            height: data.thumbnails?.high?.height || 360,
          },
        },
        videoType: data.videoType,
        videoId: data.videoId, // テスト互換性のために追加
      };
    });

    // 最後のビデオIDを返す（Date型ではなくIDのみ）
    const lastVideoId =
      hasMore && videos.length > 0 ? videos[videos.length - 1].id : undefined;

    return {
      videos,
      hasMore,
      lastVideoId,
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
      const data = doc.data();

      // プレーンなオブジェクトとしてデータを返す
      return {
        id: doc.id,
        title: data.title || "",
        description: data.description || "",
        channelId: data.channelId || "",
        channelTitle: data.channelTitle || "",
        publishedAt:
          data.publishedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        thumbnails: {
          default: {
            url: data.thumbnails?.default?.url || "",
            width: data.thumbnails?.default?.width || 120,
            height: data.thumbnails?.default?.height || 90,
          },
          medium: {
            url: data.thumbnails?.medium?.url || "",
            width: data.thumbnails?.medium?.width || 320,
            height: data.thumbnails?.medium?.height || 180,
          },
          high: {
            url: data.thumbnails?.high?.url || "",
            width: data.thumbnails?.high?.width || 480,
            height: data.thumbnails?.high?.height || 360,
          },
        },
        videoType: data.videoType,
        videoId: data.videoId, // テスト互換性のために追加
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
