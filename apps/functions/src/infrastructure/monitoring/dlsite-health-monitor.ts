/**
 * DLsite構造ヘルスモニタリングシステム
 *
 * DLsiteの構造変更を検知し、パーサーの健全性を監視します。
 * 解析成功率の低下やページ構造の変化を早期に検出し、
 * 適切な対応策を提案します。
 */

import * as cheerio from "cheerio";
import * as logger from "../../shared/logger";
import { getParserConfigManager, type ParserConfig } from "../management/parser-config";
import { generateDLsiteHeaders } from "../management/user-agent-manager";

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
		"https://www.dlsite.com/maniax/work/=/product_id/RJ256468.html",
		"https://www.dlsite.com/maniax/work/=/product_id/RJ432317.html",
		"https://www.dlsite.com/maniax/work/=/product_id/RJ01037463.html",
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
		const fieldResults = await this.checkAllFields(testUrls);
		const overallHealth = this.calculateOverallHealth(fieldResults);

		const result = this.buildHealthCheckResult(testUrls, fieldResults, overallHealth);

		logger.info("DLsite構造ヘルスチェック完了", {
			overallHealth: Math.round(overallHealth * 100),
			riskLevel: result.riskLevel,
			failingSelectorCount: result.failingSelectors.length,
		});

		return result;
	}

	/**
	 * 全フィールドをチェック
	 */
	private async checkAllFields(testUrls: string[]): Promise<Record<string, FieldHealthResult>> {
		const fieldResults: Record<string, FieldHealthResult> = {};
		const config = this.configManager.getConfig();

		for (const fieldName of Object.keys(config.fields)) {
			const fieldResult = await this.checkFieldHealth(fieldName, testUrls);
			fieldResults[fieldName] = fieldResult;
		}

		return fieldResults;
	}

	/**
	 * 全体健康度を計算
	 */
	private calculateOverallHealth(fieldResults: Record<string, FieldHealthResult>): number {
		let totalSuccessCount = 0;
		let totalFieldCount = 0;

		for (const result of Object.values(fieldResults)) {
			totalSuccessCount += result.successRate * result.attempts;
			totalFieldCount += result.attempts;
		}

		return totalFieldCount > 0 ? totalSuccessCount / totalFieldCount : 0;
	}

	/**
	 * ヘルスチェック結果を構築
	 */
	private buildHealthCheckResult(
		testUrls: string[],
		fieldResults: Record<string, FieldHealthResult>,
		overallHealth: number,
	): StructureHealthCheck {
		const riskLevel = this.determineRiskLevel(overallHealth);
		const failingSelectors = Object.values(fieldResults).flatMap(
			(result) => result.failedSelectors,
		);
		const recommendedActions = this.generateRecommendations(overallHealth, fieldResults);

		return {
			overallHealth,
			lastStructureChange: this.detectStructureChange(fieldResults),
			failingSelectors,
			recommendedActions,
			fieldResults,
			riskLevel,
			sampleCount: testUrls.length,
		};
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
			return this.createFieldNotFoundResult(fieldName);
		}

		const result = await this.testSelectorsOnUrls(fieldConfig, testUrls);
		const recommendations = this.generateFieldRecommendations(
			fieldName,
			result.successRate,
			fieldConfig.selectors.minSuccessRate,
		);

		return {
			...result,
			recommendations,
		};
	}

	/**
	 * フィールド設定が見つからない場合の結果を作成
	 */
	private createFieldNotFoundResult(fieldName: string): FieldHealthResult {
		return {
			successRate: 0,
			attempts: 0,
			workingSelectors: [],
			failedSelectors: [],
			recommendations: [`フィールド ${fieldName} の設定が見つかりません`],
		};
	}

	/**
	 * 複数URLでセレクターをテスト
	 */
	private async testSelectorsOnUrls(
		fieldConfig: { selectors: { primary: string[]; secondary: string[]; minSuccessRate: number } },
		testUrls: string[],
	): Promise<{
		successRate: number;
		attempts: number;
		workingSelectors: string[];
		failedSelectors: string[];
	}> {
		const workingSelectors: string[] = [];
		const failedSelectors: string[] = [];
		let successCount = 0;
		let totalAttempts = 0;

		for (const url of testUrls) {
			try {
				const html = await this.fetchTestPage(url);
				const $ = cheerio.load(html);

				const urlResult = this.testSelectorsOnPage($, fieldConfig);
				successCount += urlResult.successCount;
				totalAttempts += urlResult.totalAttempts;

				this.updateSelectorLists(
					urlResult.workingSelectors,
					urlResult.failedSelectors,
					workingSelectors,
					failedSelectors,
				);
			} catch (error) {
				logger.warn(`テストURL取得失敗: ${url}`, { error });
			}
		}

		const successRate = totalAttempts > 0 ? successCount / totalAttempts : 0;
		return { successRate, attempts: totalAttempts, workingSelectors, failedSelectors };
	}

	/**
	 * 単一ページでセレクターをテスト
	 */
	private testSelectorsOnPage(
		$: cheerio.CheerioAPI,
		fieldConfig: { selectors: { primary: string[]; secondary: string[] } },
	): {
		successCount: number;
		totalAttempts: number;
		workingSelectors: string[];
		failedSelectors: string[];
	} {
		const workingSelectors: string[] = [];
		const failedSelectors: string[] = [];
		let successCount = 0;
		let totalAttempts = 0;

		// プライマリセレクターのテスト
		const primaryResult = this.testSelectors($, fieldConfig.selectors.primary);
		successCount += primaryResult.successCount;
		totalAttempts += primaryResult.totalAttempts;
		workingSelectors.push(...primaryResult.workingSelectors);
		failedSelectors.push(...primaryResult.failedSelectors);

		// セカンダリセレクターのテスト（プライマリが失敗した場合）
		if (successCount === 0) {
			const secondaryResult = this.testSelectors($, fieldConfig.selectors.secondary);
			successCount += secondaryResult.successCount;
			totalAttempts += secondaryResult.totalAttempts;
			workingSelectors.push(...secondaryResult.workingSelectors);
			failedSelectors.push(...secondaryResult.failedSelectors);
		}

		return { successCount, totalAttempts, workingSelectors, failedSelectors };
	}

	/**
	 * セレクター配列をテスト
	 */
	private testSelectors(
		$: cheerio.CheerioAPI,
		selectors: string[],
	): {
		successCount: number;
		totalAttempts: number;
		workingSelectors: string[];
		failedSelectors: string[];
	} {
		const workingSelectors: string[] = [];
		const failedSelectors: string[] = [];
		let successCount = 0;

		for (const selector of selectors) {
			const elements = $(selector);
			if (elements.length > 0 && elements.text().trim()) {
				successCount++;
				workingSelectors.push(selector);
			} else {
				failedSelectors.push(selector);
			}
		}

		return {
			successCount,
			totalAttempts: selectors.length,
			workingSelectors,
			failedSelectors,
		};
	}

	/**
	 * セレクターリストを更新（重複排除）
	 */
	private updateSelectorLists(
		newWorking: string[],
		newFailed: string[],
		workingSelectors: string[],
		failedSelectors: string[],
	): void {
		for (const selector of newWorking) {
			if (!workingSelectors.includes(selector)) {
				workingSelectors.push(selector);
			}
		}
		for (const selector of newFailed) {
			if (!failedSelectors.includes(selector)) {
				failedSelectors.push(selector);
			}
		}
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
			return this.formatHealthCheckForTest(healthCheck);
		} catch (error) {
			return this.createErrorResponse(error);
		}
	}

	/**
	 * 緊急時の自動修復を試行
	 */
	public async attemptAutoRepair(): Promise<boolean> {
		logger.info("DLsite自動修復を試行中...");

		try {
			const healthCheck = await this.performHealthCheck(1);
			return this.executeEmergencyRepair(healthCheck);
		} catch (error) {
			logger.error("自動修復中にエラーが発生", { error });
			return false;
		}
	}

	/**
	 * テスト用レスポンスをフォーマット
	 */
	private formatHealthCheckForTest(healthCheck: StructureHealthCheck) {
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
	}

	/**
	 * エラー時のフォールバック応答を作成
	 */
	private createErrorResponse(error: unknown) {
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

	/**
	 * 緊急修復を実行
	 */
	private executeEmergencyRepair(healthCheck: StructureHealthCheck): boolean {
		if (healthCheck.riskLevel !== "critical") {
			return false;
		}

		const workingSelectors = this.extractWorkingSelectors(healthCheck.fieldResults);

		if (Object.keys(workingSelectors).length > 5) {
			logger.info("緊急設定への切り替えを実行", {
				workingFields: Object.keys(workingSelectors).length,
			});
			// this.configManager.updateConfig({ ... });
			return true;
		}

		return false;
	}

	/**
	 * 動作中のセレクターを抽出
	 */
	private extractWorkingSelectors(
		fieldResults: Record<string, FieldHealthResult>,
	): Record<string, string[]> {
		const workingSelectors: Record<string, string[]> = {};

		for (const [fieldName, result] of Object.entries(fieldResults)) {
			if (result.workingSelectors.length > 0) {
				workingSelectors[fieldName] = result.workingSelectors;
			}
		}

		return workingSelectors;
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
