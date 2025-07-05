/**
 * DLsite作品収集完全性監視システム
 *
 * 1015件すべての作品が確実に収集されることを保証
 */

import firestore from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";

// 型定義をローカルで追加
interface CollectionProgress {
	totalExpected: number;
	totalCollected: number;
	lastPage: number;
	failedPages: number[];
	completeness: number;
	lastUpdated: string;
}

// 収集進捗管理用のコレクション
const COLLECTION_PROGRESS_COLLECTION = "dlsiteCollectionProgress";
const PROGRESS_DOC_ID = "current_progress";

/**
 * ベースURL（シンプルな全件取得）
 */
const BASE_SEARCH_URL =
	"https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22";

/**
 * 収集進捗を初期化（動的総作品数取得）
 */
export async function initializeCollectionProgress(
	totalExpected?: number,
): Promise<CollectionProgress> {
	// 動的に総作品数を取得（引数で上書き可能）
	const actualTotalExpected = totalExpected ?? (await fetchTotalWorksCount());

	const progress: CollectionProgress = {
		totalExpected: actualTotalExpected,
		totalCollected: 0,
		lastPage: 0,
		failedPages: [],
		completeness: 0,
		lastUpdated: new Date().toISOString(),
	};

	const progressRef = firestore.collection(COLLECTION_PROGRESS_COLLECTION).doc(PROGRESS_DOC_ID);
	await progressRef.set(progress);

	logger.info(`収集進捗を初期化しました: 期待値=${actualTotalExpected}件`);
	return progress;
}

/**
 * 現在の収集進捗を取得
 */
export async function getCurrentProgress(): Promise<CollectionProgress | null> {
	const progressRef = firestore.collection(COLLECTION_PROGRESS_COLLECTION).doc(PROGRESS_DOC_ID);
	const doc = await progressRef.get();

	if (!doc.exists) {
		return null;
	}

	return doc.data() as CollectionProgress;
}

/**
 * 収集進捗を更新
 */
export async function updateCollectionProgress(
	updates: Partial<CollectionProgress>,
): Promise<CollectionProgress> {
	const progressRef = firestore.collection(COLLECTION_PROGRESS_COLLECTION).doc(PROGRESS_DOC_ID);

	const updateData = {
		...updates,
		lastUpdated: new Date().toISOString(),
	};

	// 完全性率を計算
	if (updates.totalCollected !== undefined || updates.totalExpected !== undefined) {
		const current = await getCurrentProgress();
		const totalExpected =
			updates.totalExpected ?? current?.totalExpected ?? (await fetchTotalWorksCount());
		const totalCollected = updates.totalCollected ?? current?.totalCollected ?? 0;

		updateData.completeness = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
	}

	await progressRef.update(updateData);

	const updatedDoc = await progressRef.get();
	const progress = updatedDoc.data() as CollectionProgress;

	logger.info(
		`収集進捗を更新: ${progress.totalCollected}/${progress.totalExpected}件 (${progress.completeness.toFixed(1)}%)`,
	);
	return progress;
}

/**
 * ページ処理成功を記録
 */
export async function recordPageSuccess(pageNumber: number, itemsCollected: number): Promise<void> {
	const current = await getCurrentProgress();
	if (!current) {
		logger.error("収集進捗が初期化されていません");
		return;
	}

	await updateCollectionProgress({
		lastPage: Math.max(current.lastPage, pageNumber),
		totalCollected: current.totalCollected + itemsCollected,
		// 失敗したページリストから該当ページを削除
		failedPages: current.failedPages.filter((p: number) => p !== pageNumber),
	});

	logger.debug(`ページ${pageNumber}処理成功: ${itemsCollected}件収集`);
}

/**
 * ページ処理失敗を記録
 */
export async function recordPageFailure(pageNumber: number, error: string): Promise<void> {
	const current = await getCurrentProgress();
	if (!current) {
		logger.error("収集進捗が初期化されていません");
		return;
	}

	// 失敗したページを記録（重複なし）
	const failedPages = [...new Set([...current.failedPages, pageNumber])];

	await updateCollectionProgress({
		lastPage: Math.max(current.lastPage, pageNumber),
		failedPages,
	});

	logger.warn(`ページ${pageNumber}処理失敗: ${error}`);
}

