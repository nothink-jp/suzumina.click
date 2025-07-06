import type { CloudEvent } from "@google-cloud/functions-framework";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { getDLsiteConfig } from "../infrastructure/management/config-manager";
import { generateDLsiteHeaders } from "../infrastructure/management/user-agent-manager";
import {
	fetchDLsiteAjaxResult,
	isLastPageFromPageInfo,
	validateAjaxHtmlContent,
} from "../services/dlsite/dlsite-ajax-fetcher";
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
 * 単一ページの作品データを処理
 */
async function processSinglePage(
	currentPage: number,
): Promise<{ savedCount: number; parsedCount: number; isLastPage: boolean; totalWorks?: number }> {
	logger.debug(`DLsite検索: ページ ${currentPage} を取得中...`);

	try {
		// AJAX APIから検索結果を取得
		const ajaxResult = await fetchDLsiteAjaxResult(currentPage);

		// HTMLコンテンツの妥当性検証
		if (!validateAjaxHtmlContent(ajaxResult.search_result)) {
			logger.error(`ページ ${currentPage}: 無効なHTMLコンテンツが返されました`);
			return { savedCount: 0, parsedCount: 0, isLastPage: true };
		}

		// HTMLから作品データを解析
		const parsedWorks = parseWorksFromHTML(ajaxResult.search_result);

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
					rankingHistory: undefined, // 最適化構造では別途管理
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
		if (currentPage === 1) {
			await updateMetadata({
				totalWorks: ajaxResult.page_info.count,
				currentPage: currentPage + 1,
			});
		} else {
			await updateMetadata({ currentPage: currentPage + 1 });
		}

		// AJAX APIのページング情報を使用した最終ページ判定
		const isLastPage = isLastPageFromPageInfo(ajaxResult.page_info, currentPage);

		if (isLastPage) {
			logger.info(
				`ページ ${currentPage} が最終ページです。` + `総作品数: ${ajaxResult.page_info.count}件`,
			);
		}

		return {
			savedCount,
			parsedCount: parsedWorks.length,
			isLastPage,
			totalWorks: ajaxResult.page_info.count,
		};
	} catch (error) {
		logger.error(`ページ ${currentPage} の処理中にエラーが発生しました:`, error);
		throw error;
	}
}

/**
 * DLsite作品データを取得
 */
