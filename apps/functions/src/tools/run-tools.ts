/**
 * 実行ツール統合版
 *
 * 運用に必要な基本ツールのみを提供
 */

// biome-ignore lint/suspicious/noConsole: これはCLIツールであり、コンソール出力が主要な機能です

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
		Object.entries(failureStats.failureReasons).forEach(([_reason, _count]) => {});

		// 単純な状況評価
		if (currentFailureRate > 50) {
		} else if (currentFailureRate > 20) {
		} else {
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
	stats.topFailureReasons.forEach((_item, _index) => {});
}

/**
 * 改善提案を表示
 */
function displayImprovementSuggestions(successRate: number): void {
	if (successRate >= 95) return;

	if (successRate < 90) {
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
export function showHelp(): void {}

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
