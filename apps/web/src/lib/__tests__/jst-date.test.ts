import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatLastActiveText, getJSTDateString, hasDateChangedJST, isTodayJST } from "../jst-date";

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

describe("formatLastActiveText", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// 2026-06-01 22:00 JST
		vi.setSystemTime(new Date("2026-06-01T13:00:00.000Z"));
	});
	afterEach(() => vi.useRealTimers());

	it("lastLoginAt は日次更新のため、当日分は「N時間前」ではなく「今日」", () => {
		// 2026-06-01 07:00 JST（同日の朝。時間単位なら「15時間前」になる）
		expect(formatLastActiveText("2026-05-31T22:00:00.000Z")).toBe("今日");
	});

	it("前日以前は相対表示のまま", () => {
		// 2026-05-31 22:00 JST（ちょうど 24 時間前）
		expect(formatLastActiveText("2026-05-31T13:00:00.000Z")).toBe("昨日");
	});

	it.each([
		// 前日 23:00 JST → 翌 01:00 JST（経過 2 時間でも暦日は 1 日差）
		{ now: "2026-06-01T16:00:00.000Z", lastLoginAt: "2026-06-01T14:00:00.000Z", expected: "昨日" },
		// UTC では同日でも JST では前日（05-31 23:59 JST → 06-01 00:01 JST）
		{ now: "2026-05-31T15:01:00.000Z", lastLoginAt: "2026-05-31T14:59:00.000Z", expected: "昨日" },
		// 経過 25.5 時間でも暦日は 2 日差（06-01 23:00 JST → 06-03 00:30 JST。経過時間なら「昨日」）
		{ now: "2026-06-02T15:30:00.000Z", lastLoginAt: "2026-06-01T14:00:00.000Z", expected: "2日前" },
		// 未来の時刻（時計ずれ）は「今日」
		{ now: "2026-06-01T13:00:00.000Z", lastLoginAt: "2026-06-01T14:00:00.000Z", expected: "今日" },
	])(
		"JST の暦日の差で数える（$lastLoginAt @ $now → $expected）",
		({ now, lastLoginAt, expected }) => {
			vi.setSystemTime(new Date(now));
			expect(formatLastActiveText(lastLoginAt)).toBe(expected);
		},
	);

	it("呼んだ時刻を基準にする（変換時の値を持ち越さない）", () => {
		const lastLoginAt = "2026-06-01T00:00:00.000Z"; // 2026-06-01 09:00 JST
		expect(formatLastActiveText(lastLoginAt)).toBe("今日");
		vi.setSystemTime(new Date("2026-06-04T13:00:00.000Z"));
		expect(formatLastActiveText(lastLoginAt)).toBe("3日前");
	});
});
