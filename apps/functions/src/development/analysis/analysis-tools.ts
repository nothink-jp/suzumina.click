/**
 * 失敗作品ID分析ツール統合版
 *
 * 元ファイル: analyze-failed-work-ids.ts, quick-failure-analysis.ts
 * 失敗した作品IDの特定・分析・パターン解析を行う統合ツール
 */

import { getDLsiteConfig } from "../../infrastructure/management/config-manager";
import {
	fetchDLsiteAjaxResult,
	isLastPageFromPageInfo,
	validateAjaxHtmlContent,
} from "../../services/dlsite/dlsite-ajax-fetcher";
import { getExistingWorksMap } from "../../services/dlsite/dlsite-firestore";
import { createUnionWorkIds } from "../../services/dlsite/work-id-validator";
import * as logger from "../../shared/logger";

interface FailureAnalysisResult {
	totalWorkIds: number;
	existingWorks: number;
	missingWorks: number;
	failedWorkIds: string[];
	successRate: number;
	recentlyUpdated: string[];
	oldDataWorks: string[];
}

// 前回の実行結果から分かっている情報
const KNOWN_TOTAL_WORKS = 1484;
const KNOWN_SUCCESS_COUNT = 1144;
const KNOWN_FAILURE_COUNT = KNOWN_TOTAL_WORKS - KNOWN_SUCCESS_COUNT;

// 設定を取得
const config = getDLsiteConfig();

/**
 * 作品IDリストの取得（AJAX APIから）
 * dlsite-individual-info-api.tsのgetAllWorkIds関数と同じロジック
 */
async function getAllWorkIdsFromAjax(): Promise<string[]> {
	logger.info("🔍 AJAX APIから全作品IDを収集中...");

	const allWorkIds: string[] = [];
	let currentPage = 1;
	const maxPages = 50; // 安全のための上限

	while (currentPage <= maxPages) {
		try {
			const ajaxResult = await fetchDLsiteAjaxResult(currentPage);

			if (!validateAjaxHtmlContent(ajaxResult.search_result)) {
				logger.warn(`ページ ${currentPage}: 無効なHTMLコンテンツ`);
				break;
			}

			// メイン検索結果のみを抽出（サイドバーや関連作品を除外）
			const strictPatterns = [
				/href="\/maniax\/work\/[^"]*product_id\/([^"/]+)/g,
				/"product_id":"([^"]+)"/g,
				/data-list_item_product_id="([^"]+)"/g,
			];

			const allMatches = new Set<string>();
			for (const pattern of strictPatterns) {
				const matches = [...ajaxResult.search_result.matchAll(pattern)];
				if (matches.length > 0) {
					matches.forEach((match) => {
						const workId = match[1];
						if (workId && /^RJ\d{6,8}$/.test(workId)) {
							allMatches.add(workId);
						}
					});
				}
			}

			if (allMatches.size === 0) {
				logger.info(`ページ ${currentPage}: 作品が見つかりません。収集完了`);
				break;
			}

			const pageWorkIds = Array.from(allMatches);
			allWorkIds.push(...pageWorkIds);

			// 最終ページ判定
			const isLastPage = isLastPageFromPageInfo(ajaxResult.page_info, currentPage);
			if (isLastPage) {
				logger.info(`ページ ${currentPage} が最終ページです`);
				break;
			}

			currentPage++;

			// レート制限対応
			await new Promise((resolve) => setTimeout(resolve, config.requestDelay));
		} catch (error) {
			logger.error(`作品ID収集エラー (ページ ${currentPage}):`, { error });
			break;
		}
	}

	const uniqueWorkIds = [...new Set(allWorkIds)]; // 重複除去
	logger.info(`✅ 作品ID収集完了: ${uniqueWorkIds.length}件`);

	return uniqueWorkIds;
}

/**
 * 失敗パターンの分析
 */
function analyzeFailurePatterns(failedWorkIds: string[]): void {
	// 年別失敗パターン分析
	const yearPattern = /^RJ(\d{2})/;
	const failuresByYear = new Map<string, number>();

	failedWorkIds.forEach((workId) => {
		const match = workId.match(yearPattern);
		if (match) {
			const year = `20${match[1]}`;
			failuresByYear.set(year, (failuresByYear.get(year) || 0) + 1);
		}
	});

	const failuresByYearArray = Array.from(failuresByYear.entries()).sort((a, b) => b[1] - a[1]);
	logger.info("📊 失敗パターン分析", {
		failuresByYear: Object.fromEntries(failuresByYearArray),
	});

	// 連続性分析
	const sortedFailedIds = failedWorkIds.sort();
	let consecutiveGroups = 0;
	let currentGroup = 1;

	for (let i = 1; i < sortedFailedIds.length; i++) {
		const current = Number.parseInt(sortedFailedIds[i].replace("RJ", ""));
		const previous = Number.parseInt(sortedFailedIds[i - 1].replace("RJ", ""));

		if (current - previous === 1) {
			currentGroup++;
		} else {
			if (currentGroup > 1) {
				consecutiveGroups++;
			}
			currentGroup = 1;
		}
	}

	if (currentGroup > 1) {
		consecutiveGroups++;
	}

	logger.info("🔗 連続性分析", { consecutiveGroups });
}

