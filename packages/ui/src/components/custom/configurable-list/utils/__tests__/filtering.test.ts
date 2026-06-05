import { describe, expect, it } from "vitest";
import type { FilterConfig } from "../../types";
import { applyCustomFilters, applySearchFilter } from "../filtering";

const cfg = (over: Partial<FilterConfig> & { type: FilterConfig["type"] }): FilterConfig =>
	over as FilterConfig;

describe("applySearchFilter", () => {
	const items = [{ title: "Apple pie" }, { title: "Banana" }];

	it("search/searchable が無効ならそのまま返す", () => {
		expect(applySearchFilter(items, undefined, true)).toBe(items);
		expect(applySearchFilter(items, "a", false)).toBe(items);
	});

	it("大文字小文字を無視して部分一致で絞り込む", () => {
		expect(applySearchFilter(items, "apple", true)).toEqual([{ title: "Apple pie" }]);
	});

	it("検索対象テキストが無い項目は除外", () => {
		expect(applySearchFilter([{ foo: 1 }] as never, "a", true)).toEqual([]);
	});
});

describe("applyCustomFilters", () => {
	it("未設定キー・空文字・変換結果 undefined はスキップ", () => {
		const items = [{ kind: "a" }, { kind: "b" }];
		const r = applyCustomFilters(
			items,
			{ kind: "", unknown: "x", tags: [] },
			{ kind: cfg({ type: "select" }), tags: cfg({ type: "tags" }) },
		);
		expect(r).toEqual(items); // すべてスキップされ全件
	});

	it("multiselect/tags: 配列の交差で絞り込む", () => {
		const items = [{ tags: ["x", "y"] }, { tags: ["z"] }];
		const r = applyCustomFilters(items, { tags: ["x"] }, { tags: cfg({ type: "tags" }) });
		expect(r).toEqual([{ tags: ["x", "y"] }]);
	});

	it("range: min/max で絞り込む", () => {
		const items = [{ score: 5 }, { score: 15 }];
		const r = applyCustomFilters(items, { score: { min: 10 } }, { score: cfg({ type: "range" }) });
		expect(r).toEqual([{ score: 15 }]);
	});

	it("boolean: 真偽一致で絞り込む", () => {
		const items = [{ active: true }, { active: false }];
		const r = applyCustomFilters(items, { active: true }, { active: cfg({ type: "boolean" }) });
		expect(r).toEqual([{ active: true }]);
	});

	it("select(default): 等値一致で絞り込む", () => {
		const items = [{ kind: "a" }, { kind: "b" }];
		const r = applyCustomFilters(items, { kind: "a" }, { kind: cfg({ type: "select" }) });
		expect(r).toEqual([{ kind: "a" }]);
	});
});
