import { beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "../../../shared/logger";
import {
	AudioButtonMapperPerformance,
	type FirestoreAudioButtonData,
	mapAudioButtonEntityToFirestore,
	mapAudioButtonsToEntities,
	mapAudioButtonsWithErrors,
	mapFirestoreToAudioButtonEntity,
	validateAndCleanAudioButtonData,
} from "../audio-button-mapper-v2";

// Mock logger
vi.mock("../../../shared/logger", () => ({
	warn: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
}));

describe("AudioButton Mapper V2", () => {
	const createSampleFirestoreData = (
		overrides?: Partial<FirestoreAudioButtonData>,
	): FirestoreAudioButtonData => ({
		id: "ab_123",
		title: "Sample Audio Button",
		description: "Sample description",
		tags: ["sample", "test"],
		sourceVideoId: "dQw4w9WgXcQ",
		sourceVideoTitle: "Sample Video",
		startTime: 120,
		endTime: 125,
		createdBy: "user_123",
		createdByName: "Test User",
		isPublic: true,
		playCount: 100,
		likeCount: 80,
		dislikeCount: 20,
		favoriteCount: 50,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("mapFirestoreToAudioButtonEntity", () => {
		it("should map valid Firestore data to AudioButtonV2 entity", () => {
			const data = createSampleFirestoreData();
			const entity = mapFirestoreToAudioButtonEntity(data);

			expect(entity).not.toBeNull();
			expect(entity?.id.toString()).toBe("ab_123");
			expect(entity?.content.text.toString()).toBe("Sample Audio Button");
			expect(entity?.content.tags.toArray()).toEqual(["sample", "test"]);
			expect(entity?.reference.videoId.toString()).toBe("dQw4w9WgXcQ");
			expect(entity?.reference.startTimestamp.toSeconds()).toBe(120);
			expect(entity?.reference.endTimestamp?.toSeconds()).toBe(125);
			expect(entity?.statistics.viewCount.toNumber()).toBe(100);
			expect(entity?.statistics.likeCount.toNumber()).toBe(80);
			expect(entity?.statistics.dislikeCount.toNumber()).toBe(20);
			expect(entity?.favoriteCount).toBe(50);
			expect(entity?.createdBy.id).toBe("user_123");
			expect(entity?.createdBy.name).toBe("Test User");
			expect(entity?.isPublic).toBe(true);
		});

		it("should handle missing optional fields", () => {
			const data = createSampleFirestoreData({
				description: undefined,
				tags: undefined,
				sourceVideoTitle: undefined,
				playCount: undefined,
				likeCount: undefined,
				dislikeCount: undefined,
				favoriteCount: undefined,
			});

			const entity = mapFirestoreToAudioButtonEntity(data);

			expect(entity).not.toBeNull();
			expect(entity?.content.tags.size()).toBe(0);
			expect(entity?.reference.videoTitle.toString()).toBe("Unknown Video");
			expect(entity?.statistics.viewCount.toNumber()).toBe(0);
			expect(entity?.statistics.likeCount.toNumber()).toBe(0);
			expect(entity?.statistics.dislikeCount.toNumber()).toBe(0);
			expect(entity?.favoriteCount).toBe(0);
		});

		it("should return null for missing required fields", () => {
			const entity1 = mapFirestoreToAudioButtonEntity(createSampleFirestoreData({ id: "" }));
			expect(entity1).toBeNull();

			const entity2 = mapFirestoreToAudioButtonEntity(createSampleFirestoreData({ title: "" }));
			expect(entity2).toBeNull();

			const entity3 = mapFirestoreToAudioButtonEntity(
				createSampleFirestoreData({ sourceVideoId: "" }),
			);
			expect(entity3).toBeNull();
		});

		it("should handle invalid data gracefully", () => {
			const data = createSampleFirestoreData({
				startTime: -10, // Will be normalized to 0
				endTime: -5, // Will be normalized to startTime
				playCount: -100, // Will be normalized to 0
			});

			const entity = mapFirestoreToAudioButtonEntity(data);

			expect(entity).not.toBeNull();
			expect(entity?.reference.startTimestamp.toSeconds()).toBe(0);
			expect(entity?.reference.endTimestamp?.toSeconds()).toBe(0);
			expect(entity?.statistics.viewCount.toNumber()).toBe(0);
		});

		it("should use default values for missing creator info", () => {
			const data = createSampleFirestoreData({
				createdBy: "",
				createdByName: "",
			});

			const entity = mapFirestoreToAudioButtonEntity(data);

			expect(entity).not.toBeNull();
			expect(entity?.createdBy.id).toBe("unknown");
			expect(entity?.createdBy.name).toBe("Unknown User");
		});
	});

	describe("mapAudioButtonsWithErrors", () => {
		it("should map multiple buttons and track errors", () => {
			const buttons = [
				createSampleFirestoreData({ id: "ab_1" }),
				createSampleFirestoreData({ id: "ab_2", title: "" }), // Invalid
				createSampleFirestoreData({ id: "ab_3" }),
			];

			const result = mapAudioButtonsWithErrors(buttons);

			expect(result.entities).toHaveLength(2);
			expect(result.errors).toHaveLength(1);
			expect(result.entities[0].id.toString()).toBe("ab_1");
			expect(result.entities[1].id.toString()).toBe("ab_3");
			expect(result.errors[0].index).toBe(1);
			expect(result.errors[0].data.id).toBe("ab_2");
		});

		it("should handle all invalid data", () => {
			const buttons = [
				createSampleFirestoreData({ id: "" }),
				createSampleFirestoreData({ title: "" }),
				createSampleFirestoreData({ sourceVideoId: "" }),
			];

			const result = mapAudioButtonsWithErrors(buttons);

			expect(result.entities).toHaveLength(0);
			expect(result.errors).toHaveLength(3);
		});
	});

	describe("mapAudioButtonsToEntities", () => {
		it("should map valid buttons only", () => {
			const buttons = [
				createSampleFirestoreData({ id: "ab_1" }),
				createSampleFirestoreData({ id: "ab_2", title: "" }), // Invalid
				createSampleFirestoreData({ id: "ab_3" }),
			];

			const entities = mapAudioButtonsToEntities(buttons);

			expect(entities).toHaveLength(2);
			expect(entities[0].id.toString()).toBe("ab_1");
			expect(entities[1].id.toString()).toBe("ab_3");
		});
	});

	describe("mapAudioButtonEntityToFirestore", () => {
		it("should map entity to Firestore data", () => {
			const originalData = createSampleFirestoreData();
			const entity = mapFirestoreToAudioButtonEntity(originalData);
			expect(entity).not.toBeNull();

			const firestoreData = mapAudioButtonEntityToFirestore(entity!);

			expect(firestoreData.id).toBe("ab_123");
			expect(firestoreData.title).toBe("Sample Audio Button");
			expect(firestoreData.tags).toEqual(["sample", "test"]);
			expect(firestoreData.sourceVideoId).toBe("dQw4w9WgXcQ");
			expect(firestoreData.startTime).toBe(120);
			expect(firestoreData.endTime).toBe(125);
			expect(firestoreData.playCount).toBe(100);
			expect(firestoreData.createdBy).toBe("user_123");
			expect(firestoreData.createdByName).toBe("Test User");
		});

		it("should handle entity with minimal data", () => {
			const minimalData = createSampleFirestoreData({
				description: undefined,
				tags: [],
				sourceVideoTitle: undefined,
				playCount: 0,
				likeCount: 0,
				dislikeCount: 0,
				favoriteCount: 0,
			});

			const entity = mapFirestoreToAudioButtonEntity(minimalData);
			expect(entity).not.toBeNull();

			const firestoreData = mapAudioButtonEntityToFirestore(entity!);

			expect(firestoreData.description).toBeUndefined();
			expect(firestoreData.tags).toEqual([]);
			expect(firestoreData.playCount).toBe(0);
		});
	});

	describe("validateAndCleanAudioButtonData", () => {
		it("should clean and validate data", () => {
			const dirtyData = {
				id: "ab_123",
				title: "  Sample Title  ",
				description: "  Sample Description  ",
				tags: ["  tag1  ", "", "tag2"],
				sourceVideoId: "dQw4w9WgXcQ",
				sourceVideoTitle: "  Video Title  ",
				startTime: -10,
				endTime: -5,
				createdBy: "",
				createdByName: "",
				playCount: -100,
			};

			const cleaned = validateAndCleanAudioButtonData(dirtyData);

			expect(cleaned).not.toBeNull();
			expect(cleaned?.title).toBe("Sample Title");
			expect(cleaned?.description).toBe("Sample Description");
			expect(cleaned?.tags).toEqual(["  tag1  ", "tag2"]); // Whitespace preserved in tags
			expect(cleaned?.sourceVideoTitle).toBe("Video Title");
			expect(cleaned?.startTime).toBe(0);
			expect(cleaned?.endTime).toBe(0);
			expect(cleaned?.createdBy).toBe("unknown");
			expect(cleaned?.createdByName).toBe("Unknown User");
			expect(cleaned?.playCount).toBe(0);
		});

		it("should return null for missing required fields", () => {
			expect(validateAndCleanAudioButtonData({})).toBeNull();
			expect(validateAndCleanAudioButtonData({ id: "123" })).toBeNull();
			expect(validateAndCleanAudioButtonData({ id: "123", title: "Test" })).toBeNull();
		});

		it("should add timestamps if missing", () => {
			const data = {
				id: "ab_123",
				title: "Test",
				sourceVideoId: "dQw4w9WgXcQ",
			};

			const cleaned = validateAndCleanAudioButtonData(data);

			expect(cleaned).not.toBeNull();
			expect(cleaned?.createdAt).toBeDefined();
			expect(cleaned?.updatedAt).toBe(cleaned?.createdAt);
		});
	});

	describe("AudioButtonMapperPerformance", () => {
		it("should track performance metrics", () => {
			const perf = new AudioButtonMapperPerformance();
			perf.start(1000);

			// Simulate some processing time
			const startTime = Date.now();
			while (Date.now() - startTime < 10) {
				// Wait
			}

			const metrics = perf.end();

			expect(metrics.duration).toBeGreaterThan(0);
			expect(metrics.itemsPerSecond).toBeGreaterThan(0);
		});

		it("should log performance", () => {
			const perf = new AudioButtonMapperPerformance();
			perf.start(100);
			perf.log("test operation");

			// Logger should have been called
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining("AudioButton mapping performance"),
				expect.objectContaining({
					duration: expect.any(String),
					itemCount: 100,
					itemsPerSecond: expect.any(Number),
				}),
			);
		});
	});

	describe("Performance tests", () => {
		it("should process 1000 buttons efficiently", () => {
			const buttons = Array.from({ length: 1000 }, (_, i) =>
				createSampleFirestoreData({ id: `ab_${i}` }),
			);

			const perf = new AudioButtonMapperPerformance();
			perf.start(buttons.length);

			const entities = mapAudioButtonsToEntities(buttons);

			const { duration } = perf.end();

			expect(entities).toHaveLength(1000);
			expect(duration).toBeLessThan(50); // Should process in less than 50ms
		});

		it("should handle mixed valid/invalid data efficiently", () => {
			const buttons = Array.from({ length: 1000 }, (_, i) =>
				i % 5 === 0
					? createSampleFirestoreData({ id: "" }) // Invalid
					: createSampleFirestoreData({ id: `ab_${i}` }),
			);

			const perf = new AudioButtonMapperPerformance();
			perf.start(buttons.length);

			const result = mapAudioButtonsWithErrors(buttons);

			const { duration } = perf.end();

			expect(result.entities).toHaveLength(800); // 80% valid
			expect(result.errors).toHaveLength(200); // 20% invalid
			expect(duration).toBeLessThan(50);
		});
	});

	describe("Edge cases", () => {
		it("should handle very long text fields", () => {
			const longText = "A".repeat(500);
			const data = createSampleFirestoreData({
				title: longText.substring(0, 100), // Respect title limit
				description: longText,
				sourceVideoTitle: longText,
			});

			const entity = mapFirestoreToAudioButtonEntity(data);

			expect(entity).not.toBeNull();
			expect(entity?.content.text.toString()).toHaveLength(100);
		});

		it("should handle special characters in text", () => {
			const data = createSampleFirestoreData({
				title: "Test 🎵 Button 音楽",
				tags: ["emoji🎵", "日本語", "special!@#"],
			});

			const entity = mapFirestoreToAudioButtonEntity(data);

			expect(entity).not.toBeNull();
			expect(entity?.content.text.toString()).toBe("Test 🎵 Button 音楽");
			expect(entity?.content.tags.toArray()).toContain("emoji🎵");
		});

		it("should handle future dates", () => {
			const futureDate = "2099-12-31T23:59:59Z";
			const data = createSampleFirestoreData({
				createdAt: futureDate,
				updatedAt: futureDate,
			});

			const entity = mapFirestoreToAudioButtonEntity(data);

			expect(entity).not.toBeNull();
			// JavaScript Date.toISOString() always includes milliseconds
			expect(entity?.createdAt.toISOString()).toBe("2099-12-31T23:59:59.000Z");
		});
	});
});
