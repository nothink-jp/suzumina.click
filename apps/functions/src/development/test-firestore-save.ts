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
		console.log(`\n🔍 ${workId} 完全ワークフローテスト開始`);

		// 1. Individual Info API からデータ取得
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();
		const response = await fetch(url, { method: "GET", headers });

		if (!response.ok) {
			console.log(`❌ API取得失敗: ${response.status}`);
			return false;
		}

		const responseData = await response.json();
		if (!Array.isArray(responseData) || responseData.length === 0) {
			console.log("❌ 無効なAPIレスポンス");
			return false;
		}

		const apiData = responseData[0] as IndividualInfoAPIResponse;
		console.log(`✅ API取得成功: ${apiData.work_name}`);

		// 2. データ変換
		const workData = mapIndividualInfoAPIToWorkData(apiData);
		console.log("✅ データ変換成功");

		// 3. 既存データ確認テスト
		console.log("🔍 既存データ確認テスト:");
		try {
			const existingWorksMap = await getExistingWorksMap([workId]);
			console.log(`✅ 既存データ確認成功: ${existingWorksMap.size}件`);
		} catch (error) {
			console.log(`❌ 既存データ確認失敗: ${error instanceof Error ? error.message : error}`);
			// エラーが発生しても処理は継続
		}

		// 4. Firestore保存テスト
		console.log("💾 Firestore保存テスト:");
		try {
			await saveWorksToFirestore([workData]);
			console.log("✅ Firestore保存成功");
		} catch (error) {
			console.log(`❌ Firestore保存失敗: ${error instanceof Error ? error.message : error}`);
			return false;
		}

		// 5. 保存確認
		console.log("🔍 保存確認テスト:");
		try {
			const savedWorksMap = await getExistingWorksMap([workId]);
			if (savedWorksMap.has(workId)) {
				console.log("✅ 保存確認成功: データが正常に保存されました");
				return true;
			}
			console.log("❌ 保存確認失敗: データが見つかりません");
			return false;
		} catch (error) {
			console.log(`❌ 保存確認失敗: ${error instanceof Error ? error.message : error}`);
			return false;
		}
	} catch (error) {
		console.log(`❌ 処理中にエラー: ${error instanceof Error ? error.message : error}`);
		return false;
	}
}

/**
 * 既存データ確認の詳細テスト
 */
async function testExistingDataRetrieval(): Promise<void> {
	console.log("\n🔍 既存データ確認詳細テスト");

	try {
		// 1. 全作品IDリストでテスト（分割処理の確認）
		console.log("📋 全作品IDリストでテスト:");
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
		console.log(`結果: ${existingWorksMap.size}/${allWorkIds.length}件取得`);

		// 2. 各作品の詳細確認
		for (const workId of TEST_WORK_IDS) {
			const exists = existingWorksMap.has(workId);
			console.log(`  ${workId}: ${exists ? "✅ 存在" : "❌ 不在"}`);
		}

		// 3. 個別取得テスト
		console.log("\n📋 個別取得テスト:");
		for (const workId of TEST_WORK_IDS) {
			try {
				const singleWorkMap = await getExistingWorksMap([workId]);
				console.log(`  ${workId}: ${singleWorkMap.has(workId) ? "✅ 存在" : "❌ 不在"}`);
			} catch (error) {
				console.log(`  ${workId}: ❌ エラー (${error instanceof Error ? error.message : error})`);
			}
		}
	} catch (error) {
		console.log(`❌ 既存データ確認テストエラー: ${error instanceof Error ? error.message : error}`);
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		console.log("🧪 Firestore保存処理テストツール開始");

		// 1. 既存データ確認テスト
		await testExistingDataRetrieval();

		// 2. 完全ワークフローテスト
		console.log("\n🔄 完全ワークフローテスト:");
		let successCount = 0;

		for (const workId of TEST_WORK_IDS) {
			const success = await testCompleteWorkflow(workId);
			if (success) {
				successCount++;
			}
			// 1秒待機
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		console.log("\n📋 === テスト結果 ===");
		console.log(`成功: ${successCount}/${TEST_WORK_IDS.length}件`);
		console.log(`成功率: ${((successCount / TEST_WORK_IDS.length) * 100).toFixed(1)}%`);

		if (successCount === TEST_WORK_IDS.length) {
			console.log("✅ すべてのテストが成功しました");
			console.log(
				"推定：実際のfetchdlsiteworksindividualapi実行時に別の問題が発生している可能性があります",
			);
		} else {
			console.log("❌ 一部のテストが失敗しました");
			console.log("推定：Firestore保存処理に問題があります");
		}
	} catch (error) {
		console.error("テストエラー:", error);
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch(console.error);
}
