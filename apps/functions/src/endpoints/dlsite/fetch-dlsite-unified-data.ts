/**
 * DLsite 統合データ収集エンドポイント（薄いハンドラ）
 *
 * CloudEvent の unwrap（mode 判定）→ オーケストレータ呼び出し → 結果ログのみを担う。
 * 本処理は run-unified-data-collection.ts の `runUnifiedDataCollection`。
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { decodePubsubMode, type MessagePublishedData } from "../../shared/pubsub-utils";
import { updateUnifiedMetadata } from "./collection-metadata";
import { runUnifiedDataCollection } from "./run-unified-data-collection";

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
