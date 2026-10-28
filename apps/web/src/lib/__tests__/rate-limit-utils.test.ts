import { describe, expect, it, vi } from "vitest";
import {
	calculateDailyLimit,
	calculateGeminiDailyLimit,
	formatTimeUntilReset,
} from "../rate-limit-utils";

describe("rate-limit-utils", () => {
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

	describe("calculateGeminiDailyLimit (SPR-336)", () => {
		it("一般ユーザーは基本値、ファミリーは基本値 + ボーナス", () => {
			expect(calculateGeminiDailyLimit(undefined, "transcription")).toBe(6);
			expect(calculateGeminiDailyLimit({ isFamilyMember: true }, "transcription")).toBe(36);
			expect(calculateGeminiDailyLimit({ isFamilyMember: false }, "suggestion")).toBe(30);
			expect(calculateGeminiDailyLimit({ isFamilyMember: true }, "suggestion")).toBe(330);
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