/**
 * 失敗したページを再処理
 */
export async function getFailedPagesForRetry(): Promise<number[]> {
	const current = await getCurrentProgress();
	if (!current) {
		return [];
	}

	return current.failedPages.sort((a: number, b: number) => a - b);
}

/**
 * 収集完了をチェック
 */
export async function checkCollectionCompleteness(): Promise<{
	isComplete: boolean;
	progress: CollectionProgress;
	issues: string[];
}> {
	const progress = await getCurrentProgress();
	if (!progress) {
		const currentTotal = await fetchTotalWorksCount();
		return {
			isComplete: false,
			progress: {
				totalExpected: currentTotal,
				totalCollected: 0,
				lastPage: 0,
				failedPages: [],
				completeness: 0,
				lastUpdated: new Date().toISOString(),
			},
			issues: ["収集進捗が初期化されていません"],
		};
	}

	const issues: string[] = [];

	// 完全性チェック
	if (progress.totalCollected < progress.totalExpected) {
		issues.push(`${progress.totalExpected - progress.totalCollected}件の作品が不足しています`);
	}

	// 失敗したページがあるかチェック
	if (progress.failedPages.length > 0) {
		issues.push(
			`${progress.failedPages.length}ページの処理に失敗しています: ${progress.failedPages.join(", ")}`,
		);
	}

	const isComplete = progress.completeness >= 99.0 && progress.failedPages.length === 0;

	return {
		isComplete,
		progress,
		issues,
	};
}

/**
 * DLsiteから総作品数とページネーション情報を取得
 */
export async function fetchTotalWorksCount(): Promise<number> {
	try {
		// 1ページ目を取得して総件数を確認
		const url = `${BASE_SEARCH_URL}/per_page/100/page/1`;

		logger.debug(`総作品数取得: ${url}`);

		const response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const html = await response.text();

		// HTMLから総件数を抽出（DLsiteの検索結果ページから）

		// パターン1: APIレスポンス形式 "count":1015
		const apiCountMatch = html.match(/"count"\s*:\s*(\d+)/);
		if (apiCountMatch?.[1]) {
			const totalCount = Number.parseInt(apiCountMatch[1], 10);
			if (totalCount > 0) {
				logger.info(`DLsiteから総作品数を取得（APIパターン）: ${totalCount}件`);
				return totalCount;
			}
		}

		// パターン2: "1,015件中1～30件目" 形式
		const paginationMatch = html.match(/([0-9,]+)\s*件\s*中\s*(\d+)\s*～\s*(\d+)\s*件\s*目/);
		if (paginationMatch?.[1] && paginationMatch[2] && paginationMatch[3]) {
			const totalStr = paginationMatch[1].replace(/,/g, "");
			const startItem = Number.parseInt(paginationMatch[2], 10);
			const endItem = Number.parseInt(paginationMatch[3], 10);
			const totalCount = Number.parseInt(totalStr, 10);

			if (totalCount > 0) {
				logger.info(
					`DLsiteから総作品数を取得: ${totalCount}件 (${startItem}～${endItem}件目表示中)`,
				);
				return totalCount;
			}
		}

		// パターン3: "1,015件の作品が見つかりました" 形式（フォールバック）
		const countMatch = html.match(/([0-9,]+)\s*件\s*の\s*作品/);
		if (countMatch?.[1]) {
			const countStr = countMatch[1].replace(/,/g, "");
			const totalCount = Number.parseInt(countStr, 10);

			if (totalCount > 0) {
				logger.info(`DLsiteから総作品数を取得: ${totalCount}件`);
				return totalCount;
			}
		}

		// HTMLパースに失敗した場合はデフォルト値
		logger.warn("総作品数をHTMLから抽出できませんでした。デフォルト値1015を使用します");
		return 1015;
	} catch (error) {
		logger.error("総作品数の取得に失敗:", error);
		return 1015; // デフォルト値
	}
}

/**
 * 堅牢なページネーション戦略
 */
