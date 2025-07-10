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
		logger.info("🔍 データ処理デバッグ開始", { workId });

		// 1. Individual Info APIからデータ取得
		const url = `${INDIVIDUAL_INFO_API_BASE_URL}?workno=${workId}`;
		const headers = generateDLsiteHeaders();
		const response = await fetch(url, { method: "GET", headers });

		if (!response.ok) {
			logger.error("❌ API取得失敗", { workId, status: response.status });
			return;
		}

		const responseData = await response.json();
		if (!Array.isArray(responseData) || responseData.length === 0) {
			logger.error("❌ 無効なAPIレスポンス", { workId });
			return;
		}

		const apiData = responseData[0] as IndividualInfoAPIResponse;
		logger.info("✅ API取得成功", { workId, workName: apiData.work_name });

		// 2. 重要なフィールドをチェック
		logger.info("📊 重要フィールド確認", {
			workno: apiData.workno,
			product_id: apiData.product_id,
			work_name: apiData.work_name,
			maker_name: apiData.maker_name,
			price: apiData.price,
			priceType: typeof apiData.price,
			official_price: apiData.official_price,
			official_priceType: typeof apiData.official_price,
			on_sale: apiData.on_sale,
			age_category: apiData.age_category,
			regist_date: apiData.regist_date,
		});

		// 3. データ変換処理
		logger.info("🔄 データ変換処理");
		let workData: ReturnType<typeof mapIndividualInfoAPIToWorkData>;
		try {
			workData = mapIndividualInfoAPIToWorkData(apiData);
			logger.info("✅ 変換成功", { workId });
		} catch (error) {
			logger.error("❌ 変換失敗", {
				workId,
				error: error instanceof Error ? error.message : error,
			});
			return;
		}

		// 4. 変換後のデータ確認
		logger.info("📋 変換後データ", {
			id: workData.id,
			productId: workData.productId,
			title: workData.title,
			circle: workData.circle,
			priceCurrent: workData.price?.current,
			priceCurrentType: typeof workData.price?.current,
			isFreeOrMissingPrice: workData.price?.isFreeOrMissingPrice,
			category: workData.category,
			ageRating: workData.ageRating,
			voiceActorsCount: workData.voiceActors?.length || 0,
			genresCount: workData.genres?.length || 0,
			dataSourcesInfoAPI: !!workData.dataSources?.infoAPI,
			createdAt: workData.createdAt,
			updatedAt: workData.updatedAt,
		});

		// 5. データ品質検証
		const validation = validateAPIOnlyWorkData(workData);
		logger.info("🔍 データ品質検証", {
			workId,
			isValid: validation.isValid,
			quality: validation.quality,
			errorsCount: validation.errors.length,
			errors: validation.errors,
		});

		// 6. Firestore保存シミュレーション
		try {
			// 実際の保存は行わず、シリアライズ可能かチェック
			const serialized = JSON.stringify(workData);
			const deserialized = JSON.parse(serialized);
			const hasImportantFields = !!(deserialized.id && deserialized.title && deserialized.circle);

			logger.info("💾 Firestore保存シミュレーション", {
				workId,
				serializationSuccess: true,
				serializedLength: serialized.length,
				importantFieldsPresent: hasImportantFields,
			});
		} catch (error) {
			logger.error("💾 Firestoreシリアライズ失敗", {
				workId,
				error: error instanceof Error ? error.message : error,
			});
		}

		// 7. 結果サマリー
		logger.info("📋 結果サマリー", {
			workId,
			apiSuccess: true,
			dataConversionSuccess: true,
			qualityValidation: validation.isValid,
			firestoreReady: true,
			potentialIssue: !validation.isValid ? "品質検証エラーが処理失敗の原因の可能性" : null,
		});
	} catch (error) {
		logger.error("❌ 処理中にエラー", {
			workId,
			error: error instanceof Error ? error.message : error,
		});
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		logger.info("🔍 データ処理デバッグツール開始", {
			targetCount: PROBLEM_WORK_IDS.length,
		});

		for (const workId of PROBLEM_WORK_IDS) {
			await debugDataProcessing(workId);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
		}

		logger.info("📋 === デバッグ完了 ===", {
			message: "各作品の処理状況を確認してください",
		});
	} catch (error) {
		logger.error("デバッグエラー", { error: error instanceof Error ? error.message : error });
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
