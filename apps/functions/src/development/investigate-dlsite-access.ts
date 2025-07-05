#!/usr/bin/env tsx

/**
 * DLsiteアクセス制限調査スクリプト
 *
 * Cloud Functions環境からのアクセスと日本国内アクセスの差異を調査
 *
 * 使用方法:
 * pnpm tsx src/development/investigate-dlsite-access.ts
 */

import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import { fetchDLsiteAjaxResult } from "../services/dlsite/dlsite-ajax-fetcher";
import { parseWorksFromHTML } from "../services/dlsite/dlsite-parser";
import * as logger from "../shared/logger";

interface AccessInvestigationResult {
	environment: "cloud-functions" | "local";
	ipAddress?: string;
	userAgent: string;
	totalWorksFromAPI: number;
	totalWorksFromDirectHTML: number;
	parsedWorksFromAPI: number;
	parsedWorksFromHTML: number;
	sampleWorkIds: string[];
	responseHeaders: Record<string, string>;
	possibleRestrictions: string[];
}

/**
 * 現在の実行環境情報を取得
 */
async function getEnvironmentInfo(): Promise<{
	ipAddress?: string;
	isCloudFunctions: boolean;
	region?: string;
}> {
	try {
		// 外部IPアドレスを取得
		const ipResponse = await fetch("https://api.ipify.org?format=json");
		const ipData = await ipResponse.json();

		// Cloud Functions環境の検出
		const isCloudFunctions = !!(
			process.env.FUNCTION_NAME ||
			process.env.K_SERVICE ||
			process.env.GOOGLE_CLOUD_PROJECT
		);

		// リージョン情報の取得
		const region = process.env.FUNCTION_REGION || process.env.GOOGLE_CLOUD_REGION;

		return {
			ipAddress: ipData.ip,
			isCloudFunctions,
			region,
		};
	} catch (error) {
		logger.error("環境情報取得エラー:", error);
		return {
			isCloudFunctions: false,
		};
	}
}

/**
 * AJAX APIから作品情報を取得
 */
async function investigateAjaxAPI(): Promise<{
	totalWorks: number;
	parsedWorks: number;
	sampleWorkIds: string[];
	responseInfo: Record<string, string>;
}> {
	try {
		logger.info("🔍 AJAX API調査開始");

		const ajaxResult = await fetchDLsiteAjaxResult(1);
		const parsedWorks = parseWorksFromHTML(ajaxResult.search_result);

		return {
			totalWorks: ajaxResult.page_info.count,
			parsedWorks: parsedWorks.length,
			sampleWorkIds: parsedWorks.slice(0, 5).map((w) => w.productId),
			responseInfo: {
				pageInfoCount: ajaxResult.page_info.count.toString(),
				firstIndice: ajaxResult.page_info.first_indice.toString(),
				lastIndice: ajaxResult.page_info.last_indice.toString(),
				htmlLength: ajaxResult.search_result.length.toString(),
			},
		};
	} catch (error) {
		logger.error("AJAX API調査エラー:", error);
		return {
			totalWorks: 0,
			parsedWorks: 0,
			sampleWorkIds: [],
			responseInfo: {},
		};
	}
}

/**
 * 直接HTMLアクセスから作品情報を取得（比較用）
 */
