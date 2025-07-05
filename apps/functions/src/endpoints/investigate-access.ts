import type { CloudEvent } from "@google-cloud/functions-framework";
import { runCloudFunctionsInvestigation } from "../development/cloud-functions-investigation";
import * as logger from "../shared/logger";

/**
 * DLsiteアクセス制限調査用エンドポイント
 *
 * Cloud Functions環境で実行し、アクセス制限の詳細を調査する
 *
 * トリガー方法:
 * gcloud functions call investigateAccess --region=asia-northeast1
 */
export async function investigateAccess(cloudEvent: CloudEvent<unknown>): Promise<void> {
	try {
		logger.info("=== DLsiteアクセス制限調査エンドポイント実行開始 ===");

		const result = await runCloudFunctionsInvestigation();

		logger.info("📊 === Cloud Functions調査結果詳細 ===");
		logger.info(`🌍 実行環境: ${result.environment}`);
		logger.info(`🔗 IPアドレス: ${result.ipAddress || "取得失敗"}`);
		logger.info(`📍 リージョン: ${result.region || "不明"}`);
		logger.info(`🤖 User-Agent: ${result.userAgent}`);
		logger.info(`📈 AJAX API総作品数: ${result.totalWorksFromAPI}件`);
		logger.info(`🔍 パース成功: ${result.parsedWorksFromAPI}件`);
		logger.info(`📝 サンプル作品ID: ${result.sampleWorkIds.join(", ")}`);
		logger.info(`⏰ 実行時刻: ${result.executionTime}`);

		if (result.possibleRestrictions.length > 0) {
			logger.info("⚠️ 検出された制限の可能性:");
			result.possibleRestrictions.forEach((restriction, index) => {
				logger.info(`  ${index + 1}. ${restriction}`);
			});
		} else {
			logger.info("✅ 明確な制限は検出されませんでした");
		}

		// 比較用の推定値
		const expectedLocalCount = 1471; // 最新のローカル調査結果
		const difference = Math.abs(expectedLocalCount - result.totalWorksFromAPI);
		const reductionPercentage =
			expectedLocalCount > 0
				? ((expectedLocalCount - result.totalWorksFromAPI) / expectedLocalCount) * 100
				: 0;

		if (reductionPercentage > 5) {
			logger.info("🔢 ローカル環境との比較:");
			logger.info(`  ローカル推定値: ${expectedLocalCount}件`);
			logger.info(`  Cloud Functions: ${result.totalWorksFromAPI}件`);
			logger.info(`  差異: ${difference}件 (${reductionPercentage.toFixed(1)}%減少)`);
		}

		logger.info("🔧 推奨対策:");
		if (result.environment === "cloud-functions") {
			logger.info("  - User-Agentローテーションの強化");
			logger.info("  - プロキシサービス経由でのアクセス検討");
			logger.info("  - 複数リージョンでの比較調査");
		}
		logger.info("  - 定期的な比較調査の実施");
		logger.info("  - DLsiteの利用規約・制限ポリシーの確認");

		logger.info("=== DLsiteアクセス制限調査エンドポイント実行完了 ===");
	} catch (error) {
		logger.error("DLsiteアクセス制限調査エラー:", error);
		throw error;
	}
}
