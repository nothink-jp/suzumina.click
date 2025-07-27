/**
 * 価格データ品質検証ツール
 *
 * RJ01414353で発見された二重割引問題を含む、価格データの品質問題を検出・分析
 */

import type { PriceHistoryDocument, WorkDocument } from "@suzumina.click/shared-types";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin初期化
if (!process.env.GOOGLE_CLOUD_PROJECT) {
	throw new Error("GOOGLE_CLOUD_PROJECT environment variable is required");
}

initializeApp({
	projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const db = getFirestore();

interface PriceDataIssue {
	workId: string;
	issueType:
		| "double_discount" // 二重割引適用
		| "price_inconsistency" // 価格不整合
		| "missing_official_price" // official_price未設定
		| "invalid_discount_rate" // 異常な割引率
		| "price_spike" // 異常な価格変動
		| "negative_price"; // 負の価格
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	currentPrice?: number;
	expectedPrice?: number;
	discountRate?: number;
	officialPrice?: number;
	affectedDates?: string[];
}

class PriceDataQualityChecker {
	private issues: PriceDataIssue[] = [];
	private checkedWorks = 0;
	private totalWorks = 0;

	/**
	 * 全作品の価格データ品質をチェック
	 */
	async checkAllWorks(): Promise<void> {
		console.log("🔍 価格データ品質チェックを開始します...");

		// dlsiteWorks コレクション全体をチェック
		const worksSnapshot = await db.collection("dlsiteWorks").get();
		this.totalWorks = worksSnapshot.size;

		console.log(`📊 総作品数: ${this.totalWorks}`);

		for (const workDoc of worksSnapshot.docs) {
			const workData = workDoc.data() as WorkDocument;
			await this.checkWorkPriceData(workDoc.id, workData);
			this.checkedWorks++;

			// 進捗表示（100件ごと）
			if (this.checkedWorks % 100 === 0) {
				console.log(
					`⏳ 進捗: ${this.checkedWorks}/${this.totalWorks} (${Math.round((this.checkedWorks / this.totalWorks) * 100)}%)`,
				);
			}
		}

		// 全作品チェック完了ログは省略（成功時ログ削減）
	}

	/**
	 * 特定作品の価格データをチェック
	 */
	private async checkWorkPriceData(workId: string, workData: WorkDocument): Promise<void> {
		// 現在価格の妥当性チェック
		this.checkCurrentPriceValidity(workId, workData);

		// 価格履歴データの妥当性チェック
		await this.checkPriceHistoryData(workId, workData);

		// 割引ロジックの妥当性チェック
		this.checkDiscountLogic(workId, workData);
	}

	/**
	 * 現在価格の妥当性をチェック
	 */
	private checkCurrentPriceValidity(workId: string, workData: WorkDocument): void {
		const currentPrice = workData.price?.current;
		const discountRate = workData.discountRate;
		const officialPrice = workData.officialPrice;

		// 負の価格チェック
		if (currentPrice !== undefined && currentPrice < 0) {
			this.addIssue({
				workId,
				issueType: "negative_price",
				severity: "critical",
				description: "価格が負の値になっています",
				currentPrice,
			});
		}

		// 異常な割引率チェック
		if (discountRate !== undefined && (discountRate < 0 || discountRate > 1)) {
			this.addIssue({
				workId,
				issueType: "invalid_discount_rate",
				severity: "high",
				description: `異常な割引率が設定されています: ${discountRate * 100}%`,
				discountRate,
				currentPrice,
			});
		}

		// 二重割引チェック（RJ01414353パターン）
		if (discountRate && discountRate > 0 && officialPrice && currentPrice) {
			// セール中なのに current < official でない場合は二重割引の可能性
			const expectedDiscountPrice = Math.round(officialPrice * (1 - discountRate));

			if (Math.abs(currentPrice - expectedDiscountPrice) > 1) {
				// 1円以上の差がある場合は問題の可能性
				this.addIssue({
					workId,
					issueType: "double_discount",
					severity: "high",
					description: "二重割引が適用されている可能性があります",
					currentPrice,
					expectedPrice: expectedDiscountPrice,
					discountRate,
					officialPrice,
				});
			}
		}

		// official_price未設定チェック
		if (discountRate && discountRate > 0 && !officialPrice) {
			this.addIssue({
				workId,
				issueType: "missing_official_price",
				severity: "medium",
				description: "セール中なのにofficial_priceが設定されていません",
				currentPrice,
				discountRate,
			});
		}
	}

	/**
	 * 価格履歴データの妥当性をチェック
	 */
	private async checkPriceHistoryData(workId: string, workData: WorkDocument): Promise<void> {
		try {
			const priceHistorySnapshot = await db
				.collection("dlsiteWorks")
				.doc(workId)
				.collection("priceHistory")
				.orderBy("date", "desc")
				.limit(30) // 最近30日分をチェック
				.get();

			if (priceHistorySnapshot.empty) {
				return; // 価格履歴がない場合はスキップ
			}

			const priceHistory: PriceHistoryDocument[] = priceHistorySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			})) as PriceHistoryDocument[];

			// 価格の急激な変動をチェック
			this.checkPriceSpikes(workId, priceHistory);

			// 価格整合性チェック
			this.checkPriceConsistency(workId, workData, priceHistory);
		} catch (error) {
			console.error(`❌ 価格履歴チェックエラー ${workId}:`, error);
		}
	}

	/**
	 * 価格の急激な変動をチェック
	 */
	private checkPriceSpikes(workId: string, priceHistory: PriceHistoryDocument[]): void {
		if (priceHistory.length < 2) return;

		for (let i = 0; i < priceHistory.length - 1; i++) {
			const current = priceHistory[i];
			const previous = priceHistory[i + 1];

			// 50%以上の価格変動をチェック
			const changeRate =
				Math.abs(current.regularPrice - previous.regularPrice) / previous.regularPrice;

			if (changeRate > 0.5) {
				this.addIssue({
					workId,
					issueType: "price_spike",
					severity: "medium",
					description: `急激な価格変動が検出されました: ${previous.regularPrice}円 → ${current.regularPrice}円 (${Math.round(changeRate * 100)}%変動)`,
					currentPrice: current.regularPrice,
					expectedPrice: previous.regularPrice,
					affectedDates: [current.date, previous.date],
				});
			}
		}
	}

	/**
	 * 割引ロジックの妥当性をチェック
	 */
	private checkDiscountLogic(workId: string, workData: WorkDocument): void {
		const currentPrice = workData.price?.current;
		const discountRate = workData.discountRate;
		const officialPrice = workData.officialPrice;

		if (!discountRate || discountRate === 0) {
			return; // セール中でない場合はスキップ
		}

		// セール中のロジック整合性チェック
		if (currentPrice && officialPrice) {
			const actualDiscountRate = (officialPrice - currentPrice) / officialPrice;
			const reportedDiscountRate = discountRate;

			// 割引率の差が5%以上ある場合は問題の可能性
			if (Math.abs(actualDiscountRate - reportedDiscountRate) > 0.05) {
				this.addIssue({
					workId,
					issueType: "price_inconsistency",
					severity: "medium",
					description: `実際の割引率(${Math.round(actualDiscountRate * 100)}%)と報告された割引率(${Math.round(reportedDiscountRate * 100)}%)に大きな差があります`,
					currentPrice,
					officialPrice,
					discountRate: reportedDiscountRate,
				});
			}
		}
	}

	/**
	 * 価格整合性チェック
	 */
	private checkPriceConsistency(
		workId: string,
		workData: WorkDocument,
		priceHistory: PriceHistoryDocument[],
	): void {
		const latestHistory = priceHistory[0];
		const currentPrice = workData.price?.current;

		if (!latestHistory || !currentPrice) {
			return;
		}

		// 最新の価格履歴と現在価格の整合性チェック
		if (Math.abs(latestHistory.regularPrice - currentPrice) > 1) {
			this.addIssue({
				workId,
				issueType: "price_inconsistency",
				severity: "low",
				description: `現在価格(${currentPrice}円)と最新価格履歴(${latestHistory.regularPrice}円)に差があります`,
				currentPrice,
				expectedPrice: latestHistory.regularPrice,
				affectedDates: [latestHistory.date],
			});
		}
	}

	/**
	 * 問題を追加
	 */
	private addIssue(issue: PriceDataIssue): void {
		this.issues.push(issue);
	}

	/**
	 * 結果をレポート
	 */
	generateReport(): void {
		console.log(`\n${"=".repeat(80)}`);
		console.log("📋 価格データ品質チェック結果レポート");
		console.log("=".repeat(80));

		console.log(`\n📊 検査対象: ${this.checkedWorks}作品`);
		console.log(`🚨 発見された問題: ${this.issues.length}件\n`);

		// 問題タイプ別集計
		const issueStats: Record<string, number> = {};
		const severityStats: Record<string, number> = {};

		for (const issue of this.issues) {
			issueStats[issue.issueType] = (issueStats[issue.issueType] || 0) + 1;
			severityStats[issue.severity] = (severityStats[issue.severity] || 0) + 1;
		}

		// 問題タイプ別統計表示
		console.log("📈 問題タイプ別統計:");
		Object.entries(issueStats)
			.sort(([, a], [, b]) => b - a)
			.forEach(([type, count]) => {
				console.log(`  ${type}: ${count}件`);
			});

		console.log("\n🚨 重要度別統計:");
		Object.entries(severityStats)
			.sort(([, a], [, b]) => b - a)
			.forEach(([severity, count]) => {
				console.log(`  ${severity}: ${count}件`);
			});

		// 重要度の高い問題を詳細表示
		console.log("\n🔥 高重要度問題 (high/critical):");
		const highPriorityIssues = this.issues.filter(
			(issue) => issue.severity === "high" || issue.severity === "critical",
		);

		if (highPriorityIssues.length === 0) {
			// 問題なし確認ログは省略（成功時ログ削減）
		} else {
			highPriorityIssues.slice(0, 10).forEach((issue, index) => {
				console.log(`\n  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.workId}`);
				console.log(`     ${issue.description}`);
				if (issue.currentPrice !== undefined) {
					console.log(`     現在価格: ${issue.currentPrice}円`);
				}
				if (issue.expectedPrice !== undefined) {
					console.log(`     期待価格: ${issue.expectedPrice}円`);
				}
			});

			if (highPriorityIssues.length > 10) {
				console.log(`\n  ... 他 ${highPriorityIssues.length - 10}件`);
			}
		}

		console.log(`\n${"=".repeat(80)}`);
	}

	/**
	 * 修正が必要な作品IDのリストを出力
	 */
	getWorksNeedingFix(): string[] {
		return [
			...new Set(
				this.issues
					.filter((issue) => issue.severity === "high" || issue.severity === "critical")
					.map((issue) => issue.workId),
			),
		];
	}

	/**
	 * 詳細レポートをJSONで出力
	 */
	exportDetailedReport(filename = "price-quality-report.json"): void {
		const report = {
			metadata: {
				generatedAt: new Date().toISOString(),
				checkedWorks: this.checkedWorks,
				totalIssues: this.issues.length,
			},
			summary: {
				issueTypes: Object.fromEntries(
					Object.entries(
						this.issues.reduce(
							(acc, issue) => {
								acc[issue.issueType] = (acc[issue.issueType] || 0) + 1;
								return acc;
							},
							{} as Record<string, number>,
						),
					),
				),
				severities: Object.fromEntries(
					Object.entries(
						this.issues.reduce(
							(acc, issue) => {
								acc[issue.severity] = (acc[issue.severity] || 0) + 1;
								return acc;
							},
							{} as Record<string, number>,
						),
					),
				),
			},
			issues: this.issues,
			fixRecommendations: this.generateFixRecommendations(),
		};

		// ファイル出力をコンソール出力に変更（Claudeの制限）
		console.log(`\n📄 詳細レポート (${filename}):`);
		console.log(JSON.stringify(report, null, 2));
	}

	/**
	 * 修正推奨事項を生成
	 */
	private generateFixRecommendations(): Record<string, string> {
		return {
			double_discount:
				"price-extractor.tsのgetPriceByType関数を修正し、セール中はofficial_priceを使用するよう変更",
			price_inconsistency: "データ収集プロセスの見直しと価格履歴の再計算",
			missing_official_price: "Individual Info APIからのofficial_price取得ロジックの追加",
			invalid_discount_rate: "discount_rate値の検証とサニタイゼーション",
			price_spike: "異常な価格変動の原因調査とデータ修正",
			negative_price: "即座にデータ修正が必要（クリティカル）",
		};
	}
}

/**
 * メイン実行関数
 */
async function main() {
	const checker = new PriceDataQualityChecker();

	try {
		await checker.checkAllWorks();
		checker.generateReport();

		const worksNeedingFix = checker.getWorksNeedingFix();
		if (worksNeedingFix.length > 0) {
			console.log(`\n🔧 修正が必要な作品: ${worksNeedingFix.length}件`);
			console.log("作品ID一覧:", worksNeedingFix.join(", "));
		}

		// 詳細レポート出力
		checker.exportDetailedReport();
	} catch (error) {
		console.error("❌ チェック実行エラー:", error);
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch(console.error);
}
