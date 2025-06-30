import type {
	FrontendAudioButtonData,
	FrontendDLsiteWorkData,
	FrontendVideoData,
} from "@suzumina.click/shared-types";
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
}

// 検索実行関数を分割して複雑度を下げる
async function executeAudioButtonSearch(
	searchQuery: string,
	type: SearchParams["type"],
	limit: number,
): Promise<{ audioButtons: FrontendAudioButtonData[]; total: number; hasMore: boolean }> {
	if (type !== "all" && type !== "buttons") {
		return { audioButtons: [], total: 0, hasMore: false };
	}

	try {
		const result = await searchAudioButtons({
			searchText: searchQuery,
			limit: type === "buttons" ? limit : Math.min(limit, 6),
			onlyPublic: true,
			sortBy: "newest",
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

		// 並列実行で検索を実行
		const [audioButtonResult, videos, works] = await Promise.all([
			executeAudioButtonSearch(searchQuery, type, limit),
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
