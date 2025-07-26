import { Video } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type BatchMappingResult,
	mapYouTubeToVideoEntity,
	mapYouTubeVideosToEntities,
	mapYouTubeVideosWithErrors,
} from "../video-mapper";

// Mock logger
vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

describe("Video Mapper V2", () => {
	// Sample YouTube API response
	const createYouTubeVideo = (
		overrides?: Partial<youtube_v3.Schema$Video>,
	): youtube_v3.Schema$Video => ({
		id: "test123test",
		snippet: {
			title: "Test Video",
			description: "Test Description",
			channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
			channelTitle: "Test Channel",
			publishedAt: "2024-01-01T00:00:00Z",
			tags: ["tag1", "tag2"],
			thumbnails: {
				default: { url: "https://example.com/default.jpg" },
				high: { url: "https://example.com/high.jpg" },
			},
			liveBroadcastContent: "none",
		},
		contentDetails: {
			duration: "PT3M45S",
			dimension: "2d",
			definition: "hd",
			caption: "true",
			licensedContent: true,
			projection: "rectangular",
		},
		statistics: {
			viewCount: "1000000",
			likeCount: "50000",
			dislikeCount: "1000",
			favoriteCount: "100",
			commentCount: "5000",
		},
		status: {
			uploadStatus: "processed",
			privacyStatus: "public",
			license: "youtube",
		},
		player: {
			embedHtml: '<iframe src="..."></iframe>',
		},
		liveStreamingDetails: {
			scheduledStartTime: "2024-02-01T10:00:00Z",
			actualStartTime: "2024-02-01T10:05:00Z",
			actualEndTime: "2024-02-01T12:00:00Z",
			concurrentViewers: "1500",
		},
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("mapYouTubeToVideoEntity", () => {
		it("should map complete YouTube video data to Video Entity", () => {
			const youtubeVideo = createYouTubeVideo();
			const playlistTags = ["playlist1", "playlist2"];
			const userTags = ["user1", "user2"];

			const video = mapYouTubeToVideoEntity(youtubeVideo, playlistTags, userTags);

			expect(video).toBeDefined();
			expect(video).toBeInstanceOf(Video);
			expect(video?.id).toBe("test123test");
			expect(video?.metadata.title.toString()).toBe("Test Video");
			expect(video?.metadata.description.toString()).toBe("Test Description");
			expect(video?.channel.id.toString()).toBe("UCxxxxxxxxxxxxxxxxxxxxxx");
			expect(video?.channel.title.toString()).toBe("Test Channel");
			expect(video?.content.publishedAt.toISOString()).toBe("2024-01-01T00:00:00.000Z");
			// statistics getterはプレーンオブジェクトを返す
			expect(video?.statistics?.viewCount).toBe(1000000);
			// tagsは個別のgetterに分かれた
			expect(video?.playlistTags).toEqual(playlistTags);
			expect(video?.userTags).toEqual(userTags);
			expect(video?.tags).toEqual(["tag1", "tag2"]);
		});

		it("should map minimal YouTube video data", () => {
			const youtubeVideo = createYouTubeVideo({
				contentDetails: undefined,
				statistics: undefined,
				status: undefined,
				player: undefined,
				liveStreamingDetails: undefined,
			});

			const video = mapYouTubeToVideoEntity(youtubeVideo);

			expect(video).toBeDefined();
			expect(video?.id).toBe("test123test");
			expect(video?.statistics).toBeUndefined();
			expect(video?.liveStreamingDetails).toBeUndefined();
		});

		it("should handle missing required fields", () => {
			const videoWithoutId = createYouTubeVideo({ id: undefined });
			expect(mapYouTubeToVideoEntity(videoWithoutId)).toBeNull();

			const videoWithoutSnippet = createYouTubeVideo({ snippet: undefined });
			expect(mapYouTubeToVideoEntity(videoWithoutSnippet)).toBeNull();
		});

		it("should handle missing channel information", () => {
			const video = createYouTubeVideo({
				snippet: {
					...createYouTubeVideo().snippet,
					channelId: undefined,
				},
			});

			expect(mapYouTubeToVideoEntity(video)).toBeNull();
		});

		it("should map content details correctly", () => {
			const video = mapYouTubeToVideoEntity(createYouTubeVideo());

			expect(video?.metadata.duration?.toString()).toBe("PT3M45S");
			expect(video?.metadata.dimension).toBe("2d");
			expect(video?.metadata.definition).toBe("hd");
			expect(video?.metadata.hasCaption).toBe(true);
			expect(video?.metadata.isLicensedContent).toBe(true);
		});

		it("should map statistics correctly", () => {
			const video = mapYouTubeToVideoEntity(createYouTubeVideo());

			// statistics getterはプレーンオブジェクトを返す
			expect(video?.statistics?.viewCount).toBe(1000000);
			expect(video?.statistics?.likeCount).toBe(50000);
			expect(video?.statistics?.dislikeCount).toBe(1000);
			expect(video?.statistics?.favoriteCount).toBe(100);
			expect(video?.statistics?.commentCount).toBe(5000);
		});

		it("should map live streaming details correctly", () => {
			const video = mapYouTubeToVideoEntity(createYouTubeVideo());

			// liveStreamingDetails getterはISO文字列を返す
			expect(video?.liveStreamingDetails?.scheduledStartTime).toBe("2024-02-01T10:00:00.000Z");
			expect(video?.liveStreamingDetails?.actualStartTime).toBe("2024-02-01T10:05:00.000Z");
			expect(video?.liveStreamingDetails?.actualEndTime).toBe("2024-02-01T12:00:00.000Z");
			expect(video?.liveStreamingDetails?.concurrentViewers).toBe(1500);
		});
	});

	describe("mapYouTubeVideosToEntities", () => {
		it("should map multiple videos successfully", () => {
			const youtubeVideos = [
				createYouTubeVideo({ id: "video1" }),
				createYouTubeVideo({ id: "video2" }),
				createYouTubeVideo({ id: "video3" }),
			];

			const playlistTagsMap = new Map([
				["video1", ["playlist1"]],
				["video2", ["playlist2"]],
			]);

			const userTagsMap = new Map([
				["video1", ["user1"]],
				["video3", ["user3"]],
			]);

			const videos = mapYouTubeVideosToEntities(youtubeVideos, playlistTagsMap, userTagsMap);

			expect(videos).toHaveLength(3);
			expect(videos[0].id).toBe("video1");
			// tagsは個別のgetterに分かれた
			expect(videos[0].playlistTags).toEqual(["playlist1"]);
			expect(videos[0].userTags).toEqual(["user1"]);
			expect(videos[1].id).toBe("video2");
			expect(videos[1].playlistTags).toEqual(["playlist2"]);
			expect(videos[1].userTags).toEqual([]);
			expect(videos[2].id).toBe("video3");
			expect(videos[2].playlistTags).toEqual([]);
			expect(videos[2].userTags).toEqual(["user3"]);
		});

		it("should skip invalid videos", () => {
			const youtubeVideos = [
				createYouTubeVideo({ id: "valid1" }),
				createYouTubeVideo({ id: undefined }), // Invalid
				createYouTubeVideo({ snippet: undefined }), // Invalid
				createYouTubeVideo({ id: "valid2" }),
			];

			const videos = mapYouTubeVideosToEntities(youtubeVideos);

			expect(videos).toHaveLength(2);
			expect(videos[0].id).toBe("valid1");
			expect(videos[1].id).toBe("valid2");
		});
	});

	describe("mapYouTubeVideosWithErrors", () => {
		it("should provide detailed error information", () => {
			const youtubeVideos = [
				createYouTubeVideo({ id: "valid1" }),
				createYouTubeVideo({ id: undefined }), // Missing ID
				createYouTubeVideo({ snippet: undefined }), // Missing snippet
				createYouTubeVideo({
					id: "invalid-channel",
					snippet: {
						...createYouTubeVideo().snippet,
						channelId: undefined, // Missing channel
					},
				}),
			];

			const result: BatchMappingResult = mapYouTubeVideosWithErrors(youtubeVideos);

			expect(result.totalProcessed).toBe(4);
			expect(result.successCount).toBe(1);
			expect(result.failureCount).toBe(3);
			expect(result.videos).toHaveLength(1);
			expect(result.errors).toHaveLength(3);

			expect(result.errors[0]).toEqual({
				field: "id",
				reason: "Missing video ID",
			});
			expect(result.errors[1]).toEqual({
				videoId: expect.any(String),
				field: "snippet",
				reason: "Missing video snippet",
			});
			expect(result.errors[2]).toEqual({
				videoId: "invalid-channel",
				field: "mapping",
				reason: "Failed to create Video entity",
			});
		});

		it("should handle all valid videos", () => {
			const youtubeVideos = [
				createYouTubeVideo({ id: "video1" }),
				createYouTubeVideo({ id: "video2" }),
			];

			const result = mapYouTubeVideosWithErrors(youtubeVideos);

			expect(result.totalProcessed).toBe(2);
			expect(result.successCount).toBe(2);
			expect(result.failureCount).toBe(0);
			expect(result.videos).toHaveLength(2);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("Error handling", () => {
		it("should handle exceptions during mapping", () => {
			const invalidVideo = createYouTubeVideo({
				snippet: {
					...createYouTubeVideo().snippet,
					publishedAt: "invalid-date", // This will create an invalid date
				},
			});

			const video = mapYouTubeToVideoEntity(invalidVideo);
			// With the new parseDate utility, invalid dates are handled gracefully
			expect(video).toBeNull(); // Video creation fails due to invalid publishedAt
		});

		it("should handle invalid duration format", () => {
			const video = createYouTubeVideo({
				contentDetails: {
					...createYouTubeVideo().contentDetails,
					duration: "invalid-duration",
				},
			});

			const result = mapYouTubeToVideoEntity(video);
			// Video is still created with invalid duration string (duration validation is lenient)
			expect(result).toBeDefined();
			expect(result?.metadata.duration?.toString()).toBe("invalid-duration");
		});
	});

	describe("NaN validation", () => {
		it("should handle invalid favoriteCount values", () => {
			const youtubeVideo: youtube_v3.Schema$Video = {
				id: "test123",
				snippet: {
					title: "Test Video",
					description: "Test Description",
					channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
					channelTitle: "Test Channel",
					publishedAt: "2024-01-01T00:00:00Z",
				},
				statistics: {
					viewCount: "1000",
					favoriteCount: "invalid", // Invalid number string
				},
			};

			const video = mapYouTubeToVideoEntity(youtubeVideo);
			expect(video).not.toBeNull();
			expect(video?.statistics?.favoriteCount).toBe(0); // Invalid values are converted to 0
		});

		it("should handle invalid concurrentViewers values", () => {
			const youtubeVideo = createYouTubeVideo({
				liveStreamingDetails: {
					concurrentViewers: "not-a-number", // Invalid number string
				},
			});

			const video = mapYouTubeToVideoEntity(youtubeVideo);
			expect(video).not.toBeNull();
			expect(video?.liveStreamingDetails?.concurrentViewers).toBeUndefined();
		});

		it("should handle invalid date values in liveStreamingDetails", () => {
			const youtubeVideo = createYouTubeVideo({
				liveStreamingDetails: {
					scheduledStartTime: "invalid-date",
					actualStartTime: "2024-99-99T99:99:99Z", // Invalid date format
					actualEndTime: "not a date",
					concurrentViewers: "1000",
				},
			});

			const video = mapYouTubeToVideoEntity(youtubeVideo);
			expect(video).not.toBeNull();
			expect(video?.liveStreamingDetails?.scheduledStartTime).toBeUndefined();
			expect(video?.liveStreamingDetails?.actualStartTime).toBeUndefined();
			expect(video?.liveStreamingDetails?.actualEndTime).toBeUndefined();
			expect(video?.liveStreamingDetails?.concurrentViewers).toBe(1000); // Valid number
		});
	});
});
