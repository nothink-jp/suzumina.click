import type { CloudEvent } from "@google-cloud/functions-framework";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { getDLsiteConfig } from "../infrastructure/management/config-manager";
import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import {
	getExistingWorksMap,
	savePriceHistory,
	saveSalesHistory,
	saveWorksToFirestore,
} from "../services/dlsite/dlsite-firestore";
import {
	mapMultipleWorksWithDetailData,
	mapMultipleWorksWithInfo,
} from "../services/dlsite/dlsite-mapper";
import { parseWorksFromHTML } from "../services/dlsite/dlsite-parser";
import * as logger from "../shared/logger";

// メタデータ保存用のドキュメントID
const METADATA_DOC_ID = "fetch_metadata";

// Firestore関連の定数
const METADATA_COLLECTION = "dlsiteMetadata";

// 設定を取得
const config = getDLsiteConfig();

// 実行制限関連の定数（設定から取得）
const MAX_PAGES_PER_EXECUTION = config.maxPagesPerExecution;
const ITEMS_PER_PAGE = config.itemsPerPage;

// DLsite検索用の定数（新URL形式対応）
const DLSITE_SEARCH_BASE_URL =
	"https://www.dlsite.com/maniax/fsr/=/language/jp/sex_category[0]/male/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/options_and_or/and/options[0]/JPN/options[1]/NM/per_page/100/page/";

// メタデータの型定義
interface FetchMetadata {
	lastFetchedAt: Timestamp;
	currentPage?: number;
	isInProgress: boolean;
	lastError?: string;
	lastSuccessfulCompleteFetch?: Timestamp;
	totalWorks?: number;
}

/**
 * 処理結果の型定義
 */
interface FetchResult {
	workCount: number;
	error?: string;
}

/**
 * Pub/SubメッセージのPubsubMessage型定義
 */
interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
}

/**
 * DLsite検索結果の型定義
 */
interface DLsiteSearchResult {
	search_result: string;
	page_info: {
		count: number;
		first_indice: number;
		last_indice: number;
	};
}

/**
 * メタデータの取得または初期化
 */
async function getOrCreateMetadata(): Promise<FetchMetadata> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID);
	const doc = await metadataRef.get();

	if (doc.exists) {
		return doc.data() as FetchMetadata;
	}

	// 初期メタデータの作成
	const initialMetadata: FetchMetadata = {
		lastFetchedAt: Timestamp.now(),
		isInProgress: false,
		currentPage: 1,
	};
	await metadataRef.set(initialMetadata);
	return initialMetadata;
}

/**
 * メタデータの更新
 */
async function updateMetadata(updates: Partial<FetchMetadata>): Promise<void> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID);

	const sanitizedUpdates: Record<string, Timestamp | boolean | string | number | null> = {
		lastFetchedAt: Timestamp.now(), // 常に最終実行時間を更新
	};

	// updatesの各プロパティをチェックし、undefined値をnullに変換
	for (const [key, value] of Object.entries(updates)) {
		if (key !== "lastFetchedAt") {
			sanitizedUpdates[key] = value === undefined ? null : value;
		}
	}

	await metadataRef.update(sanitizedUpdates);
}

/**
 * 処理開始前のメタデータチェックと初期化
 */
async function prepareExecution(): Promise<[FetchMetadata | undefined, FetchResult | undefined]> {
	let metadata: FetchMetadata;
	try {
		metadata = await getOrCreateMetadata();

		// 既に実行中の場合はスキップ（二重実行防止）
		if (metadata.isInProgress) {
			logger.warn("前回の実行が完了していません。処理をスキップします。");
			return [undefined, { workCount: 0, error: "前回の処理が完了していません" }];
		}

		// 処理開始を記録
		await updateMetadata({ isInProgress: true });
		return [metadata, undefined];
	} catch (error) {
		logger.error("メタデータの取得に失敗しました:", error);
		return [undefined, { workCount: 0, error: "メタデータの取得に失敗しました" }];
	}
}

/**
 * DLsiteから検索結果を取得（HTML形式）
 */
