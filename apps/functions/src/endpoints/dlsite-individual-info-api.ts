/**
 * DLsite 統合データ収集エンドポイント
 *
 * 新しいshared-types構造と薄いマッパーを使用したバージョン
 * レガシーフィールドを段階的に削除
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import type {
	CollectionMetadata,
	DLsiteApiResponse,
	WorkDocument,
} from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { recomputeCreatorStats } from "../services/dlsite/creator-firestore";
import {
	resetCreatorRecomputeQueue,
	takeQueuedCreators,
} from "../services/dlsite/creator-recompute-queue";
import { getExistingWorksMap } from "../services/dlsite/dlsite-firestore";
import {
	getDlsiteReadMetrics,
	resetDlsiteReadMetrics,
} from "../services/dlsite/dlsite-read-metrics";
import { batchFetchIndividualInfo } from "../services/dlsite/individual-info-api-client";
import {
	type ProcessingResult,
	processBatchUnifiedDLsiteData,
} from "../services/dlsite/unified-data-processor";
import { collectWorkIdsForProduction } from "../services/dlsite/work-id-collector";
import { orderNewWorksFirst } from "../services/dlsite/work-ordering";
import {
	classifyAndFilterStableTier,
	classifyWorkTiers,
	getStableCandidateIds,
	type TieredWorkIds,
	toDueWorkIds,
} from "../services/dlsite/work-tiering";
import { bulkCheckPriceHistoryExistsToday, getJSTDate } from "../services/price-history";
import { chunkArray } from "../shared/array-utils";
import { withClearedUndefined } from "../shared/firestore-write";
import * as logger from "../shared/logger";
import { decodePubsubMode, type MessagePublishedData } from "../shared/pubsub-utils";

/**
 * SPR-229 Stage②: ティア差分によるdue-setフィルタの有効/無効フラグ。
 * 緊急時はこの環境変数をfalseにして再デプロイするだけで旧挙動（全件取得）に戻せる
 * （Firestoreスキーマ変更を伴わないためロールバックの障害はない）。
 * 呼び出し時に都度読む（モジュール読み込み時点で固定しない）ことで、テストから
 * `process.env`を切り替えて両分岐を検証できるようにする。
 */
function isTierFilteringEnabled(): boolean {
	return process.env.DLSITE_TIER_FILTERING_ENABLED !== "false";
}

// 統合メタデータ保存用の定数
const UNIFIED_METADATA_DOC_ID = "unified_data_collection_metadata";
const METADATA_COLLECTION = "dlsiteMetadata";

// バッチ処理設定
const MAX_CONCURRENT_API_REQUESTS = 5; // 6 → 3 → 5（バッチ処理を効率化: 50件を10回の並列処理で実行）
const API_REQUEST_DELAY = 400;
const BATCH_SIZE = 50; // 100 → 50に削減（エラー率低下とタイムアウト回避）
const MAX_EXECUTION_TIME = 270000; // 4.5分（Cloud Functions 5分タイムアウトより短く設定）

// Note: CollectionMetadata type is now imported from @suzumina.click/shared-types

/**
 * 統合処理結果の型定義
 */
interface UnifiedFetchResult {
	workCount: number;
	apiCallCount: number;
	basicDataUpdated: number;
	error?: string;
	unificationComplete?: boolean;
}

/**
 * バッチ処理情報の型定義
 */
interface BatchProcessingInfo {
	batchNumber: number;
	totalBatches: number;
	workIds: string[];
	startTime: Timestamp;
	existingWorksMap?: Map<string, WorkDocument>;
	/** SPR-229: 週次フルスイープ時、通常runならstableとしてスキップされていたはずの作品ID（取りこぼし検知用） */
	wouldSkipStableIds?: Set<string>;
}

/**
 * 統合データ収集メタデータの取得または初期化
 */
async function getOrCreateUnifiedMetadata(): Promise<CollectionMetadata> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
	const doc = await metadataRef.get();

	if (doc.exists) {
		return doc.data() as CollectionMetadata;
	}

	const initialMetadata: CollectionMetadata = {
		lastFetchedAt: Timestamp.now(),
		isInProgress: false,
		unifiedSystemStarted: Timestamp.now(),
		migrationVersion: "v2",
	};

	await metadataRef.set(initialMetadata);
	return initialMetadata;
}

/**
 * 統合データ収集メタデータの更新
 *
 * undefined フィールドは FieldValue.delete() へ変換してから書き込む。
 * ignoreUndefinedProperties 環境では undefined がスキップされ旧値が残る（sticky）ため、
 * メタデータをクリア可能にする（`withClearedUndefined` 参照）。
 */
