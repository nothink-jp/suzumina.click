/**
 * `getCircleWorksList` がキャッシュ済みの配列を破壊しないことの回帰テスト（SPR-311）。
 * 理由と再現条件は creator 側の同名テストと同じ。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

vi.mock("@suzumina.click/shared-types", () => ({
	isValidCircleId: (id: string) => /^RG\d{5}$/.test(id),
}));

const loadCircleWorks = vi.fn();
vi.mock("../circle-works-source", () => ({
	loadCircleInfo: vi.fn(),
	loadCircleWorks: (circleId: string) => loadCircleWorks(circleId),
}));

import { getCircleWorksList } from "../actions";

const work = (productId: string, releaseDateISO: string) =>
	({ id: productId, productId, title: productId, releaseDateISO }) as never;

describe("getCircleWorksList のキャッシュ安全性", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("ソートしてもキャッシュ側の配列順を書き換えない", async () => {
		const cached = [work("RJ111111", "2025-01-01"), work("RJ222222", "2025-06-01")];
		const snapshot = [...cached];
		loadCircleWorks.mockResolvedValue(cached);

		const result = await getCircleWorksList({ circleId: "RG12345", sort: "newest" });

		expect(result.works.map((w) => w.productId)).toEqual(["RJ222222", "RJ111111"]);
		expect(cached).toEqual(snapshot);
	});

	it("存在しないサークル（null）と作品0件を区別して空結果を返す", async () => {
		loadCircleWorks.mockResolvedValue(null);
		expect(await getCircleWorksList({ circleId: "RG99999" })).toEqual({
			works: [],
			totalCount: 0,
		});

		loadCircleWorks.mockResolvedValue([]);
		expect(await getCircleWorksList({ circleId: "RG12345" })).toEqual({
			works: [],
			totalCount: 0,
		});
	});

	it("ページ送り・ソートの違いで Firestore を引き直さない", async () => {
		loadCircleWorks.mockResolvedValue([work("RJ111111", "2025-01-01")]);

		await getCircleWorksList({ circleId: "RG12345", page: 1 });
		await getCircleWorksList({ circleId: "RG12345", page: 2, sort: "oldest" });

		expect(loadCircleWorks).toHaveBeenNthCalledWith(1, "RG12345");
		expect(loadCircleWorks).toHaveBeenNthCalledWith(2, "RG12345");
	});
});
