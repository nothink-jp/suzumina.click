"use server";

import type { DocumentSnapshot } from "@google-cloud/firestore";
import {
	type FirestoreServerVideoData,
	type VideoListResult,
	type VideoPlainObject,
	videoTransformers,
} from "@suzumina.click/shared-types";
import { getYouTubeCategoryName } from "@suzumina.click/ui/lib/youtube-category-utils";
import { unstable_cache } from "next/cache";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * 人気タグ集計は全件スキャンを伴うため、revalidate でキャッシュして
 * ページ訪問ごとの全件 .get() を回避する（SPR-112 / SPR-88 と整合）。
 * タグは緩やかにしか変化しないので長めの TTL を採用する。
 */
const POPULAR_TAGS_REVALIDATE_SECONDS = 60 * 60;

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
 * フィルター値を string[] に正規化する。
 * URL 由来の単一値は string、ConfigurableList の tags フィルタは string[] で渡るため両対応。
 * 空（空文字・空配列）は undefined にして、filterVideos / hasFilters の誤発火を防ぐ。
 */
function toStringArray(value: unknown): string[] | undefined {
	const arr = Array.isArray(value) ? value : value != null ? [value] : [];
	const normalized = arr.filter((v): v is string => typeof v === "string" && v.trim() !== "");
	return normalized.length > 0 ? normalized : undefined;
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
		playlistTags: toStringArray(params.filters?.playlistTags),
		userTags: toStringArray(params.filters?.userTags),
		// "all" は select フィルタの空値センチネルなので undefined 化。
		// それ以外は playlistTags/userTags と同じく string/string[] を配列へ正規化する。
		categoryNames:
			params.filters?.categoryNames === "all"
				? undefined
				: toStringArray(params.filters?.categoryNames),
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

	// publicな動画の総数を count() 集計で取得（SPR-88: 毎リクエストの全件 .get()
	// スキャンを回避。works/actions.ts と同じ count() パターン）。
	// 注: status 未設定 doc は count() で拾えない。旧 mapper 撤去期の未設定 doc（2026-07 時点 171/554 件）が
	// 残っていたが、SPR-243 で mapper が status を再写像し毎時 cron の再取得で自然 backfill される。
	// 表示側の `|| !video.status` フィルタは移行期の安全弁として残している。
	const countSnapshot = await firestore
		.collection("videos")
		.where("status.privacyStatus", "==", "public")
		.count()
		.get();
	const total = countSnapshot.data().count;

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
 * 動画の人気タグ（playlistTags）を集計する内部実装。
 *
 * tags.playlistTags を正本とし、convertToVideo 経由で PlainObject 化してから集計する
 * （Firestore raw 構造に依存しない）。絞り込み自体は getVideosList の filterVideos が行う。
 * 全件 .get() を伴うため、公開 API はキャッシュ経由で呼ぶ（getPopularVideoTags）。
 *
 * エラーはここで握りつぶさず throw する。unstable_cache は throw をキャッシュしないため、
 * 一過性の Firestore 障害で空配列が revalidate 窓の間キャッシュされるのを避ける。
 */
async function fetchPopularVideoTags(
	limit: number,
): Promise<Array<{ tag: string; count: number }>> {
	const firestore = getFirestore();
	const snapshot = await firestore
		.collection("videos")
		.where("status.privacyStatus", "==", "public")
		.get();

	const tagCounts = new Map<string, number>();
	for (const doc of snapshot.docs) {
		const video = convertToVideo(doc);
		const playlistTags = video?.tags?.playlistTags;
		if (Array.isArray(playlistTags)) {
			for (const tag of playlistTags) {
				if (typeof tag === "string" && tag.trim() !== "") {
					tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
				}
			}
		}
	}

	return Array.from(tagCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([tag, count]) => ({ tag, count }));
}

// limit は unstable_cache が引数として自動でキー化する。
const getPopularVideoTagsCached = unstable_cache(fetchPopularVideoTags, ["popular-video-tags"], {
	revalidate: POPULAR_TAGS_REVALIDATE_SECONDS,
	tags: ["popular-video-tags"],
});

/**
 * 動画の人気タグ（playlistTags）を取得する。
 * 一覧ページのタグ絞り込みUIの選択肢に使う。全件スキャンを避けるため revalidate キャッシュ経由。
 * エラー時は空配列を返す（キャッシュ層には正常結果のみ載る）。
 */
export async function getPopularVideoTags(limit = 30): Promise<
	Array<{
		tag: string;
		count: number;
	}>
> {
	try {
		return await getPopularVideoTagsCached(limit);
	} catch (error) {
		logger.error("動画の人気タグ取得に失敗", {
			action: "getPopularVideoTags",
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
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

		// フィルタが無い場合は count() 集計で取得し全件スキャンを回避（SPR-88）。
		// 現状の唯一の呼び出し元 getVideosList は常にフィルタ無し ({}) で呼ぶため、
		// この fast path が実質的なホットパス。
		const hasFilters = !!(
			params?.year ||
			params?.search ||
			params?.playlistTags?.length ||
			params?.userTags?.length ||
			params?.categoryNames?.length ||
			params?.videoType
		);
		if (!hasFilters) {
			const countSnapshot = await firestore
				.collection("videos")
				.where("status.privacyStatus", "==", "public")
				.count()
				.get();
			return countSnapshot.data().count;
		}

		// フィルタがある場合は全件取得してメモリ上でフィルタリング（暫定）
		const snapshot = await firestore.collection("videos").get();
		const videos = snapshot.docs
			.map((doc) => convertToVideo(doc))
			.filter((video): video is VideoPlainObject => video !== null)
			.filter((video) => video.status?.privacyStatus === "public" || !video.status);
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
