import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateCounter } from "../firestore-helpers";

const getFirestore = vi.fn();
vi.mock("@/lib/firestore", () => ({ getFirestore: () => getFirestore() }));
vi.mock("@/lib/logger", () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }));

// runTransaction(cb) が transaction を渡す Firestore モック
const setup = (doc: { exists: boolean; data?: () => unknown }) => {
	const update = vi.fn();
	const transaction = { get: vi.fn().mockResolvedValue(doc), update };
	getFirestore.mockReturnValue({
		collection: () => ({ doc: () => ({ __ref: true }) }),
		runTransaction: (cb: (t: typeof transaction) => unknown) => Promise.resolve(cb(transaction)),
	});
	return { update };
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("updateCounter", () => {
	it("加算して newValue を返す", async () => {
		const { update } = setup({ exists: true, data: () => ({ stats: { likeCount: 5 } }) });
		const r = await updateCounter("audioButtons", "ab1", "stats.likeCount", 1);
		expect(r).toEqual({ success: true, newValue: 6 });
		expect(update).toHaveBeenCalled();
	});

	it("min で下限クランプ（0 未満にならない）", async () => {
		setup({ exists: true, data: () => ({ stats: { likeCount: 0 } }) });
		const r = await updateCounter("audioButtons", "ab1", "stats.likeCount", -1, { min: 0 });
		expect(r.newValue).toBe(0);
	});

	it("max で上限クランプ", async () => {
		setup({ exists: true, data: () => ({ stock: 99 }) });
		const r = await updateCounter("products", "p1", "stock", 5, { max: 100 });
		expect(r.newValue).toBe(100);
	});

	it("現在値が数値でなければ 0 起点", async () => {
		setup({ exists: true, data: () => ({}) });
		const r = await updateCounter("c", "d", "missing.field", 1);
		expect(r.newValue).toBe(1);
	});

	it("updateTimestamp=false ではタイムスタンプを書かない", async () => {
		const { update } = setup({ exists: true, data: () => ({ n: 1 }) });
		await updateCounter("c", "d", "n", 1, { updateTimestamp: false });
		const updates = update.mock.calls[0]?.[1] as Record<string, unknown>;
		expect(updates).toEqual({ n: 2 });
		expect(updates.updatedAt).toBeUndefined();
	});

	it("ドキュメント不在は失敗", async () => {
		setup({ exists: false });
		expect((await updateCounter("c", "d", "n", 1)).success).toBe(false);
	});

	it("データ無効は失敗", async () => {
		setup({ exists: true, data: () => null });
		expect((await updateCounter("c", "d", "n", 1)).success).toBe(false);
	});

	it("トランザクション例外は失敗", async () => {
		getFirestore.mockReturnValue({
			collection: () => ({ doc: () => ({}) }),
			runTransaction: () => Promise.reject(new Error("tx fail")),
		});
		expect(await updateCounter("c", "d", "n", 1)).toEqual({
			success: false,
			error: "カウンターの更新に失敗しました",
		});
	});
});
