/**
 * 失敗作品ID簡単分析ツール
 *
 * 事前に知っている作品総数（1484件）と現在のデータベース状況から失敗作品を特定
 */

import { getExistingWorksMap } from "../services/dlsite/dlsite-firestore";
import { createUnionWorkIds } from "../services/dlsite/work-id-validator";
import * as logger from "../shared/logger";

// 前回の実行結果から分かっている情報
const KNOWN_TOTAL_WORKS = 1484;
const KNOWN_SUCCESS_COUNT = 1144;
const KNOWN_FAILURE_COUNT = KNOWN_TOTAL_WORKS - KNOWN_SUCCESS_COUNT; // 340件

/**
 * 簡単な失敗分析
 */
async function quickFailureAnalysis(): Promise<void> {
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
		const failuresByYear = new Map<string, number>();
		failedWorkIds.forEach((workId) => {
			const match = workId.match(/^RJ(\d{2})/);
			if (match) {
				const year = `20${match[1]}`;
				failuresByYear.set(year, (failuresByYear.get(year) || 0) + 1);
			}
		});

		const failuresByYearArray = Array.from(failuresByYear.entries()).sort((a, b) => b[1] - a[1]);
		logger.info("📊 失敗パターン分析", {
			failuresByYear: Object.fromEntries(failuresByYearArray),
		});

		// 特定の作品IDのAPIテスト
		const testWorkIds = failedWorkIds.slice(0, 3);
		const apiTestResults = [];

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
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	quickFailureAnalysis().catch((error) => {
		logger.error("Main execution error", { error: error instanceof Error ? error.message : error });
		process.exit(1);
	});
}
