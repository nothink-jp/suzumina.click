/**
 * Firestore保存処理テストツール
 *
 * 問題のある作品IDでFirestore保存処理を直接テストして、
 * 実際の保存失敗原因を特定する
 */

import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import { getExistingWorksMap, saveWorksToFirestore } from "../services/dlsite/dlsite-firestore";
import {
	type IndividualInfoAPIResponse,
	mapIndividualInfoAPIToWorkData,
} from "../services/dlsite/individual-info-to-work-mapper";
import * as logger from "../shared/logger";

const INDIVIDUAL_INFO_API_BASE_URL = "https://www.dlsite.com/maniax/api/=/product.json";

// 問題のある作品IDのサンプル
const TEST_WORK_IDS = [
	"RJ01145117", // 無料作品
	"RJ01133519", // 無料作品
	"RJ01037463", // 通常作品（涼花みなせ）
	"RJ01415251", // 翻訳作品
];

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
		logger.info("API取得成功", {
			workId,
			title: apiData.work_name,
			operation: "testCompleteWorkflow",
		});

		// 2. データ変換
		const workData = mapIndividualInfoAPIToWorkData(apiData);
		logger.info("データ変換成功", { workId, operation: "testCompleteWorkflow" });

		// 3. 既存データ確認テスト
		logger.info("既存データ確認テスト開始", { workId, operation: "testCompleteWorkflow" });
		try {
			const existingWorksMap = await getExistingWorksMap([workId]);
			logger.info("既存データ確認成功", {
				workId,
				count: existingWorksMap.size,
				operation: "testCompleteWorkflow",
			});
		} catch (error) {
			logger.warn("既存データ確認失敗", {
				workId,
				error: error instanceof Error ? error.message : String(error),
				operation: "testCompleteWorkflow",
			});
			// エラーが発生しても処理は継続
		}

		// 4. Firestore保存テスト
		logger.info("Firestore保存テスト開始", { workId, operation: "testCompleteWorkflow" });
		try {
			await saveWorksToFirestore([workData]);
			logger.info("Firestore保存成功", { workId, operation: "testCompleteWorkflow" });
		} catch (error) {
			logger.error("Firestore保存失敗", {
				workId,
				error: error instanceof Error ? error.message : String(error),
				operation: "testCompleteWorkflow",
			});
			return false;
		}

		// 5. 保存確認
		logger.info("保存確認テスト開始", { workId, operation: "testCompleteWorkflow" });
		try {
			const savedWorksMap = await getExistingWorksMap([workId]);
			if (savedWorksMap.has(workId)) {
				logger.info("保存確認成功", { workId, operation: "testCompleteWorkflow" });
				return true;
			}
			logger.warn("保存確認失敗", {
				workId,
				reason: "データが見つかりません",
				operation: "testCompleteWorkflow",
			});
			return false;
		} catch (error) {
			logger.error("保存確認失敗", {
				workId,
				error: error instanceof Error ? error.message : String(error),
				operation: "testCompleteWorkflow",
			});
			return false;
		}
	} catch (error) {
		logger.error("処理中にエラー", {
			workId,
			error: error instanceof Error ? error.message : String(error),
			operation: "testCompleteWorkflow",
		});
		return false;
	}
}

/**
 * 既存データ確認の詳細テスト
 */
async function testExistingDataRetrieval(): Promise<void> {
	logger.info("既存データ確認詳細テスト開始", { operation: "testExistingDataRetrieval" });

	try {
		// 1. 全作品IDリストでテスト（分割処理の確認）
		logger.info("全作品IDリストテスト開始", { operation: "testExistingDataRetrieval" });
		const allWorkIds = TEST_WORK_IDS.concat([
			"RJ01000639",
			"RJ01000963",
			"RJ01001102",
			"RJ01001104",
			"RJ01001212",
			"RJ01002873",
			"RJ01004387",
			"RJ01004682",
			"RJ01005852",
			"RJ01006231",
		]);

		const existingWorksMap = await getExistingWorksMap(allWorkIds);
		logger.info("全作品IDリストテスト結果", {
			found: existingWorksMap.size,
			total: allWorkIds.length,
			operation: "testExistingDataRetrieval",
		});

		// 2. 各作品の詳細確認
		const detailResults = TEST_WORK_IDS.map((workId) => ({
			workId,
			exists: existingWorksMap.has(workId),
		}));
		logger.info("作品詳細確認結果", {
			results: detailResults,
			operation: "testExistingDataRetrieval",
		});

		// 3. 個別取得テスト
		logger.info("個別取得テスト開始", { operation: "testExistingDataRetrieval" });
		const individualResults: Array<{ workId: string; exists: boolean; error: string | null }> = [];
		for (const workId of TEST_WORK_IDS) {
			try {
				const singleWorkMap = await getExistingWorksMap([workId]);
				individualResults.push({ workId, exists: singleWorkMap.has(workId), error: null });
			} catch (error) {
				individualResults.push({
					workId,
					exists: false,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		logger.info("個別取得テスト結果", {
			results: individualResults,
			operation: "testExistingDataRetrieval",
		});
	} catch (error) {
		logger.error("既存データ確認テストエラー", {
			error: error instanceof Error ? error.message : String(error),
			operation: "testExistingDataRetrieval",
		});
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		logger.info("Firestore保存処理テストツール開始", { operation: "main" });

		// 1. 既存データ確認テスト
		await testExistingDataRetrieval();

		// 2. 完全ワークフローテスト
		logger.info("完全ワークフローテスト開始", { operation: "main" });
		let successCount = 0;

		for (const workId of TEST_WORK_IDS) {
			const success = await testCompleteWorkflow(workId);
			if (success) {
				successCount++;
			}
			// 1秒待機
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		const successRate = ((successCount / TEST_WORK_IDS.length) * 100).toFixed(1);
		logger.info("テスト結果", {
			successCount,
			total: TEST_WORK_IDS.length,
			successRate: `${successRate}%`,
			operation: "main",
		});

		if (successCount === TEST_WORK_IDS.length) {
			logger.info("全テスト成功", {
				conclusion: "実際のfetchdlsiteworksindividualapi実行時に別の問題が発生している可能性",
				operation: "main",
			});
		} else {
			logger.warn("一部テスト失敗", {
				conclusion: "Firestore保存処理に問題がある可能性",
				operation: "main",
			});
		}
	} catch (error) {
		logger.error("テストエラー", {
			error: error instanceof Error ? error.message : String(error),
			operation: "main",
		});
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch((error) => {
		logger.error("スクリプト実行エラー", {
			error: error instanceof Error ? error.message : String(error),
			operation: "script",
		});
		process.exit(1);
	});
}
