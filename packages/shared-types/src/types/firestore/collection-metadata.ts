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
	/**
	 * SPR-229: このサイクルのティア別内訳（観測用。バッチ処理ロジックはこれに依存しない）
	 */
	tierBreakdown?: {
		newCount: number;
		volatileCount: number;
		stableDueCount: number;
		stableSkippedCount: number;
	};
	/** SPR-229: このサイクルが週次フルスイープ実行かどうか（continuation run でも維持） */
	isFullSweepCycle?: boolean;
	/**
	 * SPR-229: 週次フルスイープ中、通常runならstableとしてスキップされていたはずの作品ID一覧
	 * （取りこぼし検知用。isFullSweepCycle=trueのサイクルでのみ設定・continuation runで再利用）
	 */
	fullSweepWouldSkipWorkIds?: string[];
	/**
	 * SPR-229: 週次フルスイープの発火時に前サイクルが継続中で反映できなかった場合にtrue。
	 * 次の新規サイクル開始時（`prepareNewBatchProcessing`）にこのフラグを見て
	 * 強制フルスイープとして拾い直し、そのタイミングでクリアする（レビュー指摘対応:
	 * 継続中サイクルとの衝突で週次フルスイープがその週丸ごと無音で消えるのを防ぐ）。
	 */
	pendingFullSweep?: boolean;
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
