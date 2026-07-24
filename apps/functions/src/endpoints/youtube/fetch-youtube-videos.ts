/**
 * YouTube 動画取得エンドポイント（薄いハンドラ）
 *
 * CloudEvent の unwrap（mode 判定）→ オーケストレータ呼び出し → 結果ログのみを担う。
 * 本処理は run-video-fetch.ts の `fetchYouTubeVideosLogic`。
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import * as logger from "../../shared/logger";
import { decodePubsubMode, type MessagePublishedData } from "../../shared/pubsub-utils";
import { updateMetadata } from "./fetch-metadata";
import { type FetchMode, fetchYouTubeVideosLogic } from "./run-video-fetch";

/**
 * YouTubeから涼花みなせチャンネルの動画情報を取得し、Firestoreに保存する関数（Pub/Sub向け）
 *
 * @param event - Pub/SubトリガーからのCloudEvent
 * @returns Promise<void> - 非同期処理の完了を表すPromise
 */
export const fetchYouTubeVideos = async (
	event: CloudEvent<MessagePublishedData>,
): Promise<void> => {
	logger.info("fetchYouTubeVideos 関数を開始しました (GCFv2 CloudEvent Handler)");

	try {
		// CloudEvent（Pub/Sub）の場合
		logger.info("Pub/Subトリガーからの実行を検出しました");

		if (!event.data) {
			logger.error("CloudEventデータが不足しています", { event });
			return;
		}

		// SPR-230/SPR-263: ペイロードのmodeを確認し、実行モードを判定する
		const decodedMode = decodePubsubMode(event.data);
		const fetchMode: FetchMode =
			decodedMode === "weekly_full_sweep" || decodedMode === "fast_recheck"
				? decodedMode
				: "normal";
		if (fetchMode === "weekly_full_sweep") {
			logger.info("週次フルスイープトリガーを検出しました");
		} else if (fetchMode === "fast_recheck") {
			logger.info("配信中/配信予定の高速反映（fast_recheck）トリガーを検出しました");
		}

		// 共通のロジックを実行
		const result = await fetchYouTubeVideosLogic(fetchMode);

		if (result.error) {
			logger.warn(`YouTube動画取得処理でエラーが発生しました: ${result.error}`);
		} else {
			logger.info(
				`YouTube動画取得処理が正常に完了しました。取得した動画数: ${result.videoCount}件`,
			);
		}

		logger.info("fetchYouTubeVideos 関数の処理を完了しました");
		return;
	} catch (error: unknown) {
		// 例外処理
		logger.error("fetchYouTubeVideos 関数で例外が発生しました:", error);

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
