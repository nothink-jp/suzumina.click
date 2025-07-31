/**
 * DLsite統合データ処理
 *
 * 1つのAPIデータから全ての関連データを統合的に更新
 * Work、Circle、Creator、価格履歴の更新を一元管理
 */

import type { DLsiteRawApiResponse, WorkDocument } from "@suzumina.click/shared-types";
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
	apiData: DLsiteRawApiResponse,
	options: ProcessingOptions = {},
): Promise<ProcessingResult> {
	const result: ProcessingResult = {
		workId: apiData.workno || "UNKNOWN",
		success: false,
		updates: {
			work: false,
			circle: false,
			creators: false,
			priceHistory: false,
		},
		errors: [],
	};

	try {
		// 1. APIデータをWorkDocumentに変換
		const workData = WorkMapper.toWork(apiData);

		// 2. 既存データの存在確認（スキップ判定用）
		let skipWorkUpdate = false;
		if (!options.forceUpdate) {
			const existingWork = await getWorkFromFirestore(workData.productId);
			if (existingWork && !hasSignificantChanges(existingWork, workData)) {
				// 変更なしの場合は作品データの更新をスキップ
				skipWorkUpdate = true;
			}
		}

		// 3. Work更新
		if (!skipWorkUpdate) {
			try {
				await saveWorksToFirestore([workData]);
				result.updates.work = true;
			} catch (error) {
				result.errors.push(
					`Work更新エラー: ${error instanceof Error ? error.message : String(error)}`,
				);
				logger.error(`Work更新エラー: ${workData.productId}`, { error });
			}
		}

		// 4. Circle更新
		if (!skipWorkUpdate) {
			try {
				await updateCircleWithWork(
					apiData.maker_id || "UNKNOWN",
					workData.productId,
					apiData.maker_name || "UNKNOWN",
					apiData.maker_name_en || "",
				);
				result.updates.circle = true;
			} catch (error) {
				result.errors.push(
					`Circle更新エラー: ${error instanceof Error ? error.message : String(error)}`,
				);
				logger.error(`Circle更新エラー: ${workData.productId}`, { error });
			}
		}

		// 5. Creator更新（サブコレクション操作のため別処理）
		if (!skipWorkUpdate) {
			try {
				const creatorResult = await updateCreatorWorkMapping(apiData, workData.productId);
				if (creatorResult.success) {
					result.updates.creators = true;
				} else if (creatorResult.error) {
					result.errors.push(`Creator更新エラー: ${creatorResult.error}`);
				}
			} catch (error) {
				result.errors.push(
					`Creator更新エラー: ${error instanceof Error ? error.message : String(error)}`,
				);
				logger.error(`Creator更新エラー: ${workData.productId}`, { error });
			}
		}

		// 6. 価格履歴（オプション）
		if (!options.skipPriceHistory) {
			try {
				const saved = await savePriceHistory(workData.productId, apiData);
				if (saved) {
					result.updates.priceHistory = true;
				}
			} catch (error) {
				result.errors.push(
					`価格履歴エラー: ${error instanceof Error ? error.message : String(error)}`,
				);
				logger.warn(`価格履歴保存エラー: ${workData.productId}`, { error });
			}
		}

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
 * 重要な変更があるかチェック
 *
 * @param existing 既存のWorkDocument
 * @param updated 更新されたWorkDocument
 * @returns 重要な変更があればtrue
 */
function hasSignificantChanges(existing: WorkDocument, updated: WorkDocument): boolean {
	// 価格変更
	if (existing.price.current !== updated.price.current) {
		logger.info(
			`価格変更検出: ${existing.productId} - ${existing.price.current} → ${updated.price.current}`,
		);
		return true;
	}

	// タイトル変更
	if (existing.title !== updated.title) {
		logger.info(`タイトル変更検出: ${existing.productId}`);
		return true;
	}

	// 販売状態変更
	if (existing.salesStatus?.isSale !== updated.salesStatus?.isSale) {
		logger.info(
			`販売状態変更検出: ${existing.productId} - ${existing.salesStatus?.isSale} → ${updated.salesStatus?.isSale}`,
		);
		return true;
	}

	// 評価の大幅な変更（星2つ以上の差）
	const existingStars = existing.rating?.stars || 0;
	const updatedStars = updated.rating?.stars || 0;
	if (Math.abs(existingStars - updatedStars) > 2) {
		logger.info(`評価変更検出: ${existing.productId} - ${existingStars} → ${updatedStars}`);
		return true;
	}

	// 販売終了の検出
	if (!existing.salesStatus?.isSoldOut && updated.salesStatus?.isSoldOut) {
		logger.info(`販売終了検出: ${existing.productId}`);
		return true;
	}

	// 新しいジャンルの追加
	const existingGenres = new Set(existing.genres || []);
	const hasNewGenres = (updated.genres || []).some((genre) => !existingGenres.has(genre));
	if (hasNewGenres) {
		logger.info(`ジャンル追加検出: ${existing.productId}`);
		return true;
	}

	return false;
}

/**
 * バッチ処理用: 複数のAPIデータを統合処理
 *
 * @param apiDataList APIデータのリスト
 * @param options 処理オプション
 * @returns 処理結果のリスト
 */
export async function processBatchUnifiedDLsiteData(
	apiDataList: DLsiteRawApiResponse[],
	options: ProcessingOptions = {},
): Promise<ProcessingResult[]> {
	const results: ProcessingResult[] = [];

	// 並列処理で効率化（ただし過度な並列化は避ける）
	const BATCH_SIZE = 10;
	for (let i = 0; i < apiDataList.length; i += BATCH_SIZE) {
		const batch = apiDataList.slice(i, i + BATCH_SIZE);
		const batchPromises = batch.map((apiData) => processUnifiedDLsiteData(apiData, options));

		const batchResults = await Promise.allSettled(batchPromises);

		for (const result of batchResults) {
			if (result.status === "fulfilled") {
				results.push(result.value);
			} else {
				// Promise.allSettledのrejectedケース
				results.push({
					workId: "UNKNOWN",
					success: false,
					updates: {
						work: false,
						circle: false,
						creators: false,
						priceHistory: false,
					},
					errors: [`バッチ処理エラー: ${result.reason}`],
				});
			}
		}
	}

	// 統計ログ
	const successCount = results.filter((r) => r.success).length;
	const totalCount = results.length;
	logger.info(`バッチ統合処理完了: ${successCount}/${totalCount}件成功`);

	return results;
}
