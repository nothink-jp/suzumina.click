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
import { handleNoWorkIdsError, validateWorkIds, warnPartialSuccess } from "./work-id-validator";

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
	/** 検証設定 */
	validation?: {
		minCoveragePercentage?: number;
		maxExtraPercentage?: number;
		logDetails?: boolean;
	};
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
	/** 検証結果 */
	validationResult?: {
		isValid: boolean;
		regionWarning?: boolean;
		warnings: string[];
	};
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
	const allMatches = new Set<string>();
	let patternUsed = "fallback";

	// メインパターンの試行
	if (useMainPattern) {
		const searchResultSections = [...html.matchAll(WORK_ID_EXTRACTION_PATTERNS.main[0])];

		if (searchResultSections.length > 0) {
			patternUsed = "main";

			for (const section of searchResultSections) {
				const sectionHtml = section[0];

				// メインパターン内での詳細抽出
				for (const pattern of WORK_ID_EXTRACTION_PATTERNS.fallback) {
					const matches = [...sectionHtml.matchAll(pattern)];
					matches.forEach((match) => {
						const workId = match[1];
						if (workId && /^RJ\d{6,8}$/.test(workId)) {
							allMatches.add(workId);
						}
					});
				}
			}
		}
	}

	// フォールバックパターン（メインパターンが失敗した場合 or 直接指定）
	if (allMatches.size === 0) {
		if (useMainPattern && enableDetailedLogging) {
			logger.debug("検索結果コンテナが見つからないため、代替パターンを使用");
		}

		patternUsed = "fallback";

		for (const pattern of WORK_ID_EXTRACTION_PATTERNS.fallback) {
			const matches = [...html.matchAll(pattern)];
			matches.forEach((match) => {
				const workId = match[1];
				if (workId && /^RJ\d{6,8}$/.test(workId)) {
					allMatches.add(workId);
				}
			});
		}
	}

	if (enableDetailedLogging && allMatches.size > 0) {
		logger.debug(`パターン ${patternUsed} で ${allMatches.size}件の作品IDを抽出`);
	}

	return allMatches;
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
		validation = {
			minCoveragePercentage: 70,
			maxExtraPercentage: 30,
			logDetails: true,
		},
		enableDetailedLogging = false,
	} = options;

	const allWorkIds: string[] = [];
	let currentPage = 1;
	let totalCount = 0;

	logger.info("🔍 DLsite作品ID収集開始");

	while (currentPage <= maxPages) {
		try {
			if (enableDetailedLogging) {
				logger.info(`ページ ${currentPage} を処理中...`);
			}

			const ajaxResult = await fetchDLsiteAjaxResult(currentPage);

			// 総作品数を記録（初回のみ）
			if (currentPage === 1) {
				totalCount = ajaxResult.page_info.count;
				logger.info(`総作品数: ${totalCount}`);
			}

			if (!validateAjaxHtmlContent(ajaxResult.search_result)) {
				logger.warn(`ページ ${currentPage}: 無効なHTMLコンテンツ`);
				break;
			}

			// 作品ID抽出
			const pageWorkIds = extractWorkIdsFromHtml(
				ajaxResult.search_result,
				true, // メインパターンを試行
				enableDetailedLogging,
			);

			if (pageWorkIds.size === 0) {
				logger.info(`ページ ${currentPage}: 作品が見つかりません。収集完了`);
				break;
			}

			const pageWorkIdsArray = Array.from(pageWorkIds);
			allWorkIds.push(...pageWorkIdsArray);

			if (enableDetailedLogging) {
				logger.info(`ページ ${currentPage}: ${pageWorkIds.size}件の作品IDを取得`);
				logger.debug(`取得したID例: ${pageWorkIdsArray.slice(0, 3).join(", ")}`);
			}

			// 最終ページ判定
			const isLastPage = isLastPageFromPageInfo(ajaxResult.page_info, currentPage);
			if (isLastPage) {
				logger.info(`ページ ${currentPage} が最終ページです`);
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

	logger.info(`✅ 作品ID収集完了: ${uniqueWorkIds.length}件`);

	// データ検証
	let validationResult: WorkIdCollectionResult["validationResult"];
	if (validation) {
		const validationCheck = validateWorkIds(uniqueWorkIds, {
			minCoveragePercentage: validation.minCoveragePercentage,
			maxExtraPercentage: validation.maxExtraPercentage,
			logDetails: validation.logDetails,
		});

		validationResult = {
			isValid: !validationCheck.regionWarning,
			regionWarning: validationCheck.regionWarning,
			warnings: validationCheck.regionWarning ? ["リージョン差異が検出されました"] : [],
		};

		// 検証結果に基づく警告
		if (validationCheck.regionWarning) {
			warnPartialSuccess(validationCheck);
		}
	}

	// エラーハンドリング
	if (uniqueWorkIds.length === 0) {
		handleNoWorkIdsError();
	}

	return {
		workIds: uniqueWorkIds,
		totalPages: currentPage - 1,
		totalCount,
		validationResult,
	};
}

/**
 * 開発ツール用の詳細作品ID収集
 * collect-work-ids.ts の機能に対応
 */
export async function collectWorkIdsForDevelopment(): Promise<{
	workIds: string[];
	totalCount: number;
	pageCount: number;
	metadata: {
		creatorName: string;
		searchUrl: string;
		environment: string;
	};
}> {
	const result = await collectAllWorkIds({
		enableDetailedLogging: true,
		maxPages: 100,
	});

	return {
		workIds: result.workIds,
		totalCount: result.totalCount,
		pageCount: result.totalPages,
		metadata: {
			creatorName: "涼花みなせ",
			searchUrl:
				"https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/",
			environment: process.env.NODE_ENV || "development",
		},
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
		validation: {
			minCoveragePercentage: 70,
			maxExtraPercentage: 30,
			logDetails: true,
		},
	});

	return result.workIds;
}
