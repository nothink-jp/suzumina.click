import type { AudioButtonQuery } from "@suzumina.click/shared-types";
import { type NextRequest, NextResponse } from "next/server";
import { getAudioButtons } from "@/app/buttons/actions";

// Helper function to parse numeric parameter
function parseNumericParam(value: string | null): number | undefined {
	return value ? Number(value) : undefined;
}

// Helper function to parse string parameter
function parseStringParam(value: string | null): string | undefined {
	return value || undefined;
}

// Helper function to parse numeric range filters
function parseNumericRangeFilters(searchParams: URLSearchParams) {
	return {
		playCountMin: parseNumericParam(searchParams.get("playCountMin")),
		playCountMax: parseNumericParam(searchParams.get("playCountMax")),
		likeCountMin: parseNumericParam(searchParams.get("likeCountMin")),
		likeCountMax: parseNumericParam(searchParams.get("likeCountMax")),
		favoriteCountMin: parseNumericParam(searchParams.get("favoriteCountMin")),
		favoriteCountMax: parseNumericParam(searchParams.get("favoriteCountMax")),
		durationMin: parseNumericParam(searchParams.get("durationMin")),
		durationMax: parseNumericParam(searchParams.get("durationMax")),
	};
}

// Helper function to parse basic filters
function parseBasicFilters(searchParams: URLSearchParams) {
	return {
		limit: Number(searchParams.get("limit")) || 12,
		searchText: parseStringParam(searchParams.get("q")),
		tags: searchParams.get("tags")?.split(",") || undefined,
		sortBy:
			(searchParams.get("sort") as "newest" | "oldest" | "popular" | "mostPlayed") || "newest",
		sourceVideoId: parseStringParam(searchParams.get("sourceVideoId")),
		onlyPublic: true,
	};
}

// Helper function to parse date and user filters
function parseDateAndUserFilters(searchParams: URLSearchParams) {
	return {
		createdAfter: parseStringParam(searchParams.get("createdAfter")),
		createdBefore: parseStringParam(searchParams.get("createdBefore")),
		createdBy: parseStringParam(searchParams.get("createdBy")),
	};
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		const query: Partial<AudioButtonQuery> = {
			...parseBasicFilters(searchParams),
			...parseNumericRangeFilters(searchParams),
			...parseDateAndUserFilters(searchParams),
		};

		try {
			const result = await getAudioButtons(query);
			return NextResponse.json(result);
		} catch (_actionError) {
			// Return empty results instead of error for now
			const fallbackResult = {
				success: true,
				data: {
					audioButtons: [],
					hasMore: false,
					lastAudioButton: undefined,
					totalCount: undefined,
				},
			};
			return NextResponse.json(fallbackResult);
		}
	} catch (_error) {
		return NextResponse.json(
			{ success: false, error: "データの取得に失敗しました" },
			{ status: 500 },
		);
	}
}
