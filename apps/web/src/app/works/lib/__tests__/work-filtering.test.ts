import type { WorkDocument } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import {
	type EnhancedSearchParams,
	filterWorksBySearchText,
	filterWorksByUnifiedData,
	needsComplexFiltering,
} from "../work-filtering";

const work = (over: Partial<WorkDocument>): WorkDocument => over as WorkDocument;

const works: WorkDocument[] = [
	work({
		productId: "w1",
		title: "癒しのASMR",
		circle: "C1",
		category: "SOU",
		creators: { voice_by: [{ name: "声優A" }] } as never,
		genres: ["癒し"],
		price: { current: 500 } as never,
		rating: { stars: 4 } as never,
		ageRating: "全年齢",
		highResImageUrl: "http://img/h.jpg",
	}),
	work({
		productId: "w2",
		title: "ゲーム実況",
		circle: "C2",
		category: "GAM",
		creators: { voice_by: [{ name: "声優B" }] } as never,
		genres: ["ゲーム"],
		price: { current: 2000 } as never,
		rating: { stars: 2 } as never,
		ageRating: "18禁",
		highResImageUrl: "",
	}),
];

const ids = (ws: WorkDocument[]) => ws.map((w) => w.productId);

describe("filterWorksBySearchText", () => {
	it("タイトル/サークル/クリエイター名を横断検索（大小無視）", () => {
		expect(ids(filterWorksBySearchText(works, "asmr"))).toEqual(["w1"]);
		expect(ids(filterWorksBySearchText(works, "声優B"))).toEqual(["w2"]);
		expect(ids(filterWorksBySearchText(works, "C1"))).toEqual(["w1"]);
	});
});

describe("filterWorksByUnifiedData", () => {
	const run = (params: EnhancedSearchParams) => ids(filterWorksByUnifiedData(works, params));

	it("category（all はスキップ）", () => {
		expect(run({ category: "SOU" })).toEqual(["w1"]);
		expect(run({ category: "all" })).toEqual(["w1", "w2"]);
	});
	it("search", () => {
		expect(run({ search: "ゲーム" })).toEqual(["w2"]);
	});
	it("voiceActors（部分一致）", () => {
		expect(run({ voiceActors: ["声優A"] })).toEqual(["w1"]);
	});
	it("genres（AND）", () => {
		expect(run({ genres: ["癒し"] })).toEqual(["w1"]);
		expect(run({ genres: ["癒し", "ゲーム"] })).toEqual([]);
	});
	it("priceRange", () => {
		expect(run({ priceRange: { max: 1000 } })).toEqual(["w1"]);
		expect(run({ priceRange: { min: 1000 } })).toEqual(["w2"]);
	});
	it("ratingRange", () => {
		expect(run({ ratingRange: { min: 3 } })).toEqual(["w1"]);
	});
	it("hasHighResImage", () => {
		expect(run({ hasHighResImage: true })).toEqual(["w1"]);
		expect(run({ hasHighResImage: false })).toEqual(["w2"]);
	});
	it("ageRating（特定指定）", () => {
		expect(run({ ageRating: ["18禁"] })).toEqual(["w2"]);
	});
	// language / showR18 の実フィルタロジックは shared-types 側（filterWorksByLanguage /
	// filterR18Content）の責務。ここでは当該分岐が実行され例外なく配列を返すことだけを担保する。
	it("language 指定で当該分岐を通り配列を返す（実フィルタは shared-types の責務）", () => {
		expect(Array.isArray(filterWorksByUnifiedData(works, { language: "ja" }))).toBe(true);
	});
	it("showR18:false で R18 除外分岐を通り配列を返す（実フィルタは shared-types の責務）", () => {
		expect(Array.isArray(filterWorksByUnifiedData(works, { showR18: false }))).toBe(true);
	});
});

describe("needsComplexFiltering", () => {
	it("検索条件があれば true", () => {
		expect(needsComplexFiltering({ search: "x" })).toBe(true);
		expect(needsComplexFiltering({ voiceActors: ["a"] })).toBe(true);
		expect(needsComplexFiltering({ showR18: false })).toBe(true);
	});
	it("条件が無ければ false", () => {
		expect(needsComplexFiltering({})).toBe(false);
		expect(needsComplexFiltering({ category: "SOU" })).toBe(false); // category は対象外
	});
});
