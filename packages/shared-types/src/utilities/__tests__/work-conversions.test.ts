/**
 * Tests for work conversion utilities
 */

import { describe, expect, it } from "vitest";
import type { WorkDocument } from "../../entities/work";
import {
	convertToWorkPlainObject,
	convertToWorkPlainObjects,
	isWorkPlainObject,
	normalizeToWorkPlainObject,
} from "../work-conversions";

describe("work-conversions", () => {
	const createMockFirestoreData = (overrides?: Partial<WorkDocument>): WorkDocument => ({
		id: "RJ123456",
		productId: "RJ123456",
		title: "Test Work",
		titleMasked: "Test Work",
		circle: "Test Circle",
		circleId: "RG12345",
		description: "Test description",
		category: "SOU",
		workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
		thumbnailUrl: "https://example.com/thumb.jpg",
		price: {
			current: 1000,
			original: 1000,
			currency: "JPY",
		},
		rating: {
			stars: 4.5,
			count: 100,
		},
		genres: ["ボイス", "ASMR"],
		customGenres: [],
		creators: {
			voice_by: [],
			scenario_by: [],
			illust_by: [],
			music_by: [],
			others_by: [],
			created_by: [],
		},
		sampleImages: [],
		createdAt: "2025-01-01T00:00:00.000Z",
		updatedAt: "2025-01-01T00:00:00.000Z",
		lastFetchedAt: "2025-01-01T00:00:00.000Z",
		...overrides,
	});

	describe("convertToWorkPlainObject", () => {
		it("converts valid WorkDocument to WorkPlainObject", () => {
			const firestoreData = createMockFirestoreData();
			const result = convertToWorkPlainObject(firestoreData);

			expect(result).not.toBeNull();
			expect(result?.id).toBe("RJ123456");
			expect(result?.productId).toBe("RJ123456");
			expect(result?.title).toBe("Test Work");
			expect(result?.circle).toBe("Test Circle");
			expect(result?.category).toBe("SOU");
			expect(result?._computed).toBeDefined();
			expect(result?._computed.isVoiceWork).toBe(true);
			expect(result?._computed.displayCategory).toBe("ボイス・ASMR");
		});

		it("returns null for null input", () => {
			expect(convertToWorkPlainObject(null)).toBeNull();
		});

		it("returns null for undefined input", () => {
			expect(convertToWorkPlainObject(undefined)).toBeNull();
		});

		it("returns null for invalid FirestoreServerWorkData", () => {
			const invalidData = { id: "invalid" } as any;
			expect(convertToWorkPlainObject(invalidData)).toBeNull();
		});

		it("handles adult content correctly", () => {
			const adultWork = createMockFirestoreData({
				ageCategory: 3,
				ageRating: "18禁",
			});
			const result = convertToWorkPlainObject(adultWork);

			expect(result?._computed.isAdultContent).toBe(true);
			expect(result?._computed.displayAgeRating).toBe("18禁");
		});
	});

	describe("convertToWorkPlainObjects", () => {
		it("converts array of FirestoreServerWorkData", () => {
			const data = [
				createMockFirestoreData({ productId: "RJ111111" }),
				createMockFirestoreData({ productId: "RJ222222" }),
				createMockFirestoreData({ productId: "RJ333333" }),
			];

			const results = convertToWorkPlainObjects(data);

			expect(results).toHaveLength(3);
			expect(results[0]?.productId).toBe("RJ111111");
			expect(results[1]?.productId).toBe("RJ222222");
			expect(results[2]?.productId).toBe("RJ333333");
		});

		it("filters out invalid works", () => {
			const data = [
				createMockFirestoreData({ productId: "RJ111111" }),
				{ id: "invalid" } as any,
				createMockFirestoreData({ productId: "RJ333333" }),
			];

			const results = convertToWorkPlainObjects(data);

			expect(results).toHaveLength(2);
			expect(results[0]?.productId).toBe("RJ111111");
			expect(results[1]?.productId).toBe("RJ333333");
		});

		it("returns empty array for empty input", () => {
			expect(convertToWorkPlainObjects([])).toEqual([]);
		});
	});

	describe("isWorkPlainObject", () => {
		it("returns true for valid WorkPlainObject", () => {
			const firestoreData = createMockFirestoreData();
			const plainObject = convertToWorkPlainObject(firestoreData);

			expect(isWorkPlainObject(plainObject)).toBe(true);
		});

		it("returns false for null", () => {
			expect(isWorkPlainObject(null)).toBe(false);
		});

		it("returns false for undefined", () => {
			expect(isWorkPlainObject(undefined)).toBe(false);
		});

		it("returns false for non-object", () => {
			expect(isWorkPlainObject("string")).toBe(false);
			expect(isWorkPlainObject(123)).toBe(false);
			expect(isWorkPlainObject(true)).toBe(false);
		});

		it("returns false for object missing required fields", () => {
			expect(isWorkPlainObject({})).toBe(false);
			expect(isWorkPlainObject({ id: "test" })).toBe(false);
			expect(isWorkPlainObject({ id: "test", productId: "test" })).toBe(false);
			expect(isWorkPlainObject({ id: "test", productId: "test", title: "test" })).toBe(false);
		});

		it("returns false for object with _computed not being an object", () => {
			const obj = {
				id: "test",
				productId: "test",
				title: "test",
				price: {},
				_computed: "not an object",
			};
			expect(isWorkPlainObject(obj)).toBe(false);
		});
	});

	describe("normalizeToWorkPlainObject", () => {
		it("returns WorkPlainObject as-is", () => {
			const firestoreData = createMockFirestoreData();
			const plainObject = convertToWorkPlainObject(firestoreData);

			const result = normalizeToWorkPlainObject(plainObject);
			expect(result).toBe(plainObject);
		});

		it("converts WorkDocument to WorkPlainObject", () => {
			const firestoreData = createMockFirestoreData();
			const result = normalizeToWorkPlainObject(firestoreData);

			expect(result).not.toBeNull();
			expect(result?.productId).toBe("RJ123456");
			expect(result?._computed).toBeDefined();
		});

		it("returns null for null input", () => {
			expect(normalizeToWorkPlainObject(null)).toBeNull();
		});

		it("returns null for undefined input", () => {
			expect(normalizeToWorkPlainObject(undefined)).toBeNull();
		});

		it("returns null for invalid data", () => {
			const invalidData = { some: "random", data: true };
			expect(normalizeToWorkPlainObject(invalidData as any)).toBeNull();
		});
	});
});
