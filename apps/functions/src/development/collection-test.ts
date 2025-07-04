/**
 * DLsiteデータ収集完全性テスト
 *
 * 実際のパーサーを使用して作品IDを抽出し、
 * 1015件すべての作品が取得できるかテストする
 */

import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import { parseWorksFromHTML } from "../services/dlsite/dlsite-parser";
import * as logger from "../shared/logger";

// テスト対象のURL構成
const TEST_URLS = {
	current:
		"https://www.dlsite.com/maniax/fsr/=/language/jp/sex_category[0]/male/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/options_and_or/and/options[0]/JPN/options[1]/NM/per_page/100/page/",

	new: "https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/options_and_or/and/options[0]/JPN/options[1]/NM/per_page/100/page/",
};

interface CollectionTestResult {
	urlType: string;
	totalPagesScanned: number;
	totalWorksFound: number;
	uniqueWorkIds: Set<string>;
	duplicateCount: number;
	lastPageNumber: number;
	executionTimeMs: number;
	errors: string[];
}

/**
 * 単一ページから作品IDを抽出
 */
async function extractWorkIdsFromPage(
	baseUrl: string,
	pageNumber: number,
): Promise<{
	workIds: string[];
	isLastPage: boolean;
	error?: string;
}> {
	try {
		const url = `${baseUrl}${pageNumber}/show_type/1`;
		logger.debug(`ページ ${pageNumber} を取得中: ${url}`);

		const response = await fetch(url, {
			headers: generateDLsiteHeaders(),
			signal: AbortSignal.timeout(15000), // 15秒タイムアウト
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const html = await response.text();

		// 実際のパーサーを使用して作品データを抽出
		const parsedWorks = parseWorksFromHTML(html);
		const workIds = parsedWorks.map((work) => work.productId);

		logger.info(`ページ ${pageNumber}: ${workIds.length}件の作品ID抽出`);

		// 最終ページ判定（100件未満なら最終ページ）
		const isLastPage = workIds.length < 100;

		return {
			workIds,
			isLastPage,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`ページ ${pageNumber} の処理中にエラー:`, errorMessage);

		return {
			workIds: [],
			isLastPage: true, // エラー時は終了
			error: errorMessage,
		};
	}
}

/**
 * 全ページをスキャンして作品IDを収集
 */
async function scanAllPages(
	baseUrl: string,
	urlType: string,
	maxPages = 15,
): Promise<CollectionTestResult> {
	const startTime = Date.now();
	const uniqueWorkIds = new Set<string>();
	const errors: string[] = [];
	let totalWorksFound = 0;
	let lastPageNumber = 0;
	let duplicateCount = 0;

	logger.info(`=== ${urlType} URL スキャン開始 ===`);
	logger.info(`ベースURL: ${baseUrl}`);

	for (let page = 1; page <= maxPages; page++) {
		const { workIds, isLastPage, error } = await extractWorkIdsFromPage(baseUrl, page);

		lastPageNumber = page;

		if (error) {
			errors.push(`ページ ${page}: ${error}`);
			break;
		}

		// 作品IDを集計
		for (const workId of workIds) {
			if (uniqueWorkIds.has(workId)) {
				duplicateCount++;
				logger.warn(`重複作品ID検出: ${workId} (ページ ${page})`);
			} else {
				uniqueWorkIds.add(workId);
			}
		}

		totalWorksFound += workIds.length;

		logger.info(`ページ ${page} 完了: ${workIds.length}件 (累計ユニーク: ${uniqueWorkIds.size}件)`);

		if (isLastPage) {
			logger.info(`最終ページ検出: ページ ${page}`);
			break;
		}

		// レート制限対応
		await new Promise((resolve) => setTimeout(resolve, 1500));
	}

	const executionTimeMs = Date.now() - startTime;

	logger.info(`=== ${urlType} URL スキャン完了 ===`);
	logger.info(`- 総ページ数: ${lastPageNumber}`);
	logger.info(`- 総作品数: ${totalWorksFound}件`);
	logger.info(`- ユニーク作品数: ${uniqueWorkIds.size}件`);
	logger.info(`- 重複数: ${duplicateCount}件`);
	logger.info(`- 実行時間: ${(executionTimeMs / 1000).toFixed(2)}秒`);

	return {
		urlType,
		totalPagesScanned: lastPageNumber,
		totalWorksFound,
		uniqueWorkIds,
		duplicateCount,
		lastPageNumber,
		executionTimeMs,
		errors,
	};
}

/**
 * 複数URLの比較テスト実行
 */
export async function runCollectionTest(): Promise<void> {
	logger.info("🚀 DLsiteデータ収集完全性テスト開始");

	const results: CollectionTestResult[] = [];

	// 現在のURL（問題のあるフィルター付き）をテスト
	logger.info("\n📊 現在のシステムURL（フィルター付き）をテスト中...");
	const currentResult = await scanAllPages(TEST_URLS.current, "現在のシステム");
	results.push(currentResult);

	// 待機時間
	logger.info("⏳ 5秒待機中...");
	await new Promise((resolve) => setTimeout(resolve, 5000));

	// 新しいURL（フィルター削除）をテスト
	logger.info("\n📊 新しいURL（フィルター削除）をテスト中...");
	const newResult = await scanAllPages(TEST_URLS.new, "新しいシステム");
	results.push(newResult);

	// 結果比較分析
	analyzeResults(results);
}

/**
 * テスト結果の比較分析
 */
function analyzeResults(results: CollectionTestResult[]): void {
	logger.info("\n📈 === 収集テスト結果比較 ===");

	// 基本統計
	results.forEach((result) => {
		logger.info(`\n${result.urlType}:`);
		logger.info(`  - ユニーク作品数: ${result.uniqueWorkIds.size}件`);
		logger.info(`  - 総作品数: ${result.totalWorksFound}件`);
		logger.info(`  - 重複数: ${result.duplicateCount}件`);
		logger.info(`  - スキャンページ数: ${result.totalPagesScanned}ページ`);
		logger.info(`  - 実行時間: ${(result.executionTimeMs / 1000).toFixed(2)}秒`);

		if (result.errors.length > 0) {
			logger.warn(`  - エラー数: ${result.errors.length}件`);
			result.errors.forEach((error) => logger.warn(`    * ${error}`));
		}
	});

	// 差異分析
	if (results.length >= 2) {
		const current = results[0];
		const newSystem = results[1];

		if (!current || !newSystem) {
			logger.error("テスト結果が不完全です");
			return;
		}
		const difference = newSystem.uniqueWorkIds.size - current.uniqueWorkIds.size;
		const percentageIncrease =
			current.uniqueWorkIds.size > 0
				? ((difference / current.uniqueWorkIds.size) * 100).toFixed(1)
				: "N/A";

		logger.info("\n🔍 === 差異分析 ===");
		logger.info(`作品数の差: ${difference > 0 ? "+" : ""}${difference}件`);
		logger.info(`増加率: ${percentageIncrease}%`);

		if (difference > 0) {
			logger.info(`✅ 新しいシステムで ${difference}件 の追加作品を発見！`);

			// 期待値との比較
			const expectedTotal = 1015;
			const newSystemCompleteness = (newSystem.uniqueWorkIds.size / expectedTotal) * 100;
			const currentSystemCompleteness = (current.uniqueWorkIds.size / expectedTotal) * 100;

			logger.info("\n📊 === 完全性評価 ===");
			logger.info(`期待値: ${expectedTotal}件`);
			logger.info(
				`現在のシステム: ${current.uniqueWorkIds.size}件 (${currentSystemCompleteness.toFixed(1)}%)`,
			);
			logger.info(
				`新しいシステム: ${newSystem.uniqueWorkIds.size}件 (${newSystemCompleteness.toFixed(1)}%)`,
			);

			if (newSystemCompleteness >= 99.0) {
				logger.info("🎉 新しいシステムでほぼ完全な収集を達成！");
			} else {
				logger.warn(`⚠️  まだ ${expectedTotal - newSystem.uniqueWorkIds.size}件 不足しています`);
			}
		} else if (difference < 0) {
			logger.warn(`⚠️  新しいシステムで ${Math.abs(difference)}件 減少`);
		} else {
			logger.info("ℹ️  両システムで同じ作品数を収集");
		}

		// 新しいシステムでのみ発見された作品ID
		if (difference > 0) {
			const newWorkIds = [...newSystem.uniqueWorkIds].filter(
				(id) => !current.uniqueWorkIds.has(id),
			);
			logger.info("\n🆕 新しいシステムでのみ発見された作品ID（最初の10件）:");
			newWorkIds.slice(0, 10).forEach((id) => logger.info(`  - ${id}`));
			if (newWorkIds.length > 10) {
				logger.info(`  - ...および他 ${newWorkIds.length - 10}件`);
			}
		}
	}

	logger.info("\n✨ 収集テスト完了");
}

/**
 * 作品IDリストを保存（デバッグ用）
 */
export function saveWorkIdsList(result: CollectionTestResult, filename: string): void {
	const workIdsList = Array.from(result.uniqueWorkIds).sort();

	// この関数は実際にファイルシステムに書き込むため、
	// Cloud Functions環境では/tmp/配下に保存
	logger.info(`作品IDリストを保存予定: ${filename} (${workIdsList.length}件)`);
	logger.debug(`最初の10件: ${workIdsList.slice(0, 10).join(", ")}`);
}
