import { describe, expect, it } from "vitest";
import type { FirestoreServerVideoData, VideoType } from "../../types/firestore/video";
import { Video } from "../video";

describe("Video.fromFirestoreData", () => {
	// Sample Firestore data
	const sampleFirestoreData: FirestoreServerVideoData = {
		videoId: "test123",
		title: "Test Video",
		description: "Test Description",
		channelId: "UC_test123",
		channelTitle: "Test Channel",
		publishedAt: new Date("2024-01-01T00:00:00Z"),
		lastFetchedAt: new Date("2024-01-01T12:00:00Z"),
		thumbnailUrl: "https://example.com/thumb.jpg",
		statistics: {
			viewCount: 1000,
			likeCount: 100,
			commentCount: 10,
		},
		playlistTags: ["tag1"],
		userTags: ["tag2"],
		audioButtonCount: 5,
		hasAudioButtons: true,
		liveBroadcastContent: "none",
		videoType: "normal" as VideoType,
	};

	describe("fromFirestoreData (Result type)", () => {
		it("should return Result.Ok for valid data", () => {
			const result = Video.fromFirestoreData(sampleFirestoreData);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const video = result.value;
				expect(video.id).toBe("test123");
				expect(video.title).toBe("Test Video");
				expect(video.channelTitle).toBe("Test Channel");
			}
		});

		it("should return Result.Err for missing videoId", () => {
			// biome-ignore lint/correctness/noUnusedVariables: Intentionally removing videoId
			const { videoId, ...invalidData } = sampleFirestoreData;

			const result = Video.fromFirestoreData(invalidData as any);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.type).toBe("DatabaseError");
				expect(result.error.detail).toContain("Missing required field: videoId");
			}
		});

		it("should return Result.Err for missing title", () => {
			// biome-ignore lint/correctness/noUnusedVariables: Intentionally removing title
			const { title, ...invalidData } = sampleFirestoreData;

			const result = Video.fromFirestoreData(invalidData as any);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.type).toBe("DatabaseError");
				expect(result.error.detail).toContain("Missing required field: title");
			}
		});

		it("should return Result.Err for missing channelId", () => {
			// biome-ignore lint/correctness/noUnusedVariables: Intentionally removing channelId
			const { channelId, ...invalidData } = sampleFirestoreData;

			const result = Video.fromFirestoreData(invalidData as any);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.type).toBe("DatabaseError");
				expect(result.error.detail).toContain("Missing required field: channelId");
			}
		});

		it("should return Result.Err for missing channelTitle", () => {
			// biome-ignore lint/correctness/noUnusedVariables: Intentionally removing channelTitle
			const { channelTitle, ...invalidData } = sampleFirestoreData;

			const result = Video.fromFirestoreData(invalidData as any);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.type).toBe("DatabaseError");
				expect(result.error.detail).toContain("Missing required field: channelTitle");
			}
		});
	});
});
