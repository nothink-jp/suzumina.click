/**
 * YouTube Service V2 Tests
 */

import { Video as VideoV2 } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "../../../shared/logger";
import { createVideoV2Service } from "../youtube-service-v2";

// Mock dependencies
vi.mock("googleapis", () => ({
	google: {
		youtube: vi.fn(() => mockYouTubeAPI),
	},
}));
vi.mock("../../../shared/logger");
vi.mock("../../mappers/video-mapper-v2", () => ({
	mapYouTubeToVideoEntity: vi.fn((video) => {
		// Simple mock implementation
		if (!video.id || !video.snippet) return null;
		return {
			id: video.id,
			metadata: {
				title: { value: video.snippet.title },
				description: { value: video.snippet.description },
			},
			channel: {
				id: { value: video.snippet.channelId },
				title: { value: video.snippet.channelTitle },
			},
			toLegacyFormat: vi.fn(),
		};
	}),
}));

// Mock YouTube API
const mockYouTubeAPI = {
	channels: {
		list: vi.fn(),
	},
	playlistItems: {
		list: vi.fn(),
	},
	videos: {
		list: vi.fn(),
	},
};

describe("YouTube Service V2", () => {
	let service: ReturnType<typeof createVideoV2Service>;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.YOUTUBE_API_KEY = "test-api-key";
		service = createVideoV2Service();
	});

	afterEach(() => {
		delete process.env.YOUTUBE_API_KEY;
	});

	describe("createVideoV2Service", () => {
		it("should create service with API key from environment", () => {
			expect(() => createVideoV2Service()).not.toThrow();
		});

		it("should create service with provided API key", () => {
			expect(() => createVideoV2Service("custom-key")).not.toThrow();
		});

		it("should throw error if no API key is available", () => {
			delete process.env.YOUTUBE_API_KEY;
			expect(() => createVideoV2Service()).toThrow("YouTube API key is required");
		});
	});

	describe("fetchChannelVideos", () => {
		it("should fetch channel videos successfully", async () => {
			// Mock channel response
			mockYouTubeAPI.channels.list.mockResolvedValue({
				data: {
					items: [
						{
							contentDetails: {
								relatedPlaylists: {
									uploads: "uploads-playlist-id",
								},
							},
						},
					],
				},
			});

			// Mock playlist items response
			mockYouTubeAPI.playlistItems.list.mockResolvedValue({
				data: {
					items: [
						{ contentDetails: { videoId: "video1" } },
						{ contentDetails: { videoId: "video2" } },
					],
					nextPageToken: "next-token",
				},
			});

			// Mock videos response
			mockYouTubeAPI.videos.list.mockResolvedValue({
				data: {
					items: [createMockYouTubeVideo("video1"), createMockYouTubeVideo("video2")],
				},
			});

			// Execute
			const result = await service.fetchChannelVideos("test-channel-id", 50);

			// Verify
			expect(result.videos).toHaveLength(2);
			expect(result.videos[0].id).toBe("video1");
			expect(result.videos[1].id).toBe("video2");
			expect(result.nextPageToken).toBe("next-token");

			// Verify API calls
			expect(mockYouTubeAPI.channels.list).toHaveBeenCalledWith({
				part: ["contentDetails"],
				id: ["test-channel-id"],
			});
			expect(mockYouTubeAPI.playlistItems.list).toHaveBeenCalledWith({
				part: ["contentDetails"],
				playlistId: "uploads-playlist-id",
				maxResults: 50,
				pageToken: undefined,
			});
			expect(mockYouTubeAPI.videos.list).toHaveBeenCalledWith({
				part: ["snippet", "contentDetails", "statistics", "status", "liveStreamingDetails"],
				id: ["video1", "video2"],
			});
		});

		it("should handle channel without uploads playlist", async () => {
			// Mock channel response without uploads playlist
			mockYouTubeAPI.channels.list.mockResolvedValue({
				data: {
					items: [
						{
							contentDetails: {
								relatedPlaylists: {},
							},
						},
					],
				},
			});

			// Execute and expect error
			await expect(service.fetchChannelVideos("test-channel-id", 50)).rejects.toThrow(
				"チャンネル test-channel-id のアップロードプレイリストが見つかりません",
			);
		});

		it("should handle empty video list", async () => {
			// Mock channel response
			mockYouTubeAPI.channels.list.mockResolvedValue({
				data: {
					items: [
						{
							contentDetails: {
								relatedPlaylists: {
									uploads: "uploads-playlist-id",
								},
							},
						},
					],
				},
			});

			// Mock empty playlist items
			mockYouTubeAPI.playlistItems.list.mockResolvedValue({
				data: {
					items: [],
					nextPageToken: undefined,
				},
			});

			// Execute
			const result = await service.fetchChannelVideos("test-channel-id", 50);

			// Verify
			expect(result.videos).toHaveLength(0);
			expect(result.nextPageToken).toBeUndefined();
		});

		it("should continue with page token", async () => {
			// Mock channel response
			mockYouTubeAPI.channels.list.mockResolvedValue({
				data: {
					items: [
						{
							contentDetails: {
								relatedPlaylists: {
									uploads: "uploads-playlist-id",
								},
							},
						},
					],
				},
			});

			// Mock playlist items response
			mockYouTubeAPI.playlistItems.list.mockResolvedValue({
				data: {
					items: [{ contentDetails: { videoId: "video3" } }],
					nextPageToken: undefined,
				},
			});

			// Mock videos response
			mockYouTubeAPI.videos.list.mockResolvedValue({
				data: {
					items: [createMockYouTubeVideo("video3")],
				},
			});

			// Execute with page token
			const result = await service.fetchChannelVideos("test-channel-id", 50, "previous-token");

			// Verify playlist items was called with page token
			expect(mockYouTubeAPI.playlistItems.list).toHaveBeenCalledWith({
				part: ["contentDetails"],
				playlistId: "uploads-playlist-id",
				maxResults: 50,
				pageToken: "previous-token",
			});
		});
	});

	describe("fetchVideoById", () => {
		it("should fetch single video successfully", async () => {
			// Mock videos response
			mockYouTubeAPI.videos.list.mockResolvedValue({
				data: {
					items: [createMockYouTubeVideo("video1")],
				},
			});

			// Execute
			const result = await service.fetchVideoById("video1");

			// Verify
			expect(result).not.toBeNull();
			expect(result?.id).toBe("video1");

			// Verify API call
			expect(mockYouTubeAPI.videos.list).toHaveBeenCalledWith({
				part: ["snippet", "contentDetails", "statistics", "status", "liveStreamingDetails"],
				id: ["video1"],
			});
		});

		it("should return null for non-existent video", async () => {
			// Mock empty response
			mockYouTubeAPI.videos.list.mockResolvedValue({
				data: { items: [] },
			});

			// Execute
			const result = await service.fetchVideoById("non-existent");

			// Verify
			expect(result).toBeNull();
		});

		it("should handle API errors gracefully", async () => {
			// Mock API error
			mockYouTubeAPI.videos.list.mockRejectedValue(new Error("API Error"));

			// Execute
			const result = await service.fetchVideoById("video1");

			// Verify
			expect(result).toBeNull();
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining("動画 video1 の取得に失敗しました"),
				expect.any(Error),
			);
		});
	});

	describe("fetchVideosByIds", () => {
		it("should fetch multiple videos successfully", async () => {
			// Mock videos response
			mockYouTubeAPI.videos.list.mockResolvedValue({
				data: {
					items: [createMockYouTubeVideo("video1"), createMockYouTubeVideo("video2")],
				},
			});

			// Execute
			const result = await service.fetchVideosByIds(["video1", "video2"]);

			// Verify
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("video1");
			expect(result[1].id).toBe("video2");
		});

		it("should handle empty array", async () => {
			// Execute
			const result = await service.fetchVideosByIds([]);

			// Verify
			expect(result).toHaveLength(0);
			expect(mockYouTubeAPI.videos.list).not.toHaveBeenCalled();
		});

		it("should batch large requests", async () => {
			// Create array of 75 video IDs (more than batch size of 50)
			const videoIds = Array.from({ length: 75 }, (_, i) => `video${i + 1}`);

			// Mock first batch response
			mockYouTubeAPI.videos.list
				.mockResolvedValueOnce({
					data: {
						items: Array.from({ length: 50 }, (_, i) => createMockYouTubeVideo(`video${i + 1}`)),
					},
				})
				.mockResolvedValueOnce({
					data: {
						items: Array.from({ length: 25 }, (_, i) => createMockYouTubeVideo(`video${i + 51}`)),
					},
				});

			// Execute
			const result = await service.fetchVideosByIds(videoIds);

			// Verify
			expect(result).toHaveLength(75);
			expect(mockYouTubeAPI.videos.list).toHaveBeenCalledTimes(2);

			// Verify batch calls
			expect(mockYouTubeAPI.videos.list).toHaveBeenNthCalledWith(1, {
				part: ["snippet", "contentDetails", "statistics", "status", "liveStreamingDetails"],
				id: videoIds.slice(0, 50),
			});
			expect(mockYouTubeAPI.videos.list).toHaveBeenNthCalledWith(2, {
				part: ["snippet", "contentDetails", "statistics", "status", "liveStreamingDetails"],
				id: videoIds.slice(50),
			});
		});

		it("should skip videos that fail to map", async () => {
			// Mock videos response with one invalid video
			mockYouTubeAPI.videos.list.mockResolvedValue({
				data: {
					items: [
						createMockYouTubeVideo("video1"),
						{ id: "video2" }, // Missing snippet
						createMockYouTubeVideo("video3"),
					],
				},
			});

			// Execute
			const result = await service.fetchVideosByIds(["video1", "video2", "video3"]);

			// Verify
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("video1");
			expect(result[1].id).toBe("video3");
		});
	});
});

/**
 * Helper function to create mock YouTube video
 */
function createMockYouTubeVideo(id: string): youtube_v3.Schema$Video {
	return {
		id,
		snippet: {
			title: `Test Video ${id}`,
			description: "Test description",
			channelId: "test-channel",
			channelTitle: "Test Channel",
			publishedAt: new Date().toISOString(),
			tags: ["test"],
		},
		contentDetails: {
			duration: "PT5M30S",
			dimension: "2d",
			definition: "hd",
			caption: "false",
		},
		statistics: {
			viewCount: "1000",
			likeCount: "100",
			commentCount: "50",
		},
		status: {
			privacyStatus: "public",
			uploadStatus: "processed",
		},
	};
}
