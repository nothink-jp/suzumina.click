/**
 * YouTube動画の統計取得ティア分類ユーティリティ（SPR-261/262）
 *
 * dlsiteの`work-tiering.ts`（SPR-229）と同型: 「変化の頻度」で動画を分類し、
 * per-runで統計（videos.list）を再取得すべきかを判定する材料にする。
 * recent/oldの境界は「公開直近windowDays日以内かどうか」の1点のみで、実際の判定は
 * youtube-firestore.tsのFirestore範囲クエリ（`publishedAt >= cutoff` / `< cutoff`）に
 * 埋め込まれる。ここでは境界日時の計算を一箇所に集約し、両クエリ間でのロジック重複
 * （カットオフの計算式がずれて静かに乖離する）を防ぐ。
 */

/** recent判定に使う公開直近日数の閾値（暫定値。本番実測を見て調整） */
export const RECENT_WINDOW_DAYS = 30;

/**
 * recent/oldティアの境界日時を計算する（この日時以降がrecent、より前がold）
 *
 * @param windowDays recentとみなす直近日数
 * @param today 基準日時（テスト容易性のため注入）
 */
export function getStatsTierCutoffDate(windowDays: number, today: Date): Date {
	const cutoff = new Date(today);
	cutoff.setDate(cutoff.getDate() - windowDays);
	return cutoff;
}
