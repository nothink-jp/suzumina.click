/**
 * DLsite失敗作品ローカル補完収集ツール
 *
 * Cloud Functions で失敗した作品IDをローカル環境で補完収集し
 * 成功したデータをCloud Firestoreに保存する
 */

import type { DLsiteRawApiResponse } from "@suzumina.click/shared-types";
// import { getDLsiteConfig } from "../../infrastructure/management/config-manager";
import { logUserAgentSummary } from "../../infrastructure/management/user-agent-manager";
import { saveWorksToFirestore } from "../../services/dlsite/dlsite-firestore";
import {
	FAILURE_REASONS,
	getFailedWorkIds,
	getFailureStatistics,
	trackFailedWork,
	trackWorkRecovery,
} from "../../services/dlsite/failure-tracker";
import { fetchIndividualWorkInfo } from "../../services/dlsite/individual-info-api-client";
import { WorkMapper } from "../../services/mappers/work-mapper";
import * as logger from "../../shared/logger";

// バッチ処理設定（統合APIクライアント利用）
const MAX_CONCURRENT_REQUESTS = 3; // ローカル環境では控えめに設定
const REQUEST_DELAY = 1000; // 1秒間隔

// 設定を取得 (現在未使用だが将来的に使用可能性あり)
// const config = getDLsiteConfig();

/**
 * 補完収集結果の型定義
 */
interface SupplementCollectionResult {
	totalFailedWorks: number;
	processedWorks: number;
	successfulWorks: number;
	stillFailedWorks: number;
	recoveredWorkIds: string[];
	stillFailingWorkIds: string[];
	errors: string[];
}

// 重複実装を削除済み - 統合APIクライアントを使用
// fetchIndividualWorkInfoLocal は services/dlsite/individual-info-api-client.ts の
// fetchIndividualWorkInfo に統合されました

/**
 * 複数作品のバッチ処理（ローカル環境用）
 */
async function batchFetchLocalSupplement(
	workIds: string[],
): Promise<{ successful: DLsiteRawApiResponse[]; failed: string[] }> {
	const successful: DLsiteRawApiResponse[] = [];
	const failed: string[] = [];

	logger.info(`🔄 ローカル補完バッチ処理開始: ${workIds.length}件`);

	// バッチに分割
	const batches: string[][] = [];
	for (let i = 0; i < workIds.length; i += MAX_CONCURRENT_REQUESTS) {
		batches.push(workIds.slice(i, i + MAX_CONCURRENT_REQUESTS));
	}

	for (const [batchIndex, batch] of batches.entries()) {
		logger.info(`📦 バッチ ${batchIndex + 1}/${batches.length} 処理中: ${batch.length}件`);

		try {
			// 並列でAPIを呼び出し
			const promises = batch.map(async (workId) => {
				try {
					// 統合APIクライアントを使用（ローカル環境用設定）
					const data = await fetchIndividualWorkInfo(workId, {
						enableDetailedLogging: true, // ローカル環境は詳細ログを有効化
					});
					return { workId, data };
				} catch (error) {
					logger.warn(`個別取得失敗: ${workId}`, { error });
					return { workId, data: null };
				}
			});

			const batchResults = await Promise.all(promises);

			// 成功・失敗を分類
			for (const { workId, data } of batchResults) {
				if (data) {
					successful.push(data);
				} else {
					failed.push(workId);
				}
			}

			logger.info(
				`✅ バッチ ${batchIndex + 1} 完了: ${batchResults.filter((r) => r.data).length}/${batch.length}件成功`,
			);

			// レート制限対応
			if (batchIndex < batches.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
			}
		} catch (error) {
			logger.error(`バッチ ${batchIndex + 1} エラー:`, { error });
			// バッチ全体が失敗した場合、そのバッチの全作品IDを失敗として記録
			failed.push(...batch);
		}
	}

	logger.info(`🎯 ローカル補完バッチ処理完了: 成功${successful.length}件, 失敗${failed.length}件`);

	return { successful, failed };
}

/**
 * ローカル環境での失敗作品補完収集メイン処理
 */
