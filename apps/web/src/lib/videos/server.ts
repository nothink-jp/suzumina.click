import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { LiveBroadcastContent, Video } from "./types";

/**
 * テスト用のモック可能なFirestoreクライアントを提供
 * 実装は内部的に使用するため、エクスポートしない
 */
let _firestoreDb: ReturnType<typeof getFirestore> | null = null;

/**
 * Firebase Admin SDKの初期化とFirestoreインスタンスの取得
 * @returns Firestoreインスタンス
 */
export function getAdminFirestore() {
  // テスト中にモックを注入できるようにキャッシュ確認
  if (_firestoreDb) {
    return _firestoreDb;
  }

  if (getApps().length === 0) {
    // Cloud Run環境ではGCPのデフォルト認証情報を使用
    // 開発環境では環境変数からサービスアカウントの情報を取得
    const isCloudRunEnv = process.env.K_SERVICE !== undefined; // Cloud Run環境かどうかを判定

    if (isCloudRunEnv) {
      // Cloud Run環境ではデフォルト認証情報を使用
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // 開発環境ではサービスアカウントキーを使用
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : undefined;

      initializeApp({
        credential: serviceAccount ? cert(serviceAccount) : undefined,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }

  _firestoreDb = getFirestore();
  return _firestoreDb;
}

/**
 * テスト用にFirestoreインスタンスをモックする
 * @param mockDb モックFirestoreインスタンス
 */
export function __setMockFirestoreForTesting(
  mockDb: ReturnType<typeof getFirestore>,
) {
  _firestoreDb = mockDb;
}

/**
 * テスト後にFirestoreインスタンスのモックをリセットする
 */
export function __resetMockFirestoreForTesting() {
  _firestoreDb = null;
}

// Firestoreから取得したデータの型定義
interface FirestoreVideoData {
  title: string;
  description: string;
  publishedAt: {
    toDate: () => Date;
  };
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  lastFetchedAt: {
    toDate: () => Date;
  };
  liveBroadcastContent?: LiveBroadcastContent; // 配信状態フィールドを追加
}

/**
 * FirestoreのVideoDataをアプリケーション用のVideo型に変換
 * RSC/RCC間のシリアライズ問題を回避するため、日付はISOフォーマット文字列として保持
 *
 * @param id ドキュメントID
 * @param data Firestoreから取得したデータ
 * @returns 変換後のVideoオブジェクト
 */
export function convertToVideo(id: string, data: FirestoreVideoData): Video {
  // Date型オブジェクトからISO文字列に変換
  const publishedAt = data.publishedAt.toDate();
  const lastFetchedAt = data.lastFetchedAt.toDate();

  const publishedAtISO = publishedAt.toISOString();
  const lastFetchedAtISO = lastFetchedAt.toISOString();

  return {
    id,
    title: data.title,
    description: data.description,
    publishedAtISO,
    lastFetchedAtISO,
    thumbnailUrl: data.thumbnailUrl,
    channelId: data.channelId,
    channelTitle: data.channelTitle,
    liveBroadcastContent: data.liveBroadcastContent,

    // 旧API互換のためのフィールド（文字列型として保持）
    publishedAt: publishedAtISO,
    lastFetchedAt: lastFetchedAtISO,
  };
}

/**
 * 特定の動画IDの詳細を取得する（サーバーサイド用）
 * @param videoId 動画ID
 * @returns 動画詳細情報、存在しない場合はnull
 */
export async function getVideoByIdServer(
  videoId: string,
): Promise<Video | null> {
  try {
    // Firestoreインスタンスの取得
    const db = getAdminFirestore();

    // 動画ドキュメントの取得
    const videoRef = db.collection("videos").doc(videoId);
    const videoDoc = await videoRef.get();

    // 動画が存在しない場合はnullを返す
    if (!videoDoc.exists) {
      return null;
    }

    // データの変換
    const data = videoDoc.data() as FirestoreVideoData;
    const video = convertToVideo(videoDoc.id, data);

    return video;
  } catch (error) {
    console.error(`動画ID ${videoId} の取得に失敗しました:`, error);
    return null;
  }
}

/**
 * 最新の動画リストを取得する（サーバーサイド用）
 * @param limit 取得する動画の数
 * @param startAfter ページネーション用の開始位置（日付文字列またはID）
 * @returns 動画リストと次ページ情報
 */
export async function getRecentVideosServer(
  limit = 10,
  startAfter?: Date | string,
) {
  try {
    // Firestoreインスタンスの取得
    const db = getAdminFirestore();

    // クエリの構築
    let videosQuery = db.collection("videos").orderBy("publishedAt", "desc");

    // ページネーション用のstartAfterパラメータがある場合
    if (startAfter) {
      // startAfterがDateオブジェクトの場合
      if (startAfter instanceof Date) {
        videosQuery = videosQuery.startAfter(startAfter);
      }
      // 将来的にIDベースのページネーションに対応（現在は実装なし）
    }

    // 次ページがあるか確認するために1つ多く取得
    videosQuery = videosQuery.limit(limit + 1);

    // データの取得
    const snapshot = await videosQuery.get();
    const videos = snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreVideoData;
      return convertToVideo(doc.id, data);
    });

    // 次ページがあるかどうかを確認
    const hasMore = videos.length > limit;
    // 次ページ用に余分に取得した1件を削除
    if (hasMore) {
      videos.pop();
    }

    return {
      videos,
      hasMore,
      lastVideo: videos.length > 0 ? videos[videos.length - 1] : undefined,
    };
  } catch (error) {
    console.error("動画リストの取得に失敗しました:", error);
    return { videos: [], hasMore: false };
  }
}
