/**
 * DLsite リージョン制限検出ツール
 *
 * 現在のリージョンで取得できない作品を検出し、
 * リージョン制限フラグを設定してFirestoreに記録する
 *
 * 注意: 判定基準は asset(`dlsite-work-ids.json`)との差分。asset が stale だと誤検出して
 *       Firestore に誤った regionRestricted フラグを書き込むため、実行前に
 *       check:region-equivalence で asset の鮮度と region 等価性を確認すること（SPR-232）。
 *       （旧 docs/DLSITE_REGION_RESTRICTION_DESIGN.md は不在）
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import firestore from "../../infrastructure/database/firestore";
import { collectWorkIdsForProduction } from "../../services/dlsite/work-id-collector";
import { chunkArray } from "../../shared/array-utils";
import * as logger from "../../shared/logger";

// 制限理由の分類
type RegionRestrictionReason =
	| "API_NOT_FOUND" // Individual Info API で404
	| "SEARCH_NOT_VISIBLE" // 検索結果に表示されない
	| "GEOGRAPHIC_RESTRICTION" // 地理的制限
	| "CONTENT_POLICY" // コンテンツポリシー制限
	| "UNKNOWN"; // 不明な理由

// 検出方法の分類
type DetectionMethod =
	| "INDIVIDUAL_API_404" // Individual Info API 404エラー
	| "SEARCH_MISSING" // 検索結果未含有
	| "ASSET_FILE_DIFF" // アセットファイル差分
	| "MANUAL_DETECTION"; // 手動検出

/**
 * リージョン制限作品データの型定義
 */
interface RegionRestrictedWork {
	workId: string;
	title?: string;
	detectedAt: string;
	detectionMethod: DetectionMethod;
	lastAttemptAt: string;
	attemptCount: number;
	errorDetails: {
		httpStatus?: number;
		errorMessage?: string;
		apiEndpoint?: string;
	};
	localDataAvailable?: boolean;
	manualDataEntry?: {
		enteredAt: string;
		enteredBy: string;
		dataSource: string;
	};
}

/**
 * リージョン差異レポートの型定義
 */
interface RegionDifferenceReport {
	totalAssetWorks: number;
	currentRegionWorks: number;
	regionRestrictedWorks: number;
	regionRestrictedIds: string[];
	detectionTimestamp: string;
	coveragePercentage: number;
	missingPercentage: number;
}

/**
 * 検出結果の型定義
 */
interface DetectionResult {
	totalChecked: number;
	restrictedWorksDetected: number;
	restrictedWorkIds: string[];
	newlyDetected: number;
	alreadyKnown: number;
	detectionReport: RegionDifferenceReport;
}

/**
 * リージョン制限検出クラス
 */
class RegionRestrictionDetector {
	private readonly collectionName = "regionRestrictedWorks";

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
	 * リージョン制限作品をFirestoreに記録
	 */
	private async recordRegionRestrictedWork(
		workId: string,
		detectionMethod: DetectionMethod,
		errorDetails: RegionRestrictedWork["errorDetails"] = {},
	): Promise<void> {
		try {
			const now = new Date().toISOString();
			const docRef = firestore.collection(this.collectionName).doc(workId);

			// 既存レコードの確認
			const existingDoc = await docRef.get();
			let attemptCount = 1;

			if (existingDoc.exists) {
				const existingData = existingDoc.data() as RegionRestrictedWork;
				attemptCount = (existingData.attemptCount || 0) + 1;
			}

			const restrictedWork: RegionRestrictedWork = {
				workId,
				detectedAt: existingDoc.exists ? existingDoc.data()?.detectedAt || now : now,
				detectionMethod,
				lastAttemptAt: now,
				attemptCount,
				errorDetails,
				localDataAvailable: false, // ローカル収集で更新予定
			};

			await docRef.set(restrictedWork, { merge: true });
			// リージョン制限記録ログは省略（ログ削減）
		} catch (error) {
			logger.error(`リージョン制限記録エラー: ${workId}`, { error });
		}
	}