async function updateUnifiedMetadata(update: Partial<CollectionMetadata>): Promise<void> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(UNIFIED_METADATA_DOC_ID);
	await metadataRef.update(withClearedUndefined(update));
}

/**
 * APIレスポンスがない場合のエラーレスポンスを作成
 */
function createNoResponseResult(workIdsLength: number): UnifiedFetchResult {
	return {
		workCount: 0,
		apiCallCount: workIdsLength,
		basicDataUpdated: 0,
		error: "APIレスポンスなし",
	};
}

/**
 * 成功した処理結果をカウント
 */
function countSuccessfulUpdates(result: ProcessingResult) {
	if (!result.success || !result.updates) {
		return { work: 0, circle: 0, creator: 0, priceHistory: 0 };
	}

	return {
		work: result.updates.work ? 1 : 0,
		circle: result.updates.circle ? 1 : 0,
		creator: result.updates.creators ? 1 : 0,
		priceHistory: result.updates.priceHistory ? 1 : 0,
	};
}

/**
 * 処理結果を集計
 */
function aggregateProcessingResults(processingResults: ProcessingResult[]): {
	workUpdated: number;
	circleUpdated: number;
	creatorUpdated: number;
	priceHistoryUpdated: number;
	errors: string[];
} {
	let workUpdated = 0;
	let circleUpdated = 0;
	let creatorUpdated = 0;
	let priceHistoryUpdated = 0;
	const errors: string[] = [];

	for (const result of processingResults) {
		const counts = countSuccessfulUpdates(result);
		workUpdated += counts.work;
		circleUpdated += counts.circle;
		creatorUpdated += counts.creator;
		priceHistoryUpdated += counts.priceHistory;

		if (result.errors?.length > 0) {
			errors.push(...result.errors);
		}
	}

	return {
		workUpdated,
		circleUpdated,
		creatorUpdated,
		priceHistoryUpdated,
		errors,
	};
}

/**
 * バッチ処理結果をUnifiedFetchResult形式に変換
 */
function createBatchResult(
	aggregatedResults: {
		workUpdated: number;
		circleUpdated: number;
		creatorUpdated: number;
		errors: string[];
	},
	workIdsLength: number,
): UnifiedFetchResult {
	return {
		workCount: aggregatedResults.workUpdated,
		apiCallCount: workIdsLength,
		basicDataUpdated: aggregatedResults.workUpdated,
		unificationComplete: aggregatedResults.errors.length === 0,
	};
}

/**
 * API呼び出しの失敗をログ出力
 */
function logApiFailures(batchNumber: number, failedWorkIds: string[]): void {
	if (failedWorkIds.length > 0) {
		logger.warn(`バッチ ${batchNumber}: ${failedWorkIds.length}件の取得失敗`);
		logger.debug(
			`失敗ID一覧: ${failedWorkIds.slice(0, 10).join(", ")}${failedWorkIds.length > 10 ? "..." : ""}`,
		);
	}
}

/**
 * 価格履歴の保存状況をデバッグログ出力
 */
