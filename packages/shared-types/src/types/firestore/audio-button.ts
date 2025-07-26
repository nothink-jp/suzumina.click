/**
 * Firestore AudioButton Data Types
 *
 * This file contains Firestore-specific type definitions for AudioButton entity.
 * Separated from entity file to avoid circular dependencies.
 */

/**
 * Firestore server audio button data type
 * This type represents the structure of audio button data stored in Firestore
 */
export interface FirestoreServerAudioButtonData {
	id?: string;
	title: string;
	description?: string;
	tags: string[];
	sourceVideoId: string;
	sourceVideoTitle?: string;
	sourceVideoThumbnailUrl?: string;
	startTime: number;
	endTime?: number;
	createdBy: string;
	createdByName: string;
	isPublic: boolean;
	playCount: number;
	likeCount: number;
	dislikeCount?: number;
	favoriteCount?: number;
	createdAt: unknown; // Firestore Timestamp
	updatedAt: unknown; // Firestore Timestamp
}

// Alias for backward compatibility
export type FirestoreAudioButtonData = FirestoreServerAudioButtonData;
