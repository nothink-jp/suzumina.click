import { collection, getDocs, limit, orderBy, query, startAfter, where, type Firestore } from "firebase/firestore";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Video } from "@/lib/videos/types";
import type { DocumentData } from "firebase-admin/firestore";

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
}

// Firebase Admin SDKの初期化
function getAdminFirestore() {
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
  
  return getFirestore();
}

/**
 * FirestoreのVideoDataをアプリケーション用のVideo型に変換
 * @param id ドキュメントID
 * @param data Firestoreから取得したデータ
 * @returns 変換後のVideoオブジェクト
 */
function convertToVideo(id: string, data: FirestoreVideoData): Video {
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

/**
 * 動画リストを取得するAPIルート
 */
export async function GET(request: NextRequest) {
  try {
    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");
    const startAfterParam = searchParams.get("startAfter");
    
    const limitValue = limitParam ? Number.parseInt(limitParam, 10) : 10;
    
    // Firestoreインスタンスの取得
    const db = getAdminFirestore();
    
    // クエリの構築
    const videosRef = db.collection("videos");
    let videosQuery = videosRef
      .orderBy("publishedAt", "desc")
      .limit(limitValue + 1); // 次ページがあるか確認するために1つ多く取得
    
    // ページネーション用のstartAfterパラメータがある場合
    if (startAfterParam) {
      const startAfterDate = new Date(startAfterParam);
      videosQuery = videosRef
        .orderBy("publishedAt", "desc")
        .startAfter(startAfterDate)
        .limit(limitValue + 1);
    }
    
    // データの取得
    const snapshot = await videosQuery.get();
    const videos = snapshot.docs.map(doc => {
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
      lastVideo: videos.length > 0 ? videos[videos.length - 1] : undefined
    });
  } catch (error) {
    console.error("動画リストの取得に失敗しました:", error);
    return NextResponse.json(
      { error: "動画リストの取得に失敗しました" },
      { status: 500 }
    );
  }
}