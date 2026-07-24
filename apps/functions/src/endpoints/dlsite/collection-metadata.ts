/**
 * DLsite 統合データ収集: run metadata と継続 cursor のライフサイクル
 *
 * メタデータ doc（dlsiteMetadata/unified_data_collection_metadata）の取得/更新と、
 * 継続 cursor（batchProcessingMode/currentBatch/allWorkIds）の読み取り・初期化・完了クリアを担う。
 * バッチループ中の cursor 逐次更新はオーケストレータ（run-unified-data-collection.ts）が行う。
 */

import type { CollectionMetadata } from "@suzumina.click/shared-types";
import { Timestamp } from "../../infrastructure/database/firestore";
import { withClearedUndefined } from "../../shared/firestore-write";
import * as logger from "../../shared/logger";
import { createRunMetadataStore } from "../../shared/run-metadata";
import { BATCH_SIZE, MAX_EXECUTION_TIME } from "./process-batch";

// 統合メタデータ保存用の定数
const UNIFIED_METADATA_DOC_ID = "unified_data_collection_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

/**
 * 統合データ収集メタデータのストア（SPR-231: 骨格は shared/run-metadata に集約）
 *
 * update 時は undefined フィールドを FieldValue.delete() へ変換してから書き込む。
 * ignoreUndefinedProperties 環境では undefined がスキップされ旧値が残る（sticky）ため、
 * メタデータをクリア可能にする（`withClearedUndefined` 参照）。
 */
const unifiedMetadataStore = createRunMetadataStore<CollectionMetadata>({
	collection: METADATA_COLLECTION,
	docId: UNIFIED_METADATA_DOC_ID,
	createInitial: () => ({
		lastFetchedAt: Timestamp.now(),
		isInProgress: false,
		unifiedSystemStarted: Timestamp.now(),
		migrationVersion: "v2",
	}),
	sanitizeUpdate: withClearedUndefined,
});

/**
 * 統合データ収集メタデータの取得または初期化
 */
export async function getOrCreateUnifiedMetadata(): Promise<CollectionMetadata> {
	return unifiedMetadataStore.getOrCreate();
}

/**
 * 統合データ収集メタデータの更新
 */
export async function updateUnifiedMetadata(update: Partial<CollectionMetadata>): Promise<void> {
	await unifiedMetadataStore.update(update);
}

/**
 * バッチ処理の継続情報を取得
 */
export function getContinuationInfo(
	metadata: CollectionMetadata,
): { isContinuation: true; allWorkIds: string[]; startBatch: number } | { isContinuation: false } {
	if (
		metadata.batchProcessingMode &&
		metadata.allWorkIds &&
		metadata.currentBatch !== undefined &&
		metadata.totalBatches !== undefined
	) {
		// currentBatchがtotalBatchesに達している場合は新規処理として扱う
		if ((metadata.currentBatch ?? 0) >= metadata.totalBatches) {
			logger.info("前回の処理は完了済み。新規処理として開始します", {
				currentBatch: metadata.currentBatch,
				totalBatches: metadata.totalBatches,
			});
			return { isContinuation: false as const };
		}

		logger.info("バッチ処理を継続します", {
			currentBatch: metadata.currentBatch,
			totalBatches: metadata.totalBatches,
			allWorkIdsLength: metadata.allWorkIds?.length || 0,
		});

		return {
			isContinuation: true as const,
			allWorkIds: metadata.allWorkIds,
			startBatch: metadata.currentBatch,
		};
	}

	return { isContinuation: false as const };
}

/**
 * 新規バッチ処理を初期化
 *
 * @param tierBreakdown SPR-229: このサイクルのティア別内訳（観測用。省略時=ティアリング無効）
 * @param isFullSweepCycle SPR-229: 週次フルスイープ実行かどうか
 * @param fullSweepWouldSkipWorkIds SPR-229: 週次フルスイープ時、通常runならスキップされていた作品ID（取りこぼし検知用）
 */
export async function initializeNewBatchProcessing(
	allWorkIds: string[],
	batches: string[][],
	tierBreakdown?: CollectionMetadata["tierBreakdown"],
	isFullSweepCycle = false,
	fullSweepWouldSkipWorkIds?: string[],
): Promise<void> {
	logger.info(
		`新規バッチ処理開始: 総作品数=${allWorkIds.length}, バッチ数=${batches.length}, バッチサイズ=${BATCH_SIZE}`,
	);
	logger.info(
		`処理時間制限: ${MAX_EXECUTION_TIME / 1000}秒, 予想処理時間: ${batches.length * 30}秒（30秒/バッチ）`,
	);

	await updateUnifiedMetadata({
		isInProgress: true,
		batchProcessingMode: true,
		allWorkIds,
		totalBatches: batches.length,
		currentBatch: 0,
		totalWorks: allWorkIds.length,
		processedWorks: 0,
		basicDataUpdated: 0,
		completedBatches: [],
		lastError: undefined,
		currentBatchStartTime: Timestamp.now(),
		migrationVersion: "v2",
		tierBreakdown,
		isFullSweepCycle,
		fullSweepWouldSkipWorkIds: isFullSweepCycle ? fullSweepWouldSkipWorkIds : undefined,
		// SPR-229: 新規サイクル開始時点で pending 状態は解消済み（effectiveFullSweep に
		// 反映済み、または今回対象外）のため必ずクリアする。
		pendingFullSweep: undefined,
	});
}

/**
 * 処理完了時のメタデータ更新
 */
export async function finalizeCompletedProcessing(
	allWorkIds: string[],
	totalUpdated: number,
): Promise<void> {
	logger.info("全バッチ処理完了", {
		totalWorks: allWorkIds.length,
		totalUpdated,
	});

	await updateUnifiedMetadata({
		isInProgress: false,
		lastSuccessfulCompleteFetch: Timestamp.now(),
		lastFetchedAt: Timestamp.now(),
		batchProcessingMode: false,
		currentBatch: undefined,
		totalBatches: undefined,
		allWorkIds: undefined,
		completedBatches: undefined,
		// SPR-229: サイクル終了時にティア/週次フルスイープ関連の一時フィールドをクリアする
		tierBreakdown: undefined,
		isFullSweepCycle: undefined,
		fullSweepWouldSkipWorkIds: undefined,
	});
}
