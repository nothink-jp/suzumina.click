import { describe, expect, test } from "vitest";
import type { FilterDefinition, ListConfig, ListState, SortDefinition } from "../types";

describe("generic-list types", () => {
	test("FilterDefinition型が正しく定義されている", () => {
		const filter: FilterDefinition = {
			key: "category",
			type: "select",
			label: "カテゴリ",
			options: [
				{ value: "all", label: "すべて" },
				{ value: "audio", label: "音声" },
			],
			defaultValue: "all",
		};

		expect(filter.key).toBe("category");
		expect(filter.type).toBe("select");
		expect(filter.options).toHaveLength(2);
	});

	test("SortDefinition型が正しく定義されている", () => {
		const sort: SortDefinition = {
			key: "newest",
			label: "新しい順",
			fields: [{ field: "createdAt", direction: "desc" }],
		};

		expect(sort.key).toBe("newest");
		expect(sort.fields[0].direction).toBe("desc");
	});

	test("ListState型が正しく定義されている", () => {
		const state: ListState = {
			counts: {
				total: 100,
				filtered: 50,
				displayed: 12,
			},
			pagination: {
				currentPage: 1,
				itemsPerPage: 12,
				totalPages: 5,
			},
			filters: {
				category: "audio",
			},
			sort: "newest",
			search: "",
			isLoading: false,
			error: null,
		};

		expect(state.counts.total).toBe(100);
		expect(state.pagination.totalPages).toBe(5);
		expect(state.filters.category).toBe("audio");
	});

	test("ListConfig型が複雑なフィルターをサポートする", () => {
		const config: ListConfig = {
			baseUrl: "/test",
			filters: [
				{
					key: "tags",
					type: "multiselect",
					label: "タグ",
				},
				{
					key: "dateRange",
					type: "dateRange",
					label: "期間",
				},
				{
					key: "price",
					type: "range",
					label: "価格",
				},
			],
			sortOptions: [
				{
					key: "popular",
					label: "人気順",
					fields: [
						{ field: "viewCount", direction: "desc" },
						{ field: "rating", direction: "desc" },
					],
				},
			],
		};

		expect(config.filters).toHaveLength(3);
		expect(config.filters?.[0].type).toBe("multiselect");
		expect(config.filters?.[1].type).toBe("dateRange");
		expect(config.filters?.[2].type).toBe("range");
		expect(config.sortOptions?.[0].fields).toHaveLength(2);
	});
});
