import { FieldValue } from "@google-cloud/firestore";

/**
 * 更新オブジェクトの undefined フィールドを FieldValue.delete() に変換する。
 *
 * クライアントが `ignoreUndefinedProperties: true` の環境では、`update()` / `set(merge)` に
 * 渡した undefined フィールドは「スキップ」されるだけで「削除」されず旧値が残る（sticky）。
 * 「不在」を表す undefined を明示的に delete してフィールドをクリア可能にする
 * （既知の Firestore merge sticky 問題 / works 側 `toWorkWriteData` と同系統）。
 */
export function withClearedUndefined(update: object): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(update)) {
		normalized[key] = value === undefined ? FieldValue.delete() : value;
	}
	return normalized;
}
