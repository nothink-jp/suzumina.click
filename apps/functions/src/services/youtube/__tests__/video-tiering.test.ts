/**
 * 動画統計ティア分類ユーティリティ（SPR-261/262）のテスト
 */

import { describe, expect, it } from "vitest";
import { classifyVideoStatsTier, RECENT_WINDOW_DAYS } from "../video-tiering";

const TODAY = new Date("2026-07-20T00:00:00.000Z");

describe("classifyVideoStatsTier", () => {
	it("publishedAtISOが未定義の場合はrecentになる（安全側）", () => {
		expect(classifyVideoStatsTier(undefined, TODAY)).toBe("recent");
	});

	it("publishedAtISOが不正な値の場合はrecentになる（安全側）", () => {
		expect(classifyVideoStatsTier("not-a-date", TODAY)).toBe("recent");
	});

	it("直近windowDays日以内に公開された動画はrecentになる", () => {
		expect(classifyVideoStatsTier("2026-07-01T00:00:00.000Z", TODAY)).toBe("recent"); // 19日前
	});

	it("ちょうど閾値の場合はrecentになる（境界値）", () => {
		const boundary = new Date(TODAY.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
		expect(classifyVideoStatsTier(boundary.toISOString(), TODAY)).toBe("recent");
	});

	it("windowDaysを超えて前に公開された動画はoldになる", () => {
		expect(classifyVideoStatsTier("2020-01-01T00:00:00.000Z", TODAY)).toBe("old");
	});

	it("windowDaysを明示的に指定できる", () => {
		expect(classifyVideoStatsTier("2026-07-10T00:00:00.000Z", TODAY, 5)).toBe("old"); // 10日前
		expect(classifyVideoStatsTier("2026-07-18T00:00:00.000Z", TODAY, 5)).toBe("recent"); // 2日前
	});
});
