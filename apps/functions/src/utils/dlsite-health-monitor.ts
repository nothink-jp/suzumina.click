/**
 * DLsite構造ヘルスモニタリングシステム
 *
 * DLsiteの構造変更を検知し、パーサーの健全性を監視します。
 * 解析成功率の低下やページ構造の変化を早期に検出し、
 * 適切な対応策を提案します。
 */

import * as cheerio from "cheerio";
import * as logger from "./logger";
import { getParserConfigManager, type ParserConfig } from "./parser-config";
import { generateDLsiteHeaders } from "./user-agent-manager";

/**
 * 構造ヘルスチェック結果
 */
export interface StructureHealthCheck {
	/** 全体的な健全性スコア (0-1) */
	overallHealth: number;
	/** 最後の構造変更検知日時 */
	lastStructureChange?: Date;
	/** 失敗しているセレクター */
	failingSelectors: string[];
	/** 推奨アクション */
	recommendedActions: string[];
	/** 各フィールドの詳細結果 */
	fieldResults: Record<string, FieldHealthResult>;
	/** リスクレベル */
	riskLevel: "low" | "medium" | "high" | "critical";
	/** 検証したサンプル数 */
	sampleCount: number;
}

/**
 * フィールド別ヘルス結果
 */
export interface FieldHealthResult {
	/** 成功率 */
	successRate: number;
	/** 検証試行回数 */
	attempts: number;
	/** 動作中のセレクター */
	workingSelectors: string[];
	/** 失敗したセレクター */
	failedSelectors: string[];
	/** 推奨事項 */
	recommendations: string[];
}

/**
 * DLsiteヘルスモニター
 */
export class DLsiteHealthMonitor {
	private static instance: DLsiteHealthMonitor;
	private readonly configManager = getParserConfigManager();
	private readonly testUrls = [
		// テスト用のDLsite作品URL（実際のRJ番号を使用）
		"https://www.dlsite.com/maniax/work/=/product_id/RJ01082746.html",
		"https://www.dlsite.com/maniax/work/=/product_id/RJ01041411.html",
		"https://www.dlsite.com/maniax/work/=/product_id/RJ413726.html",
	];

	private constructor() {
		logger.debug("DLsiteHealthMonitor初期化完了");
	}

	/**
	 * シングルトンインスタンスを取得
	 */
	public static getInstance(): DLsiteHealthMonitor {
		if (!DLsiteHealthMonitor.instance) {
			DLsiteHealthMonitor.instance = new DLsiteHealthMonitor();
		}
		return DLsiteHealthMonitor.instance;
	}

	/**
	 * 包括的な構造ヘルスチェックを実行
	 */
	public async performHealthCheck(sampleSize = 3): Promise<StructureHealthCheck> {
		logger.info("DLsite構造ヘルスチェック開始", { sampleSize });

		const testUrls = this.testUrls.slice(0, sampleSize);
		const fieldResults: Record<string, FieldHealthResult> = {};
		const config = this.configManager.getConfig();

		let totalSuccessCount = 0;
		let totalFieldCount = 0;

		// 各フィールドの検証
		for (const fieldName of Object.keys(config.fields)) {
			const fieldResult = await this.checkFieldHealth(fieldName, testUrls);
			fieldResults[fieldName] = fieldResult;

			totalSuccessCount += fieldResult.successRate * fieldResult.attempts;
			totalFieldCount += fieldResult.attempts;
		}

		// 全体スコア計算
		const overallHealth = totalFieldCount > 0 ? totalSuccessCount / totalFieldCount : 0;

		// リスクレベル判定
		const riskLevel = this.determineRiskLevel(overallHealth);

		// 失敗セレクターの集計
		const failingSelectors = Object.values(fieldResults).flatMap(
			(result) => result.failedSelectors,
		);

		// 推奨アクションの生成
		const recommendedActions = this.generateRecommendations(overallHealth, fieldResults);

		const result: StructureHealthCheck = {
			overallHealth,
			lastStructureChange: this.detectStructureChange(fieldResults),
			failingSelectors,
			recommendedActions,
			fieldResults,
			riskLevel,
			sampleCount: testUrls.length,
		};

		logger.info("DLsite構造ヘルスチェック完了", {
			overallHealth: Math.round(overallHealth * 100),
			riskLevel,
			failingSelectorCount: failingSelectors.length,
		});

		return result;
	}

