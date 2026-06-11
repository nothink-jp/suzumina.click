import { describe, expect, it } from "vitest";
import type { FilterConfig } from "../../types";
import {
	generateOptions,
	generateYearOptions,
	getDefaultFilterValues,
	hasActiveFilters,
	normalizeOptions,
	transformFilterValue,
} from "../filter-helpers";

const cfg = (over: Partial<FilterConfig> & { type: FilterConfig["type"] }): FilterConfig =>
	over as FilterConfig;

describe("transformFilterValue", () => {
	it("showAll かつ 'all' は emptyValue（既定 undefined）に変換", () => {
		expect(transformFilterValue("all", cfg({ type: "select", showAll: true }))).toBeUndefined();
		expect(
			transformFilterValue("all", cfg({ type: "select", showAll: true, emptyValue: "" })),
		).toBe("");
	});

	it("tags/multiselect の空配列は undefined", () => {
		expect(transformFilterValue([], cfg({ type: "tags" }))).toBeUndefined();
		expect(transformFilterValue([], cfg({ type: "multiselect" }))).toBeUndefined();
	});

	it("その他はそのまま返す", () => {
		expect(transformFilterValue("x", cfg({ type: "select" }))).toBe("x");
		expect(transformFilterValue(["a"], cfg({ type: "tags" }))).toEqual(["a"]);
	});
});

describe("normalizeOptions", () => {
	it("空配列はそのまま", () => {
		expect(normalizeOptions([])).toEqual([]);
	});
	it("文字列配列はオブジェクト化", () => {
		expect(normalizeOptions(["a", "b"])).toEqual([
			{ value: "a", label: "a" },
			{ value: "b", label: "b" },
		]);
	});
	it("オブジェクト配列はそのまま", () => {
		const opts = [{ value: "v", label: "L" }];
		expect(normalizeOptions(opts)).toBe(opts);
	});
});

describe("generateOptions", () => {
	it("select/multiselect/tags 以外は空配列", () => {
		expect(generateOptions(cfg({ type: "range" }))).toEqual([]);
	});
	it("select + showAll は 'すべて' を先頭に付与", () => {
		const r = generateOptions(cfg({ type: "select", showAll: true, options: ["a"] }));
		expect(r[0]).toEqual({ value: "all", label: "すべて" });
		expect(r[1]).toEqual({ value: "a", label: "a" });
	});
	it("showAll なしは baseOptions のみ", () => {
		expect(generateOptions(cfg({ type: "multiselect", options: ["a"] }))).toEqual([
			{ value: "a", label: "a" },
		]);
	});
});

describe("getDefaultFilterValues", () => {
	it("型ごとの既定値・defaultValue 優先", () => {
		const defaults = getDefaultFilterValues({
			s: cfg({ type: "select", showAll: true }),
			s2: cfg({ type: "select" }),
			b: cfg({ type: "boolean" }),
			t: cfg({ type: "tags" }),
			r: cfg({ type: "range" }),
			d: cfg({ type: "date" }),
			dr: cfg({ type: "dateRange" }),
			ov: cfg({ type: "select", defaultValue: "x" }),
		});
		expect(defaults.s).toBe("all");
		expect(defaults.s2).toBe("");
		expect(defaults.b).toBe(false);
		expect(defaults.t).toEqual([]);
		expect(defaults.r).toEqual({ min: undefined, max: undefined });
		expect(defaults.d).toBeUndefined();
		expect(defaults.dr).toEqual({ start: undefined, end: undefined });
		expect(defaults.ov).toBe("x");
	});
});

describe("hasActiveFilters", () => {
	const configs = {
		sel: cfg({ type: "select", showAll: true }),
		tags: cfg({ type: "tags" }),
		rng: cfg({ type: "range" }),
	};

	it("'all'・空配列・デフォルトは非アクティブ", () => {
		expect(hasActiveFilters({ sel: "all", tags: [] }, configs)).toBe(false);
	});

	it("値が入っていればアクティブ", () => {
		expect(hasActiveFilters({ tags: ["a"] }, configs)).toBe(true);
	});

	it("range は min/max いずれか指定でアクティブ", () => {
		expect(hasActiveFilters({ rng: { min: undefined, max: undefined } }, configs)).toBe(false);
		expect(hasActiveFilters({ rng: { min: 1 } }, configs)).toBe(true);
	});

	it("未知キーは無視", () => {
		expect(hasActiveFilters({ unknown: "x" }, configs)).toBe(false);
	});
});

describe("generateYearOptions", () => {
	it("endYear から startYear まで降順", () => {
		expect(generateYearOptions(2020, 2022)).toEqual([
			{ value: "2022", label: "2022年" },
			{ value: "2021", label: "2021年" },
			{ value: "2020", label: "2020年" },
		]);
	});
});
