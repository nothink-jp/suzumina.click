"use server";

import * as logger from "@/lib/logger";
import { getAudioButtons, getRecentAudioButtons } from "./buttons/actions";
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

/**
 * 動画検索を行うServer Action（統合検索API用）
 */
export async function searchVideos(query: string, limit = 6) {
	try {
		const result = await getVideoTitles({
			page: 1,
			limit,
			search: query,
			sort: "newest",
		});

		return result.videos;
	} catch (error) {
		logger.error("動画検索でエラーが発生", {
			action: "searchVideos",
			query,
			limit,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return [];
	}
}

/**
 * 作品検索を行うServer Action（統合検索API用）
 */
export async function searchWorks(query: string, limit = 6) {
	try {
		const result = await getWorks({
			page: 1,
			limit,
			search: query,
			sort: "newest",
		});

		return result.works;
	} catch (error) {
		logger.error("作品検索でエラーが発生", {
			action: "searchWorks",
			query,
			limit,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return [];
	}
}

/**
 * 音声ボタン検索を行うServer Action（統合検索API用）
 */
export async function searchAudioButtons(params: {
	searchText: string;
	limit: number;
	onlyPublic: boolean;
	sortBy: "newest" | "oldest" | "popular" | "mostPlayed" | "relevance";
	// 追加のフィルターパラメータ
	tags?: string[];
	createdAfter?: string;
	createdBefore?: string;
	playCountMin?: number;
	playCountMax?: number;
	likeCountMin?: number;
	likeCountMax?: number;
	favoriteCountMin?: number;
	favoriteCountMax?: number;
	durationMin?: number;
	durationMax?: number;
}) {
	try {
		// relevanceの場合はnewestにマッピング（関連度順は検索結果の順序を保持するため）
		const actualSortBy = params.sortBy === "relevance" ? "newest" : params.sortBy;

		const result = await getAudioButtons({
			searchText: params.searchText,
			limit: params.limit,
			onlyPublic: params.onlyPublic,
			sortBy: actualSortBy,
			// フィルターパラメータを追加
			tags: params.tags,
			createdAfter: params.createdAfter,
			createdBefore: params.createdBefore,
			playCountMin: params.playCountMin,
			playCountMax: params.playCountMax,
			likeCountMin: params.likeCountMin,
			likeCountMax: params.likeCountMax,
			favoriteCountMin: params.favoriteCountMin,
			favoriteCountMax: params.favoriteCountMax,
			durationMin: params.durationMin,
			durationMax: params.durationMax,
		});

		if (result.success) {
			return {
				audioButtons: result.data.audioButtons,
				totalCount: result.data.audioButtons.length,
				hasMore: result.data.hasMore,
			};
		}

		return {
			audioButtons: [],
			totalCount: 0,
			hasMore: false,
		};
	} catch (error) {
		logger.error("音声ボタン検索でエラーが発生", {
			action: "searchAudioButtons",
			params,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return {
			audioButtons: [],
			totalCount: 0,
			hasMore: false,
		};
	}
}
