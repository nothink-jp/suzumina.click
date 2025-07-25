import { describe, expect, it } from "vitest";
import type { FrontendAudioButtonData } from "../../entities/audio-button";
import {
	createMigrationReport,
	migrateAudioButton,
	migrateAudioButtonBatch,
	validateAudioButtonForMigration,
} from "../audio-button-migration";

describe("AudioButton Migration Helper", () => {
	const createValidAudioButton = (
		overrides?: Partial<FrontendAudioButtonData>,
	): FrontendAudioButtonData => ({
		id: "ab_123",
		title: "Test Audio Button",
		description: "Test description",
		tags: ["test", "sample"],
		sourceVideoId: "dQw4w9WgXcQ",
		sourceVideoTitle: "Test Video",
		startTime: 10,
		endTime: 20,
		createdBy: "user_123",
		createdByName: "Test User",
		isPublic: true,
		playCount: 100,
		likeCount: 50,
		dislikeCount: 5,
		favoriteCount: 25,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-02T00:00:00Z",
		durationText: "10秒",
		relativeTimeText: "3日前",
		...overrides,
	});

	describe("migrateAudioButton", () => {
		it("should successfully migrate a valid audio button", () => {
			const audioButton = createValidAudioButton();
			const result = migrateAudioButton(audioButton);

			expect(result.success).toBe(true);
			expect(result.entity).toBeDefined();
			expect(result.error).toBeUndefined();
			expect(result.entity?.id.toString()).toBe("ab_123");
			expect(result.entity?.content.text.toString()).toBe("Test Audio Button");
		});

		it("should handle missing optional fields", () => {
			const audioButton = createValidAudioButton({
				description: undefined,
				tags: undefined,
				sourceVideoTitle: undefined,
				playCount: undefined,
				likeCount: undefined,
				dislikeCount: undefined,
				favoriteCount: undefined,
				updatedAt: undefined,
			});
			const result = migrateAudioButton(audioButton);

			expect(result.success).toBe(true);
			expect(result.entity).toBeDefined();
			expect(result.entity?.content.tags.size()).toBe(0);
			expect(result.entity?.statistics.viewCount.toNumber()).toBe(0);
		});

		it("should fail on missing required fields", () => {
			const audioButton = createValidAudioButton({
				id: "",
				title: "",
				sourceVideoId: "",
			});
			const result = migrateAudioButton(audioButton);

			expect(result.success).toBe(false);
			expect(result.entity).toBeUndefined();
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain("Missing required fields");
			expect(result.error?.message).toContain("id");
			expect(result.error?.message).toContain("title");
			expect(result.error?.message).toContain("sourceVideoId");
		});

		it("should fail on invalid time range", () => {
			const audioButton = createValidAudioButton({
				startTime: 20,
				endTime: 10,
			});
			const result = migrateAudioButton(audioButton);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should preserve all data during migration", () => {
			const audioButton = createValidAudioButton();
			const result = migrateAudioButton(audioButton);

			expect(result.success).toBe(true);
			const entity = result.entity!;
			const legacy = entity.toLegacy();

			expect(legacy.id).toBe(audioButton.id);
			expect(legacy.title).toBe(audioButton.title);
			// Description is conditionally returned based on text length
			if (audioButton.title.length > 50) {
				expect(legacy.description).toBe(audioButton.title);
			} else {
				expect(legacy.description).toBeUndefined();
			}
			expect(legacy.tags).toEqual(audioButton.tags);
			expect(legacy.sourceVideoId).toBe(audioButton.sourceVideoId);
			expect(legacy.sourceVideoTitle).toBe(audioButton.sourceVideoTitle);
			expect(legacy.startTime).toBe(audioButton.startTime);
			expect(legacy.endTime).toBe(audioButton.endTime);
			expect(legacy.createdBy).toBe(audioButton.createdBy);
			expect(legacy.createdByName).toBe(audioButton.createdByName);
			expect(legacy.isPublic).toBe(audioButton.isPublic);
			expect(legacy.playCount).toBe(audioButton.playCount);
			expect(legacy.likeCount).toBe(audioButton.likeCount);
			expect(legacy.dislikeCount).toBe(audioButton.dislikeCount);
			expect(legacy.favoriteCount).toBe(audioButton.favoriteCount);
		});
	});

	describe("migrateAudioButtonBatch", () => {
		it("should migrate multiple audio buttons", () => {
			const audioButtons = [
				createValidAudioButton({ id: "ab_1" }),
				createValidAudioButton({ id: "ab_2" }),
				createValidAudioButton({ id: "ab_3" }),
			];
			const result = migrateAudioButtonBatch(audioButtons);

			expect(result.totalProcessed).toBe(3);
			expect(result.successCount).toBe(3);
			expect(result.failureCount).toBe(0);
			expect(result.entities).toHaveLength(3);
			expect(result.failures).toHaveLength(0);
			expect(result.entities[0]?.id.toString()).toBe("ab_1");
			expect(result.entities[1]?.id.toString()).toBe("ab_2");
			expect(result.entities[2]?.id.toString()).toBe("ab_3");
		});

		it("should handle mixed success and failure", () => {
			const audioButtons = [
				createValidAudioButton({ id: "ab_1" }),
				createValidAudioButton({ id: "", title: "" }), // Invalid
				createValidAudioButton({ id: "ab_3" }),
				createValidAudioButton({ startTime: 30, endTime: 10 }), // Invalid time range
			];
			const result = migrateAudioButtonBatch(audioButtons);

			expect(result.totalProcessed).toBe(4);
			expect(result.successCount).toBe(2);
			expect(result.failureCount).toBe(2);
			expect(result.entities).toHaveLength(2);
			expect(result.failures).toHaveLength(2);
		});

		it("should handle empty array", () => {
			const result = migrateAudioButtonBatch([]);

			expect(result.totalProcessed).toBe(0);
			expect(result.successCount).toBe(0);
			expect(result.failureCount).toBe(0);
			expect(result.entities).toHaveLength(0);
			expect(result.failures).toHaveLength(0);
		});
	});

	describe("validateAudioButtonForMigration", () => {
		it("should validate a valid audio button", () => {
			const audioButton = createValidAudioButton();
			const result = validateAudioButtonForMigration(audioButton);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect missing required fields", () => {
			const audioButton = createValidAudioButton({
				id: "",
				title: "",
				sourceVideoId: "",
				createdBy: "",
				createdByName: "",
				createdAt: "",
			});
			const result = validateAudioButtonForMigration(audioButton);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Missing required field: id");
			expect(result.errors).toContain("Missing required field: title");
			expect(result.errors).toContain("Missing required field: sourceVideoId");
			expect(result.errors).toContain("Missing required field: createdBy");
			expect(result.errors).toContain("Missing required field: createdByName");
			expect(result.errors).toContain("Missing required field: createdAt");
		});

		it("should detect invalid time values", () => {
			const audioButton = createValidAudioButton({
				startTime: -1,
				endTime: -5,
			});
			const result = validateAudioButtonForMigration(audioButton);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid startTime: must be a non-negative number");
			expect(result.errors).toContain("Invalid endTime: must be a non-negative number");
		});

		it("should detect invalid time range", () => {
			const audioButton = createValidAudioButton({
				startTime: 20,
				endTime: 10,
			});
			const result = validateAudioButtonForMigration(audioButton);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid time range: startTime must be less than endTime");
		});

		it("should detect invalid tags type", () => {
			const audioButton = createValidAudioButton({
				tags: "not-an-array" as any,
			});
			const result = validateAudioButtonForMigration(audioButton);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid tags: must be an array");
		});
	});

	describe("createMigrationReport", () => {
		it("should create a report for successful migration", () => {
			const result = {
				entities: [
					createValidAudioButton({ id: "ab_1" }),
					createValidAudioButton({ id: "ab_2" }),
				] as any[],
				failures: [],
				totalProcessed: 2,
				successCount: 2,
				failureCount: 0,
			};
			const report = createMigrationReport(result);

			expect(report).toContain("=== AudioButton Migration Report ===");
			expect(report).toContain("Total Processed: 2");
			expect(report).toContain("Successful: 2 (100.0%)");
			expect(report).toContain("Failed: 0 (0.0%)");
			expect(report).not.toContain("=== Failure Details ===");
		});

		it("should create a report with failures", () => {
			const result = {
				entities: [],
				failures: [
					{
						original: createValidAudioButton({ id: "ab_1" }),
						error: new Error("Missing required fields"),
						success: false,
					},
					{
						original: createValidAudioButton({ id: "ab_2" }),
						error: new Error("Invalid time range"),
						success: false,
					},
				],
				totalProcessed: 2,
				successCount: 0,
				failureCount: 2,
			};
			const report = createMigrationReport(result);

			expect(report).toContain("=== AudioButton Migration Report ===");
			expect(report).toContain("Total Processed: 2");
			expect(report).toContain("Successful: 0 (0.0%)");
			expect(report).toContain("Failed: 2 (100.0%)");
			expect(report).toContain("=== Failure Details ===");
			expect(report).toContain("ab_1: Missing required fields");
			expect(report).toContain("ab_2: Invalid time range");
		});

		it("should truncate large failure lists", () => {
			const failures = Array.from({ length: 15 }, (_, i) => ({
				original: createValidAudioButton({ id: `ab_${i}` }),
				error: new Error(`Error ${i}`),
				success: false,
			}));
			const result = {
				entities: [],
				failures,
				totalProcessed: 15,
				successCount: 0,
				failureCount: 15,
			};
			const report = createMigrationReport(result);

			expect(report).toContain("... and 5 more failures");
			// Should show first 10 failures
			expect(report).toContain("ab_0: Error 0");
			expect(report).toContain("ab_9: Error 9");
			// Should not show 11th failure
			expect(report).not.toContain("ab_10: Error 10");
		});

		it("should handle empty results", () => {
			const result = {
				entities: [],
				failures: [],
				totalProcessed: 0,
				successCount: 0,
				failureCount: 0,
			};
			const report = createMigrationReport(result);

			expect(report).toContain("Total Processed: 0");
			expect(report).toContain("Successful: 0 (0%)");
			expect(report).toContain("Failed: 0 (0%)");
		});
	});
});
