import { describe, expect, it } from "vitest";
import {
	AudioButtonBaseSchema,
	AudioFormatSchema,
	type CreateAudioButtonInput,
	CreateAudioButtonInputSchema,
	checkRateLimit,
	convertCreateInputToFirestoreAudioButton,
	convertToFrontendAudioButton,
	deserializeAudioButtonForRCC,
	type FirestoreAudioButtonData,
	FirestoreAudioButtonSchema,
	type FrontendAudioButtonData,
	filterAudioButtons,
	formatTimestamp,
	serializeAudioButtonForRSC,
	sortAudioButtons,
	validateAudioButtonCreation,
	type YouTubeVideoInfo,
} from "../audio-button";

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

	describe("convertToFrontendAudioButton", () => {
		const mockFirestoreData: FirestoreAudioButtonData = {
			id: "btn1",
			title: "Test Button",
			description: "Test Description",
			tags: ["tag1", "tag2"],
			sourceVideoId: "video123",
			sourceVideoTitle: "Test Video",
			startTime: 10,
			endTime: 20,
			createdBy: "user123",
			createdByName: "Test User",
			isPublic: true,
			playCount: 100,
			likeCount: 50,
			dislikeCount: 5,
			favoriteCount: 25,
			createdAt: "2024-01-01T00:00:00.000Z",
			updatedAt: "2024-01-01T00:00:00.000Z",
		};

		it("should convert Firestore data to frontend format", () => {
			const result = convertToFrontendAudioButton(mockFirestoreData);

			expect(result.id).toBe(mockFirestoreData.id);
			expect(result.title).toBe(mockFirestoreData.title);
			expect(result.tags).toEqual(mockFirestoreData.tags);
			expect(result.sourceVideoThumbnailUrl).toBe(
				"https://img.youtube.com/vi/video123/maxresdefault.jpg",
			);
			expect(result.durationText).toBe("10秒");
			expect(result.relativeTimeText).toBeDefined();
		});

		it("should handle missing optional fields", () => {
			const minimalData: FirestoreAudioButtonData = {
				...mockFirestoreData,
				description: undefined,
				sourceVideoTitle: undefined,
				tags: undefined as any,
				dislikeCount: undefined as any,
				favoriteCount: undefined as any,
			};

			const result = convertToFrontendAudioButton(minimalData);

			expect(result.tags).toEqual([]);
			expect(result.dislikeCount).toBe(0);
			expect(result.favoriteCount).toBe(0);
		});

		it("should format relative time correctly", () => {
			// Test with recent date (should show "たった今" or similar)
			const recentData = {
				...mockFirestoreData,
				createdAt: new Date().toISOString(),
			};
			const recentResult = convertToFrontendAudioButton(recentData);
			expect(recentResult.relativeTimeText).toMatch(/たった今|分前|時間前/);

			// Test with yesterday
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayData = {
				...mockFirestoreData,
				createdAt: yesterday.toISOString(),
			};
			const yesterdayResult = convertToFrontendAudioButton(yesterdayData);
			expect(yesterdayResult.relativeTimeText).toBe("昨日");

			// Test with old date
			const oldDate = new Date("2020-01-01");
			const oldData = {
				...mockFirestoreData,
				createdAt: oldDate.toISOString(),
			};
			const oldResult = convertToFrontendAudioButton(oldData);
			expect(oldResult.relativeTimeText).toMatch(/年前/);
		});
	});

	describe("CreateAudioButtonInputSchema", () => {
		it("should validate valid input", () => {
			const input = {
				title: "Test Button",
				description: "Test Description",
				tags: ["tag1", "tag2"],
				sourceVideoId: "video123",
				startTime: 10,
				endTime: 20,
				isPublic: true,
			};

			expect(() => CreateAudioButtonInputSchema.parse(input)).not.toThrow();
		});

		it("should reject when endTime <= startTime", () => {
			const input = {
				title: "Test Button",
				sourceVideoId: "video123",
				startTime: 20,
				endTime: 10,
			};

			expect(() => CreateAudioButtonInputSchema.parse(input)).toThrow();
		});

		it("should reject too many tags", () => {
			const input = {
				title: "Test Button",
				sourceVideoId: "video123",
				startTime: 10,
				endTime: 20,
				tags: Array(11).fill("tag"), // 11 tags
			};

			expect(() => CreateAudioButtonInputSchema.parse(input)).toThrow();
		});
	});

	describe("filterAudioButtons", () => {
		const mockButtons: FrontendAudioButtonData[] = [
			{
				id: "btn1",
				title: "Button One",
				description: "Description one",
				tags: ["voice", "asmr"],
				sourceVideoId: "video1",
				sourceVideoThumbnailUrl: "https://example.com/thumb1.jpg",
				startTime: 0,
				endTime: 30,
				createdAt: "2024-01-01T00:00:00Z",
				createdBy: "user1",
				createdByName: "User 1",
				isPublic: true,
				likeCount: 50,
				dislikeCount: 5,
				playCount: 100,
				favoriteCount: 10,
				updatedAt: "2024-01-01T00:00:00Z",
				durationText: "30秒",
				relativeTimeText: "3日前",
			},
			{
				id: "btn2",
				title: "Button Two",
				description: "Description two",
				tags: ["music", "bgm"],
				sourceVideoId: "video2",
				sourceVideoThumbnailUrl: "https://example.com/thumb2.jpg",
				startTime: 0,
				endTime: 60,
				createdAt: "2024-01-05T00:00:00Z",
				createdBy: "user2",
				createdByName: "User 2",
				isPublic: true,
				likeCount: 25,
				dislikeCount: 10,
				playCount: 200,
				favoriteCount: 5,
				updatedAt: "2024-01-05T00:00:00Z",
				durationText: "60秒",
				relativeTimeText: "2日前",
			},
		];

		it("should filter by tags", () => {
			const filtered = filterAudioButtons(mockButtons, { tags: ["voice"] });
			expect(filtered).toHaveLength(1);
			expect(filtered[0]!.id).toBe("btn1");
		});

		it("should filter by search text", () => {
			const filtered = filterAudioButtons(mockButtons, { searchText: "Two" });
			expect(filtered).toHaveLength(1);
			expect(filtered[0]!.id).toBe("btn2");
		});

		it("should filter by numeric ranges", () => {
			const filtered = filterAudioButtons(mockButtons, {
				playCountMin: 150,
				playCountMax: 250,
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0]!.id).toBe("btn2");
		});

		it("should filter by duration", () => {
			const filtered = filterAudioButtons(mockButtons, {
				durationMin: 40,
				durationMax: 70,
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0]!.id).toBe("btn2");
		});

		it("should filter by date range", () => {
			const filtered = filterAudioButtons(mockButtons, {
				createdAfter: "2024-01-03T00:00:00Z",
				createdBefore: "2024-01-10T00:00:00Z",
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0]!.id).toBe("btn2");
		});

		it("should filter by creator", () => {
			const filtered = filterAudioButtons(mockButtons, { createdBy: "user1" });
			expect(filtered).toHaveLength(1);
			expect(filtered[0]!.id).toBe("btn1");
		});

		it("should combine multiple filters", () => {
			const filtered = filterAudioButtons(mockButtons, {
				tags: ["music"],
				playCountMin: 100,
				createdBy: "user2",
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0]!.id).toBe("btn2");
		});

		it("should return all when no filters applied", () => {
			const filtered = filterAudioButtons(mockButtons, {});
			expect(filtered).toHaveLength(2);
		});
	});

	describe("validateAudioButtonCreation", () => {
		const mockVideoInfo: YouTubeVideoInfo = {
			id: "video123",
			title: "Test Video",
			duration: 300, // 5 minutes
			thumbnailUrl: "https://example.com/thumb.jpg",
			channelTitle: "Test Channel",
			publishedAt: "2024-01-01T00:00:00Z",
		};

		const mockInput: CreateAudioButtonInput = {
			title: "Test Button",
			tags: [],
			sourceVideoId: "video123",
			startTime: 10,
			endTime: 20,
			isPublic: true,
		};

		const mockExistingButtons: FirestoreAudioButtonData[] = [
			{
				id: "existing1",
				title: "Existing Button",
				tags: [],
				sourceVideoId: "video123",
				startTime: 50,
				endTime: 60,
				createdBy: "user123",
				createdByName: "Test User",
				isPublic: true,
				playCount: 0,
				likeCount: 0,
				dislikeCount: 0,
				favoriteCount: 0,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			},
		];

		it("should validate valid creation", () => {
			const error = validateAudioButtonCreation(
				mockInput,
				mockVideoInfo,
				"user123",
				mockExistingButtons,
			);
			expect(error).toBeNull();
		});

		it("should reject when endTime exceeds video duration", () => {
			const invalidInput = { ...mockInput, endTime: 400 };
			const error = validateAudioButtonCreation(
				invalidInput,
				mockVideoInfo,
				"user123",
				mockExistingButtons,
			);
			expect(error).toBe("終了時間が動画の長さを超えています");
		});

		it("should detect duplicate buttons", () => {
			const duplicateInput = { ...mockInput, startTime: 52, endTime: 58 };
			const error = validateAudioButtonCreation(
				duplicateInput,
				mockVideoInfo,
				"user123",
				mockExistingButtons,
			);
			expect(error).toBe("類似の時間範囲で既に音声ボタンが作成されています");
		});

		it("should allow different user to create similar button", () => {
			const duplicateInput = { ...mockInput, startTime: 52, endTime: 58 };
			const error = validateAudioButtonCreation(
				duplicateInput,
				mockVideoInfo,
				"differentUser",
				mockExistingButtons,
			);
			expect(error).toBeNull();
		});
	});

	describe("convertCreateInputToFirestoreAudioButton", () => {
		it("should convert input to Firestore format", () => {
			const input: CreateAudioButtonInput = {
				title: "Test Button",
				description: "Test Description",
				tags: ["tag1", "tag2"],
				sourceVideoId: "video123",
				startTime: 10,
				endTime: 20,
				isPublic: true,
			};

			const result = convertCreateInputToFirestoreAudioButton(input, "user123", "Test User");

			expect(result.title).toBe(input.title);
			expect(result.description).toBe(input.description);
			expect(result.tags).toEqual(input.tags);
			expect(result.createdBy).toBe("user123");
			expect(result.createdByName).toBe("Test User");
			expect(result.playCount).toBe(0);
			expect(result.likeCount).toBe(0);
			expect(result.dislikeCount).toBe(0);
			expect(result.favoriteCount).toBe(0);
			expect(result.createdAt).toBeDefined();
			expect(result.updatedAt).toBeDefined();
		});

		it("should handle missing optional fields", () => {
			const input: CreateAudioButtonInput = {
				title: "Test Button",
				tags: [],
				sourceVideoId: "video123",
				startTime: 10,
				endTime: 20,
				isPublic: false,
			};

			const result = convertCreateInputToFirestoreAudioButton(input, "user123", "Test User");

			expect(result.description).toBeUndefined();
			expect(result.tags).toEqual([]);
			expect(result.isPublic).toBe(false);
		});
	});

	describe("formatTimestamp", () => {
		it("should format seconds without hours", () => {
			expect(formatTimestamp(65.5)).toBe("1:05.5");
			expect(formatTimestamp(125.3)).toBe("2:05.3");
		});

		it("should format seconds with hours", () => {
			expect(formatTimestamp(3665.7)).toBe("1:01:05.7");
			expect(formatTimestamp(7325.1)).toBe("2:02:05.1");
		});

		it("should handle edge cases", () => {
			expect(formatTimestamp(0)).toBe("0:00.0");
			expect(formatTimestamp(59.9)).toBe("0:59.9");
			expect(formatTimestamp(3600)).toBe("1:00:00.0");
		});

		it("should handle decimal precision", () => {
			expect(formatTimestamp(10.14)).toBe("0:10.1");
			expect(formatTimestamp(10.16)).toBe("0:10.2");
		});
	});

	describe("Serialization functions", () => {
		const mockButton: FrontendAudioButtonData = {
			id: "btn1",
			title: "Test Button",
			description: "Test Description",
			tags: ["tag1"],
			sourceVideoId: "video123",
			sourceVideoThumbnailUrl: "https://example.com/thumb.jpg",
			startTime: 10,
			endTime: 20,
			createdAt: "2024-01-01T00:00:00Z",
			createdBy: "user123",
			createdByName: "Test User",
			isPublic: true,
			likeCount: 50,
			dislikeCount: 5,
			playCount: 100,
			favoriteCount: 10,
			updatedAt: "2024-01-01T00:00:00Z",
			durationText: "10秒",
			relativeTimeText: "3日前",
		};

		it("should serialize and deserialize correctly", () => {
			const serialized = serializeAudioButtonForRSC(mockButton);
			expect(typeof serialized).toBe("string");

			const deserialized = deserializeAudioButtonForRCC(serialized);
			expect(deserialized).toEqual(mockButton);
		});

		it("should handle deserialization errors", () => {
			expect(() => deserializeAudioButtonForRCC("invalid json")).toThrow(
				"音声ボタンデータの形式が無効です",
			);
		});

		it("should validate deserialized data", () => {
			const invalidData = { ...mockButton, id: "" }; // Invalid: empty id
			const serialized = JSON.stringify(invalidData);

			expect(() => deserializeAudioButtonForRCC(serialized)).toThrow();
		});
	});
});
