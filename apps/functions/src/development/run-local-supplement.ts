/**
 * ローカル補完収集実行スクリプト
 *
 * 使用方法:
 * pnpm --filter @suzumina.click/functions local:supplement
 */

import { getFailureStatistics } from "../services/dlsite/failure-tracker";
import { emailService, type SupplementResult } from "../services/notification/email-service";
import * as logger from "../shared/logger";
import { collectFailedWorksLocally } from "./local-supplement-collector";

async function runLocalSupplement(): Promise<void> {
	try {
		logger.info("🚀 ローカル補完収集スクリプト開始");

		// 実行前の統計を表示
		console.log("\n=== 実行前の失敗統計 ===");
		const preStats = await getFailureStatistics();
		console.log(`総失敗作品数: ${preStats.totalFailedWorks}件`);
		console.log(`回復済み: ${preStats.recoveredWorks}件`);
		console.log(`未回復: ${preStats.unrecoveredWorks}件`);
		console.log("失敗理由別:");
		Object.entries(preStats.failureReasons).forEach(([reason, count]) => {
			console.log(`  ${reason}: ${count}件`);
		});

		// 補完収集実行
		const result = await collectFailedWorksLocally({
			maxWorks: 30, // 一度に30件まで処理
			onlyUnrecovered: true,
			minFailureCount: 1,
		});

		// 実行後の統計を表示
		console.log("\n=== 実行後の失敗統計 ===");
		const postStats = await getFailureStatistics();
		console.log(`総失敗作品数: ${postStats.totalFailedWorks}件`);
		console.log(
			`回復済み: ${postStats.recoveredWorks}件 (${postStats.recoveredWorks - preStats.recoveredWorks > 0 ? "+" : ""}${postStats.recoveredWorks - preStats.recoveredWorks})`,
		);
		console.log(
			`未回復: ${postStats.unrecoveredWorks}件 (${postStats.unrecoveredWorks - preStats.unrecoveredWorks > 0 ? "+" : ""}${postStats.unrecoveredWorks - preStats.unrecoveredWorks})`,
		);

		// 回復率の計算
		const recoveryRate =
			result.totalFailedWorks > 0
				? ((result.successfulWorks / result.totalFailedWorks) * 100).toFixed(1)
				: "0";

		console.log("\n=== 今回の実行結果 ===");
		console.log(`処理対象: ${result.totalFailedWorks}件`);
		console.log(`成功: ${result.successfulWorks}件`);
		console.log(`回復率: ${recoveryRate}%`);
		console.log(`まだ失敗: ${result.stillFailedWorks}件`);

		if (result.recoveredWorkIds.length > 0) {
			console.log("\n✅ 今回回復した作品ID:");
			console.log(result.recoveredWorkIds.join(", "));
		}

		if (result.stillFailingWorkIds.length > 0 && result.stillFailingWorkIds.length <= 10) {
			console.log("\n❌ まだ失敗している作品ID:");
			console.log(result.stillFailingWorkIds.join(", "));
		}

		// 改善提案
		if (result.successfulWorks > 0) {
			console.log(`\n🎉 ${result.successfulWorks}件の作品データを回復しました！`);
			console.log("これらの作品はWebアプリケーションで利用可能になりました。");
		}

		if (result.stillFailedWorks > 0) {
			console.log(`\n📋 ${result.stillFailedWorks}件がまだ失敗しています。`);
			console.log("これらの作品は以下の可能性があります:");
			console.log("- 地域制限による完全な取得不可");
			console.log("- 作品の販売停止・非公開状態");
			console.log("- 年齢制限による表示制限");
		}

		if (result.errors.length > 0) {
			console.log("\n⚠️ エラーが発生しました:");
			result.errors.forEach((error, index) => {
				console.log(`${index + 1}. ${error}`);
			});
		}

		// メール通知の送信
		const supplementResult: SupplementResult = {
			executedAt: new Date().toISOString(),
			totalProcessed: result.totalFailedWorks,
			successfulRecoveries: result.successfulWorks,
			stillFailing: result.stillFailedWorks,
			recoveryRate:
				result.totalFailedWorks > 0 ? (result.successfulWorks / result.totalFailedWorks) * 100 : 0,
			recoveredWorkIds: result.recoveredWorkIds,
		};

		try {
			await emailService.sendSupplementResult(supplementResult);
			console.log("📧 実行結果のメール通知を送信しました");
		} catch (emailError) {
			console.warn(
				"⚠️ メール通知の送信に失敗しました:",
				emailError instanceof Error ? emailError.message : String(emailError),
			);
			logger.warn("ローカル補完結果メール通知失敗", {
				operation: "runLocalSupplement",
				emailError: emailError instanceof Error ? emailError.message : String(emailError),
			});
		}

		console.log("\n✅ ローカル補完収集スクリプト完了");
	} catch (error) {
		logger.error("ローカル補完収集スクリプトエラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		console.error("❌ 実行エラー:", error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	runLocalSupplement().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}

export { runLocalSupplement };
