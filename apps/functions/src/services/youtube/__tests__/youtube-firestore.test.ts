/**
 * YouTube Firestore  Service Tests
 */

import type { Video } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveVideosToFirestore, updateVideoWith } from "../youtube-firestore";

// Mocks
vi.mock("../../../infrastructure/database/firestore", () => ({
	default: {
		collection: vi.fn(() => ({
			doc: vi.fn(() => ({
				set: vi.fn(),
			})),
		})),
		batch: vi.fn(() => ({
			set: vi.fn(),
			commit: vi.fn().mockResolvedValue(undefined),
		})),
	},
	Timestamp: {
		now: vi.fn(() => ({
			toDate: () => new Date("2025-01-25T00:00:00Z"),
			seconds: 1737763200,
			nanoseconds: 0,
		})),
	},
}));

vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

vi.mock("../../mappers/video-mapper", () => ({
	VideoMapper: {
		fromYouTubeAPI: vi.fn(),
	},
}));

import firestore from "../../../infrastructure/database/firestore";
import * as logger from "../../../shared/logger";
import { VideoMapper } from "../../mappers/video-mapper";

describe("YouTube Firestore  Service", () => {
	let mockBatches: any[];
	let mockCollection: any;
	let mockDoc: any;

	beforeEach(() => {
		mockBatches = [];
		mockDoc = {
			set: vi.fn(),
		};
		mockCollection = {
			doc: vi.fn(() => mockDoc),
		};

		vi.mocked(firestore.batch).mockImplementation(() => {
			const batch = {
				set: vi.fn(),
				commit: vi.fn().mockResolvedValue(undefined),
			};
			mockBatches.push(batch);
			return batch;
		});
		vi.mocked(firestore.collection).mockReturnValue(mockCollection as any);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
	});

	describe("saveVideosToFirestore", () => {
		const createMockYouTubeVideo = (id: string, channelId: string): youtube_v3.Schema$Video => ({
			id,
			snippet: {
				channelId,
				title: `Video ${id}`,
				description: "Test video",
				publishedAt: "2025-01-25T00:00:00Z",
			},
			contentDetails: {
				duration: "PT5M",
			},
			statistics: {
				viewCount: "1000",
				likeCount: "100",
			},
		});

		const createMockVideoEntity = (id: string): Video => {
			const mockEntity = {
				content: {
					videoId: { value: id },
				},
				toFirestore: vi.fn(() => ({
					videoId: id,
					title: `Video ${id}`,
					description: "Test video",
					channelId: "test-channel",
					channelTitle: "Test Channel",
					publishedAt: new Date("2025-01-25T00:00:00Z"),
					thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
					lastFetchedAt: new Date("2025-01-25T00:00:00Z"),
				})),
			} as any;
			return mockEntity;
		};

		it("空の配列を渡した場合は0を返す", async () => {
			const result = await saveVideosToFirestore([]);
			expect(result).toBe(0);
			expect(mockBatches).toHaveLength(0);
		});

		it("Entity 形式で動画を保存する", async () => {
			const mockVideos = [
				createMockYouTubeVideo("video1", "channel1"),
				createMockYouTubeVideo("video2", "channel1"),
			];

			vi.mocked(VideoMapper.fromYouTubeAPI)
				.mockReturnValueOnce(createMockVideoEntity("video1"))
				.mockReturnValueOnce(createMockVideoEntity("video2"));

			const result = await saveVideosToFirestore(mockVideos);

			expect(result).toBe(2);
			expect(mockBatches).toHaveLength(1);
			expect(mockBatches[0].set).toHaveBeenCalledTimes(2);
			expect(mockBatches[0].commit).toHaveBeenCalledTimes(1);

			// データが正しく保存されていることを確認
			const firstCall = mockBatches[0].set.mock.calls[0];
			expect(firstCall[1].videoId).toBe("video1");

			// 成功時は警告ログが出力されないことを確認
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it("チャンネルIDがない動画はスキップする", async () => {
			const mockVideos = [
				createMockYouTubeVideo("video1", "channel1"),
				{ id: "video2", snippet: { title: "No channel" } },
			];

			vi.mocked(VideoMapper.fromYouTubeAPI).mockReturnValue(createMockVideoEntity("video1"));

			const result = await saveVideosToFirestore(mockVideos);

			expect(result).toBe(1);
			expect(logger.warn).toHaveBeenCalledWith("動画にチャンネルIDがありません", {
				videoId: "video2",
			});
		});

		it("Entity 変換に失敗した場合はスキップする", async () => {
			const mockVideos = [createMockYouTubeVideo("video1", "channel1")];

			vi.mocked(VideoMapper.fromYouTubeAPI).mockReturnValue(null);

			const result = await saveVideosToFirestore(mockVideos);

			expect(result).toBe(0);
			expect(logger.warn).toHaveBeenCalledWith("一部の動画保存に失敗", {
				total: 1,
				saved: 0,
				failed: 1,
			});
		});

		it("バッチサイズを超える場合は複数バッチに分割する", async () => {
			// 501個の動画を作成
			const mockVideos = Array.from({ length: 501 }, (_, i) =>
				createMockYouTubeVideo(`video${i}`, "channel1"),
			);

			vi.mocked(VideoMapper.fromYouTubeAPI).mockImplementation((video) =>
				createMockVideoEntity(video.id!),
			);

			const result = await saveVideosToFirestore(mockVideos);

			expect(result).toBe(501);
			expect(mockBatches).toHaveLength(2); // 500 + 1
			expect(mockBatches[0].commit).toHaveBeenCalledTimes(1);
			expect(mockBatches[1].commit).toHaveBeenCalledTimes(1);

			// 成功時は警告ログが出力されないことを確認
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});

	describe("updateVideoWith", () => {
		const mockExistingData = {
			videoId: "video1",
			title: "Old Title",
			channelId: "channel1",
			channelTitle: "Test Channel",
			publishedAt: new Date("2025-01-01T00:00:00Z"),
			updatedAt: new Date("2025-01-01T00:00:00Z"),
		};

		const mockNewVideo: youtube_v3.Schema$Video = {
			id: "video1",
			snippet: {
				title: "New Title",
				channelId: "channel1",
				publishedAt: "2025-01-25T00:00:00Z",
			},
		};

		it("既存データをEntity 形式で更新する", () => {
			const mockVideoEntity = {
				toFirestore: vi.fn(() => ({
					videoId: "video1",
					title: "New Title",
					channelId: "channel1",
					channelTitle: "Test Channel",
					publishedAt: new Date("2025-01-25T00:00:00Z"),
					thumbnailUrl: "https://img.youtube.com/vi/video1/hqdefault.jpg",
					lastFetchedAt: new Date("2025-01-25T00:00:00Z"),
				})),
			} as any;

			vi.mocked(VideoMapper.fromYouTubeAPI).mockReturnValue(mockVideoEntity);

			const result = updateVideoWith(mockExistingData as any, mockNewVideo);

			expect(result).not.toBeNull();
			expect(result!.title).toBe("New Title");
			// 形式で更新されていることを確認
			expect(result!.videoId).toBe("video1");
		});

		it("Entity 変換に失敗した場合はnullを返す", () => {
			vi.mocked(VideoMapper.fromYouTubeAPI).mockReturnValue(null);

			const result = updateVideoWith(mockExistingData as any, mockNewVideo);

			expect(result).toBeNull();
		});

		it("エラーが発生した場合はnullを返す", () => {
			vi.mocked(VideoMapper.fromYouTubeAPI).mockImplementation(() => {
				throw new Error("Test error");
			});

			const result = updateVideoWith(mockExistingData as any, mockNewVideo);

			expect(result).toBeNull();
			expect(logger.error).toHaveBeenCalledWith(
				"Entity 更新エラー",
				expect.objectContaining({
					videoId: "video1",
					error: "Test error",
				}),
			);
		});
	});
});
