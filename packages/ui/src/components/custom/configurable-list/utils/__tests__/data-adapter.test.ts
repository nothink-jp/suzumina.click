import { describe, expect, it, vi } from "vitest";
import type { StandardListParams } from "../../types";
import { calculatePagination, createDataAdapter, wrapLegacyFetchData } from "../data-adapter";

const listParams = (over: Partial<StandardListParams> = {}): StandardListParams =>
	({ page: 1, itemsPerPage: 10, filters: {}, ...over }) as StandardListParams;

describe("createDataAdapter.toParams", () => {
	it("既定マッピング（page/limit）でパラメータを生成する", () => {
		const adapter = createDataAdapter({
			resultMapping: { items: "items", total: "total" },
		});
		const params = adapter.toParams(listParams({ page: 2, itemsPerPage: 20 })) as Record<
			string,
			unknown
		>;
		expect(params).toEqual({ page: 2, limit: 20 });
	});

	it("paramMapping 指定時はキー名を差し替える", () => {
		const adapter = createDataAdapter({
			paramMapping: { page: "p", itemsPerPage: "size", sort: "order", search: "q" },
			resultMapping: { items: "items", total: "total" },
		});
		const params = adapter.toParams(
			listParams({ page: 3, itemsPerPage: 5, sort: "date", search: "kw" }),
		) as Record<string, unknown>;
		expect(params).toMatchObject({ p: 3, size: 5, order: "date", q: "kw" });
	});

	it("sort/search 既定キー & フィルター変換（undefined は除外）", () => {
		const adapter = createDataAdapter({
			filterTransforms: { genre: (v) => `g:${v}`, drop: () => undefined },
			resultMapping: { items: "items", total: "total" },
		});
		const params = adapter.toParams(
			listParams({
				sort: "name",
				search: "s",
				filters: { genre: "rpg", drop: "x", skip: undefined },
			}),
		) as Record<string, unknown>;
		expect(params.sort).toBe("name");
		expect(params.search).toBe("s");
		expect(params.genre).toBe("g:rpg");
		expect(params).not.toHaveProperty("drop"); // 変換で undefined
		expect(params).not.toHaveProperty("skip"); // 元値 undefined
	});
});

describe("createDataAdapter.fromResult", () => {
	it("文字列キーで items/total を取り出す", () => {
		const adapter = createDataAdapter({
			resultMapping: { items: "rows", total: "count" },
		});
		expect(adapter.fromResult({ rows: [1, 2], count: 2 })).toEqual({ items: [1, 2], total: 2 });
	});

	it("関数で items/total を導出する", () => {
		const adapter = createDataAdapter<number, { data: number[] }>({
			resultMapping: { items: (r) => r.data, total: (r) => r.data.length },
		});
		expect(adapter.fromResult({ data: [1, 2, 3] })).toEqual({ items: [1, 2, 3], total: 3 });
	});
});

describe("wrapLegacyFetchData", () => {
	it("adapter で変換しつつ legacy fetch をラップする", async () => {
		const fetchData = vi.fn().mockResolvedValue({ items: ["a"], totalCount: 1, filteredCount: 1 });
		const adapter = createDataAdapter<string>({
			resultMapping: { items: "items", total: "totalCount" },
		});
		const wrapped = wrapLegacyFetchData(fetchData, adapter);
		const result = await wrapped(listParams());
		expect(fetchData).toHaveBeenCalledWith({ page: 1, limit: 10 });
		expect(result).toEqual({ items: ["a"], total: 1 });
	});
});

describe("calculatePagination", () => {
	it("総ページ数・前後フラグ・インデックスを算出する", () => {
		expect(calculatePagination(25, 10, 1)).toEqual({
			totalPages: 3,
			hasNext: true,
			hasPrev: false,
			startIndex: 0,
			endIndex: 10,
		});
		expect(calculatePagination(25, 10, 3)).toEqual({
			totalPages: 3,
			hasNext: false,
			hasPrev: true,
			startIndex: 20,
			endIndex: 25,
		});
	});
});
