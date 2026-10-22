/**
 * run-metadata.ts のテスト（SPR-231 段階①・TOCTOU対応 / SPR-368・369: 重複配信の判定）
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
	const transaction = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
	const runTransaction = vi.fn(async (fn: (tx: typeof transaction) => unknown) => fn(transaction));

	return {
		default: { collection, runTransaction },
		__transaction: transaction,
		__updateMock: updateMock,
		__getMock: getMock,
		__createMock: createMock,
		__docMock: docMock,
		__collectionMock: collection,
	};
});

vi.mock("../logger", () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

const { claimRunEvent, claimRunEventFailOpen, createRunMetadataStore } = await import(
	"../run-metadata"
);
const logger = vi.mocked(await import("../logger"));
const firestoreMock = (await import("../../infrastructure/database/firestore")) as unknown as {
	__updateMock: ReturnType<typeof vi.fn>;
	__getMock: ReturnType<typeof vi.fn>;
	__createMock: ReturnType<typeof vi.fn>;
	__docMock: ReturnType<typeof vi.fn>;
	__collectionMock: ReturnType<typeof vi.fn>;
	__transaction: Record<"get" | "update" | "set", ReturnType<typeof vi.fn>>;
	default: { runTransaction: ReturnType<typeof vi.fn> };
};
const transactionMock = firestoreMock.__transaction;

/** トランザクション内で読まれるメタデータ doc（recentEventIds の判定対象） */
function metadataSnapshot(recentEventIds?: unknown) {
	return { exists: true, data: () => ({ isInProgress: false, recentEventIds }) };
}

const claimOptions = {
	collection: "testMetadata",
	docId: "test_doc",
	limit: 5,
	createInitial: () => ({ isInProgress: false }),
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

		it("ALREADY_EXISTS 後の再取得でも doc 不在なら元のエラーを throw する（握りつぶさない）", async () => {
			// 勝者が作成直後に削除した等の異常事態。黙って初期値を返すと「作成済み」と
			// 誤認させるため、大声で失敗して次の定期実行の自然リトライに任せるのが仕様。
			firestoreMock.__getMock
				.mockResolvedValueOnce({ exists: false })
				.mockResolvedValueOnce({ exists: false });
			firestoreMock.__createMock.mockRejectedValue(alreadyExistsError());

			await expect(makeStore().getOrCreate()).rejects.toThrow("ALREADY_EXISTS");
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

describe("claimRunEvent（SPR-368 / SPR-369）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("初めて見る id は新しい順の先頭に足し、limit 件だけを残す", async () => {
		transactionMock.get.mockResolvedValue(metadataSnapshot(["m5", "m4", "m3", "m2", "m1"]));

		await expect(claimRunEvent("m6", claimOptions)).resolves.toBe(true);

		expect(firestoreMock.__collectionMock).toHaveBeenCalledWith("testMetadata");
		expect(firestoreMock.__docMock).toHaveBeenCalledWith("test_doc");
		expect(transactionMock.update).toHaveBeenCalledWith(expect.anything(), {
			recentEventIds: ["m6", "m5", "m4", "m3", "m2"],
		});
	});

	it("記録済みの id なら false を返し、何も書き込まない", async () => {
		transactionMock.get.mockResolvedValue(metadataSnapshot(["m2", "m1"]));

		await expect(claimRunEvent("m1", claimOptions)).resolves.toBe(false);

		expect(transactionMock.update).not.toHaveBeenCalled();
		expect(transactionMock.set).not.toHaveBeenCalled();
	});

	it("recentEventIds が無い（配列でない）既存 doc では、その id だけを記録する", async () => {
		transactionMock.get.mockResolvedValue(metadataSnapshot(undefined));

		await expect(claimRunEvent("m1", claimOptions)).resolves.toBe(true);

		expect(transactionMock.update).toHaveBeenCalledWith(expect.anything(), {
			recentEventIds: ["m1"],
		});
	});

	it("doc が無ければ createInitial の値と一緒に作成する", async () => {
		transactionMock.get.mockResolvedValue({ exists: false });

		await expect(claimRunEvent("m1", claimOptions)).resolves.toBe(true);

		expect(transactionMock.set).toHaveBeenCalledWith(expect.anything(), {
			isInProgress: false,
			recentEventIds: ["m1"],
		});
	});

	it("createInitial が無ければ、doc を recentEventIds だけで作成する", async () => {
		transactionMock.get.mockResolvedValue({ exists: false });

		await claimRunEvent("m1", { collection: "testMetadata", docId: "test_doc", limit: 5 });

		expect(transactionMock.set).toHaveBeenCalledWith(expect.anything(), {
			recentEventIds: ["m1"],
		});
	});

	it("id が空なら判定できないので、記録せずに true を返す", async () => {
		await expect(claimRunEvent("", claimOptions)).resolves.toBe(true);

		expect(firestoreMock.default.runTransaction).not.toHaveBeenCalled();
	});
});

describe("claimRunEventFailOpen（SPR-368 / SPR-369）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("判定が成功したら claimRunEvent の結果をそのまま返す", async () => {
		transactionMock.get.mockResolvedValue(metadataSnapshot(["m1"]));

		await expect(claimRunEventFailOpen("m1", claimOptions)).resolves.toBe(false);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("判定そのものが失敗したら、warn を残して true を返す（fail-open）", async () => {
		firestoreMock.default.runTransaction.mockRejectedValueOnce(
			new Error("ABORTED: too much contention"),
		);

		await expect(claimRunEventFailOpen("m1", claimOptions)).resolves.toBe(true);
		expect(logger.warn).toHaveBeenCalledWith(
			"重複配信の判定に失敗したため、判定せずに run を実行",
			{ eventId: "m1", docId: "test_doc", error: "ABORTED: too much contention" },
		);
	});
});
