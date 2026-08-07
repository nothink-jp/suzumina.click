import { describe, expect, it, vi } from "vitest";
import { fetchWorksByIds } from "../fetch-works-by-ids";

/**
 * `firestore.getAll(...refs)` を、存在する ID だけスナップショットを返すように模したモック。
 * 呼び出しごとの ref 数を記録し、バッチ分割の検証に使う。
 */
function createFirestoreMock(existingIds: string[]) {
	const existing = new Set(existingIds);
	const batchSizes: number[] = [];

	const getAll = vi.fn((...refs: { id: string }[]) => {
		batchSizes.push(refs.length);
		return Promise.resolve(
			refs.map((ref) => ({
				exists: existing.has(ref.id),
				id: ref.id,
				data: () => ({ productId: ref.id, title: `作品${ref.id}` }),
			})),
		);
	});

	const firestore = {
		collection: vi.fn(() => ({ doc: (id: string) => ({ id }) })),
		getAll,
	} as unknown as FirebaseFirestore.Firestore;

	return { firestore, getAll, batchSizes };
}

describe("fetchWorksByIds", () => {
	it("ID を渡すと WorkDocument を入力順で返す", async () => {
		const { firestore } = createFirestoreMock(["RJ111111", "RJ222222", "RJ333333"]);

		const works = await fetchWorksByIds(firestore, ["RJ333333", "RJ111111", "RJ222222"]);

		expect(works.map((work) => work.id)).toEqual(["RJ333333", "RJ111111", "RJ222222"]);
		expect(works[0]?.productId).toBe("RJ333333");
	});

	it("doc.id を id として埋める（サブコレクション由来の ID をそのまま使えるように）", async () => {
		const { firestore } = createFirestoreMock(["RJ111111"]);

		const works = await fetchWorksByIds(firestore, ["RJ111111"]);

		expect(works[0]?.id).toBe("RJ111111");
	});

	it("存在しない ID は黙って除外する", async () => {
		const { firestore } = createFirestoreMock(["RJ111111"]);

		const works = await fetchWorksByIds(firestore, ["RJ000000", "RJ111111", "RJ999999"]);

		expect(works.map((work) => work.id)).toEqual(["RJ111111"]);
	});

	it("空配列なら Firestore に触らない", async () => {
		const { firestore, getAll } = createFirestoreMock([]);

		const works = await fetchWorksByIds(firestore, []);

		expect(works).toEqual([]);
		expect(getAll).not.toHaveBeenCalled();
	});

	it("300件までは 1 回の getAll で取る", async () => {
		const ids = Array.from({ length: 300 }, (_, i) => `RJ${i}`);
		const { firestore, getAll, batchSizes } = createFirestoreMock(ids);

		const works = await fetchWorksByIds(firestore, ids);

		expect(works).toHaveLength(300);
		expect(getAll).toHaveBeenCalledTimes(1);
		expect(batchSizes).toEqual([300]);
	});

	it("300件を超えたら分割し、全件を取り切る", async () => {
		// 最大サークルの実測は 789 作品。旧実装の 10 件刻みなら 79 往復だった。
		const ids = Array.from({ length: 789 }, (_, i) => `RJ${i}`);
		const { firestore, getAll, batchSizes } = createFirestoreMock(ids);

		const works = await fetchWorksByIds(firestore, ids);

		expect(works).toHaveLength(789);
		expect(getAll).toHaveBeenCalledTimes(3);
		expect(batchSizes).toEqual([300, 300, 189]);
		expect(works.map((work) => work.id)).toEqual(ids);
	});
});