	/**
	 * 特定フィールドの健全性チェック
	 */
	private async checkFieldHealth(
		fieldName: string,
		testUrls: string[],
	): Promise<FieldHealthResult> {
		const fieldConfig = this.configManager.getFieldConfig(
			fieldName as keyof ParserConfig["fields"],
		);
		if (!fieldConfig) {
			return {
				successRate: 0,
				attempts: 0,
				workingSelectors: [],
				failedSelectors: [],
				recommendations: [`フィールド ${fieldName} の設定が見つかりません`],
			};
		}

		const workingSelectors: string[] = [];
		const failedSelectors: string[] = [];
		let successCount = 0;
		let totalAttempts = 0;

		// 各テストURLで検証
		for (const url of testUrls) {
			try {
				const html = await this.fetchTestPage(url);
				const $ = cheerio.load(html);

				// プライマリセレクターのテスト
				for (const selector of fieldConfig.selectors.primary) {
					totalAttempts++;
					const elements = $(selector);

					if (elements.length > 0 && elements.text().trim()) {
						successCount++;
						if (!workingSelectors.includes(selector)) {
							workingSelectors.push(selector);
						}
					} else {
						if (!failedSelectors.includes(selector)) {
							failedSelectors.push(selector);
						}
					}
				}

				// セカンダリセレクターのテスト（プライマリが失敗した場合）
				if (successCount === 0) {
					for (const selector of fieldConfig.selectors.secondary) {
						totalAttempts++;
						const elements = $(selector);

						if (elements.length > 0 && elements.text().trim()) {
							successCount++;
							if (!workingSelectors.includes(selector)) {
								workingSelectors.push(selector);
							}
						} else {
							if (!failedSelectors.includes(selector)) {
								failedSelectors.push(selector);
							}
						}
					}
				}
			} catch (error) {
				logger.warn(`テストURL取得失敗: ${url}`, { error });
			}
		}

		const successRate = totalAttempts > 0 ? successCount / totalAttempts : 0;
		const recommendations = this.generateFieldRecommendations(
			fieldName,
			successRate,
			fieldConfig.selectors.minSuccessRate,
		);

		return {
			successRate,
			attempts: totalAttempts,
			workingSelectors,
			failedSelectors,
			recommendations,
		};
	}

