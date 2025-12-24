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

		// 現在の失敗統計を表示
		const failureStats = await getFailureStatistics();
		const totalWorks = failureStats.totalFailedWorks + failureStats.recoveredWorks;
		const currentFailureRate =
			totalWorks > 0 ? (failureStats.unrecoveredWorks / totalWorks) * 100 : 0;

		logger.info("📈 失敗統計サマリー", {
			totalWorks,
			failedWorks: failureStats.totalFailedWorks,
			recoveredWorks: failureStats.recoveredWorks,
			unrecoveredWorks: failureStats.unrecoveredWorks,
			currentFailureRate: `${currentFailureRate.toFixed(1)}%`,
		});

		// 失敗理由の表示
		const reasons = Object.entries(failureStats.failureReasons);
		if (reasons.length > 0) {
			logger.info("📋 失敗理由内訳", Object.fromEntries(reasons));
		}

		// 単純な状況評価
		if (currentFailureRate > 50) {
			logger.warn("🔴 要対応: 失敗率が50%を超えています");
		} else if (currentFailureRate > 20) {
			logger.warn("🟡 注意: 失敗率が20%を超えています");
		} else {
			logger.info("🟢 良好: 失敗率は正常範囲です");
		}
	} catch (error) {
		logger.error("失敗統計表示エラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 統計データから成功率を計算
 */
function calculateSuccessRate(failureStats: {
	totalFailedWorks: number;
	recoveredWorks: number;
	unrecoveredWorks: number;
}): number {
	const totalWorks = failureStats.totalFailedWorks + failureStats.recoveredWorks;
	return totalWorks > 0 ? ((totalWorks - failureStats.unrecoveredWorks) / totalWorks) * 100 : 100;
}

/**
 * 失敗理由の上位項目を取得
 */
function getTopFailureReasons(
	failureReasons: Record<string, number> | undefined,
	limit = 5,
): Array<{ reason: string; count: number }> {
	return Object.entries(failureReasons || {})
		.map(([reason, count]) => ({ reason, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}

/**
 * システム状況を評価
 */
function evaluateSystemStatus(successRate: number): string {
	if (successRate >= 95) return "🟢 良好";
	if (successRate >= 90) return "🟡 注意";
	return "🔴 要対応";
}

/**
 * 統計情報を表示
 */
function displayStatistics(stats: {
	totalWorks: number;
	successRate: number;
	unrecoveredWorks: number;
	topFailureReasons: Array<{ reason: string; count: number }>;
	systemStatus: string;
}): void {
	logger.info("📊 システム統計", {
		systemStatus: stats.systemStatus,
		totalWorks: stats.totalWorks,
		successRate: `${stats.successRate.toFixed(1)}%`,
		unrecoveredWorks: stats.unrecoveredWorks,
	});

	if (stats.topFailureReasons.length > 0) {
		logger.info(
			"📋 主要失敗理由",
			Object.fromEntries(stats.topFailureReasons.map((item) => [item.reason, item.count])),
		);
	}
}

/**
 * 改善提案を表示
 */
function displayImprovementSuggestions(successRate: number): void {
	if (successRate >= 95) return;

	if (successRate < 90) {
		logger.warn("💡 改善提案: 成功率が90%未満です。失敗理由を確認してください。");
	} else {
		logger.info("💡 改善提案: 成功率は良好ですが、95%以上を目指しましょう。");
	}
}

/**
 * 週次健全性レポートの実行
 */
export async function runWeeklyReport(): Promise<void> {
	try {
		logger.info("📈 週次健全性レポートスクリプト開始");

		// 1. 失敗統計取得
		const failureStats = await getFailureStatistics();
		const totalWorks = failureStats.totalFailedWorks + failureStats.recoveredWorks;
		const successRate = calculateSuccessRate(failureStats);

		// 2. データ集計
		const topFailureReasons = getTopFailureReasons(failureStats.failureReasons);
		const systemStatus = evaluateSystemStatus(successRate);

		// 3. 統計表示
		displayStatistics({
			totalWorks,
			successRate,
			unrecoveredWorks: failureStats.unrecoveredWorks,
			topFailureReasons,
			systemStatus,
		});

		// 4. レポートデータ記録
		const weeklyStats = {
			totalWorks,
			successRate,
			recoveredThisWeek: 0, // TODO: 実際の週次回復数の実装
			stillFailingCount: failureStats.unrecoveredWorks,
			topFailureReasons,
		};
		logger.info("📈 週次健全性レポート", {
			operation: "runWeeklyReport",
			reportPeriod: `${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
			totalWorks: weeklyStats.totalWorks,
			successRate: Number(weeklyStats.successRate.toFixed(1)),
			stillFailingCount: weeklyStats.stillFailingCount,
			topFailureReasons: weeklyStats.topFailureReasons,
			systemStatus,
		});

		// 5. 改善提案
		displayImprovementSuggestions(successRate);
	} catch (error) {
		logger.error("週次健全性レポートスクリプトエラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * リセットツール（メタデータリセット）
 */
export async function resetMetadata(): Promise<void> {
	try {
		logger.info("🔄 メタデータリセット開始");

		const { resetUnifiedMetadata } = await import("./reset-metadata.js");
		await resetUnifiedMetadata();
	} catch (error) {
		logger.error("メタデータリセットエラー:", {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 運用ツールのヘルプ表示
 */
export function showHelp(): void {
	const helpText = `
DLsite Functions 運用ツール

使用方法:
  pnpm tools:<command>

コマンド:
  stats   失敗統計を表示
  report  週次健全性レポートを生成
  reset   メタデータをリセット
  help    このヘルプを表示

例:
  pnpm tools:stats
  pnpm tools:report
`;
	process.stdout.write(helpText);
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
				showHelp();
				process.exit(1);
		}
	};

	runCommand().catch((error) => {
		logger.error("Run tools execution error", {
			command,
			error: error instanceof Error ? error.message : error,
		});
		process.exit(1);
	});
}
