/**
 * Pub/Subペイロードの`mode`デコードユーティリティ
 *
 * DLsite（`fetchDLsiteUnifiedData`）とYouTube（`fetchYouTubeVideos`）双方の
 * Cloud Schedulerトリガーが、同一関数・同一トピックを週次フルスイープ等の
 * 別モードで起動するために使う共通パターン（レビュー指摘: 元は2ファイルに
 * 同一実装が複製されていた）。
 */

import * as logger from "./logger";

/**
 * Pub/Subメッセージ本体（base64エンコードされたdataとattributes）
 */
export interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
}

/**
 * GCFv2（Eventarc経由Pub/Subトリガー）のCloudEvent `data` フィールドの実形。
 *
 * メッセージ本体は `message` に一段ネストされる（google.events.cloud.pubsub.v1
 * の MessagePublishedData）。`event.data.data` を直接読む平坦形は本番では
 * 発生しない（SPR-229/230の週次フルスイープが本番で一度も発火しなかった
 * 回帰の原因。テストモックだけが平坦形で通っていた）。
 */
export interface MessagePublishedData {
	message?: PubsubMessage;
	subscription?: string;
}

/**
 * CloudEventの`data`（MessagePublishedData）からペイロードの`mode`を取り出す。
 * デコード失敗・想定外のenvelope形は安全側（modeなし＝通常run）にフォールバックするが、
 * silent fallbackはバグを隠すため（本番だけ週次フルスイープが縮退していた実績あり）
 * 必ずwarnを残す。
 */
export function decodePubsubMode(data: MessagePublishedData | undefined): string | undefined {
	if (!data) {
		return undefined;
	}
	const encoded = data.message?.data;
	if (!encoded) {
		logger.warn(
			"Pub/SubペイロードにMessagePublishedData.message.dataがありません（modeなしとして通常runを続行します）",
			{ keys: Object.keys(data) },
		);
		return undefined;
	}
	try {
		const decoded = Buffer.from(encoded, "base64").toString("utf-8");
		const parsed = JSON.parse(decoded) as { mode?: unknown };
		return typeof parsed.mode === "string" ? parsed.mode : undefined;
	} catch (err) {
		logger.warn("Pub/Subペイロードのデコードに失敗（modeなしとして通常runを続行します）", {
			error: err instanceof Error ? err.message : String(err),
		});
		return undefined;
	}
}
