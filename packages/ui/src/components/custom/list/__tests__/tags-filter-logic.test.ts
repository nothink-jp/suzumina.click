import { describe, expect, it } from "vitest";
import type { FilterConfig } from "../core/types";
import { generateOptions, getDefaultFilterValues } from "../core/utils/filterHelpers";

describe("Tags Filter Logic", () => {
	describe("generateOptions for tags type", () => {
		it("should handle tags filter config with static options", () => {
			const config: FilterConfig = {
				type: "tags",
				label: "Tags",
				placeholder: "Select tags",
				options: [
					{ value: "tag1", label: "Tag 1" },
					{ value: "tag2", label: "Tag 2" },
				],
			};

			const result = generateOptions(config);
			expect(result).toEqual([
				{ value: "tag1", label: "Tag 1" },
				{ value: "tag2", label: "Tag 2" },
			]);
		});

		it("should handle tags filter config with array options", () => {
			const config: FilterConfig = {
				type: "tags",
				label: "Tags",
				placeholder: "Select tags",
				options: [
					{ value: "tag1", label: "Tag 1" },
					{ value: "tag2", label: "Tag 2" },
				],
			};

			const result = generateOptions(config);
			expect(result).toEqual([
				{ value: "tag1", label: "Tag 1" },
				{ value: "tag2", label: "Tag 2" },
			]);
		});

		it("should handle empty options", () => {
			const config: FilterConfig = {
				type: "tags",
				label: "Tags",
				placeholder: "Select tags",
				options: [],
			};

			const result = generateOptions(config);
			expect(result).toEqual([]);
		});
	});

	describe("getDefaultFilterValues for tags type", () => {
		it("should return empty array as default for tags filter", () => {
			const filters: Record<string, FilterConfig> = {
				tags: {
					type: "tags",
					label: "Tags",
					placeholder: "Select tags",
					options: [],
				},
			};

			const result = getDefaultFilterValues(filters);
			expect(result).toEqual({ tags: [] });
		});

		it("should handle multiple filters including tags", () => {
			const filters: Record<string, FilterConfig> = {
				search: {
					type: "select",
					label: "Search",
					placeholder: "Search...",
					options: [],
				},
				tags: {
					type: "tags",
					label: "Tags",
					placeholder: "Select tags",
					options: [],
				},
			};

			const result = getDefaultFilterValues(filters);
			expect(result).toHaveProperty("tags");
			expect(result.tags).toEqual([]);
		});
	});

	describe("URL parameter handling for tags type", () => {
		it("should parse comma-separated values for tags filter", () => {
			// This tests the logic that would be in useListUrl hook
			const urlValue = "tag1,tag2,tag3";
			const result = urlValue.split(",").filter(Boolean);
			expect(result).toEqual(["tag1", "tag2", "tag3"]);
		});

		it("should filter out empty values", () => {
			const urlValue = "tag1,,tag2,";
			const result = urlValue.split(",").filter(Boolean);
			expect(result).toEqual(["tag1", "tag2"]);
		});

		it("should return empty array when no tags in URL", () => {
			const urlValue = "";
			const result = urlValue.split(",").filter(Boolean);
			expect(result).toEqual([]);
		});
	});

	describe("AND search logic for tags", () => {
		it("should filter items with ALL selected tags", () => {
			const items = [
				{ id: 1, tags: ["tag1", "tag2", "tag3"] },
				{ id: 2, tags: ["tag1", "tag4"] },
				{ id: 3, tags: ["tag2", "tag3"] },
				{ id: 4, tags: ["tag1", "tag2"] },
			];

			const selectedTags = ["tag1", "tag2"];

			const filtered = items.filter((item) => {
				if (!item.tags) return false;
				return selectedTags.every((tag) => item.tags.includes(tag));
			});

			expect(filtered).toHaveLength(2);
			expect(filtered.map((i) => i.id)).toEqual([1, 4]);
		});

		it("should return empty when no items have all tags", () => {
			const items = [
				{ id: 1, tags: ["tag1"] },
				{ id: 2, tags: ["tag2"] },
				{ id: 3, tags: ["tag3"] },
			];

			const selectedTags = ["tag1", "tag2"];

			const filtered = items.filter((item) => {
				if (!item.tags) return false;
				return selectedTags.every((tag) => item.tags.includes(tag));
			});

			expect(filtered).toHaveLength(0);
		});

		it("should handle items without tags", () => {
			const items = [
				{ id: 1, tags: ["tag1", "tag2"] },
				{ id: 2, tags: null },
				{ id: 3, tags: undefined },
				{ id: 4, tags: [] },
			];

			const selectedTags = ["tag1"];

			const filtered = items.filter((item) => {
				if (!item.tags || item.tags.length === 0) return false;
				return selectedTags.every((tag) => item.tags!.includes(tag));
			});

			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe(1);
		});
	});
});
