import type { FirestoreAudioButtonData } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	convertToAudioButtonPlainObject,
	getAudioButtonsByUser,
	getUserAudioButtonStats,
	incrementPlayCount,
} from "../audio-buttons-firestore";
import { getFirestore } from "../firestore";

// Firestoreモック
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../firestore", () => ({
	getFirestore: vi.fn(),
}));

// @google-cloud/firestore の FieldValue は firestore インスタンスに含まれる

describe("audio-buttons-firestore", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Firestoreインスタンスのモック設定
		const mockFirestore = {
			collection: mockCollection,
			FieldValue: {
				increment: vi.fn((value: number) => ({ operand: value })),
			},
		};

		vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

		// チェーンメソッドのセットアップ
		mockCollection.mockReturnValue({
			where: mockWhere,
			doc: mockDoc,
		});

		mockWhere.mockReturnValue({
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			get: mockGet,
		});

		mockOrderBy.mockReturnValue({
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			get: mockGet,
		});

		mockLimit.mockReturnValue({
			get: mockGet,
		});

		mockDoc.mockReturnValue({
			update: mockUpdate,
		});
	});

	describe("convertToAudioButtonPlainObject", () => {
		it("should convert Firestore data to frontend format", () => {
			const mockFirestoreData: FirestoreAudioButtonData = {
				id: "test-button-1",
				title: "テスト音声ボタン",
				tags: ["テスト", "音声"],
				sourceVideoId: "test-video-123",
				sourceVideoTitle: "テスト動画",
				startTime: 10,
				endTime: 25,
				createdBy: "discord-user-123",
				createdByName: "テストユーザー",
				isPublic: true,
				playCount: 100,
				likeCount: 50,
				favoriteCount: 25,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			};

			const result = convertToAudioButtonPlainObject(mockFirestoreData);

			expect(result).toMatchObject({
				id: "test-button-1",
				title: "テスト音声ボタン",
				tags: ["テスト", "音声"],
				sourceVideoId: "test-video-123",
				sourceVideoTitle: "テスト動画",
				sourceVideoThumbnailUrl: "https://img.youtube.com/vi/test-video-123/maxresdefault.jpg",
				startTime: 10,
				endTime: 25,
				createdBy: "discord-user-123",
				createdByName: "テストユーザー",
				isPublic: true,
				playCount: 100,
				likeCount: 50,
				favoriteCount: 25,
			});

			expect(result._computed).toBeDefined();
			expect(result._computed.durationText).toBe("15秒"); // 25-10=15秒
			expect(result._computed.relativeTimeText).toBeDefined();
		});

		it("should handle duration formatting correctly", () => {
			const shortDurationData: FirestoreAudioButtonData = {
				id: "short-button",
				title: "短い音声",
				tags: [],
				sourceVideoId: "video-123",
				sourceVideoTitle: "動画",
				startTime: 0,
				endTime: 5,
				createdBy: "user-123",
				createdByName: "ユーザー",
				isPublic: true,
				playCount: 0,
				likeCount: 0,
				favoriteCount: 0,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			};

			const result = convertToAudioButtonPlainObject(shortDurationData);
			expect(result._computed.durationText).toBe("5秒");
		});

		it("should handle equal start and end time", () => {
			const equalTimeData: FirestoreAudioButtonData = {
				id: "equal-time-button",
				title: "同じ開始終了時間",
				tags: [],
				sourceVideoId: "video-123",
				sourceVideoTitle: "動画",
				startTime: 10,
				endTime: 10, // Same as startTime
				createdBy: "user-123",
				createdByName: "ユーザー",
				isPublic: true,
				playCount: 0,
				likeCount: 0,
				favoriteCount: 0,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			};

			const result = convertToAudioButtonPlainObject(equalTimeData);
			expect(result._computed.durationText).toBe("再生");
		});

		it("should handle missing favoriteCount", () => {
			const noFavoriteCountData: FirestoreAudioButtonData = {
				id: "no-favorite-button",
				title: "お気に入り数なし",
				tags: [],
				sourceVideoId: "video-123",
				sourceVideoTitle: "動画",
				startTime: 0,
				endTime: 10,
				createdBy: "user-123",
				createdByName: "ユーザー",
				isPublic: true,
				playCount: 0,
				likeCount: 0,
				favoriteCount: undefined,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			};

			const result = convertToAudioButtonPlainObject(noFavoriteCountData);
			expect(result.favoriteCount).toBe(0);
		});
	});

	describe("getAudioButtonsByUser", () => {
		it("should fetch user's audio buttons with default options", async () => {
			const mockDocuments = [
				{
					id: "button-1",
					data: () => ({
						title: "音声ボタン1",
						tags: ["タグ1"],
						sourceVideoId: "video-1",
						sourceVideoTitle: "動画1",
						startTime: 0,
						endTime: 10,
						createdBy: "user-123",
						createdByName: "ユーザー",
						isPublic: true,
						playCount: 50,
						likeCount: 25,
						favoriteCount: 10,
						createdAt: "2025-01-01T00:00:00.000Z",
						updatedAt: "2025-01-01T00:00:00.000Z",
					}),
				},
			];

			mockGet.mockResolvedValue({
				docs: mockDocuments,
			});

			const result = await getAudioButtonsByUser("user-123");

			expect(mockCollection).toHaveBeenCalledWith("audioButtons");
			expect(mockWhere).toHaveBeenCalledWith("createdBy", "==", "user-123");
			// isPublic フィルタはクライアント側で適用される
			expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
			expect(mockLimit).toHaveBeenCalledWith(40); // limit * 2

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe("音声ボタン1");
		});

		it("should respect custom options", async () => {
			mockGet.mockResolvedValue({ docs: [] });

			await getAudioButtonsByUser("user-123", {
				limit: 5,
				onlyPublic: false,
				orderBy: "mostPlayed",
			});

			// mostPlayed はクライアント側でソートされる
			expect(mockLimit).toHaveBeenCalledWith(10); // limit * 2
			// onlyPublic: false の場合、isPublic フィルターは追加されない
		});

		it("should handle different sort orders", async () => {
			mockGet.mockResolvedValue({ docs: [] });

			// Test oldest first
			await getAudioButtonsByUser("user-123", { orderBy: "oldest" });
			expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "asc");

			vi.clearAllMocks();
			// Reset mock chains
			mockCollection.mockReturnValue({ where: mockWhere });
			mockWhere.mockReturnValue({
				where: mockWhere,
				orderBy: mockOrderBy,
				limit: mockLimit,
				get: mockGet,
			});
			mockOrderBy.mockReturnValue({
				where: mockWhere,
				orderBy: mockOrderBy,
				limit: mockLimit,
				get: mockGet,
			});
			mockLimit.mockReturnValue({ get: mockGet });

			// Test most played - クライアント側でソートされるため、orderByは呼び出されない
			await getAudioButtonsByUser("user-123", { orderBy: "mostPlayed" });
			expect(mockOrderBy).not.toHaveBeenCalledWith("playCount", "desc");
		});

		it("should handle Firestore errors", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			await expect(getAudioButtonsByUser("user-123")).rejects.toThrow(
				"音声ボタン一覧の取得に失敗しました",
			);
		});
	});

	describe("incrementPlayCount", () => {
		it("should increment play count successfully", async () => {
			mockUpdate.mockResolvedValue(undefined);

			await incrementPlayCount("button-123");

			expect(mockCollection).toHaveBeenCalledWith("audioButtons");
			expect(mockDoc).toHaveBeenCalledWith("button-123");
			expect(mockUpdate).toHaveBeenCalledWith({
				playCount: expect.objectContaining({ operand: 1 }),
				updatedAt: expect.any(String),
			});
		});

		it("should handle update errors silently", async () => {
			mockUpdate.mockRejectedValue(new Error("Update failed"));

			// Should not throw error
			await expect(incrementPlayCount("button-123")).resolves.toBeUndefined();
		});
	});

	describe("getUserAudioButtonStats", () => {
		it("should calculate user statistics correctly", async () => {
			const allButtonsSnapshot = {
				size: 3,
				docs: [
					{ data: () => ({ playCount: 100 }) },
					{ data: () => ({ playCount: 50 }) },
					{ data: () => ({ playCount: 25 }) },
				],
			};

			const publicButtonsSnapshot = {
				size: 2,
			};

			mockGet
				.mockResolvedValueOnce(allButtonsSnapshot)
				.mockResolvedValueOnce(publicButtonsSnapshot);

			const result = await getUserAudioButtonStats("user-123");

			expect(result).toEqual({
				totalButtons: 3,
				totalPlays: 175, // 100 + 50 + 25
				averagePlays: 58, // Math.round(175 / 3)
				publicButtons: 2,
			});

			expect(mockWhere).toHaveBeenCalledWith("createdBy", "==", "user-123");
		});

		it("should handle user with no buttons", async () => {
			const emptySnapshot = {
				size: 0,
				docs: [],
			};

			mockGet.mockResolvedValue(emptySnapshot);

			const result = await getUserAudioButtonStats("user-123");

			expect(result).toEqual({
				totalButtons: 0,
				totalPlays: 0,
				averagePlays: 0,
				publicButtons: 0,
			});
		});

		it("should handle missing playCount in documents", async () => {
			const snapshotWithMissingPlayCount = {
				size: 2,
				docs: [
					{ data: () => ({ playCount: 10 }) },
					{ data: () => ({}) }, // No playCount
				],
			};

			mockGet
				.mockResolvedValueOnce(snapshotWithMissingPlayCount)
				.mockResolvedValueOnce({ size: 1 });

			const result = await getUserAudioButtonStats("user-123");

			expect(result).toEqual({
				totalButtons: 2,
				totalPlays: 10, // Only count the valid playCount
				averagePlays: 5, // Math.round(10 / 2)
				publicButtons: 1,
			});
		});

		it("should return default values on error", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			const result = await getUserAudioButtonStats("user-123");

			expect(result).toEqual({
				totalButtons: 0,
				totalPlays: 0,
				averagePlays: 0,
				publicButtons: 0,
			});
		});
	});
});
