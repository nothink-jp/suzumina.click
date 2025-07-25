/**
 * Cloud Functions用フィーチャーフラグ設定
 */

import * as logger from "../shared/logger";

/**
 * Entity V2が有効かどうかを判定
 *
 * @returns Entity V2が有効な場合true
 */
export function isEntityV2Enabled(): boolean {
	// 環境変数から読み取り
	const enabled = process.env.ENABLE_ENTITY_V2 === "true";

	// Cloud Functionsのログに出力
	if (enabled) {
		logger.info("Entity V2 is enabled in Cloud Functions");
	}

	return enabled;
}
