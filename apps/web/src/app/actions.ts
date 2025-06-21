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
    console.log(`🏠 Homepage getLatestWorks called with limit=${limit}`);
    const result = await getWorks({ page: 1, limit });
    console.log(
      `🏠 Homepage getLatestWorks result: ${result.works.length} works, hasMore=${result.hasMore}, totalCount=${result.totalCount}`,
    );

    if (result.works.length === 0) {
      console.warn(
        "⚠️ Homepage getLatestWorks: No works returned from getWorks",
      );
    } else {
      console.log(
        `✅ Homepage getLatestWorks: First work: ${result.works[0]?.title} (${result.works[0]?.productId})`,
      );
    }

    return result.works;
  } catch (error) {
    console.error("❌ Homepage 新着作品取得エラー:", error);
    console.error("❌ Homepage Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
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
    console.log(`🏠 Homepage getLatestVideos called with limit=${limit}`);
    const result = await getVideoTitles({ page: 1, limit });
    console.log(
      `🏠 Homepage getLatestVideos result: ${result.videos.length} videos, hasMore=${result.hasMore}`,
    );

    if (result.videos.length === 0) {
      console.warn(
        "⚠️ Homepage getLatestVideos: No videos returned from getVideoTitles",
      );
    } else {
      console.log(
        `✅ Homepage getLatestVideos: First video: ${result.videos[0]?.title} (${result.videos[0]?.videoId})`,
      );
    }

    return result.videos;
  } catch (error) {
    console.error("❌ Homepage 新着動画取得エラー:", error);
    console.error("❌ Homepage Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
    return [];
  }
}
