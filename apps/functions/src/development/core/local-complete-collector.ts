/**
 * DLsite完全データローカル収集ツール
 *
 * ローカル環境（日本）で全1,488作品の完全データ収集を実行し
 * リージョン制限作品を含む全作品情報をCloud Firestoreに安全に投入する
 *
 * 設計: docs/DLSITE_REGION_RESTRICTION_DESIGN.md Phase 2
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import { logUserAgentSummary } from "../../infrastructure/management/user-agent-manager";
import { getExistingWorksMap, saveWorksToFirestore } from "../../services/dlsite/dlsite-firestore";
import { batchFetchIndividualInfo } from "../../services/dlsite/individual-info-api-client";
import {
	batchMapIndividualInfoAPIToWorkData,
	type IndividualInfoAPIResponse,
	validateAPIOnlyWorkData,
} from "../../services/dlsite/individual-info-to-work-mapper";
import { savePriceHistory } from "../../services/price-history";
import { chunkArray } from "../../shared/array-utils";
import * as logger from "../../shared/logger";

// ローカル環境用設定（高速化版: DLsiteへの負荷を考慮しつつ高速実行）
const MAX_CONCURRENT_REQUESTS = 5; // 同時実行数を増加（推奨値）
const REQUEST_DELAY = 800; // 0.8秒間隔（安全な範囲で短縮）
const BATCH_SIZE = 50; // バッチサイズは維持

// メタデータ保存用
const LOCAL_COLLECTION_METADATA_DOC_ID = "local_complete_collection_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

/**
 * ローカル収集した作品データの型定義
 */
interface LocalCollectedWorkData {
	workId: string;
	collectedAt: string;
	collectionMethod: "INDIVIDUAL_API" | "MANUAL_ENTRY" | "HYBRID";
	basicInfo: IndividualInfoAPIResponse;
	metadata: {
		collectorVersion: string;
		collectionEnvironment: string;
		dataQuality: "COMPLETE" | "PARTIAL" | "MANUAL";
		verificationStatus: boolean;
	};
}

/**
 * ローカル収集結果の型定義
 */
interface LocalCollectionResult {
	totalAttempted: number;
	successfulCollections: number;
	failedCollections: number;
	collectedData: LocalCollectedWorkData[];
	errors: CollectionError[];
	processingTimeMs: number;
}

/**
 * 収集エラーの型定義
 */
interface CollectionError {
	workId: string;
	error: string;
	timestamp: string;
	errorType: "API_ERROR" | "NETWORK_ERROR" | "VALIDATION_ERROR" | "LOCAL_COLLECTION_FAILED";
}

/**
 * バッチアップロード結果の型定義
 */
interface UploadBatchResult {
	batchIndex: number;
	successCount: number;
	errorCount: number;
	errors: string[];
}

/**
 * アップロード結果の型定義
 */
interface UploadResult {
	totalBatches: number;
	successfulBatches: number;
	totalUploaded: number;
	totalErrors: number;
	errors: string[];
}

/**
 * ローカル収集メタデータの型定義
 */
interface LocalCollectionMetadata {
	lastCollectionAt: Timestamp;
	totalWorksAttempted: number;
	successfulCollections: number;
	failedCollections: number;
	collectionVersion: string;
	collectionEnvironment: string;
	processingTimeMs: number;
	isInProgress: boolean;
	regionRestrictedWorksDetected: number;
	lastError?: string;
}

/**
 * DLsiteデータ収集クラス
 */
class LocalDataCollector {
	private readonly collectorVersion = "1.0.0";
	private readonly collectionEnvironment = "local-japan";

	/**
	 * アセットファイルから作品IDリストを読み込み
	 */
	private loadAssetFileWorkIds(): string[] {
		try {
			const assetFilePath = join(__dirname, "../../assets/dlsite-work-ids.json");
			const data = JSON.parse(readFileSync(assetFilePath, "utf-8"));
			return data.workIds || [];
		} catch (error) {
			logger.error("アセットファイル読み込みエラー:", { error });
			throw new Error("作品IDリストファイルが読み込めませんでした");
		}
	}

	/**
	 * 単一作品のローカルデータ取得
	 */
	private async fetchLocalWorkData(workId: string): Promise<IndividualInfoAPIResponse | null> {
		try {
			const data = await batchFetchIndividualInfo([workId], {
				maxConcurrent: 1,
				batchDelay: REQUEST_DELAY,
			});

			if (data.results.size > 0) {
				return data.results.get(workId) || null;
			}

			return null;
		} catch (error) {
			logger.warn(`個別取得失敗: ${workId}`, { error });
			return null;
		}
	}

