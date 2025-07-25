/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getAudioButtonsV2Action,
	getAudioButtonV2Action,
	getPublicAudioButtonsV2Action,
	recordAudioButtonPlayV2Action,
} from "../audio-button-actions-v2";

// モジュールのモック
vi.mock("@/auth", () => ({
	auth: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => {
	const mockDoc = vi.fn();
	const mockGet = vi.fn();
	const mockUpdate = vi.fn();
	const mockWhere = vi.fn();
	const mockOrderBy = vi.fn();
	const mockLimit = vi.fn();
	const mockCollectionGet = vi.fn();

	return {
		db: {
			collection: vi.fn(() => ({
				doc: mockDoc.mockReturnValue({
					get: mockGet,
					update: mockUpdate,
				}),
				where: mockWhere.mockReturnValue({
					orderBy: mockOrderBy.mockReturnValue({
						limit: mockLimit.mockReturnValue({
							get: mockCollectionGet,
						}),
					}),
				}),
			})),
			runTransaction: vi.fn(),
		},
	};
});

// モックのインポート
import { auth } from "@/auth";
import { db } from "@/lib/firebase-admin";

// テスト用データ
const createMockFirestoreData = (overrides = {}) => ({
	title: "テスト音声ボタン",
	description: "テスト用の説明",
	tags: ["タグ1", "タグ2"],
	sourceVideoId: "dQw4w9WgXcQ", // 有効なYouTube ID形式（11文字）
	sourceVideoTitle: "テスト動画",
	startTime: 10,
	endTime: 20,
	createdBy: "user-123",
	createdByName: "テストユーザー",
	isPublic: true,
	playCount: 100,
	likeCount: 10,
	dislikeCount: 1,
	favoriteCount: 5,
	createdAt: { toDate: () => new Date("2024-01-01") },
	updatedAt: { toDate: () => new Date("2024-01-02") },
	...overrides,
});

describe("audio-button-actions-v2", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAudioButtonV2Action", () => {
		it("有効なIDで音声ボタンを取得できる", async () => {
			const mockData = createMockFirestoreData();
			const mockDoc = {
				exists: true,
				id: "test-button-123",
				data: () => mockData,
			};

			vi.mocked(db.collection).mockReturnValue({
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue(mockDoc),
				}),
			} as any);

			const result = await getAudioButtonV2Action("test-button-123");

			expect(result.success).toBe(true);
			expect(result.audioButton).toBeDefined();
			expect(result.audioButton?.id.toString()).toBe("test-button-123");
		});

		it("無効なIDでエラーを返す", async () => {
			const result = await getAudioButtonV2Action("");

			expect(result.success).toBe(false);
			expect(result.error).toBe("有効な音声ボタンIDが必要です");
		});

		it("存在しないIDでエラーを返す", async () => {
			const mockDoc = {
				exists: false,
			};

			vi.mocked(db.collection).mockReturnValue({
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue(mockDoc),
				}),
			} as any);

			const result = await getAudioButtonV2Action("non-existent-id");

			expect(result.success).toBe(false);
			expect(result.error).toBe("音声ボタンが見つかりません");
		});

		it("Firestoreエラーをハンドリングする", async () => {
			vi.mocked(db.collection).mockReturnValue({
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockRejectedValue(new Error("Firestore error")),
				}),
			} as any);

			const result = await getAudioButtonV2Action("test-button-123");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Firestore error");
		});
	});

	describe("getAudioButtonsV2Action", () => {
		it("有効なID配列で複数の音声ボタンを取得できる", async () => {
			const mockData1 = createMockFirestoreData({ title: "ボタン1" });
			const mockData2 = createMockFirestoreData({ title: "ボタン2" });

			const mockDocs = [
				{ exists: true, id: "button-1", data: () => mockData1 },
				{ exists: true, id: "button-2", data: () => mockData2 },
			];

			const callIndex = 0;
			vi.mocked(db.collection).mockReturnValue({
				doc: vi.fn().mockImplementation((id) => ({
					get: vi.fn().mockResolvedValue(id === "button-1" ? mockDocs[0] : mockDocs[1]),
				})),
			} as any);

			const result = await getAudioButtonsV2Action(["button-1", "button-2"]);

			expect(result.success).toBe(true);
			expect(result.audioButtons).toHaveLength(2);
		});

		it("空の配列で空の結果を返す", async () => {
			const result = await getAudioButtonsV2Action([]);

			expect(result.success).toBe(true);
			expect(result.audioButtons).toEqual([]);
		});

		it("存在しないIDはスキップする", async () => {
			const mockData = createMockFirestoreData();

			vi.mocked(db.collection).mockReturnValue({
				doc: vi.fn().mockImplementation((id) => ({
					get: vi
						.fn()
						.mockResolvedValue(
							id === "button-1"
								? { exists: true, id: "button-1", data: () => mockData }
								: { exists: false },
						),
				})),
			} as any);

			const result = await getAudioButtonsV2Action(["button-1", "non-existent"]);

			expect(result.success).toBe(true);
			expect(result.audioButtons).toHaveLength(1);
		});

		it("30件を超える場合エラーを返す", async () => {
			const manyIds = Array.from({ length: 31 }, (_, i) => `button-${i}`);

			const result = await getAudioButtonsV2Action(manyIds);

			expect(result.success).toBe(false);
			expect(result.error).toBe("一度に取得できる音声ボタンは30件までです");
		});
	});

	describe("getPublicAudioButtonsV2Action", () => {
		it("公開音声ボタンを取得できる", async () => {
			const mockData = createMockFirestoreData();
			const mockSnapshot = {
				forEach: (callback: any) => {
					callback({
						id: "button-1",
						data: () => mockData,
					});
				},
			};

			vi.mocked(db.collection).mockReturnValue({
				where: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue(mockSnapshot),
						}),
					}),
				}),
			} as any);

			const result = await getPublicAudioButtonsV2Action(10);

			expect(result.success).toBe(true);
			expect(result.audioButtons).toHaveLength(1);
		});

		it("無効な取得件数でエラーを返す", async () => {
			const result = await getPublicAudioButtonsV2Action(101);

			expect(result.success).toBe(false);
			expect(result.error).toBe("取得件数は1〜100の間で指定してください");
		});
	});

	describe("recordAudioButtonPlayV2Action", () => {
		it.skip("再生回数を記録できる", async () => {
			const mockDoc = {
				exists: true,
				data: () => createMockFirestoreData({ playCount: 100 }),
			};

			const mockTransaction = {
				get: vi.fn().mockResolvedValue(mockDoc),
				update: vi.fn(),
			};

			vi.mocked(db.runTransaction).mockImplementation(async (callback) => {
				await callback(mockTransaction as any);
			});

			const result = await recordAudioButtonPlayV2Action("button-123");

			expect(result.success).toBe(true);
			expect(mockTransaction.update).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					playCount: 101,
					updatedAt: expect.any(Date),
				}),
			);
		});

		it.skip("存在しないボタンでエラーを返す", async () => {
			const mockDoc = {
				exists: false,
			};

			vi.mocked(db.runTransaction).mockImplementation(async (callback) => {
				const mockTransaction = {
					get: vi.fn().mockResolvedValue(mockDoc),
				};
				await callback(mockTransaction as any);
			});

			const result = await recordAudioButtonPlayV2Action("non-existent");

			expect(result.success).toBe(false);
			expect(result.error).toBe("音声ボタンが見つかりません");
		});
	});

	describe("updateAudioButtonV2Action", () => {
		it("認証されていない場合エラーを返す", async () => {
			const { updateAudioButtonV2Action } = await import("../audio-button-actions-v2");
			vi.mocked(auth).mockResolvedValue(null);

			const result = await updateAudioButtonV2Action("button-123", {});

			expect(result.success).toBe(false);
			expect(result.error).toBe("ログインが必要です");
		});

		it("管理者でない場合エラーを返す", async () => {
			const { updateAudioButtonV2Action } = await import("../audio-button-actions-v2");
			vi.mocked(auth).mockResolvedValue({
				user: {
					id: "user-123",
					discordId: "discord-123",
					role: "user",
				},
			} as any);

			const result = await updateAudioButtonV2Action("button-123", {});

			expect(result.success).toBe(false);
			expect(result.error).toBe("この操作には管理者権限が必要です");
		});

		it("管理者の場合成功を返す", async () => {
			const { updateAudioButtonV2Action } = await import("../audio-button-actions-v2");
			vi.mocked(auth).mockResolvedValue({
				user: {
					id: "user-123",
					discordId: "discord-123",
					role: "admin",
				},
			} as any);

			const result = await updateAudioButtonV2Action("button-123", {});

			expect(result.success).toBe(true);
		});
	});
});
