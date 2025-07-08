/**
 * DLsite作品IDコレクター
 * 開発環境で作品IDを収集し、JSONファイルとして保存するツール
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	fetchDLsiteAjaxResult,
	validateAjaxHtmlContent,
} from "../services/dlsite/dlsite-ajax-fetcher";
import * as logger from "../shared/logger";

interface WorkIdCollectionResult {
	collectedAt: string;
	totalCount: number;
	pageCount: number;
	workIds: string[];
	metadata: {
		creatorName: string;
		searchUrl: string;
		environment: string;
	};
}

/**
 * 全作品IDを収集してJSONファイルに保存
 */
export async function collectAndSaveWorkIds(): Promise<void> {
	logger.info("🔍 作品ID収集を開始します...");

	const allWorkIds: string[] = [];
	let currentPage = 1;
	const maxPages = 50;
	let totalCount = 0;

	try {
		while (currentPage <= maxPages) {
			logger.info(`ページ ${currentPage} を処理中...`);

			const ajaxResult = await fetchDLsiteAjaxResult(currentPage);

			// 総作品数を記録
			if (currentPage === 1) {
				totalCount = ajaxResult.page_info.count;
				logger.info(`総作品数: ${totalCount}`);
			}

			if (!validateAjaxHtmlContent(ajaxResult.search_result)) {
				logger.warn(`ページ ${currentPage}: 無効なHTMLコンテンツ`);
				break;
			}

			// メイン検索結果のみを抽出（サイドバーや関連作品を除外）
			// 検索結果コンテナの特定
			const searchResultPattern =
				/<div[^>]*class="[^"]*search_result_img_box[^"]*"[^>]*>[\s\S]*?<\/div>/g;
			const searchResultSections = [...ajaxResult.search_result.matchAll(searchResultPattern)];

			const pageWorkIds = new Set<string>();

			if (searchResultSections.length > 0) {
				// メイン検索結果から作品IDを抽出
				for (const section of searchResultSections) {
					const sectionHtml = section[0];
					const patterns = [
						/product_id=([^"&\s]+)/g,
						/href="[^"]*\/product_id\/([^"/\s]+)/g,
						/data-list_item_product_id="([^"]+)"/g,
					];

					for (const pattern of patterns) {
						const matches = [...sectionHtml.matchAll(pattern)];
						matches.forEach((match) => {
							const workId = match[1];
							if (workId && /^RJ\d{6,8}$/.test(workId)) {
								pageWorkIds.add(workId);
							}
						});
					}
				}
			} else {
				// フォールバック：検索結果コンテナが見つからない場合
				logger.debug(
					`ページ ${currentPage}: 検索結果コンテナが見つからないため、代替パターンを使用`,
				);

				// より厳密なパターンでメイン結果のみを抽出
				const strictPatterns = [
					/href="\/maniax\/work\/[^"]*product_id\/([^"/]+)/g,
					/"product_id":"([^"]+)"/g,
					/data-list_item_product_id="([^"]+)"/g, // 新しいデータ属性パターン
				];

				for (const pattern of strictPatterns) {
					const matches = [...ajaxResult.search_result.matchAll(pattern)];
					matches.forEach((match) => {
						const workId = match[1];
						if (workId && /^RJ\d{6,8}$/.test(workId)) {
							pageWorkIds.add(workId);
						}
					});
				}
			}

			if (pageWorkIds.size === 0) {
				logger.warn(`ページ ${currentPage}: 作品IDが見つかりませんでした`);
				// HTMLの一部をログに出力してデバッグ
				logger.debug("HTMLサンプル:", ajaxResult.search_result.substring(0, 500));
				break;
			}

			const pageWorkIdsArray = Array.from(pageWorkIds);
			allWorkIds.push(...pageWorkIdsArray);

			logger.info(`ページ ${currentPage}: ${pageWorkIdsArray.length}件の作品IDを取得`);
			logger.debug(`取得したID例: ${pageWorkIdsArray.slice(0, 3).join(", ")}`);

			// 最終ページ判定
			const isLastPage = currentPage * 30 >= totalCount;
			if (isLastPage) {
				logger.info(`ページ ${currentPage} が最終ページです`);
				break;
			}

			currentPage++;

			// レート制限対応
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		// 重複を削除してソート
		const uniqueWorkIds = [...new Set(allWorkIds)].sort();

		// 結果をJSONとして保存
		const result: WorkIdCollectionResult = {
			collectedAt: new Date().toISOString(),
			totalCount: totalCount,
			pageCount: currentPage - 1,
			workIds: uniqueWorkIds,
			metadata: {
				creatorName: "涼花みなせ",
				searchUrl:
					"https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/",
				environment: process.env.NODE_ENV || "development",
			},
		};

		// JSONファイルとして保存
		const outputPath = join(__dirname, "../assets/dlsite-work-ids.json");
		writeFileSync(outputPath, JSON.stringify(result, null, 2));

		logger.info(`✅ 作品ID収集完了: ${uniqueWorkIds.length}件`);
		logger.info(`📁 保存先: ${outputPath}`);
	} catch (error) {
		logger.error("作品ID収集中にエラーが発生しました:", error);
		throw error;
	}
}

// 直接実行された場合
if (require.main === module) {
	collectAndSaveWorkIds()
		.then(() => {
			logger.info("✨ 処理が完了しました");
			process.exit(0);
		})
		.catch((error) => {
			logger.error("❌ エラーが発生しました:", error);
			process.exit(1);
		});
}
