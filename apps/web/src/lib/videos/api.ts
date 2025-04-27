import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where, type Firestore } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { app } from "../firebase/client";
import type { PaginationParams, Video, VideoData, VideoListResult } from "./types";

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
export async function getRecentVideos(
  params: PaginationParams = { limit: 10 }
): Promise<VideoListResult> {
  try {
    const db = getFirestoreInstance();
    if (!db) {
      console.error("Firestoreインスタンスの取得に失敗しました");
      return { videos: [], hasMore: false };
    }
    
    const videosRef = collection(db, "videos");
    let videosQuery = query(
      videosRef,
      orderBy("publishedAt", "desc"),
      limit(params.limit + 1) // 次ページがあるか確認するために1つ多く取得
    );

    // ページネーション用のstartAfterパラメータがある場合
    if (params.startAfter) {
      videosQuery = query(
        videosRef,
        orderBy("publishedAt", "desc"),
        startAfter(params.startAfter),
        limit(params.limit + 1)
      );
    }

    const snapshot = await getDocs(videosQuery);
    const videos = snapshot.docs.map(doc => {
      const data = doc.data() as VideoData;
      return convertToVideo(doc.id, data);
    });

    // 次ページがあるかどうかを確認
    const hasMore = videos.length > params.limit;
    // 次ページ用に余分に取得した1件を削除
    if (hasMore) {
      videos.pop();
    }

    return {
      videos,
      hasMore,
      lastVideo: videos.length > 0 ? videos[videos.length - 1] : undefined
    };
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
export async function getVideoById(videoId: string): Promise<Video | null> {
  try {
    const db = getFirestoreInstance();
    if (!db) {
      console.error("Firestoreインスタンスの取得に失敗しました");
      return null;
    }
    
    const videoRef = doc(db, "videos", videoId);
    const videoDoc = await getDoc(videoRef);

    if (!videoDoc.exists()) {
      return null;
    }

    const data = videoDoc.data() as VideoData;
    return convertToVideo(videoDoc.id, data);
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
    lastFetchedAt: data.lastFetchedAt.toDate()
  };
}