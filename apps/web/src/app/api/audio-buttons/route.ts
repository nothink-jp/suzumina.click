import type { AudioButtonCategory, AudioButtonQuery } from "@suzumina.click/shared-types";
import { type NextRequest, NextResponse } from "next/server";
import { getAudioButtons } from "@/app/buttons/actions";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		const categoryParam = searchParams.get("category");
		const query: Partial<AudioButtonQuery> = {
			limit: Number(searchParams.get("limit")) || 12,
			searchText: searchParams.get("q") || undefined,
			category:
				categoryParam && categoryParam !== "all"
					? (categoryParam as AudioButtonCategory)
					: undefined,
			tags: searchParams.get("tags") ? searchParams.get("tags")?.split(",") : undefined,
			sortBy:
				(searchParams.get("sort") as "newest" | "oldest" | "popular" | "mostPlayed") || "newest",
			sourceVideoId: searchParams.get("sourceVideoId") || undefined,
			onlyPublic: true,
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