/**
 * 特定の作品IDの詳細情報を取得
 */
async function analyzeSpecificWorkId(workId: string): Promise<void> {
	try {
		logger.info("🔍 詳細分析", { workId });

		// Individual Info API直接呼び出し
		const response = await fetch(
			`https://www.dlsite.com/maniax/api/=/product.json?workno=${workId}`,
		);
		logger.info("API応答ステータス", { workId, status: response.status });

		if (response.ok) {
			const data = await response.json();
			logger.info("API応答データ", {
				workId,
				dataType: Array.isArray(data) ? "array" : "non-array",
				itemCount: Array.isArray(data) ? data.length : null,
			});
		} else {
			logger.error("API応答エラー", { workId, statusText: response.statusText });
		}

		// 作品ページのアクセス確認
		const workPageResponse = await fetch(
			`https://www.dlsite.com/maniax/work/=/product_id/${workId}.html`,
		);
		logger.info("作品ページステータス", { workId, status: workPageResponse.status });
	} catch (error) {
		logger.error("分析エラー", { workId, error: error instanceof Error ? error.message : error });
	}
}

/**
 * 完全な失敗作品ID分析（AJAX APIから作品ID収集）
 */
export async function analyzeFailedWorkIds(): Promise<FailureAnalysisResult> {
	try {
		logger.info("🔍 失敗作品ID分析開始（完全版）");

		// 1. 全作品IDを取得（AJAX APIから）
		const allWorkIds = await getAllWorkIdsFromAjax();
		logger.info("📊 対象作品数", { count: allWorkIds.length });

		// 2. 既存データを確認
		const existingWorksMap = await getExistingWorksMap(allWorkIds);
		logger.info("✅ 既存データ", { count: existingWorksMap.size });

		// 3. 失敗した作品IDを特定
		const failedWorkIds = allWorkIds.filter((workId) => !existingWorksMap.has(workId));
		logger.info("❌ 失敗作品ID", { count: failedWorkIds.length });

		// 4. 成功率計算
		const successRate = (existingWorksMap.size / allWorkIds.length) * 100;
		logger.info("📈 成功率", { rate: Number(successRate.toFixed(1)) });

		// 5. 最近更新された作品を特定
		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

		const recentlyUpdated: string[] = [];
		const oldDataWorks: string[] = [];

		existingWorksMap.forEach((work, workId) => {
			const updatedAt = new Date(work.updatedAt);
			if (updatedAt > oneHourAgo) {
				recentlyUpdated.push(workId);
			} else {
				oldDataWorks.push(workId);
			}
		});

		logger.info("🕐 最近更新データ", {
			recentlyUpdated: recentlyUpdated.length,
			oldDataWorks: oldDataWorks.length,
		});

		// 6. 失敗した作品IDを詳細表示
		logger.info("❌ 失敗した作品ID一覧", {
			sample: failedWorkIds.slice(0, 50),
			totalCount: failedWorkIds.length,
			remaining: failedWorkIds.length > 50 ? failedWorkIds.length - 50 : 0,
		});

		// 7. 失敗パターンを分析
		analyzeFailurePatterns(failedWorkIds);

		return {
			totalWorkIds: allWorkIds.length,
			existingWorks: existingWorksMap.size,
			missingWorks: failedWorkIds.length,
			failedWorkIds,
			successRate,
			recentlyUpdated,
			oldDataWorks,
		};
	} catch (error) {
		logger.error("失敗作品ID分析エラー:", { error });
		throw error;
	}
}

/**
 * 簡単な失敗分析（アセットファイルベース）
 */
