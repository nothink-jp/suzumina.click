/**
 * Plain object types for Video entity
 *
 * These types are used for Server/Client Component boundary in Next.js
 */

import type { FirestoreServerVideoData } from "../types/firestore/video";

/**
 * Computed properties for video business logic
 */
export interface VideoComputedProperties {
	isArchived: boolean;
	isPremiere: boolean;
	isLive: boolean;
	isUpcoming: boolean;
	canCreateButton: boolean;
	videoType: "normal" | "archived" | "premiere" | "live" | "upcoming";
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

/**
 * Frontend video data type - Plain object for Server/Client Component boundary
 * @deprecated Use VideoPlainObject instead
 */
export type FrontendVideo = VideoPlainObject;
