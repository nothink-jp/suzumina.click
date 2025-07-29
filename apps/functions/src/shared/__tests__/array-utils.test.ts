import { describe, expect, it } from "vitest";
import { chunkArray } from "../array-utils";

describe("Array Utils", () => {
	describe("chunkArray", () => {
		it("should split array into chunks of specified size", () => {
			const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const chunks = chunkArray(array, 3);

			expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
		});

		it("should handle empty array", () => {
			const chunks = chunkArray([], 3);
			expect(chunks).toEqual([]);
		});

		it("should handle chunk size larger than array", () => {
			const array = [1, 2, 3];
			const chunks = chunkArray(array, 5);
			expect(chunks).toEqual([[1, 2, 3]]);
		});

		it("should throw error for invalid chunk size", () => {
			expect(() => chunkArray([1, 2, 3], 0)).toThrow("Chunk size must be greater than 0");
			expect(() => chunkArray([1, 2, 3], -1)).toThrow("Chunk size must be greater than 0");
		});
	});

	describe("Edge cases and error handling", () => {
		describe("chunkArray edge cases", () => {
			it("should handle single element array", () => {
				const chunks = chunkArray([42], 1);
				expect(chunks).toEqual([[42]]);
			});

			it("should handle chunk size equal to array length", () => {
				const array = [1, 2, 3];
				const chunks = chunkArray(array, 3);
				expect(chunks).toEqual([[1, 2, 3]]);
			});

			it("should handle very large chunk size", () => {
				const array = [1, 2, 3];
				const chunks = chunkArray(array, 1000);
				expect(chunks).toEqual([[1, 2, 3]]);
			});

			it("should handle fractional chunk size", () => {
				const array = [1, 2, 3, 4, 5];
				const chunks = chunkArray(array, 2.7);
				// JavaScript's for loop with fractional step actually works differently
				// The implementation uses i += size, so 2.7 step gives us [1,2], [3,4,5]
				expect(chunks).toEqual([
					[1, 2],
					[3, 4, 5],
				]);
			});
		});

		describe("Type safety tests", () => {
			it("should maintain type safety with chunkArray", () => {
				const stringArray = ["a", "b", "c", "d"];
				const chunks = chunkArray(stringArray, 2);

				// Type check: chunks should be string[][]
				expect(typeof chunks[0][0]).toBe("string");
				expect(chunks).toEqual([
					["a", "b"],
					["c", "d"],
				]);
			});
		});
	});

	describe("Performance considerations", () => {
		it("should handle large arrays efficiently", () => {
			const largeArray = Array.from({ length: 10000 }, (_, i) => i);

			const start = Date.now();
			const chunks = chunkArray(largeArray, 100);
			const end = Date.now();

			expect(chunks).toHaveLength(100);
			expect(chunks[0]).toHaveLength(100);
			expect(chunks[99]).toHaveLength(100);
			expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
		});
	});
});
