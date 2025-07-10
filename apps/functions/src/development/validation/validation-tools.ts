/**
 * テスト・検証ツール統合版
 *
 * 元ファイル: test-firestore-save.ts, check-age-categories.ts
 * Firestore保存テスト・データ品質検証・年齢カテゴリ確認を行う統合ツール
 */

import { Firestore } from "@google-cloud/firestore";
import { generateDLsiteHeaders } from "../../infrastructure/management/user-agent-manager";
import { getExistingWorksMap, saveWorksToFirestore } from "../../services/dlsite/dlsite-firestore";
import {
	type IndividualInfoAPIResponse,
	mapIndividualInfoAPIToWorkData,
	validateAPIOnlyWorkData,
} from "../../services/dlsite/individual-info-to-work-mapper";
import * as logger from "../../shared/logger";

const INDIVIDUAL_INFO_API_BASE_URL = "https://www.dlsite.com/maniax/api/=/product.json";

// 問題のある作品IDのサンプル
const TEST_WORK_IDS = [
	"RJ01145117", // 無料作品
	"RJ01133519", // 無料作品
	"RJ01037463", // 通常作品（涼花みなせ）
	"RJ01415251", // 翻訳作品
];

const firestore = new Firestore({
	projectId: process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click",
});

/**
 * 作品データの取得からFirestore保存まで完全テスト
 */
async function testCompleteWorkflow(workId: string): Promise<boolean> {
	try {
		logger.info("完全ワークフローテスト開始", { workId, operation: "testCompleteWorkflow" });

		// 1. Individual Info API からデータ取得
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();
		const response = await fetch(url, { method: "GET", headers });

		if (!response.ok) {
			logger.warn("API取得失敗", {
				workId,
				status: response.status,
				operation: "testCompleteWorkflow",
			});
			return false;
		}

		const responseData = await response.json();
		if (!Array.isArray(responseData) || responseData.length === 0) {
			logger.warn("無効なAPIレスポンス", { workId, operation: "testCompleteWorkflow" });
			return false;
		}

		const apiData = responseData[0] as IndividualInfoAPIResponse;
		logger.info("APIデータ取得成功", {
			workId,
			dataKeys: Object.keys(apiData),
			operation: "testCompleteWorkflow",
		});

		// 2. 既存データマップ取得
		const existingWorksMap = await getExistingWorksMap([workId]);
		logger.info("既存データ確認", {
			workId,
			hasExisting: existingWorksMap.has(workId),
			operation: "testCompleteWorkflow",
		});

		// 3. データ変換
		const workData = mapIndividualInfoAPIToWorkData(apiData, existingWorksMap);
		logger.info("データ変換成功", {
			workId,
			convertedKeys: Object.keys(workData),
			operation: "testCompleteWorkflow",
		});

		// 4. データ検証
		const validation = validateAPIOnlyWorkData(workData);
		if (!validation.isValid) {
			logger.warn("データ検証失敗", {
				workId,
				errors: validation.errors,
				operation: "testCompleteWorkflow",
			});
			return false;
		}

		logger.info("データ検証成功", { workId, operation: "testCompleteWorkflow" });

		// 5. Firestore保存テスト
		await saveWorksToFirestore([workData]);
		logger.info("Firestore保存成功", { workId, operation: "testCompleteWorkflow" });

		return true;
	} catch (error) {
		logger.error("完全ワークフローテストエラー", {
			workId,
			error: error instanceof Error ? error.message : error,
			operation: "testCompleteWorkflow",
		});
		return false;
	}
}

/**
 * 複数作品の一括テスト
 */
