import type { LiveBroadcastContent, Video } from "@/lib/videos/types";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { DocumentData, Query } from "firebase-admin/firestore";
import {
  type Firestore,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  liveBroadcastContent?: LiveBroadcastContent;
}

// Firebase Admin SDKの初期化
function getAdminFirestore() {
  if (getApps().length === 0) {
    // 開発環境ではサービスアカウントキーを使用
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : undefined,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  return getFirestore();
}

/**
 * FirestoreのVideoDataをアプリケーション用のVideo型に変換
 * @param id ドキュメントID
 * @param data Firestoreから取得したデータ
 * @returns 変換後のVideoオブジェクト
 */
function convertToVideo(id: string, data: FirestoreVideoData): Video {
  // 日付をISO文字列形式に変換して返す
  // これにより、JSONシリアライズ時に日付情報が失われるのを防ぐ
  const publishedAt = data.publishedAt.toDate();
  const lastFetchedAt = data.lastFetchedAt.toDate();

  return {
    id,
    title: data.title,
    description: data.description,
    publishedAt,
    publishedAtISO: publishedAt.toISOString(), // ISO文字列を追加
    thumbnailUrl: data.thumbnailUrl,
    channelId: data.channelId,
    channelTitle: data.channelTitle,
    lastFetchedAt,
    lastFetchedAtISO: lastFetchedAt.toISOString(), // ISO文字列を追加
    liveBroadcastContent: data.liveBroadcastContent, // 配信状態を追加
  };
}

/**
 * 動画リストを取得するAPIルート
 */
export async function GET(request: NextRequest) {
  try {
    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");
    const startAfterParam = searchParams.get("startAfter");
    const videoTypeParam = searchParams.get("videoType"); // 動画タイプパラメータ

    const limitValue = limitParam ? Number.parseInt(limitParam, 10) : 10;

    // Firestoreインスタンスの取得
    const db = getAdminFirestore();

    // クエリの構築基本構成
    const videosRef = db.collection("videos");
    let videosQuery: Query<DocumentData>;

    // 配信状態によるフィルタリングを優先
    if (videoTypeParam === "archived") {
      // 配信済み動画：LiveBroadcastContentが「none」または「archived」
      // または配信状態がなく公開日が過去のもの
      const now = new Date();

      // APIから取得した配信状態が使用可能な場合はそれを使う
      videosQuery = videosRef
        .where("liveBroadcastContent", "in", ["none"])
        .orderBy("publishedAt", "desc")
        .limit(limitValue + 1);
    } else if (videoTypeParam === "upcoming") {
      // 配信予定：LiveBroadcastContentが「upcoming」または「live」
      videosQuery = videosRef
        .where("liveBroadcastContent", "in", ["upcoming", "live"])
        .orderBy("publishedAt", "asc") // 予定配信は古い順（近い将来のものから）
        .limit(limitValue + 1);
    } else {
      // デフォルト：全動画（日付降順）
      videosQuery = videosRef
        .orderBy("publishedAt", "desc")
        .limit(limitValue + 1);
    }

    // ページネーション用のstartAfterパラメータがある場合
    if (startAfterParam) {
      try {
        const startAfterDate = new Date(startAfterParam);

        // 無効な日付かどうかをチェック
        if (Number.isNaN(startAfterDate.getTime())) {
          console.error("無効な日付パラメータ:", startAfterParam);
        } else {
          // 動画タイプによって異なるクエリを構築
          if (videoTypeParam === "archived") {
            videosQuery = videosRef
              .where("liveBroadcastContent", "in", ["none"])
              .orderBy("publishedAt", "desc")
              .startAfter(startAfterDate)
              .limit(limitValue + 1);
          } else if (videoTypeParam === "upcoming") {
            videosQuery = videosRef
              .where("liveBroadcastContent", "in", ["upcoming", "live"])
              .orderBy("publishedAt", "asc")
              .startAfter(startAfterDate)
              .limit(limitValue + 1);
          } else {
            videosQuery = videosRef
              .orderBy("publishedAt", "desc")
              .startAfter(startAfterDate)
              .limit(limitValue + 1);
          }
        }
      } catch (error) {
        console.error("日付パラメータの解析に失敗しました:", error);
        // エラーが発生した場合は、デフォルトのクエリを使用
      }
    }

    // データの取得
    const snapshot = await videosQuery.get();
    const videos = snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreVideoData;
      return convertToVideo(doc.id, data);
    });

    // 次ページがあるかどうかを確認
    const hasMore = videos.length > limitValue;
    // 次ページ用に余分に取得した1件を削除
    if (hasMore) {
      videos.pop();
    }

    // レスポンスの構築
    return NextResponse.json({
      videos,
      hasMore,
      lastVideo: videos.length > 0 ? videos[videos.length - 1] : undefined,
    });
  } catch (error) {
    console.error("動画リストの取得に失敗しました:", error);
    return NextResponse.json(
      { error: "動画リストの取得に失敗しました" },
      { status: 500 },
    );
  }
}
