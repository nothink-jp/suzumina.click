import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FilterConfig, StandardListParams } from "../../types";
import { useListHandlers } from "../useListHandlers";

const makeUrlHook = () => ({
	setSearch: vi.fn(),
	setSort: vi.fn(),
	setFilter: vi.fn(),
	setPage: vi.fn(),
	resetFilters: vi.fn(),
	setItemsPerPage: vi.fn(),
});

const filters: Record<string, FilterConfig> = {
	cat: { type: "select" } as FilterConfig,
};

const setup = (urlSync: boolean) => {
	const urlHook = makeUrlHook();
	const setLocalParams = vi.fn();
	const { result } = renderHook(() =>
		useListHandlers({ urlSync, urlHook, setLocalParams, filters }),
	);
	return { result, urlHook, setLocalParams };
};

// setLocalParams に渡された updater を prev に適用して結果を得る
const applyUpdater = (
	setLocalParams: ReturnType<typeof vi.fn>,
	prev: Partial<StandardListParams>,
) => {
	const updater = setLocalParams.mock.calls.at(-1)?.[0] as (
		p: StandardListParams,
	) => StandardListParams;
	return updater(prev as StandardListParams);
};

describe("useListHandlers (urlSync=true)", () => {
	it("各操作は urlHook に委譲する", () => {
		const { result, urlHook, setLocalParams } = setup(true);
		act(() => result.current.handleSearch("q"));
		act(() => result.current.handleSortChange("newest"));
		act(() => result.current.handleFilterChange("cat", "SOU"));
		act(() => result.current.handlePageChange(3));
		act(() => result.current.handleResetFilters());
		act(() => result.current.handleItemsPerPageChange("24"));

		expect(urlHook.setSearch).toHaveBeenCalledWith("q");
		expect(urlHook.setSort).toHaveBeenCalledWith("newest");
		expect(urlHook.setFilter).toHaveBeenCalledWith("cat", "SOU");
		expect(urlHook.setPage).toHaveBeenCalledWith(3);
		expect(urlHook.resetFilters).toHaveBeenCalled();
		expect(urlHook.setItemsPerPage).toHaveBeenCalledWith(24);
		expect(setLocalParams).not.toHaveBeenCalled();
	});
});

describe("useListHandlers (urlSync=false)", () => {
	it("handleSearch / handleSortChange はローカル state を更新", () => {
		const { result, urlHook, setLocalParams } = setup(false);
		act(() => result.current.handleSearch("q"));
		expect(applyUpdater(setLocalParams, { search: "" })).toMatchObject({ search: "q" });
		act(() => result.current.handleSortChange("rating"));
		expect(applyUpdater(setLocalParams, {})).toMatchObject({ sort: "rating" });
		expect(urlHook.setSearch).not.toHaveBeenCalled();
	});

	it("handleFilterChange は filters をマージ", () => {
		const { result, setLocalParams } = setup(false);
		act(() => result.current.handleFilterChange("cat", "SOU"));
		expect(applyUpdater(setLocalParams, { filters: { other: 1 } as never })).toMatchObject({
			filters: { other: 1, cat: "SOU" },
		});
	});

	it("handlePageChange / handleItemsPerPageChange（ページは 1 にリセット）", () => {
		const { result, setLocalParams } = setup(false);
		act(() => result.current.handlePageChange(5));
		expect(applyUpdater(setLocalParams, {})).toMatchObject({ page: 5 });
		act(() => result.current.handleItemsPerPageChange("48"));
		expect(applyUpdater(setLocalParams, {})).toMatchObject({ itemsPerPage: 48, page: 1 });
	});

	it("handleResetFilters は既定フィルタと空検索に戻す", () => {
		const { result, setLocalParams } = setup(false);
		act(() => result.current.handleResetFilters());
		const next = applyUpdater(setLocalParams, { search: "x", filters: { cat: "SOU" } as never });
		expect(next.search).toBe("");
		expect(next.filters).toEqual({ cat: "" }); // select 既定値
	});
});
