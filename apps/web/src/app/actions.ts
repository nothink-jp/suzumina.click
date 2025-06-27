"use server";

import * as logger from "@/lib/logger";
import { getRecentAudioButtons } from "./buttons/actions";
import { getVideoTitles } from "./videos/actions";
import { getWorks } from "./works/actions";

/**
 * 汎用的な新着アイテム取得関数
 */
async function getLatestItems<T>(
	fetcher: (params: { page: number; limit: number }) => Promise<{ [key: string]: T[] }>,
	actionName: string,
	itemsKey: string,
	limit = 10,
): Promise<T[]> {
	logger.info(`${actionName}を開始`, { action: actionName, limit });

	try {
		const result = await fetcher({ page: 1, limit });
		const items = result[itemsKey] || [];

		if (items.length === 0) {
			logger.warn(`${actionName}で0件返却`, { action: actionName, limit });
		} else {
			logger.info(`${actionName}成功`, {
				action: actionName,
				count: items.length,
				firstItem: items[0],
			});
		}

		return items;
	} catch (error) {
		logger.error(`${actionName}でエラーが発生`, {
			action: actionName,
			limit,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return [];
	}
}

/**
 * トップページ用の新着作品を取得するServer Action
 */
export async function getLatestWorks(limit = 10) {
	return getLatestItems(getWorks, "新着作品取得", "works", limit);
}

/**
 * トップページ用の新着動画を取得するServer Action
 */
export async function getLatestVideos(limit = 10) {
	return getLatestItems(getVideoTitles, "新着動画取得", "videos", limit);
}

/**
 * トップページ用の新着音声ボタンを取得するServer Action
 */
export async function getLatestAudioButtons(limit = 10) {
	// getRecentAudioButtonsはarrayを直接返すので特別な処理が必要
	logger.info("新着音声ボタン取得を開始", { action: "getLatestAudioButtons", limit });

	try {
		const audioButtons = await getRecentAudioButtons(limit);

		if (audioButtons.length === 0) {
			logger.warn("新着音声ボタン取得で0件返却", { action: "getLatestAudioButtons", limit });
		} else {
			logger.info("新着音声ボタン取得成功", {
				action: "getLatestAudioButtons",
				count: audioButtons.length,
				firstItem: audioButtons[0],
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
