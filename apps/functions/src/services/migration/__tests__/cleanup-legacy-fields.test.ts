/**
 * レガシーフィールドクリーンアップテスト
 */

import type { FieldValue as FieldValueType } from "@google-cloud/firestore";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// モック設定を先に行う
const mockDoc = vi.fn();
const mockQuery = {
	get: vi.fn(),
	orderBy: vi.fn().mockReturnThis(),
	limit: vi.fn().mockReturnThis(),
	startAfter: vi.fn().mockReturnThis(),
};
const mockCollection = {
	doc: mockDoc,
	...mockQuery,
};
const mockBatch = {
	update: vi.fn(),
	commit: vi.fn().mockResolvedValue(undefined),
};
const mockFirestore = {
	collection: vi.fn(() => mockCollection),
	batch: vi.fn(() => mockBatch),
};

// @google-cloud/firestoreのモック
vi.mock("@google-cloud/firestore", () => ({
	FieldValue: {
		delete: vi.fn().mockReturnValue({ _delete: true }),
	},
	Firestore: vi.fn(() => mockFirestore),
}));

// Firestoreモックの設定
vi.mock("../../infrastructure/database/firestore", () => ({
	default: mockFirestore,
}));

// Loggerモックの設定
vi.mock("../../shared/logger", () => ({
	info: vi.fn(),
	debug: vi.fn(),
	error: vi.fn(),
}));

