/**
 * `getCreatorWorksList` がキャッシュ済みの配列を破壊しないことの回帰テスト（SPR-311）。
 *
 * `loadCreatorWorks` の戻り値は `use cache` 越しに**複数リクエストで共有される**。
 * `searchWorks` は検索語が無いと入力配列をそのまま返すため、その結果を `.sort()` すると
 * 共有されている配列そのものを並べ替えてしまい、以降の全リクエストのページ送りが
 * 直前の誰かのソート順に引きずられる。本番でしか起きず、再現条件も掴みにくい類の壊れ方。
 *
 * 実 Firestore 経路のテストでは `use cache` が no-op になり配列が毎回作り直されるため
 * この不具合は再現しない。ここでは source をモックして不変条件だけを直接固定する。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

vi.mock("@suzumina.click/shared-types", () => ({
	isValidCreatorId: (id: string) => /^[A-Z]{2}\d{5,7}$/.test(id),
}));

const loadCreatorWorks = vi.fn();
vi.mock("../creator-works-source", () => ({
	loadCreatorInfo: vi.fn(),
	loadCreatorWorks: (creatorId: string) => loadCreatorWorks(creatorId),
}));

import { getCreatorWorksList } from "../actions";

const work = (productId: string, releaseDateISO: string) =>
	({ id: productId, productId, title: productId, releaseDateISO }) as never;

describe("getCreatorWorksList のキャッシュ安全性", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("ソートしてもキャッシュ側の配列順を書き換えない", async () => {
		const cached = [work("RJ111111", "2025-01-01"), work("RJ222222", "2025-06-01")];
		const snapshot = [...cached];
		loadCreatorWorks.mockResolvedValue(cached);

		const result = await getCreatorWorksList({ creatorId: "VA12345", sort: "newest" });

		// 返り値は新しい順に並ぶが…
		expect(result.works.map((w) => w.productId)).toEqual(["RJ222222", "RJ111111"]);
		// …キャッシュ側は元の順のまま
		expect(cached).toEqual(snapshot);
	});

	it("検索語ありでもキャッシュ側の配列順を書き換えない", async () => {
		const cached = [work("RJ111111", "2025-01-01"), work("RJ222222", "2025-06-01")];
		const snapshot = [...cached];
		loadCreatorWorks.mockResolvedValue(cached);

		await getCreatorWorksList({ creatorId: "VA12345", sort: "newest", search: "RJ" });

		expect(cached).toEqual(snapshot);
	});

	it("存在しないクリエイター（null）と作品0件を区別して空結果を返す", async () => {
		loadCreatorWorks.mockResolvedValue(null);
		expect(await getCreatorWorksList({ creatorId: "VA99999" })).toEqual({
			works: [],
			totalCount: 0,
		});

		loadCreatorWorks.mockResolvedValue([]);
		expect(await getCreatorWorksList({ creatorId: "VA12345" })).toEqual({
			works: [],
			totalCount: 0,
		});
	});

	it("ページ送り・ソートの違いで Firestore を引き直さない", async () => {
		loadCreatorWorks.mockResolvedValue([work("RJ111111", "2025-01-01")]);

		await getCreatorWorksList({ creatorId: "VA12345", page: 1 });
		await getCreatorWorksList({ creatorId: "VA12345", page: 2, sort: "oldest" });

		// ページ番号・ソート・検索語はキャッシュキーに入らない＝同じ引数で呼ばれる
		expect(loadCreatorWorks).toHaveBeenCalledTimes(2);
		expect(loadCreatorWorks).toHaveBeenNthCalledWith(1, "VA12345");
		expect(loadCreatorWorks).toHaveBeenNthCalledWith(2, "VA12345");
	});
});
