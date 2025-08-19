/**
 * Plain object types for AudioButton entity
 *
 * These types are used for Server/Client Component boundary in Next.js
 */

import type { FirestoreServerAudioButtonData } from "../types/firestore/audio-button";

/**
 * Computed properties for audio button business logic
 *
 * This interface can be extended in the future to add more computed properties
 * without breaking existing implementations.
 */
export interface AudioButtonComputedProperties {
	isPopular: boolean;
	engagementRate: number;
	engagementRatePercentage: number;
	popularityScore: number;
	searchableText: string;
	durationText: string;
	relativeTimeText: string;
	// Future computed properties can be added here as optional fields
	// For example:
	// trendingScore?: number;
	// viralityIndex?: number;
}

/**
 * Plain object representation of AudioButton entity for Next.js serialization
 */
export interface AudioButtonPlainObject
	extends Omit<FirestoreServerAudioButtonData, "id" | "createdAt" | "updatedAt"> {
	// ID is always required in plain objects
	id: string;
	// Override timestamp fields with string type
	createdAt: string;
	updatedAt: string;
	// Computed properties from business logic
	_computed: AudioButtonComputedProperties;
}

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
	createdBy: {
		id: string;
		name: string;
	};
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
	sourceVideoId?: string;
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
