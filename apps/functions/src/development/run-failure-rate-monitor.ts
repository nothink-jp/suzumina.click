/**
 * 失敗率監視実行スクリプト
 *
 * 使用方法:
 * pnpm --filter @suzumina.click/functions monitor:failure-rate
 */

import { getFailureStatistics } from "../services/dlsite/failure-tracker";
import { failureRateMonitor } from "../services/monitoring/failure-rate-monitor";
import * as logger from "../shared/logger";

async function runFailureRateMonitor(): Promise<void> {
	try {
		logger.info("🔍 失敗率監視スクリプト開始");

		console.log("\n=== 失敗率監視システム実行 ===");

		// 1. 現在の失敗統計を表示
		const failureStats = await getFailureStatistics();
		const totalWorks = failureStats.totalFailedWorks + failureStats.recoveredWorks;
		const currentFailureRate =
			totalWorks > 0 ? (failureStats.unrecoveredWorks / totalWorks) * 100 : 0;

		console.log("\n📊 現在の統計:");
		console.log(`総作品数: ${totalWorks}件`);
		console.log(`未回復失敗数: ${failureStats.unrecoveredWorks}件`);
		console.log(`現在の失敗率: ${currentFailureRate.toFixed(1)}%`);

		// 2. 監視システムの設定を表示
		const monitoringStats = await failureRateMonitor.getMonitoringStats();
		console.log("\n⚙️ 監視設定:");
		console.log(`失敗率閾値: ${monitoringStats.config.failureRateThreshold}%`);
		console.log(`チェック間隔: ${monitoringStats.config.checkIntervalMinutes}分`);
		console.log(`アラートクールダウン: ${monitoringStats.config.alertCooldownHours}時間`);

		if (monitoringStats.lastAlert) {
			console.log(`前回アラート: ${monitoringStats.lastAlert.sentAt.toDate().toLocaleString()}`);
			console.log(`前回失敗率: ${monitoringStats.lastAlert.failureRate.toFixed(1)}%`);
		}

		// 3. 失敗率チェック実行
		console.log("\n🔍 失敗率チェック実行中...");
		const result = await failureRateMonitor.checkAndAlert();

		console.log("\n📋 チェック結果:");
		console.log(`失敗率: ${result.currentFailureRate.toFixed(1)}%`);
		console.log(`アラート必要: ${result.shouldAlert ? "はい" : "いいえ"}`);
		console.log(`アラート送信: ${result.alertSent ? "はい" : "いいえ"}`);

		if (result.shouldAlert && !result.alertSent) {
			console.log("⚠️ アラートが必要ですが、クールダウン期間中のため送信されませんでした");
		}

		if (result.alertSent) {
			console.log("📧 失敗率アラートメールを送信しました");
		}

		// 4. 推奨対応
		if (result.shouldAlert) {
			console.log("\n💡 推奨対応:");
			console.log("1. ローカル補完収集の実行: pnpm local:supplement");
			console.log("2. 失敗作品の詳細分析: pnpm analyze:failures");
			console.log("3. システム状況の確認");
		} else {
			console.log("\n✅ 現在の失敗率は正常範囲内です");
		}

		console.log("\n✅ 失敗率監視スクリプト完了");
	} catch (error) {
		logger.error("失敗率監視スクリプトエラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		console.error("❌ 実行エラー:", error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	runFailureRateMonitor().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}

export { runFailureRateMonitor };
