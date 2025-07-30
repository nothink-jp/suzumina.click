/**
 * サークル・クリエイター情報収集サービス
 *
 * DLsite Individual Info APIから取得した作品データをもとに、
 * サークル情報とクリエイター・作品マッピング情報を収集・保存します。
 */

import type { DLsiteRawApiResponse, WorkDocument } from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";
import { updateCircleWithWork } from "./circle-firestore";
import { updateCreatorWorkMapping } from "./creator-firestore";

/**
 * サークル・クリエイター情報を収集・保存
 * @param workData Firestore用に変換された作品データ
 * @param apiData Individual Info APIの生データ
 * @returns 処理結果
 */
export async function collectCircleAndCreatorInfo(
	workData: WorkDocument,
	apiData: DLsiteRawApiResponse,
): Promise<{ success: boolean; error?: string }> {
	try {
		// 1. サークル情報の更新（新しいupdateCircleWithWorkを使用）
		if (apiData.maker_id && apiData.workno) {
			await updateCircleWithWork(
				apiData.maker_id,
				apiData.workno,
				apiData.maker_name || "",
				apiData.maker_name_en || "",
			);
		}

		// 2. クリエイターマッピングの更新（新しいcreator-firestoreを使用）
		const result = await updateCreatorWorkMapping(apiData, workData.id);

		if (!result.success) {
			return result;
		}

		// 個別作品の収集完了ログは省略（ログ削減）

		return { success: true };
	} catch (error) {
		logger.error("サークル・クリエイター情報収集エラー:", {
			workId: workData.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * バッチ処理用：複数の作品からサークル・クリエイター情報を一括収集
 * ローカル開発環境での一括処理に使用
 */
export async function batchCollectCircleAndCreatorInfo(
	works: Array<{
		workData: WorkDocument;
		apiData: DLsiteRawApiResponse;
	}>,
): Promise<{
	success: boolean;
	processed: number;
	errors: Array<{ workId: string; error: string }>;
}> {
	const errors: Array<{ workId: string; error: string }> = [];
	let processed = 0;

	// バッチ処理（100作品ごとに分割）
	const batchSize = 100;
	for (let i = 0; i < works.length; i += batchSize) {
		const batchWorks = works.slice(i, i + batchSize);

		for (const { workData, apiData } of batchWorks) {
			try {
				// 個別に処理（新しいユーティリティ関数を使用）
				const result = await collectCircleAndCreatorInfo(workData, apiData);

				if (result.success) {
					processed++;
				} else {
					errors.push({
						workId: workData.id,
						error: result.error || "Unknown error",
					});
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				errors.push({
					workId: workData.id,
					error: errorMessage,
				});
				logger.error("バッチ処理中のエラー:", {
					workId: workData.id,
					errorMessage,
					errorType: error instanceof Error ? error.constructor.name : typeof error,
					errorStack: error instanceof Error ? error.stack : undefined,
				});
			}
		}

		logger.info(
			`バッチ処理進捗: ${i + 1}-${Math.min(i + batchSize, works.length)}/${works.length}`,
		);
	}

	return {
		success: errors.length === 0,
		processed,
		errors,
	};
}
