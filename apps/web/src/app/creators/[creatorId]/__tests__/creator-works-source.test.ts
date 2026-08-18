/**
 * クリエイターページの読み取り正本（SPR-311）のテスト。
 *
 * ここで守りたいのは「何を返すか」より **Firestore を何回叩くか** と
 * **失敗をキャッシュに載せないか**。どちらも壊れても表示は正しいままで、
 * 課金と障害の持続時間だけが静かに悪化する。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// vitest では "use cache" ディレクティブは no-op になり cacheLife が cache スコープ外呼び出しになるためモックする
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

vi.mock("@suzumina.click/shared-types", () => ({
	WorkDocumentSchema: { safeParse: (data: unknown) => ({ success: true, data }) },
	workTransformers: {
		fromFirestore: vi.fn((data: { id: string; productId: string }) => ({ ...data })),
	},
}));

const worksSubcollectionGet = vi.fn();
const creatorDocGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: creatorDocGet }));
const mockGetAll = vi.fn();
const mockCollection = vi.fn((name: string) => ({
	doc: name === "works" ? vi.fn((id: string) => ({ id })) : mockDoc,
}));

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({ collection: mockCollection, getAll: mockGetAll }),
}));

import { loadCreatorSource } from "../creator-works-source";

/** 関連付け 3 件・実在する works 3 件のクリエイターを組み立てる */
function setupCreator(relationDocs: Array<{ id: string; roles?: string[] }>) {
	worksSubcollectionGet.mockResolvedValue({
		size: relationDocs.length,
		docs: relationDocs.map((r) => ({ id: r.id, data: () => ({ roles: r.roles }) })),
	});
	creatorDocGet.mockResolvedValue({
		exists: true,
		data: () => ({ name: "テストクリエイター", primaryRole: "voiceActor" }),
		ref: { collection: vi.fn(() => ({ get: worksSubcollectionGet })) },
	});
	mockGetAll.mockImplementation((...refs: Array<{ id: string }>) =>
		Promise.resolve(refs.map((ref) => ({ exists: true, id: ref.id, data: () => ({}) }))),
	);
}

describe("loadCreatorSource", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creator doc と works サブコレクションをそれぞれ 1 回だけ読む", async () => {
		setupCreator([
			{ id: "RJ111111", roles: ["voiceActor", "scenario"] },
			{ id: "RJ222222", roles: ["illustration"] },
		]);

		await loadCreatorSource("VA12345");

		// 旧実装は getCreatorInfo と fetchWorkIds が同じものを二重に引いており、
		// 1 ページ表示あたり 3N + 2 read になっていた（SPR-311 の主因）。
		expect(creatorDocGet).toHaveBeenCalledTimes(1);
		expect(worksSubcollectionGet).toHaveBeenCalledTimes(1);
	});

	it("ヘッダー情報と作品を 1 回の取得から組み立てる", async () => {
		setupCreator([
			{ id: "RJ111111", roles: ["scenario"] },
			{ id: "RJ222222", roles: ["illustration"] },
		]);

		const source = await loadCreatorSource("VA12345");

		expect(source?.info).toEqual({
			id: "VA12345",
			name: "テストクリエイター",
			// primaryRole は roles に含まれないので先頭に足される
			types: ["voiceActor", "scenario", "illustration"],
			workCount: 2,
		});
		expect(source?.works.map((w) => w.id)).toEqual(["RJ111111", "RJ222222"]);
	});

	it("workCount は関連付けの件数で、実在しない作品が欠けても減らない", async () => {
		setupCreator([{ id: "RJ111111" }, { id: "RJ222222" }]);
		mockGetAll.mockImplementation((...refs: Array<{ id: string }>) =>
			Promise.resolve(
				refs.map((ref) => ({ exists: ref.id === "RJ111111", id: ref.id, data: () => ({}) })),
			),
		);

		const source = await loadCreatorSource("VA12345");

		// 欠けは整合性 cron の担当で、ヘッダーの総作品数は関連付け基準のまま（既存挙動）
		expect(source?.info.workCount).toBe(2);
		expect(source?.works).toHaveLength(1);
	});

	it("存在しないクリエイターは null を返す（キャッシュしてよい結果）", async () => {
		creatorDocGet.mockResolvedValue({ exists: false });

		await expect(loadCreatorSource("VA99999")).resolves.toBeNull();
	});

	it("取得失敗は throw する（null に畳むとエラーが 1 日キャッシュに居座る）", async () => {
		creatorDocGet.mockRejectedValue(new Error("Firestore error"));

		await expect(loadCreatorSource("VA12345")).rejects.toThrow("Firestore error");
	});
});
