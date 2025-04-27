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
/**
 * 最新の動画リストを取得する
 * クライアントサイドでの使用を想定
 * @param params ページネーションパラメータ
 * @returns 動画リストと次ページ情報
 */
export async function getRecentVideos(
  params: PaginationParams = { limit: 10 }
): Promise<VideoListResult> {
  try {
    // サーバーサイドAPIを呼び出す
    let url = `/api/videos?limit=${params.limit}`;
    
    // startAfterパラメータがある場合は、ISOString形式に変換して追加
    if (params.startAfter && params.startAfter instanceof Date) {
      url += `&startAfter=${params.startAfter.toISOString()}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
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
    lastFetchedAt: data.lastFetchedAt.toDate()
  };
}