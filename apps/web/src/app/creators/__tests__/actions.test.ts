/**
 * `/creators` 一覧の絞り込み・並べ替え・ページ送り（SPR-311）。
 *
 * 旧実装は `unstable_cache` が引数を自動でキー化する性質により、
 * page / sort / search / role の組み合わせごとに別エントリ＝別の全件スキャンになっていた。
 * ここで守りたいのは **キャッシュ境界が引数を取らないこと**（組み合わせ爆発を起こさないこと）と、
 * 共有される配列を破壊的に並べ替えないこと。どちらも壊れても表示は正しいままで、課金だけが悪化する。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

const loadAllCreators = vi.fn();
vi.mock("../creators-source", () => ({
	loadAllCreators: () => loadAllCreators(),
}));

import { getCreators } from "../actions";

const creator = (
	id: string,
	name: string,
	workCount: number,
	types: string[] = ["voiceActor"],
) => ({
	id,
	name,
	types,
	workCount,
});

const SAMPLE = [
	creator("C1", "あさひ", 5, ["voiceActor"]),
	creator("C2", "いろは", 20, ["scenario"]),
	creator("C3", "うみ", 1, ["voiceActor", "illustration"]),
];

describe("getCreators", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		loadAllCreators.mockResolvedValue(SAMPLE);
	});

	it("キャッシュ境界は引数を取らない（params の組み合わせでエントリが増えない）", async () => {
		await getCreators({ page: 1, sort: "name" });
		await getCreators({ page: 7, sort: "workCount", search: "あ", role: "scenario", limit: 48 });

		expect(loadAllCreators).toHaveBeenCalledTimes(2);
		// 引数ゼロ＝呼び出しごとに同じキャッシュエントリを共有する
		for (const call of loadAllCreators.mock.calls) {
			expect(call).toEqual([]);
		}
	});

	it("並べ替えてもキャッシュ側の配列順を書き換えない", async () => {
		const snapshot = [...SAMPLE];

		const result = await getCreators({ sort: "workCount" });

		expect(result.creators.map((c) => c.id)).toEqual(["C2", "C1", "C3"]);
		expect(SAMPLE).toEqual(snapshot);
	});

	it("role で絞り込む", async () => {
		const result = await getCreators({ role: "voiceActor" });
		expect(result.creators.map((c) => c.id)).toEqual(["C1", "C3"]);
		expect(result.totalCount).toBe(2);
	});

	it("role=all は絞り込まない", async () => {
		const result = await getCreators({ role: "all" });
		expect(result.totalCount).toBe(3);
	});

	it("名前で検索する（大文字小文字を無視）", async () => {
		loadAllCreators.mockResolvedValue([creator("C9", "Minase", 3)]);
		const result = await getCreators({ search: "minase" });
		expect(result.creators.map((c) => c.id)).toEqual(["C9"]);
	});

	it("作品数が同数なら名前順で安定させる", async () => {
		loadAllCreators.mockResolvedValue([creator("B", "いろは", 4), creator("A", "あさひ", 4)]);
		const result = await getCreators({ sort: "workCount" });
		expect(result.creators.map((c) => c.id)).toEqual(["A", "B"]);
	});

	it("ページ送りは絞り込み後の並びに対して効く", async () => {
		const result = await getCreators({ page: 2, limit: 2, sort: "name" });
		// 名前順は あさひ(C1) / いろは(C2) / うみ(C3)
		expect(result.creators.map((c) => c.id)).toEqual(["C3"]);
		expect(result.totalCount).toBe(3);
	});

	it("取得失敗は空結果に畳む（ページを落とさない）", async () => {
		loadAllCreators.mockRejectedValue(new Error("Firestore error"));
		expect(await getCreators({})).toEqual({ creators: [], totalCount: 0 });
	});
});
