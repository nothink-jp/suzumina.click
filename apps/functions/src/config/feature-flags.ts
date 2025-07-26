/**
 * Cloud Functions用フィーチャーフラグ設定
 */

import * as logger from "../shared/logger";

/**
 * Entityが有効かどうかを判定
 *
 * @returns Entityが有効な場合true
 */
export function isEntityEnabled(): boolean {
	// 環境変数から読み取り
	const enabled = process.env.ENABLE_ENTITY === "true";

	// Cloud Functionsのログに出力
	if (enabled) {
		logger.info("Entity is enabled in Cloud Functions");
	}

	return enabled;
}
