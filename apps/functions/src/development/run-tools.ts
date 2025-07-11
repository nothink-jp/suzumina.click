/**
 * 実行ツール統合版
 *
 * 運用に必要な基本ツールのみを提供
 */

import { getFailureStatistics } from "../services/dlsite/failure-tracker";
import * as logger from "../shared/logger";
import { collectFailedWorksLocally } from "./core/local-supplement-collector";

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
 * ローカル補完収集の実行
 */
export async function runLocalSupplement(options?: {
	maxWorks?: number;
	onlyUnrecovered?: boolean;
	minFailureCount?: number;
}): Promise<void> {
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
		const defaultOptions = {
			maxWorks: 30, // 一度に30件まで処理
			onlyUnrecovered: true,
			minFailureCount: 1,
		};
		const collectOptions = { ...defaultOptions, ...options };

		const result = await collectFailedWorksLocally(collectOptions);

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

		console.log("\n📈 補完収集結果:");
		console.log(`対象失敗作品: ${result.totalFailedWorks}件`);
		console.log(`回復成功: ${result.successfulWorks}件`);
		console.log(`回復失敗: ${result.failedWorks}件`);
		console.log(`回復率: ${recoveryRate}%`);

		// 結果に応じた次のアクション提案
		const recoveryRateNum = Number(recoveryRate);
		if (recoveryRateNum >= 80) {
			console.log("\n✅ 補完収集は成功です！");
		} else if (recoveryRateNum >= 50) {
			console.log("\n🟡 部分的な成功です。再実行を検討してください。");
		} else {
			console.log("\n🔴 回復率が低いです。システム状況を確認してください。");
		}

		console.log("\n✅ ローカル補完収集スクリプト完了");
	} catch (error) {
		logger.error("ローカル補完収集スクリプトエラー:", {
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

		// インポートを動的に行う（reset-metadata.tsが存在する場合）
		const { resetUnifiedMetadata } = await import("./reset-metadata");
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
	console.log("🔧 補完・復旧:");
	console.log("  supplement     - ローカル補完収集実行");
	console.log("  reset          - メタデータリセット");
	console.log("");
	console.log("💡 使用例:");
	console.log("  node run-tools.js stats");
	console.log("  node run-tools.js supplement");
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
			case "supplement":
				await runLocalSupplement();
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
