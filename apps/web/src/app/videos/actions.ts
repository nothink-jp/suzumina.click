"use server";

import type { DocumentSnapshot } from "@google-cloud/firestore";
import {
	type FirestoreServerVideoData,
	Video,
	type VideoListResult,
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
function filterVideos(videos: Video[], params: VideoFilterParams): Video[] {
	let filtered = videos;

	// 年代フィルタリング
	if (params.year) {
		const year = Number.parseInt(params.year, 10);
		if (!Number.isNaN(year)) {
			filtered = filtered.filter((video) => {
				const publishedYear = video.content.publishedAt.toDate().getFullYear();
				return publishedYear === year;
			});
		}
	}

	// 検索フィルタ
	if (params.search) {
		const searchLower = params.search.toLowerCase();
		filtered = filtered.filter(
			(video) =>
				video.metadata.title.toString().toLowerCase().includes(searchLower) ||
				video.metadata.description.toString().toLowerCase().includes(searchLower),
		);
	}

	// プレイリストタグフィルタ
	if (params.playlistTags && params.playlistTags.length > 0) {
		filtered = filtered.filter((video) =>
			params.playlistTags?.some((tag) => video.playlistTags.includes(tag)),
		);
	}

	// ユーザータグフィルタ
	if (params.userTags && params.userTags.length > 0) {
		filtered = filtered.filter((video) =>
			params.userTags?.some((tag) => video.userTags.includes(tag)),
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
			const videoType = video.getVideoType();

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
 * GenericList用のビデオデータ取得関数
 */
export async function fetchVideosForGenericList(
	params: import("@suzumina.click/ui/components/custom/generic-list").ListParams,
): Promise<
	import("@suzumina.click/ui/components/custom/generic-list").ListResult<
		import("@suzumina.click/shared-types").VideoPlainObject
	>
> {
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
 * FirestoreデータをVideoに変換
 */
function convertToVideo(doc: DocumentSnapshot): Video | null {
	try {
		const data = doc.data() as FirestoreServerVideoData;

		// 直接Video Entityに変換
		return Video.fromFirestoreData(data);
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

		// Video Entityに変換してフィルタリング
		const allVideos = snapshot.docs
			.map((doc) => convertToVideo(doc))
			.filter((video): video is Video => video !== null)
			.filter((video) => video.content.privacyStatus === "public");

		// フィルタリング処理
		const filteredVideos = filterVideos(allVideos, params);

		// ページネーション
		const startOffset = (page - 1) * limit;
		const paginatedVideos = filteredVideos.slice(startOffset, startOffset + limit + 1);
		const hasMore = paginatedVideos.length > limit;
		const videos = hasMore ? paginatedVideos.slice(0, limit) : paginatedVideos;

		// Plain Objectに変換
		const plainVideos = videos.map((v) => v.toPlainObject());

		return {
			items: plainVideos,
			videos: plainVideos,
			total: filteredVideos.length,
			page,
			pageSize: plainVideos.length,
			hasMore,
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
		.filter((video): video is Video => video !== null)
		.filter((video) => video.content.privacyStatus === "public");

	const plainVideos = videos.map((v) => v.toPlainObject());
	const hasMore = snapshot.size > limit;

	// 総数を取得
	const allCountSnapshot = await firestore.collection("videos").count().get();
	const total = allCountSnapshot.data().count;

	return {
		items: plainVideos,
		videos: plainVideos,
		total,
		page,
		pageSize: plainVideos.length,
		hasMore,
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
		const { page = 1, limit = 20, sort = "newest" } = params || {};
		const firestore = getFirestore();

		// 統一された処理を使用
		return await getVideosWithFiltering(firestore, {
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
			hasMore: false,
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
		return video ? video.toPlainObject() : null;
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
			.filter((video): video is Video => video !== null)
			.filter((video) => video.content.privacyStatus === "public");

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
