"use server";

/**
 * Server Actions for fetching video data from Firestore (ユーザー向け)
 */

import { Timestamp } from "@google-cloud/firestore";
import {
  convertToFrontendVideo,
  type FirestoreServerVideoData,
  type FrontendVideoData,
  type VideoListResult,
} from "@suzumina.click/shared-types/src/video";
import { getFirestore } from "@/lib/firestore";

/**
 * Firestoreからビデオタイトル一覧を取得するServer Action（ユーザー向けページネーション対応）
 */
export async function getVideoTitles(params?: {
  page?: number;
  limit?: number;
  startAfterDocId?: string;
}): Promise<VideoListResult> {
  try {
    console.log(
      `📹 [Videos] 動画データ取得開始: page=${params?.page || 1}, limit=${params?.limit || 12}`,
    );
    const firestore = getFirestore();
    const limit = params?.limit || 12;
    const page = params?.page || 1;

    // videosコレクションの参照を取得
    const videosRef = firestore.collection("videos");
    let query = videosRef.orderBy("publishedAt", "desc");

    // ページネーションのためのstartAfter処理
    if (params?.startAfterDocId) {
      const startAfterDoc = await videosRef.doc(params.startAfterDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    } else if (page > 1) {
      // ページ番号ベースの場合はoffsetを使用（非効率だが簡単）
      const offset = (page - 1) * limit;
      query = query.offset(offset);
    }

    // limit+1を取得して、次のページがあるかどうかを判定
    const snapshot = await query.limit(limit + 1).get();

    if (snapshot.empty) {
      console.log("📹 [Videos] No videos found in Firestore");
      return { videos: [], hasMore: false };
    }

    const videos: FrontendVideoData[] = [];
    const docs = snapshot.docs;

    // limit分だけ処理（+1分は hasMore 判定用）
    const videosToProcess = docs.slice(0, limit);

    for (const doc of videosToProcess) {
      try {
        const data = doc.data() as FirestoreServerVideoData;

        // Timestamp型をISO文字列に変換
        const publishedAt =
          data.publishedAt instanceof Timestamp
            ? data.publishedAt.toDate().toISOString()
            : new Date().toISOString();

        const lastFetchedAt =
          data.lastFetchedAt instanceof Timestamp
            ? data.lastFetchedAt.toDate().toISOString()
            : new Date().toISOString();

        // FirestoreVideoData形式に変換
        const firestoreData = {
          id: doc.id,
          videoId: data.videoId || doc.id,
          title: data.title,
          description: data.description || "",
          channelId: data.channelId,
          channelTitle: data.channelTitle,
          publishedAt,
          thumbnailUrl: data.thumbnailUrl || "",
          lastFetchedAt,
          videoType: data.videoType,
          liveBroadcastContent: data.liveBroadcastContent,
          audioButtonCount: data.audioButtonCount || 0,
          hasAudioButtons: data.hasAudioButtons || false,
        };

        // フロントエンド用に変換
        const frontendVideo = convertToFrontendVideo(firestoreData);
        videos.push(frontendVideo);
      } catch (error) {
        console.error(`Error processing video ${doc.id}:`, error);
      }
    }

    // 次のページがあるかどうかを判定
    const hasMore = docs.length > limit;
    const lastVideo = videos.length > 0 ? videos[videos.length - 1] : undefined;

    console.log(
      `📹 [Videos] Successfully fetched ${videos.length} videos (page: ${page}, hasMore: ${hasMore})`,
    );

    return {
      videos,
      hasMore,
      lastVideo,
    };
  } catch (error) {
    console.error("📹 [Videos] Error fetching video titles:", error);
    return { videos: [], hasMore: false };
  }
}

/**
 * 総動画数を取得するServer Action
 * Note: count()クエリは権限問題があるため、通常のクエリで代替
 */
export async function getTotalVideoCount(): Promise<number> {
  try {
    const firestore = getFirestore();
    const videosRef = firestore.collection("videos");
    const snapshot = await videosRef.select().get(); // IDのみ取得で効率化
    return snapshot.size;
  } catch (error) {
    console.error("Error fetching total video count:", error);
    return 0;
  }
}

/**
 * 特定の動画IDで動画データを取得するServer Action
 * @param videoId - 動画ID
 * @returns 動画データまたはnull
 */
export async function getVideoById(
  videoId: string,
): Promise<FrontendVideoData | null> {
  try {
    console.log(`動画詳細データ取得開始: videoId=${videoId}`);

    const firestore = getFirestore();
    const doc = await firestore.collection("videos").doc(videoId).get();

    if (!doc.exists) {
      console.log(`動画が見つかりません: videoId=${videoId}`);
      return null;
    }

    const data = doc.data() as FirestoreServerVideoData;

    // Timestamp型をISO文字列に変換
    const publishedAt =
      data.publishedAt instanceof Timestamp
        ? data.publishedAt.toDate().toISOString()
        : new Date().toISOString();

    const lastFetchedAt =
      data.lastFetchedAt instanceof Timestamp
        ? data.lastFetchedAt.toDate().toISOString()
        : new Date().toISOString();

    // FirestoreVideoData形式に変換
    const firestoreData = {
      id: doc.id,
      videoId: data.videoId || doc.id,
      title: data.title,
      description: data.description || "",
      channelId: data.channelId,
      channelTitle: data.channelTitle,
      publishedAt,
      thumbnailUrl: data.thumbnailUrl || "",
      lastFetchedAt,
      videoType: data.videoType,
      liveBroadcastContent: data.liveBroadcastContent,
      audioButtonCount: data.audioButtonCount || 0,
      hasAudioButtons: data.hasAudioButtons || false,
    };

    // フロントエンド用に変換
    const frontendVideo = convertToFrontendVideo(firestoreData);

    console.log(`動画詳細データ取得完了: ${frontendVideo.title}`);

    return frontendVideo;
  } catch (error) {
    console.error(`動画詳細データ取得エラー (${videoId}):`, error);
    return null;
  }
}
