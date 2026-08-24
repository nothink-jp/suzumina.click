import { describe, expect, it, vi } from "vitest";
import { buildNonR18WorksQuery, buildWorksQuery } from "../work-query-builder";

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
		expect(run({ category: "SOU" })).toContainEqual({
			method: "where",
			args: ["category", "==", "SOU"],
		});
		expect(run({ category: "all" }).some((c) => c.method === "where")).toBe(false);
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

describe("buildNonR18WorksQuery", () => {
	const runNonR18 = (params: Parameters<typeof buildNonR18WorksQuery>[1]) => {
		const { firestore, calls } = makeFirestore();
		buildNonR18WorksQuery(firestore as any, params);
		return calls;
	};

	it("非 R18 の ageRating だけを in で絞る", () => {
		expect(runNonR18({})).toContainEqual({
			method: "where",
			args: ["ageRating", "in", ["全年齢", "R15"]],
		});
	});

	it("orderBy を付けない（複合インデックス不要を維持するため）", () => {
		// ここが崩れると `in` + `orderBy` になり FAILED_PRECONDITION で一覧が 0 件になる。
		// 並び替えは呼び出し側が in-memory の sortWorks で行うので Firestore 側は不要（SPR-321）。
		expect(runNonR18({}).some((c) => c.method === "orderBy")).toBe(false);
		expect(runNonR18({ category: "SOU" }).some((c) => c.method === "orderBy")).toBe(false);
	});

	it("category 指定で where を足し、'all' はスキップ", () => {
		expect(runNonR18({ category: "SOU" })).toContainEqual({
			method: "where",
			args: ["category", "==", "SOU"],
		});
		expect(runNonR18({ category: "all" }).filter((c) => c.method === "where")).toHaveLength(1);
	});
});
