"use server";

import { type DateRangePreset, getDateRangeFromPreset } from "@suzumina.click/shared-types";
import * as logger from "@/lib/logger";
import { getAudioButtons, getRecentAudioButtons } from "./buttons/actions";
import { getVideoTitles } from "./videos/actions";
import { getWorks } from "./works/actions";

/**
 * トップページ用の新着作品を取得するServer Action
 * @param limit 取得件数
 * @param excludeR18 R18作品を除外するかどうか
 */
export async function getLatestWorks(limit = 10, excludeR18 = false) {
	try {
		// トップページでは最新作品のみが必要なので、最適化されたクエリを使用
		const result = await getWorks({
			page: 1,
			limit: limit,
			sort: "newest",
			showR18: !excludeR18, // excludeR18がtrueの時、showR18はfalseになる
		});

		if (result.works.length === 0) {
			logger.warn("新着作品取得で0件返却", {
				action: "getLatestWorks",
				limit,
				excludeR18,
			});
		}

		return result.works;
	} catch (error) {
		logger.error("新着作品取得でエラーが発生", {
			action: "getLatestWorks",
			limit,
			excludeR18,
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
			logger.warn("新着動画取得で0件返却", {
				action: "getLatestVideos",
				limit,
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
 */
export async function getLatestAudioButtons(limit = 10) {
	// getRecentAudioButtonsはarrayを直接返すので特別な処理が必要

	try {
		const audioButtons = await getRecentAudioButtons(limit);

		if (audioButtons.length === 0) {
			logger.warn("新着音声ボタン取得で0件返却", {
				action: "getLatestAudioButtons",
				limit,
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

/**
 * 動画検索を行うServer Action（統合検索API用）
 */
export async function searchVideos(
	query: string,
	limit = 6,
	threeLayerTags?: {
		playlistTags?: string[];
		userTags?: string[];
		categoryNames?: string[];
	},
) {
	try {
		const result = await getVideoTitles({
			page: 1,
			limit,
			search: query,
			sort: "newest",
			...threeLayerTags,
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
/**
 * 統合検索Server Action
 * 音声ボタン、動画、作品を横断検索する
 */
export async function searchUnified(filters: {
	query: string;
	type: "all" | "buttons" | "videos" | "works";
	limit: number;
	sortBy?: string;
	dateRange?: string;
	dateFrom?: string;
	dateTo?: string;
	tags?: string[];
	tagMode?: "any" | "all";
	playCountMin?: number;
	playCountMax?: number;
	likeCountMin?: number;
	likeCountMax?: number;
	favoriteCountMin?: number;
	favoriteCountMax?: number;
	durationMin?: number;
	durationMax?: number;
	// 3層タグフィルター
	playlistTags?: string[];
	userTags?: string[];
	categoryNames?: string[];
	layerSearchMode?: "any_layer" | "all_layers" | "specific_layer";
}) {
	try {
		const searchQuery = filters.query?.trim() || "";
		const { type, limit } = filters;

		if (!searchQuery) {
			return {
				audioButtons: [],
				videos: [],
				works: [],
				totalCount: { buttons: 0, videos: 0, works: 0 },
				hasMore: { buttons: false, videos: false, works: false },
			};
		}

		// 日付範囲処理
		let createdAfter: string | undefined;
		let createdBefore: string | undefined;

		if (filters.dateRange) {
			const { from, to } = getDateRangeFromPreset(filters.dateRange as DateRangePreset);
			createdAfter = from.toISOString();
			createdBefore = to.toISOString();
		} else if (filters.dateFrom || filters.dateTo) {
			createdAfter = filters.dateFrom;
			createdBefore = filters.dateTo;
		}

		// 並行実行で検索
		const [audioButtonsResult, videosResult, worksResult] = await Promise.all([
			// 音声ボタン検索
			(async () => {
				if (type !== "all" && type !== "buttons") {
					return { audioButtons: [], total: 0, hasMore: false };
				}
				try {
					const result = await searchAudioButtons({
						searchText: searchQuery,
						limit: type === "buttons" ? limit : Math.min(limit, 6),
						onlyPublic: true,
						sortBy:
							(filters.sortBy as "newest" | "oldest" | "popular" | "mostPlayed" | "relevance") ||
							"newest",
						tags: filters.tags,
						createdAfter,
						createdBefore,
						playCountMin: filters.playCountMin,
						playCountMax: filters.playCountMax,
						likeCountMin: filters.likeCountMin,
						likeCountMax: filters.likeCountMax,
						favoriteCountMin: filters.favoriteCountMin,
						favoriteCountMax: filters.favoriteCountMax,
						durationMin: filters.durationMin,
						durationMax: filters.durationMax,
					});
					return {
						audioButtons: result.audioButtons,
						total: result.totalCount,
						hasMore: result.hasMore,
					};
				} catch {
					return { audioButtons: [], total: 0, hasMore: false };
				}
			})(),
			// 動画検索
			(async () => {
				if (type !== "all" && type !== "videos") {
					return [];
				}
				try {
					return await searchVideos(searchQuery, type === "videos" ? limit : Math.min(limit, 6), {
						playlistTags: filters.playlistTags,
						userTags: filters.userTags,
						categoryNames: filters.categoryNames,
					});
				} catch {
					return [];
				}
			})(),
			// 作品検索
			(async () => {
				if (type !== "all" && type !== "works") {
					return [];
				}
				try {
					return await searchWorks(searchQuery, type === "works" ? limit : Math.min(limit, 6));
				} catch {
					return [];
				}
			})(),
		]);

		return {
			audioButtons: audioButtonsResult.audioButtons,
			videos: videosResult,
			works: worksResult,
			totalCount: {
				buttons: audioButtonsResult.total,
				videos: videosResult.length,
				works: worksResult.length,
			},
			hasMore: {
				buttons: audioButtonsResult.hasMore,
				videos: videosResult.length >= (type === "videos" ? limit : Math.min(limit, 6)),
				works: worksResult.length >= (type === "works" ? limit : Math.min(limit, 6)),
			},
		};
	} catch (error) {
		logger.error("Unified search error", { filters, error });
		return {
			audioButtons: [],
			videos: [],
			works: [],
			totalCount: { buttons: 0, videos: 0, works: 0 },
			hasMore: { buttons: false, videos: false, works: false },
		};
	}
}

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
			search: params.searchText,
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