export async function runBatchWorkflowTest(workIds?: string[]): Promise<void> {
	const testIds = workIds || TEST_WORK_IDS;
	logger.info("バッチワークフローテスト開始", {
		workIds: testIds,
		count: testIds.length,
		operation: "runBatchWorkflowTest",
	});

	const results = [];
	for (const workId of testIds) {
		const success = await testCompleteWorkflow(workId);
		results.push({ workId, success });

		// レート制限対応
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	const successCount = results.filter((r) => r.success).length;
	const failureCount = results.length - successCount;

	logger.info("バッチワークフローテスト結果", {
		totalTests: results.length,
		successCount,
		failureCount,
		successRate: Number(((successCount / results.length) * 100).toFixed(1)),
		results,
		operation: "runBatchWorkflowTest",
	});
}

/**
 * 年齢カテゴリ情報の確認・統計
 */
export async function checkAgeCategories(sampleSize = 10): Promise<void> {
	logger.info("年齢カテゴリ確認開始", {
		sampleSize,
		operation: "checkAgeCategories",
	});

	try {
		// サンプルデータの確認
		const snapshot = await firestore.collection("dlsiteWorks").limit(sampleSize).get();
		const ageCategoryStats = new Map<string, number>();

		snapshot.forEach((doc) => {
			const data = doc.data();
			const ageRating = data.ageRating;

			logger.info("作品情報", {
				workId: doc.id,
				title: data.title,
				ageRating,
				dataSources: data.dataSources ? Object.keys(data.dataSources) : "none",
			});

			// 統計を集計
			const key = ageRating || "undefined";
			ageCategoryStats.set(key, (ageCategoryStats.get(key) || 0) + 1);
		});

		const statsArray = Array.from(ageCategoryStats.entries()).map(([ageRating, count]) => ({
			ageRating,
			count,
		}));
		logger.info(`年齢カテゴリ統計（サンプル${sampleSize}件）`, {
			operation: "checkAgeCategories",
			stats: statsArray,
		});

		// 全体の統計も取得
		const allSnapshot = await firestore.collection("dlsiteWorks").get();
		const totalStats = new Map<string, number>();

		allSnapshot.forEach((doc) => {
			const data = doc.data();
			const ageRating = data.ageRating;
			const key = ageRating || "undefined";
			totalStats.set(key, (totalStats.get(key) || 0) + 1);
		});

		const totalStatsArray = Array.from(totalStats.entries())
			.map(([ageRating, count]) => ({ ageRating, count }))
			.sort((a, b) => b.count - a.count);

		logger.info("年齢カテゴリ統計（全体）", {
			operation: "checkAgeCategories",
			totalWorks: allSnapshot.size,
			stats: totalStatsArray,
		});
	} catch (error) {
		logger.error("年齢カテゴリ確認エラー", {
			error: error instanceof Error ? error.message : error,
			operation: "checkAgeCategories",
		});
		throw error;
	}
}

/**
 * データ品質検証
 */
export async function validateDataQuality(sampleSize = 50): Promise<void> {
	logger.info("データ品質検証開始", {
		sampleSize,
		operation: "validateDataQuality",
	});

	try {
		const snapshot = await firestore.collection("dlsiteWorks").limit(sampleSize).get();
		const qualityReport = {
			totalChecked: 0,
			missingFields: new Map<string, number>(),
			invalidData: [] as {
				workId: string;
				missingFields?: string[];
				issue?: string;
				priceData?: unknown;
			}[],
			validData: 0,
		};

		snapshot.forEach((doc) => {
			const data = doc.data();
			const workId = doc.id;
			qualityReport.totalChecked++;

			// 必須フィールドのチェック
			const requiredFields = ["title", "circle", "productId", "price"];
			const missingFields = requiredFields.filter((field) => !data[field]);

			if (missingFields.length > 0) {
				missingFields.forEach((field) => {
					qualityReport.missingFields.set(field, (qualityReport.missingFields.get(field) || 0) + 1);
				});
				qualityReport.invalidData.push({
					workId,
					missingFields,
				});
			} else {
				qualityReport.validData++;
			}

			// 価格の妥当性チェック
			if (data.price && typeof data.price.current !== "number") {
				qualityReport.invalidData.push({
					workId,
					issue: "invalid_price_format",
					priceData: data.price,
				});
			}
		});

		const qualityRate = (qualityReport.validData / qualityReport.totalChecked) * 100;

		logger.info("データ品質検証結果", {
			operation: "validateDataQuality",
			totalChecked: qualityReport.totalChecked,
			validData: qualityReport.validData,
			invalidData: qualityReport.invalidData.length,
			qualityRate: Number(qualityRate.toFixed(1)),
			missingFieldsStats: Object.fromEntries(qualityReport.missingFields),
			invalidDataSample: qualityReport.invalidData.slice(0, 5),
		});
	} catch (error) {
		logger.error("データ品質検証エラー", {
			error: error instanceof Error ? error.message : error,
			operation: "validateDataQuality",
		});
		throw error;
	}
}

/**
 * Firestore接続テスト
 */
export async function testFirestoreConnection(): Promise<void> {
	logger.info("Firestore接続テスト開始", { operation: "testFirestoreConnection" });

	try {
		// 基本的な読み取りテスト
		const testSnapshot = await firestore.collection("dlsiteWorks").limit(1).get();

		if (testSnapshot.empty) {
			logger.warn("データが存在しません", { operation: "testFirestoreConnection" });
		} else {
			logger.info("Firestore接続成功", {
				operation: "testFirestoreConnection",
				sampleDocId: testSnapshot.docs[0].id,
			});
		}

		// 書き込みテスト（テスト用ドキュメント）
		const testDocRef = firestore.collection("test").doc("connection-test");
		await testDocRef.set({
			timestamp: new Date(),
			testValue: "validation-tools-test",
		});

		// テスト用ドキュメントを削除
		await testDocRef.delete();

		logger.info("Firestore読み書きテスト成功", { operation: "testFirestoreConnection" });
	} catch (error) {
		logger.error("Firestore接続テストエラー", {
			error: error instanceof Error ? error.message : error,
			operation: "testFirestoreConnection",
		});
		throw error;
	}
}

/**
 * 統合検証ツールの実行
 */
export async function runValidationSuite(): Promise<void> {
	logger.info("統合検証ツール開始", { operation: "runValidationSuite" });

	try {
		// 1. Firestore接続テスト
		await testFirestoreConnection();

		// 2. 年齢カテゴリ確認
		await checkAgeCategories(10);

		// 3. データ品質検証
		await validateDataQuality(50);

		// 4. ワークフローテスト
		await runBatchWorkflowTest();

		logger.info("統合検証ツール完了", { operation: "runValidationSuite" });
	} catch (error) {
		logger.error("統合検証ツールエラー", {
			error: error instanceof Error ? error.message : error,
			operation: "runValidationSuite",
		});
		throw error;
	}
}

// スクリプト実行
if (require.main === module) {
	const testType = process.argv[2] || "suite";

	const runTest = async () => {
		switch (testType) {
			case "workflow":
				await runBatchWorkflowTest();
				break;
			case "age-categories":
				await checkAgeCategories(20);
				break;
			case "data-quality":
				await validateDataQuality(100);
				break;
			case "connection":
				await testFirestoreConnection();
				break;
			default:
				await runValidationSuite();
				break;
		}
	};

	runTest().catch((error) => {
		logger.error("Validation tools execution error", {
			error: error instanceof Error ? error.message : error,
		});
		process.exit(1);
	});
}