	/**
	 * ローカル環境での完全データ収集
	 */
	async collectCompleteLocalData(): Promise<LocalCollectionResult> {
		logger.info("🏠 ローカル完全データ収集開始");
		const startTime = Date.now();

		const assetWorkIds = this.loadAssetFileWorkIds();
		const results: LocalCollectedWorkData[] = [];
		const errors: CollectionError[] = [];

		logger.info(`🎯 収集対象: ${assetWorkIds.length}件の作品`);

		// バッチ処理で実行
		const batches = chunkArray(assetWorkIds, BATCH_SIZE);
		logger.info(`📦 ${batches.length}バッチで処理実行`);

		for (const [batchIndex, batch] of batches.entries()) {
			logger.info(`🔄 バッチ ${batchIndex + 1}/${batches.length} 処理中: ${batch.length}件`);

			try {
				// バッチでデータ取得
				const { results: batchResults } = await batchFetchIndividualInfo(batch, {
					maxConcurrent: MAX_CONCURRENT_REQUESTS,
					batchDelay: REQUEST_DELAY,
				});

				// 成功データの処理
				for (const [workId, apiData] of batchResults.entries()) {
					try {
						const localData: LocalCollectedWorkData = {
							workId,
							collectedAt: new Date().toISOString(),
							collectionMethod: "INDIVIDUAL_API",
							basicInfo: apiData, // 後でマッピング処理
							metadata: {
								collectorVersion: this.collectorVersion,
								collectionEnvironment: this.collectionEnvironment,
								dataQuality: "COMPLETE",
								verificationStatus: true,
							},
						};

						results.push(localData);
						logger.debug(`✅ ローカル収集成功: ${workId}`);
					} catch (error) {
						errors.push({
							workId,
							error: error instanceof Error ? error.message : String(error),
							timestamp: new Date().toISOString(),
							errorType: "VALIDATION_ERROR",
						});
					}
				}

				// 🆕 価格履歴保存処理（バッチ単位で実行）
				logger.info(`🔍 価格履歴保存開始: バッチ ${batchIndex + 1}/${batches.length}`);
				const priceHistoryResults = await Promise.allSettled(
					Array.from(batchResults.entries())
						.filter(([, apiData]) => apiData.workno) // worknoが存在するもののみ
						.map(([workId, apiData]) => savePriceHistory(workId, apiData)),
				);

				// 価格履歴保存結果の集計
				let priceHistorySuccess = 0;
				let priceHistoryFailure = 0;
				priceHistoryResults.forEach((result, index) => {
					if (result.status === "fulfilled") {
						if (result.value) {
							priceHistorySuccess++;
						} else {
							priceHistoryFailure++;
						}
					} else {
						priceHistoryFailure++;
						logger.warn(`価格履歴保存失敗（例外）: ${batch[index]}`, {
							error: result.reason,
						});
					}
				});

				logger.info(
					`🔍 価格履歴保存完了: 成功 ${priceHistorySuccess}件, 失敗 ${priceHistoryFailure}件`,
				);

				// 失敗データの処理
				const failedIds = batch.filter((id) => !batchResults.has(id));
				for (const workId of failedIds) {
					errors.push({
						workId,
						error: "Individual Info API取得失敗",
						timestamp: new Date().toISOString(),
						errorType: "LOCAL_COLLECTION_FAILED",
					});
					logger.warn(`⚠️ ローカル収集失敗: ${workId}`);
				}

				logger.info(`✅ バッチ ${batchIndex + 1} 完了: ${batchResults.size}/${batch.length}件成功`);

				// バッチ間の待機
				if (batchIndex < batches.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
				}
			} catch (error) {
				logger.error(`❌ バッチ ${batchIndex + 1} エラー:`, { error });
				// バッチ全体が失敗した場合
				for (const workId of batch) {
					errors.push({
						workId,
						error: error instanceof Error ? error.message : String(error),
						timestamp: new Date().toISOString(),
						errorType: "API_ERROR",
					});
				}
			}
		}

		const processingTime = Date.now() - startTime;

		logger.info("🎉 ローカル完全データ収集完了");
		logger.info(`📊 総作品数: ${assetWorkIds.length}件`);
		logger.info(
			`✅ 成功: ${results.length}件 (${((results.length / assetWorkIds.length) * 100).toFixed(1)}%)`,
		);
		logger.info(`❌ 失敗: ${errors.length}件`);
		logger.info(`⏱️ 処理時間: ${(processingTime / 1000).toFixed(1)}秒`);

		return {
			totalAttempted: assetWorkIds.length,
			successfulCollections: results.length,
			failedCollections: errors.length,
			collectedData: results,
			errors,
			processingTimeMs: processingTime,
		};
	}

