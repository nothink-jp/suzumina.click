#!/usr/bin/env tsx

/**
 * Cloud Functions環境での詳細調査用スクリプト
 *
 * 通常のCloud Functions実行から呼び出し可能
 */

import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import { fetchDLsiteAjaxResult } from "../services/dlsite/dlsite-ajax-fetcher";
import { parseWorksFromHTML } from "../services/dlsite/dlsite-parser";
import * as logger from "../shared/logger";

interface CloudFunctionsInvestigationResult {
	environment: "cloud-functions" | "local";
	ipAddress?: string;
	userAgent: string;
	totalWorksFromAPI: number;
	parsedWorksFromAPI: number;
	sampleWorkIds: string[];
	executionTime: string;
	region?: string;
	possibleRestrictions: string[];
}

/**
 * Cloud Functions環境情報を取得
 */
async function getCloudFunctionsInfo(): Promise<{
	ipAddress?: string;
	isCloudFunctions: boolean;
	region?: string;
}> {
	try {
		// 外部IPアドレスを取得
		const ipResponse = await fetch("https://api.ipify.org?format=json");
		const ipData = (await ipResponse.json()) as { ip: string };

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
 * Cloud Functions環境での調査実行
 */
export async function runCloudFunctionsInvestigation(): Promise<CloudFunctionsInvestigationResult> {
	logger.info("=== Cloud Functions環境調査開始 ===");

	// 環境情報取得
	const envInfo = await getCloudFunctionsInfo();
	logger.info("環境情報:", envInfo);

	// AJAX API調査
	logger.info("🔍 AJAX API調査開始");

	const ajaxResult = await fetchDLsiteAjaxResult(1);
	const parsedWorks = parseWorksFromHTML(ajaxResult.search_result);

	logger.info("AJAX API結果:", {
		totalWorks: ajaxResult.page_info.count,
		parsedWorks: parsedWorks.length,
		sampleWorkIds: parsedWorks.slice(0, 5).map((w) => w.productId),
	});

	// User-Agent情報
	const headers = generateDLsiteHeaders();

	// 制限分析
	const possibleRestrictions: string[] = [];

	if (envInfo.isCloudFunctions) {
		possibleRestrictions.push("Cloud Functions環境からのアクセス");
		if (envInfo.region) {
			possibleRestrictions.push(`実行リージョン: ${envInfo.region}`);
		}
	}

	// IPアドレスベースの地域判定
	if (envInfo.ipAddress) {
		// Google Cloud IPレンジの簡易チェック
		if (envInfo.ipAddress.startsWith("35.") || envInfo.ipAddress.startsWith("34.")) {
			possibleRestrictions.push("Google Cloud IPアドレスからのアクセス");
		}
	}

	const result: CloudFunctionsInvestigationResult = {
		environment: envInfo.isCloudFunctions ? "cloud-functions" : "local",
		ipAddress: envInfo.ipAddress,
		userAgent: headers["User-Agent"] || "unknown",
		totalWorksFromAPI: ajaxResult.page_info.count,
		parsedWorksFromAPI: parsedWorks.length,
		sampleWorkIds: parsedWorks.slice(0, 5).map((w) => w.productId),
		executionTime: new Date().toISOString(),
		region: envInfo.region || "unknown",
		possibleRestrictions,
	};

	// 詳細結果をログ出力（構造化ログ）
	logger.info("📊 Cloud Functions調査結果", {
		environment: result.environment,
		ipAddress: result.ipAddress,
		totalWorks: result.totalWorksFromAPI,
		region: result.region,
	});

	return result;
}

/**
 * 調査結果の比較分析
 */
export function analyzeInvestigationResults(
	localResult: number,
	cloudResult: CloudFunctionsInvestigationResult,
): string[] {
	const recommendations: string[] = [];

	const difference = Math.abs(localResult - cloudResult.totalWorksFromAPI);
	const reductionPercentage =
		localResult > 0 ? ((localResult - cloudResult.totalWorksFromAPI) / localResult) * 100 : 0;

	if (reductionPercentage > 10) {
		recommendations.push(`作品数減少率: ${reductionPercentage.toFixed(1)}% (${difference}件減少)`);

		if (cloudResult.environment === "cloud-functions") {
			recommendations.push("asia-northeast1以外のリージョンでの実行を検討");
			recommendations.push("User-Agentローテーション強化");
			recommendations.push("プロキシサービス経由でのアクセス検討");
		}
	}

	return recommendations;
}
