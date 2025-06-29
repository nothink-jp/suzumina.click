import { describe, expect, it } from "vitest";

// Test utility functions that might be used in the admin app
describe("Data Helpers", () => {
	describe("formatTime", () => {
		const formatTime = (seconds: number): string => {
			const mins = Math.floor(seconds / 60);
			const secs = Math.floor(seconds % 60);
			return `${mins}:${secs.toString().padStart(2, "0")}`;
		};

		it("should format seconds correctly", () => {
			expect(formatTime(0)).toBe("0:00");
			expect(formatTime(30)).toBe("0:30");
			expect(formatTime(60)).toBe("1:00");
			expect(formatTime(90)).toBe("1:30");
			expect(formatTime(125)).toBe("2:05");
			expect(formatTime(3661)).toBe("61:01");
		});

		it("should handle decimal seconds", () => {
			expect(formatTime(30.7)).toBe("0:30");
			expect(formatTime(90.9)).toBe("1:30");
		});
	});

	describe("formatPrice", () => {
		const formatPrice = (price: number): string => {
			return `¥${price.toLocaleString()}`;
		};

		it("should format prices correctly", () => {
			expect(formatPrice(0)).toBe("¥0");
			expect(formatPrice(100)).toBe("¥100");
			expect(formatPrice(1000)).toBe("¥1,000");
			expect(formatPrice(10000)).toBe("¥10,000");
			expect(formatPrice(1234567)).toBe("¥1,234,567");
		});

		it("should handle decimal prices", () => {
			expect(formatPrice(99.99)).toBe("¥99.99");
			expect(formatPrice(1000.5)).toBe("¥1,000.5");
		});
	});

	describe("formatRating", () => {
		const formatRating = (rating: number): string => {
			return rating > 0 ? rating.toFixed(1) : "未評価";
		};

		it("should format ratings correctly", () => {
			expect(formatRating(0)).toBe("未評価");
			expect(formatRating(4.5)).toBe("4.5");
			expect(formatRating(3.0)).toBe("3.0");
			expect(formatRating(4.789)).toBe("4.8");
		});

		it("should handle edge cases", () => {
			expect(formatRating(-1)).toBe("未評価");
			expect(formatRating(0.0)).toBe("未評価");
			expect(formatRating(5.0)).toBe("5.0");
		});
	});

	describe("validateButtonData", () => {
		// Helper functions to reduce complexity
		const isValidTitle = (title: unknown): boolean => typeof title === "string" && title.length > 0;

		const isValidTimeRange = (startTime: unknown, endTime: unknown): boolean =>
			typeof startTime === "number" &&
			startTime >= 0 &&
			typeof endTime === "number" &&
			endTime > startTime;

		const isValidPublicFlag = (isPublic: unknown): boolean => typeof isPublic === "boolean";

		// biome-ignore lint/suspicious/noExplicitAny: Test utility function needs flexible input
		const validateButtonData = (data: any): boolean => {
			return (
				isValidTitle(data.title) &&
				isValidTimeRange(data.startTime, data.endTime) &&
				isValidPublicFlag(data.isPublic)
			);
		};

		it("should validate correct button data", () => {
			const validData = {
				title: "Test Button",
				startTime: 10,
				endTime: 30,
				isPublic: true,
			};

			expect(validateButtonData(validData)).toBe(true);
		});

		it("should reject invalid button data", () => {
			expect(validateButtonData({})).toBe(false);
			expect(validateButtonData({ title: "" })).toBe(false);
			expect(
				validateButtonData({
					title: "Test",
					startTime: -1,
					endTime: 30,
					isPublic: true,
				}),
			).toBe(false);
			expect(
				validateButtonData({
					title: "Test",
					startTime: 30,
					endTime: 10,
					isPublic: true,
				}),
			).toBe(false);
			expect(
				validateButtonData({
					title: "Test",
					startTime: 10,
					endTime: 30,
					isPublic: "true",
				}),
			).toBe(false);
		});
	});

	describe("sanitizeString", () => {
		const sanitizeString = (str: string): string => {
			return str.trim().replace(/\s+/g, " ");
		};

		it("should sanitize strings correctly", () => {
			expect(sanitizeString("  test  ")).toBe("test");
			expect(sanitizeString("test   string")).toBe("test string");
			expect(sanitizeString("  multiple   spaces   here  ")).toBe("multiple spaces here");
			expect(sanitizeString("\ttest\nstring\r")).toBe("test string");
		});

		it("should handle empty strings", () => {
			expect(sanitizeString("")).toBe("");
			expect(sanitizeString("   ")).toBe("");
		});
	});

	describe("generateStats", () => {
		// biome-ignore lint/suspicious/noExplicitAny: Test utility function needs flexible input
		const generateStats = (items: any[]) => {
			return {
				total: items.length,
				public: items.filter((item) => item.isPublic === true).length,
				private: items.filter((item) => item.isPublic === false).length,
				totalPlays: items.reduce((sum, item) => sum + (item.playCount || 0), 0),
			};
		};

		it("should generate correct statistics", () => {
			const testItems = [
				{ isPublic: true, playCount: 100 },
				{ isPublic: false, playCount: 50 },
				{ isPublic: true, playCount: 75 },
				{ isPublic: true }, // No playCount
			];

			const stats = generateStats(testItems);

			expect(stats.total).toBe(4);
			expect(stats.public).toBe(3);
			expect(stats.private).toBe(1);
			expect(stats.totalPlays).toBe(225);
		});

		it("should handle empty arrays", () => {
			const stats = generateStats([]);

			expect(stats.total).toBe(0);
			expect(stats.public).toBe(0);
			expect(stats.private).toBe(0);
			expect(stats.totalPlays).toBe(0);
		});
	});
});
