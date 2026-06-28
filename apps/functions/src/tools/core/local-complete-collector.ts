/**
 * DLsite完全データローカル収集ツール
 *
 * ローカル環境（日本）で全作品の完全データ収集を実行し
 * リージョン制限作品を含む全作品情報をCloud Firestoreに安全に投入する
 *
 * 背景: asset(`dlsite-work-ids.json`)との region 突合に依存。asset 削除の可否は SPR-232 で評価中。
 *       region 等価性の確認は check:region-equivalence（旧 docs/DLSITE_REGION_RESTRICTION_DESIGN.md は不在）。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DLsiteApiResponse } from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import { batchFetchIndividualInfo } from "../../services/dlsite/individual-info-api-client";
import { processBatchUnifiedDLsiteData } from "../../services/dlsite/unified-data-processor";
import { chunkArray } from "../../shared/array-utils";
import * as logger from "../../shared/logger";

// ローカル環境用設定（高速化版: DLsiteへの負荷を考慮しつつ高速実行）
const MAX_CONCURRENT_REQUESTS = 5; // 同時実行数を増加（推奨値）
const REQUEST_DELAY = 400; // 0.4秒間隔（安全な範囲で短縮）
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
	basicInfo: DLsiteApiResponse;
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

	// APIレスポンスの保存用（統計収集のため）
	private apiResponses = new Map<string, DLsiteApiResponse>();

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
	 * バッチ進捗のログ出力
	 */
	private logBatchProgress(batchIndex: number, totalBatches: number): void {
		if (batchIndex % 10 === 0 || batchIndex === totalBatches - 1) {
			logger.info(
				`バッチ進捗: ${batchIndex + 1}/${totalBatches} (${Math.round(((batchIndex + 1) / totalBatches) * 100)}%)`,
			);
		}
	}

	/**
	 * 成功データの処理
	 */
	private processSuccessfulData(
		workId: string,
		apiData: DLsiteApiResponse,
		processingResult: { success: boolean; errors: string[] },
	): LocalCollectedWorkData | null {
		if (!processingResult?.success) {
			return null;
		}

		const localData: LocalCollectedWorkData = {
			workId,
			collectedAt: new Date().toISOString(),
			collectionMethod: "INDIVIDUAL_API",
			basicInfo: apiData,
			metadata: {
				collectorVersion: this.collectorVersion,
				collectionEnvironment: this.collectionEnvironment,
				dataQuality: "COMPLETE",
				verificationStatus: true,
			},
		};

		// APIレスポンスを保存（後でサークル・クリエイター収集に使用）
		this.apiResponses.set(workId, apiData);

		return localData;
	}

	/**
	 * エラーの作成
	 */
	private createError(
		workId: string,
		errorMessage: string,
		errorType: CollectionError["errorType"],
	): CollectionError {
		return {
			workId,
			error: errorMessage,
			timestamp: new Date().toISOString(),
			errorType,
		};
	}

	/**
	 * バッチ処理の実行
	 */
	private async processBatch(
		batch: string[],
		batchIndex: number,
		results: LocalCollectedWorkData[],
		errors: CollectionError[],
	): Promise<void> {
		try {
			// バッチでデータ取得
			const { results: batchResults } = await batchFetchIndividualInfo(batch, {
				maxConcurrent: MAX_CONCURRENT_REQUESTS,
				batchDelay: REQUEST_DELAY,
			});

			// 成功データの処理
			const apiResponses = Array.from(batchResults.values());

			// 統合処理を使用
			const processingResults = await processBatchUnifiedDLsiteData(apiResponses, {
				skipPriceHistory: false, // 価格履歴も含めて全て更新
				forceUpdate: false, // 差分チェックあり
			});

			// 結果の集計
			for (const [index, [workId, apiData]] of Array.from(batchResults.entries()).entries()) {
				const processingResult = processingResults[index];

				if (processingResult) {
					const localData = this.processSuccessfulData(workId, apiData, processingResult);
					if (localData) {
						results.push(localData);
					} else {
						errors.push(
							this.createError(workId, processingResult.errors.join(", "), "VALIDATION_ERROR"),
						);
					}
				} else {
					// processingResultがundefinedの場合
					errors.push(
						this.createError(workId, "処理結果が取得できませんでした", "VALIDATION_ERROR"),
					);
				}
			}

			// 失敗データの処理
			const failedIds = batch.filter((id) => !batchResults.has(id));
			for (const workId of failedIds) {
				errors.push(
					this.createError(workId, "Individual Info API取得失敗", "LOCAL_COLLECTION_FAILED"),
				);
				logger.warn(`API取得失敗: ${workId}`);
			}
		} catch (error) {
			logger.error(`❌ バッチ ${batchIndex + 1} エラー:`, { error });
			// バッチ全体が失敗した場合
			for (const workId of batch) {
				errors.push(
					this.createError(
						workId,
						error instanceof Error ? error.message : String(error),
						"API_ERROR",
					),
				);
			}
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

		for (const [batchIndex, batch] of batches.entries()) {
			// 進捗ログを出力
			this.logBatchProgress(batchIndex, batches.length);

			// バッチ処理を実行
			await this.processBatch(batch, batchIndex, results, errors);

			// バッチ間の待機
			if (batchIndex < batches.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
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
	 * アップロード結果の集計を返す。
	 *
	 * 注意: 実際の Firestore 書き込みは収集時の統合処理（processBatchUnifiedDLsiteData）で
	 * 既に完了している。このメソッドは書き込みを行わず、件数の集計結果のみを返す。
	 */
	summarizeUploadResult(localData: LocalCollectedWorkData[]): UploadResult {
		// 統合処理で既にアップロード済みなので、結果を集計するのみ
		return {
			totalBatches: 1,
			successfulBatches: 1,
			totalUploaded: localData.length,
			totalErrors: 0,
			errors: [],
		};
	}

	/**
	 * サークル・クリエイター情報の収集
	 */
	async collectCirclesAndCreators(): Promise<void> {
		const startTime = Date.now();

		logger.info("🔄 サークル・クリエイター情報の収集を開始...");
		logger.info(`📊 対象作品数: ${this.apiResponses.size}件`);

		// 統合処理ですでにサークル・クリエイター情報は更新済み
		// ここでは統計情報の収集のみ行う

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

		// クリエイター数を取得（新しいcreatorsコレクション）
		const creatorsSnapshot = await firestore.collection("creators").get();
		this.creatorStats.uniqueCreators = new Set(creatorsSnapshot.docs.map((doc) => doc.id));

		// 全クリエイターの作品マッピング数を集計
		let totalMappings = 0;
		for (const creatorDoc of creatorsSnapshot.docs) {
			const worksSnapshot = await creatorDoc.ref.collection("works").get();
			totalMappings += worksSnapshot.size;
		}
		this.creatorStats.totalMappings = totalMappings;
	}

	/**
	 * サークル・クリエイター収集統計の表示
	 */
	private displayCircleCreatorStats(): void {
		logger.info("\n=== サークル・クリエイター収集統計 ===");
		logger.info(`🏢 サークル数: ${this.circleStats.totalCircles}`);
		logger.info(`👥 ユニーククリエイター数: ${this.creatorStats.uniqueCreators.size}`);
		logger.info(`🔗 マッピング数: ${this.creatorStats.totalMappings}`);
	}

	/**
	 * メタデータの保存
	 */
	async saveCollectionMetadata(
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
	/** アップロード結果の集計を行うか（実書き込みは収集時に完了済み。集計＋サークル/クリエイター収集のみ） */
	summarizeResults?: boolean;
	maxWorks?: number;
}): Promise<{ collection: LocalCollectionResult; upload?: UploadResult }> {
	const collector = new LocalDataCollector();
	let collectionResult: LocalCollectionResult;
	let uploadResult: UploadResult | undefined;

	try {
		// Step 1: ローカルデータ収集
		logger.info("🎯 Step 1: ローカル完全データ収集");
		collectionResult = await collector.collectCompleteLocalData();

		// Step 2: アップロード結果の集計（実書き込みは Step 1 の統合処理で完了済み・オプション）
		if (options?.summarizeResults && collectionResult.collectedData.length > 0) {
			uploadResult = collector.summarizeUploadResult(collectionResult.collectedData);
			logger.info(
				`アップロード結果集計: ${uploadResult.totalUploaded}/${collectionResult.collectedData.length}件成功`,
			);
			if (uploadResult.totalErrors > 0) {
				logger.warn(`アップロード失敗: ${uploadResult.totalErrors}件`);
			}

			// サークル・クリエイター情報収集
			await collector.collectCirclesAndCreators();
		}

		// Step 4: メタデータ保存
		await collector.saveCollectionMetadata(collectionResult, uploadResult);

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
		const options = {
			summarizeResults: true,
			maxWorks: undefined,
		};

		const result = await executeCompleteLocalCollection(options);

		logger.info("\n=== 完全収集結果 ===");
		logger.info(
			`成功: ${result.collection.successfulCollections}/${result.collection.totalAttempted}件 (${((result.collection.successfulCollections / result.collection.totalAttempted) * 100).toFixed(1)}%, ${(result.collection.processingTimeMs / 1000).toFixed(1)}s)`,
		);

		if (result.upload) {
			logger.info(
				`Firestore投入: ${result.upload.totalUploaded}件成功, ${result.upload.totalErrors}件失敗`,
			);
		}

		if (result.collection.errors.length > 0) {
			logger.error(`\n収集エラー (${result.collection.errors.length}件):`);
			result.collection.errors.slice(0, 5).forEach((error, index) => {
				logger.error(`  ${index + 1}. ${error.workId}: ${error.error}`);
			});
			if (result.collection.errors.length > 5) {
				logger.info(`  ... 他${result.collection.errors.length - 5}件`);
			}
		}
	} catch (error) {
		logger.error("メイン処理エラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	}
}

// 名前付きエクスポート
export {
	executeCompleteLocalCollection,
	type LocalCollectedWorkData,
	type LocalCollectionResult,
	LocalDataCollector,
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
