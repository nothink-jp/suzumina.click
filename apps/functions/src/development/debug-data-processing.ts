/**
 * データ処理デバッグツール
 *
 * Individual Info APIレスポンスから作品データへの変換過程をデバッグ
 */

import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import {
	type IndividualInfoAPIResponse,
	mapIndividualInfoAPIToWorkData,
	validateAPIOnlyWorkData,
} from "../services/dlsite/individual-info-to-work-mapper";
import * as logger from "../shared/logger";

const INDIVIDUAL_INFO_API_BASE_URL = "https://www.dlsite.com/maniax/api/=/product.json";

// 問題が発生していると思われる作品ID
const PROBLEM_WORK_IDS = [
	"RJ01145117", // 無料作品
	"RJ01133519", // 無料作品
	"RJ01125601", // 無料作品
	"RJ01047404", // 無料作品
	"RJ01037463", // 通常作品（涼花みなせ）
	"RJ01415251", // 翻訳作品
	"RJ01020479", // APK版
];

/**
 * 作品データの変換処理をデバッグ
 */
async function debugDataProcessing(workId: string): Promise<void> {
	try {
		console.log(`\n🔍 ${workId} データ処理デバッグ開始`);

		// 1. Individual Info APIからデータ取得
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();
		const response = await fetch(url, { method: "GET", headers });

		if (!response.ok) {
			console.log(`❌ API取得失敗: ${response.status}`);
			return;
		}

		const responseData = await response.json();
		if (!Array.isArray(responseData) || responseData.length === 0) {
			console.log("❌ 無効なAPIレスポンス");
			return;
		}

		const apiData = responseData[0] as IndividualInfoAPIResponse;
		console.log(`✅ API取得成功: ${apiData.work_name}`);

		// 2. 重要なフィールドをチェック
		console.log("📊 重要フィールド確認:");
		console.log(`  workno: ${apiData.workno}`);
		console.log(`  product_id: ${apiData.product_id}`);
		console.log(`  work_name: ${apiData.work_name}`);
		console.log(`  maker_name: ${apiData.maker_name}`);
		console.log(`  price: ${apiData.price} (${typeof apiData.price})`);
		console.log(`  official_price: ${apiData.official_price} (${typeof apiData.official_price})`);
		console.log(`  on_sale: ${apiData.on_sale}`);
		console.log(`  age_category: ${apiData.age_category}`);
		console.log(`  regist_date: ${apiData.regist_date}`);

		// 3. データ変換処理
		console.log("🔄 データ変換処理:");
		let workData;
		try {
			workData = mapIndividualInfoAPIToWorkData(apiData);
			console.log("✅ 変換成功");
		} catch (error) {
			console.log(`❌ 変換失敗: ${error instanceof Error ? error.message : error}`);
			return;
		}

		// 4. 変換後のデータ確認
		console.log("📋 変換後データ:");
		console.log(`  id: ${workData.id}`);
		console.log(`  productId: ${workData.productId}`);
		console.log(`  title: ${workData.title}`);
		console.log(`  circle: ${workData.circle}`);
		console.log(`  price.current: ${workData.price?.current} (${typeof workData.price?.current})`);
		console.log(`  price.isFreeOrMissingPrice: ${workData.price?.isFreeOrMissingPrice}`);
		console.log(`  category: ${workData.category}`);
		console.log(`  ageRating: ${workData.ageRating}`);
		console.log(`  voiceActors: ${workData.voiceActors?.length || 0}件`);
		console.log(`  genres: ${workData.genres?.length || 0}件`);
		console.log(`  dataSources.infoAPI: ${!!workData.dataSources?.infoAPI}`);
		console.log(`  createdAt: ${workData.createdAt}`);
		console.log(`  updatedAt: ${workData.updatedAt}`);

		// 5. データ品質検証
		console.log("🔍 データ品質検証:");
		const validation = validateAPIOnlyWorkData(workData);
		console.log(`  isValid: ${validation.isValid}`);
		console.log(`  quality: ${validation.quality}`);
		console.log(`  errors: ${validation.errors.length}件`);
		if (validation.errors.length > 0) {
			validation.errors.forEach((error, index) => {
				console.log(`    ${index + 1}. ${error}`);
			});
		}

		// 6. Firestore保存シミュレーション
		console.log("💾 Firestore保存シミュレーション:");
		try {
			// 実際の保存は行わず、シリアライズ可能かチェック
			const serialized = JSON.stringify(workData);
			const deserialized = JSON.parse(serialized);
			console.log(`✅ シリアライズ成功 (${serialized.length} characters)`);

			// 重要なフィールドが保持されているかチェック
			if (deserialized.id && deserialized.title && deserialized.circle) {
				console.log("✅ 重要フィールド保持OK");
			} else {
				console.log("❌ 重要フィールド欠損");
			}
		} catch (error) {
			console.log(`❌ シリアライズ失敗: ${error instanceof Error ? error.message : error}`);
		}

		// 7. 結果サマリー
		console.log("📋 結果サマリー:");
		console.log("  API取得: ✅");
		console.log("  データ変換: ✅");
		console.log(`  品質検証: ${validation.isValid ? "✅" : "❌"}`);
		console.log("  Firestore準備: ✅");

		if (!validation.isValid) {
			console.log("⚠️  品質検証エラーが処理失敗の原因の可能性があります");
		}
	} catch (error) {
		console.log(`❌ 処理中にエラー: ${error instanceof Error ? error.message : error}`);
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		console.log("🔍 データ処理デバッグツール開始");
		console.log(`対象作品数: ${PROBLEM_WORK_IDS.length}件`);

		for (const workId of PROBLEM_WORK_IDS) {
			await debugDataProcessing(workId);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
		}

		console.log("\n📋 === デバッグ完了 ===");
		console.log("各作品の処理状況を確認してください");
	} catch (error) {
		console.error("デバッグエラー:", error);
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch(console.error);
}
