/**
 * DLsite 統合データ収集: オーケストレータ（この関数群が run の本処理）
 *
 * サイクル解決（継続 or 新規・due-set 計算・fast-lane 並べ替え）→ バッチループ →
 * 完了処理 → creator recompute drain の流れを組み立てる。
 * ハンドラ（fetch-dlsite-unified-data.ts）から `runUnifiedDataCollection` が呼ばれる。
 */

import type { CollectionMetadata, WorkDocument } from "@suzumina.click/shared-types";
import { Timestamp } from "../../infrastructure/database/firestore";
import { recomputeCreatorStats } from "../../services/dlsite/creator-firestore";
import {
	resetCreatorRecomputeQueue,
	takeQueuedCreators,
} from "../../services/dlsite/creator-recompute-queue";
import { getExistingWorksMap } from "../../services/dlsite/dlsite-firestore";
import {
	getDlsiteReadMetrics,
	resetDlsiteReadMetrics,
} from "../../services/dlsite/dlsite-read-metrics";
import { collectWorkIdsForProduction } from "../../services/dlsite/work-id-collector";
import { orderNewWorksFirst } from "../../services/dlsite/work-ordering";
import {
	classifyAndFilterStableTier,
	classifyWorkTiers,
	getStableCandidateIds,
	type TieredWorkIds,
	toDueWorkIds,
} from "../../services/dlsite/work-tiering";
import { bulkCheckPriceHistoryExistsToday, getJSTDate } from "../../services/price-history";
import { chunkArray } from "../../shared/array-utils";
import * as logger from "../../shared/logger";
import {
	finalizeCompletedProcessing,
	getContinuationInfo,
	getOrCreateUnifiedMetadata,
	initializeNewBatchProcessing,
	updateUnifiedMetadata,
} from "./collection-metadata";
import {
	BATCH_SIZE,
	type BatchProcessingInfo,
	MAX_EXECUTION_TIME,
	processBatch,
	type UnifiedFetchResult,
} from "./process-batch";

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
export async function runUnifiedDataCollection(
	forceFullSweep = false,
): Promise<UnifiedFetchResult> {
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
