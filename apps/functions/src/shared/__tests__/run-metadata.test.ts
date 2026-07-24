/**
 * run-metadata.ts のテスト（SPR-231 段階①）
 *
 * get-or-create の骨格と sanitizeUpdate 注入の等価性を検証する。
 * endpoint 側の挙動不変は endpoints/__tests__ の既存テスト（アサーション無変更）が担保する。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../infrastructure/database/firestore", () => {
	const updateMock = vi.fn().mockResolvedValue(undefined);
	const getMock = vi.fn().mockResolvedValue({ exists: false });
	const setMock = vi.fn().mockResolvedValue(undefined);
	const docMock = vi.fn(() => ({ update: updateMock, get: getMock, set: setMock }));
	const collection = vi.fn(() => ({ doc: docMock }));

	return {
		default: { collection },
		__updateMock: updateMock,
		__getMock: getMock,
		__setMock: setMock,
		__docMock: docMock,
		__collectionMock: collection,
	};
});

const { createRunMetadataStore } = await import("../run-metadata");
const firestoreMock = (await import("../../infrastructure/database/firestore")) as unknown as {
	__updateMock: ReturnType<typeof vi.fn>;
	__getMock: ReturnType<typeof vi.fn>;
	__setMock: ReturnType<typeof vi.fn>;
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

describe("createRunMetadataStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		firestoreMock.__getMock.mockResolvedValue({ exists: false });
	});

	describe("getOrCreate", () => {
		it("doc が存在する場合はその data を返し、set は呼ばない", async () => {
			const existing = { isInProgress: true, note: "existing" };
			firestoreMock.__getMock.mockResolvedValue({ exists: true, data: () => existing });

			const result = await makeStore().getOrCreate();

			expect(result).toEqual(existing);
			expect(firestoreMock.__setMock).not.toHaveBeenCalled();
		});

		it("doc が不在の場合は初期値を set して返す", async () => {
			const result = await makeStore().getOrCreate();

			expect(result).toEqual({ isInProgress: false });
			expect(firestoreMock.__setMock).toHaveBeenCalledWith({ isInProgress: false });
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