export async function quickFailureAnalysis(): Promise<void> {
	try {
		logger.info("🔍 失敗作品ID簡単分析開始", {
			knownTotalWorks: KNOWN_TOTAL_WORKS,
			knownSuccessCount: KNOWN_SUCCESS_COUNT,
			knownFailureCount: KNOWN_FAILURE_COUNT,
		});

		// 現在のデータベース状況を確認
		// 全作品IDを取得するのではなく、アセットファイルから和集合を作成
		const unionResult = createUnionWorkIds([]);
		const allWorkIds = unionResult.unionIds;

		logger.info("📋 和集合後の対象作品数", { count: allWorkIds.length });

		// 既存データの確認
		const existingWorksMap = await getExistingWorksMap(allWorkIds);
		logger.info("💾 現在のデータベース", { count: existingWorksMap.size });

		// 失敗した作品IDを特定
		const failedWorkIds = allWorkIds.filter((workId) => !existingWorksMap.has(workId));
		logger.info("❌ 失敗作品ID", { count: failedWorkIds.length });

		// 成功率計算
		const successRate = (existingWorksMap.size / allWorkIds.length) * 100;
		logger.info("📈 現在の成功率", { successRate: Number(successRate.toFixed(1)) });

		// 最近更新された作品を確認
		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

		const recentlyUpdated: string[] = [];
		const oldDataWorks: string[] = [];

		existingWorksMap.forEach((work, workId) => {
			const updatedAt = new Date(work.updatedAt);
			if (updatedAt > oneHourAgo) {
				recentlyUpdated.push(workId);
			} else {
				oldDataWorks.push(workId);
			}
		});

		logger.info("🕐 最近更新データ", {
			recentlyUpdated: recentlyUpdated.length,
			oldDataWorks: oldDataWorks.length,
		});

		// 失敗した作品IDをサンプル表示
		logger.info("❌ 失敗した作品IDサンプル", {
			sample: failedWorkIds.slice(0, 50),
			totalFailedCount: failedWorkIds.length,
			remaining: failedWorkIds.length > 50 ? failedWorkIds.length - 50 : 0,
		});

		// 失敗パターンの簡単分析
		analyzeFailurePatterns(failedWorkIds);

		// 特定の作品IDのAPIテスト
		const testWorkIds = failedWorkIds.slice(0, 3);
		const apiTestResults: Array<{
			workId: string;
			status?: number;
			dataType?: string;
			itemCount?: number | null;
			error?: string;
			exception?: string;
		}> = [];

		for (const workId of testWorkIds) {
			try {
				const response = await fetch(
					`https://www.dlsite.com/maniax/api/=/product.json?workno=${workId}`,
				);

				if (response.ok) {
					const data = await response.json();
					apiTestResults.push({
						workId,
						status: response.status,
						dataType: Array.isArray(data) ? "array" : "non-array",
						itemCount: Array.isArray(data) ? data.length : null,
					});
				} else {
					apiTestResults.push({
						workId,
						status: response.status,
						error: response.statusText,
					});
				}
			} catch (error) {
				apiTestResults.push({
					workId,
					exception: error instanceof Error ? error.message : error,
				});
			}
		}

		logger.info("🔍 特定作品のAPIテスト", { apiTestResults });

		// 結果サマリー
		logger.info("📋 === 分析結果サマリー ===", {
			totalWorks: allWorkIds.length,
			successCount: existingWorksMap.size,
			failureCount: failedWorkIds.length,
			successRate: Number(successRate.toFixed(1)),
			recentlyUpdated: recentlyUpdated.length,
		});

		// 失敗した作品IDをファイルに保存
		const fs = require("node:fs");
		const failedIdsContent = failedWorkIds.join("\n");
		fs.writeFileSync("/tmp/failed-work-ids.txt", failedIdsContent);
		logger.info("📄 失敗作品IDリスト保存完了", {
			filePath: "/tmp/failed-work-ids.txt",
			count: failedWorkIds.length,
		});
	} catch (error) {
		logger.error("分析エラー", { error: error instanceof Error ? error.message : error });
		throw error;
	}
}

/**
 * 完全分析のメイン実行関数
 */
export async function runFullAnalysis(): Promise<void> {
	try {
		const result = await analyzeFailedWorkIds();

		logger.info("📋 === 分析結果サマリー ===", {
			totalWorkIds: result.totalWorkIds,
			existingWorks: result.existingWorks,
			missingWorks: result.missingWorks,
			successRate: Number(result.successRate.toFixed(1)),
			recentlyUpdated: result.recentlyUpdated.length,
		});

		// 失敗作品の詳細分析（最初の3件）
		logger.info("🔍 失敗作品詳細分析 (最初の3件)");
		for (let i = 0; i < Math.min(3, result.failedWorkIds.length); i++) {
			await analyzeSpecificWorkId(result.failedWorkIds[i]);
		}
	} catch (error) {
		logger.error("メイン処理エラー", { error: error instanceof Error ? error.message : error });
		throw error;
	}
}

// スクリプト実行
if (require.main === module) {
	const analysisType = process.argv[2] || "quick";

	if (analysisType === "full") {
		runFullAnalysis().catch((error) => {
			logger.error("Full analysis execution error", {
				error: error instanceof Error ? error.message : error,
			});
			process.exit(1);
		});
	} else {
		quickFailureAnalysis().catch((error) => {
			logger.error("Quick analysis execution error", {
				error: error instanceof Error ? error.message : error,
			});
			process.exit(1);
		});
	}
}
