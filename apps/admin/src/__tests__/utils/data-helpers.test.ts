import { describe, expect, it } from "vitest";
import {
	filterBySearch,
	filterByStatus,
	formatCategory,
	formatDate,
	formatNumber,
	formatPriority,
	formatRole,
	formatStatus,
	sortByField,
} from "@/lib/data-helpers";

describe("Data Processing Utilities", () => {
	describe("formatDate", () => {
		it("should format Firestore timestamp correctly", () => {
			const mockTimestamp = {
				toDate: () => new Date("2024-01-15T10:30:00Z"),
			};

			const result = formatDate(mockTimestamp);
			expect(result).toMatch(/2024/);
			expect(result).toMatch(/01/);
			expect(result).toMatch(/15/);
		});

		it("should format Date object correctly", () => {
			const date = new Date("2024-01-15T10:30:00Z");
			const result = formatDate(date);

			expect(result).toMatch(/2024/);
			expect(result).toMatch(/01/);
			expect(result).toMatch(/15/);
		});

		it("should handle null/undefined values", () => {
			expect(formatDate(null)).toBe("不明");
			expect(formatDate(undefined)).toBe("不明");
		});

		it("should handle invalid values", () => {
			expect(formatDate("invalid")).toBe("不明");
			expect(formatDate({})).toBe("不明");
		});
	});

	describe("formatRole", () => {
		it("should format known roles", () => {
			expect(formatRole("admin")).toBe("管理者");
			expect(formatRole("moderator")).toBe("モデレーター");
			expect(formatRole("member")).toBe("メンバー");
		});

		it("should return original value for unknown roles", () => {
			expect(formatRole("unknown")).toBe("unknown");
			expect(formatRole("custom")).toBe("custom");
		});
	});

	describe("formatStatus", () => {
		it("should format known statuses", () => {
			expect(formatStatus("new")).toBe("新規");
			expect(formatStatus("in_progress")).toBe("確認中");
			expect(formatStatus("resolved")).toBe("対応済み");
			expect(formatStatus("active")).toBe("アクティブ");
			expect(formatStatus("inactive")).toBe("非アクティブ");
		});

		it("should return original value for unknown statuses", () => {
			expect(formatStatus("unknown")).toBe("unknown");
		});
	});

	describe("formatPriority", () => {
		it("should format known priorities", () => {
			expect(formatPriority("high")).toBe("高");
			expect(formatPriority("medium")).toBe("中");
			expect(formatPriority("low")).toBe("低");
		});

		it("should return original value for unknown priorities", () => {
			expect(formatPriority("unknown")).toBe("unknown");
		});
	});

	describe("formatCategory", () => {
		it("should format known categories", () => {
			expect(formatCategory("bug")).toBe("バグ報告");
			expect(formatCategory("feature")).toBe("機能リクエスト");
			expect(formatCategory("question")).toBe("質問");
			expect(formatCategory("other")).toBe("その他");
		});

		it("should return original value for unknown categories", () => {
			expect(formatCategory("unknown")).toBe("unknown");
		});
	});

	describe("formatNumber", () => {
		it("should format large numbers with M suffix", () => {
			expect(formatNumber(1500000)).toBe("1.5M");
			expect(formatNumber(2000000)).toBe("2.0M");
		});

		it("should format thousands with K suffix", () => {
			expect(formatNumber(1500)).toBe("1.5K");
			expect(formatNumber(2000)).toBe("2.0K");
		});

		it("should format small numbers with locale string", () => {
			expect(formatNumber(123)).toBe("123");
			expect(formatNumber(999)).toBe("999");
		});

		it("should handle zero and negative numbers", () => {
			expect(formatNumber(0)).toBe("0");
			expect(formatNumber(-100)).toBe("-100");
		});
	});

	describe("filterBySearch", () => {
		const testData = [
			{ id: 1, name: "Alice", email: "alice@example.com", role: "admin" },
			{ id: 2, name: "Bob", email: "bob@example.com", role: "member" },
			{ id: 3, name: "Charlie", email: "charlie@test.com", role: "moderator" },
		];

		it("should filter by single field", () => {
			const result = filterBySearch(testData, "alice", ["name"]);
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Alice");
		});

		it("should filter by multiple fields", () => {
			const result = filterBySearch(testData, "example", ["name", "email"]);
			expect(result).toHaveLength(2);
		});

		it("should be case insensitive", () => {
			const result = filterBySearch(testData, "ALICE", ["name"]);
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Alice");
		});

		it("should return all items for empty search", () => {
			const result = filterBySearch(testData, "", ["name"]);
			expect(result).toHaveLength(testData.length);
		});

		it("should return empty array for no matches", () => {
			const result = filterBySearch(testData, "nonexistent", ["name"]);
			expect(result).toHaveLength(0);
		});
	});

	describe("filterByStatus", () => {
		const testData = [
			{ id: 1, status: "active" },
			{ id: 2, status: "inactive" },
			{ id: 3, status: "active" },
		];

		it("should filter by specific status", () => {
			const result = filterByStatus(testData, "active");
			expect(result).toHaveLength(2);
		});

		it("should return all items for 'all' status", () => {
			const result = filterByStatus(testData, "all");
			expect(result).toHaveLength(testData.length);
		});

		it("should return all items for empty status", () => {
			const result = filterByStatus(testData, "");
			expect(result).toHaveLength(testData.length);
		});
	});

	describe("sortByField", () => {
		const testData = [
			{ id: 1, name: "Charlie", count: 100 },
			{ id: 2, name: "Alice", count: 300 },
			{ id: 3, name: "Bob", count: 200 },
		];

		it("should sort by field in descending order by default", () => {
			const result = sortByField(testData, "count");
			expect(result[0]?.count).toBe(300);
			expect(result[1]?.count).toBe(200);
			expect(result[2]?.count).toBe(100);
		});

		it("should sort by field in ascending order", () => {
			const result = sortByField(testData, "count", "asc");
			expect(result[0]?.count).toBe(100);
			expect(result[1]?.count).toBe(200);
			expect(result[2]?.count).toBe(300);
		});

		it("should sort string fields alphabetically", () => {
			const result = sortByField(testData, "name", "asc");
			expect(result[0]?.name).toBe("Alice");
			expect(result[1]?.name).toBe("Bob");
			expect(result[2]?.name).toBe("Charlie");
		});

		it("should handle timestamp objects", () => {
			const timestampData = [
				{ id: 1, createdAt: { toDate: () => new Date("2024-01-01") } },
				{ id: 2, createdAt: { toDate: () => new Date("2024-01-03") } },
				{ id: 3, createdAt: { toDate: () => new Date("2024-01-02") } },
			];

			const result = sortByField(timestampData, "createdAt", "asc");
			expect(result[0]?.id).toBe(1);
			expect(result[1]?.id).toBe(3);
			expect(result[2]?.id).toBe(2);
		});

		it("should not mutate original array", () => {
			const original = [...testData];
			sortByField(testData, "count");
			expect(testData).toEqual(original);
		});
	});
});
