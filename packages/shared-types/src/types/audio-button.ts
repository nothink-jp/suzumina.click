/**
 * AudioButton Type Definitions
 *
 * Separates persistent data (AudioButtonDocument) from
 * application model (AudioButton with computed properties)
 */

/**
 * Firestore document structure - persistent data only
 */
export interface AudioButtonDocument {
	buttonText: string; // What the button displays
	description?: string; // Optional description
	videoId: string; // YouTube video ID
	videoTitle: string; // Video title for reference
	videoThumbnailUrl?: string;
	startTime: number; // Start time in seconds
	endTime: number; // End time in seconds
	duration: number; // Pre-calculated duration
	tags: string[]; // Tags for categorization
	creatorId: string; // User who created it
	creatorName: string; // Display name of creator
	isPublic: boolean; // Visibility setting
	stats: {
		// Grouped statistics
		playCount: number;
		likeCount: number;
		dislikeCount: number;
		favoriteCount: number;
		engagementRate: number; // Pre-calculated
	};
	createdAt: string; // ISO timestamp
	updatedAt: string; // ISO timestamp
}

/**
 * Computed properties that are calculated at runtime
 */
export interface AudioButtonComputedProperties {
	isPopular: boolean;
	engagementRate: number;
	engagementRatePercentage: number;
	popularityScore: number;
	searchableText: string;
	durationText: string;
	relativeTimeText: string;
}

/**
 * Complete AudioButton model for application use
 * Includes both persistent data and computed properties
 */
export interface AudioButton extends AudioButtonDocument {
	id: string;
	_computed: AudioButtonComputedProperties;
}

/**
 * Legacy type alias for backward compatibility during migration
 * @deprecated Use AudioButtonDocument instead
 */
export type FirestoreServerAudioButtonData = AudioButtonDocument & { id?: string };

/**
 * Input type for creating a new AudioButton
 */
export interface CreateAudioButtonInput {
	buttonText: string;
	startTime: number;
	endTime: number;
	videoId: string;
	videoTitle: string;
	tags?: string[];
	isPublic?: boolean;
}

/**
 * Input type for updating an existing AudioButton
 */
export interface UpdateAudioButtonInput {
	buttonText?: string;
	startTime?: number;
	endTime?: number;
	tags?: string[];
	isPublic?: boolean;
}

/**
 * Query parameters for filtering AudioButtons
 */
export interface AudioButtonQuery {
	search?: string;
	tags?: string[];
	sortBy?: "newest" | "oldest" | "popular" | "engagement";
	page?: number;
	limit?: number;
	videoId?: string;
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
}

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use AudioButton instead
 */
export type AudioButtonPlainObject = AudioButton;