function logPriceHistoryDebug(
	batchNumber: number,
	priceHistoryUpdated: number,
	apiResponses: DLsiteApiResponse[],
	existingWorksMap?: Map<string, WorkDocument>,
): void {
	if (priceHistoryUpdated === 0 && apiResponses.length > 0) {
		logger.warn(`[DEBUG] バッチ ${batchNumber}: 価格履歴が1件も保存されませんでした`);
		logger.warn(`[DEBUG] 現在時刻: ${new Date().toISOString()}`);
		logger.warn(
			`[DEBUG] JST時刻: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
		);
		// 既存作品の状態を確認
		const sampleWorkId = apiResponses[0]?.workno;
		if (sampleWorkId && existingWorksMap) {
			const existingWork = existingWorksMap.get(sampleWorkId);
			logger.warn(
				`[DEBUG] サンプル作品 ${sampleWorkId} の既存データ: ${existingWork ? "あり" : "なし"}`,
			);
		}
	}
}

/**
 * バッチ処理の結果をログ出力
 */
function logBatchComplete(
	batchNumber: number,
	workIdsLength: number,
	apiDataMapSize: number,
	aggregatedResults: ReturnType<typeof aggregateProcessingResults>,
): void {
	logger.info(`バッチ ${batchNumber}: 統合処理完了`, {
		入力: workIdsLength,
		API成功: apiDataMapSize,
		Work更新: aggregatedResults.workUpdated,
		Circle更新: aggregatedResults.circleUpdated,
		Creator更新: aggregatedResults.creatorUpdated,
		価格履歴: aggregatedResults.priceHistoryUpdated,
		エラー数: aggregatedResults.errors.length,
	});
}

/**
 * SPR-229: 週次フルスイープの取りこぼし検知ログ
 *
 * `wouldSkipStableIds`（通常runならstableとしてスキップされていたはずの作品）のうち、
 * 実際にWorkの変化が検出された件数を出す。0件が理想（stableの90日窓が妥当であることの裏付け）。
 * 非0が続く場合はStage③で`VOLATILE_RELEASE_WINDOW_DAYS`の見直しを検討する。
 */
function logFullSweepMissedChanges(
	batchNumber: number,
	processingResults: ProcessingResult[],
	wouldSkipStableIds: Set<string> | undefined,
): void {
	if (!wouldSkipStableIds || wouldSkipStableIds.size === 0) {
		return;
	}

	const targeted = processingResults.filter((r) => wouldSkipStableIds.has(r.workId));
	const missed = targeted.filter((r) => r.updates.work);

	logger.info(`バッチ ${batchNumber}: 週次フルスイープ取りこぼし検知`, {
		stable想定件数: targeted.length,
		変化検出件数: missed.length,
		...(missed.length > 0 && { 変化検出workIds: missed.map((r) => r.workId) }),
	});
}

/**
 * バッチ処理実行
 */
async function processBatch(batchInfo: BatchProcessingInfo): Promise<UnifiedFetchResult> {
	const { batchNumber, totalBatches, workIds, existingWorksMap, wouldSkipStableIds } = batchInfo;

	logger.info(`バッチ ${batchNumber}/${totalBatches} 処理開始: ${workIds.length}件`);

	try {
		// 1. Individual Info API 呼び出し（バッチ）
		const { results: apiDataMap, failedWorkIds } = await batchFetchIndividualInfo(workIds, {
			maxConcurrent: MAX_CONCURRENT_API_REQUESTS,
			batchDelay: API_REQUEST_DELAY,
		});

		if (apiDataMap.size === 0) {
			logger.warn(`バッチ ${batchNumber}: APIレスポンスなし`);
			return createNoResponseResult(workIds.length);
		}

		// 失敗作品のログ
		logApiFailures(batchNumber, failedWorkIds);

		const apiResponses = Array.from(apiDataMap.values());

		// デバッグ: API取得数とデータ内容を確認
		logger.info(`[DEBUG] バッチ ${batchNumber}: API取得成功数=${apiResponses.length}`);
		if (apiResponses.length > 0 && apiResponses[0]) {
			logger.info(`[DEBUG] サンプルworkno: ${apiResponses[0].workno}`);
		}

		// 2. 新しい統合処理を使用
		const processingResults = await processBatchUnifiedDLsiteData(apiResponses, {
			skipPriceHistory: false, // 価格履歴も含めて全て更新
			forceUpdate: false, // 差分チェックあり
			existingWorksMap, // 既存作品マップを渡す
		});

		// 3. 結果の集計
		const aggregatedResults = aggregateProcessingResults(processingResults);

		// デバッグ: 価格履歴保存の詳細
		logPriceHistoryDebug(
			batchNumber,
			aggregatedResults.priceHistoryUpdated,
			apiResponses,
			existingWorksMap,
		);

		// ログ出力
		logBatchComplete(batchNumber, workIds.length, apiDataMap.size, aggregatedResults);
		logFullSweepMissedChanges(batchNumber, processingResults, wouldSkipStableIds);

		return createBatchResult(aggregatedResults, workIds.length);
	} catch (error) {
		logger.error(`バッチ ${batchNumber} 処理エラー:`, { error });
		return {
			workCount: 0,
			apiCallCount: workIds.length,
			basicDataUpdated: 0,
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * バッチ処理の継続情報を取得
 */
function getContinuationInfo(
	metadata: CollectionMetadata,
): { isContinuation: true; allWorkIds: string[]; startBatch: number } | { isContinuation: false } {
	if (
		metadata.batchProcessingMode &&
		metadata.allWorkIds &&
		metadata.currentBatch !== undefined &&
		metadata.totalBatches !== undefined
	) {
		// currentBatchがtotalBatchesに達している場合は新規処理として扱う
		if ((metadata.currentBatch ?? 0) >= metadata.totalBatches) {
			logger.info("前回の処理は完了済み。新規処理として開始します", {
				currentBatch: metadata.currentBatch,
				totalBatches: metadata.totalBatches,
			});
			return { isContinuation: false as const };
		}

		logger.info("バッチ処理を継続します", {
			currentBatch: metadata.currentBatch,
			totalBatches: metadata.totalBatches,
			allWorkIdsLength: metadata.allWorkIds?.length || 0,
		});

		return {
			isContinuation: true as const,
			allWorkIds: metadata.allWorkIds,
			startBatch: metadata.currentBatch,
		};
	}

	return { isContinuation: false as const };
}

/**
 * 新規バッチ処理を初期化
 *
 * @param tierBreakdown SPR-229: このサイクルのティア別内訳（観測用。省略時=ティアリング無効）
 * @param isFullSweepCycle SPR-229: 週次フルスイープ実行かどうか
 * @param fullSweepWouldSkipWorkIds SPR-229: 週次フルスイープ時、通常runならスキップされていた作品ID（取りこぼし検知用）
 */
async function initializeNewBatchProcessing(
	allWorkIds: string[],
	batches: string[][],
	tierBreakdown?: CollectionMetadata["tierBreakdown"],
	isFullSweepCycle = false,
	fullSweepWouldSkipWorkIds?: string[],
): Promise<void> {
	logger.info(
		`新規バッチ処理開始: 総作品数=${allWorkIds.length}, バッチ数=${batches.length}, バッチサイズ=${BATCH_SIZE}`,
	);
	logger.info(
		`処理時間制限: ${MAX_EXECUTION_TIME / 1000}秒, 予想処理時間: ${batches.length * 30}秒（30秒/バッチ）`,
	);

	await updateUnifiedMetadata({
		isInProgress: true,
		batchProcessingMode: true,
		allWorkIds,
		totalBatches: batches.length,
		currentBatch: 0,
		totalWorks: allWorkIds.length,
		processedWorks: 0,
		basicDataUpdated: 0,
		completedBatches: [],
		lastError: undefined,
		currentBatchStartTime: Timestamp.now(),
		migrationVersion: "v2",
		tierBreakdown,
		isFullSweepCycle,
		fullSweepWouldSkipWorkIds: isFullSweepCycle ? fullSweepWouldSkipWorkIds : undefined,
		// SPR-229: 新規サイクル開始時点で pending 状態は解消済み（effectiveFullSweep に
		// 反映済み、または今回対象外）のため必ずクリアする。
		pendingFullSweep: undefined,
	});
}

/**
 * SPR-229 Stage②: ティア差分に基づき、この run で実際に取得すべき作品ID（due-set）を計算する
 *
 * stable ティア（変化の少ない旧作）は当日分 priceHistory が存在する場合のみスキップする。
 * `DLSITE_TIER_FILTERING_ENABLED=false` または `forceFullSweep=true`（週次フルスイープ）の
 * 場合はティア差分を無視して全件を対象にする。
 *
 * read総数について: stable候補に対する`priceHistory/{today}`存在確認は、従来
 * `savePriceHistory`内で毎run・全作品に個別`get()`として発生していたread（重複防止チェック）を
 * 前段でバルク`getAll()`にまとめて行うもの。**stable-skip**作品（多数派）はread総数が実質不変
 * （後段の個別readが丸ごと不要になる代わりに前段のバルクreadが乗るだけ）。一方
 * **stable-due**作品（当日分がまだ無く実際に取得する少数派）は、前段のバルクreadに加えて
 * `savePriceHistory`側の個別重複チェックも従来通り実行されるため、その件数分だけreadが純増する
 * （レビュー指摘: 「新規readは発生しない」は無条件には成立しない。stable-dueは通常少数のため実害は小さい）。
 */
export async function computeDueWorkIds(
	currentWorkIds: string[],
	existingWorksMap: Map<string, WorkDocument>,
	forceFullSweep: boolean,
): Promise<{ dueWorkIds: string[]; tiered: TieredWorkIds | null }> {
	if (!isTierFilteringEnabled()) {
		logger.info("ティア差分をスキップして全件を対象にします", {
			理由: "DLSITE_TIER_FILTERING_ENABLED=false",
			対象数: currentWorkIds.length,
		});
		return { dueWorkIds: currentWorkIds, tiered: null };
	}

	// 週次フルスイープでも classifyAndFilterStableTier 自体は実行する（取りこぼし検知のため
	// stable想定の集合が必要）。差はdue-setに反映するかどうかのみ（下記）。
	// ティア分類は classifyWorkTiers で1回だけ行い、getStableCandidateIds /
	// classifyAndFilterStableTier の両方で結果を再利用する（同じ作品を2回分類しない）。
	const today = new Date();
	const tiers = classifyWorkTiers(currentWorkIds, existingWorksMap, today);
	const stableCandidateIds = getStableCandidateIds(currentWorkIds, tiers);
	const priceHistoryTodayExists = await bulkCheckPriceHistoryExistsToday(
		stableCandidateIds,
		getJSTDate(),
	);
	const tiered = classifyAndFilterStableTier(currentWorkIds, tiers, priceHistoryTodayExists);

	logger.info("ティア差分due-set計算完了(SPR-229 Stage②)", {
		対象総数: currentWorkIds.length,
		new: tiered.newIds.length,
		volatile: tiered.volatileIds.length,
		stable_due: tiered.stableDueIds.length,
		stable_skip: tiered.stableSkippedIds.length,
	});

	if (forceFullSweep) {
		logger.info(
			"週次フルスイープ: due-setはティア差分を無視して全件にします（取りこぼし検知のためstable分類は維持）",
			{
				対象数: currentWorkIds.length,
				stable_would_skip: tiered.stableSkippedIds.length,
			},
		);
		return { dueWorkIds: currentWorkIds, tiered };
	}

	return { dueWorkIds: toDueWorkIds(tiered), tiered };
}

/**
 * バッチループ処理を実行
 */
async function executeBatchLoop(
	batches: string[][],
	startBatch: number,
	startTime: number,
	metadata: CollectionMetadata,
	existingWorksMap?: Map<string, WorkDocument>,
	wouldSkipStableIds?: Set<string>,
): Promise<{
	totalUpdated: number;
	totalApiCalls: number;
	completedBatches: number[];
	allBatchesCompleted: boolean;
}> {
	let totalUpdated = 0;
	let totalApiCalls = 0;
	let allBatchesCompleted = true;
	const completedBatches: number[] = [];

	logger.info(
		`executeBatchLoop開始: startBatch=${startBatch}, batches.length=${batches.length}, completedBatches=${completedBatches.length}`,
	);

	// forループが実行されるかチェック
	if (startBatch >= batches.length) {
		logger.warn(
			`バッチ処理スキップ: startBatch(${startBatch}) >= batches.length(${batches.length})`,
		);
		logger.warn("これは全てのバッチが既に処理済みであることを意味します");
	}

	for (let i = startBatch; i < batches.length; i++) {
		// 実行時間チェック
		if (Date.now() - startTime > MAX_EXECUTION_TIME) {
			logger.info(`実行時間制限に達しました。バッチ ${i}/${batches.length} で中断`);
			allBatchesCompleted = false;

			await updateUnifiedMetadata({
				currentBatch: i,
				processedWorks: i * BATCH_SIZE,
				basicDataUpdated: (metadata.basicDataUpdated || 0) + totalUpdated,
				lastError: "実行時間制限により中断",
			});
			break;
		}

		// バッチ処理実行
		const batchInfo: BatchProcessingInfo = {
			batchNumber: i + 1,
			totalBatches: batches.length,
			workIds: batches[i] || [],
			startTime: Timestamp.now(),
			existingWorksMap,
			wouldSkipStableIds,
		};

		const result = await processBatch(batchInfo);
		totalUpdated += result.basicDataUpdated;
		totalApiCalls += result.apiCallCount;
		completedBatches.push(i);

		// メタデータ更新
		await updateUnifiedMetadata({
			currentBatch: i + 1,
			processedWorks: (i + 1) * BATCH_SIZE,
			basicDataUpdated: (metadata.basicDataUpdated || 0) + totalUpdated,
			completedBatches,
			lastError: result.error,
			currentBatchStartTime: Timestamp.now(),
		});

		// バッチ間の遅延
		if (i < batches.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	return { totalUpdated, totalApiCalls, completedBatches, allBatchesCompleted };
}

/**
 * 処理完了時のメタデータ更新
 */
async function finalizeCompletedProcessing(
	allWorkIds: string[],
	totalUpdated: number,
): Promise<void> {
	logger.info("全バッチ処理完了", {
		totalWorks: allWorkIds.length,
		totalUpdated,
	});

	await updateUnifiedMetadata({
		isInProgress: false,
		lastSuccessfulCompleteFetch: Timestamp.now(),
		lastFetchedAt: Timestamp.now(),
		batchProcessingMode: false,
		currentBatch: undefined,
		totalBatches: undefined,
		allWorkIds: undefined,
		completedBatches: undefined,
		// SPR-229: サイクル終了時にティア/週次フルスイープ関連の一時フィールドをクリアする
		tierBreakdown: undefined,
		isFullSweepCycle: undefined,
		fullSweepWouldSkipWorkIds: undefined,
	});
}

/**
 * 新規バッチ処理の準備
 *
 * SPR-225 Stage 3a: 既存 works を読み、新作（`works` 不在）をサイクル先頭へ並べ替える。
 * 最新作は scrape 順で末尾に来るため、並べ替えないと末尾バッチ（タイムアウトで次 tick 待ち）
 * になり「登録直後にページに出ない」原因になる。先頭へ置くことで run がタイムアウトしても
 * 最初のバッチで作成される。取得した `existingWorksMap` は後段の skip 判定で再利用する
 * （二重読みを避ける）。
 *
 * SPR-229 Stage②: 並べ替えの前に `computeDueWorkIds` でティア差分の due-set 絞り込みを行う。
 * stable ティア（当日分 priceHistory あり）はこの run の対象から除外される。
 *
 * @param forceFullSweep 週次フルスイープ実行時 true（ティア差分を無視して全件を対象にする）
 */
async function prepareNewBatchProcessing(
	metadata: CollectionMetadata,
	forceFullSweep = false,
): Promise<{
	allWorkIds: string[];
	batches: string[][];
	existingWorksMap: Map<string, WorkDocument>;
	tiered: TieredWorkIds | null;
} | null> {
	// scrape 失敗時は stale な一覧でサイクルを回すより run を中断する方が安全。
	// 次の定期実行(2h)が自然なリトライになる（SPR-232: region 等価性の確認を経て asset fallback を撤去）。
	let currentWorkIds: string[];
	try {
		logger.info("作品ID収集を開始します...");
		currentWorkIds = await collectWorkIdsForProduction();
		logger.info(`作品ID収集完了: ${currentWorkIds.length}件`);
	} catch (error) {
		logger.error("作品ID収集エラー: この run を中断します（次の定期実行でリトライ）", {
			error: error instanceof Error ? error.message : String(error),
			errorType: error instanceof Error ? error.name : "Unknown",
		});
		return null;
	}

	// 作品数が変わっているかチェック
	const isWorkCountChanged =
		metadata.allWorkIds && metadata.allWorkIds.length !== currentWorkIds.length;

	if (isWorkCountChanged && metadata.allWorkIds) {
		logger.info("作品数が変更されたため新規処理として開始します", {
			前回の作品数: metadata.allWorkIds.length,
			現在の作品数: currentWorkIds.length,
		});
	}

	if (currentWorkIds.length === 0) {
		logger.error("収集対象の作品IDが見つかりません");
		return null;
	}

	// 既存 works を取得し、ティア差分でdue-setを絞り込んでから新作を先頭へ並べ替える（fast-lane）。
	const existingWorksMap = await getExistingWorksMap(currentWorkIds);
	const { dueWorkIds, tiered } = await computeDueWorkIds(
		currentWorkIds,
		existingWorksMap,
		forceFullSweep,
	);
	const { ordered: allWorkIds, newCount } = orderNewWorksFirst(dueWorkIds, existingWorksMap);
	logger.info("新規バッチ: 新作を先頭へ並べ替え（SPR-225 Stage 3a・fast-lane）", {
		scrape総数: currentWorkIds.length,
		due対象数: dueWorkIds.length,
		新作: newCount,
		既存: dueWorkIds.length - newCount,
	});

	const batches = chunkArray(allWorkIds, BATCH_SIZE);
	const tierBreakdown = tiered
		? {
				newCount: tiered.newIds.length,
				volatileCount: tiered.volatileIds.length,
				stableDueCount: tiered.stableDueIds.length,
				stableSkippedCount: tiered.stableSkippedIds.length,
			}
		: undefined;
	await initializeNewBatchProcessing(
		allWorkIds,
		batches,
		tierBreakdown,
		forceFullSweep,
		tiered?.stableSkippedIds,
	);

	return { allWorkIds, batches, existingWorksMap, tiered };
}

/**
 * SPR-225 Stage 1: この run で stat 変化のあった creator を 1 回ずつ recompute する。
 *
 * `updateCreatorWorkMapping` が per-work で積んだ変更 creator を run 末尾で dedup 取り出しし、
 * creator ごと 1 回だけ `recomputeCreatorStats`（全作品スキャン）を実行する。完走・中断・例外の
 * いずれの経路でも呼ばれる前提（finally）。recompute 失敗は集計の denormalize ズレに留まり、
 * 週次 `checkDataIntegrity` でも修復されるためログのみで握る。
 */
async function recomputeQueuedCreators(): Promise<void> {
	const creatorIds = takeQueuedCreators();
	if (creatorIds.length === 0) {
		return;
	}

	const results = await Promise.allSettled(
		creatorIds.map((creatorId) => recomputeCreatorStats(creatorId)),
	);
	// 失敗時はどの creator が denormalize ズレのまま残ったかを ID で残す
	// （デプロイ直後の観測で追えるように。週次 cron で最終的に修復される）。
	const failedIds = results
		.map((r, i) => (r.status === "rejected" ? creatorIds[i] : undefined))
		.filter((id): id is string => id !== undefined);
	logger.info("creator集計recompute(SPR-225 Stage1・dedup後)", {
		対象creator数: creatorIds.length,
		失敗: failedIds.length,
		...(failedIds.length > 0 && { 失敗creatorIds: failedIds }),
	});
}

/**
 * この run が処理すべきサイクル情報（継続 or 新規）
 */
export interface CycleInfo {
	allWorkIds: string[];
	batches: string[][];
	startBatch: number;
	/** 新規処理時は prepareNewBatchProcessing で取得済みの既存マップ（二重読み回避、継続時は undefined） */
	preparedExistingWorksMap?: Map<string, WorkDocument>;
	/** SPR-229: 週次フルスイープの取りこぼし検知に使う「stable想定」作品ID集合 */
	wouldSkipStableIds?: Set<string>;
}

/**
 * 継続処理かどうかに応じて、この run が処理すべき作品ID/バッチ/取りこぼし検知集合を組み立てる
 *
 * SPR-229: due-set/週次モードはサイクル開始時（新規処理）に確定済みのため、継続処理では
 * 再判定しない。forceFullSweep が渡されていても前サイクルが tiered モードで継続中なら
 * 今回は反映されない。ただしその場合 `pendingFullSweep` をメタデータに記録し、次に新規
 * サイクルが始まるタイミング（継続中サイクル完了後の次run）で強制フルスイープとして
 * 拾い直す（レビュー指摘対応: 継続中サイクルとの衝突で週次フルスイープがその週丸ごと
 * 無音で消えるのを防ぐ。1週間まるまる遅延はしない）。
 */
export async function resolveCycleInfo(
	metadata: CollectionMetadata,
	continuationInfo: ReturnType<typeof getContinuationInfo>,
	forceFullSweep: boolean,
): Promise<CycleInfo | null> {
	if (continuationInfo.isContinuation === true) {
		if (forceFullSweep) {
			logger.warn(
				"週次フルスイープの発火時に前サイクルが継続中でした。pendingFullSweepを記録し次の新規サイクルで拾い直します",
			);
			await updateUnifiedMetadata({ pendingFullSweep: true });
		}
		const allWorkIds = continuationInfo.allWorkIds;
		const batches = chunkArray(allWorkIds, BATCH_SIZE);
		const startBatch = continuationInfo.startBatch;
		const wouldSkipStableIds =
			metadata.isFullSweepCycle && metadata.fullSweepWouldSkipWorkIds
				? new Set(metadata.fullSweepWouldSkipWorkIds)
				: undefined;
		logger.info(
			`継続処理詳細: allWorkIds.length=${allWorkIds.length}, batches.length=${batches.length}, startBatch=${startBatch}`,
		);
		return { allWorkIds, batches, startBatch, wouldSkipStableIds };
	}

	// 新規処理: 作品IDを収集。前サイクルが継続中で反映できなかった週次フルスイープが
	// pendingFullSweepとして残っていれば、ここで拾い直す。
	const effectiveFullSweep = forceFullSweep || metadata.pendingFullSweep === true;
	const prepared = await prepareNewBatchProcessing(metadata, effectiveFullSweep);
	if (!prepared) {
		return null;
	}
	const wouldSkipStableIds =
		effectiveFullSweep && prepared.tiered ? new Set(prepared.tiered.stableSkippedIds) : undefined;
	return {
		allWorkIds: prepared.allWorkIds,
		batches: prepared.batches,
		startBatch: 0,
		preparedExistingWorksMap: prepared.existingWorksMap,
		wouldSkipStableIds,
	};
}

/**
 * 統合データ収集処理の実行
 *
 * @param forceFullSweep SPR-229 Stage②: 週次フルスイープ実行時 true（ティア差分を無視して全件を対象にする）
 */
async function executeUnifiedDataCollection(forceFullSweep = false): Promise<UnifiedFetchResult> {
	// SPR-225 Stage 0/P0: dlsite 同期 reads の内訳をこの run の分だけ計測する（挙動は変えない）。
	resetDlsiteReadMetrics();
	// SPR-225 Stage 1: 変更 creator の recompute キューを run 開始でクリアする。
	resetCreatorRecomputeQueue();

	try {
		// メタデータから処理状態を確認
		const metadata = await getOrCreateUnifiedMetadata();

		// 継続処理かどうかを先に判定し、この run が処理すべきサイクル情報を組み立てる
		const continuationInfo = getContinuationInfo(metadata);
		const cycleInfo = await resolveCycleInfo(metadata, continuationInfo, forceFullSweep);
		if (!cycleInfo) {
			return {
				workCount: 0,
				apiCallCount: 0,
				basicDataUpdated: 0,
				error: "収集対象の作品IDが見つかりません",
			};
		}
		const { allWorkIds, batches, startBatch, preparedExistingWorksMap, wouldSkipStableIds } =
			cycleInfo;

		// この run が対象とする作品ID（継続時は残りバッチ分・新規時は全件＝startBatch=0）。
		const remainingWorkIds = batches.slice(startBatch).flat();

		// 既存 works マップ: 新規処理は prepareNewBatchProcessing で並べ替え時に取得済みのものを
		// 再利用する（二重読み回避）。残りバッチ分を改めて取得するのは継続処理のときだけ
		// （preparedExistingWorksMap が未設定なのは継続時のみ）。
		const existingWorksMap =
			preparedExistingWorksMap ?? (await getExistingWorksMap(remainingWorkIds));
		logger.info(
			`既存作品マップ取得完了: ${existingWorksMap.size}件（対象: ${remainingWorkIds.length}件）`,
		);

		// 準備完了後にタイマー開始（バッチ処理の実際の開始時点）
		const startTime = Date.now();

		// デバッグ: バッチ処理の状態を確認
		logger.info(`バッチ処理開始: batches.length=${batches.length}, startBatch=${startBatch}`);
		if (batches.length === 0) {
			logger.error("バッチ配列が空です");
		}

		// バッチ処理の実行
		const { totalUpdated, totalApiCalls, allBatchesCompleted } = await executeBatchLoop(
			batches,
			startBatch,
			startTime,
			metadata,
			existingWorksMap,
			wouldSkipStableIds,
		);

		if (allBatchesCompleted) {
			await finalizeCompletedProcessing(allWorkIds, totalUpdated);
		}

		return {
			workCount: totalUpdated,
			apiCallCount: totalApiCalls,
			basicDataUpdated: totalUpdated,
			unificationComplete: allBatchesCompleted,
		};
	} catch (error) {
		logger.error("統合データ収集エラー:", error);

		await updateUnifiedMetadata({
			isInProgress: false,
			lastError: error instanceof Error ? error.message : "不明なエラー",
			lastFetchedAt: Timestamp.now(),
		});

		return {
			workCount: 0,
			apiCallCount: 0,
			basicDataUpdated: 0,
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	} finally {
		// SPR-225 Stage 1: 変更のあった creator を run 末尾で creator ごと 1 回だけ recompute。
		// 中断/例外時も、それまでに処理済みのバッチ分は recompute される（次 run へ持ち越さない）。
		await recomputeQueuedCreators();
		// この run の dlsite 同期 reads 内訳を 1 行で出す（type=QUERY の主因を分解。worksMap /
		// creator-sync / recompute を網羅）。recompute(drain) の読み取りも計上するため recompute の
		// 後に出す。Cloud Monitoring の絞り込みキーにするため、メッセージは Stage を含めない恒久キー。
		logger.info("dlsite reads計測(run)", { ...getDlsiteReadMetrics() });
	}
}

/**
 * Cloud Functions エントリーポイント
 */
export async function fetchDLsiteUnifiedData(
	event: CloudEvent<MessagePublishedData>,
): Promise<void> {
	const mode = decodePubsubMode(event.data);
	const isWeeklyFullSweep = mode === "weekly_full_sweep";

	logger.info("統合データ収集開始", {
		eventType: event.type,
		mode,
		週次フルスイープ: isWeeklyFullSweep,
		timestamp: new Date().toISOString(),
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	});

	try {
		const result = await executeUnifiedDataCollection(isWeeklyFullSweep);

		if (result.error) {
			logger.error(`統合データ収集エラー: ${result.error}`);
		} else {
			logger.info("統合データ収集完了", {
				更新作品数: result.basicDataUpdated,
				API呼び出し数: result.apiCallCount,
				統合完了: result.unificationComplete,
			});
		}
	} catch (error) {
		logger.error("予期しないエラー:", error);

		await updateUnifiedMetadata({
			isInProgress: false,
			lastError: error instanceof Error ? error.message : "不明なエラー",
			lastFetchedAt: Timestamp.now(),
		});
	}
}
