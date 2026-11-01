/**
 * Plain object types for Video entity
 *
 * These types are used for Server/Client Component boundary in Next.js
 */

import type { FirestoreServerVideoData, VideoType } from "../types/firestore/video";

/**
 * Video list result for paginated queries
 */
export interface VideoListResult {
	items: VideoPlainObject[];
	videos: VideoPlainObject[]; // Alias for backward compatibility
	total: number;
	page: number;
	pageSize: number;
}

/**
 * Computed properties for video business logic
 */
export interface VideoComputedProperties {
	isArchived: boolean;
	isPremiere: boolean;
	/** videoType が live / possibly_live（isLiveVideoType）。liveBroadcastContent は見ない */
	isLive: boolean;
	/** videoType が upcoming。liveBroadcastContent は見ない */
	isUpcoming: boolean;
	canCreateButton: boolean;
	/** 正本は operations/video-type.ts の determineVideoType（読み取り時に毎回算出） */
	videoType: VideoType;
	thumbnailUrl: string;
	youtubeUrl: string;
}

/**
 * Plain object representation of Video entity for Next.js serialization
 */
export interface VideoPlainObject
	extends Omit<FirestoreServerVideoData, "publishedAt" | "lastFetchedAt" | "liveStreamingDetails"> {
	// Override timestamp fields with string type
	publishedAt: string;
	lastFetchedAt: string;
	// Override liveStreamingDetails with string timestamps
	liveStreamingDetails?: {
		scheduledStartTime?: string;
		scheduledEndTime?: string;
		actualStartTime?: string;
		actualEndTime?: string;
		concurrentViewers?: number;
	};
	// Computed properties from business logic
	_computed: VideoComputedProperties;
}
