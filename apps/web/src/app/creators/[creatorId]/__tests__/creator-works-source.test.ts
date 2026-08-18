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

import { loadCreatorInfo, loadCreatorWorks } from "../creator-works-source";

/**
 * @param creatorData creators/{id} の中身。workCount/types を渡すと非正規化ありの経路になる
 * @param relationDocs works サブコレクションの中身
 */
function setupCreator(
	creatorData: Record<string, unknown>,
	relationDocs: Array<{ id: string; roles?: string[] }>,
) {
	worksSubcollectionGet.mockResolvedValue({
		size: relationDocs.length,
		docs: relationDocs.map((r) => ({ id: r.id, data: () => ({ roles: r.roles }) })),
	});
	creatorDocGet.mockResolvedValue({
		exists: true,
		data: () => creatorData,
		ref: { collection: vi.fn(() => ({ get: worksSubcollectionGet })) },
	});
	mockGetAll.mockImplementation((...refs: Array<{ id: string }>) =>
		Promise.resolve(refs.map((ref) => ({ exists: true, id: ref.id, data: () => ({}) }))),
	);
}

const RELATIONS = [
	{ id: "RJ111111", roles: ["scenario"] },
	{ id: "RJ222222", roles: ["illustration"] },
];

describe("loadCreatorInfo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("非正規化された workCount/types があればサブコレクションを読まない", async () => {
		setupCreator(
			{ name: "テストクリエイター", primaryRole: "voiceActor", workCount: 2, types: ["scenario"] },
			RELATIONS,
		);

		const info = await loadCreatorInfo("VA12345");

		// OG 画像ルートはこの経路しか通らない。ここでサブコレクションを読むと、
		// 作品 2,178 件のクリエイターが OG 巡回のたびに数千 read を払う（SPR-311）。
		expect(creatorDocGet).toHaveBeenCalledTimes(1);
		expect(worksSubcollectionGet).not.toHaveBeenCalled();
		expect(info).toEqual({
			id: "VA12345",
			name: "テストクリエイター",
			// primaryRole は types に含まれないので先頭に足される
			types: ["voiceActor", "scenario"],
			workCount: 2,
		});
	});

	it("非正規化が無い旧データはサブコレクションから数え直す", async () => {
		setupCreator({ name: "テストクリエイター", primaryRole: "voiceActor" }, RELATIONS);

		const info = await loadCreatorInfo("VA12345");

		expect(worksSubcollectionGet).toHaveBeenCalledTimes(1);
		expect(info).toEqual({
			id: "VA12345",
			name: "テストクリエイター",
			types: ["voiceActor", "scenario", "illustration"],
			workCount: 2,
		});
	});

	it("workCount だけ・types だけの半端な非正規化は fallback 扱いにする", async () => {
		setupCreator({ name: "C", workCount: 2 }, RELATIONS);
		await loadCreatorInfo("VA12345");
		expect(worksSubcollectionGet).toHaveBeenCalledTimes(1);
	});

	it("存在しないクリエイターは null を返す（キャッシュしてよい結果）", async () => {
		creatorDocGet.mockResolvedValue({ exists: false });

		await expect(loadCreatorInfo("VA99999")).resolves.toBeNull();
	});

	it("取得失敗は throw する（null に畳むとエラーが 1 日キャッシュに居座る）", async () => {
		creatorDocGet.mockRejectedValue(new Error("Firestore error"));

		await expect(loadCreatorInfo("VA12345")).rejects.toThrow("Firestore error");
	});
});

describe("loadCreatorWorks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("サブコレクションを 1 回だけ読んで作品本体を引く", async () => {
		setupCreator({ name: "C", workCount: 2, types: ["scenario"] }, RELATIONS);

		const works = await loadCreatorWorks("VA12345");

		// 旧実装は getCreatorInfo と fetchWorkIds が同じものを二重に引いており、
		// 1 ページ表示あたり 3N + 2 read になっていた（SPR-311 の主因）。
		expect(worksSubcollectionGet).toHaveBeenCalledTimes(1);
		expect(works?.map((w) => w.id)).toEqual(["RJ111111", "RJ222222"]);
	});

	it("実在しない作品は黙って除外する（workCount とは一致しなくてよい）", async () => {
		setupCreator({ name: "C" }, RELATIONS);
		mockGetAll.mockImplementation((...refs: Array<{ id: string }>) =>
			Promise.resolve(
				refs.map((ref) => ({ exists: ref.id === "RJ111111", id: ref.id, data: () => ({}) })),
			),
		);

		// 欠けは整合性 cron の担当。ヘッダーの総作品数（workCount）は関連付け基準のまま
		await expect(loadCreatorWorks("VA12345")).resolves.toHaveLength(1);
	});

	it("存在しないクリエイターは null を返す（作品0件と区別する）", async () => {
		creatorDocGet.mockResolvedValue({ exists: false });

		await expect(loadCreatorWorks("VA99999")).resolves.toBeNull();
	});

	it("取得失敗は throw する", async () => {
		creatorDocGet.mockRejectedValue(new Error("Firestore error"));

		await expect(loadCreatorWorks("VA12345")).rejects.toThrow("Firestore error");
	});
});