async function collectFailedWorksLocally(options?: {
	maxWorks?: number;
	onlyUnrecovered?: boolean;
	minFailureCount?: number;
}): Promise<SupplementCollectionResult> {
	try {
		logger.info("🚀 ローカル補完収集開始");

		// 現在の失敗統計を取得
		const initialStats = await getFailureStatistics();
		logger.info("📊 補完前統計:", initialStats);

		// 失敗作品ID一覧を取得
		const failedWorkIds = await getFailedWorkIds({
			onlyUnrecovered: options?.onlyUnrecovered ?? true,
			minFailureCount: options?.minFailureCount ?? 1,
			limit: options?.maxWorks ?? 100,
		});

		if (failedWorkIds.length === 0) {
			logger.info("✅ 補完対象の失敗作品がありません");
			return {
				totalFailedWorks: 0,
				processedWorks: 0,
				successfulWorks: 0,
				stillFailedWorks: 0,
				recoveredWorkIds: [],
				stillFailingWorkIds: [],
				errors: [],
			};
		}

		logger.info(`🎯 補完対象作品: ${failedWorkIds.length}件`);

		// ローカル環境でIndividual Info API実行
		const { successful, failed } = await batchFetchLocalSupplement(failedWorkIds);

		const result: SupplementCollectionResult = {
			totalFailedWorks: failedWorkIds.length,
			processedWorks: failedWorkIds.length,
			successfulWorks: successful.length,
			stillFailedWorks: failed.length,
			recoveredWorkIds: [],
			stillFailingWorkIds: failed,
			errors: [],
		};

		// 成功したデータをFirestoreに保存
		if (successful.length > 0) {
			try {
				const workDataList = successful.map((apiData) => WorkMapper.toWork(apiData));
				const validWorkData = workDataList.filter((work) => {
					// Basic validation - ensure required fields exist
					if (!work.id || !work.title || !work.circle) {
						logger.warn(`データ品質エラー: ${work.productId}`, {
							reason: "必須フィールドが欠落",
						});
						return false;
					}
					return true;
				});

				if (validWorkData.length > 0) {
					await saveWorksToFirestore(validWorkData);
					logger.info(`✅ Firestore保存成功: ${validWorkData.length}件`);

					// 成功した作品の回復を記録
					for (const work of validWorkData) {
						try {
							await trackWorkRecovery(work.productId);
							result.recoveredWorkIds.push(work.productId);
						} catch (trackError) {
							logger.warn(`回復記録失敗: ${work.productId}`, { trackError });
						}
					}
				}
			} catch (saveError) {
				const errorMsg = `Firestore保存エラー: ${saveError instanceof Error ? saveError.message : String(saveError)}`;
				logger.error(errorMsg);
				result.errors.push(errorMsg);
			}
		}

		// まだ失敗している作品の記録更新
		if (failed.length > 0) {
			try {
				const failures = failed.map((workId) => ({
					workId,
					reason: FAILURE_REASONS.REGION_RESTRICTION,
					errorDetails: "ローカル環境でも取得失敗",
				}));

				// 複数の失敗を一括記録
				await Promise.all(
					failures.map(async (failure) => {
						try {
							await trackFailedWork(failure.workId, failure.reason, failure.errorDetails);
						} catch (trackError) {
							logger.warn(`失敗記録エラー: ${failure.workId}`, { trackError });
						}
					}),
				);
			} catch (error) {
				const errorMsg = `失敗記録エラー: ${error instanceof Error ? error.message : String(error)}`;
				logger.error(errorMsg);
				result.errors.push(errorMsg);
			}
		}

		// 最終統計
		const finalStats = await getFailureStatistics();
		logger.info("📊 補完後統計:", finalStats);

		// User-Agent使用統計
		logUserAgentSummary();

		logger.info("🎉 === ローカル補完収集完了 ===");
		logger.info(`総対象作品: ${result.totalFailedWorks}件`);
		logger.info(`成功: ${result.successfulWorks}件`);
		logger.info(`回復記録: ${result.recoveredWorkIds.length}件`);
		logger.info(`まだ失敗: ${result.stillFailedWorks}件`);
		logger.info(`エラー: ${result.errors.length}件`);

		return result;
	} catch (error) {
		logger.error("ローカル補完収集エラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		// オプション設定
		const options = {
			maxWorks: 50, // 一度に処理する最大件数
			onlyUnrecovered: true, // 未回復の作品のみ
			minFailureCount: 1, // 最小失敗回数
		};

		const result = await collectFailedWorksLocally(options);

		console.log("\n=== 補完収集結果サマリー ===");
		console.log(`総対象作品: ${result.totalFailedWorks}件`);
		console.log(`処理完了: ${result.processedWorks}件`);
		console.log(`成功: ${result.successfulWorks}件`);
		console.log(`回復記録: ${result.recoveredWorkIds.length}件`);
		console.log(`まだ失敗: ${result.stillFailedWorks}件`);
		console.log(`エラー: ${result.errors.length}件`);

		if (result.recoveredWorkIds.length > 0) {
			console.log("\n回復した作品ID:");
			console.log(result.recoveredWorkIds.join(", "));
		}

		if (result.stillFailingWorkIds.length > 0) {
			console.log("\nまだ失敗している作品ID:");
			console.log(result.stillFailingWorkIds.slice(0, 10).join(", "));
			if (result.stillFailingWorkIds.length > 10) {
				console.log(`... 他${result.stillFailingWorkIds.length - 10}件`);
			}
		}

		if (result.errors.length > 0) {
			console.log("\nエラー:");
			result.errors.forEach((error, index) => {
				console.log(`${index + 1}. ${error}`);
			});
		}
	} catch (error) {
		logger.error("メイン処理エラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	}
}

// 名前付きエクスポート
export { collectFailedWorksLocally, batchFetchLocalSupplement, type SupplementCollectionResult };

// スクリプト実行
if (require.main === module) {
	main().catch((error) => {
		logger.error("Script execution error:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
