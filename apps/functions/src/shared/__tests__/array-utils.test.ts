import { describe, expect, it } from "vitest";
import { chunkArray, deduplicate, deduplicateBy, partition, shuffle } from "../array-utils";

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

	describe("deduplicate", () => {
		it("should remove duplicate values", () => {
			const array = [1, 2, 2, 3, 3, 3, 4];
			const unique = deduplicate(array);
			expect(unique).toEqual([1, 2, 3, 4]);
		});

		it("should handle empty array", () => {
			const unique = deduplicate([]);
			expect(unique).toEqual([]);
		});

		it("should handle strings", () => {
			const array = ["a", "b", "b", "c", "c", "c"];
			const unique = deduplicate(array);
			expect(unique).toEqual(["a", "b", "c"]);
		});
	});

	describe("deduplicateBy", () => {
		it("should remove duplicates based on key function", () => {
			const array = [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
				{ id: 1, name: "Alice (duplicate)" },
				{ id: 3, name: "Charlie" },
			];

			const unique = deduplicateBy(array, (item) => item.id);

			expect(unique).toEqual([
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
				{ id: 3, name: "Charlie" },
			]);
		});

		it("should handle empty array", () => {
			const unique = deduplicateBy([] as Array<{ id: number }>, (item) => item.id);
			expect(unique).toEqual([]);
		});
	});

	describe("partition", () => {
		it("should split array based on predicate", () => {
			const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const [even, odd] = partition(array, (x) => x % 2 === 0);

			expect(even).toEqual([2, 4, 6, 8, 10]);
			expect(odd).toEqual([1, 3, 5, 7, 9]);
		});

		it("should handle empty array", () => {
			const [truthy, falsy] = partition([], (x) => x > 0);
			expect(truthy).toEqual([]);
			expect(falsy).toEqual([]);
		});

		it("should handle all true predicate", () => {
			const array = [1, 2, 3];
			const [truthy, falsy] = partition(array, () => true);
			expect(truthy).toEqual([1, 2, 3]);
			expect(falsy).toEqual([]);
		});

		it("should handle all false predicate", () => {
			const array = [1, 2, 3];
			const [truthy, falsy] = partition(array, () => false);
			expect(truthy).toEqual([]);
			expect(falsy).toEqual([1, 2, 3]);
		});
	});

	describe("shuffle", () => {
		it("should return array with same elements", () => {
			const array = [1, 2, 3, 4, 5];
			const shuffled = shuffle(array);

			expect(shuffled).toHaveLength(array.length);
			expect(shuffled.sort()).toEqual(array.sort());
		});

		it("should not modify original array", () => {
			const array = [1, 2, 3, 4, 5];
			const original = [...array];
			const shuffled = shuffle(array);

			expect(array).toEqual(original);
			expect(shuffled).not.toBe(array);
		});

		it("should handle empty array", () => {
			const shuffled = shuffle([]);
			expect(shuffled).toEqual([]);
		});

		it("should handle single element array", () => {
			const shuffled = shuffle([1]);
			expect(shuffled).toEqual([1]);
		});

		it("should handle two element array", () => {
			const array = [1, 2];
			const shuffled = shuffle(array);

			expect(shuffled).toHaveLength(2);
			expect(shuffled.sort()).toEqual([1, 2]);
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

		describe("deduplicate edge cases", () => {
			it("should handle array with no duplicates", () => {
				const array = [1, 2, 3, 4, 5];
				const unique = deduplicate(array);
				expect(unique).toEqual([1, 2, 3, 4, 5]);
			});

			it("should handle array with all same elements", () => {
				const array = [5, 5, 5, 5, 5];
				const unique = deduplicate(array);
				expect(unique).toEqual([5]);
			});

			it("should handle mixed types", () => {
				const array = [1, "1", 1, "1", true, true];
				const unique = deduplicate(array);
				expect(unique).toEqual([1, "1", true]);
			});

			it("should handle undefined and null values", () => {
				const array = [1, null, undefined, 1, null, undefined];
				const unique = deduplicate(array);
				expect(unique).toEqual([1, null, undefined]);
			});

			it("should handle objects (by reference)", () => {
				const obj1 = { id: 1 };
				const obj2 = { id: 2 };
				const obj3 = { id: 1 }; // Different reference
				const array = [obj1, obj2, obj1, obj3];
				const unique = deduplicate(array);
				expect(unique).toEqual([obj1, obj2, obj3]);
			});
		});

		describe("deduplicateBy edge cases", () => {
			it("should handle string key function", () => {
				const array = [
					{ name: "Alice", age: 25 },
					{ name: "Bob", age: 30 },
					{ name: "Alice", age: 28 },
				];

				const unique = deduplicateBy(array, (item) => item.name);

				expect(unique).toEqual([
					{ name: "Alice", age: 25 },
					{ name: "Bob", age: 30 },
				]);
			});

			it("should handle numeric key function", () => {
				const array = [
					{ id: 1, value: "a" },
					{ id: 2, value: "b" },
					{ id: 1, value: "c" },
					{ id: 3, value: "d" },
				];

				const unique = deduplicateBy(array, (item) => item.id);

				expect(unique).toEqual([
					{ id: 1, value: "a" },
					{ id: 2, value: "b" },
					{ id: 3, value: "d" },
				]);
			});

			it("should handle complex key extraction", () => {
				const array = [
					{ user: { id: 1 }, data: "a" },
					{ user: { id: 2 }, data: "b" },
					{ user: { id: 1 }, data: "c" },
				];

				const unique = deduplicateBy(array, (item) => item.user.id);

				expect(unique).toEqual([
					{ user: { id: 1 }, data: "a" },
					{ user: { id: 2 }, data: "b" },
				]);
			});

			it("should handle single item array", () => {
				const array = [{ id: 1, name: "Alice" }];
				const unique = deduplicateBy(array, (item) => item.id);
				expect(unique).toEqual([{ id: 1, name: "Alice" }]);
			});
		});

		describe("partition edge cases", () => {
			it("should handle single item array", () => {
				const [truthy, falsy] = partition([5], (x) => x > 3);
				expect(truthy).toEqual([5]);
				expect(falsy).toEqual([]);
			});

			it("should handle complex predicate", () => {
				const array = [
					{ name: "Alice", age: 25, active: true },
					{ name: "Bob", age: 30, active: false },
					{ name: "Charlie", age: 35, active: true },
				];

				const [youngAndActive, others] = partition(array, (user) => user.age < 30 && user.active);

				expect(youngAndActive).toEqual([{ name: "Alice", age: 25, active: true }]);
				expect(others).toEqual([
					{ name: "Bob", age: 30, active: false },
					{ name: "Charlie", age: 35, active: true },
				]);
			});

			it("should handle predicate that throws", () => {
				const array = [1, 2, 3];

				expect(() => {
					partition(array, (x) => {
						if (x === 2) throw new Error("Test error");
						return x > 1;
					});
				}).toThrow("Test error");
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

			it("should maintain type safety with deduplicate", () => {
				const numberArray = [1, 2, 2, 3];
				const unique = deduplicate(numberArray);

				// Type check: unique should be number[]
				expect(typeof unique[0]).toBe("number");
				expect(unique).toEqual([1, 2, 3]);
			});

			it("should maintain type safety with partition", () => {
				const booleanArray = [true, false, true, false];
				const [truthy, falsy] = partition(booleanArray, (x) => x);

				// Type check: both arrays should be boolean[]
				expect(typeof truthy[0]).toBe("boolean");
				expect(typeof falsy[0]).toBe("boolean");
				expect(truthy).toEqual([true, true]);
				expect(falsy).toEqual([false, false]);
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

		it("should handle deduplication of large arrays", () => {
			const largeArray = Array.from({ length: 5000 }, (_, i) => i % 1000);

			const start = Date.now();
			const unique = deduplicate(largeArray);
			const end = Date.now();

			expect(unique).toHaveLength(1000);
			expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
		});
	});
});
