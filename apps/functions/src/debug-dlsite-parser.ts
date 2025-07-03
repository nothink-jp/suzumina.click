#!/usr/bin/env node
/**
 * DLsiteパーサー開発用デバッグツール
 *
 * ローカルでDLsiteパーサーをテストし、継続的に改善を行うためのツールです。
 *
 * 使用方法:
 * pnpm tsx src/debug-dlsite-parser.ts
 * pnpm tsx src/debug-dlsite-parser.ts --product-id RJ123456
 * pnpm tsx src/debug-dlsite-parser.ts --test-sample-pages
 * pnpm tsx src/debug-dlsite-parser.ts --analyze-failures
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchWorkDetailPage, parseWorkDetailFromHTML } from "./utils/dlsite-detail-parser";
import { parseWorksFromHTML } from "./utils/dlsite-parser";

interface TestResult {
	productId: string;
	success: boolean;
	extractedData: {
		detail?: object;
		search?: object;
		stats: {
			trackCount: number;
			hasFileInfo: boolean;
			hasCreatorInfo: boolean;
			hasBonusContent: boolean;
			hasHighResImage: boolean;
		};
	};
	errors: string[];
	htmlPreview: string;
	timestamp: string;
}

interface DebugConfig {
	/** テスト対象の作品ID一覧 */
	sampleProductIds: string[];
	/** 出力ディレクトリ */
	outputDir: string;
	/** HTMLサンプルを保存するか */
	saveHtmlSamples: boolean;
	/** 詳細ログを出力するか */
	verboseLogging: boolean;
}

const DEFAULT_CONFIG: DebugConfig = {
	sampleProductIds: [
		"RJ01000001", // 新しい作品ID
		"RJ290000", // 中程度の作品ID
		"RJ123456", // 古い作品ID
		"RJ456789", // テスト用ID
		"RJ01234567", // 新形式ID
	],
	outputDir: "./debug-output",
	saveHtmlSamples: true,
	verboseLogging: true,
};

class DLsiteParserDebugger {
	private config: DebugConfig;
	private results: TestResult[] = [];

	constructor(config: Partial<DebugConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.ensureOutputDirectory();
	}

	private ensureOutputDirectory(): void {
		if (!existsSync(this.config.outputDir)) {
			mkdirSync(this.config.outputDir, { recursive: true });
		}
	}

	/**
	 * 単一作品のテストを実行
	 */
	async testSingleProduct(productId: string): Promise<TestResult> {
		const result: TestResult = {
			productId,
			success: false,
			extractedData: {
				stats: {
					trackCount: 0,
					hasFileInfo: false,
					hasCreatorInfo: false,
					hasBonusContent: false,
					hasHighResImage: false,
				},
			},
			errors: [],
			htmlPreview: "",
			timestamp: new Date().toISOString(),
		};

		try {
			const html = await fetchWorkDetailPage(productId);

			result.htmlPreview = `${html.substring(0, 500)}...`;

			if (this.config.saveHtmlSamples) {
				const htmlPath = join(this.config.outputDir, `${productId}_raw.html`);
				writeFileSync(htmlPath, html, "utf8");
			}
			const detailData = parseWorkDetailFromHTML(html);
			const searchData = parseWorksFromHTML(html);

			result.extractedData = {
				detail: detailData,
				search: searchData,
				stats: {
					trackCount: detailData.trackInfo?.length || 0,
					hasFileInfo: !!detailData.fileInfo,
					hasCreatorInfo: !!detailData.detailedCreators,
					hasBonusContent: (detailData.bonusContent?.length || 0) > 0,
					hasHighResImage: !!detailData.highResImageUrl,
				},
			};

			result.success = true;
		} catch (error) {
			result.errors.push(error instanceof Error ? error.message : String(error));
		}

		// 結果を保存
		const resultPath = join(this.config.outputDir, `${productId}_result.json`);
		writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");

		this.results.push(result);
		return result;
	}

	/**
	 * 複数作品のバッチテスト
	 */
	async testSamplePages(): Promise<void> {
		for (const productId of this.config.sampleProductIds) {
			await this.testSingleProduct(productId);

			// レート制限対策
			await this.sleep(2000);
		}

		this.generateSummaryReport();
	}

	/**
	 * 失敗分析レポート生成
	 */
	async analyzeFailures(): Promise<void> {
		const failures = this.results.filter((r) => !r.success);
		const successes = this.results.filter((r) => r.success);

		if (failures.length > 0) {
			const errorCounts = new Map<string, number>();

			for (const failure of failures) {
				for (const error of failure.errors) {
					errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
				}
			}

			for (const [_error, _count] of errorCounts.entries()) {
			}
		}

		if (successes.length > 0) {
			// Stats calculation for success analysis
			// @ts-ignore - Variable prepared for future use in debug tool
			const _stats = {
				withTracks: successes.filter((s) => s.extractedData.stats.trackCount > 0).length,
				withFileInfo: successes.filter((s) => s.extractedData.stats.hasFileInfo).length,
				withCreators: successes.filter((s) => s.extractedData.stats.hasCreatorInfo).length,
				withBonus: successes.filter((s) => s.extractedData.stats.hasBonusContent).length,
				withHighRes: successes.filter((s) => s.extractedData.stats.hasHighResImage).length,
			};
		}
	}

	/**
	 * サマリーレポート生成
	 */
	private generateSummaryReport(): void {
		const summary = {
			testRun: {
				timestamp: new Date().toISOString(),
				totalTests: this.results.length,
				successes: this.results.filter((r) => r.success).length,
				failures: this.results.filter((r) => !r.success).length,
			},
			results: this.results,
			config: this.config,
		};

		const summaryPath = join(this.config.outputDir, "test_summary.json");
		writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
		this.analyzeFailures();
	}

	/**
	 * 特定のHTMLファイルをテスト
	 */
	async testHtmlFile(filePath: string): Promise<void> {
		if (!existsSync(filePath)) {
			return;
		}

		const html = readFileSync(filePath, "utf8");
		const productId = `local_${Date.now()}`;

		try {
			const detailData = parseWorkDetailFromHTML(html);
			const searchData = parseWorksFromHTML(html);

			// 結果保存
			const result = {
				productId,
				source: filePath,
				detailData,
				searchData,
				timestamp: new Date().toISOString(),
			};

			const resultPath = join(this.config.outputDir, `${productId}_local_result.json`);
			writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");
		} catch (_error) {}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// CLI実行部分
async function main() {
	const args = process.argv.slice(2);
	const parserDebugger = new DLsiteParserDebugger();

	if (args.includes("--help") || args.includes("-h")) {
		return;
	}

	if (args.includes("--product-id")) {
		const productIdIndex = args.indexOf("--product-id") + 1;
		const productId = args[productIdIndex];
		if (productId) {
			await parserDebugger.testSingleProduct(productId);
		} else {
		}
	} else if (args.includes("--html-file")) {
		const fileIndex = args.indexOf("--html-file") + 1;
		const filePath = args[fileIndex];
		if (filePath) {
			await parserDebugger.testHtmlFile(filePath);
		} else {
		}
	} else if (args.includes("--analyze-failures")) {
		await parserDebugger.analyzeFailures();
	} else {
		// デフォルト: サンプルページテスト
		await parserDebugger.testSamplePages();
	}
}

if (require.main === module) {
	// biome-ignore lint/suspicious/noConsole: Debug tool requires console output
	main().catch(console.error);
}

export { DLsiteParserDebugger };
