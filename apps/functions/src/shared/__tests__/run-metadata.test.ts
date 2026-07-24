/**
 * run-metadata.ts のテスト（SPR-231 段階①・TOCTOU対応）
 *
 * get-or-create の骨格・sanitizeUpdate 注入・並行 create 競合（ALREADY_EXISTS）の
 * 解決を検証する。endpoint 側の等価性は endpoints/__tests__ の既存テストが担保する。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../infrastructure/database/firestore", () => {
	const updateMock = vi.fn().mockResolvedValue(undefined);
	const getMock = vi.fn().mockResolvedValue({ exists: false });
	const createMock = vi.fn().mockResolvedValue(undefined);
	const docMock = vi.fn(() => ({ update: updateMock, get: getMock, create: createMock }));
	const collection = vi.fn(() => ({ doc: docMock }));

	return {
		default: { collection },
		__updateMock: updateMock,
		__getMock: getMock,
		__createMock: createMock,
		__docMock: docMock,
		__collectionMock: collection,
	};
});

const { createRunMetadataStore } = await import("../run-metadata");
const firestoreMock = (await import("../../infrastructure/database/firestore")) as unknown as {
	__updateMock: ReturnType<typeof vi.fn>;
	__getMock: ReturnType<typeof vi.fn>;
	__createMock: ReturnType<typeof vi.fn>;
	__docMock: ReturnType<typeof vi.fn>;
	__collectionMock: ReturnType<typeof vi.fn>;
};

interface TestMetadata {
	isInProgress: boolean;
	note?: string;
}

function makeStore(sanitizeUpdate = (u: Partial<TestMetadata>) => ({ ...u })) {
	return createRunMetadataStore<TestMetadata>({
		collection: "testMetadata",
		docId: "test_doc",
		createInitial: () => ({ isInProgress: false }),
		sanitizeUpdate,
	});
}

/** gRPC ALREADY_EXISTS 相当のエラー（@google-cloud/firestore は code=6 を載せる） */
function alreadyExistsError(): Error & { code: number } {
	return Object.assign(new Error("6 ALREADY_EXISTS: Document already exists"), { code: 6 });
}

describe("createRunMetadataStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		firestoreMock.__getMock.mockResolvedValue({ exists: false });
		firestoreMock.__createMock.mockResolvedValue(undefined);
	});

	describe("getOrCreate", () => {
		it("doc が存在する場合はその data を返し、create は呼ばない", async () => {
			const existing = { isInProgress: true, note: "existing" };
			firestoreMock.__getMock.mockResolvedValue({ exists: true, data: () => existing });

			const result = await makeStore().getOrCreate();

			expect(result).toEqual(existing);
			expect(firestoreMock.__createMock).not.toHaveBeenCalled();
		});

		it("doc が不在の場合は初期値を create して返す", async () => {
			const result = await makeStore().getOrCreate();

			expect(result).toEqual({ isInProgress: false });
			expect(firestoreMock.__createMock).toHaveBeenCalledWith({ isInProgress: false });
		});

		it("指定した collection / docId を参照する", async () => {
			await makeStore().getOrCreate();

			expect(firestoreMock.__collectionMock).toHaveBeenCalledWith("testMetadata");
			expect(firestoreMock.__docMock).toHaveBeenCalledWith("test_doc");
		});

		it("createInitial は doc 存在時には評価されない（遅延評価）", async () => {
			firestoreMock.__getMock.mockResolvedValue({ exists: true, data: () => ({}) });
			const createInitial = vi.fn(() => ({ isInProgress: false }));

			await createRunMetadataStore<TestMetadata>({
				collection: "testMetadata",
				docId: "test_doc",
				createInitial,
				sanitizeUpdate: (u) => ({ ...u }),
			}).getOrCreate();

			expect(createInitial).not.toHaveBeenCalled();
		});

		it("create が ALREADY_EXISTS で失敗したら勝者の doc を再取得して返す（TOCTOU 敗者側）", async () => {
			const winner = { isInProgress: true, note: "winner" };
			firestoreMock.__getMock
				// 1回目の get: 不在（→ create を試みる）
				.mockResolvedValueOnce({ exists: false })
				// 敗者側の再取得: 並行呼び出しが作成済み
				.mockResolvedValueOnce({ exists: true, data: () => winner });
			firestoreMock.__createMock.mockRejectedValue(alreadyExistsError());

			const result = await makeStore().getOrCreate();

			expect(result).toEqual(winner);
			expect(firestoreMock.__getMock).toHaveBeenCalledTimes(2);
		});

		it("create が ALREADY_EXISTS 以外のエラーで失敗したらそのまま throw する", async () => {
			const error = Object.assign(new Error("7 PERMISSION_DENIED"), { code: 7 });
			firestoreMock.__createMock.mockRejectedValue(error);

			await expect(makeStore().getOrCreate()).rejects.toThrow("PERMISSION_DENIED");
			// 再取得は行わない（1回目の get のみ）
			expect(firestoreMock.__getMock).toHaveBeenCalledTimes(1);
		});
	});

	describe("update", () => {
		it("sanitizeUpdate を通した結果で update する", async () => {
			const sanitize = vi.fn((u: Partial<TestMetadata>) => ({ ...u, sanitized: true }));

			await makeStore(sanitize).update({ isInProgress: true });

			expect(sanitize).toHaveBeenCalledWith({ isInProgress: true });
			expect(firestoreMock.__updateMock).toHaveBeenCalledWith({
				isInProgress: true,
				sanitized: true,
			});
		});
	});
});
