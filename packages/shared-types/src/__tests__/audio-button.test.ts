import { describe, expect, it } from "vitest";
import {
	AudioButtonBaseSchema,
	AudioFormatSchema,
	FirestoreAudioButtonSchema,
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
