"use server";

import type { VideoListResult, VideoPlainObject } from "@suzumina.click/shared-types";
import { getYouTubeCategoryName } from "@suzumina.click/ui/lib/youtube-category-utils";
import { unstable_cache } from "next/cache";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";
import { convertToVideo } from "./utils/video-converters";
import { loadAllVisibleVideos } from "./videos-source";

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
 * 空（空文字・空配列）は undefined にして、filterVideos の誤発火を防ぐ。
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
		// "all" は select フィルタの空値センチネルなので undefined 化。
		// それ以外は playlistTags と同じく string/string[] を配列へ正規化する。
		categoryNames:
			params.filters?.categoryNames === "all"
				? undefined
				: toStringArray(params.filters?.categoryNames),
		videoType:
			params.filters?.videoType === "all" ? undefined : (params.filters?.videoType as string),
	};

	// データ取得
	const data = await getVideoTitles(videoParams);

	// total は絞り込み後の件数（絞り込み無しなら表示可能な全件）。どちらも同じ全件から導出する（SPR-349）
	const totalCount = data.total;

	return {
		items: data.videos,
		totalCount,
		filteredCount: totalCount,
	};
}

/**
 * 並べ替え済みの新しい配列を返す（入力はキャッシュ共有されうるので破壊しない）。
 * 全件は新しい順で来るので oldest は反転、least_buttons は
 * ボタンが少ない順 → 同数なら新しい順（まだ誰も拾っていない配信を先頭へ）
 */
function sortVideos(videos: VideoPlainObject[], sort: string): VideoPlainObject[] {
	if (sort === "oldest") return [...videos].reverse();
	if (sort === "least_buttons") {
		return [...videos].sort(
			(a, b) =>
				(a.audioButtonCount ?? 0) - (b.audioButtonCount ?? 0) ||
				b.publishedAt.localeCompare(a.publishedAt),
		);
	}
	return videos;
}

/**
 * 動画を取得（フィルタリング対応）
 *
 * 全件（キャッシュ境界）+ in-memory 導出。read は page 番号ではなく動画件数 ×
 * キャッシュ世代数に比例する（SPR-349）
 */
async function getVideosWithFiltering(params: {
	page: number;
	limit: number;
	sort: string;
	search?: string;
	year?: string;
	playlistTags?: string[];
	categoryNames?: string[];
	videoType?: string;
}): Promise<VideoListResult> {
	const { page, limit, sort } = params;

	const filteredVideos = sortVideos(filterVideos(await loadAllVisibleVideos(), params), sort);

	const startOffset = (page - 1) * limit;
	const videos = filteredVideos.slice(startOffset, startOffset + limit);

	return {
		items: videos,
		videos,
		total: filteredVideos.length,
		page,
		pageSize: videos.length,
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
	categoryNames?: string[];
	videoType?: string;
}): Promise<VideoListResult> {
	try {
		const { page = 1, limit = 12, sort = "newest" } = params || {};

		const result = await getVideosWithFiltering({
			page,
			limit,
			sort,
			search: params?.search,
			year: params?.year,
			playlistTags: params?.playlistTags,
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
	limit?: number,
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

	const sorted = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);
	// limit 未指定は全件返却（絞り込みUIで「全タグ選択可能」を満たすため。ADR-012 Filters拡張）
	return (limit === undefined ? sorted : sorted.slice(0, limit)).map(([tag, count]) => ({
		tag,
		count,
	}));
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
export async function getPopularVideoTags(limit?: number): Promise<
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
 * 複数の動画をIDで一括取得する（videos のドキュメントIDは videoId）。
 *
 * 既知の少数IDをまとめて引く用途（マーキングの下書きキューが、動画ごとの現在状態＝
 * 仕上げてよいかを知るために使う）。存在しないIDは結果から落ちるだけで例外にしない。
 * getAll は index を要求しないため firestore_indexes.tf の追加は不要。
 */
export async function getVideosByIds(videoIds: string[]): Promise<VideoPlainObject[]> {
	const uniqueIds = [...new Set(videoIds)];
	if (uniqueIds.length === 0) {
		return [];
	}

	try {
		const firestore = getFirestore();
		const refs = uniqueIds.map((id) => firestore.collection("videos").doc(id));
		const docs = await firestore.getAll(...refs);
		return docs
			.filter((doc) => doc.exists)
			.map((doc) => convertToVideo(doc))
			.filter((video): video is VideoPlainObject => video !== null);
	} catch (error) {
		logger.error("動画の一括取得でエラーが発生", {
			action: "getVideosByIds",
			対象総数: uniqueIds.length,
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}
