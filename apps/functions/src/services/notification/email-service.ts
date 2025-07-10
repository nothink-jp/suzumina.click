/**
 * メール通知サービス
 *
 * DLsite API失敗率監視・ローカル補完実行結果などの
 * 重要な通知をメールで送信
 */

import * as logger from "../../shared/logger";

/**
 * メール送信の設定
 */
interface EmailConfig {
	from: string;
	to: string;
	subject: string;
	text?: string;
	html?: string;
}

/**
 * DLsite失敗率アラートの内容
 */
interface FailureRateAlert {
	currentFailureRate: number;
	threshold: number;
	totalWorks: number;
	failedWorks: number;
	timestamp: string;
	details?: {
		regionRestrictionCount: number;
		timeoutCount: number;
		apiErrorCount: number;
	};
}

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
 * メール通知サービスクラス
 */
export class EmailNotificationService {
	private fromEmail: string;
	private toEmail: string;

	constructor() {
		// 環境変数から設定を取得
		this.fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "noreply@suzumina.click";
		this.toEmail = process.env.NOTIFICATION_TO_EMAIL || "";

		if (!this.toEmail) {
			logger.warn("NOTIFICATION_TO_EMAIL環境変数が設定されていません");
		}
	}

	/**
	 * 失敗率アラートメールを送信
	 */
	async sendFailureRateAlert(alert: FailureRateAlert): Promise<void> {
		try {
			const subject = `🚨 DLsite API失敗率アラート: ${alert.currentFailureRate.toFixed(1)}%`;

			const html = this.generateFailureRateAlertHTML(alert);
			const text = this.generateFailureRateAlertText(alert);

			await this.sendEmail({
				from: this.fromEmail,
				to: this.toEmail,
				subject,
				html,
				text,
			});

			logger.info("失敗率アラートメール送信完了", {
				operation: "sendFailureRateAlert",
				failureRate: alert.currentFailureRate,
				threshold: alert.threshold,
			});
		} catch (error) {
			logger.error("失敗率アラートメール送信エラー:", {
				operation: "sendFailureRateAlert",
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * ローカル補完実行結果メールを送信
	 */
	async sendSupplementResult(result: SupplementResult): Promise<void> {
		try {
			const subject = `📊 DLsiteローカル補完実行結果: ${result.successfulRecoveries}件回復`;

			const html = this.generateSupplementResultHTML(result);
			const text = this.generateSupplementResultText(result);

			await this.sendEmail({
				from: this.fromEmail,
				to: this.toEmail,
				subject,
				html,
				text,
			});

			logger.info("補完実行結果メール送信完了", {
				operation: "sendSupplementResult",
				recoveries: result.successfulRecoveries,
				recoveryRate: result.recoveryRate,
			});
		} catch (error) {
			logger.error("補完実行結果メール送信エラー:", {
				operation: "sendSupplementResult",
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * システム健全性レポートメールを送信（週次）
	 */
	async sendWeeklyHealthReport(stats: {
		totalWorks: number;
		successRate: number;
		recoveredThisWeek: number;
		stillFailingCount: number;
		topFailureReasons: Array<{ reason: string; count: number }>;
	}): Promise<void> {
		try {
			const subject = `📈 DLsiteシステム週次レポート: 成功率${stats.successRate.toFixed(1)}%`;

			const html = this.generateWeeklyReportHTML(stats);
			const text = this.generateWeeklyReportText(stats);

			await this.sendEmail({
				from: this.fromEmail,
				to: this.toEmail,
				subject,
				html,
				text,
			});

			logger.info("週次健全性レポートメール送信完了", {
				operation: "sendWeeklyHealthReport",
				successRate: stats.successRate,
			});
		} catch (error) {
			logger.error("週次健全性レポートメール送信エラー:", {
				operation: "sendWeeklyHealthReport",
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * 基本的なメール送信（Gmail API使用）
	 */
	private async sendEmail(config: EmailConfig): Promise<void> {
		if (!this.toEmail) {
			logger.warn("送信先メールアドレスが設定されていないため、メール送信をスキップします");
			return;
		}

		try {
			// 簡易的なコンソール出力（実際の実装では Gmail API を使用）
			logger.info("メール送信（シミュレーション）:", {
				from: config.from,
				to: config.to,
				subject: config.subject,
				textLength: config.text?.length || 0,
				htmlLength: config.html?.length || 0,
			});

			// TODO: 実際の Gmail API 実装
			// await this.sendViaGmailAPI(config);
		} catch (error) {
			logger.error("メール送信エラー:", {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * 失敗率アラートのHTML生成
	 */
	private generateFailureRateAlertHTML(alert: FailureRateAlert): string {
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 5px; }
				.stats { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
				.critical { color: #dc3545; font-weight: bold; }
				.normal { color: #28a745; }
			</style>
		</head>
		<body>
			<div class="alert">
				<h2>🚨 DLsite API失敗率アラート</h2>
				<p><strong>現在の失敗率:</strong> <span class="critical">${alert.currentFailureRate.toFixed(1)}%</span></p>
				<p><strong>設定閾値:</strong> ${alert.threshold}%</p>
				<p><strong>発生時刻:</strong> ${alert.timestamp}</p>
			</div>
			
			<div class="stats">
				<h3>📊 詳細統計</h3>
				<ul>
					<li><strong>総作品数:</strong> ${alert.totalWorks}件</li>
					<li><strong>失敗作品数:</strong> ${alert.failedWorks}件</li>
					<li><strong>成功作品数:</strong> ${alert.totalWorks - alert.failedWorks}件</li>
				</ul>
				
				${
					alert.details
						? `
				<h4>失敗理由内訳</h4>
				<ul>
					<li>地域制限: ${alert.details.regionRestrictionCount}件</li>
					<li>タイムアウト: ${alert.details.timeoutCount}件</li>
					<li>APIエラー: ${alert.details.apiErrorCount}件</li>
				</ul>
				`
						: ""
				}
			</div>
			
			<p><strong>推奨対応:</strong></p>
			<ol>
				<li>ローカル補完収集の実行: <code>pnpm local:supplement</code></li>
				<li>失敗作品の詳細分析: <code>pnpm analyze:failures</code></li>
				<li>システム状況の確認</li>
			</ol>
		</body>
		</html>
		`;
	}

	/**
	 * 失敗率アラートのテキスト生成
	 */
	private generateFailureRateAlertText(alert: FailureRateAlert): string {
		return `
🚨 DLsite API失敗率アラート

現在の失敗率: ${alert.currentFailureRate.toFixed(1)}%
設定閾値: ${alert.threshold}%
発生時刻: ${alert.timestamp}

詳細統計:
- 総作品数: ${alert.totalWorks}件
- 失敗作品数: ${alert.failedWorks}件
- 成功作品数: ${alert.totalWorks - alert.failedWorks}件

${
	alert.details
		? `
失敗理由内訳:
- 地域制限: ${alert.details.regionRestrictionCount}件
- タイムアウト: ${alert.details.timeoutCount}件
- APIエラー: ${alert.details.apiErrorCount}件
`
		: ""
}

推奨対応:
1. ローカル補完収集の実行: pnpm local:supplement
2. 失敗作品の詳細分析: pnpm analyze:failures
3. システム状況の確認

suzumina.click 運用チーム
		`.trim();
	}

	/**
	 * ローカル補完実行結果のHTML生成
	 */
	private generateSupplementResultHTML(result: SupplementResult): string {
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; }
				.stats { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
				.recovery-rate { font-size: 1.2em; font-weight: bold; color: #28a745; }
				.work-list { background: #fff; border: 1px solid #dee2e6; padding: 10px; border-radius: 3px; }
			</style>
		</head>
		<body>
			<div class="success">
				<h2>📊 DLsiteローカル補完実行結果</h2>
				<p class="recovery-rate">回復率: ${result.recoveryRate.toFixed(1)}%</p>
				<p><strong>実行時刻:</strong> ${result.executedAt}</p>
			</div>
			
			<div class="stats">
				<h3>🎯 実行結果サマリー</h3>
				<ul>
					<li><strong>処理対象:</strong> ${result.totalProcessed}件</li>
					<li><strong>成功回復:</strong> ${result.successfulRecoveries}件</li>
					<li><strong>まだ失敗:</strong> ${result.stillFailing}件</li>
				</ul>
			</div>
			
			${
				result.recoveredWorkIds.length > 0
					? `
			<div class="work-list">
				<h4>✅ 回復した作品ID (${result.recoveredWorkIds.length}件)</h4>
				<p>${result.recoveredWorkIds.slice(0, 20).join(", ")}${result.recoveredWorkIds.length > 20 ? ` ...他${result.recoveredWorkIds.length - 20}件` : ""}</p>
			</div>
			`
					: ""
			}
			
			<p><em>これらの作品は suzumina.click で利用可能になりました。</em></p>
		</body>
		</html>
		`;
	}

	/**
	 * ローカル補完実行結果のテキスト生成
	 */
	private generateSupplementResultText(result: SupplementResult): string {
		return `
📊 DLsiteローカル補完実行結果

回復率: ${result.recoveryRate.toFixed(1)}%
実行時刻: ${result.executedAt}

実行結果サマリー:
- 処理対象: ${result.totalProcessed}件
- 成功回復: ${result.successfulRecoveries}件
- まだ失敗: ${result.stillFailing}件

${
	result.recoveredWorkIds.length > 0
		? `
回復した作品ID (${result.recoveredWorkIds.length}件):
${result.recoveredWorkIds.slice(0, 20).join(", ")}${result.recoveredWorkIds.length > 20 ? ` ...他${result.recoveredWorkIds.length - 20}件` : ""}
`
		: ""
}

これらの作品は suzumina.click で利用可能になりました。

suzumina.click 運用チーム
		`.trim();
	}

	/**
	 * 週次健全性レポートのHTML生成
	 */
	private generateWeeklyReportHTML(stats: {
		totalWorks: number;
		successRate: number;
		recoveredThisWeek: number;
		stillFailingCount: number;
		topFailureReasons: Array<{ reason: string; count: number }>;
	}): string {
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.report { background: #e3f2fd; border: 1px solid #90caf9; padding: 20px; border-radius: 5px; }
				.metrics { display: flex; justify-content: space-around; margin: 20px 0; }
				.metric { text-align: center; padding: 15px; background: #fff; border-radius: 5px; }
				.metric-value { font-size: 1.5em; font-weight: bold; color: #1976d2; }
			</style>
		</head>
		<body>
			<div class="report">
				<h2>📈 DLsiteシステム週次健全性レポート</h2>
				<p><strong>レポート期間:</strong> ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}</p>
			</div>
			
			<div class="metrics">
				<div class="metric">
					<div class="metric-value">${stats.successRate.toFixed(1)}%</div>
					<div>成功率</div>
				</div>
				<div class="metric">
					<div class="metric-value">${stats.totalWorks}</div>
					<div>総作品数</div>
				</div>
				<div class="metric">
					<div class="metric-value">${stats.recoveredThisWeek}</div>
					<div>今週の回復数</div>
				</div>
				<div class="metric">
					<div class="metric-value">${stats.stillFailingCount}</div>
					<div>未解決失敗数</div>
				</div>
			</div>
			
			<h3>🔍 主な失敗理由</h3>
			<ul>
				${stats.topFailureReasons.map((item) => `<li><strong>${item.reason}:</strong> ${item.count}件</li>`).join("")}
			</ul>
			
			<p><strong>システム状況:</strong> ${stats.successRate >= 95 ? "🟢 良好" : stats.successRate >= 90 ? "🟡 注意" : "🔴 要対応"}</p>
		</body>
		</html>
		`;
	}

	/**
	 * 週次健全性レポートのテキスト生成
	 */
	private generateWeeklyReportText(stats: {
		totalWorks: number;
		successRate: number;
		recoveredThisWeek: number;
		stillFailingCount: number;
		topFailureReasons: Array<{ reason: string; count: number }>;
	}): string {
		return `
📈 DLsiteシステム週次健全性レポート

レポート期間: ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}

主要メトリクス:
- 成功率: ${stats.successRate.toFixed(1)}%
- 総作品数: ${stats.totalWorks}件
- 今週の回復数: ${stats.recoveredThisWeek}件
- 未解決失敗数: ${stats.stillFailingCount}件

主な失敗理由:
${stats.topFailureReasons.map((item) => `- ${item.reason}: ${item.count}件`).join("\n")}

システム状況: ${stats.successRate >= 95 ? "🟢 良好" : stats.successRate >= 90 ? "🟡 注意" : "🔴 要対応"}

suzumina.click 運用チーム
		`.trim();
	}
}

// シングルトンインスタンス
export const emailService = new EmailNotificationService();

// 型エクスポート
export type { FailureRateAlert, SupplementResult };