async function fetchDLsiteSearchResult(page: number): Promise<DLsiteSearchResult> {
	const url = `${DLSITE_SEARCH_BASE_URL}${page}/show_type/1`;

	logger.debug(`DLsite検索リクエスト（HTML）: ${url}`);

	const response = await fetch(url, {
		headers: generateDLsiteHeaders(),
		signal: AbortSignal.timeout(config.timeoutMs),
	});

	logger.info(
		`DLsiteレスポンス詳細: ステータス=${response.status}, Content-Type=${response.headers.get("Content-Type")}`,
	);

	if (!response.ok) {
		const responseText = await response.text();
		logger.error(`DLsite検索リクエストが失敗しました: ${response.status} ${response.statusText}`, {
			responsePreview: responseText.substring(0, 500),
		});
		throw new Error(
			`DLsite検索リクエストが失敗しました: ${response.status} ${response.statusText}`,
		);
	}

	// HTMLレスポンステキストを取得
	const htmlContent = await response.text();
	logger.info(`DLsiteレスポンス内容プレビュー: ${htmlContent.substring(0, 300)}...`);

	// Content-Typeをチェック（HTMLを期待）
	const contentType = response.headers.get("Content-Type") || "";
	if (!contentType.includes("text/html")) {
		logger.warn(`予期しないContent-Type: ${contentType}`);
	}

	// HTMLが有効かチェック
	if (!htmlContent.includes("<!DOCTYPE html") && !htmlContent.includes("<html")) {
		logger.error("有効なHTMLページが返されませんでした");
		throw new Error("DLsiteから無効なHTMLが返されました");
	}

	// DLsiteSearchResult形式で返す（search_resultにHTMLを格納）
	const result: DLsiteSearchResult = {
		search_result: htmlContent,
		page_info: {
			count: 0, // HTMLから抽出する必要がある場合は後で実装
			first_indice: (page - 1) * 100 + 1,
			last_indice: page * 100,
		},
	};

	logger.info("HTMLページの取得が成功しました");
	return result;
}

/**
 * 単一ページの作品データを処理
 */
async function processSinglePage(
	currentPage: number,
): Promise<{ savedCount: number; parsedCount: number; isLastPage: boolean }> {
	logger.debug(`DLsite検索: ページ ${currentPage} を取得中...`);

	const searchResult = await fetchDLsiteSearchResult(currentPage);

	if (!searchResult.search_result) {
		logger.info(`ページ ${currentPage} は空です。全ての作品の取得が完了しました。`);
		return { savedCount: 0, parsedCount: 0, isLastPage: true };
	}

	// HTMLから作品データを解析
	const parsedWorks = parseWorksFromHTML(searchResult.search_result);

	if (parsedWorks.length === 0) {
		logger.info(
			`ページ ${currentPage} に作品が見つかりませんでした。全ての作品の取得が完了しました。`,
		);
		return { savedCount: 0, parsedCount: 0, isLastPage: true };
	}

	// 効率的な処理: 新規作品と既存作品を分類して処理
	const productIds = parsedWorks.map((w) => w.productId);
	const existingWorksMap = await getExistingWorksMap(productIds);

	// 新規作品と既存作品を分類
	const newWorks = parsedWorks.filter((w) => !existingWorksMap.has(w.productId));
	const existingWorks = parsedWorks.filter((w) => existingWorksMap.has(w.productId));

	logger.info(`ページ ${currentPage} の処理内訳:`, {
		total: parsedWorks.length,
		new: newWorks.length,
		existing: existingWorks.length,
	});

	// 並列処理で効率化
	const [newWorksData, existingWorksData] = await Promise.all([
		// 新規作品は詳細データを含めて取得
		newWorks.length > 0
			? mapMultipleWorksWithDetailData(newWorks, existingWorksMap)
			: Promise.resolve([]),
		// 既存作品は基本情報のみ更新
		existingWorks.length > 0
			? mapMultipleWorksWithInfo(existingWorks, existingWorksMap)
			: Promise.resolve([]),
	]);

	// 統合して保存
	const allWorksData = [...newWorksData, ...existingWorksData];
	await saveWorksToFirestore(allWorksData);

	// 価格履歴を記録（並列実行）
	const priceHistoryPromises = allWorksData.map(async (work) => {
		if (work.price?.current !== undefined) {
			await savePriceHistory(work.productId, {
				currentPrice: work.price.current,
				originalPrice: work.price.original,
				discountRate: work.price.discount,
			});
		}
	});

	try {
		await Promise.allSettled(priceHistoryPromises);
		logger.info(`価格履歴記録完了: ${allWorksData.length}件`);
	} catch (error) {
		logger.warn("価格履歴記録で一部エラー:", { error });
	}

	// 販売履歴を記録（並列実行）
	const salesHistoryPromises = allWorksData.map(async (work) => {
		if (work.salesCount !== undefined || work.totalDownloadCount !== undefined) {
			await saveSalesHistory(work.productId, {
				salesCount: work.salesCount,
				totalDownloadCount: work.totalDownloadCount,
				rankingHistory: work.rankingHistory,
			});
		}
	});

	try {
		await Promise.allSettled(salesHistoryPromises);
		logger.info(`販売履歴記録完了: ${allWorksData.length}件`);
	} catch (error) {
		logger.warn("販売履歴記録で一部エラー:", { error });
	}

	const savedCount = allWorksData.length;
	logger.info(`ページ ${currentPage}: ${savedCount}件の作品を保存しました`, {
		newWorksSaved: newWorksData.length,
		existingWorksUpdated: existingWorksData.length,
	});

	// 総作品数の更新処理
	if (currentPage === 1 && searchResult.page_info) {
		await updateMetadata({
			totalWorks: searchResult.page_info.count,
			currentPage: currentPage + 1,
		});
	} else {
		await updateMetadata({ currentPage: currentPage + 1 });
	}

	// 最終ページ判定
	const isLastPage = parsedWorks.length < ITEMS_PER_PAGE;
	if (isLastPage) {
		logger.info(
			`ページ ${currentPage} の作品数が${ITEMS_PER_PAGE}件未満です。全ての作品の取得が完了しました。`,
		);
	}

	return { savedCount, parsedCount: parsedWorks.length, isLastPage };
}