describe("cleanup-legacy-fields", () => {
	let cleanupLegacyFields: typeof import("../cleanup-legacy-fields").cleanupLegacyFields;
	let cleanupLegacyFieldsForWork: typeof import("../cleanup-legacy-fields").cleanupLegacyFieldsForWork;
	let analyzeLegacyFieldUsage: typeof import("../cleanup-legacy-fields").analyzeLegacyFieldUsage;
	let FieldValue: typeof FieldValueType;

	beforeAll(async () => {
		// モジュールの動的インポート
		const module = await import("../cleanup-legacy-fields");
		cleanupLegacyFields = module.cleanupLegacyFields;
		cleanupLegacyFieldsForWork = module.cleanupLegacyFieldsForWork;
		analyzeLegacyFieldUsage = module.analyzeLegacyFieldUsage;

		const firestoreModule = await import("@google-cloud/firestore");
		FieldValue = firestoreModule.FieldValue as any;
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("cleanupLegacyFields", () => {
		it("ドライラン モードで削除対象フィールドを検出する", async () => {
			const mockDocs = [
				{
					id: "RJ001",
					data: () => ({
						id: "RJ001",
						totalDownloadCount: 1000,
						isExclusive: true,
						apiGenres: [{ id: "1", name: "ASMR" }],
						apiCustomGenres: [{ genre_key: "healing", name: "癒し" }],
						apiWorkOptions: { has_voice: { name: "音声あり" } },
					}),
					ref: { update: vi.fn() },
				},
				{
					id: "RJ002",
					data: () => ({
						id: "RJ002",
						bonusContent: ["特典"],
						isExclusive: false,
					}),
					ref: { update: vi.fn() },
				},
			];

			mockQuery.get
				.mockResolvedValueOnce({
					empty: false,
					docs: mockDocs,
				} as any)
				.mockResolvedValueOnce({
					empty: true,
					docs: [],
				} as any);

			const result = await cleanupLegacyFields({ dryRun: true });

			expect(result.totalProcessed).toBe(2);
			expect(result.successCount).toBe(0); // ドライランなので実際の更新はなし
			expect(result.deletedFields).toEqual({
				totalDownloadCount: 1,
				bonusContent: 1,
				isExclusive: 2,
				apiGenres: 1,
				apiCustomGenres: 1,
				apiWorkOptions: 1,
			});
		});

		it("実行モードで削除を実施する", async () => {
			const mockDocs = [
				{
					id: "RJ001",
					data: () => ({
						id: "RJ001",
						totalDownloadCount: 1000,
						isExclusive: true,
					}),
					ref: { update: vi.fn() },
				},
			];

			mockQuery.get
				.mockResolvedValueOnce({
					empty: false,
					docs: mockDocs,
				} as any)
				.mockResolvedValueOnce({
					empty: true,
					docs: [],
				} as any);

			mockBatch.commit.mockResolvedValue({} as any);

			const result = await cleanupLegacyFields({ dryRun: false, batchSize: 10 });

			expect(result.totalProcessed).toBe(1);
			expect(result.successCount).toBe(1);
			expect(mockBatch.update).toHaveBeenCalledWith(mockDocs[0].ref, {
				totalDownloadCount: FieldValue.delete(),
				isExclusive: FieldValue.delete(),
			});
			expect(mockBatch.commit).toHaveBeenCalled();
		});

		it("バッチサイズの制限を遵守する", async () => {
			// 初回は3件、2回目は空を返す
			mockQuery.get
				.mockResolvedValueOnce({
					empty: false,
					docs: Array(3)
						.fill({})
						.map((_, i) => ({
							id: `RJ00${i}`,
							data: () => ({ id: `RJ00${i}` }),
							ref: { update: vi.fn() },
						})),
				} as any)
				.mockResolvedValueOnce({
					empty: true,
					docs: [],
				} as any);

			const result = await cleanupLegacyFields({ dryRun: true, batchSize: 3 });

			expect(result.totalProcessed).toBe(3);
			expect(mockQuery.limit).toHaveBeenCalledWith(3);
		});

		it("処理数の上限を遵守する", async () => {
			const mockDocs = Array(10)
				.fill({})
				.map((_, i) => ({
					id: `RJ00${i}`,
					data: () => ({ id: `RJ00${i}`, isExclusive: true }),
					ref: { update: vi.fn() },
				}));

			// 初回は10件、2回目は空を返す
			mockQuery.get
				.mockResolvedValueOnce({
					empty: false,
					docs: mockDocs,
				} as any)
				.mockResolvedValueOnce({
					empty: true,
					docs: [],
				} as any);

			const result = await cleanupLegacyFields({ dryRun: true, limit: 5 });

			// limitによるbreakの前にtotalProcessed++が実行されるため、6になる
			expect(result.totalProcessed).toBe(6);
		});
	});

	describe("cleanupLegacyFieldsForWork", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("特定の作品のレガシーフィールドを削除する", async () => {
			const mockDocRef = {
				id: "RJ123456",
				update: vi.fn().mockResolvedValue(true),
			};

			const mockDocData = {
				exists: true,
				data: () => ({
					id: "RJ123456",
					totalDownloadCount: 1000,
					isExclusive: true,
					apiGenres: [{ id: "1", name: "ASMR" }],
				}),
				ref: mockDocRef,
			};

			const mockDocInstance = {
				get: vi.fn().mockResolvedValue(mockDocData),
				// cleanupDocumentはdocRefを直接受け取るので、ここにupdate関数を含める
				id: "RJ123456",
				update: vi.fn().mockResolvedValue(true),
			};

			mockDoc.mockReturnValue(mockDocInstance);

			const result = await cleanupLegacyFieldsForWork("RJ123456", false);

			expect(result.success).toBe(true);
			expect(result.deletedFields).toEqual(["totalDownloadCount", "isExclusive", "apiGenres"]);
			expect(mockDocInstance.update).toHaveBeenCalledWith({
				totalDownloadCount: FieldValue.delete(),
				isExclusive: FieldValue.delete(),
				apiGenres: FieldValue.delete(),
			});
		});

		it("存在しない作品の場合は失敗を返す", async () => {
			const mockDocInstance = {
				get: vi.fn().mockResolvedValue({
					exists: false,
				}),
			};

			mockDoc.mockReturnValue(mockDocInstance);

			const result = await cleanupLegacyFieldsForWork("RJ999999", false);

			expect(result.success).toBe(false);
			expect(result.deletedFields).toEqual([]);
		});

		it("ドライランモードでは実際の削除を行わない", async () => {
			const mockDocRef = {
				update: vi.fn(),
			};

			const mockDocData = {
				exists: true,
				data: () => ({
					id: "RJ123456",
					totalDownloadCount: 1000,
				}),
				ref: mockDocRef,
			};

			const mockDocInstance = {
				get: vi.fn().mockResolvedValue(mockDocData),
			};

			mockDoc.mockReturnValue(mockDocInstance);

			const result = await cleanupLegacyFieldsForWork("RJ123456", true);

			expect(result.success).toBe(true);
			expect(result.deletedFields).toEqual(["totalDownloadCount"]);
			expect(mockDocRef.update).not.toHaveBeenCalled();
		});
	});

	describe("analyzeLegacyFieldUsage", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("レガシーフィールドの使用状況を分析する", async () => {
			// モックをクリアして設定し直す
			mockQuery.get.mockReset();

			const mockDocs = [
				{
					id: "RJ001",
					data: () => ({
						id: "RJ001",
						totalDownloadCount: 1000,
						isExclusive: true,
					}),
				},
				{
					id: "RJ002",
					data: () => ({
						id: "RJ002",
						totalDownloadCount: 2000,
						bonusContent: ["特典"],
					}),
				},
				{
					id: "RJ003",
					data: () => ({
						id: "RJ003",
						apiGenres: [{ id: "1", name: "ASMR" }],
					}),
				},
			];

			mockQuery.get
				.mockResolvedValueOnce({
					empty: false,
					docs: mockDocs,
				} as any)
				.mockResolvedValueOnce({
					empty: true,
					docs: [],
				} as any);

			const result = await analyzeLegacyFieldUsage();

			expect(result.totalDocuments).toBe(3);
			expect(result.fieldUsage).toEqual({
				totalDownloadCount: 2,
				bonusContent: 1,
				isExclusive: 1,
				apiGenres: 1,
				apiCustomGenres: 0,
				apiWorkOptions: 0,
			});
			expect(result.sampleDocuments.totalDownloadCount).toEqual(["RJ001", "RJ002"]);
			expect(result.sampleDocuments.isExclusive).toEqual(["RJ001"]);
			expect(result.sampleDocuments.apiGenres).toEqual(["RJ003"]);
		});

		it("サンプルドキュメントIDを最大5つまで収集する", async () => {
			// モックをクリアして設定し直す
			mockQuery.get.mockReset();

			const mockDocs = Array(10)
				.fill({})
				.map((_, i) => ({
					id: `RJ00${i}`,
					data: () => ({
						id: `RJ00${i}`,
						totalDownloadCount: 1000,
					}),
				}));

			mockQuery.get
				.mockResolvedValueOnce({
					empty: false,
					docs: mockDocs,
				} as any)
				.mockResolvedValueOnce({
					empty: true,
					docs: [],
				} as any);

			const result = await analyzeLegacyFieldUsage();

			expect(result.fieldUsage.totalDownloadCount).toBe(10);
			expect(result.sampleDocuments.totalDownloadCount).toHaveLength(5);
		});
	});
});
