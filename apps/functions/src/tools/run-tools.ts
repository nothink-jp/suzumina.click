/**
 * 実行ツール統合版
 *
 * 運用に必要な基本ツールのみを提供
 */

import { getFailureStatistics } from "../services/dlsite/failure-tracker";
import * as logger from "../shared/logger";

/**
 * 失敗統計の表示（簡素化版）
 */
export async function showFailureStats(): Promise<void> {
	try {
		logger.info("📊 失敗統計表示開始");

		console.log("\n=== DLsite失敗統計表示 ===");

		// 現在の失敗統計を表示
		const failureStats = await getFailureStatistics();
		const totalWorks = failureStats.totalFailedWorks + failureStats.recoveredWorks;
		const currentFailureRate =
			totalWorks > 0 ? (failureStats.unrecoveredWorks / totalWorks) * 100 : 0;

		console.log("\n📊 現在の統計:");
		console.log(`総作品数: ${totalWorks}件`);
		console.log(`未回復失敗数: ${failureStats.unrecoveredWorks}件`);
		console.log(`回復済み: ${failureStats.recoveredWorks}件`);
		console.log(`現在の失敗率: ${currentFailureRate.toFixed(1)}%`);

		console.log("\n🔍 失敗理由別:");
		Object.entries(failureStats.failureReasons).forEach(([reason, count]) => {
			console.log(`  ${reason}: ${count}件`);
		});

		// 単純な状況評価
		if (currentFailureRate > 50) {
			console.log("\n🔴 失敗率が高いです。補完収集の実行を推奨します。");
		} else if (currentFailureRate > 20) {
			console.log("\n🟡 失敗率がやや高めです。状況を確認してください。");
		} else {
			console.log("\n✅ 失敗率は正常範囲内です。");
		}

		console.log("\n✅ 失敗統計表示完了");
	} catch (error) {
		logger.error("失敗統計表示エラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		console.error("❌ 実行エラー:", error instanceof Error ? error.message : String(error));
		throw error;
	}
}

/**
 * 週次健全性レポートの実行
 */
export async function runWeeklyReport(): Promise<void> {
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

		// 6. レポート記録（ログ出力）
		console.log("\n📊 週次健全性レポート記録中...");
		logger.info("📈 週次健全性レポート", {
			operation: "runWeeklyReport",
			reportPeriod: `${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
			totalWorks: weeklyStats.totalWorks,
			successRate: Number(weeklyStats.successRate.toFixed(1)),
			stillFailingCount: weeklyStats.stillFailingCount,
			topFailureReasons: weeklyStats.topFailureReasons,
			systemStatus:
				weeklyStats.successRate >= 95
					? "🟢 良好"
					: weeklyStats.successRate >= 90
						? "🟡 注意"
						: "🔴 要対応",
		});
		console.log("✅ 週次健全性レポートを記録しました");

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
		throw error;
	}
}

/**
 * リセットツール（メタデータリセット）
 */
export async function resetMetadata(): Promise<void> {
	try {
		logger.info("🔄 メタデータリセット開始");

		console.log("\n=== メタデータリセット ===");
		console.log("⚠️ この操作により処理状態がリセットされます");

		const { resetUnifiedMetadata } = await import("./reset-metadata.js");
		await resetUnifiedMetadata();

		console.log("✅ メタデータリセット完了");
	} catch (error) {
		logger.error("メタデータリセットエラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		console.error("❌ リセットエラー:", error instanceof Error ? error.message : String(error));
		throw error;
	}
}

/**
 * 運用ツールのヘルプ表示
 */
export function showHelp(): void {
	console.log("\n=== suzumina.click 運用ツール ===");
	console.log("利用可能なコマンド:");
	console.log("");
	console.log("📊 監視・レポート:");
	console.log("  stats          - 失敗統計表示");
	console.log("  report         - 週次健全性レポート生成");
	console.log("");
	console.log("🔧 管理:");
	console.log("  reset          - メタデータリセット");
	console.log("");
	console.log("💡 使用例:");
	console.log("  node run-tools.js stats");
	console.log("  node run-tools.js report");
	console.log("");
}

// スクリプト実行
if (require.main === module) {
	const command = process.argv[2];

	const runCommand = async () => {
		switch (command) {
			case "stats":
				await showFailureStats();
				break;
			case "report":
				await runWeeklyReport();
				break;
			case "reset":
				await resetMetadata();
				break;
			case "help":
			case "--help":
			case "-h":
				showHelp();
				break;
			default:
				console.log("❓ 不明なコマンドです");
				showHelp();
				process.exit(1);
		}
	};

	runCommand().catch((error) => {
		logger.error("Run tools execution error", {
			command,
			error: error instanceof Error ? error.message : error,
		});
		console.error("❌ 実行エラー:", error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