/**
 * DLsite作品データを取得
 */
async function fetchDLsiteWorksInternal(metadata: FetchMetadata): Promise<{
	workCount: number;
	nextPage: number | undefined;
	isComplete: boolean;
}> {
	let allWorksCount = 0;
	let currentPage = metadata.currentPage || 1;
	let pageCount = 0;
	let isComplete = false;

	if (currentPage > 1) {
		logger.info(`前回の続きから取得を再開します。ページ: ${currentPage}`);
	} else {
		logger.debug("新規に全作品の取得を開始します");
	}

	// ページネーションループ
	while (pageCount < MAX_PAGES_PER_EXECUTION) {
		try {
			const { savedCount, isLastPage } = await processSinglePage(currentPage);
			allWorksCount += savedCount;

			if (isLastPage) {
				isComplete = true;
				break;
			}

			currentPage++;
			pageCount++;

			// レート制限対応（設定から取得）
			await new Promise((resolve) => setTimeout(resolve, config.requestDelay));
		} catch (error: unknown) {
			logger.error(`ページ ${currentPage} の取得中にエラーが発生しました:`, error);
			throw error;
		}
	}

	// ページ制限チェック
	if (pageCount >= MAX_PAGES_PER_EXECUTION && !isComplete) {
		logger.info(
			`最大ページ数(${MAX_PAGES_PER_EXECUTION})に達しました。次回の実行で続きを処理します。`,
		);
	}

	return {
		workCount: allWorksCount,
		nextPage: isComplete ? undefined : currentPage,
		isComplete,
	};
}

/**
 * DLsite作品情報取得の共通処理
 */
async function fetchDLsiteWorksLogic(): Promise<FetchResult> {
	try {
		// 1. 実行前準備（メタデータ確認）
		const [metadata, prepError] = await prepareExecution();
		if (prepError) {
			return prepError;
		}
		if (!metadata) {
			return { workCount: 0, error: "メタデータの準備に失敗しました" };
		}

		// 2. 作品データの取得
		logger.info("DLsiteから涼花みなせの作品情報取得を開始します");
		const { workCount, nextPage, isComplete } = await fetchDLsiteWorksInternal(metadata);

		logger.info(`取得した作品合計: ${workCount}件`);

		// 3. メタデータを更新
		if (isComplete) {
			await updateMetadata({
				currentPage: undefined,
				lastSuccessfulCompleteFetch: Timestamp.now(),
			});
			logger.info("全ての作品の取得が完了しました");
		} else if (nextPage) {
			logger.debug(`次回の実行のためにページ番号を保存: ${nextPage}`);
		}

		// 4. 処理完了を記録
		await updateMetadata({
			isInProgress: false,
			lastError: undefined,
		});

		return { workCount };
	} catch (error: unknown) {
		logger.error("DLsite作品情報取得中にエラーが発生しました:", error);

		// 可能な場合はメタデータ更新
		try {
			await updateMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("エラー状態の記録に失敗しました:", updateError);
		}

		return {
			workCount: 0,
			error: error instanceof Error ? error.message : "不明なエラーが発生しました",
		};
	}
}

/**
 * DLsiteから涼花みなせの作品情報を取得し、Firestoreに保存する関数（Pub/Sub向け）
 */
export const fetchDLsiteWorks = async (event: CloudEvent<PubsubMessage>): Promise<void> => {
	logger.info("fetchDLsiteWorks 関数を開始しました (GCFv2 CloudEvent Handler)");

	try {
		logger.info("Pub/Subトリガーからの実行を検出しました");
		const message = event.data;

		if (!message) {
			logger.error("CloudEventデータが不足しています", { event });
			return;
		}

		// 属性情報の処理
		if (message.attributes) {
			logger.info("受信した属性情報:", message.attributes);
		}

		// Base64エンコードされたデータがあれば復号
		if (message.data) {
			try {
				const decodedData = Buffer.from(message.data, "base64").toString("utf-8");
				logger.info("デコードされたメッセージデータ:", {
					message: decodedData,
				});
			} catch (err) {
				logger.error("Base64メッセージデータのデコードに失敗しました:", err);
				return;
			}
		}

		// 共通のロジックを実行
		const result = await fetchDLsiteWorksLogic();

		if (result.error) {
			logger.warn(`DLsite作品取得処理でエラーが発生しました: ${result.error}`);
		} else {
			logger.info(`DLsite作品取得処理が正常に完了しました。取得した作品数: ${result.workCount}件`);
		}

		logger.info("fetchDLsiteWorks 関数の処理を完了しました");
		return;
	} catch (error: unknown) {
		logger.error("fetchDLsiteWorks 関数で例外が発生しました:", error);

		// エラー状態を記録
		try {
			await updateMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("エラー状態の記録に失敗しました:", updateError);
		}
	}
};
