/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getAudioButtonAction,
	getAudioButtonsAction,
	getPublicAudioButtonsAction,
	recordAudioButtonPlayAction,
} from "../audio-button-actions";

// モジュールのモック
vi.mock("@/auth", () => ({
	auth: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(),
}));

// モックのインポート
import { auth } from "@/auth";
import { getFirestore } from "@/lib/firestore";

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

describe("audio-button-actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAudioButtonAction", () => {
		it("有効なIDで音声ボタンを取得できる", async () => {
			const mockData = createMockFirestoreData();
			const mockDoc = {
				exists: true,
				id: "test-button-123",
				data: () => mockData,
			};

			const mockFirestore = {
				collection: vi.fn().mockReturnValue({
					doc: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockDoc),
					}),
				}),
			};

			vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

			const result = await getAudioButtonAction("test-button-123");

			expect(result.success).toBe(true);
			expect(result.audioButton).toBeDefined();
			expect(result.audioButton?.id.toString()).toBe("test-button-123");
		});

		it("無効なIDでエラーを返す", async () => {
			const result = await getAudioButtonAction("");

			expect(result.success).toBe(false);
			expect(result.error).toBe("有効な音声ボタンIDが必要です");
		});

		it("存在しないIDでエラーを返す", async () => {
			const mockDoc = {
				exists: false,
			};

			const mockFirestore = {
				collection: vi.fn().mockReturnValue({
					doc: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockDoc),
					}),
				}),
			};

			vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

			const result = await getAudioButtonAction("non-existent-id");

			expect(result.success).toBe(false);
			expect(result.error).toBe("音声ボタンが見つかりません");
		});

		it("Firestoreエラーをハンドリングする", async () => {
			const mockFirestore = {
				collection: vi.fn().mockReturnValue({
					doc: vi.fn().mockReturnValue({
						get: vi.fn().mockRejectedValue(new Error("Firestore error")),
					}),
				}),
			};

			vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

			const result = await getAudioButtonAction("test-button-123");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Firestore error");
		});
	});

	describe("getAudioButtonsAction", () => {
		it("有効なID配列で複数の音声ボタンを取得できる", async () => {
			const mockData1 = createMockFirestoreData({ title: "ボタン1" });
			const mockData2 = createMockFirestoreData({ title: "ボタン2" });

			const mockDocs = {
				"button-1": { exists: true, id: "button-1", data: () => mockData1 },
				"button-2": { exists: true, id: "button-2", data: () => mockData2 },
			};

			const mockFirestore = {
				collection: vi.fn().mockReturnValue({
					doc: vi.fn().mockImplementation((id) => ({
						get: vi.fn().mockResolvedValue(mockDocs[id] || { exists: false }),
					})),
				}),
			};

			vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

			const result = await getAudioButtonsAction(["button-1", "button-2"]);

			expect(result.success).toBe(true);
			expect(result.audioButtons).toHaveLength(2);
		});

		it("空の配列で空の結果を返す", async () => {
			const result = await getAudioButtonsAction([]);

			expect(result.success).toBe(true);
			expect(result.audioButtons).toEqual([]);
		});

		it("存在しないIDはスキップする", async () => {
			const mockData = createMockFirestoreData();

			const mockFirestore = {
				collection: vi.fn().mockReturnValue({
					doc: vi.fn().mockImplementation((id) => ({
						get: vi
							.fn()
							.mockResolvedValue(
								id === "button-1"
									? { exists: true, id: "button-1", data: () => mockData }
									: { exists: false },
							),
					})),
				}),
			};

			vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

			const result = await getAudioButtonsAction(["button-1", "non-existent"]);

			expect(result.success).toBe(true);
			expect(result.audioButtons).toHaveLength(1);
		});

		it("30件を超える場合エラーを返す", async () => {
			const manyIds = Array.from({ length: 31 }, (_, i) => `button-${i}`);

			const result = await getAudioButtonsAction(manyIds);

			expect(result.success).toBe(false);
			expect(result.error).toBe("一度に取得できる音声ボタンは30件までです");
		});
	});

	describe("getPublicAudioButtonsAction", () => {
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

			const mockFirestore = {
				collection: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi.fn().mockReturnValue({
								get: vi.fn().mockResolvedValue(mockSnapshot),
							}),
						}),
					}),
				}),
			};

			vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

			const result = await getPublicAudioButtonsAction(10);

			expect(result.success).toBe(true);
			expect(result.audioButtons).toHaveLength(1);
		});

		it("無効な取得件数でエラーを返す", async () => {
			const result = await getPublicAudioButtonsAction(101);

			expect(result.success).toBe(false);
			expect(result.error).toBe("取得件数は1〜100の間で指定してください");
		});
	});

	describe("recordAudioButtonPlayAction", () => {
		it("再生回数を記録できる", async () => {
			const mockDocRef = { id: "button-123" };
			const mockDoc = {
				exists: true,
				data: () => createMockFirestoreData({ playCount: 100 }),
			};

			const mockTransaction = {
				get: vi.fn().mockResolvedValue(mockDoc),
				update: vi.fn(),
			};

			const mockFirestore = {
				collection: vi.fn().mockReturnValue({
					doc: vi.fn().mockReturnValue(mockDocRef),
				}),
				runTransaction: vi.fn().mockImplementation(async (callback) => {
					await callback(mockTransaction);
				}),
			};

			vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

			const result = await recordAudioButtonPlayAction("button-123");

			expect(result.success).toBe(true);
			expect(mockTransaction.get).toHaveBeenCalledWith(mockDocRef);
			expect(mockTransaction.update).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					playCount: 101,
					updatedAt: expect.any(Date),
				}),
			);
		});

		it("存在しないボタンでエラーを返す", async () => {
			const mockDocRef = { id: "non-existent" };
			const mockDoc = {
				exists: false,
			};

			const mockFirestore = {
				collection: vi.fn().mockReturnValue({
					doc: vi.fn().mockReturnValue(mockDocRef),
				}),
				runTransaction: vi.fn().mockImplementation(async (callback) => {
					const mockTransaction = {
						get: vi.fn().mockResolvedValue(mockDoc),
					};
					// Transactionコールバック内でエラーがスローされることを想定
					await callback(mockTransaction);
				}),
			};

			vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

			const result = await recordAudioButtonPlayAction("non-existent");

			expect(result.success).toBe(false);
			expect(result.error).toBe("音声ボタンが見つかりません");
		});
	});

	describe("updateAudioButtonAction", () => {
		it("認証されていない場合エラーを返す", async () => {
			const { updateAudioButtonAction } = await import("../audio-button-actions");
			vi.mocked(auth).mockResolvedValue(null);

			const result = await updateAudioButtonAction("button-123", {});

			expect(result.success).toBe(false);
			expect(result.error).toBe("ログインが必要です");
		});

		it("管理者でない場合エラーを返す", async () => {
			const { updateAudioButtonAction } = await import("../audio-button-actions");
			vi.mocked(auth).mockResolvedValue({
				user: {
					id: "user-123",
					discordId: "discord-123",
					role: "user",
				},
			} as any);

			const result = await updateAudioButtonAction("button-123", {});

			expect(result.success).toBe(false);
			expect(result.error).toBe("この操作には管理者権限が必要です");
		});

		it("管理者の場合成功を返す", async () => {
			const { updateAudioButtonAction } = await import("../audio-button-actions");
			vi.mocked(auth).mockResolvedValue({
				user: {
					id: "user-123",
					discordId: "discord-123",
					role: "admin",
				},
			} as any);

			const result = await updateAudioButtonAction("button-123", {});

			expect(result.success).toBe(true);
		});
	});
});
