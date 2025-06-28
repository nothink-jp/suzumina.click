import type { AudioButtonQuery } from "@suzumina.click/shared-types";
import { type NextRequest, NextResponse } from "next/server";
import { getAudioButtons } from "@/app/buttons/actions";

export async function GET(request: NextRequest) {
	try {
		console.log("[API] Audio buttons request received");
		const { searchParams } = new URL(request.url);

		const query: Partial<AudioButtonQuery> = {
			limit: Number(searchParams.get("limit")) || 12,
			searchText: searchParams.get("q") || undefined,
			category: (searchParams.get("category") as any) || undefined,
			tags: searchParams.get("tags") ? searchParams.get("tags")!.split(",") : undefined,
			sortBy: (searchParams.get("sort") as any) || "newest",
			sourceVideoId: searchParams.get("sourceVideoId") || undefined,
			onlyPublic: true,
		};

		console.log("[API] Query built:", query);

		try {
			const result = await getAudioButtons(query);
			console.log("[API] Result from getAudioButtons:", result);
			return NextResponse.json(result);
		} catch (actionError) {
			console.error("[API] Error in getAudioButtons:", actionError);
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
	} catch (error) {
		console.error("[API] Error in audio-buttons API route:", error);
		return NextResponse.json(
			{ success: false, error: "データの取得に失敗しました" },
			{ status: 500 },
		);
	}
}
