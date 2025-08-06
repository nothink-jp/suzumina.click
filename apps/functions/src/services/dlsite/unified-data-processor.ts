/**
 * DLsite統合データ処理
 *
 * 1つのAPIデータから全ての関連データを統合的に更新
 * Work、Circle、Creator、価格履歴の更新を一元管理
 */

import type { DLsiteApiResponse, WorkDocument } from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";
import { WorkMapper } from "../mappers/work-mapper";
import { savePriceHistory } from "../price-history";
import { updateCircleWithWork } from "./circle-firestore";
import { updateCreatorWorkMapping } from "./creator-firestore";
import { getWorkFromFirestore, saveWorksToFirestore } from "./dlsite-firestore";

/**
 * 統合処理の結果
 */
export interface ProcessingResult {
	workId: string;
	success: boolean;
	updates: {
		work: boolean;
		circle: boolean;
		creators: boolean;
		priceHistory: boolean;
	};
	errors: string[];
}

/**
 * 処理オプション
 */
export interface ProcessingOptions {
	/** 価格履歴の保存をスキップ */
	skipPriceHistory?: boolean;
	/** 差分チェックをスキップして強制更新 */
	forceUpdate?: boolean;
}

/**
 * 処理結果を初期化
 */
function initializeResult(workId: string): ProcessingResult {
	return {
		workId: workId || "UNKNOWN",
		success: false,
		updates: {
			work: false,
			circle: false,
			creators: false,
			priceHistory: false,
		},
		errors: [],
	};
}

/**
 * Work更新処理
 */
async function updateWork(workData: WorkDocument, result: ProcessingResult): Promise<void> {
	try {
		await saveWorksToFirestore([workData]);
		result.updates.work = true;
	} catch (error) {
		result.errors.push(`Work更新エラー: ${error instanceof Error ? error.message : String(error)}`);
		logger.error(`Work更新エラー: ${workData.productId}`, { error });
	}
}

/**
 * Circle更新処理
 */
async function updateCircle(
	apiData: DLsiteApiResponse,
	workId: string,
	result: ProcessingResult,
): Promise<void> {
	try {
		await updateCircleWithWork(
			apiData.maker_id || "UNKNOWN",
			workId,
			apiData.maker_name || "UNKNOWN",
			apiData.maker_name_en || "",
		);
		result.updates.circle = true;
	} catch (error) {
		result.errors.push(
			`Circle更新エラー: ${error instanceof Error ? error.message : String(error)}`,
		);
		logger.error(`Circle更新エラー: ${workId}`, { error });
	}
}

/**
 * Creator更新処理
 */
async function updateCreators(
	apiData: DLsiteApiResponse,
	workId: string,
	result: ProcessingResult,
): Promise<void> {
	try {
		const creatorResult = await updateCreatorWorkMapping(apiData, workId);
		if (creatorResult.success) {
			result.updates.creators = true;
		} else if (creatorResult.error) {
			result.errors.push(`Creator更新エラー: ${creatorResult.error}`);
		}
	} catch (error) {
		result.errors.push(
			`Creator更新エラー: ${error instanceof Error ? error.message : String(error)}`,
		);
		logger.error(`Creator更新エラー: ${workId}`, { error });
	}
}

/**
 * 価格履歴更新処理
 */
async function updatePriceHistory(
	workId: string,
	apiData: DLsiteApiResponse,
	result: ProcessingResult,
): Promise<void> {
	try {
		const saved = await savePriceHistory(workId, apiData);
		if (saved) {
			result.updates.priceHistory = true;
		}
	} catch (error) {
		result.errors.push(`価格履歴エラー: ${error instanceof Error ? error.message : String(error)}`);
		logger.warn(`価格履歴保存エラー: ${workId}`, { error });
	}
}

/**
 * 更新が必要かチェック
 */
async function shouldSkipUpdate(workData: WorkDocument, forceUpdate?: boolean): Promise<boolean> {
	if (forceUpdate) {
		return false;
	}

	const existingWork = await getWorkFromFirestore(workData.productId);
	return !!(existingWork && !hasSignificantChanges(existingWork, workData));
}

/**
 * 関連データの更新処理を実行
 */
async function performUpdates(
	apiData: DLsiteApiResponse,
	workData: WorkDocument,
	options: ProcessingOptions,
	result: ProcessingResult,
	skipWorkUpdate: boolean,
): Promise<void> {
	if (!skipWorkUpdate) {
		await updateWork(workData, result);
		await updateCircle(apiData, workData.productId, result);
		await updateCreators(apiData, workData.productId, result);
	}

	if (!options.skipPriceHistory) {
		await updatePriceHistory(workData.productId, apiData, result);
	}
}

/**
 * DLsite APIデータから全ての関連データを統合的に更新
 *
 * この関数が責任を持つこと:
 * 1. Workデータの更新
 * 2. Circleデータの更新（workIds配列の管理）
 * 3. Creatorマッピングの更新（差分更新）
 * 4. 価格履歴の記録
 *
 * @param apiData DLsite APIレスポンス
 * @param options 処理オプション
 * @returns 処理結果
 */
