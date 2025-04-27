import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";
import type { Video } from "@/lib/videos/types";

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
 * 特定の動画IDの詳細を取得するAPIルート
 */
export async function GET(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    
    // Firestoreインスタンスの取得
    const db = getAdminFirestore();
    
    // 動画ドキュメントの取得
    const videoRef = db.collection("videos").doc(videoId);
    const videoDoc = await videoRef.get();
    
    // 動画が存在しない場合は404を返す
    if (!videoDoc.exists) {
      return NextResponse.json(
        { error: "動画が見つかりません" },
        { status: 404 }
      );
    }
    
    // データの変換
    const data = videoDoc.data() as FirestoreVideoData;
    const video = convertToVideo(videoDoc.id, data);
    
    // レスポンスの構築
    return NextResponse.json(video);
  } catch (error) {
    console.error("動画の取得に失敗しました:", error);
    return NextResponse.json(
      { error: "動画の取得に失敗しました" },
      { status: 500 }
    );
  }
}