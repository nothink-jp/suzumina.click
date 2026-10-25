import type { UserFlags } from "@suzumina.click/shared-types";

/**
 * JST日付を取得（YYYY-MM-DD形式）
 */
export function getJSTDateString(): string {
	// sv-SE ロケールはISO 8601形式（YYYY-MM-DD）を返す
	return new Date().toLocaleDateString("sv-SE", {
		timeZone: "Asia/Tokyo",
	});
}

/**
 * 次のJST 00:00までの時間を取得（ISO形式）
 */
export function getNextJSTMidnight(): string {
	const now = new Date();
	const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

	const jstMidnight = new Date(jstNow);
	jstMidnight.setHours(24, 0, 0, 0); // 次の00:00

	return jstMidnight.toISOString();
}

/** 1日の音声ボタン作成上限（全ユーザー）。表示文言もここから出す＝上限値の正本 */
export const GENERAL_DAILY_BUTTON_LIMIT = 10;
/** 1日の音声ボタン作成上限（すずみなふぁみりー）。基本値 + ファミリーボーナス 100 */
export const FAMILY_DAILY_BUTTON_LIMIT = GENERAL_DAILY_BUTTON_LIMIT + 100;

/**
 * ユーザーの1日の上限を計算
 */
export function calculateDailyLimit(flags: UserFlags | undefined): number {
	return flags?.isFamilyMember ? FAMILY_DAILY_BUTTON_LIMIT : GENERAL_DAILY_BUTTON_LIMIT;
}

/**
 * JST日付が変わったかチェック
 */
export function hasDateChangedJST(lastDate: string | undefined): boolean {
	if (!lastDate) return true;
	return lastDate !== getJSTDateString();
}

/**
 * 残り時間を人間が読みやすい形式に変換
 */
export function formatTimeUntilReset(): string {
	const now = new Date();
	const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

	const jstMidnight = new Date(jstNow);
	jstMidnight.setHours(24, 0, 0, 0);

	const diffMs = jstMidnight.getTime() - jstNow.getTime();
	const hours = Math.floor(diffMs / (1000 * 60 * 60));
	const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

	if (hours > 0) {
		return `約${hours}時間後`;
	}
	return `約${minutes}分後`;
}