async function fetchDLsiteWorksInternal(metadata: FetchMetadata): Promise<{
	workCount: number;
	nextPage: number | undefined;
	isComplete: boolean;
	totalWorks?: number;
}> {
	let allWorksCount = 0;
	let currentPage = metadata.currentPage || 1;
	let pageCount = 0;
	let isComplete = false;
	let totalWorks: number | undefined;

	if (currentPage > 1) {
		logger.info(`前回の続きから取得を再開します。ページ: ${currentPage}`);
	} else {
		logger.debug("新規に全作品の取得を開始します");
	}

	// ページネーションループ
	while (pageCount < MAX_PAGES_PER_EXECUTION) {
		try {
			const result = await processSinglePage(currentPage);
			allWorksCount += result.savedCount;

			// 総作品数を記録（最初のページで取得）
			if (result.totalWorks && !totalWorks) {
				totalWorks = result.totalWorks;
			}

			if (result.isLastPage) {
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
		totalWorks,
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
		logger.info("🚀 AJAX API使用: 構造化レスポンス・正確なページング情報による効率的収集");
		const { workCount, nextPage, isComplete, totalWorks } =
			await fetchDLsiteWorksInternal(metadata);

		logger.info(`取得した作品合計: ${workCount}件`);
		if (totalWorks) {
			logger.info(`📊 総作品数: ${totalWorks}件`);
		}

		// 3. メタデータを更新
		if (isComplete) {
			await updateMetadata({
				currentPage: undefined,
				lastSuccessfulCompleteFetch: Timestamp.now(),
			});
			logger.info(`全ての作品の取得が完了しました (総収集数: ${workCount}件)`);
			logger.info("✅ AJAX API移行完了: 安定性・パフォーマンスの向上を実現");
		} else if (nextPage) {
			logger.debug(`次回の実行のためにページ番号を保存: ${nextPage}`);
		}

		// 5. 処理完了を記録
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
 * Cloud Functions環境での調査情報をログ出力
 */
async function logCloudFunctionsInvestigation(): Promise<void> {
	try {
		logger.info("🔍 === Cloud Functions環境調査開始 ===");

		// 環境情報取得
		const isCloudFunctions = !!(
			process.env.FUNCTION_NAME ||
			process.env.K_SERVICE ||
			process.env.GOOGLE_CLOUD_PROJECT
		);
		const region = process.env.FUNCTION_REGION || process.env.GOOGLE_CLOUD_REGION || "unknown";

		// IPアドレス取得
		let ipAddress = "unknown";
		try {
			const ipResponse = await fetch("https://api.ipify.org?format=json");
			const ipData = (await ipResponse.json()) as { ip: string };
			ipAddress = ipData.ip;
		} catch (error) {
			logger.warn("IP取得エラー", { error });
		}

		// User-Agent情報
		const headers = generateDLsiteHeaders();

		// DLsite AJAX API調査
		let totalWorks = 0;
		let ajaxSuccess = false;
		let errorMessage = "";

		try {
			const ajaxResult = await fetchDLsiteAjaxResult(1);
			totalWorks = ajaxResult.page_info.count;
			ajaxSuccess = true;
			logger.info("📊 AJAX API調査成功");
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : "Unknown error";
			logger.warn("❌ AJAX API調査エラー", { error });
		}

		// 調査結果ログ出力
		logger.info("🌍 === Cloud Functions環境情報 ===");
		logger.info(`環境: ${isCloudFunctions ? "cloud-functions" : "local"}`);
		logger.info(`IPアドレス: ${ipAddress}`);
		logger.info(`リージョン: ${region}`);
		logger.info(`User-Agent: ${headers["User-Agent"]}`);

		logger.info("📊 === DLsiteアクセス調査結果 ===");
		logger.info(`AJAX API成功: ${ajaxSuccess}`);
		logger.info(`総作品数: ${totalWorks}件`);

		if (errorMessage) {
			logger.info(`エラー詳細: ${errorMessage}`);
		}

		// ローカル環境との比較
		const expectedLocalCount = 1471;
		if (ajaxSuccess && totalWorks > 0) {
			const difference = Math.abs(expectedLocalCount - totalWorks);
			const reductionPercentage = (
				((expectedLocalCount - totalWorks) / expectedLocalCount) *
				100
			).toFixed(1);

			logger.info("🔢 === ローカル環境との比較 ===");
			logger.info(`ローカル推定値: ${expectedLocalCount}件`);
			logger.info(`Cloud Functions: ${totalWorks}件`);
			logger.info(`差異: ${difference}件 (${reductionPercentage}%減少)`);

			// 制限分析
			const restrictions: string[] = [];
			if (Math.abs(Number(reductionPercentage)) > 10) {
				restrictions.push(`作品数に${Math.abs(Number(reductionPercentage))}%の差異`);
			}
			if (isCloudFunctions) {
				restrictions.push("Cloud Functions環境からのアクセス");
				if (!region.startsWith("asia")) {
					restrictions.push(`非アジアリージョン: ${region}`);
				}
			}
			if (ipAddress.startsWith("35.") || ipAddress.startsWith("34.")) {
				restrictions.push("Google Cloud IPレンジからのアクセス");
			}

			if (restrictions.length > 0) {
				logger.info("⚠️ === 検出された制限の可能性 ===");
				restrictions.forEach((restriction, index) => {
					logger.info(`${index + 1}. ${restriction}`);
				});
			} else {
				logger.info("✅ 明確な制限は検出されませんでした");
			}
		}

		logger.info("🔍 === Cloud Functions環境調査完了 ===");
	} catch (error) {
		logger.error("Cloud Functions環境調査エラー:", error);
	}
}

/**
 * DLsiteから涼花みなせの作品情報を取得し、Firestoreに保存する関数（Pub/Sub向け）
 */
export const fetchDLsiteWorks = async (event: CloudEvent<PubsubMessage>): Promise<void> => {
	logger.info("fetchDLsiteWorks 関数を開始しました (GCFv2 CloudEvent Handler)");

	// 🔍 Cloud Functions環境調査ログ出力
	await logCloudFunctionsInvestigation();

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
