/**
 * データ整合性チェックのテスト
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestoreモック
vi.mock("../../infrastructure/database/firestore", () => {
	const mockCollection = vi.fn();
	const mockBatch = vi.fn();

	return {
		default: {
			collection: mockCollection,
			batch: mockBatch,
		},
		Timestamp: {
			now: vi.fn(() => ({
				toDate: () => new Date(),
			})),
		},
	};
});

// ロガーモック
vi.mock("../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

import firestore from "../../infrastructure/database/firestore";
// テスト対象をインポート（モックの後）
import { checkDataIntegrity } from "../data-integrity-check";

// モック関数をvitestから取得
const mockCollection = vi.mocked(firestore.collection);
const mockBatch = vi.mocked(firestore.batch);

// その他のモック関数
const mockDoc = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockCommit = vi.fn();
const mockSet = vi.fn();

describe("checkDataIntegrity", () => {
	const mockEvent: CloudEvent<unknown> = {
		specversion: "1.0",
		type: "google.pubsub.topic.publish",
		source: "test",
		subject: "test",
		id: "test-id",
		time: new Date().toISOString(),
		datacontenttype: "application/json",
		data: {},
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// バッチモックの設定
		mockBatch.mockReturnValue({
			update: mockUpdate,
			delete: mockDelete,
			commit: mockCommit,
		});

		// デフォルトのcommit
		mockCommit.mockResolvedValue(undefined);

		// デフォルトのset
		mockSet.mockResolvedValue(undefined);
	});

	it("空のコレクションで正常に完了する", async () => {
		// 空のコレクションをモック
		const emptySnapshot = {
			size: 0,
			docs: [],
		};

		// collection().get()のモック
		mockCollection.mockImplementation((collName: string) => {
			if (collName === "circles" || collName === "creators" || collName === "dlsiteWorks") {
				return {
					get: vi.fn().mockResolvedValue(emptySnapshot),
					doc: mockDoc,
				};
			}
			if (collName === "dlsiteMetadata") {
				return {
					doc: vi.fn(() => ({
						set: mockSet,
						collection: vi.fn(() => ({
							doc: vi.fn(() => ({
								set: mockSet,
							})),
							orderBy: vi.fn(() => ({
								limit: vi.fn(() => ({
									get: vi.fn().mockResolvedValue(emptySnapshot),
								})),
							})),
						})),
					})),
				};
			}
			return {};
		});

		await checkDataIntegrity(mockEvent);

		// 結果が保存されたことを確認
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				latest: expect.objectContaining({
					timestamp: expect.any(String),
					checks: expect.objectContaining({
						circleWorkCounts: { checked: 0, mismatches: 0, fixed: 0 },
						orphanedCreators: { checked: 0, found: 0, cleaned: 0 },
						workCircleConsistency: { checked: 0, mismatches: 0, fixed: 0 },
					}),
					totalIssues: 0,
					totalFixed: 0,
					executionTimeMs: expect.any(Number),
				}),
			}),
			{ merge: true },
		);
	});

	it("重複した作品IDを検出して修正する", async () => {
		// サークルデータのモック
		const mockCircles = {
			size: 1,
			docs: [
				{
					id: "circle1",
					data: () => ({
						workIds: ["work1", "work1", "work2"], // 重複あり
					}),
					ref: {
						update: mockUpdate,
					},
				},
			],
		};

		// 作品の存在確認モック（現在は使用されない - コメントアウトされているため）
		const mockWorkDoc = {
			get: vi.fn().mockResolvedValue({ exists: true }),
		};

		// creators/worksの空のスナップショット
		const emptySnapshot = { size: 0, docs: [] };

		// collection()のモック
		mockCollection.mockImplementation((collName: string) => {
			if (collName === "circles") {
				return {
					get: vi.fn().mockResolvedValue(mockCircles),
					doc: mockDoc,
				};
			}
			if (collName === "creators" || collName === "dlsiteWorks") {
				return {
					get: vi.fn().mockResolvedValue(emptySnapshot),
					doc: vi.fn(() => mockWorkDoc),
				};
			}
			if (collName === "dlsiteMetadata") {
				return {
					doc: vi.fn(() => ({
						set: mockSet,
						collection: vi.fn(() => ({
							doc: vi.fn(() => ({
								set: mockSet,
							})),
							orderBy: vi.fn(() => ({
								limit: vi.fn(() => ({
									get: vi.fn().mockResolvedValue(emptySnapshot),
								})),
							})),
						})),
					})),
				};
			}
			return {};
		});

		await checkDataIntegrity(mockEvent);

		// バッチ更新が呼ばれたことを確認
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				workIds: ["work1", "work2"], // 重複が除去されている
			}),
		);

		expect(mockCommit).toHaveBeenCalled();
	});

	it("孤立したCreatorマッピングを削除する", async () => {
		// クリエイターデータのモック
		const mockCreators = {
			size: 1,
			docs: [
				{
					id: "creator1",
					ref: {
						collection: vi.fn(() => ({
							get: vi.fn().mockResolvedValue({
								size: 2,
								docs: [
									{
										id: "work1",
										ref: { delete: mockDelete },
									},
									{
										id: "work2",
										ref: { delete: mockDelete },
									},
								],
							}),
						})),
						delete: mockDelete,
					},
				},
			],
		};

		// 作品の存在確認モック
		const mockWorkDoc1 = { get: vi.fn().mockResolvedValue({ exists: true }) };
		const mockWorkDoc2 = { get: vi.fn().mockResolvedValue({ exists: false }) };

		// 空のスナップショット
		const emptySnapshot = { size: 0, docs: [] };

		// collection()のモック
		mockCollection.mockImplementation((collName: string) => {
			if (collName === "circles" || collName === "dlsiteWorks") {
				return {
					get: vi.fn().mockResolvedValue(emptySnapshot),
					doc: mockDoc,
				};
			}
			if (collName === "creators") {
				return {
					get: vi.fn().mockResolvedValue(mockCreators),
					doc: mockDoc,
				};
			}
			if (collName === "dlsiteMetadata") {
				return {
					doc: vi.fn(() => ({
						set: mockSet,
						collection: vi.fn(() => ({
							doc: vi.fn(() => ({
								set: mockSet,
							})),
							orderBy: vi.fn(() => ({
								limit: vi.fn(() => ({
									get: vi.fn().mockResolvedValue(emptySnapshot),
								})),
							})),
						})),
					})),
				};
			}
			return {};
		});

		// works.doc()のモック
		let callCount = 0;
		mockDoc.mockImplementation(() => {
			callCount++;
			if (callCount === 1) return mockWorkDoc1;
			if (callCount === 2) return mockWorkDoc2;
			return mockWorkDoc1;
		});

		await checkDataIntegrity(mockEvent);

		// work2のマッピングが削除されたことを確認
		expect(mockDelete).toHaveBeenCalled();
		expect(mockCommit).toHaveBeenCalled();
	});
});
