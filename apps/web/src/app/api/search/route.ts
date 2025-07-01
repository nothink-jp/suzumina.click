import type {
	DateRangePreset,
	FrontendAudioButtonData,
	FrontendDLsiteWorkData,
	FrontendVideoData,
	UnifiedSearchFilters,
} from "@suzumina.click/shared-types";
import { getDateRangeFromPreset } from "@suzumina.click/shared-types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { searchAudioButtons, searchVideos, searchWorks } from "@/app/actions";

interface UnifiedSearchResult {
	audioButtons: FrontendAudioButtonData[];
	videos: FrontendVideoData[];
	works: FrontendDLsiteWorkData[];
	totalCount: {
		buttons: number;
		videos: number;
		works: number;
	};
	hasMore: {
		buttons: boolean;
		videos: boolean;
		works: boolean;
	};
}

interface SearchParams {
	q: string;
	type?: "all" | "buttons" | "videos" | "works";
	limit?: number;
	page?: number;
	// フィルター関連
	sortBy?: UnifiedSearchFilters["sortBy"];
	dateRange?: DateRangePreset;
	dateFrom?: string;
	dateTo?: string;
	playCountMin?: number;
	playCountMax?: number;
	likeCountMin?: number;
	likeCountMax?: number;
	favoriteCountMin?: number;
	favoriteCountMax?: number;
	durationMin?: number;
	durationMax?: number;
	tags?: string[];
	tagMode?: "any" | "all";
}

// 検索実行関数を分割して複雑度を下げる
async function executeAudioButtonSearch(
	searchQuery: string,
	type: SearchParams["type"],
	limit: number,
	filters: SearchParams,
): Promise<{ audioButtons: FrontendAudioButtonData[]; total: number; hasMore: boolean }> {
	if (type !== "all" && type !== "buttons") {
		return { audioButtons: [], total: 0, hasMore: false };
	}

	try {
		// 日付範囲の計算
		let createdAfter: string | undefined;
		let createdBefore: string | undefined;

		if (filters.dateRange && filters.dateRange !== "custom") {
			const { from, to } = getDateRangeFromPreset(filters.dateRange);
			createdAfter = from.toISOString();
			createdBefore = to.toISOString();
		} else if (filters.dateFrom || filters.dateTo) {
			createdAfter = filters.dateFrom;
			createdBefore = filters.dateTo;
		}

		const result = await searchAudioButtons({
			searchText: searchQuery,
			limit: type === "buttons" ? limit : Math.min(limit, 6),
			onlyPublic: true,
			sortBy: filters.sortBy || "newest",
			// フィルター適用
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
}

async function executeVideoSearch(
	searchQuery: string,
	type: SearchParams["type"],
	limit: number,
): Promise<FrontendVideoData[]> {
	if (type !== "all" && type !== "videos") {
		return [];
	}

	try {
		return await searchVideos(searchQuery, type === "videos" ? limit : Math.min(limit, 6));
	} catch {
		return [];
	}
}

async function executeWorkSearch(
	searchQuery: string,
	type: SearchParams["type"],
	limit: number,
): Promise<FrontendDLsiteWorkData[]> {
	if (type !== "all" && type !== "works") {
		return [];
	}

	try {
		return await searchWorks(searchQuery, type === "works" ? limit : Math.min(limit, 6));
	} catch {
		return [];
	}
}

function calculateHasMore(
	items: unknown[],
	type: SearchParams["type"],
	currentType: string,
	limit: number,
): boolean {
	const actualLimit = type === currentType ? limit : Math.min(limit, 6);
	return items.length >= actualLimit;
}

// フィルターパラメータ解析関数
function parseSearchFilters(
	searchParams: URLSearchParams,
	type: SearchParams["type"],
	limit: number,
): SearchParams {
	return {
		q: "",
		type,
		limit,
		sortBy: (searchParams.get("sortBy") as UnifiedSearchFilters["sortBy"]) || "relevance",
		dateRange: searchParams.get("dateRange") as DateRangePreset,
		dateFrom: searchParams.get("dateFrom") || undefined,
		dateTo: searchParams.get("dateTo") || undefined,
		playCountMin: searchParams.get("playCountMin")
			? Number(searchParams.get("playCountMin"))
			: undefined,
		playCountMax: searchParams.get("playCountMax")
			? Number(searchParams.get("playCountMax"))
			: undefined,
		likeCountMin: searchParams.get("likeCountMin")
			? Number(searchParams.get("likeCountMin"))
			: undefined,
		likeCountMax: searchParams.get("likeCountMax")
			? Number(searchParams.get("likeCountMax"))
			: undefined,
		favoriteCountMin: searchParams.get("favoriteCountMin")
			? Number(searchParams.get("favoriteCountMin"))
			: undefined,
		favoriteCountMax: searchParams.get("favoriteCountMax")
			? Number(searchParams.get("favoriteCountMax"))
			: undefined,
		durationMin: searchParams.get("durationMin")
			? Number(searchParams.get("durationMin"))
			: undefined,
		durationMax: searchParams.get("durationMax")
			? Number(searchParams.get("durationMax"))
			: undefined,
		tags: searchParams.get("tags")?.split(",") || undefined,
		tagMode: (searchParams.get("tagMode") as "any" | "all") || "any",
	};
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const q = searchParams.get("q");
		const type = (searchParams.get("type") as SearchParams["type"]) || "all";
		const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

		if (!q || q.trim().length === 0) {
			return NextResponse.json({ error: "検索キーワードが指定されていません" }, { status: 400 });
		}

		const searchQuery = q.trim().toLowerCase();

		// フィルターパラメータの解析
		const filters = parseSearchFilters(searchParams, type, limit);
		filters.q = searchQuery;

		// 並列実行で検索を実行
		const [audioButtonResult, videos, works] = await Promise.all([
			executeAudioButtonSearch(searchQuery, type, limit, filters),
			executeVideoSearch(searchQuery, type, limit),
			executeWorkSearch(searchQuery, type, limit),
		]);

		const result: UnifiedSearchResult = {
			audioButtons: audioButtonResult.audioButtons,
			videos,
			works,
			totalCount: {
				buttons: audioButtonResult.total,
				videos: videos.length,
				works: works.length,
			},
			hasMore: {
				buttons: audioButtonResult.hasMore,
				videos: calculateHasMore(videos, type, "videos", limit),
				works: calculateHasMore(works, type, "works", limit),
			},
		};

		return NextResponse.json(result);
	} catch {
		return NextResponse.json({ error: "検索処理中にエラーが発生しました" }, { status: 500 });
	}
}
