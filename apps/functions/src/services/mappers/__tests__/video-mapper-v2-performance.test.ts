import type { youtube_v3 } from "googleapis";
import { describe, expect, it } from "vitest";
import { mapYouTubeVideosToEntities, mapYouTubeVideosWithErrors } from "../video-mapper-v2";

describe("Video Mapper V2 - Performance", () => {
	// Helper to create many YouTube videos
	const createManyYouTubeVideos = (count: number): youtube_v3.Schema$Video[] => {
		const videos: youtube_v3.Schema$Video[] = [];
		for (let i = 0; i < count; i++) {
			videos.push({
				id: `video${i}`,
				snippet: {
					title: `Test Video ${i}`,
					description: `Description for video ${i}`,
					channelId: `UCchannel${i}`,
					channelTitle: `Channel ${i}`,
					publishedAt: new Date(2024, 0, 1, 0, 0, i).toISOString(),
					tags: [`tag${i}`, `category${i % 10}`],
					thumbnails: {
						default: { url: `https://example.com/thumb${i}.jpg` },
					},
					liveBroadcastContent: i % 3 === 0 ? "upcoming" : "none",
				},
				contentDetails: {
					duration: `PT${i % 60}M${i % 60}S`,
					dimension: i % 2 === 0 ? "2d" : "3d",
					definition: i % 2 === 0 ? "hd" : "sd",
					caption: i % 2 === 0 ? "true" : "false",
					licensedContent: i % 2 === 0,
				},
				statistics: {
					viewCount: String(1000 * i),
					likeCount: String(100 * i),
					commentCount: String(10 * i),
				},
			});
		}
		return videos;
	};

	describe("Batch processing performance", () => {
		it("should process 100 videos in reasonable time", () => {
			const videos = createManyYouTubeVideos(100);
			const startTime = performance.now();

			const result = mapYouTubeVideosToEntities(videos);

			const endTime = performance.now();
			const duration = endTime - startTime;

			expect(result).toHaveLength(100);
			expect(duration).toBeLessThan(100); // Should complete in less than 100ms
			console.log(`Mapped 100 videos in ${duration.toFixed(2)}ms`);
		});

		it("should process 1000 videos efficiently", () => {
			const videos = createManyYouTubeVideos(1000);
			const startTime = performance.now();

			const result = mapYouTubeVideosToEntities(videos);

			const endTime = performance.now();
			const duration = endTime - startTime;

			expect(result).toHaveLength(1000);
			expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
			console.log(`Mapped 1000 videos in ${duration.toFixed(2)}ms`);
		});

		it("should handle error tracking for large batches", () => {
			const videos = createManyYouTubeVideos(500);
			// Add some invalid videos
			videos.push(
				{ id: undefined, snippet: { title: "Invalid 1" } } as any,
				{ id: "valid-but-no-snippet" } as any,
				{
					id: "missing-channel",
					snippet: { title: "No Channel", publishedAt: new Date().toISOString() },
				} as any,
			);

			const startTime = performance.now();

			const result = mapYouTubeVideosWithErrors(videos);

			const endTime = performance.now();
			const duration = endTime - startTime;

			expect(result.totalProcessed).toBe(503);
			expect(result.successCount).toBe(500);
			expect(result.failureCount).toBe(3);
			expect(duration).toBeLessThan(600); // Should still be fast even with error tracking
			console.log(`Processed 503 videos with error tracking in ${duration.toFixed(2)}ms`);
		});
	});

	describe("Memory efficiency", () => {
		it("should not create excessive objects during mapping", () => {
			const videos = createManyYouTubeVideos(100);

			// Measure initial memory (if available in the environment)
			const initialMemory = process.memoryUsage?.()?.heapUsed;

			const result = mapYouTubeVideosToEntities(videos);

			// Measure final memory
			const finalMemory = process.memoryUsage?.()?.heapUsed;

			expect(result).toHaveLength(100);

			if (initialMemory && finalMemory) {
				const memoryIncrease = finalMemory - initialMemory;
				const memoryPerVideo = memoryIncrease / 100;
				console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
				console.log(`Memory per video: ${(memoryPerVideo / 1024).toFixed(2)}KB`);

				// Each video should use less than 100KB on average
				expect(memoryPerVideo).toBeLessThan(100 * 1024);
			}
		});
	});

	describe("Tag mapping performance", () => {
		it("should efficiently map videos with many tags", () => {
			const videos = createManyYouTubeVideos(100);
			const playlistTagsMap = new Map<string, string[]>();
			const userTagsMap = new Map<string, string[]>();

			// Add many tags for each video
			for (let i = 0; i < 100; i++) {
				playlistTagsMap.set(`video${i}`, [`playlist${i}`, `playlist${i + 1}`, `playlist${i + 2}`]);
				userTagsMap.set(`video${i}`, [`user${i}`, `user${i + 1}`, `user${i + 2}`, `user${i + 3}`]);
			}

			const startTime = performance.now();

			const result = mapYouTubeVideosToEntities(videos, playlistTagsMap, userTagsMap);

			const endTime = performance.now();
			const duration = endTime - startTime;

			expect(result).toHaveLength(100);
			expect(result[0].tags.playlistTags).toHaveLength(3);
			expect(result[0].tags.userTags).toHaveLength(4);
			expect(duration).toBeLessThan(150); // Should still be fast with tag mapping
			console.log(`Mapped 100 videos with tags in ${duration.toFixed(2)}ms`);
		});
	});

	describe("Live streaming details performance", () => {
		it("should efficiently process videos with live streaming details", () => {
			const videos: youtube_v3.Schema$Video[] = [];
			for (let i = 0; i < 100; i++) {
				videos.push({
					id: `live${i}`,
					snippet: {
						title: `Live Stream ${i}`,
						channelId: `UClivechannel${i}`,
						channelTitle: `Live Channel ${i}`,
						publishedAt: new Date().toISOString(),
						liveBroadcastContent: "live",
					},
					liveStreamingDetails: {
						scheduledStartTime: new Date(2024, 0, 1, 10, 0, 0).toISOString(),
						actualStartTime: new Date(2024, 0, 1, 10, 5, 0).toISOString(),
						concurrentViewers: String(1000 + i * 10),
					},
				});
			}

			const startTime = performance.now();

			const result = mapYouTubeVideosToEntities(videos);

			const endTime = performance.now();
			const duration = endTime - startTime;

			expect(result).toHaveLength(100);
			expect(result[0].liveStreamingDetails).toBeDefined();
			expect(duration).toBeLessThan(100);
			console.log(`Mapped 100 live videos in ${duration.toFixed(2)}ms`);
		});
	});
});
