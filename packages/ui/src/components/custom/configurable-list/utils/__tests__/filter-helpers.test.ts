import { describe, expect, it } from "vitest";
import type { FilterConfig } from "../../types";
import {
	generateOptions,
	generateYearOptions,
	getActiveFilterChips,
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

describe("getActiveFilterChips", () => {
	const configs = {
		category: cfg({
			type: "select",
			showAll: true,
			options: [{ value: "voice", label: "ボイス" }],
		}),
		genres: cfg({
			type: "tags",
			options: [
				{ value: "a", label: "A" },
				{ value: "b", label: "B" },
			],
		}),
		showR18: cfg({ type: "boolean", label: "R18作品表示" }),
	};

	it("非アクティブ（'all'・空配列・デフォルト）はチップを生成しない", () => {
		expect(getActiveFilterChips({ category: "all", genres: [] }, configs)).toEqual([]);
	});

	it("select は1件のチップ・解除先はデフォルト値", () => {
		const chips = getActiveFilterChips({ category: "voice" }, configs);
		expect(chips).toEqual([{ key: "category", label: "ボイス", value: "voice", nextValue: "all" }]);
	});

	it("select で options に無い値はラベルとして値そのものを使う", () => {
		const chips = getActiveFilterChips({ category: "unknown" }, configs);
		expect(chips).toEqual([
			{ key: "category", label: "unknown", value: "unknown", nextValue: "all" },
		]);
	});

	it("tags は選択値ごとに1件・チップは値そのものを表示・解除先は残りの配列", () => {
		const chips = getActiveFilterChips({ genres: ["a", "b"] }, configs);
		expect(chips).toEqual([
			{ key: "genres", label: "a", value: "a", nextValue: ["b"] },
			{ key: "genres", label: "b", value: "b", nextValue: ["a"] },
		]);
	});

	it("tags で最後の1件を解除すると nextValue は undefined（空配列にしない）", () => {
		const chips = getActiveFilterChips({ genres: ["a"] }, configs);
		expect(chips).toEqual([{ key: "genres", label: "a", value: "a", nextValue: undefined }]);
	});

	it("tags のチップは件数注記付き option label ではなく選択値を表示する（ラベルのパースはしない）", () => {
		const countConfigs = {
			genres: cfg({
				type: "tags",
				options: [
					{ value: "ASMR", label: "ASMR (39作品)" },
					{ value: "タグ", label: "タグ (12件)" },
				],
			}),
		};
		const chips = getActiveFilterChips({ genres: ["ASMR", "タグ"] }, countConfigs);
		expect(chips.map((c) => c.label)).toEqual(["ASMR", "タグ"]);
	});

	it("boolean はラベルに config.label を使い、解除先はデフォルト値", () => {
		const chips = getActiveFilterChips({ showR18: true }, configs);
		expect(chips).toEqual([
			{ key: "showR18", label: "R18作品表示", value: true, nextValue: false },
		]);
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
