/**
 * 発話文字起こしバックログのエンドポイント（薄いハンドラ・SPR-293）。
 * CloudEvent の受領 → バックログ処理 → 結果ログのみを担う。
 * 本処理は services/transcription/transcribe-backlog.ts。
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import { runTranscribeBacklog } from "../../services/transcription/transcribe-backlog";
import * as logger from "../../shared/logger";

/**
 * Cloud Functions エントリーポイント（Cloud Scheduler → Pub/Sub トリガ）。
 * チェックポイントはチャンク doc の存在＝多重起動・再実行とも安全（max-instances 1 前提）。
 */
export async function transcribeVideoBacklog(event: CloudEvent<unknown>): Promise<void> {
	logger.info("文字起こしバックログ処理を開始", { eventType: event.type });

	try {
		const result = await runTranscribeBacklog();

		// message はメトリクス契約（英語キー）: backlog 完走の監視は backlogRemaining=false を数える
		logger.info("transcribe_backlog_run", {
			scannedVideos: result.scannedVideos,
			processedChunks: result.processedChunks,
			failedChunks: result.failedChunks,
			backlogRemaining: result.backlogRemaining,
			elapsedMs: result.elapsedMs,
		});
	} catch (error) {
		logger.error("文字起こしバックログ処理エラー", { error });
		throw error;
	}
}
