/**
 * DLsite作品ID収集ドメインロジック
 *
 * Cloud Functions と 開発ツールで共通利用する作品ID収集処理
 * HTMLパターンマッチングとページング処理を統合
 */

import { getDLsiteConfig } from "../../infrastructure/management/config-manager";
import * as logger from "../../shared/logger";
import {
	fetchDLsiteAjaxResult,
	isLastPageFromPageInfo,
	validateAjaxHtmlContent,
} from "./dlsite-ajax-fetcher";

// 設定を取得
const config = getDLsiteConfig();

/**
 * 作品ID抽出の設定オプション
 */
export interface WorkIdCollectionOptions {
	/** 最大ページ数制限 */
	maxPages?: number;
	/** リクエスト間隔（ms） */
	requestDelay?: number;
	/** 詳細ログ出力 */
	enableDetailedLogging?: boolean;
}

/**
 * 作品ID収集結果
 */
export interface WorkIdCollectionResult {
	/** 収集された作品ID配列 */
	workIds: string[];
	/** 総ページ数 */
	totalPages: number;
	/** DLsiteが報告する総作品数 */
	totalCount: number;
}

/**
 * HTMLから作品IDを抽出するパターン群
 */
const WORK_ID_EXTRACTION_PATTERNS = {
	/** メイン検索結果パターン（優先） - 実際のHTML構造に合わせてli要素を対象 */
	main: [/<li[^>]*class="[^"]*search_result_img_box[^"]*"[^>]*>[\s\S]*?<\/li>/g],
	/** フォールバック・厳密パターン */
	fallback: [
		/href="\/maniax\/work\/[^"]*product_id\/([^"/]+)/g,
		/"product_id":"([^"]+)"/g,
		/data-list_item_product_id="([^"]+)"/g,
		/product_id=([^"&\s]+)/g,
		/href="[^"]*\/product_id\/([^"/\s]+)/g,
	],
} as const;

/**
 * 作品IDの形式を検証
 */
function isValidWorkId(workId: string | undefined): boolean {
	return !!workId && /^RJ\d{6,8}$/.test(workId);
}

/**
 * パターンマッチングで作品IDを抽出
 */
function extractWorkIdsWithPatterns(html: string, patterns: readonly RegExp[]): Set<string> {
	const workIds = new Set<string>();

	for (const pattern of patterns) {
		const matches = [...html.matchAll(pattern)];
		for (const match of matches) {
			const workId = match[1];
			if (workId && isValidWorkId(workId)) {
				workIds.add(workId);
			}
		}
	}

	return workIds;
}

/**
 * メインパターンで作品IDを抽出
 */
function extractWithMainPattern(html: string): Set<string> {
	const workIds = new Set<string>();
	const searchResultSections = [...html.matchAll(WORK_ID_EXTRACTION_PATTERNS.main[0])];

	for (const section of searchResultSections) {
		const sectionHtml = section[0];
		const sectionWorkIds = extractWorkIdsWithPatterns(
			sectionHtml,
			WORK_ID_EXTRACTION_PATTERNS.fallback,
		);
		for (const workId of sectionWorkIds) {
			workIds.add(workId);
		}
	}

	return workIds;
}

/**
 * HTMLから作品IDを抽出
 *
 * @param html - 抽出対象のHTML
 * @param useMainPattern - メインパターンを試行するか
 * @param enableDetailedLogging - 詳細ログを出力するか
 * @returns 抽出された作品IDのSet
 */
function extractWorkIdsFromHtml(
	html: string,
	useMainPattern = true,
	enableDetailedLogging = false,
): Set<string> {
	let allMatches = new Set<string>();

	// メインパターンの試行
	if (useMainPattern) {
		allMatches = extractWithMainPattern(html);
	}

	// フォールバックパターン（メインパターンが失敗した場合 or 直接指定）
	if (allMatches.size === 0) {
		if (useMainPattern && enableDetailedLogging) {
			logger.debug("検索結果コンテナが見つからないため、代替パターンを使用");
		}

		allMatches = extractWorkIdsWithPatterns(html, WORK_ID_EXTRACTION_PATTERNS.fallback);
	}

	return allMatches;
}

/**
 * ページ処理の結果
 */
interface PageProcessingResult {
	workIds: string[];
	totalCount?: number;
	shouldContinue: boolean;
}

/**
 * 単一ページの処理
 */
async function processSinglePage(
	pageNumber: number,
	enableDetailedLogging: boolean,
): Promise<PageProcessingResult> {
	if (enableDetailedLogging) {
		logger.info(`ページ ${pageNumber} を処理中...`);
	}

	const ajaxResult = await fetchDLsiteAjaxResult(pageNumber);
	const result: PageProcessingResult = {
		workIds: [],
		shouldContinue: true,
	};

	// 初回ページの場合、総作品数を記録
	if (pageNumber === 1) {
		result.totalCount = ajaxResult.page_info.count;
		logger.info(`総作品数: ${result.totalCount}`);
	}

	// HTMLコンテンツの検証
	if (!validateAjaxHtmlContent(ajaxResult.search_result)) {
		logger.warn(`ページ ${pageNumber}: 無効なHTMLコンテンツ`);
		result.shouldContinue = false;
		return result;
	}

	// 作品ID抽出
	const pageWorkIds = extractWorkIdsFromHtml(ajaxResult.search_result, true, enableDetailedLogging);

	if (pageWorkIds.size === 0) {
		logger.info(`ページ ${pageNumber}: 作品が見つかりません。収集完了`);
		result.shouldContinue = false;
		return result;
	}

	result.workIds = Array.from(pageWorkIds);

	// 最終ページ判定
	if (isLastPageFromPageInfo(ajaxResult.page_info, pageNumber)) {
		logger.info(`ページ ${pageNumber} が最終ページです`);
		result.shouldContinue = false;
	}

	return result;
}

/**
 * DLsite AJAX APIから全作品IDを収集
 *
 * @param options - 収集オプション
 * @returns 作品ID収集結果
 */
export async function collectAllWorkIds(
	options: WorkIdCollectionOptions = {},
): Promise<WorkIdCollectionResult> {
	const {
		maxPages = 100,
		requestDelay = config.requestDelay,
		enableDetailedLogging = false,
	} = options;

	const allWorkIds: string[] = [];
	let currentPage = 1;
	let totalCount = 0;

	logger.info("🔍 DLsite作品ID収集開始");

	while (currentPage <= maxPages) {
		try {
			const pageResult = await processSinglePage(currentPage, enableDetailedLogging);

			// 初回ページの総作品数を記録
			if (pageResult.totalCount !== undefined) {
				totalCount = pageResult.totalCount;
			}

			// 作品IDを追加
			allWorkIds.push(...pageResult.workIds);

			// 継続判定
			if (!pageResult.shouldContinue) {
				break;
			}

			currentPage++;

			// レート制限対応
			await new Promise((resolve) => setTimeout(resolve, requestDelay));
		} catch (error) {
			logger.error(`作品ID収集エラー (ページ ${currentPage}):`, { error });
			break;
		}
	}

	// 重複除去
	const uniqueWorkIds = [...new Set(allWorkIds)];

	if (uniqueWorkIds.length === 0) {
		logger.warn("⚠️ 作品IDを1件も取得できませんでした");
	} else {
		logger.info(`✅ 作品ID収集完了: ${uniqueWorkIds.length}件`);
	}

	return {
		workIds: uniqueWorkIds,
		totalPages: currentPage - 1,
		totalCount,
	};
}

/**
 * Cloud Functions用の効率的作品ID収集
 * dlsite-individual-info-api.ts の getAllWorkIds() に対応
 */
export async function collectWorkIdsForProduction(): Promise<string[]> {
	const result = await collectAllWorkIds({
		enableDetailedLogging: false,
		maxPages: 50, // Cloud Functions では効率重視
	});

	return result.workIds;
}
