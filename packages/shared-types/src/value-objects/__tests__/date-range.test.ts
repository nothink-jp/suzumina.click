import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DateFormatter, DateRangeValueObject } from "../work/date-range";

describe("DateRange Value Object", () => {
	describe("DateRange creation and validation", () => {
		it("should create valid DateRange", () => {
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.original).toBe("2024年1月10日");
				expect(result.value.iso).toBe("2024-01-10T00:00:00.000Z");
				expect(result.value.display).toBe("2024年1月10日");
			}
		});

		it("should validate original field", () => {
			const result = DateRangeValueObject.create({
				original: "",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toBe("Original date must be a non-empty string");
			}
		});

		it("should validate iso field", () => {
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "",
				display: "2024年1月10日",
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toBe("ISO date must be a non-empty string");
			}
		});

		it("should validate display field", () => {
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "",
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toBe("Display date must be a non-empty string");
			}
		});

		it("should validate ISO date format", () => {
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "invalid-date",
				display: "2024年1月10日",
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toBe("ISO date must be a valid date string");
			}
		});
	});

	describe("fromPlainObject", () => {
		it("should create from plain object", () => {
			const result = DateRangeValueObject.fromPlainObject({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.original).toBe("2024年1月10日");
				expect(result.value.iso).toBe("2024-01-10T00:00:00.000Z");
				expect(result.value.display).toBe("2024年1月10日");
			}
		});

		it("should handle non-object input", () => {
			const result1 = DateRangeValueObject.fromPlainObject(null);
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toBe("DateRange data must be an object");
			}

			const result2 = DateRangeValueObject.fromPlainObject("string");
			expect(result2.isErr()).toBe(true);

			const result3 = DateRangeValueObject.fromPlainObject(undefined);
			expect(result3.isErr()).toBe(true);
		});

		it("should validate field types", () => {
			const result = DateRangeValueObject.fromPlainObject({
				original: 123,
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toBe(
					"DateRange must have original, iso, and display as strings",
				);
			}
		});
	});

	describe("DateRange methods", () => {
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
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const dateRange = result.value;
				expect(dateRange.toDate()).toEqual(new Date("2024-01-10T00:00:00.000Z"));
			}
		});

		it("現在からの経過日数を正しく計算する", () => {
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const dateRange = result.value;
				expect(dateRange.daysFromNow()).toBe(5);
			}
		});

		it("相対的な時間表現を正しく生成する", () => {
			const todayResult = DateRangeValueObject.create({
				original: "2024年1月15日",
				iso: mockDate.toISOString(),
				display: "2024年1月15日",
			});

			const yesterdayResult = DateRangeValueObject.create({
				original: "2024年1月14日",
				iso: new Date("2024-01-14T00:00:00Z").toISOString(),
				display: "2024年1月14日",
			});

			const weekAgoResult = DateRangeValueObject.create({
				original: "2024年1月8日",
				iso: new Date("2024-01-08T00:00:00Z").toISOString(),
				display: "2024年1月8日",
			});

			const monthAgoResult = DateRangeValueObject.create({
				original: "2023年12月15日",
				iso: new Date("2023-12-15T00:00:00Z").toISOString(),
				display: "2023年12月15日",
			});

			const yearAgoResult = DateRangeValueObject.create({
				original: "2023年1月15日",
				iso: new Date("2023-01-15T00:00:00Z").toISOString(),
				display: "2023年1月15日",
			});

			expect(todayResult.isOk()).toBe(true);
			expect(yesterdayResult.isOk()).toBe(true);
			expect(weekAgoResult.isOk()).toBe(true);
			expect(monthAgoResult.isOk()).toBe(true);
			expect(yearAgoResult.isOk()).toBe(true);

			if (
				todayResult.isOk() &&
				yesterdayResult.isOk() &&
				weekAgoResult.isOk() &&
				monthAgoResult.isOk() &&
				yearAgoResult.isOk()
			) {
				const today = todayResult.value;
				const yesterday = yesterdayResult.value;
				const weekAgo = weekAgoResult.value;
				const monthAgo = monthAgoResult.value;
				const yearAgo = yearAgoResult.value;

				expect(today.relative()).toBe("今日");
				expect(yesterday.relative()).toBe("昨日");
				expect(weekAgo.relative()).toBe("1週間前");
				expect(monthAgo.relative()).toBe("1ヶ月前");
				expect(yearAgo.relative()).toBe("1年前");
			}
		});

		it("日付の比較を正しく行う", () => {
			const date1Result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			const date2Result = DateRangeValueObject.create({
				original: "2024年1月15日",
				iso: "2024-01-15T00:00:00.000Z",
				display: "2024年1月15日",
			});

			expect(date1Result.isOk()).toBe(true);
			expect(date2Result.isOk()).toBe(true);

			if (date1Result.isOk() && date2Result.isOk()) {
				const date1 = date1Result.value;
				const date2 = date2Result.value;

				expect(date1.isBefore(date2)).toBe(true);
				expect(date2.isAfter(date1)).toBe(true);
				expect(date1.equals(date1)).toBe(true);
				expect(date1.equals(date2)).toBe(false);
			}
		});

		it("期間内かどうかを正しく判定する", () => {
			const startResult = DateRangeValueObject.create({
				original: "2024年1月1日",
				iso: "2024-01-01T00:00:00.000Z",
				display: "2024年1月1日",
			});

			const endResult = DateRangeValueObject.create({
				original: "2024年1月31日",
				iso: "2024-01-31T00:00:00.000Z",
				display: "2024年1月31日",
			});

			const targetResult = DateRangeValueObject.create({
				original: "2024年1月15日",
				iso: "2024-01-15T00:00:00.000Z",
				display: "2024年1月15日",
			});

			const outsideResult = DateRangeValueObject.create({
				original: "2024年2月1日",
				iso: "2024-02-01T00:00:00.000Z",
				display: "2024年2月1日",
			});

			expect(startResult.isOk()).toBe(true);
			expect(endResult.isOk()).toBe(true);
			expect(targetResult.isOk()).toBe(true);
			expect(outsideResult.isOk()).toBe(true);

			if (startResult.isOk() && endResult.isOk() && targetResult.isOk() && outsideResult.isOk()) {
				const start = startResult.value;
				const end = endResult.value;
				const target = targetResult.value;
				const outside = outsideResult.value;

				expect(target.isWithin(start, end)).toBe(true);
				expect(outside.isWithin(start, end)).toBe(false);
			}
		});
	});

	describe("ValidatableValueObject implementation", () => {
		it("should validate valid DateRange", () => {
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.isValid()).toBe(true);
				expect(result.value.getValidationErrors()).toEqual([]);
			}
		});
	});

	describe("BaseValueObject implementation", () => {
		it("should check equality correctly", () => {
			const result1 = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			const result2 = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			const result3 = DateRangeValueObject.create({
				original: "2024年1月11日",
				iso: "2024-01-11T00:00:00.000Z",
				display: "2024年1月11日",
			});

			if (result1.isOk() && result2.isOk() && result3.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(true);
				expect(result1.value.equals(result3.value)).toBe(false);
			}
		});

		it("should return false for non-DateRange objects", () => {
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			if (result.isOk()) {
				expect(result.value.equals(null as any)).toBe(false);
				expect(result.value.equals("string" as any)).toBe(false);
			}
		});

		it("should clone correctly", () => {
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			if (result.isOk()) {
				const original = result.value;
				const cloned = original.clone();

				expect(cloned).not.toBe(original);
				expect(cloned.equals(original)).toBe(true);
				expect(cloned.original).toBe(original.original);
				expect(cloned.iso).toBe(original.iso);
				expect(cloned.display).toBe(original.display);
			}
		});

		it("should convert to plain object", () => {
			const result = DateRangeValueObject.create({
				original: "2024年1月10日",
				iso: "2024-01-10T00:00:00.000Z",
				display: "2024年1月10日",
			});

			if (result.isOk()) {
				const plain = result.value.toPlainObject();
				expect(plain).toEqual({
					original: "2024年1月10日",
					iso: "2024-01-10T00:00:00.000Z",
					display: "2024年1月10日",
				});
			}
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
