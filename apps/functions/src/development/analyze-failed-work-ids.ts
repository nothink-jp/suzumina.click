/**
 * 失敗した作品IDの分析ツール
 *
 * fetchdlsiteworksindividualapi実行後の失敗作品IDを特定・分析する
 */

import { getDLsiteConfig } from "../infrastructure/management/config-manager";
import {
	fetchDLsiteAjaxResult,
	isLastPageFromPageInfo,
	validateAjaxHtmlContent,
} from "../services/dlsite/dlsite-ajax-fetcher";
import { getExistingWorksMap } from "../services/dlsite/dlsite-firestore";
import * as logger from "../shared/logger";

interface FailureAnalysisResult {
	totalWorkIds: number;
	existingWorks: number;
	missingWorks: number;
	failedWorkIds: string[];
	successRate: number;
	recentlyUpdated: string[];
	oldDataWorks: string[];
}

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
			logger.debug(`作品ID収集: ページ ${currentPage}`);

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
					logger.debug(`パターン ${pattern.source} で ${matches.length} 件マッチ`);
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

			logger.debug(
				`ページ ${currentPage}: ${pageWorkIds.length}件の作品ID取得 (累計: ${allWorkIds.length}件)`,
			);

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
 * 失敗した作品IDを特定・分析
 */
async function analyzeFailedWorkIds(): Promise<FailureAnalysisResult> {
	try {
		console.log("🔍 失敗作品ID分析開始...");

		// 1. 全作品IDを取得（dlsite-individual-info-api.tsのgetAllWorkIds関数と同じロジック）
		const allWorkIds = await getAllWorkIdsFromAjax();
		console.log(`📊 対象作品数: ${allWorkIds.length}件`);

		// 2. 既存データを確認
		const existingWorksMap = await getExistingWorksMap(allWorkIds);
		console.log(`✅ 既存データ: ${existingWorksMap.size}件`);

		// 3. 失敗した作品IDを特定
		const failedWorkIds = allWorkIds.filter((workId) => !existingWorksMap.has(workId));
		console.log(`❌ 失敗作品ID: ${failedWorkIds.length}件`);

		// 4. 成功率計算
		const successRate = (existingWorksMap.size / allWorkIds.length) * 100;
		console.log(`📈 成功率: ${successRate.toFixed(1)}%`);

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

		console.log(`🕐 最近更新: ${recentlyUpdated.length}件`);
		console.log(`📰 古いデータ: ${oldDataWorks.length}件`);

		// 6. 失敗した作品IDを詳細表示
		console.log("\n❌ 失敗した作品ID一覧:");
		failedWorkIds.slice(0, 50).forEach((workId, index) => {
			console.log(`${index + 1}. ${workId}`);
		});

		if (failedWorkIds.length > 50) {
			console.log(`... 他 ${failedWorkIds.length - 50}件`);
		}

		// 7. 失敗パターンを分析
		console.log("\n📊 失敗パターン分析:");

		// RJ番号の年度別分析
		const yearPattern = /^RJ(\d{2})/;
		const failuresByYear = new Map<string, number>();

		failedWorkIds.forEach((workId) => {
			const match = workId.match(yearPattern);
			if (match) {
				const year = `20${match[1]}`;
				failuresByYear.set(year, (failuresByYear.get(year) || 0) + 1);
			}
		});

		console.log("年度別失敗数:");
		Array.from(failuresByYear.entries())
			.sort((a, b) => b[1] - a[1])
			.forEach(([year, count]) => {
				console.log(`  ${year}: ${count}件`);
			});

		// 8. 連続性分析
		console.log("\n🔗 連続性分析:");
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

		console.log(`連続する失敗グループ数: ${consecutiveGroups}`);

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
 * 特定の作品IDの詳細情報を取得
 */
async function analyzeSpecificWorkId(workId: string): Promise<void> {
	try {
		console.log(`\n🔍 ${workId} 詳細分析:`);

		// Individual Info API直接呼び出し
		const response = await fetch(
			`https://www.dlsite.com/maniax/api/=/product.json?workno=${workId}`,
		);
		console.log(`API応答ステータス: ${response.status}`);

		if (response.ok) {
			const data = await response.json();
			console.log("API応答データ:", JSON.stringify(data, null, 2));
		} else {
			console.log("API応答エラー:", response.statusText);
		}

		// 作品ページのアクセス確認
		const workPageResponse = await fetch(
			`https://www.dlsite.com/maniax/work/=/product_id/${workId}.html`,
		);
		console.log(`作品ページステータス: ${workPageResponse.status}`);
	} catch (error) {
		console.error(`${workId} 分析エラー:`, error);
	}
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	try {
		const result = await analyzeFailedWorkIds();

		console.log("\n📋 === 分析結果サマリー ===");
		console.log(`対象作品数: ${result.totalWorkIds}件`);
		console.log(`成功: ${result.existingWorks}件`);
		console.log(`失敗: ${result.missingWorks}件`);
		console.log(`成功率: ${result.successRate.toFixed(1)}%`);
		console.log(`最近更新: ${result.recentlyUpdated.length}件`);

		// 失敗作品の詳細分析（最初の3件）
		console.log("\n🔍 失敗作品詳細分析 (最初の3件):");
		for (let i = 0; i < Math.min(3, result.failedWorkIds.length); i++) {
			await analyzeSpecificWorkId(result.failedWorkIds[i]);
		}
	} catch (error) {
		console.error("メイン処理エラー:", error);
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch(console.error);
}
