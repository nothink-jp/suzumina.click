import { describe, expect, it } from "vitest";
import { isValidDateString, parseDate } from "../date-parser";

describe("Date Parser Utils", () => {
	describe("parseDate", () => {
		it("should parse valid ISO date string", () => {
			const result = parseDate("2024-01-01T00:00:00Z");
			expect(result).toBeInstanceOf(Date);
			expect(result?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
		});

		it("should parse valid date string without time", () => {
			const result = parseDate("2024-01-01");
			expect(result).toBeInstanceOf(Date);
		});

		it("should return undefined for null", () => {
			const result = parseDate(null);
			expect(result).toBeUndefined();
		});

		it("should return undefined for undefined", () => {
			const result = parseDate(undefined);
			expect(result).toBeUndefined();
		});

		it("should return undefined for empty string", () => {
			const result = parseDate("");
			expect(result).toBeUndefined();
		});

		it("should return undefined for invalid date string", () => {
			const result = parseDate("invalid-date");
			expect(result).toBeUndefined();
		});

		it("should return undefined for malformed date", () => {
			const result = parseDate("2024-99-99T99:99:99Z");
			expect(result).toBeUndefined();
		});

		it("should parse RFC 2822 date string", () => {
			const result = parseDate("Mon, 01 Jan 2024 00:00:00 GMT");
			expect(result).toBeInstanceOf(Date);
		});
	});

	describe("isValidDateString", () => {
		it("should return true for valid ISO date", () => {
			expect(isValidDateString("2024-01-01T00:00:00Z")).toBe(true);
		});

		it("should return true for valid date without time", () => {
			expect(isValidDateString("2024-01-01")).toBe(true);
		});

		it("should return false for null", () => {
			expect(isValidDateString(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isValidDateString(undefined)).toBe(false);
		});

		it("should return false for empty string", () => {
			expect(isValidDateString("")).toBe(false);
		});

		it("should return false for invalid date string", () => {
			expect(isValidDateString("not-a-date")).toBe(false);
		});

		it("should return false for malformed date", () => {
			expect(isValidDateString("2024-13-32")).toBe(false);
		});
	});
});
