"use server";

import { getVideoTitles } from "./videos/actions";
import { getWorks } from "./works/actions";

/**
 * トップページ用の新着作品を取得するServer Action
 * @param limit - 取得件数（デフォルト10件）
 * @returns 新着作品リスト
 */
export async function getLatestWorks(limit = 10) {
  try {
    const result = await getWorks({ page: 1, limit });
    return result.works;
  } catch (error) {
    console.error("新着作品取得エラー:", error);
    return [];
  }
}

/**
 * トップページ用の新着動画を取得するServer Action
 * @param limit - 取得件数（デフォルト10件）
 * @returns 新着動画リスト
 */
export async function getLatestVideos(limit = 10) {
  try {
    const result = await getVideoTitles({ page: 1, limit });
    return result.videos;
  } catch (error) {
    console.error("新着動画取得エラー:", error);
    return [];
  }
}
