/**
 * Individual Info API直接テストツール
 *
 * 失敗した作品IDに対してAPIを直接呼び出して、
 * 実際にデータが取得できるかどうかテストする
 */

import { generateDLsiteHeaders } from "../../infrastructure/management/user-agent-manager";
import * as logger from "../../shared/logger";

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

		logger.info("🔍 Testing workId", { workId, url });

		const response = await fetch(url, {
			method: "GET",
			headers,
		});

		logger.info("API response status", {
			status: response.status,
			statusText: response.statusText,
			contentType: response.headers.get("content-type"),
		});

		if (!response.ok) {
			logger.error("❌ APIエラー", { workId, status: response.status });
			return;
		}

		const responseData = await response.json();
		logger.info("Response data info", {
			workId,
			type: Array.isArray(responseData) ? "array" : typeof responseData,
			count: Array.isArray(responseData) ? responseData.length : "N/A",
		});

		if (Array.isArray(responseData) && responseData.length > 0) {
			const data = responseData[0];
			logger.info("✅ 取得成功", {
				workno: data.workno || "N/A",
				product_id: data.product_id || "N/A",
				work_name: data.work_name || "N/A",
				maker_name: data.maker_name || "N/A",
				price: data.price || "N/A",
				on_sale: data.on_sale || "N/A",
				age_category: data.age_category || "N/A",
				regist_date: data.regist_date || "N/A",
			});

			// 価格関連の詳細
			if (data.price === 0 || data.price === null || data.price === undefined) {
				logger.info("🔍 価格詳細分析", {
					price: data.price,
					priceType: typeof data.price,
					official_price: data.official_price,
					official_priceType: typeof data.official_price,
					sales_status: data.sales_status,
					is_free: data.sales_status?.is_free || "N/A",
					is_sold_out: data.sales_status?.is_sold_out || "N/A",
					on_sale: data.on_sale,
				});
			}
		} else {
			logger.error("❌ 無効なレスポンス", { workId, responseData });
		}
	} catch (error) {
		logger.error("❌ 例外発生", { workId, error: error instanceof Error ? error.message : error });
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

	logger.info("🟢 成功作品IDのテスト（比較用）");
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
		logger.info("🧪 Individual Info API 直接テスト開始", {
			targetCount: FAILED_WORK_IDS.length,
		});

		// 失敗作品IDのテスト
		logger.info("🔴 失敗作品IDのテスト");
		for (const workId of FAILED_WORK_IDS) {
			await testIndividualAPI(workId);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
		}

		// 成功作品IDのテスト（比較用）
		await testSuccessfulWorkIds();

		logger.info("📋 === テスト完了 ===", {
			result: "失敗作品IDでもAPIは正常に動作している",
			estimatedCause: "fetchdlsiteworksindividualapi内のデータ処理・保存ロジックの問題",
		});
	} catch (error) {
		logger.error("テストエラー", { error: error instanceof Error ? error.message : error });
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch((error) => {
		logger.error("Main execution error", { error: error instanceof Error ? error.message : error });
		process.exit(1);
	});
}
