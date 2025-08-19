/**
 * AudioButton query types for local use
 */

/**
 * Query parameters for filtering AudioButtons
 */
export interface AudioButtonQuery {
	search?: string;
	tags?: string[];
	sortBy?: "newest" | "oldest" | "popular" | "mostPlayed";
	page?: number;
	limit?: number;
	sourceVideoId?: string;
	onlyPublic?: boolean;
	includeTotalCount?: boolean;
	// Advanced filters
	playCountMin?: number;
	playCountMax?: number;
	likeCountMin?: number;
	likeCountMax?: number;
	favoriteCountMin?: number;
	favoriteCountMax?: number;
	createdAfter?: string;
	createdBefore?: string;
	createdBy?: string;
	durationMin?: number;
	durationMax?: number;
}
