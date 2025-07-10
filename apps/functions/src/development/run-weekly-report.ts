/**
 * 週次健全性レポート実行スクリプト
 *
 * 使用方法:
 * pnpm --filter @suzumina.click/functions notify:weekly-report
 */

import { getFailureStatistics } from "../services/dlsite/failure-tracker";
import { emailService } from "../services/notification/email-service";
import * as logger from "../shared/logger";

async function runWeeklyReport(): Promise<void> {
	try {
		logger.info("📈 週次健全性レポートスクリプト開始");

		console.log("\n=== DLsiteシステム週次健全性レポート生成 ===");

		// 1. 失敗統計取得
		const failureStats = await getFailureStatistics();
		const totalWorks = failureStats.totalFailedWorks + failureStats.recoveredWorks;
		const successRate =
			totalWorks > 0 ? ((totalWorks - failureStats.unrecoveredWorks) / totalWorks) * 100 : 100;

		// 2. 失敗理由の上位項目
		const topFailureReasons = Object.entries(failureStats.failureReasons || {})
			.map(([reason, count]) => ({ reason, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		// 3. 週次統計表示
		console.log("\n📊 システム統計:");
		console.log(`総作品数: ${totalWorks}件`);
		console.log(`成功率: ${successRate.toFixed(1)}%`);
		console.log(`未解決失敗数: ${failureStats.unrecoveredWorks}件`);

		console.log("\n🔍 主な失敗理由:");
		topFailureReasons.forEach((item, index) => {
			console.log(`${index + 1}. ${item.reason}: ${item.count}件`);
		});

		// 4. システム状況評価
		const systemStatus =
			successRate >= 95 ? "🟢 良好" : successRate >= 90 ? "🟡 注意" : "🔴 要対応";
		console.log(`\nシステム状況: ${systemStatus}`);

		// 5. レポートデータ構築
		const weeklyStats = {
			totalWorks,
			successRate,
			recoveredThisWeek: 0, // TODO: 実際の週次回復数の実装
			stillFailingCount: failureStats.unrecoveredWorks,
			topFailureReasons,
		};

		// 6. メール送信
		console.log("\n📧 週次健全性レポートメール送信中...");
		await emailService.sendWeeklyHealthReport(weeklyStats);
		console.log("✅ 週次健全性レポートメールを送信しました");

		// 7. 改善提案
		if (successRate < 95) {
			console.log("\n💡 改善提案:");
			console.log("- ローカル補完収集の定期実行推奨");
			console.log("- 失敗理由分析による対策検討");
			if (successRate < 90) {
				console.log("- 緊急対応が必要な状況です");
			}
		}

		console.log("\n✅ 週次健全性レポートスクリプト完了");
	} catch (error) {
		logger.error("週次健全性レポートスクリプトエラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		console.error("❌ 実行エラー:", error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	runWeeklyReport().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}

export { runWeeklyReport };
