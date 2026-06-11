import type { WorkDocument } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { sortWorks } from "../work-sorting";

const work = (over: Partial<WorkDocument>): WorkDocument => over as WorkDocument;

const a = work({
	productId: "a",
	releaseDateISO: "2024-01-01",
	price: { current: 300 } as never,
	rating: { stars: 4, count: 10 } as never,
});
const b = work({
	productId: "b",
	releaseDateISO: "2024-06-01",
	price: { current: 100 } as never,
	rating: { stars: 5, count: 2 } as never,
});
const c = work({
	productId: "c",
	releaseDateISO: "2023-01-01",
	price: { current: 200 } as never,
	rating: { stars: 3, count: 50 } as never,
});

const ids = (works: WorkDocument[]) => works.map((w) => w.productId);

describe("sortWorks", () => {
	const items = [a, b, c];

	it("newest（既定）は新しい順", () => {
		expect(ids(sortWorks(items, "newest"))).toEqual(["b", "a", "c"]);
		expect(ids(sortWorks(items, "unknown"))).toEqual(["b", "a", "c"]); // default
	});
	it("oldest は古い順", () => {
		expect(ids(sortWorks(items, "oldest"))).toEqual(["c", "a", "b"]);
	});
	it("price_low / price_high", () => {
		expect(ids(sortWorks(items, "price_low"))).toEqual(["b", "c", "a"]);
		expect(ids(sortWorks(items, "price_high"))).toEqual(["a", "c", "b"]);
	});
	it("rating（星）/ popular（評価数）", () => {
		expect(ids(sortWorks(items, "rating"))).toEqual(["b", "a", "c"]);
		expect(ids(sortWorks(items, "popular"))).toEqual(["c", "a", "b"]);
	});
	it("元配列を破壊しない", () => {
		sortWorks(items, "oldest");
		expect(ids(items)).toEqual(["a", "b", "c"]);
	});
	it("欠落フィールドは既定値で扱う", () => {
		const r = sortWorks([work({ productId: "x" }), b], "price_low");
		expect(r[0]?.productId).toBe("x"); // price 無し → 0 で最安
	});
});
