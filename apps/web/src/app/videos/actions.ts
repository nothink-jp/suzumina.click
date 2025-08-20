"use server";

import type { DocumentSnapshot } from "@google-cloud/firestore";
import {
	type FirestoreServerVideoData,
	type VideoListResult,
	type VideoPlainObject,
	videoTransformers,
} from "@suzumina.click/shared-types";
import { getYouTubeCategoryName } from "@suzumina.click/ui/lib/youtube-category-utils";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * ビデオフィルタリングパラメータの型
 */
interface VideoFilterParams {
	year?: string;
	search?: string;
	playlistTags?: string[];
	userTags?: string[];
	categoryNames?: string[];
	videoType?: string;
}

/**
 * Video配列をフィルタリングするヘルパー関数
 */
function filterVideos(videos: VideoPlainObject[], params: VideoFilterParams): VideoPlainObject[] {
	let filtered = videos;

	// 年代フィルタリング
	if (params.year) {
		const year = Number.parseInt(params.year, 10);
		if (!Number.isNaN(year)) {
			filtered = filtered.filter((video) => {
				const publishedYear = new Date(video.publishedAt).getFullYear();
				return publishedYear === year;
			});
		}
	}

	// 検索フィルタ
	if (params.search) {
		const searchLower = params.search.toLowerCase();
		filtered = filtered.filter(
			(video) =>
				video.title.toLowerCase().includes(searchLower) ||
				video.description.toLowerCase().includes(searchLower),
		);
	}

	// プレイリストタグフィルタ
	if (params.playlistTags && params.playlistTags.length > 0) {
		filtered = filtered.filter((video) =>
			params.playlistTags?.some((tag) => video.tags?.playlistTags?.includes(tag) || false),
		);
	}

	// ユーザータグフィルタ
	if (params.userTags && params.userTags.length > 0) {
		filtered = filtered.filter((video) =>
			params.userTags?.some((tag) => video.tags?.userTags?.includes(tag) || false),
		);
	}

	// カテゴリフィルタ
	if (params.categoryNames && params.categoryNames.length > 0) {
		filtered = filtered.filter((video) => {
			const categoryName = getYouTubeCategoryName(video.categoryId);
			return categoryName && params.categoryNames?.includes(categoryName);
		});
	}

	// 動画タイプフィルタ
	if (params.videoType) {
		filtered = filtered.filter((video) => {
			const videoType = video._computed.videoType;

			// UIとEntity間の値のマッピング
			const typeMapping: Record<string, string> = {
				live_archive: "archived",
				regular: "normal",
				live_upcoming: "live", // または 'upcoming'
			};

			const expectedType = params.videoType
				? typeMapping[params.videoType] || params.videoType
				: "normal";

			// live_upcomingは特別な処理
			if (params.videoType === "live_upcoming") {
				return videoType === "live" || videoType === "upcoming" || videoType === "possibly_live";
			}

			return videoType === expectedType;
		});
	}

	return filtered;
}

/**
 * 動画リストを取得（ConfigurableList用）
 */
export async function getVideosList(params: {
	page: number;
	limit: number;
	sort?: string;
	search?: string;
	filters?: Record<string, unknown>;
}): Promise<{
	items: import("@suzumina.click/shared-types").VideoPlainObject[];
	totalCount: number;
	filteredCount: number;
}> {
	// フィルターパラメータの変換
	const videoParams = {
		page: params.page,
		limit: params.limit,
		sort: params.sort,
		search: params.search,
		year: params.filters?.year === "all" ? undefined : (params.filters?.year as string),
		playlistTags: params.filters?.playlistTags as string[],
		userTags: params.filters?.userTags as string[],
		categoryNames:
			params.filters?.categoryNames === "all"
				? undefined
				: params.filters?.categoryNames
					? [params.filters.categoryNames as string]
					: undefined,
		videoType:
			params.filters?.videoType === "all" ? undefined : (params.filters?.videoType as string),
	};

	// データ取得
	const data = await getVideoTitles(videoParams);

	// getVideoTitlesが返すtotalを使用（実際のフィルタリング結果の件数）
	const filteredCount = data.total;

	// フィルターが適用されていない場合のみ、全件数を取得
	const hasFilters = !!(
		videoParams.year ||
		videoParams.search ||
		videoParams.playlistTags ||
		videoParams.userTags ||
		videoParams.categoryNames ||
		videoParams.videoType
	);

	const totalCount = hasFilters ? filteredCount : await getTotalVideoCount({});

	return {
		items: data.videos,
		totalCount,
		filteredCount,
	};
}

