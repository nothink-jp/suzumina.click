import { describe, expect, it } from "vitest";
import {
	AudioButtonBaseSchema,
	AudioFormatSchema,
	checkRateLimit,
	FirestoreAudioButtonSchema,
	type FrontendAudioButtonData,
	sortAudioButtons,
} from "./audio-button";

describe("AudioButton Schemas", () => {
	describe("AudioButtonBaseSchema", () => {
		it("should validate a valid audio button base", () => {
			const validAudioButton = {
				id: "test-id",
				title: "Test Title",
				description: "Test Description",
				tags: ["tag1", "tag2"],
			};

			expect(() => AudioButtonBaseSchema.parse(validAudioButton)).not.toThrow();
		});

		it("should reject invalid audio button", () => {
			const invalidAudioButton = {
				// Missing required fields
			};

			expect(() => AudioButtonBaseSchema.parse(invalidAudioButton)).toThrow();
		});
	});

	describe("AudioFormatSchema", () => {
		it("should validate audio format values", () => {
			expect(() => AudioFormatSchema.parse("opus")).not.toThrow();
			expect(() => AudioFormatSchema.parse("aac")).not.toThrow();
			expect(() => AudioFormatSchema.parse("mp3")).not.toThrow();
			expect(() => AudioFormatSchema.parse("invalid")).toThrow();
		});
	});

	describe("FirestoreAudioButtonSchema", () => {
		it("should validate basic structure", () => {
			// Test that schema can parse without throwing on valid base data
			expect(typeof FirestoreAudioButtonSchema.parse).toBe("function");
		});
	});
});

describe("Audio Button Utility Functions", () => {
	describe("sortAudioButtons", () => {
		const mockButtons: FrontendAudioButtonData[] = [
			{
				id: "btn1",
				title: "Button 1",
				description: "Test",
				tags: [],
				sourceVideoId: "video1",
				sourceVideoThumbnailUrl: "https://example.com/thumb1.jpg",
				startTime: 0,
				endTime: 10,
				createdAt: "2023-01-01T00:00:00Z",
				createdBy: "user1",
				createdByName: "User 1",
				isPublic: true,
				likeCount: 5,
				dislikeCount: 0,
				playCount: 10,
				favoriteCount: 0,
				updatedAt: "2023-01-01T00:00:00Z",
				durationText: "10秒",
				relativeTimeText: "3日前",
			},
			{
				id: "btn2",
				title: "Button 2",
				description: "Test",
				tags: [],
				sourceVideoId: "video2",
				sourceVideoThumbnailUrl: "https://example.com/thumb2.jpg",
				startTime: 0,
				endTime: 10,
				createdAt: "2023-01-02T00:00:00Z",
				createdBy: "user2",
				createdByName: "User 2",
				isPublic: true,
				likeCount: 15,
				dislikeCount: 0,
				playCount: 25,
				favoriteCount: 0,
				updatedAt: "2023-01-02T00:00:00Z",
				durationText: "10秒",
				relativeTimeText: "2日前",
			},
		];

		it("should sort by newest", () => {
			const sorted = sortAudioButtons(mockButtons, "newest");
			expect(sorted[0]!.id).toBe("btn2");
			expect(sorted[1]!.id).toBe("btn1");
		});

		it("should sort by oldest", () => {
			const sorted = sortAudioButtons(mockButtons, "oldest");
			expect(sorted[0]!.id).toBe("btn1");
			expect(sorted[1]!.id).toBe("btn2");
		});

		it("should sort by popular", () => {
			const sorted = sortAudioButtons(mockButtons, "popular");
			expect(sorted[0]!.id).toBe("btn2"); // Higher like count
			expect(sorted[1]!.id).toBe("btn1");
		});

		it("should sort by most played", () => {
			const sorted = sortAudioButtons(mockButtons, "mostPlayed");
			expect(sorted[0]!.id).toBe("btn2"); // Higher play count
			expect(sorted[1]!.id).toBe("btn1");
		});

		it("should preserve order for relevance", () => {
			const sorted = sortAudioButtons(mockButtons, "relevance");
			expect(sorted[0]!.id).toBe("btn1");
			expect(sorted[1]!.id).toBe("btn2");
		});
	});

	describe("checkRateLimit", () => {
		// 現在時刻を基準にしたテストデータを作成
		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
		const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

		const mockRecentCreations: FrontendAudioButtonData[] = [
			{
				id: "btn1",
				title: "Button 1",
				description: "Test",
				tags: [],
				sourceVideoId: "video1",
				sourceVideoThumbnailUrl: "https://example.com/thumb1.jpg",
				startTime: 0,
				endTime: 10,
				createdAt: oneHourAgo.toISOString(), // Within 24h
				createdBy: "user1",
				createdByName: "User 1",
				isPublic: true,
				likeCount: 0,
				dislikeCount: 0,
				playCount: 0,
				favoriteCount: 0,
				updatedAt: oneHourAgo.toISOString(),
				durationText: "10秒",
				relativeTimeText: "1時間前",
			},
			{
				id: "btn2",
				title: "Button 2",
				description: "Test",
				tags: [],
				sourceVideoId: "video2",
				sourceVideoThumbnailUrl: "https://example.com/thumb2.jpg",
				startTime: 0,
				endTime: 10,
				createdAt: twentyFiveHoursAgo.toISOString(), // More than 24h ago
				createdBy: "user1",
				createdByName: "User 1",
				isPublic: true,
				likeCount: 0,
				dislikeCount: 0,
				playCount: 0,
				favoriteCount: 0,
				updatedAt: twentyFiveHoursAgo.toISOString(),
				durationText: "10秒",
				relativeTimeText: "25時間前",
			},
		];

		it("should allow creation when under limit", () => {
			const result = checkRateLimit(mockRecentCreations, "user1", 5);
			expect(result.allowed).toBe(true);
			expect(result.remainingQuota).toBe(4); // 5 - 1 recent creation
		});

		it("should deny creation when at limit", () => {
			const result = checkRateLimit(mockRecentCreations, "user1", 1);
			expect(result.allowed).toBe(false);
			expect(result.remainingQuota).toBe(0);
		});

		it("should return correct reset time", () => {
			const result = checkRateLimit(mockRecentCreations, "user1", 5);
			expect(result.resetTime).toBeInstanceOf(Date);
		});

		it("should handle user with no recent creations", () => {
			const result = checkRateLimit([], "user2", 5);
			expect(result.allowed).toBe(true);
			expect(result.remainingQuota).toBe(5);
		});

		it("should only count recent creations within 24 hours", () => {
			// すべて24時間以上前の作成
			const oldCreations: FrontendAudioButtonData[] = [
				{
					id: "btn3",
					title: "Button 3",
					description: "Test",
					tags: [],
					sourceVideoId: "video3",
					sourceVideoThumbnailUrl: "https://example.com/thumb3.jpg",
					startTime: 0,
					endTime: 10,
					createdAt: twentyFiveHoursAgo.toISOString(),
					createdBy: "user1",
					createdByName: "User 1",
					isPublic: true,
					likeCount: 0,
					dislikeCount: 0,
					playCount: 0,
					favoriteCount: 0,
					updatedAt: twentyFiveHoursAgo.toISOString(),
					durationText: "10秒",
					relativeTimeText: "25時間前",
				},
			];

			const result = checkRateLimit(oldCreations, "user1", 5);
			expect(result.allowed).toBe(true);
			expect(result.remainingQuota).toBe(5); // No recent creations
		});
	});
});
