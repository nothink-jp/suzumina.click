/**
 * DLsite API失敗率監視システム
 *
 * 失敗率が閾値を超えた場合にメール通知を送信
 */

import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { getFailureStatistics } from "../dlsite/failure-tracker";
import { emailService, type FailureRateAlert } from "../notification/email-service";

/**
 * 監視設定
 */
interface MonitoringConfig {
	failureRateThreshold: number; // 失敗率の閾値（％）
	checkIntervalMinutes: number; // チェック間隔（分）
	alertCooldownHours: number; // アラート再送信までの時間（時間）
}

/**
 * 前回のアラート情報
 */
interface LastAlertInfo {
	timestamp: Timestamp;
	failureRate: number;
	sentAt: Timestamp;
}

/**
 * 監視メタデータコレクション
 */
const MONITORING_COLLECTION = "dlsite_monitoring";
const FAILURE_RATE_ALERT_DOC = "failure_rate_alerts";

/**
 * デフォルト監視設定
 */
const DEFAULT_CONFIG: MonitoringConfig = {
	failureRateThreshold: 30.0, // 30%を超えたらアラート
	checkIntervalMinutes: 60, // 1時間毎にチェック
	alertCooldownHours: 6, // 6時間はアラート再送信しない
};

/**
 * 失敗率監視クラス
 */
export class FailureRateMonitor {
	private config: MonitoringConfig;

	constructor(config?: Partial<MonitoringConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		logger.info("失敗率監視システム初期化", {
			operation: "FailureRateMonitor.constructor",
			config: this.config,
		});
	}

