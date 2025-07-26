/**
 * Type aliases for cleaner, more concise naming conventions
 *
 * This module provides simplified names for commonly used types
 * while maintaining backward compatibility with existing code.
 */

import type { DLsiteRawApiResponse } from "../api-schemas/dlsite-raw";
// Import existing types
import type { OptimizedFirestoreDLsiteWorkData } from "../entities/work";
import type { FirestoreWorkEvaluation } from "../entities/work-evaluation";

// Legacy types are now exported directly from entities

// Note: Some types are not yet defined in the codebase
// They will be added as part of the Entity/Value Object migration
// For now, we'll create placeholder types to demonstrate the aliasing system

// ===== Entity Aliases =====

/**
 * Simplified alias for DLsite work data
 * @alias OptimizedFirestoreDLsiteWorkData
 */
export type Work = OptimizedFirestoreDLsiteWorkData;

/**
 * Simplified alias for user document
 * @alias FirestoreUserDocument (to be implemented)
 */
// biome-ignore lint/suspicious/noExplicitAny: Placeholder type - will be replaced with FirestoreUserDocument in future PR
export type User = any; // TODO: Replace with FirestoreUserDocument when available

/**
 * Simplified alias for video document
 * @alias FirestoreVideoDocument (to be implemented)
 */
// biome-ignore lint/suspicious/noExplicitAny: Placeholder type - will be replaced with FirestoreVideoDocument in future PR
export type VideoDoc = any; // TODO: Replace with FirestoreVideoDocument when available

// AudioButton is now exported from entities/audio-button

/**
 * Simplified alias for work evaluation
 * @alias FirestoreWorkEvaluation
 */
export type WorkEvaluation = FirestoreWorkEvaluation;

/**
 * Simplified alias for circle/creator info
 * @alias CircleCreatorInfoData (to be implemented)
 */
// biome-ignore lint/suspicious/noExplicitAny: Placeholder type - will be replaced with CircleCreatorInfoData in future PR
export type CircleCreator = any; // TODO: Replace with CircleCreatorInfoData when available

// ===== API Aliases =====

/**
 * Simplified alias for DLsite API response
 * @alias DLsiteRawApiResponse
 */
export type DLsiteApiResponse = DLsiteRawApiResponse;

// ===== Metadata Aliases =====

/**
 * Simplified alias for collection metadata
 * @alias UnifiedDataCollectionMetadata (to be implemented)
 */
// biome-ignore lint/suspicious/noExplicitAny: Placeholder type - will be replaced with UnifiedDataCollectionMetadata in future PR
export type CollectionMetadata = any; // TODO: Replace with UnifiedDataCollectionMetadata when available

/**
 * Simplified alias for Firestore timestamp
 * @alias FirestoreFieldTimestamp (to be implemented)
 */
// biome-ignore lint/suspicious/noExplicitAny: Placeholder type - will be replaced with FirestoreFieldTimestamp in future PR
export type FirestoreTimestamp = any; // TODO: Replace with FirestoreFieldTimestamp when available

/**
 * Simplified alias for price history entry
 * @alias PriceHistoryEntryData (to be implemented)
 */
// biome-ignore lint/suspicious/noExplicitAny: Placeholder type - will be replaced with PriceHistoryEntryData in future PR
export type PriceHistory = any; // TODO: Replace with PriceHistoryEntryData when available

/**
 * Simplified alias for video tag association
 * @alias VideoTagAssociationData (to be implemented)
 */
// biome-ignore lint/suspicious/noExplicitAny: Placeholder type - will be replaced with VideoTagAssociationData in future PR
export type VideoTag = any; // TODO: Replace with VideoTagAssociationData when available

// ===== Type Guards =====

/**
 * Type guard to check if a value is a Work
 */
export function isWork(value: unknown): value is Work {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		"title" in value &&
		"circleId" in value
	);
}

/**
 * Type guard to check if a value is a User
 */
export function isUser(value: unknown): value is User {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		"email" in value &&
		"role" in value
	);
}

/**
 * Type guard to check if a value is a VideoDoc
 */
export function isVideoDoc(value: unknown): value is VideoDoc {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		"title" in value &&
		"channelId" in value
	);
}

// Re-export isAudioButton from entities
export { isAudioButton } from "../entities/audio-button";
