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

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const plainObject = result.value;
				expect(plainObject.id).toBe("RJ123456");
				expect(plainObject.productId).toBe("RJ123456");
				expect(plainObject.title).toBe("Test Work");
				expect(plainObject.circle).toBe("Test Circle");
				expect(plainObject.category).toBe("SOU");
				expect(plainObject._computed).toBeDefined();
				expect(plainObject._computed.isVoiceWork).toBe(true);
				expect(plainObject._computed.displayCategory).toBe("ボイス・ASMR");
			}
		});

		it("returns error for null input", () => {
			const result = convertToWorkPlainObject(null);
			expect(result.isErr()).toBe(true);
		});

		it("returns error for undefined input", () => {
			const result = convertToWorkPlainObject(undefined);
			expect(result.isErr()).toBe(true);
		});

		it("returns error for invalid FirestoreServerWorkData", () => {
			const invalidData = { id: "invalid" } as any;
			const result = convertToWorkPlainObject(invalidData);
			expect(result.isErr()).toBe(true);
		});

		it("handles adult content correctly", () => {
			const adultWork = createMockFirestoreData({
				ageCategory: 3,
				ageRating: "18禁",
			});
			const result = convertToWorkPlainObject(adultWork);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value._computed.isAdultContent).toBe(true);
				expect(result.value._computed.displayAgeRating).toBe("18禁");
			}
		});
	});

	describe("convertToWorkPlainObjects", () => {
		it("converts array of FirestoreServerWorkData", () => {
			const data = [
				createMockFirestoreData({ productId: "RJ111111" }),
				createMockFirestoreData({ productId: "RJ222222" }),
				createMockFirestoreData({ productId: "RJ333333" }),
			];

			const result = convertToWorkPlainObjects(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const results = result.value;
				expect(results).toHaveLength(3);
				expect(results[0]?.productId).toBe("RJ111111");
				expect(results[1]?.productId).toBe("RJ222222");
				expect(results[2]?.productId).toBe("RJ333333");
			}
		});

		it("filters out invalid works", () => {
			const data = [
				createMockFirestoreData({ productId: "RJ111111" }),
				{ id: "invalid" } as any,
				createMockFirestoreData({ productId: "RJ333333" }),
			];

			const result = convertToWorkPlainObjects(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const results = result.value;
				expect(results).toHaveLength(2);
				expect(results[0]?.productId).toBe("RJ111111");
				expect(results[1]?.productId).toBe("RJ333333");
			}
		});

		it("returns empty array for empty input", () => {
			const result = convertToWorkPlainObjects([]);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual([]);
			}
		});
	});

	describe("isWorkPlainObject", () => {
		it("returns true for valid WorkPlainObject", () => {
			const firestoreData = createMockFirestoreData();
			const result = convertToWorkPlainObject(firestoreData);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(isWorkPlainObject(result.value)).toBe(true);
			}
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
			const convertResult = convertToWorkPlainObject(firestoreData);

			expect(convertResult.isOk()).toBe(true);
			if (convertResult.isOk()) {
				const plainObject = convertResult.value;
				const normalizeResult = normalizeToWorkPlainObject(plainObject);
				expect(normalizeResult.isOk()).toBe(true);
				if (normalizeResult.isOk()) {
					expect(normalizeResult.value).toBe(plainObject);
				}
			}
		});

		it("converts WorkDocument to WorkPlainObject", () => {
			const firestoreData = createMockFirestoreData();
			const result = normalizeToWorkPlainObject(firestoreData);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.productId).toBe("RJ123456");
				expect(result.value._computed).toBeDefined();
			}
		});

		it("returns error for null input", () => {
			const result = normalizeToWorkPlainObject(null);
			expect(result.isErr()).toBe(true);
		});

		it("returns error for undefined input", () => {
			const result = normalizeToWorkPlainObject(undefined);
			expect(result.isErr()).toBe(true);
		});

		it("returns error for invalid data", () => {
			const invalidData = { some: "random", data: true };
			const result = normalizeToWorkPlainObject(invalidData as any);
			expect(result.isErr()).toBe(true);
		});
	});
});
