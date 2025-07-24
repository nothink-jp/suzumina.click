/**
 * DLsite失敗追跡システムのテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// @google-cloud/firestoreのモック
vi.mock("@google-cloud/firestore", () => ({
	FieldValue: {
		increment: vi.fn().mockImplementation((value) => ({ _increment: value })),
		serverTimestamp: vi.fn().mockReturnValue({ _serverTimestamp: true }),
	},
}));

// Firestoreのモック
vi.mock("../../../infrastructure/database/firestore", () => {
	const mockDoc = vi.fn();
	const mockQuery = {
		get: vi.fn(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
	};
	const mockCollection = vi.fn().mockReturnValue({
		doc: mockDoc,
		...mockQuery,
	});
	const mockBatch = {
		set: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		commit: vi.fn().mockResolvedValue(undefined),
	};

	return {
		default: {
			collection: mockCollection,
			batch: vi.fn().mockReturnValue(mockBatch),
		},
		Timestamp: {
			fromDate: vi.fn().mockImplementation((date) => ({ toDate: () => date })),
		},
		FieldValue: {
			increment: vi.fn().mockImplementation((value) => ({ _increment: value })),
			serverTimestamp: vi.fn().mockReturnValue({ _serverTimestamp: true }),
		},
		// テスト用にmockを外部に公開
		__mockQuery: mockQuery,
		__mockDoc: mockDoc,
		__mockBatch: mockBatch,
		__mockCollection: mockCollection,
	};
});

vi.mock("../../shared/logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

import {
	cleanupOldFailureRecords,
	FAILURE_REASONS,
	getFailureStatistics,
	trackFailedWork,
	trackMultipleFailedWorks,
} from "../failure-tracker";

// サンプルデータ
const sampleFailedWork = {
	workId: "RJ12345",
	failureCount: 3,
	lastFailedAt: { toDate: () => new Date("2024-01-01") },
	firstFailedAt: { toDate: () => new Date("2023-12-01") },
	failureReason: FAILURE_REASONS.TIMEOUT,
	createdAt: { toDate: () => new Date("2023-12-01") },
	updatedAt: { toDate: () => new Date("2024-01-01") },
};

const sampleRecoveredWork = {
	...sampleFailedWork,
	workId: "RJ54321",
	lastSuccessfulAt: { toDate: () => new Date("2024-01-02") },
};

// モックの参照を取得
const firestoreMock = vi.mocked(await import("../../../infrastructure/database/firestore"));
const mockQuery = (firestoreMock as any).__mockQuery;
const mockDoc = (firestoreMock as any).__mockDoc;
const mockBatch = (firestoreMock as any).__mockBatch;
const _mockCollection = (firestoreMock as any).__mockCollection;

describe("failure-tracker", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// デフォルトのモック設定
		const mockDocRef = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => sampleFailedWork,
			}),
			update: vi.fn().mockResolvedValue(undefined),
		};

		mockDoc.mockReturnValue(mockDocRef);
	});

	describe("trackFailedWork", () => {
		it("失敗作品を正常に記録できる", async () => {
			const mockDocRef = {
				set: vi.fn().mockResolvedValue(undefined),
				get: vi.fn().mockResolvedValue({
					exists: true,
					data: () => ({ firstFailedAt: new Date() }),
				}),
				update: vi.fn().mockResolvedValue(undefined),
			};
			mockDoc.mockReturnValue(mockDocRef);

			await trackFailedWork("RJ12345", FAILURE_REASONS.TIMEOUT, "Connection timeout");

			expect(mockDocRef.set).toHaveBeenCalledWith(
				{
					workId: "RJ12345",
					failureCount: expect.objectContaining({ _increment: 1 }),
					lastFailedAt: expect.objectContaining({ _serverTimestamp: true }),
					failureReason: FAILURE_REASONS.TIMEOUT,
					errorDetails: "Connection timeout",
					updatedAt: expect.objectContaining({ _serverTimestamp: true }),
				},
				{ merge: true },
			);
		});

		it("初回失敗の場合はfirstFailedAtとcreatedAtを設定する", async () => {
			const mockDocRef = {
				set: vi.fn().mockResolvedValue(undefined),
				get: vi.fn().mockResolvedValue({
					exists: false,
					data: () => null,
				}),
				update: vi.fn().mockResolvedValue(undefined),
			};
			mockDoc.mockReturnValue(mockDocRef);

			await trackFailedWork("RJ12345", FAILURE_REASONS.API_ERROR);

			expect(mockDocRef.update).toHaveBeenCalledWith({
				firstFailedAt: expect.objectContaining({ _serverTimestamp: true }),
				createdAt: expect.objectContaining({ _serverTimestamp: true }),
			});
		});

		it("エラーが発生した場合は例外を投げる", async () => {
			const mockDocRef = {
				set: vi.fn().mockRejectedValue(new Error("Firestore error")),
				get: vi.fn(),
				update: vi.fn(),
			};
			mockDoc.mockReturnValue(mockDocRef);

			await expect(trackFailedWork("RJ12345", FAILURE_REASONS.NETWORK_ERROR)).rejects.toThrow(
				"Firestore error",
			);
		});
	});

	describe("trackMultipleFailedWorks", () => {
		it("複数の失敗作品を一括記録できる", async () => {
			const failures = [
				{ workId: "RJ12345", reason: FAILURE_REASONS.TIMEOUT as const },
				{
					workId: "RJ54321",
					reason: FAILURE_REASONS.API_ERROR as const,
					errorDetails: "404 Not Found",
				},
			];

			const mockDocRef = {
				get: vi.fn().mockResolvedValue({
					exists: true,
					data: () => ({ firstFailedAt: new Date() }),
				}),
				update: vi.fn().mockResolvedValue(undefined),
			};
			mockDoc.mockReturnValue(mockDocRef);

			await trackMultipleFailedWorks(failures);

			expect(mockBatch.set).toHaveBeenCalledTimes(2);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});

		it("空の配列の場合は何もしない", async () => {
			await trackMultipleFailedWorks([]);

			expect(mockBatch.set).not.toHaveBeenCalled();
			expect(mockBatch.commit).not.toHaveBeenCalled();
		});

		it("バッチコミットでエラーが発生した場合は例外を投げる", async () => {
			mockBatch.commit.mockRejectedValue(new Error("Batch commit failed"));

			const failures = [{ workId: "RJ12345", reason: FAILURE_REASONS.TIMEOUT as const }];

			await expect(trackMultipleFailedWorks(failures)).rejects.toThrow("Batch commit failed");
		});
	});

	describe("getFailureStatistics", () => {
		it("失敗統計情報を正常に計算できる", async () => {
			const mockDocs = [
				{ data: () => sampleFailedWork }, // 失敗作品1
				{ data: () => sampleRecoveredWork }, // 失敗作品2
				{
					data: () => ({
						...sampleFailedWork,
						workId: "RJ99999",
						failureReason: FAILURE_REASONS.API_ERROR,
					}),
				},
			];
			mockQuery.get.mockResolvedValue({ docs: mockDocs });

			const result = await getFailureStatistics();

			expect(result).toEqual({
				totalFailedWorks: 3,
				recoveredWorks: 0,
				unrecoveredWorks: 3,
				failureReasons: {
					[FAILURE_REASONS.TIMEOUT]: 2,
					[FAILURE_REASONS.API_ERROR]: 1,
				},
			});
		});

		it("データがない場合は空の統計を返す", async () => {
			mockQuery.get.mockResolvedValue({ docs: [] });

			const result = await getFailureStatistics();

			expect(result).toEqual({
				totalFailedWorks: 0,
				recoveredWorks: 0,
				unrecoveredWorks: 0,
				failureReasons: {},
			});
		});

		it("失敗理由が未定義の場合はunknownとして集計する", async () => {
			const mockDocs = [{ data: () => ({ ...sampleFailedWork, failureReason: undefined }) }];
			mockQuery.get.mockResolvedValue({ docs: mockDocs });

			const result = await getFailureStatistics();

			expect(result.failureReasons).toEqual({
				unknown: 1,
			});
		});

		it("エラーが発生した場合は例外を投げる", async () => {
			mockQuery.get.mockRejectedValue(new Error("Statistics query failed"));

			await expect(getFailureStatistics()).rejects.toThrow("Statistics query failed");
		});
	});

	describe("cleanupOldFailureRecords", () => {
		it("古い失敗記録を正常にクリーンアップできる", async () => {
			// 成功ケース用にmockBatch.commitを正常動作に再設定
			mockBatch.commit.mockResolvedValue(undefined);

			const mockDocs = [{ ref: { id: "RJ12345" } }, { ref: { id: "RJ54321" } }];
			mockQuery.get.mockResolvedValue({
				docs: mockDocs,
				empty: false,
				size: 2,
			});

			const result = await cleanupOldFailureRecords(30);

			expect(result).toBe(2);
			expect(mockBatch.delete).toHaveBeenCalledTimes(2);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});

		it("クリーンアップ対象がない場合は0を返す", async () => {
			mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });

			const result = await cleanupOldFailureRecords(30);

			expect(result).toBe(0);
			expect(mockBatch.delete).not.toHaveBeenCalled();
			expect(mockBatch.commit).not.toHaveBeenCalled();
		});

		it("カスタムの保持日数を指定できる", async () => {
			mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });

			await cleanupOldFailureRecords(60);

			expect(mockQuery.where).toHaveBeenCalledWith("lastFailedAt", "<", expect.any(Object));
		});

		it("エラーが発生した場合は例外を投げる", async () => {
			mockQuery.get.mockRejectedValue(new Error("Cleanup query failed"));

			await expect(cleanupOldFailureRecords()).rejects.toThrow("Cleanup query failed");
		});
	});

	describe("FAILURE_REASONS定数", () => {
		it("全ての失敗理由が定義されている", () => {
			expect(FAILURE_REASONS).toEqual({
				TIMEOUT: "timeout",
				NETWORK_ERROR: "network_error",
				API_ERROR: "api_error",
				PARSING_ERROR: "parsing_error",
				RATE_LIMIT: "rate_limit",
				REGION_RESTRICTION: "region_restriction",
				UNKNOWN: "unknown",
			});
		});
	});
});
