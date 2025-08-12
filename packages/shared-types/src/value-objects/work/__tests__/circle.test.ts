import { describe, expect, it } from "vitest";
import { Circle } from "../circle";

describe("Circle", () => {
	describe("create (Result pattern)", () => {
		it("should create a valid circle with Result", () => {
			const result = Circle.create("RG23954", "テストサークル", "Test Circle");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const circle = result.value;
				expect(circle.id).toBe("RG23954");
				expect(circle.name).toBe("テストサークル");
				expect(circle.nameEn).toBe("Test Circle");
			}
		});

		it("should create circle without English name", () => {
			const result = Circle.create("RG23954", "テストサークル");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const circle = result.value;
				expect(circle.id).toBe("RG23954");
				expect(circle.name).toBe("テストサークル");
				expect(circle.nameEn).toBeUndefined();
			}
		});

		it("should return error for empty name", () => {
			const result1 = Circle.create("RG23954", "");
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.field).toBe("circle");
				expect(result1.error.message).toBe("Circle name cannot be empty");
			}

			const result2 = Circle.create("RG23954", "   ");
			expect(result2.isErr()).toBe(true);
		});

		it("should return error for empty ID", () => {
			const result1 = Circle.create("", "サークル名");
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.field).toBe("circle");
				expect(result1.error.message).toBe("Circle ID cannot be empty");
			}

			const result2 = Circle.create("   ", "サークル名");
			expect(result2.isErr()).toBe(true);
		});
	});

	describe("fromData", () => {
		it("should create from data object", () => {
			const result = Circle.fromData({
				id: "RG23954",
				name: "テストサークル",
				nameEn: "Test Circle",
			});
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const circle = result.value;
				expect(circle.id).toBe("RG23954");
				expect(circle.name).toBe("テストサークル");
				expect(circle.nameEn).toBe("Test Circle");
			}
		});

		it("should handle errors from invalid data", () => {
			const result = Circle.fromData({
				id: "",
				name: "テストサークル",
			});
			expect(result.isErr()).toBe(true);
		});
	});

	describe("fromPlainObject", () => {
		it("should create from plain object", () => {
			const result = Circle.fromPlainObject({
				id: "RG23954",
				name: "テストサークル",
				nameEn: "Test Circle",
			});
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const circle = result.value;
				expect(circle.id).toBe("RG23954");
				expect(circle.name).toBe("テストサークル");
				expect(circle.nameEn).toBe("Test Circle");
			}
		});

		it("should handle non-object input", () => {
			const result1 = Circle.fromPlainObject(null);
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toBe("Circle must be an object");
			}

			const result2 = Circle.fromPlainObject("string");
			expect(result2.isErr()).toBe(true);
		});

		it("should validate field types", () => {
			const result1 = Circle.fromPlainObject({
				id: 123,
				name: "テストサークル",
			});
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.field).toBe("id");
				expect(result1.error.message).toBe("Circle ID must be a string");
			}

			const result2 = Circle.fromPlainObject({
				id: "RG23954",
				name: 123,
			});
			expect(result2.isErr()).toBe(true);
			if (result2.isErr()) {
				expect(result2.error.field).toBe("name");
				expect(result2.error.message).toBe("Circle name must be a string");
			}
		});
	});

	describe("constructor (legacy)", () => {
		it("should create a valid circle", () => {
			const circle = new Circle("RG23954", "テストサークル", "Test Circle");
			expect(circle.id).toBe("RG23954");
			expect(circle.name).toBe("テストサークル");
			expect(circle.nameEn).toBe("Test Circle");
		});

		it("should create circle without English name", () => {
			const circle = new Circle("RG23954", "テストサークル");
			expect(circle.id).toBe("RG23954");
			expect(circle.name).toBe("テストサークル");
			expect(circle.nameEn).toBeUndefined();
		});

		it("should throw error for empty name", () => {
			expect(() => new Circle("RG23954", "")).toThrow("Circle name cannot be empty");
			expect(() => new Circle("RG23954", "   ")).toThrow("Circle name cannot be empty");
		});

		it("should throw error for empty ID", () => {
			expect(() => new Circle("", "サークル名")).toThrow("Circle ID cannot be empty");
			expect(() => new Circle("   ", "サークル名")).toThrow("Circle ID cannot be empty");
		});
	});

	describe("toDisplayString", () => {
		it("should return Japanese name by default", () => {
			const result = Circle.create("RG23954", "テストサークル", "Test Circle");
			if (result.isOk()) {
				expect(result.value.toDisplayString()).toBe("テストサークル");
			}
		});

		it("should return English name when preferred", () => {
			const result = Circle.create("RG23954", "テストサークル", "Test Circle");
			if (result.isOk()) {
				expect(result.value.toDisplayString(true)).toBe("Test Circle");
			}
		});

		it("should fallback to Japanese when English not available", () => {
			const result = Circle.create("RG23954", "テストサークル");
			if (result.isOk()) {
				expect(result.value.toDisplayString(true)).toBe("テストサークル");
			}
		});
	});

	describe("getSearchableText", () => {
		it("should combine Japanese and English names", () => {
			const result = Circle.create("RG23954", "テストサークル", "Test Circle");
			if (result.isOk()) {
				expect(result.value.getSearchableText()).toBe("テストサークル Test Circle");
			}
		});

		it("should return only Japanese name when no English", () => {
			const result = Circle.create("RG23954", "テストサークル");
			if (result.isOk()) {
				expect(result.value.getSearchableText()).toBe("テストサークル");
			}
		});
	});

	describe("toUrl", () => {
		it("should generate correct DLsite URL", () => {
			const result = Circle.create("RG23954", "テストサークル");
			if (result.isOk()) {
				expect(result.value.toUrl()).toBe(
					"https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG23954.html",
				);
			}
		});

		it("should work with different circle IDs", () => {
			const result = Circle.create("BG12345", "サークル");
			if (result.isOk()) {
				expect(result.value.toUrl()).toBe(
					"https://www.dlsite.com/maniax/circle/profile/=/maker_id/BG12345.html",
				);
			}
		});
	});

	describe("equals", () => {
		it("should return true for equal circles", () => {
			const result1 = Circle.create("RG23954", "テストサークル", "Test Circle");
			const result2 = Circle.create("RG23954", "テストサークル", "Test Circle");
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(true);
			}
		});

		it("should return false for different IDs", () => {
			const result1 = Circle.create("RG23954", "テストサークル");
			const result2 = Circle.create("RG23955", "テストサークル");
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(false);
			}
		});

		it("should return false for different names", () => {
			const result1 = Circle.create("RG23954", "テストサークル1");
			const result2 = Circle.create("RG23954", "テストサークル2");
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(false);
			}
		});

		it("should return false for different English names", () => {
			const result1 = Circle.create("RG23954", "テストサークル", "Test Circle 1");
			const result2 = Circle.create("RG23954", "テストサークル", "Test Circle 2");
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(false);
			}
		});

		it("should handle undefined English names", () => {
			const result1 = Circle.create("RG23954", "テストサークル");
			const result2 = Circle.create("RG23954", "テストサークル", undefined);
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(true);
			}
		});

		it("should return false for non-Circle objects", () => {
			const result = Circle.create("RG23954", "テストサークル");
			if (result.isOk()) {
				expect(result.value.equals("RG23954" as any)).toBe(false);
				expect(result.value.equals(null as any)).toBe(false);
			}
		});
	});

	describe("isValid and getValidationErrors", () => {
		it("should validate valid circle", () => {
			const result = Circle.create("RG23954", "テストサークル");
			if (result.isOk()) {
				expect(result.value.isValid()).toBe(true);
				expect(result.value.getValidationErrors()).toEqual([]);
			}
		});
	});

	describe("clone", () => {
		it("should create a deep copy", () => {
			const result = Circle.create("RG23954", "テストサークル", "Test Circle");
			if (result.isOk()) {
				const original = result.value;
				const cloned = original.clone();
				expect(cloned).not.toBe(original);
				expect(cloned.equals(original)).toBe(true);
				expect(cloned.id).toBe(original.id);
				expect(cloned.name).toBe(original.name);
				expect(cloned.nameEn).toBe(original.nameEn);
			}
		});
	});

	describe("toPlainObject", () => {
		it("should convert to plain object with all fields", () => {
			const result = Circle.create("RG23954", "テストサークル", "Test Circle");
			if (result.isOk()) {
				const plain = result.value.toPlainObject();
				expect(plain).toEqual({
					id: "RG23954",
					name: "テストサークル",
					nameEn: "Test Circle",
				});
			}
		});

		it("should exclude undefined nameEn", () => {
			const result = Circle.create("RG23954", "テストサークル");
			if (result.isOk()) {
				const plain = result.value.toPlainObject();
				expect(plain).toEqual({
					id: "RG23954",
					name: "テストサークル",
				});
				expect(plain.nameEn).toBeUndefined();
			}
		});
	});

	describe("fromPartial", () => {
		it("should create circle from partial data with ID", () => {
			const circle = Circle.fromPartial({
				id: "RG23954",
				name: "テストサークル",
				nameEn: "Test Circle",
			});
			expect(circle.id).toBe("RG23954");
			expect(circle.name).toBe("テストサークル");
			expect(circle.nameEn).toBe("Test Circle");
		});

		it("should generate ID when not provided", () => {
			const before = Date.now();
			const circle = Circle.fromPartial({
				name: "テストサークル",
			});
			const after = Date.now();

			expect(circle.name).toBe("テストサークル");
			expect(circle.id).toMatch(/^UNKNOWN_\d+$/);

			const timestamp = Number.parseInt(circle.id.replace("UNKNOWN_", ""), 10);
			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});

		it("should handle minimal data", () => {
			const circle = Circle.fromPartial({
				name: "最小データ",
			});
			expect(circle.name).toBe("最小データ");
			expect(circle.nameEn).toBeUndefined();
			expect(circle.id).toMatch(/^UNKNOWN_\d+$/);
		});
	});
});
