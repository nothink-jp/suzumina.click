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
	extends Omit<FirestoreServerAudioButtonData, "createdAt" | "updatedAt"> {
	// Override timestamp fields with string type
	createdAt: string;
	updatedAt: string;
	// Computed properties from business logic
	_computed: AudioButtonComputedProperties;
}

/**
 * Frontend audio button data type - Plain object for Server/Client Component boundary
 * @deprecated Use AudioButtonPlainObject instead
 */
export type FrontendAudioButton = AudioButtonPlainObject;
