/**
 * ローカル補完実行結果レポート Cloud Function
 *
 * ローカル補完収集完了後の結果をログ記録
 * 手動実行およびAPI経由での実行結果を受信・記録
 */

import type { Request, Response } from "@google-cloud/functions-framework";
import { getFailureStatistics } from "../services/dlsite/failure-tracker";
import * as logger from "../shared/logger";

/**
 * ローカル補完実行結果の内容
 */
interface SupplementResult {
	executedAt: string;
	totalProcessed: number;
	successfulRecoveries: number;
	stillFailing: number;
	recoveryRate: number;
	recoveredWorkIds: string[];
}

/**
 * ローカル補完実行結果の受信・記録
 *
 * POST /supplement-notification
 * Body: SupplementResult
 */
export const supplementNotification = async (req: Request, res: Response) => {
	try {
		logger.info("ローカル補完結果レポートリクエスト受信", {
			operation: "supplementNotification",
			method: req.method,
			contentType: req.headers["content-type"],
		});

		// HTTPメソッドチェック
		if (req.method !== "POST") {
			res.status(405).json({
				error: "Method not allowed",
				message: "POST method required",
			});
			return;
		}

		// リクエストボディの検証
		const supplementResult = req.body as SupplementResult;
		if (!supplementResult || !supplementResult.executedAt) {
			res.status(400).json({
				error: "Invalid request body",
				message: "SupplementResult format required",
			});
			return;
		}

		logger.info("ローカル補完結果データ受信・記録", {
			operation: "supplementNotification",
			executedAt: supplementResult.executedAt,
			totalProcessed: supplementResult.totalProcessed,
			successfulRecoveries: supplementResult.successfulRecoveries,
			recoveryRate: supplementResult.recoveryRate,
		});

		// 現在の失敗統計も含めてログ記録
		const currentStats = await getFailureStatistics();
		logger.info("補完実行後の失敗統計", {
			operation: "supplementNotification",
			currentStats,
			supplementResult,
		});

		// 成功レスポンス
		res.status(200).json({
			success: true,
			message: "Supplement result logged successfully",
			data: {
				logged: true,
				executedAt: supplementResult.executedAt,
				recoveryRate: supplementResult.recoveryRate,
			},
		});
	} catch (error) {
		logger.error("ローカル補完結果記録エラー:", {
			operation: "supplementNotification",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		res.status(500).json({
			error: "Internal server error",
			message: "Failed to log supplement result",
		});
	}
};

/**
 * 週次健全性レポート記録
 *
 * GET /weekly-health-report
 * 週次でシステム健全性レポートを生成・ログ記録
 */
export const weeklyHealthReport = async (_req: Request, res: Response) => {
	try {
		logger.info("週次健全性レポート実行開始", {
			operation: "weeklyHealthReport",
		});

		// 1. 失敗統計取得
		const failureStats = await getFailureStatistics();

		// 2. 週次統計の計算
		const totalWorks = failureStats.totalFailedWorks + failureStats.recoveredWorks;
		const successRate =
			totalWorks > 0 ? ((totalWorks - failureStats.unrecoveredWorks) / totalWorks) * 100 : 100;

		// 3. 失敗理由の上位項目
		const topFailureReasons = Object.entries(failureStats.failureReasons || {})
			.map(([reason, count]) => ({ reason, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		// 4. レポートデータ構築
		const weeklyStats = {
			totalWorks,
			successRate,
			recoveredThisWeek: 0, // TODO: 実際の週次回復数の実装
			stillFailingCount: failureStats.unrecoveredWorks,
			topFailureReasons,
		};

		// 5. 週次レポート記録（ログ出力）
		logger.info("📈 週次健全性レポート", {
			operation: "weeklyHealthReport",
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

		logger.info("週次健全性レポート記録完了", {
			operation: "weeklyHealthReport",
			stats: weeklyStats,
		});

		res.status(200).json({
			success: true,
			message: "Weekly health report logged successfully",
			data: weeklyStats,
		});
	} catch (error) {
		logger.error("週次健全性レポート記録エラー:", {
			operation: "weeklyHealthReport",
			error: error instanceof Error ? error.message : String(error),
		});

		res.status(500).json({
			error: "Internal server error",
			message: "Failed to log weekly health report",
		});
	}
};
