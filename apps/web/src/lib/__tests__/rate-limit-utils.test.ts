import { describe, expect, it, vi } from "vitest";
import {
	calculateDailyLimit,
	formatTimeUntilReset,
	getJSTDateString,
	getNextJSTMidnight,
	hasDateChangedJST,
} from "../rate-limit-utils";

describe("rate-limit-utils", () => {
	describe("getJSTDateString", () => {
		it("YYYY-MM-DD形式の日付文字列を返すこと", () => {
			const result = getJSTDateString();
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});
	});

	describe("calculateDailyLimit", () => {
		it("一般ユーザーの場合は10を返すこと", () => {
			const limit = calculateDailyLimit({ isFamilyMember: false });
			expect(limit).toBe(10);
		});

		it("ファミリーメンバーの場合は110を返すこと", () => {
			const limit = calculateDailyLimit({ isFamilyMember: true });
			expect(limit).toBe(110);
		});

		it("フラグが未定義の場合は10を返すこと", () => {
			const limit = calculateDailyLimit(undefined);
			expect(limit).toBe(10);
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

	describe("getNextJSTMidnight", () => {
		it("ISO形式の日時文字列を返すこと", () => {
			const result = getNextJSTMidnight();
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});
	});

	describe("formatTimeUntilReset", () => {
		it("1時間以上残っている場合は時間表示になること", () => {
			// 現在時刻を14:00に固定
			const mockDate = new Date("2024-01-01T14:00:00+09:00");
			vi.useFakeTimers();
			vi.setSystemTime(mockDate);

			const result = formatTimeUntilReset();
			expect(result).toMatch(/約\d+時間後/);

			vi.useRealTimers();
		});

		it("1時間未満の場合は分表示になること", () => {
			// 現在時刻を23:30に固定
			const mockDate = new Date("2024-01-01T23:30:00+09:00");
			vi.useFakeTimers();
			vi.setSystemTime(mockDate);

			const result = formatTimeUntilReset();
			expect(result).toMatch(/約\d+分後/);

			vi.useRealTimers();
		});
	});
});
