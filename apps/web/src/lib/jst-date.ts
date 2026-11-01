import { formatRelativeTime } from "@suzumina.click/shared-types";

/**
 * JST（Asia/Tokyo）の暦日を扱うユーティリティ。
 * 日次の判定（ボタン作成上限・guild 同期・lastLogin の間引き・表示の「今日」）が共有する日付境界の正本。
 */

/**
 * JST日付を取得（YYYY-MM-DD形式）。省略時は現在時刻
 */
export function getJSTDateString(date: Date = new Date()): string {
	// sv-SE ロケールはISO 8601形式（YYYY-MM-DD）を返す
	return date.toLocaleDateString("sv-SE", {
		timeZone: "Asia/Tokyo",
	});
}

/**
 * JST日付が変わったかチェック
 */
export function hasDateChangedJST(lastDate: string | undefined): boolean {
	if (!lastDate) return true;
	return lastDate !== getJSTDateString();
}

/**
 * ISO 日時が JST で今日か（欠落・不正値は false）
 */
export function isTodayJST(iso: string | undefined): boolean {
	if (!iso) return false;
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return false;
	return getJSTDateString(date) === getJSTDateString();
}

/**
 * 最終ログインの表示文言（「今日」/「昨日」/「3日前」…）。現在時刻に依存するので表示側で呼ぶ
 *
 * lastLoginAt は JST 日次でしか更新されない（updateLastLogin 参照）ため、当日分は時間単位で出さず「今日」にする。
 * 変換時に計算して FrontendUserData に持たせない：use cache 等を通ると計算時点の値が残り続ける（SPR-401）
 */
export function formatLastActiveText(lastLoginAt: string): string {
	return isTodayJST(lastLoginAt) ? "今日" : formatRelativeTime(lastLoginAt);
}
