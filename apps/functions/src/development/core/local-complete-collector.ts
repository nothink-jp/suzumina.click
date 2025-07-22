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
import { batchCollectCircleAndCreatorInfo } from "../../services/dlsite/collect-circle-creator-info";
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

	// サークル・クリエイター収集統計
	private circleStats = {
		totalCircles: 0,
		newCircles: 0,
		updatedCircles: 0,
	};

	private creatorStats = {
		totalMappings: 0,
		uniqueCreators: new Set<string>(),
	};

	// APIレスポンスとワークデータの保存用（サークル・クリエイター収集のため）
	private apiResponses = new Map<string, IndividualInfoAPIResponse>();
	private workDataMap = new Map<string, OptimizedFirestoreDLsiteWorkData>();

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
		// ローカル完全データ収集開始
		const startTime = Date.now();

		const assetWorkIds = this.loadAssetFileWorkIds();
		const results: LocalCollectedWorkData[] = [];
		const errors: CollectionError[] = [];

		logger.info(`収集対象: ${assetWorkIds.length}件`);

		// バッチ処理で実行
		const batches = chunkArray(assetWorkIds, BATCH_SIZE);
		// バッチ処理設定完了

		for (const [batchIndex, batch] of batches.entries()) {
			// 進捗ログは10バッチ毎に表示
			if (batchIndex % 10 === 0 || batchIndex === batches.length - 1) {
				logger.info(
					`バッチ進捗: ${batchIndex + 1}/${batches.length} (${Math.round(((batchIndex + 1) / batches.length) * 100)}%)`,
				);
			}

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
						// 個別成功ログは省略
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
				// 価格履歴保存処理
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
						const workIds = Array.from(batchResults.keys());
						logger.warn(`価格履歴保存失敗: ${workIds[index]} - ${result.reason}`);
					}
				});

				// 価格履歴結果ログは省略

				// 失敗データの処理
				const failedIds = batch.filter((id) => !batchResults.has(id));
				for (const workId of failedIds) {
					errors.push({
						workId,
						error: "Individual Info API取得失敗",
						timestamp: new Date().toISOString(),
						errorType: "LOCAL_COLLECTION_FAILED",
					});
					logger.warn(`API取得失敗: ${workId}`);
				}

				// バッチ完了ログは省略（ログ削減）

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

		logger.info(
			`ローカル収集完了: ${results.length}/${assetWorkIds.length}件成功 (成功率${((results.length / assetWorkIds.length) * 100).toFixed(1)}%, ${(processingTime / 1000).toFixed(1)}s)`,
		);
		if (errors.length > 0) {
			logger.warn(`収集失敗: ${errors.length}件`);
		}

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

			// バッチ変換開始

			// APIレスポンスの基本フィールド確認
			const responseStatistics = {
				total: apiResponses.length,
				hasWorkno: apiResponses.filter((r) => r.workno).length,
				hasWorkName: apiResponses.filter((r) => r.work_name).length,
				hasMakerName: apiResponses.filter((r) => r.maker_name).length,
				hasPriceInfo: apiResponses.filter((r) => r.price !== undefined).length,
			};
			// APIレスポンス統計は省略

			const workDataList = batchMapIndividualInfoAPIToWorkData(apiResponses, existingWorksMap);
			// バッチ変換完了

			// APIレスポンスとワークデータを保存（後でサークル・クリエイター収集に使用）
			batch.forEach((item, index) => {
				this.apiResponses.set(item.workId, item.basicInfo);
				if (workDataList[index]) {
					this.workDataMap.set(item.workId, workDataList[index]);
				}
			});

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
				// バッチアップロード成功ログは省略（ログ削減）
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

				// バッチ完了ログは省略（ログ削減）

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
	 * サークル・クリエイター情報の収集
	 */
	async collectCirclesAndCreators(): Promise<void> {
		const startTime = Date.now();

		logger.info("🔄 サークル・クリエイター情報の収集を開始...");
		logger.info(`📊 対象作品数: ${this.apiResponses.size}件`);

		// バッチ処理用のデータを準備
		const worksForCollection: Array<{
			workData: any;
			apiData: IndividualInfoAPIResponse;
			isNewWork: boolean;
		}> = [];

		for (const [workId, apiData] of this.apiResponses) {
			const workData = this.workDataMap.get(workId);
			if (!workData || !apiData) continue;

			worksForCollection.push({
				workData,
				apiData,
				isNewWork: true, // ローカル収集では全て新規扱い
			});
		}

		// バッチ処理でサークル・クリエイター情報を収集
		const result = await batchCollectCircleAndCreatorInfo(worksForCollection);

		if (result.success) {
			logger.info(`✅ サークル・クリエイター情報収集完了: ${result.processed}件処理`);
		} else {
			logger.warn(`⚠️ サークル・クリエイター情報収集一部失敗: ${result.errors.length}件のエラー`);
			result.errors.slice(0, 10).forEach((error) => {
				logger.error(`エラー: ${error.workId} - ${error.error}`);
			});
		}

		// 統計情報を収集
		await this.collectStatistics();

		const duration = Date.now() - startTime;
		logger.info(`✅ サークル・クリエイター情報収集完了: ${duration}ms`);

		// 統計情報の表示
		this.displayCircleCreatorStats();
	}

	/**
	 * 統計情報の収集
	 */
	private async collectStatistics(): Promise<void> {
		// サークル数を取得
		const circlesSnapshot = await firestore.collection("circles").get();
		this.circleStats.totalCircles = circlesSnapshot.size;

		// クリエイターマッピング数を取得
		const mappingsSnapshot = await firestore.collection("creatorWorkMappings").get();
		this.creatorStats.totalMappings = mappingsSnapshot.size;

		// ユニーククリエイター数を計算
		const uniqueCreatorIds = new Set<string>();
		mappingsSnapshot.forEach((doc) => {
			const data = doc.data();
			if (data.creatorId) {
				uniqueCreatorIds.add(data.creatorId);
			}
		});
		this.creatorStats.uniqueCreators = uniqueCreatorIds;
	}

	/**
	 * サークル・クリエイター収集統計の表示
	 */
	private displayCircleCreatorStats(): void {
		console.log("\n=== サークル・クリエイター収集統計 ===");
		console.log(`🏢 サークル数: ${this.circleStats.totalCircles}`);
		console.log(`👥 ユニーククリエイター数: ${this.creatorStats.uniqueCreators.size}`);
		console.log(`🔗 マッピング数: ${this.creatorStats.totalMappings}`);
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
			uploadResult = await collector.uploadToFirestore(collectionResult.collectedData);
			logger.info(
				`Firestore投入完了: ${uploadResult.totalUploaded}/${collectionResult.collectedData.length}件成功`,
			);
			if (uploadResult.totalErrors > 0) {
				logger.warn(`投入失敗: ${uploadResult.totalErrors}件`);
			}

			// サークル・クリエイター情報収集
			await collector.collectCirclesAndCreators();
		}

		// Step 4: メタデータ保存
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
		// DLsite完全データローカル収集ツール開始

		const options = {
			uploadToFirestore: true, // Firestoreへの投入を有効化
			maxWorks: undefined, // 全作品を対象
		};

		const result = await executeCompleteLocalCollection(options);

		console.log("\n=== 完全収集結果 ===");
		console.log(
			`成功: ${result.collection.successfulCollections}/${result.collection.totalAttempted}件 (${((result.collection.successfulCollections / result.collection.totalAttempted) * 100).toFixed(1)}%, ${(result.collection.processingTimeMs / 1000).toFixed(1)}s)`,
		);

		if (result.upload) {
			console.log(
				`Firestore投入: ${result.upload.totalUploaded}件成功, ${result.upload.totalErrors}件失敗`,
			);
		}

		if (result.collection.errors.length > 0) {
			console.log(`\n収集エラー (${result.collection.errors.length}件):`);
			result.collection.errors.slice(0, 5).forEach((error, index) => {
				console.log(`  ${index + 1}. ${error.workId}: ${error.error}`);
			});
			if (result.collection.errors.length > 5) {
				console.log(`  ... 他${result.collection.errors.length - 5}件`);
			}
		}

		// 完全収集ツール実行完了
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
