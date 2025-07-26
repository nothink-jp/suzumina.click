import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DateFormatter, DateRange } from "../work/date-range";

describe("DateRange Value Object", () => {
	describe("DateRange creation and methods", () => {
		let mockDate: Date;

		beforeEach(() => {
			// 2024年1月15日に固定
			mockDate = new Date("2024-01-15T00:00:00Z");
			vi.useFakeTimers();
			vi.setSystemTime(mockDate);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("Date オブジェクトを正しく取得する", () => {
			const dateRange = DateRange.parse({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			expect(dateRange.toDate()).toEqual(new Date("2024-01-10T00:00:00.000Z"));
		});

		it("現在からの経過日数を正しく計算する", () => {
			const dateRange = DateRange.parse({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			expect(dateRange.daysFromNow()).toBe(5);
		});

		it("相対的な時間表現を正しく生成する", () => {
			const today = DateRange.parse({
				original: "2024年1月15日",
				iso: mockDate.toISOString(),
				display: "2024年1月15日",
			});

			const yesterday = DateRange.parse({
				original: "2024年1月14日",
				iso: new Date("2024-01-14T00:00:00Z").toISOString(),
				display: "2024年1月14日",
			});

			const weekAgo = DateRange.parse({
				original: "2024年1月8日",
				iso: new Date("2024-01-08T00:00:00Z").toISOString(),
				display: "2024年1月8日",
			});

			const monthAgo = DateRange.parse({
				original: "2023年12月15日",
				iso: new Date("2023-12-15T00:00:00Z").toISOString(),
				display: "2023年12月15日",
			});

			const yearAgo = DateRange.parse({
				original: "2023年1月15日",
				iso: new Date("2023-01-15T00:00:00Z").toISOString(),
				display: "2023年1月15日",
			});

			expect(today.relative()).toBe("今日");
			expect(yesterday.relative()).toBe("昨日");
			expect(weekAgo.relative()).toBe("1週間前");
			expect(monthAgo.relative()).toBe("1ヶ月前");
			expect(yearAgo.relative()).toBe("1年前");
		});

		it("日付の比較を正しく行う", () => {
			const date1 = DateRange.parse({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			const date2 = DateRange.parse({
				original: "2024年1月15日",
				iso: "2024-01-15T00:00:00.000Z",
				display: "2024年1月15日",
			});

			expect(date1.isBefore(date2)).toBe(true);
			expect(date2.isAfter(date1)).toBe(true);
			expect(date1.equals(date1)).toBe(true);
			expect(date1.equals(date2)).toBe(false);
		});

		it("期間内かどうかを正しく判定する", () => {
			const start = DateRange.parse({
				original: "2024年1月1日",
				iso: "2024-01-01T00:00:00.000Z",
				display: "2024年1月1日",
			});

			const end = DateRange.parse({
				original: "2024年1月31日",
				iso: "2024-01-31T00:00:00.000Z",
				display: "2024年1月31日",
			});

			const target = DateRange.parse({
				original: "2024年1月15日",
				iso: "2024-01-15T00:00:00.000Z",
				display: "2024年1月15日",
			});

			const outside = DateRange.parse({
				original: "2024年2月1日",
				iso: "2024-02-01T00:00:00.000Z",
				display: "2024年2月1日",
			});

			expect(target.isWithin(start, end)).toBe(true);
			expect(outside.isWithin(start, end)).toBe(false);
		});
	});

	describe("DateFormatter utilities", () => {
		it("DLsiteの日付形式を正しく変換する", () => {
			const formats = ["2024年1月15日", "2024-01-15", "2024/01/15"];

			formats.forEach((format) => {
				const result = DateFormatter.optimizeDateFormats(format);
				expect(result).not.toBeNull();
				expect(result!.original).toBe(format);
				expect(result!.display).toBe("2024年1月15日");
				// ISO文字列の検証（タイムゾーンに依存しない）
				const date = new Date(result!.iso);
				expect(date.getFullYear()).toBe(2024);
				expect(date.getMonth()).toBe(0); // 0-indexed
				expect(date.getDate()).toBe(15);
			});
		});

		it("無効な日付形式はnullを返す", () => {
			const invalidFormats = ["invalid date", ""];

			invalidFormats.forEach((format) => {
				const result = DateFormatter.optimizeDateFormats(format);
				expect(result).toBeNull();
			});
		});

		it("期間を正しく計算する", () => {
			const start = {
				iso: "2024-01-01T00:00:00.000Z",
			};

			const end = {
				iso: "2024-01-02T00:00:00.000Z",
			};

			const duration = DateFormatter.calculateDuration(start, end);
			expect(duration).toBe(24 * 60 * 60 * 1000); // 1日のミリ秒
		});

		it("期間を人間が読みやすい形式に変換する", () => {
			const oneDay = 24 * 60 * 60 * 1000;
			const oneHour = 60 * 60 * 1000;
			const oneMinute = 60 * 1000;

			expect(DateFormatter.formatDuration(oneDay + oneHour + oneMinute)).toBe("1日 1時間 1分");
			expect(DateFormatter.formatDuration(oneHour + oneMinute)).toBe("1時間 1分");
			expect(DateFormatter.formatDuration(oneMinute)).toBe("1分");
			expect(DateFormatter.formatDuration(0)).toBe("0分");
		});
	});
});
