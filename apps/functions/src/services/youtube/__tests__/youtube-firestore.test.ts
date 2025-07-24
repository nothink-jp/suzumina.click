/**
 * YouTube Firestore操作のテスト
 * 重要な機能に絞った簡潔なテスト
 */

import type { youtube_v3 } from "googleapis";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestoreのモック
vi.mock("../../../infrastructure/database/firestore", () => {
	const mockDoc = vi.fn();
	const mockCollection = { doc: mockDoc };
	const mockBatch = {
		set: vi.fn().mockReturnThis(),
		commit: vi.fn().mockResolvedValue(undefined),
	};

	// デフォルトのmockDocumentReference
	const defaultMockDocRef = {
		id: "default-video-id",
		get: vi.fn().mockResolvedValue({ exists: false }),
	};

	mockDoc.mockReturnValue(defaultMockDocRef);

	return {
		default: {
			collection: vi.fn().mockReturnValue(mockCollection),
			batch: vi.fn().mockReturnValue(mockBatch),
		},
		Timestamp: {
			now: vi.fn().mockReturnValue({ seconds: 1621234567, nanoseconds: 123000000 }),
			fromDate: vi.fn().mockImplementation((date) => ({
				seconds: Math.floor(date.getTime() / 1000),
				nanoseconds: 0,
			})),
		},
		// テスト用にmockを外部に公開
		__mockDoc: mockDoc,
		__mockBatch: mockBatch,
	};
});