	/**
	 * テストページを取得
	 */
	private async fetchTestPage(url: string): Promise<string> {
		const response = await fetch(url, {
			headers: generateDLsiteHeaders(),
			signal: AbortSignal.timeout(10000), // 10秒タイムアウト
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response.text();
	}

	/**
	 * リスクレベルを判定
	 */
	private determineRiskLevel(overallHealth: number): "low" | "medium" | "high" | "critical" {
		if (overallHealth >= 0.9) return "low";
		if (overallHealth >= 0.7) return "medium";
		if (overallHealth >= 0.5) return "high";
		return "critical";
	}

	/**
	 * 構造変更を検知
	 */
	private detectStructureChange(fieldResults: Record<string, FieldHealthResult>): Date | undefined {
		// 多数のフィールドで成功率が著しく低い場合、構造変更と判定
		const lowPerformanceFields = Object.entries(fieldResults).filter(
			([_, result]) => result.successRate < 0.5 && result.attempts > 0,
		);

		if (lowPerformanceFields.length >= 3) {
			return new Date();
		}

		return undefined;
	}

	/**
	 * 推奨アクションを生成
	 */
	private generateRecommendations(
		overallHealth: number,
		fieldResults: Record<string, FieldHealthResult>,
	): string[] {
		const recommendations: string[] = [];

		if (overallHealth < 0.3) {
			recommendations.push("🚨 重大: DLsiteの構造が大幅に変更された可能性があります");
			recommendations.push("📋 即座にパーサー設定の全面見直しを実施してください");
			recommendations.push("🔧 フォールバックセレクターの追加を検討してください");
		} else if (overallHealth < 0.6) {
			recommendations.push("⚠️ 警告: 複数のフィールドで解析精度が低下しています");
			recommendations.push("🔍 セレクターの部分的な更新が必要です");
		} else if (overallHealth < 0.8) {
			recommendations.push("📈 改善: 一部フィールドの最適化を推奨します");
		}

		// フィールド別の具体的推奨事項
		const criticalFields = Object.entries(fieldResults).filter(
			([_, result]) => result.successRate < 0.5,
		);

		if (criticalFields.length > 0) {
			recommendations.push(
				`🎯 優先対応フィールド: ${criticalFields.map(([name]) => name).join(", ")}`,
			);
		}

		// セレクター追加の提案
		const fieldsNeedingSelectors = Object.entries(fieldResults).filter(
			([_, result]) => result.workingSelectors.length < 2,
		);

		if (fieldsNeedingSelectors.length > 0) {
			recommendations.push("➕ セレクターの追加を推奨するフィールドがあります");
		}

		return recommendations;
	}

	/**
	 * フィールド別推奨事項を生成
	 */
	private generateFieldRecommendations(
		fieldName: string,
		successRate: number,
		threshold: number,
	): string[] {
		const recommendations: string[] = [];

		if (successRate < threshold * 0.5) {
			recommendations.push(`${fieldName}: セレクターの完全な見直しが必要`);
			recommendations.push(`${fieldName}: 新しいHTML構造に対応したセレクターを追加`);
		} else if (successRate < threshold) {
			recommendations.push(`${fieldName}: フォールバックセレクターの追加を検討`);
			recommendations.push(`${fieldName}: 既存セレクターの優先度調整が必要`);
		}

		return recommendations;
	}

	/**
	 * 継続的監視を開始
	 */
	public async startContinuousMonitoring(intervalMinutes = 60): Promise<void> {
		logger.info("DLsite継続的監視開始", { intervalMinutes });

		const monitor = async () => {
			try {
				const healthCheck = await this.performHealthCheck(2); // 軽量チェック

				if (healthCheck.riskLevel === "high" || healthCheck.riskLevel === "critical") {
					logger.error("DLsite構造の重大な問題を検知", {
						overallHealth: healthCheck.overallHealth,
						riskLevel: healthCheck.riskLevel,
						failingSelectors: healthCheck.failingSelectors.length,
					});
				}

				// 統計を記録
				for (const [fieldName, result] of Object.entries(healthCheck.fieldResults)) {
					this.configManager.recordParsingResult(fieldName, result.successRate > 0.8);
				}
			} catch (error) {
				logger.error("DLsite監視中にエラーが発生", { error });
			}
		};

		// 初回実行
		await monitor();

		// 定期実行（実際の本番環境では適切なスケジューラーを使用）
		setInterval(monitor, intervalMinutes * 60 * 1000);
	}

	/**
	 * 構造ヘルスチェック（テスト用ラッパー）
	 */
	public async checkStructureHealth(urls: string[]): Promise<{
		overallHealthy: boolean;
		successRate: number;
		fieldsChecked: number;
		fieldResults: Array<{
			fieldName: string;
			successRate: number;
			attempts: number;
			workingSelectors: string[];
		}>;
		recommendations: string[];
		timestamp: Date;
	}> {
		try {
			const healthCheck = await this.performHealthCheck(urls.length);

			return {
				overallHealthy: healthCheck.overallHealth > 0.8,
				successRate: healthCheck.overallHealth,
				fieldsChecked: Object.keys(healthCheck.fieldResults).length,
				fieldResults: Object.entries(healthCheck.fieldResults).map(([fieldName, result]) => ({
					fieldName,
					successRate: result.successRate,
					attempts: result.attempts,
					workingSelectors: result.workingSelectors,
				})),
				recommendations: healthCheck.recommendedActions,
				timestamp: new Date(),
			};
		} catch (error) {
			// エラー時のフォールバック応答
			logger.error("構造ヘルスチェックでエラーが発生", { error });
			return {
				overallHealthy: false,
				successRate: 0,
				fieldsChecked: 0,
				fieldResults: [],
				recommendations: ["ネットワーク接続の確認", "DLsiteサイトの可用性確認"],
				timestamp: new Date(),
			};
		}
	}

	/**
	 * 緊急時の自動修復を試行
	 */
	public async attemptAutoRepair(): Promise<boolean> {
		logger.info("DLsite自動修復を試行中...");

		try {
			const healthCheck = await this.performHealthCheck(1);

			if (healthCheck.riskLevel === "critical") {
				// 動作中のセレクターのみを使用する緊急設定に切り替え
				const workingSelectors: Record<string, string[]> = {};

				for (const [fieldName, result] of Object.entries(healthCheck.fieldResults)) {
					if (result.workingSelectors.length > 0) {
						workingSelectors[fieldName] = result.workingSelectors;
					}
				}

				if (Object.keys(workingSelectors).length > 5) {
					logger.info("緊急設定への切り替えを実行", {
						workingFields: Object.keys(workingSelectors).length,
					});

					// ここで実際の設定更新を行う
					// this.configManager.updateConfig({ ... });

					return true;
				}
			}

			return false;
		} catch (error) {
			logger.error("自動修復中にエラーが発生", { error });
			return false;
		}
	}
}

/**
 * DLsiteヘルスチェックを実行するヘルパー関数
 */
export async function performDLsiteHealthCheck(sampleSize = 3): Promise<StructureHealthCheck> {
	return DLsiteHealthMonitor.getInstance().performHealthCheck(sampleSize);
}

/**
 * DLsite継続監視を開始するヘルパー関数
 */
export async function startDLsiteMonitoring(intervalMinutes = 60): Promise<void> {
	return DLsiteHealthMonitor.getInstance().startContinuousMonitoring(intervalMinutes);
}

/**
 * シングルトンインスタンスを取得するヘルパー関数
 */
export function getDLsiteHealthMonitor(): DLsiteHealthMonitor {
	return DLsiteHealthMonitor.getInstance();
}
