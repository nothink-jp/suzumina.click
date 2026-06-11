import type { WorkPlainObject } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { compareWorks, searchWorks } from "../circle-creator-works";

const work = (overrides: Partial<WorkPlainObject>): WorkPlainObject =>
	({
		productId: "RJ000000",
		title: "",
		description: "",
		releaseDateISO: undefined,
		registDate: undefined,
		rating: undefined,
		price: undefined,
		genres: [],
		customGenres: [],
		creators: { voiceActors: [] },
		...overrides,
	}) as unknown as WorkPlainObject;

describe("circle-creator-works compareWorks", () => {
	it("newest: releaseDateISO 降順", () => {
		const a = work({ productId: "RJ1", releaseDateISO: "2025-01-01" });
		const b = work({ productId: "RJ2", releaseDateISO: "2025-02-01" });
		expect([a, b].sort((x, y) => compareWorks(x, y, "newest"))[0]).toBe(b);
	});

	it("oldest: releaseDateISO 昇順", () => {
		const a = work({ productId: "RJ1", releaseDateISO: "2025-01-01" });
		const b = work({ productId: "RJ2", releaseDateISO: "2025-02-01" });
		expect([b, a].sort((x, y) => compareWorks(x, y, "oldest"))[0]).toBe(a);
	});

	it("releaseDateISO 欠落時は registDate にフォールバックする", () => {
		const a = work({ productId: "RJ1", registDate: "2025-01-01" });
		const b = work({ productId: "RJ2", registDate: "2025-02-01" });
		// newest 降順 → registDate が新しい b が先頭
		expect([a, b].sort((x, y) => compareWorks(x, y, "newest"))[0]).toBe(b);
	});

	it("popular: rating.stars 降順（count ではない）", () => {
		const a = work({ productId: "RJ1", rating: { stars: 3, count: 999 } as never });
		const b = work({ productId: "RJ2", rating: { stars: 5, count: 1 } as never });
		expect([a, b].sort((x, y) => compareWorks(x, y, "popular"))[0]).toBe(b);
	});

	it("price_low / price_high", () => {
		const cheap = work({ productId: "RJ1", price: { current: 100 } as never });
		const pricey = work({ productId: "RJ2", price: { current: 999 } as never });
		expect([pricey, cheap].sort((x, y) => compareWorks(x, y, "price_low"))[0]).toBe(cheap);
		expect([cheap, pricey].sort((x, y) => compareWorks(x, y, "price_high"))[0]).toBe(pricey);
	});
});

describe("circle-creator-works searchWorks", () => {
	const works = [
		work({ productId: "RJ1", title: "魔法少女の冒険" }),
		work({ productId: "RJ2", description: "勇者の物語", title: "別作品" }),
		work({ productId: "RJ3", creators: { voiceActors: [{ id: "c", name: "田中" }] } as never }),
		work({ productId: "RJ4", genres: ["ファンタジー"] }),
	];

	it("検索なしは全件・count undefined", () => {
		expect(searchWorks(works)).toEqual({ filtered: works });
	});

	it("タイトル / 説明 / 声優名 / ジャンルを横断検索する", () => {
		expect(searchWorks(works, "魔法").filtered.map((w) => w.productId)).toEqual(["RJ1"]);
		expect(searchWorks(works, "勇者").filtered.map((w) => w.productId)).toEqual(["RJ2"]);
		expect(searchWorks(works, "田中").filtered.map((w) => w.productId)).toEqual(["RJ3"]);
		expect(searchWorks(works, "ファンタジー").filtered.map((w) => w.productId)).toEqual(["RJ4"]);
	});

	it("ヒット時は count を返す", () => {
		expect(searchWorks(works, "作品").count).toBe(1);
	});
});
