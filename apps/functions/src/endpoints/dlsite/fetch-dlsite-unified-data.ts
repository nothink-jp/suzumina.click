/**
 * DLsite 統合データ収集エンドポイント（薄いハンドラ）
 *
 * CloudEvent の unwrap（mode 判定）→ 重複配信の判定 → オーケストレータ呼び出し → 結果ログのみを担う。
 * 本処理は run-unified-data-collection.ts の `runUnifiedDataCollection`。
 *
 * 起動の経路は 2 つある。どちらも `runUnifiedDataCollectionWithReport` を通るので、開始・完了のログ
 * （監視の契約）は同じ形で出る:
 * - Functions: `fetchDLsiteUnifiedData`（CloudEvent。このファイル）
 * - Cloud Run Jobs: `jobs/run-job.ts`（イベント無し。SPR-415）
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { decodePubsubMode, type MessagePublishedData } from "../../shared/pubsub-utils";
import { claimRunEventFailOpen } from "../../shared/run-metadata";
import { unifiedRunEventClaim, updateUnifiedMetadata } from "./collection-metadata";
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
 * 「統合データ収集開始」はログベースメトリクス `dlsite_run_started` が数える。文言とキーを変えない。
 *
 * @param params.mode `WEEKLY_FULL_SWEEP_MODE` なら週次フルスイープ。それ以外・undefined は通常 run
 * @param params.trigger 起動元を識別するための情報（開始ログにそのまま載る）
 */
export async function runUnifiedDataCollectionWithReport(params: {
	mode: string | undefined;
	trigger: Record<string, unknown>;
}): Promise<boolean> {
	const { mode, trigger } = params;
	const isWeeklyFullSweep = mode === WEEKLY_FULL_SWEEP_MODE;

	try {
		logger.info("統合データ収集開始", {
			...trigger,
			mode,
			週次フルスイープ: isWeeklyFullSweep,
			timestamp: new Date().toISOString(),
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		});

		const result = await runUnifiedDataCollection(isWeeklyFullSweep);

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