/**
 * Firestore Timestampを変換するヘルパー関数
 */
function convertTimestamp(value: unknown): Date | string | undefined {
	if (value && typeof value === "object" && "toDate" in value) {
		return (value as { toDate(): Date }).toDate();
	}
	return value as Date | string | undefined;
}

/**
 * FirestoreデータをVideoに変換
 */
function convertToVideo(doc: DocumentSnapshot): VideoPlainObject | null {
	try {
		const data = doc.data() as FirestoreServerVideoData;

		// Firestore Timestampを変換
		const normalizedData = {
			...data,
			id: data.videoId || doc.id, // videoIdフィールドを優先、なければドキュメントID
			videoId: data.videoId || doc.id, // videoIdフィールドを優先
			publishedAt: convertTimestamp(data.publishedAt),
			lastFetchedAt: convertTimestamp(data.lastFetchedAt),
			liveStreamingDetails: data.liveStreamingDetails
				? {
						...data.liveStreamingDetails,
						scheduledStartTime: convertTimestamp(data.liveStreamingDetails.scheduledStartTime),
						scheduledEndTime: convertTimestamp(data.liveStreamingDetails.scheduledEndTime),
						actualStartTime: convertTimestamp(data.liveStreamingDetails.actualStartTime),
						actualEndTime: convertTimestamp(data.liveStreamingDetails.actualEndTime),
					}
				: undefined,
		};

		// VideoPlainObjectに変換
		return videoTransformers.fromFirestore(normalizedData);
	} catch (error) {
		logger.error("Video変換エラー", {
			videoId: doc.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * 動画を取得（フィルタリング対応）
 */
async function getVideosWithFiltering(
	firestore: FirebaseFirestore.Firestore,
	params: {
		page: number;
		limit: number;
		sort: string;
		search?: string;
		year?: string;
		playlistTags?: string[];
		userTags?: string[];
		categoryNames?: string[];
		videoType?: string;
	},
): Promise<VideoListResult> {
	const { page, limit, sort } = params;
	const sortOrder = sort === "oldest" ? "asc" : "desc";
	let query: FirebaseFirestore.Query = firestore
		.collection("videos")
		.orderBy("publishedAt", sortOrder);

	// 年代フィルタがある場合、全データを取得する必要がある
	// （フィルタリング後のページネーションを正確に行うため）
	if (
		params.year ||
		params.search ||
		params.playlistTags?.length ||
		params.userTags?.length ||
		params.categoryNames?.length ||
		params.videoType
	) {
		// フィルタがある場合は全件取得
		const snapshot = await query.get();

		// VideoPlainObjectに変換してフィルタリング
		const allVideos = snapshot.docs
			.map((doc) => convertToVideo(doc))
			.filter((video): video is VideoPlainObject => video !== null)
			.filter((video) => video.status?.privacyStatus === "public" || !video.status);

		// フィルタリング処理
		const filteredVideos = filterVideos(allVideos, params);

		// ページネーション
		const startOffset = (page - 1) * limit;
		const paginatedVideos = filteredVideos.slice(startOffset, startOffset + limit + 1);
		const hasMore = paginatedVideos.length > limit;
		const videos = hasMore ? paginatedVideos.slice(0, limit) : paginatedVideos;

		// すでにPlainObjectなのでそのまま使用
		const plainVideos = videos;

		return {
			items: plainVideos,
			videos: plainVideos,
			total: filteredVideos.length,
			page,
			pageSize: plainVideos.length,
		};
	}

	// フィルタがない場合は、効率的なページネーションを行う
	const startOffset = (page - 1) * limit;
	if (startOffset > 0) {
		const offsetSnapshot = await firestore
			.collection("videos")
			.orderBy("publishedAt", sortOrder)
			.limit(startOffset)
			.get();

		if (offsetSnapshot.size > 0) {
			const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
			query = query.startAfter(lastDoc);
		}
	}

	query = query.limit(limit + 1);
	const snapshot = await query.get();

	const videos = snapshot.docs
		.slice(0, limit)
		.map((doc) => convertToVideo(doc))
		.filter((video): video is VideoPlainObject => video !== null)
		.filter((video) => video.status?.privacyStatus === "public" || !video.status);

	const plainVideos = videos; // すでにPlainObject
	const _hasMore = snapshot.size > limit;

	// publicな動画の総数を取得
	// TODO: パフォーマンス最適化のため、メタデータコレクションでのキャッシュを検討
	const countQuery = firestore.collection("videos");
	const countSnapshot = await countQuery.get();
	const total = countSnapshot.docs
		.map((doc) => convertToVideo(doc))
		.filter((video): video is VideoPlainObject => video !== null)
		.filter((video) => video.status?.privacyStatus === "public" || !video.status).length;

	return {
		items: plainVideos,
		videos: plainVideos,
		total,
		page,
		pageSize: plainVideos.length,
	};
}

/**
 * Entity V2を使用した動画タイトル一覧の取得
 */
export async function getVideoTitles(params?: {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
	year?: string;
	playlistTags?: string[];
	userTags?: string[];
	categoryNames?: string[];
	videoType?: string;
}): Promise<VideoListResult> {
	try {
		const { page = 1, limit = 12, sort = "newest" } = params || {};

		const firestore = getFirestore();

		// 統一された処理を使用
		const result = await getVideosWithFiltering(firestore, {
			page,
			limit,
			sort,
			search: params?.search,
			year: params?.year,
			playlistTags: params?.playlistTags,
			userTags: params?.userTags,
			categoryNames: params?.categoryNames,
			videoType: params?.videoType,
		});

		return result;
	} catch (error) {
		logger.error("動画タイトルV2取得でエラーが発生", {
			action: "getVideoTitles",
			params,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return {
			items: [],
			videos: [],
			total: 0,
			page: 1,
			pageSize: 0,
		};
	}
}

/**
 * Entity V2を使用した特定の動画IDで動画データを取得するServer Action
 * @param videoId - 動画ID
 * @returns 動画データまたはnull
 */
export async function getVideoById(videoId: string) {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection("videos").doc(videoId).get();

		if (!doc.exists) {
			return null;
		}

		const video = convertToVideo(doc);
		return video; // すでにPlainObject
	} catch (error) {
		logger.error("動画詳細V2取得でエラーが発生", {
			action: "getVideoById",
			videoId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return null;
	}
}

/**
 * Entity V2を使用した動画総数の取得
 */
export async function getTotalVideoCount(params?: {
	year?: string;
	search?: string;
	playlistTags?: string[];
	userTags?: string[];
	categoryNames?: string[];
	videoType?: string;
}) {
	try {
		const firestore = getFirestore();
		const query = firestore.collection("videos");

		// 全件を取得してメモリ上でフィルタリング（一時的な対応）
		const snapshot = await query.get();

		// Video Entityに変換してフィルタリング
		const videos = snapshot.docs
			.map((doc) => convertToVideo(doc))
			.filter((video): video is VideoPlainObject => video !== null)
			.filter((video) => video.status?.privacyStatus === "public" || !video.status);

		// フィルタリング処理をヘルパー関数に委譲
		const filteredVideos = filterVideos(videos, params || {});

		return filteredVideos.length;
	} catch (error) {
		logger.error("動画総数V2取得でエラーが発生", {
			action: "getTotalVideoCount",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return 0;
	}
}