export async function processUnifiedDLsiteData(
	apiData: DLsiteApiResponse,
	options: ProcessingOptions = {},
): Promise<ProcessingResult> {
	const result = initializeResult(apiData.workno);

	try {
		// APIデータをWorkDocumentに変換
		const workData = WorkMapper.toWork(apiData);

		// 既存データの存在確認（スキップ判定用）
		const skipWorkUpdate = await shouldSkipUpdate(workData, options.forceUpdate);

		// 関連データの更新処理
		await performUpdates(apiData, workData, options, result, skipWorkUpdate);

		// 成功判定: 主要な更新（Work, Circle, Creator）または価格履歴のうち少なくとも1つが成功
		result.success =
			result.updates.work ||
			result.updates.circle ||
			result.updates.creators ||
			result.updates.priceHistory;

		// デバッグログ
		if (result.errors.length > 0) {
			logger.warn(`統合処理部分エラー: ${workData.productId}`, {
				updates: result.updates,
				errors: result.errors,
			});
		}
	} catch (error) {
		result.errors.push(`統合処理エラー: ${error instanceof Error ? error.message : String(error)}`);
		logger.error(`統合データ処理エラー: ${apiData.workno}`, { error });
	}

	return result;
}

/**
 * 価格変更をチェック
 */
function hasPriceChanged(existing: WorkDocument, updated: WorkDocument): boolean {
	if (existing.price.current !== updated.price.current) {
		logger.info(
			`価格変更検出: ${existing.productId} - ${existing.price.current} → ${updated.price.current}`,
		);
		return true;
	}
	return false;
}

/**
 * タイトル変更をチェック
 */
function hasTitleChanged(existing: WorkDocument, updated: WorkDocument): boolean {
	if (existing.title !== updated.title) {
		logger.info(`タイトル変更検出: ${existing.productId}`);
		return true;
	}
	return false;
}

/**
 * 販売状態変更をチェック
 */
function hasSalesStatusChanged(existing: WorkDocument, updated: WorkDocument): boolean {
	if (existing.salesStatus?.isSale !== updated.salesStatus?.isSale) {
		logger.info(
			`販売状態変更検出: ${existing.productId} - ${existing.salesStatus?.isSale} → ${updated.salesStatus?.isSale}`,
		);
		return true;
	}
	return false;
}

/**
 * 評価の大幅な変更をチェック
 */
function hasRatingChanged(existing: WorkDocument, updated: WorkDocument): boolean {
	const existingStars = existing.rating?.stars || 0;
	const updatedStars = updated.rating?.stars || 0;
	if (Math.abs(existingStars - updatedStars) > 2) {
		logger.info(`評価変更検出: ${existing.productId} - ${existingStars} → ${updatedStars}`);
		return true;
	}
	return false;
}

/**
 * 販売終了をチェック
 */
function isSoldOut(existing: WorkDocument, updated: WorkDocument): boolean {
	if (!existing.salesStatus?.isSoldOut && updated.salesStatus?.isSoldOut) {
		logger.info(`販売終了検出: ${existing.productId}`);
		return true;
	}
	return false;
}

/**
 * 新しいジャンルの追加をチェック
 */
function hasNewGenres(existing: WorkDocument, updated: WorkDocument): boolean {
	const existingGenres = new Set(existing.genres || []);
	const hasNewGenres = (updated.genres || []).some((genre) => !existingGenres.has(genre));
	if (hasNewGenres) {
		logger.info(`ジャンル追加検出: ${existing.productId}`);
		return true;
	}
	return false;
}

/**
 * 重要な変更があるかチェック
 *
 * @param existing 既存のWorkDocument
 * @param updated 更新されたWorkDocument
 * @returns 重要な変更があればtrue
 */
function hasSignificantChanges(existing: WorkDocument, updated: WorkDocument): boolean {
	return (
		hasPriceChanged(existing, updated) ||
		hasTitleChanged(existing, updated) ||
		hasSalesStatusChanged(existing, updated) ||
		hasRatingChanged(existing, updated) ||
		isSoldOut(existing, updated) ||
		hasNewGenres(existing, updated)
	);
}

/**
 * バッチ処理の結果を作成
 */
function createBatchErrorResult(reason: unknown): ProcessingResult {
	return {
		workId: "UNKNOWN",
		success: false,
		updates: {
			work: false,
			circle: false,
			creators: false,
			priceHistory: false,
		},
		errors: [`バッチ処理エラー: ${reason}`],
	};
}

/**
 * バッチ単位で処理を実行
 */
async function processBatch(
	batch: DLsiteApiResponse[],
	options: ProcessingOptions,
): Promise<ProcessingResult[]> {
	const batchPromises = batch.map((apiData) => processUnifiedDLsiteData(apiData, options));
	const batchResults = await Promise.allSettled(batchPromises);
	const results: ProcessingResult[] = [];

	for (const result of batchResults) {
		if (result.status === "fulfilled") {
			results.push(result.value);
		} else {
			results.push(createBatchErrorResult(result.reason));
		}
	}

	return results;
}

/**
 * バッチ処理用: 複数のAPIデータを統合処理
 *
 * @param apiDataList APIデータのリスト
 * @param options 処理オプション
 * @returns 処理結果のリスト
 */
export async function processBatchUnifiedDLsiteData(
	apiDataList: DLsiteApiResponse[],
	options: ProcessingOptions = {},
): Promise<ProcessingResult[]> {
	const results: ProcessingResult[] = [];
	const BATCH_SIZE = 10;

	// バッチ単位で処理
	for (let i = 0; i < apiDataList.length; i += BATCH_SIZE) {
		const batch = apiDataList.slice(i, i + BATCH_SIZE);
		const batchResults = await processBatch(batch, options);
		results.push(...batchResults);
	}

	// 統計ログ
	const successCount = results.filter((r) => r.success).length;
	const totalCount = results.length;
	logger.info(`バッチ統合処理完了: ${successCount}/${totalCount}件成功`);

	return results;
}
