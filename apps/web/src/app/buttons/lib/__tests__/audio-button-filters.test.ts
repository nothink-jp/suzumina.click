import type { AudioButton } from "@suzumina.click/shared-types";
import { describe, expect, it, vi } from "vitest";
import {
	applyFilters,
	filterBySearch,
	filterByTags,
	sortAudioButtons,
} from "../audio-button-filters";

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
	it("isPublic を常に where し、videoId 指定で videoId も where", () => {
		const { q, calls } = makeQuery();
		applyFilters(q as never, "vid1");
		expect(calls).toContainEqual({ method: "where", args: ["isPublic", "==", true] });
		expect(calls).toContainEqual({ method: "where", args: ["videoId", "==", "vid1"] });
	});

	it("videoId 無しでも isPublic の where だけは必ず掛ける（SPR-332）", () => {
		const { q, calls } = makeQuery();
		applyFilters(q as never);
		expect(calls).toEqual([{ method: "where", args: ["isPublic", "==", true] }]);
	});
});

describe("filterBySearch", () => {
	const buttons = [
		button({ buttonText: "おはよう", tags: ["挨拶"] }),
		button({ buttonText: "Good night" }),
	];
	it("buttonText を大小無視で部分一致", () => {
		expect(filterBySearch(buttons, "おは")[0]?.buttonText).toBe("おはよう");
		expect(filterBySearch(buttons, "night")).toHaveLength(1);
		expect(filterBySearch(buttons, "NIGHT")).toHaveLength(1); // 大文字でもヒット（大小無視の実証）
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

describe("sortAudioButtons", () => {
	const stats = (playCount: number, likeCount: number) =>
		({ playCount, likeCount }) as AudioButton["stats"];
	const buttons = [
		button({ id: "b", createdAt: "2024-01-02T00:00:00Z", stats: stats(1, 5) }),
		button({ id: "a", createdAt: "2024-01-01T00:00:00Z", stats: stats(9, 5) }),
		button({ id: "c", createdAt: "2024-01-03T00:00:00Z", stats: stats(1, 0) }),
	];
	const ids = (sortBy: Parameters<typeof sortAudioButtons>[1]) =>
		sortAudioButtons(buttons, sortBy).map((b) => b.id);

	it("sortBy ごとの並び順を返し、同値は id 昇順", () => {
		expect(ids("newest")).toEqual(["c", "b", "a"]);
		expect(ids("oldest")).toEqual(["a", "b", "c"]);
		expect(ids("mostPlayed")).toEqual(["a", "b", "c"]);
		expect(ids("popular")).toEqual(["a", "b", "c"]);
	});

	it("入力（キャッシュ共有されうる配列）を破壊しない", () => {
		sortAudioButtons(buttons, "oldest");
		expect(buttons.map((b) => b.id)).toEqual(["b", "a", "c"]);
	});
});
