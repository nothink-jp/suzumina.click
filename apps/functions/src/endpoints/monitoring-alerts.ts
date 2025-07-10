/**
 * モニタリング・アラート送信 Cloud Function
 *
 * 失敗率監視システムとメール通知システムを統合し、
 * 定期的な失敗率チェック・アラート送信を実行
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import { failureRateMonitor } from "../services/monitoring/failure-rate-monitor";
import * as logger from "../shared/logger";

/**
 * 失敗率監視・アラート送信のメインハンドラー
 *
 * Cloud Scheduler により定期実行される
 * - 失敗率のチェック
 * - 閾値超過時のメール通知
 * - 監視統計の記録
 */
export const monitoringAlerts = async (cloudEvent: CloudEvent<unknown>) => {
	try {
		logger.info("失敗率監視・アラート処理開始", {
			operation: "monitoringAlerts",
			eventId: cloudEvent.id,
			executedAt: new Date().toISOString(),
		});

		// 1. 失敗率監視チェック実行
		const monitoringResult = await failureRateMonitor.checkAndAlert();

		logger.info("失敗率監視チェック完了", {
			operation: "monitoringAlerts",
			shouldAlert: monitoringResult.shouldAlert,
			currentFailureRate: monitoringResult.currentFailureRate,
			alertSent: monitoringResult.alertSent,
		});

		// 2. 監視統計の取得・記録
		const monitoringStats = await failureRateMonitor.getMonitoringStats();

		logger.info("監視システム統計", {
			operation: "monitoringAlerts",
			config: monitoringStats.config,
			lastAlert: monitoringStats.lastAlert,
			nextCheckTime: monitoringStats.nextCheckTime,
		});

		// 3. 実行結果のサマリー
		const result = {
			executedAt: new Date().toISOString(),
			failureRateCheck: {
				currentRate: monitoringResult.currentFailureRate,
				threshold: monitoringStats.config.failureRateThreshold,
				shouldAlert: monitoringResult.shouldAlert,
				alertSent: monitoringResult.alertSent,
			},
			nextExecution: monitoringStats.nextCheckTime,
		};

		logger.info("失敗率監視・アラート処理完了", {
			operation: "monitoringAlerts",
			result,
		});

		return {
			success: true,
			result,
		};
	} catch (error) {
		logger.error("失敗率監視・アラート処理エラー:", {
			operation: "monitoringAlerts",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		// エラー時は緊急通知を試行
		try {
			await sendEmergencyAlert(error);
		} catch (emergencyError) {
			logger.error("緊急アラート送信も失敗:", {
				operation: "monitoringAlerts.emergencyAlert",
				error: emergencyError instanceof Error ? emergencyError.message : String(emergencyError),
			});
		}

		throw error;
	}
};

/**
 * 緊急時のエラー通知
 *
 * 監視システム自体がエラーになった場合の
 * 最低限の通知を送信
 */
async function sendEmergencyAlert(error: unknown): Promise<void> {
	try {
		// 簡易的な緊急通知（ログベース）
		logger.error("🚨 監視システム緊急アラート", {
			operation: "emergencyAlert",
			message: "失敗率監視システムでエラーが発生しました",
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString(),
			action: "システム管理者による確認が必要です",
		});

		// TODO: 実際の緊急通知実装
		// await emailService.sendEmergencyAlert({
		//   error: error instanceof Error ? error.message : String(error),
		//   timestamp: new Date().toISOString(),
		// });
	} catch (emergencyError) {
		// 緊急アラート送信も失敗した場合は諦めてログのみ
		logger.error("緊急アラート送信失敗 - 最終ログ記録のみ", {
			operation: "emergencyAlert.final",
			originalError: error instanceof Error ? error.message : String(error),
			emergencyError:
				emergencyError instanceof Error ? emergencyError.message : String(emergencyError),
		});
	}
}
