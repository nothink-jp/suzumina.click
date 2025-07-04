#!/usr/bin/env node

/**
 * DLsiteHTML構造変化監視ツール
 *
 * 定期的にDLsiteページをチェックし、HTML構造の変化を検出・報告します。
 * パーサーの改修が必要な場合に早期発見できます。
 *
 * 使用方法:
 * pnpm tsx src/watch-dlsite-changes.ts --monitor
 * pnpm tsx src/watch-dlsite-changes.ts --compare-baseline
 * pnpm tsx src/watch-dlsite-changes.ts --create-baseline
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { fetchWorkDetailPage } from "./utils/dlsite-detail-parser";

interface HtmlStructureSnapshot {
	timestamp: string;
	productId: string;
	selectors: {
		[key: string]: {
			exists: boolean;
			count: number;
			sampleText?: string;
			attributes?: string[];
		};
	};
	htmlHash: string;
	pageSize: number;
}

interface ChangeDetectionReport {
	timestamp: string;
	changesDetected: boolean;
	newSelectors: string[];
	removedSelectors: string[];
	modifiedSelectors: string[];
	recommendations: string[];
}

class DLsiteChangeMonitor {
	private baselineDir = "./debug-output/baselines";
	private reportsDir = "./debug-output/change-reports";

	// 監視対象のセレクター群
	private criticalSelectors = [
		// 基本作品情報
		"table.work_1col_table",
		"table.work_1col_table tr",
		".work_name a",
		".maker_name a",
		".work_price .work_price_parts",
		".work_genre a",
		".work_tag a",

		// 詳細ページ要素
		".work_parts_table",
		".work_outline_table",
		"#work_outline",
		".work_parts",
		".work_maker",
		".work_description",

		// 画像・サムネイル
		'[data-vue-component="thumb-img-popup"]',
		".work_img img",
		".slider_item img",

		// レビュー・評価
		".work_review",
		".work_rating",
		".review_average",

		// ファイル情報
		".work_download",
		".work_file",
		".work_size",

		// 価格・セール情報
		".work_price",
		".work_discount",
		".price_without_tax",

		// Vue.js / JavaScript関連
		"[data-vue-component]",
		"[data-product-id]",
		'script[type="application/json"]',
	];

	private testProductIds = [
		"RJ01000001", // 新しいRJ01形式
		"RJ290000", // 従来のRJ形式
		"RJ123456", // テスト用
	];

	constructor() {
		this.ensureDirectories();
	}

	private ensureDirectories(): void {
		[this.baselineDir, this.reportsDir].forEach((dir) => {
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
		});
	}

	/**
	 * ベースライン作成
	 */
	async createBaseline(): Promise<void> {
		for (const productId of this.testProductIds) {
			try {
				const html = await fetchWorkDetailPage(productId);
				const snapshot = this.analyzeHtmlStructure(html, productId);

				const baselinePath = join(this.baselineDir, `${productId}_baseline.json`);
				writeFileSync(baselinePath, JSON.stringify(snapshot, null, 2), "utf8");

				// HTMLも保存（比較用）
				const htmlPath = join(this.baselineDir, `${productId}_baseline.html`);
				writeFileSync(htmlPath, html, "utf8");

				// レート制限対策
				await this.sleep(3000);
			} catch (_error) {}
		}
	}

	/**
	 * ベースラインとの比較
	 */
	async compareWithBaseline(): Promise<void> {
		const reports: ChangeDetectionReport[] = [];

		for (const productId of this.testProductIds) {
			const baselinePath = join(this.baselineDir, `${productId}_baseline.json`);
			if (!existsSync(baselinePath)) {
				continue;
			}

			try {
				const baseline: HtmlStructureSnapshot = JSON.parse(readFileSync(baselinePath, "utf8"));
				const currentHtml = await fetchWorkDetailPage(productId);
				const current = this.analyzeHtmlStructure(currentHtml, productId);

				const report = this.generateChangeReport(baseline, current);
				reports.push(report);

				// 変化があった場合は詳細保存
				if (report.changesDetected) {
					const reportPath = join(this.reportsDir, `${productId}_change_${Date.now()}.json`);
					writeFileSync(
						reportPath,
						JSON.stringify(
							{
								baseline,
								current,
								report,
							},
							null,
							2,
						),
						"utf8",
					);

					// 現在のHTMLも保存
					const htmlPath = join(this.reportsDir, `${productId}_current_${Date.now()}.html`);
					writeFileSync(htmlPath, currentHtml, "utf8");
				} else {
				}

				await this.sleep(3000);
			} catch (_error) {}
		}

		// 総合レポート生成
		this.generateOverallReport(reports);
	}

	/**
	 * 継続監視モード
	 */
	async startMonitoring(intervalMinutes = 60): Promise<void> {
		while (true) {
			try {
				await this.compareWithBaseline();
				await this.sleep(intervalMinutes * 60 * 1000);
			} catch (_error) {
				await this.sleep(5 * 60 * 1000);
			}
		}
	}

	/**
	 * HTML構造分析
	 */
	private analyzeHtmlStructure(html: string, productId: string): HtmlStructureSnapshot {
		const $ = cheerio.load(html);
		const selectors: HtmlStructureSnapshot["selectors"] = {};

		for (const selector of this.criticalSelectors) {
			const elements = $(selector);

			selectors[selector] = {
				exists: elements.length > 0,
				count: elements.length,
				sampleText: elements.first().text().trim().substring(0, 100),
				attributes: this.extractAttributes(elements.first(), $),
			};
		}

		return {
			timestamp: new Date().toISOString(),
			productId,
			selectors,
			htmlHash: this.simpleHash(html),
			pageSize: html.length,
		};
	}

	/**
	 * 要素の属性抽出
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Cheerio Element type compatibility issue in debug tool
	private extractAttributes(element: cheerio.Cheerio<any>, _$: cheerio.CheerioAPI): string[] {
		const attrs: string[] = [];
		const node = element.get(0);

		if (node && "attribs" in node) {
			for (const [key, value] of Object.entries(node.attribs)) {
				attrs.push(`${key}="${value}"`);
			}
		}

		return attrs;
	}

	/**
	 * 変化レポート生成
	 */
	private generateChangeReport(
		baseline: HtmlStructureSnapshot,
		current: HtmlStructureSnapshot,
	): ChangeDetectionReport {
		const newSelectors: string[] = [];
		const removedSelectors: string[] = [];
		const modifiedSelectors: string[] = [];
		const recommendations: string[] = [];

		// セレクターの変化チェック
		for (const selector of this.criticalSelectors) {
			const baselineData = baseline.selectors[selector];
			const currentData = current.selectors[selector];

			if (!baselineData && currentData?.exists) {
				newSelectors.push(selector);
			} else if (baselineData?.exists && !currentData?.exists) {
				removedSelectors.push(selector);
				recommendations.push(`Critical selector missing: ${selector} - パーサー更新が必要です`);
			} else if (baselineData && currentData) {
				// カウントや属性の変化チェック
				if (baselineData.count !== currentData.count) {
					modifiedSelectors.push(
						`${selector} (count: ${baselineData.count} → ${currentData.count})`,
					);
				}

				if (JSON.stringify(baselineData.attributes) !== JSON.stringify(currentData.attributes)) {
					modifiedSelectors.push(`${selector} (attributes changed)`);
				}
			}
		}

		// ページサイズの大幅変化
		const sizeDiff = Math.abs(current.pageSize - baseline.pageSize) / baseline.pageSize;
		if (sizeDiff > 0.2) {
			// 20%以上の変化
			recommendations.push(
				`ページサイズが大幅変化: ${baseline.pageSize} → ${current.pageSize} (${(sizeDiff * 100).toFixed(1)}%)`,
			);
		}

		// HTMLハッシュの変化
		const hashChanged = baseline.htmlHash !== current.htmlHash;
		if (hashChanged && (removedSelectors.length > 0 || modifiedSelectors.length > 3)) {
			recommendations.push("HTML構造の大幅な変更が検出されました。パーサーの見直しを推奨します。");
		}

		const changesDetected =
			newSelectors.length > 0 || removedSelectors.length > 0 || modifiedSelectors.length > 0;

		return {
			timestamp: new Date().toISOString(),
			changesDetected,
			newSelectors,
			removedSelectors,
			modifiedSelectors,
			recommendations,
		};
	}

	/**
	 * 総合レポート生成
	 */
	private generateOverallReport(reports: ChangeDetectionReport[]): void {
		const changedPages = reports.filter((r) => r.changesDetected);

		if (changedPages.length > 0) {
			const allRecommendations = changedPages.flatMap((r) => r.recommendations);
			if (allRecommendations.length > 0) {
				[...new Set(allRecommendations)].forEach((_rec) => {});
			}
		} else {
		}

		// レポートファイル保存
		const overallReportPath = join(this.reportsDir, `overall_report_${Date.now()}.json`);
		writeFileSync(
			overallReportPath,
			JSON.stringify(
				{
					timestamp: new Date().toISOString(),
					summary: {
						totalPages: reports.length,
						changedPages: changedPages.length,
						overallStatus: changedPages.length === 0 ? "stable" : "changes_detected",
					},
					reports,
				},
				null,
				2,
			),
			"utf8",
		);
	}

	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // 32-bit integer
		}
		return hash.toString();
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// CLI実行部分
async function main() {
	const args = process.argv.slice(2);
	const monitor = new DLsiteChangeMonitor();

	if (args.includes("--help") || args.includes("-h")) {
		return;
	}

	if (args.includes("--create-baseline")) {
		await monitor.createBaseline();
	} else if (args.includes("--compare-baseline")) {
		await monitor.compareWithBaseline();
	} else if (args.includes("--monitor")) {
		const intervalIndex = args.indexOf("--interval");
		const intervalArg = intervalIndex !== -1 ? args[intervalIndex + 1] : undefined;
		const interval = intervalArg ? Number.parseInt(intervalArg, 10) : 60;

		await monitor.startMonitoring(interval);
	} else {
	}
}

if (require.main === module) {
	// biome-ignore lint/suspicious/noConsole: Debug tool requires console output
	main().catch(console.error);
}

export { DLsiteChangeMonitor };
