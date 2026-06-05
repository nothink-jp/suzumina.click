import { describe, expect, it, vi } from "vitest";
import { buildWorksQuery } from "../work-query-builder";

// where/orderBy がチェーン可能で、呼び出しを記録する Firestore モック
const makeFirestore = () => {
	const calls: { method: string; args: unknown[] }[] = [];
	const query: Record<string, unknown> = {};
	query.where = vi.fn((...args: unknown[]) => {
		calls.push({ method: "where", args });
		return query;
	});
	query.orderBy = vi.fn((...args: unknown[]) => {
		calls.push({ method: "orderBy", args });
		return query;
	});
	const firestore = { collection: vi.fn(() => query) };
	return { firestore, calls };
};

// biome-ignore lint/suspicious/noExplicitAny: モックを Firestore 型に流し込む
const run = (params: Parameters<typeof buildWorksQuery>[1]) => {
	const { firestore, calls } = makeFirestore();
	buildWorksQuery(firestore as any, params);
	return calls;
};

describe("buildWorksQuery", () => {
	it("works コレクションを参照する", () => {
		const { firestore } = makeFirestore();
		buildWorksQuery(firestore as any, {});
		expect(firestore.collection).toHaveBeenCalledWith("works");
	});

	it("category 指定で where、'all' はスキップ", () => {
		expect(run({ category: "SOU" })).toContainEqual({ method: "where", args: ["category", "==", "SOU"] });
		expect(run({ category: "all" }).some((c) => c.method === "where")).toBe(false);
	});

	it("ageRating は単一指定のときのみ where", () => {
		expect(run({ ageRating: ["18禁"] })).toContainEqual({
			method: "where",
			args: ["ageRating", "==", "18禁"],
		});
		// 複数指定は where しない
		expect(run({ ageRating: ["全年齢", "18禁"] }).some((c) => c.method === "where")).toBe(false);
	});

	it("sort 種別ごとに orderBy を切り替える", () => {
		const orderOf = (sort: string) => run({ sort }).find((c) => c.method === "orderBy")?.args;
		expect(orderOf("oldest")).toEqual(["releaseDateISO", "asc"]);
		expect(orderOf("price_low")).toEqual(["price.current", "asc"]);
		expect(orderOf("price_high")).toEqual(["price.current", "desc"]);
		expect(orderOf("rating")).toEqual(["rating.stars", "desc"]);
		expect(orderOf("popular")).toEqual(["rating.count", "desc"]);
		expect(orderOf("newest")).toEqual(["releaseDateISO", "desc"]); // default
		expect(orderOf("unknown")).toEqual(["releaseDateISO", "desc"]);
	});
});
