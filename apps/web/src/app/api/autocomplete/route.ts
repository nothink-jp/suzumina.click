import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirestore } from "@/lib/firestore";

const AutocompleteQuerySchema = z.object({
	q: z.string().min(1).max(100),
	limit: z.coerce.number().min(1).max(20).default(8),
});

export interface AutocompleteSuggestion {
	id: string;
	text: string;
	type: "tag" | "title" | "video" | "work";
	category?: string;
	icon?: string;
	count?: number;
}

// Popular tags with icons (extending existing system)
const POPULAR_TAGS = [
	{ name: "挨拶", icon: "👋", category: "基本" },
	{ name: "応援", icon: "📣", category: "感情" },
	{ name: "感謝", icon: "🙏", category: "感情" },
	{ name: "日常", icon: "🌙", category: "生活" },
	{ name: "ゲーム", icon: "🎮", category: "趣味" },
	{ name: "歌", icon: "🎵", category: "音楽" },
	{ name: "雑談", icon: "💬", category: "会話" },
];

async function getTagSuggestions(
	firestore: FirebaseFirestore.Firestore,
	query: string,
	limit: number,
): Promise<AutocompleteSuggestion[]> {
	try {
		// First check popular tags for exact/partial matches
		const popularMatches = POPULAR_TAGS.filter((tag) =>
			tag.name.toLowerCase().includes(query.toLowerCase()),
		).map((tag) => ({
			id: `popular-tag-${tag.name}`,
			text: tag.name,
			type: "tag" as const,
			category: tag.category,
			icon: tag.icon,
			count: 999, // High priority for popular tags
		}));

		// Get dynamic tags from recent audio buttons
		const audioButtonsRef = firestore.collection("audioButtons");
		const recentButtonsSnapshot = await audioButtonsRef
			.where("isPublic", "==", true)
			.orderBy("createdAt", "desc")
			.limit(500)
			.get();

		const tagCounts = new Map<string, number>();

		recentButtonsSnapshot.docs.forEach((doc) => {
			const data = doc.data();
			if (data.tags && Array.isArray(data.tags)) {
				data.tags.forEach((tag: string) => {
					if (tag.toLowerCase().includes(query.toLowerCase())) {
						tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
					}
				});
			}
		});

		// Convert to suggestions and sort by frequency
		const dynamicTagSuggestions: AutocompleteSuggestion[] = Array.from(tagCounts.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, limit - popularMatches.length)
			.map(([tag, count]) => ({
				id: `dynamic-tag-${tag}`,
				text: tag,
				type: "tag" as const,
				count,
			}));

		// Combine and deduplicate
		const allSuggestions = [...popularMatches, ...dynamicTagSuggestions];
		const uniqueSuggestions = allSuggestions.filter(
			(suggestion, index, self) => index === self.findIndex((s) => s.text === suggestion.text),
		);

		return uniqueSuggestions.slice(0, limit);
	} catch (_error) {
		return [];
	}
}

async function getTitleSuggestions(
	firestore: FirebaseFirestore.Firestore,
	query: string,
	limit: number,
): Promise<AutocompleteSuggestion[]> {
	try {
		// Get audio button titles
		const audioButtonsRef = firestore.collection("audioButtons");
		const audioButtonsSnapshot = await audioButtonsRef
			.where("isPublic", "==", true)
			.orderBy("playCount", "desc")
			.limit(200)
			.get();

		const titleSuggestions: AutocompleteSuggestion[] = [];

		audioButtonsSnapshot.docs.forEach((doc) => {
			const data = doc.data();
			if (data.title?.toLowerCase().includes(query.toLowerCase())) {
				titleSuggestions.push({
					id: `audio-title-${doc.id}`,
					text: data.title,
					type: "title",
					count: data.playCount || 0,
				});
			}
		});

		// Sort by play count and return top results
		return titleSuggestions
			.sort((a, b) => (b.count || 0) - (a.count || 0))
			.slice(0, Math.floor(limit / 2));
	} catch (_error) {
		return [];
	}
}

async function getVideoSuggestions(
	firestore: FirebaseFirestore.Firestore,
	query: string,
	limit: number,
): Promise<AutocompleteSuggestion[]> {
	try {
		const videosRef = firestore.collection("videos");
		const videosSnapshot = await videosRef.orderBy("publishedAt", "desc").limit(100).get();

		const videoSuggestions: AutocompleteSuggestion[] = [];

		videosSnapshot.docs.forEach((doc) => {
			const data = doc.data();
			if (data.title?.toLowerCase().includes(query.toLowerCase())) {
				videoSuggestions.push({
					id: `video-title-${doc.id}`,
					text: data.title,
					type: "video",
					icon: "📹",
				});
			}
		});

		return videoSuggestions.slice(0, Math.floor(limit / 4));
	} catch (_error) {
		return [];
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const parseResult = AutocompleteQuerySchema.safeParse({
			q: searchParams.get("q"),
			limit: searchParams.get("limit"),
		});

		if (!parseResult.success) {
			return NextResponse.json(
				{ error: "Invalid query parameters", details: parseResult.error.errors },
				{ status: 400 },
			);
		}

		const { q: query, limit } = parseResult.data;

		// Early return for very short queries
		if (query.length < 2) {
			return NextResponse.json({ suggestions: [] });
		}

		const firestore = getFirestore();

		// Get suggestions from different sources in parallel
		const [tagSuggestions, titleSuggestions, videoSuggestions] = await Promise.all([
			getTagSuggestions(firestore, query, Math.ceil(limit * 0.6)), // 60% tags
			getTitleSuggestions(firestore, query, Math.ceil(limit * 0.3)), // 30% titles
			getVideoSuggestions(firestore, query, Math.ceil(limit * 0.1)), // 10% videos
		]);

		// Combine all suggestions and prioritize by type and relevance
		const allSuggestions = [...tagSuggestions, ...titleSuggestions, ...videoSuggestions];

		// Sort by priority: popular tags > high count items > recent items
		const sortedSuggestions = allSuggestions
			.sort((a, b) => {
				// Popular tags first
				if (a.count === 999 && b.count !== 999) return -1;
				if (b.count === 999 && a.count !== 999) return 1;

				// Then by type priority: tag > title > video > work
				const typePriority = { tag: 3, title: 2, video: 1, work: 1 };
				const aPriority = typePriority[a.type] || 0;
				const bPriority = typePriority[b.type] || 0;

				if (aPriority !== bPriority) return bPriority - aPriority;

				// Finally by count
				return (b.count || 0) - (a.count || 0);
			})
			.slice(0, limit);

		return NextResponse.json({
			suggestions: sortedSuggestions,
			meta: {
				query,
				total: sortedSuggestions.length,
				sources: {
					tags: tagSuggestions.length,
					titles: titleSuggestions.length,
					videos: videoSuggestions.length,
				},
			},
		});
	} catch (_error) {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
