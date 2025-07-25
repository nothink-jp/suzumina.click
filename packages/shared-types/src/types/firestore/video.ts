/**
 * Firestore Video Data Types
 *
 * This file contains Firestore-specific type definitions for Video entity.
 * Separated from entity file to avoid circular dependencies.
 */

/**
 * Live broadcast content type
 */
export type LiveBroadcastContent = "none" | "live" | "upcoming";

/**
 * Video type classification
 */
export type VideoType = "normal" | "archived" | "premiere";

/**
 * Firestore server video data type
 * This type represents the structure of video data stored in Firestore
 */
export interface FirestoreServerVideoData {
	id?: string;
	videoId: string;
	title: string;
	description: string;
	channelId: string;
	channelTitle: string;
	publishedAt: unknown; // Firestore Timestamp
	thumbnailUrl: string;
	lastFetchedAt: unknown; // Firestore Timestamp
	videoType?: VideoType;
	liveBroadcastContent?: LiveBroadcastContent;

	// Audio button info
	audioButtonCount?: number;
	hasAudioButtons?: boolean;

	// Content details
	duration?: string;
	categoryId?: string;
	tags?: string[];
	playlistTags?: string[];
	userTags?: string[];

	// Statistics
	statistics?: {
		viewCount?: number;
		likeCount?: number;
		dislikeCount?: number;
		favoriteCount?: number;
		commentCount?: number;
	};

	// Live streaming details
	liveStreamingDetails?: {
		scheduledStartTime?: unknown; // Firestore Timestamp
		scheduledEndTime?: unknown; // Firestore Timestamp
		actualStartTime?: unknown; // Firestore Timestamp
		actualEndTime?: unknown; // Firestore Timestamp
		concurrentViewers?: number;
	};

	// Video quality details
	dimension?: string;
	definition?: string;
	caption?: string | boolean; // Can be either string or boolean for compatibility
	licensedContent?: boolean;

	// Video status
	status?: {
		privacyStatus?: string;
		uploadStatus?: string;
		embeddable?: boolean;
		publicStatsViewable?: boolean;
		madeForKids?: boolean;
		selfDeclaredMadeForKids?: boolean;
		commentStatus?: string;
	};

	// Player embed
	player?: {
		embedHtml?: string;
		embedWidth?: number;
		embedHeight?: number;
	};

	// Topic details
	topicDetails?: {
		topicCategories?: string[];
	};

	// Recording details
	recordingDetails?: {
		location?: string;
		locationDescription?: string;
		recordingDate?: string;
	};

	// Region restriction
	regionRestriction?: {
		allowed?: string[];
		blocked?: string[];
	};

	// Content rating
	contentRating?: Record<string, unknown>;
}

// Alias for backward compatibility
export type FirestoreVideoData = FirestoreServerVideoData;
