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
		console.log("🔍 失敗作品ID簡単分析開始...");
		console.log(`📊 既知の総作品数: ${KNOWN_TOTAL_WORKS}件`);
		console.log(`✅ 既知の成功数: ${KNOWN_SUCCESS_COUNT}件`);
		console.log(`❌ 既知の失敗数: ${KNOWN_FAILURE_COUNT}件`);

		// 現在のデータベース状況を確認
		// 全作品IDを取得するのではなく、アセットファイルから和集合を作成
		const unionResult = createUnionWorkIds([]);
		const allWorkIds = unionResult.unionIds;

		console.log(`📋 和集合後の対象作品数: ${allWorkIds.length}件`);

		// 既存データの確認
		const existingWorksMap = await getExistingWorksMap(allWorkIds);
		console.log(`💾 現在のデータベース: ${existingWorksMap.size}件`);

		// 失敗した作品IDを特定
		const failedWorkIds = allWorkIds.filter((workId) => !existingWorksMap.has(workId));
		console.log(`❌ 失敗作品ID: ${failedWorkIds.length}件`);

		// 成功率計算
		const successRate = (existingWorksMap.size / allWorkIds.length) * 100;
		console.log(`📈 現在の成功率: ${successRate.toFixed(1)}%`);

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

		console.log(`🕐 最近更新: ${recentlyUpdated.length}件`);
		console.log(`📰 古いデータ: ${oldDataWorks.length}件`);

		// 失敗した作品IDをサンプル表示
		console.log("\n❌ 失敗した作品ID（最初の50件）:");
		failedWorkIds.slice(0, 50).forEach((workId, index) => {
			console.log(`${index + 1}. ${workId}`);
		});

		if (failedWorkIds.length > 50) {
			console.log(`... 他 ${failedWorkIds.length - 50}件`);
		}

		// 失敗パターンの簡単分析
		console.log("\n📊 失敗パターン分析:");

		// 年度別分析
		const failuresByYear = new Map<string, number>();
		failedWorkIds.forEach((workId) => {
			const match = workId.match(/^RJ(\d{2})/);
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

		// 特定の作品IDのAPIテスト
		console.log("\n🔍 特定作品のAPIテスト:");
		const testWorkIds = failedWorkIds.slice(0, 3);

		for (const workId of testWorkIds) {
			try {
				const response = await fetch(
					`https://www.dlsite.com/maniax/api/=/product.json?workno=${workId}`,
				);
				console.log(`${workId}: ステータス=${response.status}`);

				if (response.ok) {
					const data = await response.json();
					console.log(`  データ: ${Array.isArray(data) ? data.length : "non-array"} items`);
				} else {
					console.log(`  エラー: ${response.statusText}`);
				}
			} catch (error) {
				console.log(`${workId}: 例外=${error instanceof Error ? error.message : error}`);
			}
		}

		// 結果サマリー
		console.log("\n📋 === 分析結果サマリー ===");
		console.log(`対象作品数: ${allWorkIds.length}件`);
		console.log(`成功: ${existingWorksMap.size}件`);
		console.log(`失敗: ${failedWorkIds.length}件`);
		console.log(`成功率: ${successRate.toFixed(1)}%`);
		console.log(`最近更新: ${recentlyUpdated.length}件`);

		// 失敗した作品IDをファイルに保存
		const fs = require("fs");
		const failedIdsContent = failedWorkIds.join("\n");
		fs.writeFileSync("/tmp/failed-work-ids.txt", failedIdsContent);
		console.log("\n📄 失敗作品IDリストを /tmp/failed-work-ids.txt に保存しました");
	} catch (error) {
		console.error("分析エラー:", error);
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	quickFailureAnalysis().catch(console.error);
}