	/**
	 * 失敗率をチェックして必要に応じてアラートを送信
	 */
	async checkAndAlert(): Promise<{
		shouldAlert: boolean;
		currentFailureRate: number;
		alertSent: boolean;
	}> {
		try {
			logger.info("失敗率監視チェック開始");

			// 1. 現在の失敗統計を取得
			const failureStats = await getFailureStatistics();
			const totalWorks = failureStats.totalFailedWorks + failureStats.recoveredWorks;
			const currentFailureRate =
				totalWorks > 0 ? (failureStats.unrecoveredWorks / totalWorks) * 100 : 0;

			logger.info("現在の失敗率統計", {
				operation: "checkAndAlert",
				currentFailureRate,
				threshold: this.config.failureRateThreshold,
				totalWorks,
				unrecoveredWorks: failureStats.unrecoveredWorks,
			});

			// 2. 閾値チェック
			const shouldAlert = currentFailureRate > this.config.failureRateThreshold;

			if (!shouldAlert) {
				logger.info("失敗率が閾値以下のため、アラート不要", {
					currentFailureRate,
					threshold: this.config.failureRateThreshold,
				});
				return {
					shouldAlert: false,
					currentFailureRate,
					alertSent: false,
				};
			}

			// 3. クールダウン期間チェック
			const canSendAlert = await this.checkAlertCooldown();
			if (!canSendAlert) {
				logger.info("アラートクールダウン期間中のため、送信スキップ");
				return {
					shouldAlert: true,
					currentFailureRate,
					alertSent: false,
				};
			}

			// 4. アラート送信
			const alertSent = await this.sendFailureRateAlert(currentFailureRate, failureStats);

			return {
				shouldAlert: true,
				currentFailureRate,
				alertSent,
			};
		} catch (error) {
			logger.error("失敗率監視チェックエラー:", {
				operation: "checkAndAlert",
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * 失敗率アラートを送信
	 */
	private async sendFailureRateAlert(
		currentFailureRate: number,
		failureStats: Awaited<ReturnType<typeof getFailureStatistics>>,
	): Promise<boolean> {
		try {
			const totalWorks = failureStats.totalFailedWorks + failureStats.recoveredWorks;

			// アラート内容を構築
			const alert: FailureRateAlert = {
				currentFailureRate,
				threshold: this.config.failureRateThreshold,
				totalWorks,
				failedWorks: failureStats.unrecoveredWorks,
				timestamp: new Date().toISOString(),
				details: {
					regionRestrictionCount: failureStats.failureReasons.region_restriction || 0,
					timeoutCount: failureStats.failureReasons.timeout || 0,
					apiErrorCount: failureStats.failureReasons.api_error || 0,
				},
			};

			// メール送信
			await emailService.sendFailureRateAlert(alert);

			// 送信記録を保存
			await this.recordAlertSent(currentFailureRate);

			logger.info("失敗率アラート送信完了", {
				operation: "sendFailureRateAlert",
				currentFailureRate,
				threshold: this.config.failureRateThreshold,
			});

			return true;
		} catch (error) {
			logger.error("失敗率アラート送信エラー:", {
				operation: "sendFailureRateAlert",
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/**
	 * アラートクールダウン期間をチェック
	 */
	private async checkAlertCooldown(): Promise<boolean> {
		try {
			const doc = await firestore
				.collection(MONITORING_COLLECTION)
				.doc(FAILURE_RATE_ALERT_DOC)
				.get();

			if (!doc.exists) {
				return true; // 初回は送信可能
			}

			const lastAlert = doc.data() as LastAlertInfo;
			const cooldownEndTime = new Date(
				lastAlert.sentAt.toDate().getTime() + this.config.alertCooldownHours * 60 * 60 * 1000,
			);
			const now = new Date();

			const canSend = now >= cooldownEndTime;

			logger.debug("アラートクールダウンチェック", {
				operation: "checkAlertCooldown",
				lastSentAt: lastAlert.sentAt.toDate().toISOString(),
				cooldownEndTime: cooldownEndTime.toISOString(),
				now: now.toISOString(),
				canSend,
			});

			return canSend;
		} catch (error) {
			logger.error("アラートクールダウンチェックエラー:", {
				operation: "checkAlertCooldown",
				error: error instanceof Error ? error.message : String(error),
			});
			// エラー時は送信を許可
			return true;
		}
	}

	/**
	 * アラート送信記録を保存
	 */
	private async recordAlertSent(failureRate: number): Promise<void> {
		try {
			const alertInfo: LastAlertInfo = {
				timestamp: Timestamp.now(),
				failureRate,
				sentAt: Timestamp.now(),
			};

			await firestore.collection(MONITORING_COLLECTION).doc(FAILURE_RATE_ALERT_DOC).set(alertInfo);

			logger.debug("アラート送信記録保存完了", {
				operation: "recordAlertSent",
				failureRate,
			});
		} catch (error) {
			logger.error("アラート送信記録保存エラー:", {
				operation: "recordAlertSent",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * 監視設定を更新
	 */
	async updateConfig(newConfig: Partial<MonitoringConfig>): Promise<void> {
		this.config = { ...this.config, ...newConfig };

		logger.info("監視設定更新", {
			operation: "updateConfig",
			newConfig: this.config,
		});
	}

	/**
	 * 監視統計を取得
	 */
	async getMonitoringStats(): Promise<{
		config: MonitoringConfig;
		lastAlert?: LastAlertInfo;
		nextCheckTime: string;
	}> {
		try {
			const doc = await firestore
				.collection(MONITORING_COLLECTION)
				.doc(FAILURE_RATE_ALERT_DOC)
				.get();

			const lastAlert = doc.exists ? (doc.data() as LastAlertInfo) : undefined;
			const nextCheckTime = new Date(
				Date.now() + this.config.checkIntervalMinutes * 60 * 1000,
			).toISOString();

			return {
				config: this.config,
				lastAlert,
				nextCheckTime,
			};
		} catch (error) {
			logger.error("監視統計取得エラー:", {
				operation: "getMonitoringStats",
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
}

// デフォルトインスタンス
export const failureRateMonitor = new FailureRateMonitor();

// 型エクスポート
export type { MonitoringConfig, LastAlertInfo };
