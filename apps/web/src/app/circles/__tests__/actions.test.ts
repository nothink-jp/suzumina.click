/**
 * `/circles` 一覧の絞り込み・並べ替え・ページ送り（SPR-311）。
 * 守りたい不変条件は creator 側の同名テストと同じ。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

const loadAllCircles = vi.fn();
vi.mock("../circles-source", () => ({
	loadAllCircles: () => loadAllCircles(),
}));

import { getCircles } from "../actions";

const circle = (circleId: string, name: string, workCount: number, nameEn?: string) =>
	({ circleId, name, nameEn, workCount }) as never;

const SAMPLE = [
	circle("RG1", "あさひ堂", 5, "Asahido"),
	circle("RG2", "いろは社", 20),
	circle("RG3", "うみ工房", 1),
];

describe("getCircles", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		loadAllCircles.mockResolvedValue(SAMPLE);
	});

	it("キャッシュ境界は引数を取らない（params の組み合わせでエントリが増えない）", async () => {
		await getCircles({ page: 1, sort: "name" });
		await getCircles({ page: 5, sort: "workCount", search: "あ", limit: 48 });

		expect(loadAllCircles).toHaveBeenCalledTimes(2);
		for (const call of loadAllCircles.mock.calls) {
			expect(call).toEqual([]);
		}
	});

	it("並べ替えてもキャッシュ側の配列順を書き換えない", async () => {
		const snapshot = [...SAMPLE];

		const result = await getCircles({ sort: "workCount" });

		expect(result.circles.map((c) => c.circleId)).toEqual(["RG2", "RG1", "RG3"]);
		expect(SAMPLE).toEqual(snapshot);
	});

	it("英語名でも検索できる", async () => {
		const result = await getCircles({ search: "asahi" });
		expect(result.circles.map((c) => c.circleId)).toEqual(["RG1"]);
		expect(result.totalCount).toBe(1);
	});

	it("ページ送りは絞り込み後の並びに対して効く", async () => {
		const result = await getCircles({ page: 2, limit: 2, sort: "name" });
		expect(result.circles.map((c) => c.circleId)).toEqual(["RG3"]);
		expect(result.totalCount).toBe(3);
	});

	it("取得失敗は空結果に畳む（ページを落とさない）", async () => {
		loadAllCircles.mockRejectedValue(new Error("Firestore error"));
		expect(await getCircles({})).toEqual({ circles: [], totalCount: 0 });
	});
});
