/**
 * YouTube動画の統計取得ティア分類ユーティリティ（SPR-261/262）
 *
 * dlsiteの`work-tiering.ts`（SPR-229）と同型: 「変化の頻度」で動画を分類し、
 * per-runで統計（videos.list）を再取得すべきかを判定する材料にする。
 * ここでは分類のみを行い、実際のdue-set計算（当日再取得済みかどうかの判定）は
 * Firestoreクエリが必要なため youtube-firestore.ts 側で行う。
 */

/** recent判定に使う公開直近日数の閾値（暫定値。本番実測を見て調整） */
export const RECENT_WINDOW_DAYS = 30;

export type VideoStatsTier = "recent" | "old";

/**
 * publishedAtISOが基準日からwindowDays日以内かどうかで動画のティアを判定する
 *
 * @param publishedAtISO ISO8601形式の公開日時
 * @param today 基準日時（テスト容易性のため注入）
 * @param windowDays recentとみなす直近日数
 */
export function classifyVideoStatsTier(
	publishedAtISO: string | undefined,
	today: Date,
	windowDays: number = RECENT_WINDOW_DAYS,
): VideoStatsTier {
	if (!publishedAtISO) {
		// 公開日不明は情報不足であり、統計更新の機会を失わないよう安全側（recent）に倒す
		return "recent";
	}

	const publishedAt = new Date(publishedAtISO);
	if (Number.isNaN(publishedAt.getTime())) {
		return "recent";
	}

	const diffDays = (today.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
	return diffDays <= windowDays ? "recent" : "old";
}
