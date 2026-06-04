/**
 * DLsite API スキーマドリフト観測（SPR-140）
 *
 * 本番 fetchDLsiteUnifiedData は2時間毎に DLsite Individual Info API を叩く。
 * DLsite は不定期にフィールドを増減するため、既知フィールド集合（ベースライン）に
 * 無いトップレベルキーが出現したら「新フィールド（drift）」として WARN する。
 *
 * 設計方針:
 *   - Zod スキーマは必要分のみモデル化（~50/254）なので「Zod 比の未知」は常時~200件＝ノイズ。
 *     よって判定基準は Zod ではなく「観測実績のあるベースライン(KNOWN_DLSITE_API_FIELDS) ∪ Zod キー」。
 *   - 新フィールドはプロセス内で1度だけ WARN（同一フィールドの重複ログを抑制し、ログ量を抑える）。
 *   - 観測処理は本番フェッチを絶対に止めない（全て try/catch で握りつぶす）。
 */

import { DLsiteApiResponse } from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";
import { KNOWN_DLSITE_API_FIELDS } from "./dlsite-known-api-fields";

/** Cloud Logging のアラートポリシーが拾うための安定マーカー */
export const SCHEMA_DRIFT_ALERT = "dlsite_schema_drift";

/**
 * 判定基準となる既知フィールド集合。
 * ベースライン（観測実績）と Zod スキーマのキーを union する（どちらに入っていても既知扱い）。
 */
export const KNOWN_FIELDS: ReadonlySet<string> = new Set<string>([
	...KNOWN_DLSITE_API_FIELDS,
	...Object.keys(DLsiteApiResponse.shape),
]);

/**
 * レスポンス群から、既知集合に無いトップレベルフィールド（＝新フィールド候補）を抽出する（純粋関数）。
 *
 * @returns フィールド名 → 出現件数 の昇順マップ
 */
export function detectNewFields(
	responses: Array<Record<string, unknown>>,
	known: ReadonlySet<string> = KNOWN_FIELDS,
): Record<string, number> {
	const newFields: Record<string, number> = {};
	for (const res of responses) {
		if (!res || typeof res !== "object") continue;
		for (const key of Object.keys(res)) {
			if (!known.has(key)) {
				newFields[key] = (newFields[key] ?? 0) + 1;
			}
		}
	}
	return newFields;
}

// プロセス内で既に WARN 済みの新フィールド（重複ログ抑制）
const warnedFields = new Set<string>();

/**
 * テスト用: 重複抑制状態をリセットする
 */
export function resetSchemaDriftState(): void {
	warnedFields.clear();
}

/**
 * 1バッチ分のレスポンスを検査し、未知の新フィールドがあれば WARN を出す。
 *
 * - 本番フェッチを止めないため、内部例外は握りつぶす。
 * - 同一フィールドはプロセス内で1度だけ WARN する（ログ量抑制）。
 *
 * @param responses バッチで取得した raw レスポンス
 * @param context ログに付与する文脈（バッチ番号など）
 */
export function recordSchemaDriftForBatch(
	responses: Array<Record<string, unknown>>,
	context: Record<string, unknown> = {},
): void {
	try {
		const newFields = detectNewFields(responses);
		const fresh = Object.keys(newFields).filter((f) => !warnedFields.has(f));
		if (fresh.length === 0) {
			return;
		}
		for (const f of fresh) {
			warnedFields.add(f);
		}
		logger.warn("DLsite スキーマdrift検出: 既知集合に無い新フィールドが出現しました", {
			alert: SCHEMA_DRIFT_ALERT,
			newFields: fresh,
			counts: Object.fromEntries(fresh.map((f) => [f, newFields[f]])),
			scanned: responses.length,
			...context,
		});
	} catch (error) {
		// 観測はベストエフォート。失敗しても本番フェッチには影響させない。
		logger.debug("スキーマdrift観測でエラー（無視）", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