vi.mock("../../../shared/logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

import { convertVideoDataForFirestore, saveVideosToFirestore } from "../youtube-firestore";

// モックの参照を取得
const firestoreMock = vi.mocked(await import("../../../infrastructure/database/firestore"));
const mockDoc = (firestoreMock as any).__mockDoc;
const mockBatch = (firestoreMock as any).__mockBatch;

// テスト用YouTube動画データ
const mockYouTubeVideo: youtube_v3.Schema$Video = {
	id: "test-video-123",
	snippet: {
		title: "テスト動画タイトル",
		description: "テスト動画の説明文です。",
		publishedAt: "2024-01-01T12:00:00Z",
		thumbnails: {
			high: {
				url: "https://i.ytimg.com/vi/test-video-123/hqdefault.jpg",
				width: 480,
				height: 360,
			},
		},
		channelId: "test-channel-id",
		channelTitle: "涼花みなせ",
	},
	contentDetails: {
		duration: "PT10M30S",
	},
	statistics: {
		viewCount: "1000",
		likeCount: "50",
		commentCount: "10",
	},
};

describe("youtube-firestore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("convertVideoDataForFirestore", () => {
		it("正常な動画データをFirestore形式に変換できる", () => {
			const result = convertVideoDataForFirestore(mockYouTubeVideo);

			expect(result).toMatchObject({
				videoId: "test-video-123",
				title: "テスト動画タイトル",
				description: "テスト動画の説明文です。",
				publishedAt: expect.any(Object), // Timestamp
				duration: "PT10M30S",
				statistics: {
					viewCount: 1000,
					likeCount: 50,
					commentCount: 10,
					favoriteCount: 0,
				},
				thumbnailUrl: "https://i.ytimg.com/vi/test-video-123/hqdefault.jpg",
				channelId: "test-channel-id",
				channelTitle: "涼花みなせ",
				liveBroadcastContent: "none",
			});
		});

		it("ライブ配信動画のliveBroadcastContentが正しく設定される", () => {
			const liveVideo = {
				...mockYouTubeVideo,
				snippet: {
					...mockYouTubeVideo.snippet,
					liveBroadcastContent: "live" as const,
				},
			};

			const result = convertVideoDataForFirestore(liveVideo);
			expect(result.liveBroadcastContent).toBe("live");
		});

		it("サムネイル画像を優先順位に従って選択する", () => {
			const videoWithMaxres = {
				...mockYouTubeVideo,
				snippet: {
					...mockYouTubeVideo.snippet,
					thumbnails: {
						maxres: { url: "https://i.ytimg.com/vi/test/maxresdefault.jpg" },
						high: { url: "https://i.ytimg.com/vi/test/hqdefault.jpg" },
						medium: { url: "https://i.ytimg.com/vi/test/mqdefault.jpg" },
					},
				},
			};

			const result = convertVideoDataForFirestore(videoWithMaxres);
			expect(result.thumbnailUrl).toBe("https://i.ytimg.com/vi/test/maxresdefault.jpg");
		});

		it("必須フィールドが欠けている動画をスキップする", () => {
			const incompleteVideo = {
				id: "test-incomplete",
				// snippetが欠如
			} as youtube_v3.Schema$Video;

			const result = convertVideoDataForFirestore(incompleteVideo);
			expect(result).toBeNull();
		});

		it("統計情報が文字列として提供される場合も正しく数値変換する", () => {
			const videoWithStringStats = {
				...mockYouTubeVideo,
				statistics: {
					viewCount: "1500",
					likeCount: "75",
					commentCount: "25",
				},
			};

			const result = convertVideoDataForFirestore(videoWithStringStats);
			expect(result?.statistics?.viewCount).toBe(1500);
			expect(result?.statistics?.likeCount).toBe(75);
			expect(result?.statistics?.commentCount).toBe(25);
		});
	});

	describe("saveVideosToFirestore", () => {
		it("動画データを正常に保存できる", async () => {
			mockDoc.mockReturnValue({
				id: "test-video-123",
				get: vi.fn().mockResolvedValue({ exists: false }),
			});

			const result = await saveVideosToFirestore([mockYouTubeVideo]);

			expect(result).toBe(1);
			expect(mockBatch.set).toHaveBeenCalledTimes(1);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});

		it("空の配列を渡した場合は何もしない", async () => {
			const result = await saveVideosToFirestore([]);

			expect(result).toBe(0);
			expect(mockBatch.set).not.toHaveBeenCalled();
			expect(mockBatch.commit).not.toHaveBeenCalled();
		});

		it("バッチサイズ制限に従って複数回コミットする", async () => {
			// 500個の動画を作成（バッチサイズの上限をテスト）
			const manyVideos = Array.from({ length: 510 }, (_, i) => ({
				...mockYouTubeVideo,
				id: `video-${i}`,
			}));
			mockDoc.mockImplementation((id) => ({
				id,
				get: vi.fn().mockResolvedValue({ exists: false }),
			}));

			const result = await saveVideosToFirestore(manyVideos);

			expect(result).toBe(510);
			// バッチが複数回コミットされることを確認
			expect(mockBatch.commit).toHaveBeenCalledTimes(2);
		});

		it("無効な動画データをスキップして処理を継続する", async () => {
			const mixedVideos = [
				mockYouTubeVideo,
				{ id: "invalid" } as youtube_v3.Schema$Video, // 無効なデータ
				{ ...mockYouTubeVideo, id: "valid-2" },
			];
			mockDoc.mockImplementation((id) => ({
				id,
				get: vi.fn().mockResolvedValue({ exists: false }),
			}));

			const result = await saveVideosToFirestore(mixedVideos);

			expect(result).toBe(2); // 有効なデータのみカウント
			expect(mockBatch.set).toHaveBeenCalledTimes(2);
		});
	});

	describe("userTags保持機能", () => {
		it("新しい動画にはuserTagsが初期化される", async () => {
			// 新しい動画（存在しない）
			const mockNewDoc = { exists: false };
			mockDoc.mockReturnValue({
				id: "new-video-123",
				get: vi.fn().mockResolvedValue(mockNewDoc),
			});

			await saveVideosToFirestore([mockYouTubeVideo]);

			// userTagsが初期化されることを確認
			expect(mockBatch.set).toHaveBeenCalledWith(
				expect.objectContaining({ id: "new-video-123" }),
				expect.objectContaining({ userTags: [] }),
				{ merge: true },
			);
		});

		it("既存の動画のuserTagsは保持される", async () => {
			// 既存の動画（存在する）
			const mockExistingDoc = {
				exists: true,
				data: vi.fn().mockReturnValue({ userTags: ["existing-tag"] }),
			};
			mockDoc.mockReturnValue({
				id: "existing-video-123",
				get: vi.fn().mockResolvedValue(mockExistingDoc),
			});

			await saveVideosToFirestore([mockYouTubeVideo]);

			// userTagsが含まれていないことを確認（既存値を保持）
			expect(mockBatch.set).toHaveBeenCalledWith(
				expect.objectContaining({ id: "existing-video-123" }),
				expect.not.objectContaining({ userTags: expect.anything() }),
				{ merge: true },
			);
		});
	});

	describe("エラーハンドリング", () => {
		it("Firestoreバッチコミットでエラーが発生した場合に適切に処理する", async () => {
			mockBatch.commit.mockRejectedValue(new Error("Batch commit failed"));

			// エラーがログ出力されることを確認（実際のthrowはしない）
			await saveVideosToFirestore([mockYouTubeVideo]);

			const loggerModule = await import("../../../shared/logger");
			const loggerError = vi.mocked(loggerModule.error);
			expect(loggerError).toHaveBeenCalledWith(
				expect.stringContaining("Firestoreバッチコミット中にエラーが発生しました"),
				expect.any(Error),
			);
		});
	});
});
