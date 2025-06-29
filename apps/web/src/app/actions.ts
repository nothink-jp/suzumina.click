"use server";

import * as logger from "@/lib/logger";
import { getRecentAudioButtons } from "./buttons/actions";
import { getVideoTitles } from "./videos/actions";
import { getWorks } from "./works/actions";

/**
 * トップページ用の新着作品を取得するServer Action
 */
export async function getLatestWorks(limit = 10) {
	try {
		const result = await getWorks({ page: 1, limit });

		if (result.works.length === 0) {
			logger.warn("新着作品取得で0件返却", { action: "getLatestWorks", limit });
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
 */
export async function getLatestVideos(limit = 10) {
	try {
		const result = await getVideoTitles({ page: 1, limit });

		if (result.videos.length === 0) {
			logger.warn("新着動画取得で0件返却", { action: "getLatestVideos", limit });
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
 */
export async function getLatestAudioButtons(limit = 10) {
	// getRecentAudioButtonsはarrayを直接返すので特別な処理が必要

	try {
		const audioButtons = await getRecentAudioButtons(limit);

		if (audioButtons.length === 0) {
			logger.warn("新着音声ボタン取得で0件返却", { action: "getLatestAudioButtons", limit });
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
