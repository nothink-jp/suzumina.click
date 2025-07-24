import { describe, expect, it } from "vitest";
import { calculateRatio, formatPercentage, safeParseNumber } from "../number-parser";

describe("Number Parser Utils", () => {
	describe("safeParseNumber", () => {
		it("should parse valid number strings", () => {
			expect(safeParseNumber("123")).toBe(123);
			expect(safeParseNumber("123.45")).toBe(123.45);
			expect(safeParseNumber("0")).toBe(0);
			expect(safeParseNumber("-123")).toBe(-123);
		});

		it("should handle scientific notation", () => {
			expect(safeParseNumber("1e3")).toBe(1000);
			expect(safeParseNumber("1.23e-4")).toBe(0.000123);
		});

		it("should return undefined for null", () => {
			expect(safeParseNumber(null)).toBeUndefined();
		});

		it("should return undefined for undefined", () => {
			expect(safeParseNumber(undefined)).toBeUndefined();
		});

		it("should return undefined for empty string", () => {
			expect(safeParseNumber("")).toBeUndefined();
		});

		it("should return undefined for non-numeric strings", () => {
			expect(safeParseNumber("abc")).toBeUndefined();
			expect(safeParseNumber("12abc")).toBeUndefined();
			expect(safeParseNumber("not-a-number")).toBeUndefined();
		});

		it("should return undefined for NaN results", () => {
			expect(safeParseNumber("NaN")).toBeUndefined();
			expect(safeParseNumber("Infinity")).toBe(Number.POSITIVE_INFINITY);
			expect(safeParseNumber("-Infinity")).toBe(Number.NEGATIVE_INFINITY);
		});
	});

	describe("calculateRatio", () => {
		it("should calculate correct ratio", () => {
			expect(calculateRatio(50, 100)).toBe(0.5);
			expect(calculateRatio(75, 100)).toBe(0.75);
			expect(calculateRatio(100, 100)).toBe(1);
			expect(calculateRatio(0, 100)).toBe(0);
		});

		it("should handle zero denominator", () => {
			expect(calculateRatio(50, 0)).toBe(0);
			expect(calculateRatio(0, 0)).toBe(0);
		});

		it("should handle negative denominator", () => {
			expect(calculateRatio(50, -100)).toBe(0);
			expect(calculateRatio(-50, -100)).toBe(0);
		});

		it("should handle decimal values", () => {
			expect(calculateRatio(1.5, 3)).toBe(0.5);
			expect(calculateRatio(0.5, 2)).toBe(0.25);
		});
	});

	describe("formatPercentage", () => {
		it("should format percentage correctly", () => {
			expect(formatPercentage(50, 100)).toBe("50.0%");
			expect(formatPercentage(75, 100)).toBe("75.0%");
			expect(formatPercentage(33, 100)).toBe("33.0%");
		});

		it("should handle custom decimal places", () => {
			expect(formatPercentage(33.333, 100, 0)).toBe("33%");
			expect(formatPercentage(33.333, 100, 2)).toBe("33.33%");
			expect(formatPercentage(33.333, 100, 3)).toBe("33.333%");
		});

		it("should handle zero denominator", () => {
			expect(formatPercentage(50, 0)).toBe("0.0%");
			expect(formatPercentage(0, 0)).toBe("0.0%");
		});

		it("should handle values over 100%", () => {
			expect(formatPercentage(150, 100)).toBe("150.0%");
			expect(formatPercentage(200, 100)).toBe("200.0%");
		});

		it("should handle negative values", () => {
			expect(formatPercentage(-50, 100)).toBe("-50.0%");
			expect(formatPercentage(50, -100)).toBe("0.0%"); // Negative denominator returns 0
		});

		it("should validate decimals parameter", () => {
			// Negative decimals should be treated as 0
			expect(formatPercentage(33.333, 100, -1)).toBe("33%");
			expect(formatPercentage(33.333, 100, -10)).toBe("33%");

			// Fractional decimals should be floored
			expect(formatPercentage(33.333, 100, 2.7)).toBe("33.33%");
			expect(formatPercentage(33.333, 100, 1.1)).toBe("33.3%");
		});
	});
});