	/**
	 * バッチデータのアップロード
	 */
	private async uploadBatch(batch: LocalCollectedWorkData[]): Promise<UploadBatchResult> {
		const batchResult: UploadBatchResult = {
			batchIndex: 0,
			successCount: 0,
			errorCount: 0,
			errors: [],
		};

		try {
			// APIレスポンスをワークデータに変換
			const apiResponses = batch.map((item) => item.basicInfo);
			const existingWorksMap = await getExistingWorksMap(batch.map((item) => item.workId));

			logger.debug(`バッチ変換開始: ${apiResponses.length}件のAPIレスポンス`);

			// APIレスポンスの基本フィールド確認
			const responseStatistics = {
				total: apiResponses.length,
				hasWorkno: apiResponses.filter((r) => r.workno).length,
				hasWorkName: apiResponses.filter((r) => r.work_name).length,
				hasMakerName: apiResponses.filter((r) => r.maker_name).length,
				hasPriceInfo: apiResponses.filter((r) => r.price !== undefined).length,
			};
			logger.debug("APIレスポンス統計:", responseStatistics);

			const workDataList = batchMapIndividualInfoAPIToWorkData(apiResponses, existingWorksMap);
			logger.debug(`バッチ変換完了: ${workDataList.length}件のワークデータ`);
			const validWorkData = workDataList.filter((work) => {
				const validation = validateAPIOnlyWorkData(work);
				if (!validation.isValid) {
					logger.warn(`データ品質エラー: ${work.productId}`, {
						errors: validation.errors,
					});
					batchResult.errors.push(`品質エラー: ${work.productId}`);
				}
				return validation.isValid;
			});

			if (validWorkData.length > 0) {
				// ローカル収集フラグを追加
				const enhancedWorkData = validWorkData.map((work) => ({
					...work,
					localDataSource: true,
					collectedAt: new Date().toISOString(),
				}));

				await saveWorksToFirestore(enhancedWorkData);
				batchResult.successCount = enhancedWorkData.length;
				logger.info(`✅ バッチアップロード成功: ${enhancedWorkData.length}件`);
			}

			batchResult.errorCount = batch.length - batchResult.successCount;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error("バッチアップロードエラー:", { error });
			batchResult.errors.push(errorMsg);
			batchResult.errorCount = batch.length;
		}

		return batchResult;
	}