async function investigateDirectHTML(): Promise<{
	totalWorks: number;
	parsedWorks: number;
	sampleWorkIds: string[];
	responseHeaders: Record<string, string>;
}> {
	try {
		logger.info("🔍 直接HTML調査開始");

		const directUrl =
			"https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/";
		const headers = generateDLsiteHeaders();

		const response = await fetch(directUrl, {
			headers: {
				...headers,
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const html = await response.text();
		const parsedWorks = parseWorksFromHTML(html);

		// HTMLから総作品数を推定（ページネーション情報から）
		const totalWorksMatch = html.match(/(\d+(?:,\d+)*)件中/);
		const totalWorks = totalWorksMatch
			? Number.parseInt(totalWorksMatch[1].replace(/,/g, ""), 10)
			: parsedWorks.length;

		// レスポンスヘッダーを記録
		const responseHeaders: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value;
		});

		return {
			totalWorks,
			parsedWorks: parsedWorks.length,
			sampleWorkIds: parsedWorks.slice(0, 5).map((w) => w.productId),
			responseHeaders,
		};
	} catch (error) {
		logger.error("直接HTML調査エラー:", error);
		return {
			totalWorks: 0,
			parsedWorks: 0,
			sampleWorkIds: [],
			responseHeaders: {},
		};
	}
}

/**
 * 制限の可能性を分析
 */
function analyzePossibleRestrictions(
	envInfo: { ipAddress?: string; isCloudFunctions: boolean; region?: string },
	ajaxResult: { totalWorks: number; parsedWorks: number },
	htmlResult: { totalWorks: number; parsedWorks: number },
): string[] {
	const restrictions: string[] = [];

	// 総作品数の差異チェック
	const totalWorksDiff = Math.abs(ajaxResult.totalWorks - htmlResult.totalWorks);
	const totalWorksReduction =
		(totalWorksDiff / Math.max(ajaxResult.totalWorks, htmlResult.totalWorks)) * 100;

	if (totalWorksReduction > 10) {
		restrictions.push(
			`総作品数に${totalWorksReduction.toFixed(1)}%の差異 (AJAX: ${ajaxResult.totalWorks}, HTML: ${htmlResult.totalWorks})`,
		);
	}

	// パースされた作品数の差異チェック
	const parsedWorksDiff = Math.abs(ajaxResult.parsedWorks - htmlResult.parsedWorks);
	if (parsedWorksDiff > 5) {
		restrictions.push(
			`パース結果に${parsedWorksDiff}件の差異 (AJAX: ${ajaxResult.parsedWorks}, HTML: ${htmlResult.parsedWorks})`,
		);
	}

	// Cloud Functions環境の検出
	if (envInfo.isCloudFunctions) {
		restrictions.push("Cloud Functions環境からのアクセス");
		if (envInfo.region && !envInfo.region.startsWith("asia")) {
			restrictions.push(`非アジアリージョンからのアクセス: ${envInfo.region}`);
		}
	}

	// IPアドレスベースの地域判定
	if (envInfo.ipAddress) {
		// 一般的なCloud ProvidersのIP範囲をチェック（簡易）
		if (envInfo.ipAddress.startsWith("35.") || envInfo.ipAddress.startsWith("34.")) {
			restrictions.push("Google Cloud IPアドレスからのアクセス");
		}
	}

	return restrictions;
}

/**
 * 詳細調査の実行
 */
async function runDetailedInvestigation(): Promise<AccessInvestigationResult> {
	logger.info("=== DLsiteアクセス制限調査開始 ===");

	// 環境情報取得
	const envInfo = await getEnvironmentInfo();
	logger.info("環境情報:", envInfo);

	// AJAX API調査
	const ajaxResult = await investigateAjaxAPI();
	logger.info("AJAX API結果:", ajaxResult);

	// 直接HTML調査
	const htmlResult = await investigateDirectHTML();
	logger.info("直接HTML結果:", htmlResult);

	// User-Agent情報
	const headers = generateDLsiteHeaders();

	// 制限分析
	const possibleRestrictions = analyzePossibleRestrictions(envInfo, ajaxResult, htmlResult);

	const result: AccessInvestigationResult = {
		environment: envInfo.isCloudFunctions ? "cloud-functions" : "local",
		ipAddress: envInfo.ipAddress,
		userAgent: headers["User-Agent"],
		totalWorksFromAPI: ajaxResult.totalWorks,
		totalWorksFromDirectHTML: htmlResult.totalWorks,
		parsedWorksFromAPI: ajaxResult.parsedWorks,
		parsedWorksFromHTML: htmlResult.parsedWorks,
		sampleWorkIds:
			ajaxResult.sampleWorkIds.length > 0 ? ajaxResult.sampleWorkIds : htmlResult.sampleWorkIds,
		responseHeaders: htmlResult.responseHeaders,
		possibleRestrictions,
	};

	return result;
}

/**
 * 調査結果の詳細出力
 */
function outputInvestigationReport(result: AccessInvestigationResult): void {
	console.log("\n📊 === DLsiteアクセス制限調査レポート ===");
	console.log(`🌍 実行環境: ${result.environment}`);
	console.log(`🔗 IPアドレス: ${result.ipAddress || "取得失敗"}`);
	console.log(`🤖 User-Agent: ${result.userAgent}`);

	console.log("\n📈 作品数比較:");
	console.log(`  AJAX API経由: ${result.totalWorksFromAPI}件`);
	console.log(`  直接HTML経由: ${result.totalWorksFromDirectHTML}件`);
	console.log(`  差異: ${Math.abs(result.totalWorksFromAPI - result.totalWorksFromDirectHTML)}件`);

	const reductionPercentage =
		result.totalWorksFromDirectHTML > 0
			? ((result.totalWorksFromDirectHTML - result.totalWorksFromAPI) /
					result.totalWorksFromDirectHTML) *
				100
			: 0;
	if (reductionPercentage > 0) {
		console.log(`  📉 減少率: ${reductionPercentage.toFixed(1)}%`);
	}

	console.log("\n🔍 パース結果:");
	console.log(`  AJAX APIパース: ${result.parsedWorksFromAPI}件`);
	console.log(`  直接HTMLパース: ${result.parsedWorksFromHTML}件`);

	if (result.sampleWorkIds.length > 0) {
		console.log(`\n📝 サンプル作品ID: ${result.sampleWorkIds.join(", ")}`);
	}

	if (result.possibleRestrictions.length > 0) {
		console.log("\n⚠️ 検出された制限の可能性:");
		result.possibleRestrictions.forEach((restriction, index) => {
			console.log(`  ${index + 1}. ${restriction}`);
		});
	} else {
		console.log("\n✅ 明確な制限は検出されませんでした");
	}

	console.log("\n🔧 推奨対策:");
	if (result.environment === "cloud-functions") {
		console.log("  - asia-northeast1 (東京) リージョンでのCloud Functions実行を検討");
		console.log("  - User-Agentローテーションの強化");
		console.log("  - プロキシサービス経由でのアクセス検討");
	}
	console.log("  - 複数のアクセス方法での定期的な比較調査");
	console.log("  - DLsiteの利用規約・制限ポリシーの確認");
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		const result = await runDetailedInvestigation();
		outputInvestigationReport(result);

		// 結果をJSONファイルとして保存
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const fs = await import("fs");
		const outputPath = `./debug-output/dlsite-access-investigation-${timestamp}.json`;

		// ディレクトリ作成
		await fs.promises.mkdir("./debug-output", { recursive: true });

		// 結果保存
		await fs.promises.writeFile(outputPath, JSON.stringify(result, null, 2));
		console.log(`\n💾 詳細結果を保存: ${outputPath}`);
	} catch (error) {
		logger.error("調査実行エラー:", error);
		process.exit(1);
	}
}

// スクリプトとして実行された場合
if (require.main === module) {
	main()
		.then(() => process.exit(0))
		.catch((error) => {
			logger.error("予期しないエラー:", error);
			process.exit(1);
		});
}
