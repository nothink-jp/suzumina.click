/**
 * 価格データ修正ツール
 *
 * 品質チェックで発見された問題のある価格データを修正
 */

import type {
	OptimizedFirestoreDLsiteWorkData,
	PriceHistoryDocument,
} from "@suzumina.click/shared-types";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// Firebase Admin初期化
if (!process.env.GOOGLE_CLOUD_PROJECT) {
	throw new Error("GOOGLE_CLOUD_PROJECT environment variable is required");
}

initializeApp({
	projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const db = getFirestore();

interface FixResult {
	workId: string;
	issueType: string;
	status: "success" | "failed" | "skipped";
	oldValue?: any;
	newValue?: any;
	error?: string;
}

class PriceDataFixer {
	private fixResults: FixResult[] = [];
	private dryRun: boolean;

	constructor(dryRun = true) {
		this.dryRun = dryRun;
		console.log(`🔧 価格データ修正ツール (${dryRun ? "DRY RUN" : "LIVE RUN"})`);
	}

	/**
	 * 特定の作品の二重割引問題を修正
	 */
	async fixDoubleDiscountIssue(workId: string): Promise<FixResult> {
		console.log(`🔍 ${workId}: 二重割引問題の修正を開始...`);

		try {
			const workDoc = await db.collection("dlsiteWorks").doc(workId).get();
			if (!workDoc.exists) {
				return this.recordResult(
					workId,
					"double_discount",
					"failed",
					undefined,
					undefined,
					"作品が見つかりません",
				);
			}

			const workData = workDoc.data() as OptimizedFirestoreDLsiteWorkData;
			const { price, discountRate, officialPrice } = workData;

			// 二重割引の条件チェック
			if (!discountRate || discountRate === 0 || !officialPrice || !price?.current) {
				return this.recordResult(
					workId,
					"double_discount",
					"skipped",
					undefined,
					undefined,
					"二重割引の条件に該当しません",
				);
			}

			// 正しいセール価格を計算
			const correctDiscountPrice = Math.round(officialPrice * (1 - discountRate));
			const currentPrice = price.current;

			// 既に正しい価格の場合はスキップ
			if (Math.abs(currentPrice - correctDiscountPrice) <= 1) {
				return this.recordResult(
					workId,
					"double_discount",
					"skipped",
					currentPrice,
					correctDiscountPrice,
					"価格は既に正しい値です",
				);
			}

			console.log(`  現在価格: ${currentPrice}円`);
			console.log(`  正しい価格: ${correctDiscountPrice}円`);
			console.log(`  定価: ${officialPrice}円`);
			console.log(`  割引率: ${Math.round(discountRate * 100)}%`);

			if (!this.dryRun) {
				// 価格データを修正
				await workDoc.ref.update({
					"price.current": correctDiscountPrice,
					updatedAt: FieldValue.serverTimestamp(),
				});

				// 価格履歴も修正（最新のエントリ）
				await this.fixLatestPriceHistory(workId, correctDiscountPrice);
			}

			return this.recordResult(
				workId,
				"double_discount",
				"success",
				currentPrice,
				correctDiscountPrice,
			);
		} catch (error) {
			console.error(`❌ ${workId}: 修正エラー:`, error);
			return this.recordResult(
				workId,
				"double_discount",
				"failed",
				undefined,
				undefined,
				error instanceof Error ? error.message : "不明なエラー",
			);
		}
	}

	/**
	 * 負の価格問題を修正
	 */
	async fixNegativePriceIssue(workId: string): Promise<FixResult> {
		console.log(`🔍 ${workId}: 負の価格問題の修正を開始...`);

		try {
			const workDoc = await db.collection("dlsiteWorks").doc(workId).get();
			if (!workDoc.exists) {
				return this.recordResult(
					workId,
					"negative_price",
					"failed",
					undefined,
					undefined,
					"作品が見つかりません",
				);
			}

			const workData = workDoc.data() as OptimizedFirestoreDLsiteWorkData;
			const currentPrice = workData.price?.current;

			if (currentPrice === undefined || currentPrice >= 0) {
				return this.recordResult(
					workId,
					"negative_price",
					"skipped",
					currentPrice,
					undefined,
					"負の価格ではありません",
				);
			}

			// 価格履歴から正常な価格を推定
			const correctPrice = await this.estimateCorrectPrice(workId);
			if (correctPrice === null) {
				return this.recordResult(
					workId,
					"negative_price",
					"failed",
					currentPrice,
					undefined,
					"正常な価格を推定できませんでした",
				);
			}

			console.log(`  現在価格: ${currentPrice}円`);
			console.log(`  推定価格: ${correctPrice}円`);

			if (!this.dryRun) {
				await workDoc.ref.update({
					"price.current": correctPrice,
					updatedAt: FieldValue.serverTimestamp(),
				});
			}

			return this.recordResult(workId, "negative_price", "success", currentPrice, correctPrice);
		} catch (error) {
			console.error(`❌ ${workId}: 修正エラー:`, error);
			return this.recordResult(
				workId,
				"negative_price",
				"failed",
				undefined,
				undefined,
				error instanceof Error ? error.message : "不明なエラー",
			);
		}
	}

	/**
	 * 異常な割引率を修正
	 */
	async fixInvalidDiscountRateIssue(workId: string): Promise<FixResult> {
		console.log(`🔍 ${workId}: 異常な割引率の修正を開始...`);

		try {
			const workDoc = await db.collection("dlsiteWorks").doc(workId).get();
			if (!workDoc.exists) {
				return this.recordResult(
					workId,
					"invalid_discount_rate",
					"failed",
					undefined,
					undefined,
					"作品が見つかりません",
				);
			}

			const workData = workDoc.data() as OptimizedFirestoreDLsiteWorkData;
			const discountRate = workData.discountRate;

			if (discountRate === undefined || (discountRate >= 0 && discountRate <= 1)) {
				return this.recordResult(
					workId,
					"invalid_discount_rate",
					"skipped",
					discountRate,
					undefined,
					"正常な割引率です",
				);
			}

			// 異常な割引率を0にリセット
			const correctedRate = 0;
			console.log(`  現在の割引率: ${discountRate}`);
			console.log(`  修正後の割引率: ${correctedRate}`);

			if (!this.dryRun) {
				const updateData: any = {
					discountRate: correctedRate,
					updatedAt: FieldValue.serverTimestamp(),
				};

				// 割引率が0の場合はofficial_priceも削除
				if (correctedRate === 0) {
					updateData.officialPrice = FieldValue.delete();
				}

				await workDoc.ref.update(updateData);
			}

			return this.recordResult(
				workId,
				"invalid_discount_rate",
				"success",
				discountRate,
				correctedRate,
			);
		} catch (error) {
			console.error(`❌ ${workId}: 修正エラー:`, error);
			return this.recordResult(
				workId,
				"invalid_discount_rate",
				"failed",
				undefined,
				undefined,
				error instanceof Error ? error.message : "不明なエラー",
			);
		}
	}

	/**
	 * 最新の価格履歴を修正
	 */
	private async fixLatestPriceHistory(workId: string, correctPrice: number): Promise<void> {
		const priceHistorySnapshot = await db
			.collection("dlsiteWorks")
			.doc(workId)
			.collection("priceHistory")
			.orderBy("date", "desc")
			.limit(1)
			.get();

		if (!priceHistorySnapshot.empty) {
			const latestDoc = priceHistorySnapshot.docs[0];
			const latestData = latestDoc.data() as PriceHistoryDocument;

			// discountPriceが設定されている場合は修正
			if (latestData.discountPrice !== undefined) {
				await latestDoc.ref.update({
					discountPrice: correctPrice,
					updatedAt: FieldValue.serverTimestamp(),
				});
				console.log(`  価格履歴も修正: ${latestData.discountPrice}円 → ${correctPrice}円`);
			}
		}
	}

	/**
	 * 価格履歴から正常な価格を推定
	 */
	private async estimateCorrectPrice(workId: string): Promise<number | null> {
		const priceHistorySnapshot = await db
			.collection("dlsiteWorks")
			.doc(workId)
			.collection("priceHistory")
			.orderBy("date", "desc")
			.limit(10)
			.get();

		if (priceHistorySnapshot.empty) {
			return null;
		}

		const validPrices: number[] = [];
		for (const doc of priceHistorySnapshot.docs) {
			const data = doc.data() as PriceHistoryDocument;
			if (data.regularPrice > 0) {
				validPrices.push(data.regularPrice);
			}
			if (data.discountPrice && data.discountPrice > 0) {
				validPrices.push(data.discountPrice);
			}
		}

		if (validPrices.length === 0) {
			return null;
		}

		// 最頻値を返す（最も多く現れる価格）
		const priceFrequency = validPrices.reduce(
			(acc, price) => {
				acc[price] = (acc[price] || 0) + 1;
				return acc;
			},
			{} as Record<number, number>,
		);

		return Number(Object.entries(priceFrequency).sort(([, a], [, b]) => b - a)[0][0]);
	}

	/**
	 * 結果を記録
	 */
	private recordResult(
		workId: string,
		issueType: string,
		status: "success" | "failed" | "skipped",
		oldValue?: any,
		newValue?: any,
		error?: string,
	): FixResult {
		const result: FixResult = {
			workId,
			issueType,
			status,
			oldValue,
			newValue,
			error,
		};
		this.fixResults.push(result);
		return result;
	}

	/**
	 * 複数の作品を一括修正
	 */
	async batchFix(workIds: string[], issueType: string): Promise<void> {
		console.log(`🔧 一括修正開始: ${workIds.length}件の${issueType}問題`);

		for (const workId of workIds) {
			try {
				switch (issueType) {
					case "double_discount":
						await this.fixDoubleDiscountIssue(workId);
						break;
					case "negative_price":
						await this.fixNegativePriceIssue(workId);
						break;
					case "invalid_discount_rate":
						await this.fixInvalidDiscountRateIssue(workId);
						break;
					default:
						console.log(`⚠️  ${workId}: 未対応の問題タイプ: ${issueType}`);
				}
			} catch (error) {
				console.error(`❌ ${workId}: 修正エラー:`, error);
			}

			// 処理間隔を開ける（Firestore負荷軽減）
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		this.generateReport();
	}

	/**
	 * 修正結果レポートを生成
	 */
	generateReport(): void {
		console.log("\n" + "=".repeat(80));
		console.log("🔧 価格データ修正結果レポート");
		console.log("=".repeat(80));

		const statusCounts = this.fixResults.reduce(
			(acc, result) => {
				acc[result.status] = (acc[result.status] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		console.log("\n📊 修正結果統計:");
		console.log(`  成功: ${statusCounts.success || 0}件`);
		console.log(`  失敗: ${statusCounts.failed || 0}件`);
		console.log(`  スキップ: ${statusCounts.skipped || 0}件`);
		console.log(`  合計: ${this.fixResults.length}件`);

		// 失敗した修正を詳細表示
		const failedResults = this.fixResults.filter((r) => r.status === "failed");
		if (failedResults.length > 0) {
			console.log(`\n❌ 修正失敗 (${failedResults.length}件):`);
			failedResults.forEach((result) => {
				console.log(`  ${result.workId}: ${result.error}`);
			});
		}

		// 成功した修正を詳細表示
		const successResults = this.fixResults.filter((r) => r.status === "success");
		if (successResults.length > 0) {
			console.log(`\n✅ 修正成功 (${successResults.length}件):`);
			successResults.slice(0, 10).forEach((result) => {
				console.log(`  ${result.workId}: ${result.oldValue} → ${result.newValue}`);
			});
			if (successResults.length > 10) {
				console.log(`  ... 他 ${successResults.length - 10}件`);
			}
		}

		console.log("\n" + "=".repeat(80));
	}
}

/**
 * メイン実行関数
 */
async function main() {
	const args = process.argv.slice(2);
	const dryRun = !args.includes("--live");
	const workId = args.find((arg) => arg.startsWith("--work="))?.split("=")[1];
	const issueType = args.find((arg) => arg.startsWith("--type="))?.split("=")[1];

	const fixer = new PriceDataFixer(dryRun);

	if (workId && issueType) {
		// 単体修正
		console.log(`🎯 単体修正: ${workId} (${issueType})`);

		switch (issueType) {
			case "double_discount":
				await fixer.fixDoubleDiscountIssue(workId);
				break;
			case "negative_price":
				await fixer.fixNegativePriceIssue(workId);
				break;
			case "invalid_discount_rate":
				await fixer.fixInvalidDiscountRateIssue(workId);
				break;
			default:
				console.error(`❌ 未対応の問題タイプ: ${issueType}`);
				return;
		}

		fixer.generateReport();
	} else {
		console.log("使用方法:");
		console.log("  pnpm tsx price-data-fixer.ts --work=RJ01414353 --type=double_discount [--live]");
		console.log("  --live: 実際に修正を実行（省略時はDRY RUN）");
		console.log("  --work: 対象作品ID");
		console.log("  --type: 問題タイプ (double_discount, negative_price, invalid_discount_rate)");
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch(console.error);
}
