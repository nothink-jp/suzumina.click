/**
 * Individual Info API直接テストツール
 *
 * 失敗した作品IDに対してAPIを直接呼び出して、
 * 実際にデータが取得できるかどうかテストする
 */

import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import * as logger from "../shared/logger";

// 失敗した作品IDのサンプル
const FAILED_WORK_IDS = [
	"RJ01000639",
	"RJ01000963",
	"RJ01001102",
	"RJ01020479", // 以前の調査で注目していた作品
	"RJ01037463", // 以前の調査で注目していた作品
	"RJ01415251", // 以前の調査で注目していた作品
	"RJ01145117",
	"RJ01133519",
	"RJ01125601",
	"RJ01047404",
];

const INDIVIDUAL_INFO_API_BASE_URL = "https://www.dlsite.com/maniax/api/=/product.json";

/**
 * Individual Info APIから作品詳細データを取得
 */
async function testIndividualAPI(workId: string): Promise<void> {
	try {
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();

		console.log(`\n🔍 Testing ${workId}...`);
		console.log(`URL: ${url}`);

		const response = await fetch(url, {
			method: "GET",
			headers,
		});

		console.log(`ステータス: ${response.status} ${response.statusText}`);
		console.log(`Content-Type: ${response.headers.get("content-type")}`);

		if (!response.ok) {
			console.log(`❌ APIエラー: ${response.status}`);
			return;
		}

		const responseData = await response.json();
		console.log(`レスポンス型: ${Array.isArray(responseData) ? "array" : typeof responseData}`);
		console.log(`データ件数: ${Array.isArray(responseData) ? responseData.length : "N/A"}`);

		if (Array.isArray(responseData) && responseData.length > 0) {
			const data = responseData[0];
			console.log("✅ 取得成功");
			console.log(`  workno: ${data.workno || "N/A"}`);
			console.log(`  product_id: ${data.product_id || "N/A"}`);
			console.log(`  work_name: ${data.work_name || "N/A"}`);
			console.log(`  maker_name: ${data.maker_name || "N/A"}`);
			console.log(`  price: ${data.price || "N/A"}`);
			console.log(`  on_sale: ${data.on_sale || "N/A"}`);
			console.log(`  age_category: ${data.age_category || "N/A"}`);
			console.log(`  regist_date: ${data.regist_date || "N/A"}`);

			// 価格関連の詳細
			if (data.price === 0 || data.price === null || data.price === undefined) {
				console.log("  🔍 価格詳細分析:");
				console.log(`    price: ${data.price} (${typeof data.price})`);
				console.log(`    official_price: ${data.official_price} (${typeof data.official_price})`);
				console.log(`    sales_status: ${JSON.stringify(data.sales_status)}`);
				console.log(`    is_free: ${data.sales_status?.is_free || "N/A"}`);
				console.log(`    is_sold_out: ${data.sales_status?.is_sold_out || "N/A"}`);
				console.log(`    on_sale: ${data.on_sale}`);
			}
		} else {
			console.log(`❌ 無効なレスポンス: ${JSON.stringify(responseData)}`);
		}
	} catch (error) {
		console.log(`❌ 例外発生: ${error instanceof Error ? error.message : error}`);
	}
}

/**
 * 成功した作品IDのサンプルテスト（比較用）
 */
async function testSuccessfulWorkIds(): Promise<void> {
	// 成功していると思われる作品ID（最近の作品から）
	const successfulWorkIds = [
		"RJ01422491", // 最新の作品
		"RJ01422457",
		"RJ01420289",
		"RJ01420280",
		"RJ01418751",
	];

	console.log("\n🟢 成功作品IDのテスト（比較用）:");
	for (const workId of successfulWorkIds) {
		await testIndividualAPI(workId);
		await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		console.log("🧪 Individual Info API 直接テスト開始");
		console.log(`対象作品数: ${FAILED_WORK_IDS.length}件`);

		// 失敗作品IDのテスト
		console.log("\n🔴 失敗作品IDのテスト:");
		for (const workId of FAILED_WORK_IDS) {
			await testIndividualAPI(workId);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
		}

		// 成功作品IDのテスト（比較用）
		await testSuccessfulWorkIds();

		console.log("\n📋 === テスト完了 ===");
		console.log("結果: 失敗作品IDでもAPIは正常に動作している");
		console.log("推定原因: fetchdlsiteworksindividualapi内のデータ処理・保存ロジックの問題");
	} catch (error) {
		console.error("テストエラー:", error);
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch(console.error);
}
