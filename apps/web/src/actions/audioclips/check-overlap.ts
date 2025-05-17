"use server";

/**
 * 時間範囲の重複チェック用Server Action
 *
 * クライアントコンポーネントから呼び出し可能なサーバーサイド関数
 * 認証情報はサーバーサイドで取得するため、クライアントから渡す必要がない
 */
import type { OverlapCheckResult } from "@/lib/audioclips/types";
import { getFirestoreAdmin } from "@/lib/firebase/admin";
import { getCurrentUser } from "../auth/getCurrentUser";

/**
 * 音声クリップの時間範囲が既存のクリップと重複するかチェックするServer Action
 *
 * @param videoId 動画ID
 * @param startTime 開始時間（秒）
 * @param endTime 終了時間（秒）
 * @param excludeClipId 除外するクリップID（更新時に自分自身を除外）
 * @returns 重複チェック結果
 */
export async function checkTimeRangeOverlapAction(
  videoId: string,
  startTime: number,
  endTime: number,
  excludeClipId?: string,
): Promise<OverlapCheckResult> {
  try {
    // ユーザー認証情報を取得
    const currentUser = await getCurrentUser();

    // Firestoreのインスタンスを取得
    const db = await getFirestoreAdmin();

    // 同じ動画の全ての音声クリップを取得
    const clipsSnapshot = await db
      .collection("audioClips")
      .where("videoId", "==", videoId)
      .get();

    if (clipsSnapshot.empty) {
      return {
        isOverlapping: false,
        overlappingClips: [],
      };
    }

    // 重複チェック
    const overlappingClips = clipsSnapshot.docs
      // 除外IDがある場合は自分自身を除外
      .filter((doc) => !excludeClipId || doc.id !== excludeClipId)
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          videoId: data.videoId || "",
          title: data.title || "",
          phrase: data.phrase || "",
          description: data.description || "",
          startTime: typeof data.startTime === "number" ? data.startTime : 0,
          endTime: typeof data.endTime === "number" ? data.endTime : 0,
          userId: data.userId || "",
          userName: data.userName || "名無しユーザー",
          userPhotoURL: data.userPhotoURL || null,
          isPublic: !!data.isPublic,
          tags: Array.isArray(data.tags) ? data.tags : [],
          playCount: typeof data.playCount === "number" ? data.playCount : 0,
          favoriteCount:
            typeof data.favoriteCount === "number" ? data.favoriteCount : 0,
          createdAt:
            data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt:
            data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
          duration:
            typeof data.endTime === "number" &&
            typeof data.startTime === "number"
              ? data.endTime - data.startTime
              : 0,
          formattedDuration: "", // クライアント側で必要に応じて計算される
        };
      })
      .filter((clip) => {
        // 以下の条件で重複と判定
        // 1. 新規範囲が既存範囲に完全に含まれる
        // 2. 新規範囲が既存範囲を完全に含む
        // 3. 新規範囲の開始点が既存範囲内にある
        // 4. 新規範囲の終了点が既存範囲内にある
        return (
          // 1. 新規範囲が既存範囲に完全に含まれる
          (startTime >= clip.startTime && endTime <= clip.endTime) ||
          // 2. 新規範囲が既存範囲を完全に含む
          (startTime <= clip.startTime && endTime >= clip.endTime) ||
          // 3. 新規範囲の開始点が既存範囲内にある
          (startTime >= clip.startTime && startTime < clip.endTime) ||
          // 4. 新規範囲の終了点が既存範囲内にある
          (endTime > clip.startTime && endTime <= clip.endTime)
        );
      });

    const result = {
      isOverlapping: overlappingClips.length > 0,
      overlappingClips,
    };

    // Client Componentへの受け渡し用にシリアライズ
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    // エラー時は空の結果を返す
    return {
      isOverlapping: false,
      overlappingClips: [],
      // TypeScriptのエラーを防ぐために、errorプロパティを追加しない
    };
  }
}