	/**
	 * 作品データにリージョン制限フラグを設定
	 */
	private async updateWorkRegionRestriction(
		workId: string,
		restrictionData: {
			regionRestricted: boolean;
			regionRestrictedReason: RegionRestrictionReason;
			regionRestrictedDetectedAt: string;
			lastRegionAttemptAt: string;
		},
	): Promise<void> {
		try {
			const workRef = firestore.collection("works").doc(workId);
			await workRef.update(restrictionData);
			// 作品フラグ更新ログは省略（ログ削減）
		} catch (error) {
			if (error instanceof Error && error.message.includes("No document to update")) {
				// ドキュメントが存在しない場合は作成
				// 作品ドキュメント作成ログは省略（ログ削減）
				await firestore
					.collection("works")
					.doc(workId)
					.set({
						productId: workId,
						...restrictionData,
						// 最低限のメタデータ
						title: `[リージョン制限] ${workId}`,
						createdAt: new Date().toISOString(),
						lastUpdatedAt: new Date().toISOString(),
					});
			} else {
				logger.error(`作品フラグ更新エラー: ${workId}`, { error });
			}
		}
	}

	/**
	 * 既存のリージョン制限作品を取得
	 */
	private async getExistingRestrictedWorks(): Promise<Set<string>> {
		try {
			const snapshot = await firestore.collection(this.collectionName).get();
			const existingIds = new Set<string>();

			snapshot.forEach((doc) => {
				existingIds.add(doc.id);
			});

			return existingIds;
		} catch (error) {
			logger.error("既存制限作品取得エラー:", { error });
			return new Set();
		}
	}

	/**
	 * リージョン制限作品の検出
	 */
	async detectRegionRestrictedWorks(): Promise<DetectionResult> {
		logger.info("🔍 リージョン制限作品検出開始");

		try {
			// 1. データソースの取得
			const assetWorkIds = this.loadAssetFileWorkIds();
			const currentRegionIds = await collectWorkIdsForProduction();
			const existingRestrictedIds = await this.getExistingRestrictedWorks();

			logger.info("📊 データソース確認:");
			logger.info(`  - アセットファイル: ${assetWorkIds.length}件`);
			logger.info(`  - 現在リージョン: ${currentRegionIds.length}件`);
			logger.info(`  - 既知制限作品: ${existingRestrictedIds.size}件`);

			// 2. 制限作品IDの特定
			const currentRegionSet = new Set(currentRegionIds);
			const missingInCurrentRegion = assetWorkIds.filter((id) => !currentRegionSet.has(id));

			logger.info(`🌏 リージョン制限候補: ${missingInCurrentRegion.length}件`);

			// 3. 新規検出作品の特定
			const newlyDetected = missingInCurrentRegion.filter((id) => !existingRestrictedIds.has(id));
			const alreadyKnown = missingInCurrentRegion.filter((id) => existingRestrictedIds.has(id));

			logger.info(`🆕 新規検出: ${newlyDetected.length}件`);
			logger.info(`✅ 既知作品: ${alreadyKnown.length}件`);

			// 4. バッチ処理で新規制限作品を記録
			if (newlyDetected.length > 0) {
				const batches = chunkArray(newlyDetected, 50);
				logger.info(`📦 ${batches.length}バッチで制限作品記録`);

				for (const [batchIndex, batch] of batches.entries()) {
					logger.info(`🔄 バッチ ${batchIndex + 1}/${batches.length} 処理中: ${batch.length}件`);

					// 並列処理で記録
					await Promise.all(
						batch.map(async (workId) => {
							try {
								// リージョン制限コレクションに記録
								await this.recordRegionRestrictedWork(workId, "ASSET_FILE_DIFF");

								// 作品データにフラグ設定
								await this.updateWorkRegionRestriction(workId, {
									regionRestricted: true,
									regionRestrictedReason: "SEARCH_NOT_VISIBLE",
									regionRestrictedDetectedAt: new Date().toISOString(),
									lastRegionAttemptAt: new Date().toISOString(),
								});
							} catch (error) {
								logger.error(`制限作品処理エラー: ${workId}`, { error });
							}
						}),
					);

					logger.info(`✅ バッチ ${batchIndex + 1} 完了`);

					// バッチ間の待機
					if (batchIndex < batches.length - 1) {
						await new Promise((resolve) => setTimeout(resolve, 500));
					}
				}
			}

			// 5. レポート生成
			const detectionReport: RegionDifferenceReport = {
				totalAssetWorks: assetWorkIds.length,
				currentRegionWorks: currentRegionIds.length,
				regionRestrictedWorks: missingInCurrentRegion.length,
				regionRestrictedIds: missingInCurrentRegion,
				detectionTimestamp: new Date().toISOString(),
				coveragePercentage: (currentRegionIds.length / assetWorkIds.length) * 100,
				missingPercentage: (missingInCurrentRegion.length / assetWorkIds.length) * 100,
			};

			const result: DetectionResult = {
				totalChecked: assetWorkIds.length,
				restrictedWorksDetected: missingInCurrentRegion.length,
				restrictedWorkIds: missingInCurrentRegion,
				newlyDetected: newlyDetected.length,
				alreadyKnown: alreadyKnown.length,
				detectionReport,
			};

			logger.info("🎉 リージョン制限検出完了");
			logger.info("📊 検出結果:");
			logger.info(`  - 総チェック作品: ${result.totalChecked}件`);
			logger.info(`  - 制限作品検出: ${result.restrictedWorksDetected}件`);
			logger.info(`  - 新規検出: ${result.newlyDetected}件`);
			logger.info(`  - カバー率: ${detectionReport.coveragePercentage.toFixed(1)}%`);
			logger.info(`  - 制限率: ${detectionReport.missingPercentage.toFixed(1)}%`);

			return result;
		} catch (error) {
			logger.error("リージョン制限検出エラー:", { error });
			throw error;
		}
	}

