"use server";

import * as logger from "@/lib/logger";
import { getRecentAudioButtons } from "./buttons/actions";
import { getVideoTitles } from "./videos/actions";
import { getWorks } from "./works/actions";

/**
 * トップページ用の新着作品を取得するServer Action
 * @param limit - 取得件数（デフォルト10件）
 * @returns 新着作品リスト
 */
export async function getLatestWorks(limit = 10) {
	logger.info("新着作品取得を開始", {
		action: "getLatestWorks",
		limit,
	});

	try {
		const result = await getWorks({ page: 1, limit });

		if (result.works.length === 0) {
			logger.warn("新着作品取得で0件返却", {
				action: "getLatestWorks",
				limit,
			});
		} else {
			logger.info("新着作品取得成功", {
				action: "getLatestWorks",
				worksCount: result.works.length,
				hasMore: result.hasMore,
				totalCount: result.totalCount,
				firstWorkTitle: result.works[0]?.title,
				firstWorkId: result.works[0]?.productId,
			});
		}

		return result.works;
	} catch (error) {
		logger.error("新着作品取得でエラーが発生", {
			action: "getLatestWorks",
			limit,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
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
	logger.info("新着動画取得を開始", {
		action: "getLatestVideos",
		limit,
	});

	try {
		const result = await getVideoTitles({ page: 1, limit });

		if (result.videos.length === 0) {
			logger.warn("新着動画取得で0件返却", {
				action: "getLatestVideos",
				limit,
			});
		} else {
			logger.info("新着動画取得成功", {
				action: "getLatestVideos",
				videosCount: result.videos.length,
				hasMore: result.hasMore,
				firstVideoTitle: result.videos[0]?.title,
				firstVideoId: result.videos[0]?.videoId,
			});
		}

		return result.videos;
	} catch (error) {
		logger.error("新着動画取得でエラーが発生", {
			action: "getLatestVideos",
			limit,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return [];
	}
}

/**
 * トップページ用の新着音声ボタンを取得するServer Action
 * @param limit - 取得件数（デフォルト10件）
 * @returns 新着音声ボタンリスト
 */
export async function getLatestAudioButtons(limit = 10) {
	logger.info("新着音声ボタン取得を開始", {
		action: "getLatestAudioButtons",
		limit,
	});

	try {
		const audioButtons = await getRecentAudioButtons(limit);

		if (audioButtons.length === 0) {
			logger.warn("新着音声ボタン取得で0件返却", {
				action: "getLatestAudioButtons",
				limit,
			});
		} else {
			logger.info("新着音声ボタン取得成功", {
				action: "getLatestAudioButtons",
				audioButtonsCount: audioButtons.length,
				firstButtonTitle: audioButtons[0]?.title,
				firstButtonId: audioButtons[0]?.id,
			});
		}

		return audioButtons;
	} catch (error) {
		logger.error("新着音声ボタン取得でエラーが発生", {
			action: "getLatestAudioButtons",
			limit,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return [];
	}
}