export async function calculateOptimalPageStrategy(totalWorks: number): Promise<{
	totalPages: number;
	itemsPerPage: number;
	pageRanges: Array<{ start: number; end: number }>;
}> {
	const itemsPerPage = 100; // DLsiteの最大
	const totalPages = Math.ceil(totalWorks / itemsPerPage);

	// Cloud Functionsの実行時間制限を考慮して分割
	const maxPagesPerExecution = 20; // 1回の実行で処理する最大ページ数
	const pageRanges: Array<{ start: number; end: number }> = [];

	for (let start = 1; start <= totalPages; start += maxPagesPerExecution) {
		const end = Math.min(start + maxPagesPerExecution - 1, totalPages);
		pageRanges.push({ start, end });
	}

	logger.info(`ページ戦略計算完了: 総${totalPages}ページを${pageRanges.length}回の実行に分割`);

	return {
		totalPages,
		itemsPerPage,
		pageRanges,
	};
}

/**
 * 収集品質レポートを生成
 */
export async function generateQualityReport(): Promise<{
	progress: CollectionProgress;
	qualityScore: number;
	recommendations: string[];
}> {
	const { isComplete, progress } = await checkCollectionCompleteness();

	let qualityScore = 100;
	const recommendations: string[] = [];

	// 完全性スコア
	if (progress.completeness < 95) {
		qualityScore -= (95 - progress.completeness) * 2;
		recommendations.push("データ収集の完全性を向上させてください");
	}

	// 失敗ページスコア
	if (progress.failedPages.length > 0) {
		qualityScore -= progress.failedPages.length * 5;
		recommendations.push(`失敗した${progress.failedPages.length}ページを再処理してください`);
	}

	// 最新性スコア
	const lastUpdated = new Date(progress.lastUpdated);
	const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
	if (hoursSinceUpdate > 24) {
		qualityScore -= Math.min(20, hoursSinceUpdate - 24);
		recommendations.push("データの更新が古くなっています");
	}

	qualityScore = Math.max(0, qualityScore);

	if (isComplete && qualityScore >= 90) {
		recommendations.push("データ収集は良好な状態です");
	}

	return {
		progress,
		qualityScore,
		recommendations,
	};
}

/**
 * DLsiteから詳細なページネーション情報を取得
 */
export async function fetchDetailedPaginationInfo(): Promise<{
	totalWorks: number;
	currentPage: number;
	itemsPerPage: number;
	startItem: number;
	endItem: number;
	maxPages: number;
}> {
	try {
		const url = `${BASE_SEARCH_URL}/per_page/100/page/1`;

		const response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const html = await response.text();

		// "1,015件中1～100件目" 形式を解析
		const paginationMatch = html.match(/([0-9,]+)\s*件\s*中\s*(\d+)\s*～\s*(\d+)\s*件\s*目/);
		if (paginationMatch?.[1] && paginationMatch[2] && paginationMatch[3]) {
			const totalWorks = Number.parseInt(paginationMatch[1].replace(/,/g, ""), 10);
			const startItem = Number.parseInt(paginationMatch[2], 10);
			const endItem = Number.parseInt(paginationMatch[3], 10);
			const itemsPerPage = endItem - startItem + 1;
			const currentPage = 1;
			const maxPages = Math.ceil(totalWorks / itemsPerPage);

			logger.info(
				`詳細ページネーション情報: 総${totalWorks}件、${itemsPerPage}件/ページ、最大${maxPages}ページ`,
			);

			return {
				totalWorks,
				currentPage,
				itemsPerPage,
				startItem,
				endItem,
				maxPages,
			};
		}

		throw new Error("ページネーション情報を抽出できませんでした");
	} catch (error) {
		logger.error("詳細ページネーション情報の取得に失敗:", error);

		// フォールバック値
		const fallbackTotal = 1015;
		const fallbackItemsPerPage = 100;
		return {
			totalWorks: fallbackTotal,
			currentPage: 1,
			itemsPerPage: fallbackItemsPerPage,
			startItem: 1,
			endItem: fallbackItemsPerPage,
			maxPages: Math.ceil(fallbackTotal / fallbackItemsPerPage),
		};
	}
}
