import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FilterConfig } from "../../types";
import { useListUrl } from "../useListUrl";

// useSearchParams を可変ホルダー経由でモック
const h = vi.hoisted(() => ({ sp: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
	useSearchParams: () => h.sp,
}));

const setSP = (qs: string) => {
	h.sp = new URLSearchParams(qs);
};

// 最後に pushState されたURLのクエリを返す
const lastPushedParams = (spy: ReturnType<typeof vi.spyOn>) => {
	const url = spy.mock.calls.at(-1)?.[2] as string;
	const qs = url.includes("?") ? url.split("?")[1] : "";
	return new URLSearchParams(qs);
};

const filters: Record<string, FilterConfig> = {
	genre: { type: "select", showAll: true } as FilterConfig,
	tags: { type: "tags" } as FilterConfig,
	flag: { type: "boolean" } as FilterConfig,
	price: { type: "range" } as FilterConfig,
	period: { type: "dateRange" } as FilterConfig,
};

let pushSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	setSP("");
	pushSpy = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
	vi.spyOn(window, "dispatchEvent").mockImplementation(() => true);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useListUrl: URL 解析", () => {
	it("既定値（page=1/limit=defaultPageSize/sort=defaultSort）", () => {
		const { result } = renderHook(() => useListUrl({ defaultPageSize: 24, defaultSort: "newest" }));
		expect(result.current.params.page).toBe(1);
		expect(result.current.params.itemsPerPage).toBe(24);
		expect(result.current.params.sort).toBe("newest");
		expect(result.current.params.search).toBe("");
	});

	it("基本パラメータを解析する", () => {
		setSP("page=3&limit=50&sort=rating&q=word");
		const { result } = renderHook(() => useListUrl());
		expect(result.current.params).toMatchObject({
			page: 3,
			itemsPerPage: 50,
			sort: "rating",
			search: "word",
		});
	});

	it("フィルターを型ごとに解析する", () => {
		setSP("tags=a|b&flag=true&price=10-20&period=2024-01-01~2024-02-01&genre=SOU");
		const { result } = renderHook(() => useListUrl({ filters }));
		const f = result.current.params.filters;
		expect(f.tags).toEqual(["a", "b"]);
		expect(f.flag).toBe(true);
		expect(f.price).toEqual({ min: 10, max: 20 });
		expect(f.period).toEqual({ start: "2024-01-01", end: "2024-02-01" });
		expect(f.genre).toBe("SOU");
	});

	it("tags の旧カンマ形式も解析する", () => {
		setSP("tags=x,y");
		const { result } = renderHook(() => useListUrl({ filters }));
		expect(result.current.params.filters.tags).toEqual(["x", "y"]);
	});
});

describe("useListUrl: setter（pushState）", () => {
	it("setPage は page を設定、1 は既定で削除", () => {
		const { result } = renderHook(() => useListUrl({ filters }));
		act(() => result.current.setPage(4));
		expect(lastPushedParams(pushSpy).get("page")).toBe("4");
		act(() => result.current.setPage(1));
		expect(lastPushedParams(pushSpy).get("page")).toBeNull();
	});

	it("setSearch は q を設定しページを 1 に戻す（page は URL から消える）", () => {
		setSP("page=5");
		const { result } = renderHook(() => useListUrl({ filters }));
		act(() => result.current.setSearch("kw"));
		const p = lastPushedParams(pushSpy);
		expect(p.get("q")).toBe("kw");
		expect(p.get("page")).toBeNull();
	});

	it("setSort は sort を設定しページを 1 に戻す（page は URL から消える）", () => {
		setSP("page=3");
		const { result } = renderHook(() => useListUrl({ filters }));
		act(() => result.current.setSort("rating"));
		const p = lastPushedParams(pushSpy);
		expect(p.get("sort")).toBe("rating");
		expect(p.get("page")).toBeNull();
	});

	it("setFilter: 配列はパイプ結合、range はハイフン結合、boolean は文字列化", () => {
		const { result } = renderHook(() => useListUrl({ filters }));
		act(() => result.current.setFilter("tags", ["a", "b"]));
		expect(lastPushedParams(pushSpy).get("tags")).toBe("a|b");
		act(() => result.current.setFilter("price", { min: 5, max: 9 }));
		expect(lastPushedParams(pushSpy).get("price")).toBe("5-9");
		act(() => result.current.setFilter("flag", true));
		expect(lastPushedParams(pushSpy).get("flag")).toBe("true");
	});

	it("setFilter: 'all'（showAll）はURLから除外", () => {
		const { result } = renderHook(() => useListUrl({ filters }));
		act(() => result.current.setFilter("genre", "all"));
		expect(lastPushedParams(pushSpy).get("genre")).toBeNull();
	});

	it("resetFilters は既存フィルターを削除する", () => {
		setSP("tags=a|b&flag=true");
		const { result } = renderHook(() => useListUrl({ filters }));
		act(() => result.current.resetFilters());
		const p = lastPushedParams(pushSpy);
		expect(p.get("tags")).toBeNull();
		expect(p.get("flag")).toBeNull();
	});
});
