"use server";

/**
 * 時間範囲データ取得用Server Action
 *
 * クライアントコンポーネントから呼び出し可能なサーバーサイド関数
 * 認証情報はサーバーサイドで取得するため、クライアントから渡す必要がない
 */
import type { TimeRange } from "@/lib/audioclips/types";
import { getFirestoreAdmin } from "@/lib/firebase/admin";

/**
 * 指定された動画の全ての音声クリップの時間範囲を取得するServer Action
 *
 * @param videoId 動画ID
 * @returns 時間範囲の配列
 */
export async function getVideoTimeRangesAction(
  videoId: string,
): Promise<TimeRange[]> {
  try {
    // Firestoreのインスタンスを取得
    const db = await getFirestoreAdmin();

    // 同じ動画の全ての音声クリップを取得
    const clipsSnapshot = await db
      .collection("audioClips")
      .where("videoId", "==", videoId)
      .get();

    if (clipsSnapshot.empty) {
      return [];
    }

    // TimeRange形式に変換
    const ranges: TimeRange[] = clipsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        start: typeof data.startTime === "number" ? data.startTime : 0,
        end: typeof data.endTime === "number" ? data.endTime : 0,
        clipId: doc.id,
        title: data.title || "",
      };
    });

    // クライアントに返すためにシリアライズ
    return JSON.parse(JSON.stringify(ranges));
  } catch (error) {
    // エラー時は空配列を返す
    console.error("時間範囲の取得でエラーが発生しました:", error);
    return [];
  }
}
