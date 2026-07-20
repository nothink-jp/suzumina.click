/**
 * 動画統計ティア境界日時ユーティリティ（SPR-261/262）のテスト
 */

import { describe, expect, it } from "vitest";
import { getStatsTierCutoffDate, RECENT_WINDOW_DAYS } from "../video-tiering";

const TODAY = new Date("2026-07-20T00:00:00.000Z");

describe("getStatsTierCutoffDate", () => {
	it("today からwindowDays日前の日時を返す", () => {
		const cutoff = getStatsTierCutoffDate(30, TODAY);
		expect(cutoff.toISOString()).toBe("2026-06-20T00:00:00.000Z");
	});

	it("windowDays=0の場合はtodayと同じ日時を返す", () => {
		const cutoff = getStatsTierCutoffDate(0, TODAY);
		expect(cutoff.toISOString()).toBe(TODAY.toISOString());
	});

	it("RECENT_WINDOW_DAYSを使った場合と明示指定した場合で一致する", () => {
		expect(getStatsTierCutoffDate(RECENT_WINDOW_DAYS, TODAY).getTime()).toBe(
			getStatsTierCutoffDate(30, TODAY).getTime(),
		);
	});

	it("todayを書き換えない（純粋関数であること）", () => {
		const today = new Date(TODAY);
		getStatsTierCutoffDate(30, today);
		expect(today.toISOString()).toBe(TODAY.toISOString());
	});
});
