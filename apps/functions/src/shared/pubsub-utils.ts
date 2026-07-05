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
 * Pub/SubメッセージのPubsubMessage型定義
 */
export interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
}

/**
 * Pub/Subペイロードから`mode`を取り出す。
 * デコード失敗時は安全側（modeなし＝通常run）にフォールバックする。
 */
export function decodePubsubMode(message: PubsubMessage | undefined): string | undefined {
	if (!message?.data) {
		return undefined;
	}
	try {
		const decoded = Buffer.from(message.data, "base64").toString("utf-8");
		const parsed = JSON.parse(decoded) as { mode?: unknown };
		return typeof parsed.mode === "string" ? parsed.mode : undefined;
	} catch (err) {
		logger.warn("Pub/Subペイロードのデコードに失敗（modeなしとして通常runを続行します）", {
			error: err instanceof Error ? err.message : String(err),
		});
		return undefined;
	}
}
