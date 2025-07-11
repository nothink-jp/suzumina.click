/**
 * Firestore インフラストラクチャ ユーティリティ
 *
 * Firestore固有のバッチ処理・データベース操作ロジックを統合
 * インフラストラクチャ層のため infrastructure/database に配置
 */

import type { WriteBatch } from "@google-cloud/firestore";
import { chunkArray } from "../../shared/array-utils";
import * as logger from "../../shared/logger";
import firestore from "./firestore";

/**
 * バッチ処理オプション
 */
export interface BatchProcessingOptions {
	/** バッチサイズ（デフォルト: 500） */
	batchSize?: number;
	/** 処理間隔（ms）（デフォルト: 100） */
	delayBetweenBatches?: number;
	/** 詳細ログ出力（デフォルト: false） */
	enableDetailedLogging?: boolean;
	/** 失敗時の継続処理（デフォルト: true） */
	continueOnFailure?: boolean;
}

/**
 * バッチ処理結果
 */
export interface BatchProcessingResult {
	totalItems: number;
	successfulItems: number;
	failedItems: number;
	successfulBatches: number;
	failedBatches: number;
	errors: Error[];
}

/**
 * Firestoreバッチ操作を実行（簡略化版）
 *
 * @param items - 処理対象のアイテム配列
 * @param operation - 各アイテムに対する操作関数
 * @param options - バッチ処理オプション
 * @returns バッチ処理結果
 */
export async function executeBatchOperation<T>(
	items: T[],
	operation: (batch: WriteBatch, item: T) => void,
	options: BatchProcessingOptions = {},
): Promise<BatchProcessingResult> {
	const {
		batchSize = 500,
		delayBetweenBatches = 100,
		enableDetailedLogging = false,
		continueOnFailure = true,
	} = options;

	if (items.length === 0) {
		return createEmptyResult();
	}

	const result = createInitialResult(items.length);
	const effectiveBatchSize = Math.min(batchSize, 500);
	const chunks = chunkArray(items, effectiveBatchSize);

	if (enableDetailedLogging) {
		logger.info(`🔄 Firestoreバッチ処理開始: ${items.length}件を${chunks.length}チャンクで処理`);
	}

	for (const [chunkIndex, chunk] of chunks.entries()) {
		const chunkResult = await processChunk(
			chunk,
			operation,
			chunkIndex,
			chunks.length,
			enableDetailedLogging,
		);

		mergeChunkResult(result, chunkResult);

		if (!chunkResult.success && !continueOnFailure) {
			break;
		}

		if (chunkIndex < chunks.length - 1 && delayBetweenBatches > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
		}
	}

	result.successfulItems = result.totalItems - result.failedItems;
	logSummary(result, enableDetailedLogging);

	return result;
}

/**
 * 空の結果を作成
 */
function createEmptyResult(): BatchProcessingResult {
	return {
		totalItems: 0,
		successfulItems: 0,
		failedItems: 0,
		successfulBatches: 0,
		failedBatches: 0,
		errors: [],
	};
}

/**
 * 初期結果を作成
 */
function createInitialResult(totalItems: number): BatchProcessingResult {
	return {
		totalItems,
		successfulItems: 0,
		failedItems: 0,
		successfulBatches: 0,
		failedBatches: 0,
		errors: [],
	};
}

/**
 * 単一チャンクを処理
 */
async function processChunk<T>(
	chunk: T[],
	operation: (batch: WriteBatch, item: T) => void,
	chunkIndex: number,
	totalChunks: number,
	enableDetailedLogging: boolean,
): Promise<{ success: boolean; failedItems: number; errors: Error[] }> {
	const batch = firestore.batch();
	const operationResult = addOperationsToBatch(
		batch,
		chunk,
		operation,
		chunkIndex,
		enableDetailedLogging,
	);

	return await executeBatch(
		batch,
		chunk,
		chunkIndex,
		totalChunks,
		operationResult,
		enableDetailedLogging,
	);
}

/**
 * バッチに操作を追加
 */
function addOperationsToBatch<T>(
	batch: WriteBatch,
	chunk: T[],
	operation: (batch: WriteBatch, item: T) => void,
	chunkIndex: number,
	enableDetailedLogging: boolean,
): { failedItems: number; errors: Error[] } {
	const chunkErrors: Error[] = [];
	let failedItems = 0;

	for (const item of chunk) {
		try {
			operation(batch, item);
		} catch (operationError) {
			if (operationError instanceof Error) {
				chunkErrors.push(operationError);
			}
			failedItems++;

			if (enableDetailedLogging) {
				logger.warn(`アイテム操作エラー (チャンク ${chunkIndex + 1}):`, { error: operationError });
			}
		}
	}

	return { failedItems, errors: chunkErrors };
}

/**
 * バッチを実行
 */
async function executeBatch<T>(
	batch: WriteBatch,
	chunk: T[],
	chunkIndex: number,
	totalChunks: number,
	operationResult: { failedItems: number; errors: Error[] },
	enableDetailedLogging: boolean,
): Promise<{ success: boolean; failedItems: number; errors: Error[] }> {
	try {
		await batch.commit();

		if (enableDetailedLogging) {
			logger.debug(`✅ チャンク ${chunkIndex + 1}/${totalChunks} 完了: ${chunk.length}件`);
		}

		return {
			success: true,
			failedItems: operationResult.failedItems,
			errors: operationResult.errors,
		};
	} catch (batchError) {
		const error = batchError instanceof Error ? batchError : new Error(String(batchError));
		const errorMessage = `バッチ ${chunkIndex + 1}/${totalChunks} 実行エラー: ${error.message}`;

		if (enableDetailedLogging) {
			logger.error(errorMessage, { chunkIndex: chunkIndex + 1, chunkSize: chunk.length, error });
		} else {
			logger.error(errorMessage);
		}

		return {
			success: false,
			failedItems: chunk.length,
			errors: [error, ...operationResult.errors],
		};
	}
}

/**
 * チャンク結果をマージ
 */
function mergeChunkResult(
	result: BatchProcessingResult,
	chunkResult: { success: boolean; failedItems: number; errors: Error[] },
): void {
	result.failedItems += chunkResult.failedItems;
	result.errors.push(...chunkResult.errors);

	if (chunkResult.success) {
		result.successfulBatches++;
	} else {
		result.failedBatches++;
	}
}

/**
 * 処理結果のサマリーをログ出力
 */
function logSummary(result: BatchProcessingResult, enableDetailedLogging: boolean): void {
	const successRate =
		result.totalItems > 0 ? ((result.successfulItems / result.totalItems) * 100).toFixed(1) : "0";
	const summaryMessage = `🎯 Firestoreバッチ処理完了: ${result.successfulItems}/${result.totalItems}件成功 (成功率${successRate}%)`;

	if (result.errors.length > 0) {
		logger.warn(`${summaryMessage} - エラー${result.errors.length}件`);
	} else if (enableDetailedLogging) {
		logger.info(summaryMessage);
	}
}

/**
 * 単一バッチでFirestore操作を実行（500件制限対応）
 *
 * @param operations - バッチ操作関数の配列
 * @returns 実行結果
 */
export async function executeSingleBatch(
	operations: ((batch: WriteBatch) => void)[],
): Promise<void> {
	if (operations.length === 0) {
		return;
	}

	if (operations.length > 500) {
		throw new Error(`バッチ操作数が制限を超えています: ${operations.length}/500`);
	}

	const batch = firestore.batch();

	for (const operation of operations) {
		operation(batch);
	}

	await batch.commit();
}