	/**
	 * 制限作品の統計情報を取得
	 */
	async getRestrictionStatistics(): Promise<{
		totalRestricted: number;
		byDetectionMethod: Record<DetectionMethod, number>;
		recentDetections: RegionRestrictedWork[];
	}> {
		try {
			const snapshot = await firestore.collection(this.collectionName).get();
			const byDetectionMethod: Record<DetectionMethod, number> = {
				INDIVIDUAL_API_404: 0,
				SEARCH_MISSING: 0,
				ASSET_FILE_DIFF: 0,
				MANUAL_DETECTION: 0,
			};
			const recentDetections: RegionRestrictedWork[] = [];

			snapshot.forEach((doc) => {
				const data = doc.data() as RegionRestrictedWork;
				byDetectionMethod[data.detectionMethod] =
					(byDetectionMethod[data.detectionMethod] || 0) + 1;

				// 最近24時間の検出
				const detectedAt = new Date(data.detectedAt);
				const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
				if (detectedAt > oneDayAgo) {
					recentDetections.push(data);
				}
			});

			return {
				totalRestricted: snapshot.size,
				byDetectionMethod,
				recentDetections: recentDetections.sort(
					(a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
				),
			};
		} catch (error) {
			logger.error("制限統計取得エラー:", { error });
			return {
				totalRestricted: 0,
				byDetectionMethod: {
					INDIVIDUAL_API_404: 0,
					SEARCH_MISSING: 0,
					ASSET_FILE_DIFF: 0,
					MANUAL_DETECTION: 0,
				},
				recentDetections: [],
			};
		}
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		logger.info("🚀 DLsite リージョン制限検出ツール開始");

		const detector = new RegionRestrictionDetector();

		// Step 1: 制限作品検出（結果はdetectRegionRestrictedWorks内でログ出力済み）
		await detector.detectRegionRestrictedWorks();

		// Step 2: 統計情報取得・表示
		const statistics = await detector.getRestrictionStatistics();
		logger.info("📊 検出方法別統計", statistics.byDetectionMethod);

		if (statistics.recentDetections.length > 0) {
			logger.info(`🕐 直近24時間の検出: ${statistics.recentDetections.length}件`);
		}

		logger.info("🎉 リージョン制限検出ツール完了");
	} catch (error) {
		logger.error("メイン処理エラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	}
}

// 名前付きエクスポート
export {
	type DetectionResult,
	type RegionDifferenceReport,
	type RegionRestrictedWork,
	RegionRestrictionDetector,
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
