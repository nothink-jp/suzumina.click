import type { AudioButton } from "@suzumina.click/shared-types";
import { describe, expect, it, vi } from "vitest";
import { applyFilters, applySorting, filterBySearch, filterByTags } from "../audio-button-filters";

const makeQuery = () => {
	const calls: { method: string; args: unknown[] }[] = [];
	const q: Record<string, unknown> = {};
	q.where = vi.fn((...a: unknown[]) => {
		calls.push({ method: "where", args: a });
		return q;
	});
	q.orderBy = vi.fn((...a: unknown[]) => {
		calls.push({ method: "orderBy", args: a });
		return q;
	});
	return { q, calls };
};

const button = (over: Partial<AudioButton>): AudioButton => over as AudioButton;

describe("applyFilters", () => {
	it("onlyPublic で isPublic、videoId 指定で videoId を where", () => {
		const { q, calls } = makeQuery();
		applyFilters(q as never, true, "vid1");
		expect(calls).toContainEqual({ method: "where", args: ["isPublic", "==", true] });
		expect(calls).toContainEqual({ method: "where", args: ["videoId", "==", "vid1"] });
	});

	it("onlyPublic=false・videoId 無しは where を呼ばない", () => {
		const { q, calls } = makeQuery();
		applyFilters(q as never, false);
		expect(calls).toHaveLength(0);
	});
});

describe("applySorting", () => {
	it("sortBy 種別ごとに orderBy を切り替える", () => {
		const orderOf = (sortBy: Parameters<typeof applySorting>[1]) => {
			const { q, calls } = makeQuery();
			applySorting(q as never, sortBy);
			return calls.find((c) => c.method === "orderBy")?.args;
		};
		expect(orderOf("newest")).toEqual(["createdAt", "desc"]);
		expect(orderOf("oldest")).toEqual(["createdAt", "asc"]);
		expect(orderOf("popular")).toEqual(["stats.likeCount", "desc"]);
		expect(orderOf("mostPlayed")).toEqual(["stats.playCount", "desc"]);
	});
});

describe("filterBySearch", () => {
	const buttons = [
		button({ buttonText: "おはよう", description: "朝の挨拶" }),
		button({ buttonText: "Good night", description: undefined }),
	];
	it("buttonText / description を大小無視で部分一致", () => {
		expect(filterBySearch(buttons, "おは")).toHaveLength(1);
		expect(filterBySearch(buttons, "night")).toHaveLength(1);
		expect(filterBySearch(buttons, "NIGHT")).toHaveLength(1); // 大文字でもヒット（大小無視の実証）
		expect(filterBySearch(buttons, "挨拶")[0]?.buttonText).toBe("おはよう");
		expect(filterBySearch(buttons, "該当なし")).toHaveLength(0);
	});
});

describe("filterByTags", () => {
	it("AND 検索・完全/大小無視/トリム一致", () => {
		const buttons = [
			button({ buttonText: "a", tags: ["挨拶", "Morning"] }),
			button({ buttonText: "b", tags: ["夜"] }),
			button({ buttonText: "c", tags: [] }),
		];
		expect(filterByTags(buttons, ["挨拶"]).map((b) => b.buttonText)).toEqual(["a"]);
		// 大文字小文字無視
		expect(filterByTags(buttons, ["morning"]).map((b) => b.buttonText)).toEqual(["a"]);
		// AND（両方持つもののみ）
		expect(filterByTags(buttons, ["挨拶", "Morning"]).map((b) => b.buttonText)).toEqual(["a"]);
		// タグ無しは除外
		expect(filterByTags(buttons, ["挨拶", "夜"])).toHaveLength(0);
	});
});
