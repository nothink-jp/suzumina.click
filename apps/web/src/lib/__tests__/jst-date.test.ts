import { describe, expect, it, vi } from "vitest";
import { getJSTDateString, hasDateChangedJST, isTodayJST } from "../jst-date";

describe("jst-date", () => {
	describe("getJSTDateString", () => {
		it("YYYY-MM-DD形式の日付文字列を返すこと", () => {
			const result = getJSTDateString();
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it("引数の Date を JST の暦日にする（UTC と日付がずれる時刻）", () => {
			expect(getJSTDateString(new Date("2026-05-31T15:00:00.000Z"))).toBe("2026-06-01");
		});
	});

	describe("isTodayJST", () => {
		it("JST 日付境界で判定し、欠落・不正値は false", () => {
			vi.useFakeTimers();
			// 2026-06-01 12:00 JST
			vi.setSystemTime(new Date("2026-06-01T03:00:00.000Z"));
			expect(isTodayJST("2026-05-31T15:00:00.000Z")).toBe(true); // 06-01 00:00 JST
			expect(isTodayJST("2026-05-31T14:59:59.000Z")).toBe(false); // 05-31 23:59 JST
			expect(isTodayJST(undefined)).toBe(false);
			expect(isTodayJST("not-a-date")).toBe(false);
			vi.useRealTimers();
		});
	});

	describe("hasDateChangedJST", () => {
		it("日付が変わった場合はtrueを返すこと", () => {
			const yesterday = "2024-01-01";
			expect(hasDateChangedJST(yesterday)).toBe(true);
		});

		it("同じ日付の場合はfalseを返すこと", () => {
			const today = getJSTDateString();
			expect(hasDateChangedJST(today)).toBe(false);
		});

		it("lastDateが未定義の場合はtrueを返すこと", () => {
			expect(hasDateChangedJST(undefined)).toBe(true);
		});
	});
});
