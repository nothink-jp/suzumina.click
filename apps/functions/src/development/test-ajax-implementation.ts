/**
 * AJAX実装の手動テストスクリプト
 *
 * 使用方法:
 * pnpm --filter @suzumina.click/functions tsx src/development/test-ajax-implementation.ts
 */

import {
	fetchDLsiteAjaxResult,
	isLastPageFromPageInfo,
} from "../services/dlsite/dlsite-ajax-fetcher";
import { parseWorksFromHTML } from "../services/dlsite/dlsite-parser";
import * as logger from "../shared/logger";

async function testAjaxImplementation() {
	logger.info("=== DLsite AJAX実装テスト開始 ===");

	try {
		// ページ1をテスト
		logger.info("\n📄 ページ1のテスト");
		const page1Result = await fetchDLsiteAjaxResult(1);

		logger.info("ページング情報:", {
			totalWorks: page1Result.page_info.count,
			firstIndex: page1Result.page_info.first_indice,
			lastIndex: page1Result.page_info.last_indice,
			expectedItems: page1Result.page_info.last_indice - page1Result.page_info.first_indice + 1,
		});

		// HTML内容の確認
		logger.info("HTML内容プレビュー（最初の500文字）:", {
			preview: page1Result.search_result.substring(0, 500),
		});

		// エスケープ文字の確認
		const hasEscapedChars =
			page1Result.search_result.includes('\\"') || page1Result.search_result.includes("\\/");
		logger.info("エスケープ文字の存在:", hasEscapedChars);

		// HTML構造のデバッグ
		const $ = require("cheerio").load(page1Result.search_result);
		const searchResultList = $("#search_result_img_box");
		const liElements = $("#search_result_img_box li");
		const liWithProductId = $("#search_result_img_box li[data-list_item_product_id]");

		logger.info("HTML構造デバッグ:", {
			searchResultListFound: searchResultList.length > 0,
			liElementsCount: liElements.length,
			liWithProductIdCount: liWithProductId.length,
		});

		// HTMLパース
		const worksPage1 = parseWorksFromHTML(page1Result.search_result);
		logger.info(`パース結果: ${worksPage1.length}件の作品を抽出`);

		// 最初の作品を表示
		if (worksPage1.length > 0) {
			logger.info("最初の作品:", {
				productId: worksPage1[0].productId,
				title: worksPage1[0].title,
				circle: worksPage1[0].circle,
				currentPrice: worksPage1[0].currentPrice,
			});
		}

		// 最終ページ判定
		const isLastPage1 = isLastPageFromPageInfo(page1Result.page_info, 1);
		logger.info(`最終ページ判定: ${isLastPage1 ? "はい" : "いいえ"}`);

		// ページ2をテスト（存在する場合）
		if (!isLastPage1 && page1Result.page_info.count > 30) {
			logger.info("\n📄 ページ2のテスト");
			const page2Result = await fetchDLsiteAjaxResult(2);

			logger.info("ページング情報:", {
				firstIndex: page2Result.page_info.first_indice,
				lastIndex: page2Result.page_info.last_indice,
			});

			const worksPage2 = parseWorksFromHTML(page2Result.search_result);
			logger.info(`パース結果: ${worksPage2.length}件の作品を抽出`);

			// 作品IDの重複チェック
			const page1Ids = new Set(worksPage1.map((w) => w.productId));
			const duplicates = worksPage2.filter((w) => page1Ids.has(w.productId));

			if (duplicates.length > 0) {
				logger.warn(`⚠️ ページ1とページ2で${duplicates.length}件の重複があります`);
			} else {
				logger.info("✅ ページ間の重複なし");
			}
		}

		// 統計情報
		logger.info("\n📊 統計情報:");
		logger.info(`- 総作品数: ${page1Result.page_info.count}件`);
		logger.info(`- 予想ページ数: ${Math.ceil(page1Result.page_info.count / 30)}ページ`);
		logger.info("- 1ページあたり: 30件（AJAX API固定）");

		logger.info("\n✅ AJAX実装テスト完了！");
	} catch (error) {
		logger.error("❌ テスト中にエラーが発生しました:", error);
		process.exit(1);
	}
}

// スクリプトとして実行された場合
if (require.main === module) {
	testAjaxImplementation()
		.then(() => process.exit(0))
		.catch((error) => {
			logger.error("予期しないエラー:", error);
			process.exit(1);
		});
}
