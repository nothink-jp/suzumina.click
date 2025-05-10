"use server";

/**
 * 動画関連の共通Server Actions
 *
 * このファイルには動画関連の共通アクションをエクスポートします
 */

import { formatErrorMessage, getFirestoreAdmin } from "@/lib/firebase/admin";
import {
  type FirestoreVideoData,
  type FrontendVideoData,
  convertToFrontendVideo,
} from "@suzumina.click/shared-types";
import type { DocumentData, Query } from "firebase-admin/firestore";

// シリアライズ可能なプレーンなレスポンス型
interface VideoListResponse {
  videos: FrontendVideoData[];
  hasMore: boolean;
  lastVideoId?: string; // Date型ではなく文字列型のIDを使用
}

/**
 * 動画データを取得する
 *
 * @param videoId YouTubeの動画ID
 * @returns 動画データ
 */
export async function getVideo(
  videoId: string,
): Promise<FirestoreVideoData | null> {
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

    // Firestoreのデータを型安全なオブジェクトに変換
    try {
      // FirestoreのデータをFirestoreVideoDataに変換・検証
      return {
        id: videoDoc.id,
        videoId: data.videoId || videoDoc.id, // videoIdを設定
        title: data.title || "",
        description: data.description || "",
        channelId: data.channelId || "",
        channelTitle: data.channelTitle || "",
        publishedAt:
          data.publishedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        thumbnailUrl: data.thumbnailUrl || "",
        lastFetchedAt:
          data.lastFetchedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        videoType: data.videoType,
        liveBroadcastContent: data.liveBroadcastContent,
      };
    } catch (validationError) {
      console.error("動画データの検証に失敗しました:", validationError);
      throw new Error("動画データの形式が無効です");
    }
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

      // Firestoreデータをモデルに変換
      const firestoreVideo: FirestoreVideoData = {
        id: doc.id,
        videoId: data.videoId || doc.id, // videoIdフィールドを追加
        title: data.title || "",
        description: data.description || "",
        channelId: data.channelId || "",
        channelTitle: data.channelTitle || "",
        publishedAt:
          data.publishedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        thumbnailUrl: data.thumbnailUrl || "",
        lastFetchedAt:
          data.lastFetchedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        videoType: data.videoType,
        liveBroadcastContent: data.liveBroadcastContent,
      };

      // フロントエンド表示用に変換
      return convertToFrontendVideo(firestoreVideo);
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
): Promise<VideoListResponse> {
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

      // Firestoreデータをモデルに変換
      const firestoreVideo: FirestoreVideoData = {
        id: doc.id,
        videoId: data.videoId || doc.id, // videoIdフィールドを追加
        title: data.title || "",
        description: data.description || "",
        channelId: data.channelId || "",
        channelTitle: data.channelTitle || "",
        publishedAt:
          data.publishedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        thumbnailUrl: data.thumbnailUrl || "",
        lastFetchedAt:
          data.lastFetchedAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        videoType: data.videoType,
        liveBroadcastContent: data.liveBroadcastContent,
      };

      // フロントエンド表示用に変換
      return convertToFrontendVideo(firestoreVideo);
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
