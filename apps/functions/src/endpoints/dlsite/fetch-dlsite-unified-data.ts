/**
 * DLsite 統合データ収集エンドポイント（薄いハンドラ）
 *
 * CloudEvent の unwrap（mode 判定）→ 重複配信の判定 → 「実行中」の印 → オーケストレータ呼び出し → 結果ログのみを担う。
 * 本処理は run-unified-data-collection.ts の `runUnifiedDataCollection`。
 *
 * 起動の経路は 2 つある。どちらも `runUnifiedDataCollectionWithReport` を通るので、開始・完了のログは
 * 同じ `message` とキーで出る（アラートのフィルタは Functions 向けのまま＝jobs/run-job.ts の冒頭を参照）:
 * - Functions: `fetchDLsiteUnifiedData`（CloudEvent。このファイル）
 * - Cloud Run Jobs: `jobs/run-job.ts`（イベント無し。SPR-415）
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { decodePubsubMode, type MessagePublishedData } from "../../shared/pubsub-utils";
import {
	acquireRunLockFailOpen,
	claimRunEventFailOpen,
	releaseRunLock,
} from "../../shared/run-metadata";
import { unifiedRunEventClaim, unifiedRunLock, updateUnifiedMetadata } from "./collection-metadata";
import { FUNCTION_RUN_BUDGET, type RunBudget } from "./process-batch";
import { runUnifiedDataCollection } from "./run-unified-data-collection";

/**
 * Cloud Functions エントリーポイント
 *
 * 同じメッセージの重複配信（同じ event.id）では run を走らせず、正常終了（= ack）する（SPR-368）。
 * 「統合データ収集開始」は run を実際に始めたときだけ出す（ログベースメトリクス
 * `dlsite_run_started` が数える＝重複を run として数えない）。
 */
export async function fetchDLsiteUnifiedData(
	event: CloudEvent<MessagePublishedData>,
): Promise<void> {
	const mode = decodePubsubMode(event.data);

	try {
		if (!(await claimRunEventFailOpen(event.id, unifiedRunEventClaim))) {
			logger.warn("重複配信のため統合データ収集をスキップ", { eventId: event.id, mode });
			return;
		}
	} catch (error) {
		await recordUnexpectedError(error);
		return;
	}

	await runUnifiedDataCollectionWithReport({
		mode,
		trigger: { eventId: event.id, eventType: event.type },
		runId: event.id,
		budget: FUNCTION_RUN_BUDGET,
	});
}

/** Scheduler のペイロード（Functions）とジョブの引数（Jobs）が共有する、週次フルスイープの mode 値 */
export const WEEKLY_FULL_SWEEP_MODE = "weekly_full_sweep";

/**
 * 統合データ収集を 1 回走らせ、開始・完了・失敗をログに残す
 *
 * 例外は投げない（予期しないエラーはログとメタデータに記録する）。**戻り値が「この run が成功したか」**。
 * Functions のハンドラは戻り値を使わない（失敗しても ack する＝再配信させない）。Jobs は終了コードに使う。
 *
 * ほかの実行が進行中（「実行中」の印が期限内）なら、何もせずに true を返す（SPR-417）。開始ログも出さない。
 * 週次フルスイープがこれで飛ばされたときは `pendingFullSweep` を立て、次の新規サイクルが拾い直す
 * （継続中のサイクルと重なったときと同じ扱い＝`resolveCycleInfo`）。
 *
 * 「統合データ収集開始」はログベースメトリクス `dlsite_run_started` が数える。文言とキーを変えない。
 *
 * @param params.mode `WEEKLY_FULL_SWEEP_MODE` なら週次フルスイープ。それ以外・undefined は通常 run
 * @param params.trigger 起動元を識別するための情報（開始ログにそのまま載る）
 * @param params.runId この実行の識別子（印の持ち主）。Functions は event.id、Jobs は実行名
 * @param params.budget この run の予算。起動の経路で決まる（Functions / Jobs）
 */
export async function runUnifiedDataCollectionWithReport(params: {
	mode: string | undefined;
	trigger: Record<string, unknown>;
	runId: string;
	budget: RunBudget;
}): Promise<boolean> {
	const { mode, trigger, runId, budget } = params;
	const isWeeklyFullSweep = mode === WEEKLY_FULL_SWEEP_MODE;

	if (!(await acquireRunLockFailOpen(runId, budget.lockTtlMs, unifiedRunLock))) {
		logger.warn("別の実行が進行中のため統合データ収集をスキップ", { ...trigger, mode });
		return deferFullSweepIfNeeded(isWeeklyFullSweep);
	}

	try {
		logger.info("統合データ収集開始", {
			...trigger,
			mode,
			週次フルスイープ: isWeeklyFullSweep,
			timestamp: new Date().toISOString(),
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		});

		const result = await runUnifiedDataCollection(isWeeklyFullSweep, budget);

		if (result.error) {
			logger.error(`統合データ収集エラー: ${result.error}`);
			return false;
		}
		logger.info("統合データ収集完了", {
			更新作品数: result.basicDataUpdated,
			API呼び出し数: result.apiCallCount,
			統合完了: result.unificationComplete,
		});
		return true;
	} catch (error) {
		await recordUnexpectedError(error);
		return false;
	} finally {
		await releaseRunLock(runId, unifiedRunLock);
	}
}

/**
 * 印が取れずに飛ばした run が週次フルスイープなら、`pendingFullSweep` を立てる
 *
 * @returns 飛ばした run の成否。立てられなかったら false（その週のフルスイープが消えるので、失敗として残す）
 */
async function deferFullSweepIfNeeded(isWeeklyFullSweep: boolean): Promise<boolean> {
	if (!isWeeklyFullSweep) {
		return true;
	}
	try {
		await updateUnifiedMetadata({ pendingFullSweep: true });
		return true;
	} catch (error) {
		logger.error("pendingFullSweep を記録できませんでした（今週のフルスイープは実行されません）", {
			error,
		});
		return false;
	}
}

async function recordUnexpectedError(error: unknown): Promise<void> {
	logger.error("予期しないエラー:", error);

	await updateUnifiedMetadata({
		isInProgress: false,
		lastError: error instanceof Error ? error.message : "不明なエラー",
		lastFetchedAt: Timestamp.now(),
	});
}
