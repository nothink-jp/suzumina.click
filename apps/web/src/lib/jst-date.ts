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
