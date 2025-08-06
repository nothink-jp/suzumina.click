/**
 * Type aliases for cleaner, more concise naming conventions
 *
 * This module provides simplified names for commonly used types
 * while maintaining backward compatibility with existing code.
 */

// Import existing types
import type { WorkDocument } from "../entities/work";
import type { FirestoreWorkEvaluation } from "../entities/work-evaluation";

// Legacy types are now exported directly from entities

// Note: Some types are not yet defined in the codebase
// They will be added as part of the Entity/Value Object migration
// For now, we'll create placeholder types to demonstrate the aliasing system

// ===== Entity Aliases =====

/**
 * Simplified alias for DLsite work data
 * @alias WorkDocument
 */
export type WorkDoc = WorkDocument;

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

// DLsiteApiResponse is now exported directly from api-schemas/dlsite-raw

// ===== Metadata Aliases =====

// CollectionMetadata is now exported directly from types/firestore/collection-metadata

// FirestoreTimestamp is kept as 'unknown' to avoid Firebase dependencies in shared-types
// In Cloud Functions, cast to Timestamp from firebase-admin/firestore as needed

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
 * Type guard to check if a value is a WorkDoc
 */
export function isWorkDoc(value: unknown): value is WorkDoc {
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
