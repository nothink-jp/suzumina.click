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
	videoId?: string;
}
