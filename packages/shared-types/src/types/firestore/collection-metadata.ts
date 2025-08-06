/**
 * Collection metadata for unified data collection processes
 *
 * This type represents metadata for tracking the progress and state
 * of large-scale data collection operations.
 */

// Note: In Cloud Functions, use Timestamp from firebase-admin/firestore
// Here we use unknown for Firestore timestamp fields

/**
 * Metadata for tracking unified data collection progress
 * Previously named UnifiedDataCollectionMetadata
 */
export interface CollectionMetadata {
	lastFetchedAt: unknown; // Firestore.Timestamp
	currentBatch?: number;
	totalBatches?: number;
	currentBatchStartTime?: unknown; // Firestore.Timestamp
	isInProgress: boolean;
	lastError?: string;
	lastSuccessfulCompleteFetch?: unknown; // Firestore.Timestamp
	totalWorks?: number;
	processedWorks?: number;
	basicDataUpdated?: number;
	unifiedSystemStarted?: unknown; // Firestore.Timestamp
	batchProcessingMode?: boolean;
	allWorkIds?: string[];
	completedBatches?: number[];
	// Additional fields
	migrationVersion?: string;
}

/**
 * Type guard for CollectionMetadata
 */
export function isCollectionMetadata(value: unknown): value is CollectionMetadata {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return "lastFetchedAt" in obj && "isInProgress" in obj && typeof obj.isInProgress === "boolean";
}
