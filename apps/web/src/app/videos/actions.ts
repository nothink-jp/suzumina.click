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
				return videoType === "live" || videoType === "upcoming";
			}

			return videoType === expectedType;
		});
	}

	return filtered;
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
		let query = firestore.collection("videos");

		// ソート順を設定
		const sortOrder = sort === "oldest" ? "asc" : "desc";
		query = query.orderBy("publishedAt", sortOrder) as typeof query;

		// 全件を取得してメモリ上でフィルタリング（一時的な対応）
		// TODO: 将来的にはFirestoreの複合インデックスを使用
		const allSnapshot = await query.get();

		// Video Entityに変換してフィルタリング
		const allVideos = allSnapshot.docs
			.map((doc) => convertToVideo(doc))
			.filter((video): video is Video => video !== null)
			.filter((video) => video.content.privacyStatus === "public");

		// フィルタリング処理をヘルパー関数に委譲
		const filteredVideos = filterVideos(allVideos, params || {});

		// ページネーション
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedVideos = filteredVideos.slice(startIndex, endIndex + 1); // +1 for hasMore check
		const hasMore = paginatedVideos.length > limit;
		const videos = hasMore ? paginatedVideos.slice(0, limit) : paginatedVideos;

		// Plain Objectに変換
		const plainVideos = videos.map((v) => v.toPlainObject());

		return {
			items: plainVideos,
			videos: plainVideos,
			total: filteredVideos.length, // フィルタ後の総数
			page,
			pageSize: plainVideos.length,
			hasMore,
		};
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
