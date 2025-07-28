import { describe, expect, it } from "vitest";
import { Circle } from "../circle";

describe("Circle", () => {
	describe("constructor", () => {
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
			const circle = new Circle("RG23954", "テストサークル", "Test Circle");
			expect(circle.toDisplayString()).toBe("テストサークル");
		});

		it("should return English name when preferred", () => {
			const circle = new Circle("RG23954", "テストサークル", "Test Circle");
			expect(circle.toDisplayString(true)).toBe("Test Circle");
		});

		it("should fallback to Japanese when English not available", () => {
			const circle = new Circle("RG23954", "テストサークル");
			expect(circle.toDisplayString(true)).toBe("テストサークル");
		});
	});

	describe("getSearchableText", () => {
		it("should combine Japanese and English names", () => {
			const circle = new Circle("RG23954", "テストサークル", "Test Circle");
			expect(circle.getSearchableText()).toBe("テストサークル Test Circle");
		});

		it("should return only Japanese name when no English", () => {
			const circle = new Circle("RG23954", "テストサークル");
			expect(circle.getSearchableText()).toBe("テストサークル");
		});
	});

	describe("toUrl", () => {
		it("should generate correct DLsite URL", () => {
			const circle = new Circle("RG23954", "テストサークル");
			expect(circle.toUrl()).toBe(
				"https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG23954.html",
			);
		});

		it("should work with different circle IDs", () => {
			const circle = new Circle("BG12345", "サークル");
			expect(circle.toUrl()).toBe(
				"https://www.dlsite.com/maniax/circle/profile/=/maker_id/BG12345.html",
			);
		});
	});

	describe("equals", () => {
		it("should return true for equal circles", () => {
			const circle1 = new Circle("RG23954", "テストサークル", "Test Circle");
			const circle2 = new Circle("RG23954", "テストサークル", "Test Circle");
			expect(circle1.equals(circle2)).toBe(true);
		});

		it("should return false for different IDs", () => {
			const circle1 = new Circle("RG23954", "テストサークル");
			const circle2 = new Circle("RG23955", "テストサークル");
			expect(circle1.equals(circle2)).toBe(false);
		});

		it("should return false for different names", () => {
			const circle1 = new Circle("RG23954", "テストサークル1");
			const circle2 = new Circle("RG23954", "テストサークル2");
			expect(circle1.equals(circle2)).toBe(false);
		});

		it("should return false for different English names", () => {
			const circle1 = new Circle("RG23954", "テストサークル", "Test Circle 1");
			const circle2 = new Circle("RG23954", "テストサークル", "Test Circle 2");
			expect(circle1.equals(circle2)).toBe(false);
		});

		it("should handle undefined English names", () => {
			const circle1 = new Circle("RG23954", "テストサークル");
			const circle2 = new Circle("RG23954", "テストサークル", undefined);
			expect(circle1.equals(circle2)).toBe(true);
		});

		it("should return false for non-Circle objects", () => {
			const circle = new Circle("RG23954", "テストサークル");
			expect(circle.equals("RG23954" as any)).toBe(false);
			expect(circle.equals(null as any)).toBe(false);
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
