/**
 * DLsite 統合データ収集エンドポイント（薄いハンドラ）
 *
 * CloudEvent の unwrap（mode 判定）→ 重複配信の判定 → オーケストレータ呼び出し → 結果ログのみを担う。
 * 本処理は run-unified-data-collection.ts の `runUnifiedDataCollection`。
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { decodePubsubMode, type MessagePublishedData } from "../../shared/pubsub-utils";
import { claimUnifiedRunEvent, updateUnifiedMetadata } from "./collection-metadata";
import { runUnifiedDataCollection } from "./run-unified-data-collection";

/**
 * SPR-368: event.id を記録して run を始めてよいかを返す。判定そのものが失敗したら、判定せずに true（fail-open）
 *
 * 判定の失敗で run を止めると、変更前なら走っていた run が消える（週次フルスイープなら
 * pendingFullSweep を立てる前なので、その週の分がまるごと）。throw（nack）にしないのは、
 * 「エントリポイントは catch-all で 2xx・5xx はプラットフォームの強制終了だけ」という
 * 監視の役割分担（monitoring_dlsite.tf の dlsite_function_failure・SPR-234）を崩さないため。
 */
async function claimUnifiedRunEventFailOpen(eventId: string): Promise<boolean> {
	try {
		return await claimUnifiedRunEvent(eventId);
	} catch (error) {
		logger.warn("重複配信の判定に失敗したため、判定せずに統合データ収集を実行", {
			eventId,
			error: error instanceof Error ? error.message : String(error),
		});
		return true;
	}
}

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
	const isWeeklyFullSweep = mode === "weekly_full_sweep";

	try {
		if (!(await claimUnifiedRunEventFailOpen(event.id))) {
			logger.warn("重複配信のため統合データ収集をスキップ", { eventId: event.id, mode });
			return;
		}

		logger.info("統合データ収集開始", {
			eventId: event.id,
			eventType: event.type,
			mode,
			週次フルスイープ: isWeeklyFullSweep,
			timestamp: new Date().toISOString(),
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		});

		const result = await runUnifiedDataCollection(isWeeklyFullSweep);

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