	/**
	 * Firestoreへの安全なデータ投入
	 */
	async uploadToFirestore(localData: LocalCollectedWorkData[]): Promise<UploadResult> {
		logger.info(`🔄 Firestore投入開始: ${localData.length}件`);

		const batches = chunkArray(localData, 100); // Firestore制限を考慮して100件ずつ
		const results: UploadBatchResult[] = [];

		for (const [index, batch] of batches.entries()) {
			try {
				const batchResult = await this.uploadBatch(batch);
				batchResult.batchIndex = index;
				results.push(batchResult);

				logger.info(`✅ バッチ${index + 1}/${batches.length}完了: ${batchResult.successCount}件`);

				// バッチ間の待機
				if (index < batches.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			} catch (error) {
				logger.error(`❌ バッチ${index + 1}投入失敗:`, { error });
				results.push({
					batchIndex: index,
					successCount: 0,
					errorCount: batch.length,
					errors: [error instanceof Error ? error.message : String(error)],
				});
			}
		}

		return this.aggregateUploadResults(results);
	}

	/**
	 * アップロード結果の集計
	 */
	private aggregateUploadResults(results: UploadBatchResult[]): UploadResult {
		return {
			totalBatches: results.length,
			successfulBatches: results.filter((r) => r.errorCount === 0).length,
			totalUploaded: results.reduce((sum, r) => sum + r.successCount, 0),
			totalErrors: results.reduce((sum, r) => sum + r.errorCount, 0),
			errors: results.flatMap((r) => r.errors),
		};
	}

	/**
	 * メタデータの保存
	 */
	private async saveCollectionMetadata(
		result: LocalCollectionResult,
		_uploadResult?: UploadResult,
	): Promise<void> {
		try {
			const metadata: LocalCollectionMetadata = {
				lastCollectionAt: Timestamp.now(),
				totalWorksAttempted: result.totalAttempted,
				successfulCollections: result.successfulCollections,
				failedCollections: result.failedCollections,
				collectionVersion: this.collectorVersion,
				collectionEnvironment: this.collectionEnvironment,
				processingTimeMs: result.processingTimeMs,
				isInProgress: false,
				regionRestrictedWorksDetected: result.failedCollections,
			};

			const metadataRef = firestore
				.collection(METADATA_COLLECTION)
				.doc(LOCAL_COLLECTION_METADATA_DOC_ID);
			await metadataRef.set(metadata);

			logger.info("📋 メタデータ保存完了");
		} catch (error) {
			logger.error("メタデータ保存エラー:", { error });
		}
	}
}

/**
 * 完全網羅収集のメイン実行関数
 */
async function executeCompleteLocalCollection(options?: {
	uploadToFirestore?: boolean;
	maxWorks?: number;
}): Promise<{ collection: LocalCollectionResult; upload?: UploadResult }> {
	const collector = new LocalDataCollector();
	let collectionResult: LocalCollectionResult;
	let uploadResult: UploadResult | undefined;

	try {
		// Step 1: ローカルデータ収集
		logger.info("🎯 Step 1: ローカル完全データ収集");
		collectionResult = await collector.collectCompleteLocalData();

		// Step 2: Firestoreアップロード（オプション）
		if (options?.uploadToFirestore && collectionResult.collectedData.length > 0) {
			logger.info("🎯 Step 2: Firestore投入");
			uploadResult = await collector.uploadToFirestore(collectionResult.collectedData);

			logger.info("✅ Firestore投入完了");
			logger.info(`📊 投入成功: ${uploadResult.totalUploaded}件`);
			logger.info(`❌ 投入失敗: ${uploadResult.totalErrors}件`);
		}

		// Step 3: メタデータ保存
		await collector.saveCollectionMetadata(collectionResult, uploadResult);

		// User-Agent使用統計
		logUserAgentSummary();

		return { collection: collectionResult, upload: uploadResult };
	} catch (error) {
		logger.error("完全収集処理エラー:", { error });
		throw error;
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		logger.info("🚀 DLsite完全データローカル収集ツール開始");

		const options = {
			uploadToFirestore: true, // Firestoreへの投入を有効化
			maxWorks: undefined, // 全作品を対象
		};

		const result = await executeCompleteLocalCollection(options);

		console.log("\n=== 完全収集結果サマリー ===");
		console.log(`総作品数: ${result.collection.totalAttempted}件`);
		console.log(`収集成功: ${result.collection.successfulCollections}件`);
		console.log(`収集失敗: ${result.collection.failedCollections}件`);
		console.log(
			`成功率: ${((result.collection.successfulCollections / result.collection.totalAttempted) * 100).toFixed(1)}%`,
		);
		console.log(`処理時間: ${(result.collection.processingTimeMs / 1000).toFixed(1)}秒`);

		if (result.upload) {
			console.log("\n=== Firestore投入結果 ===");
			console.log(`投入成功: ${result.upload.totalUploaded}件`);
			console.log(`投入失敗: ${result.upload.totalErrors}件`);
			console.log(`成功バッチ: ${result.upload.successfulBatches}/${result.upload.totalBatches}`);
		}

		if (result.collection.errors.length > 0) {
			console.log("\n=== 収集エラー（上位10件） ===");
			result.collection.errors.slice(0, 10).forEach((error, index) => {
				console.log(`${index + 1}. ${error.workId}: ${error.error}`);
			});
			if (result.collection.errors.length > 10) {
				console.log(`... 他${result.collection.errors.length - 10}件`);
			}
		}

		logger.info("🎉 完全収集ツール実行完了");
	} catch (error) {
		logger.error("メイン処理エラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	}
}

// 名前付きエクスポート
export {
	LocalDataCollector,
	executeCompleteLocalCollection,
	type LocalCollectionResult,
	type LocalCollectedWorkData,
	type UploadResult,
};

// スクリプト実行
if (require.main === module) {
	main().catch((error) => {
		logger.error("Script execution error:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
