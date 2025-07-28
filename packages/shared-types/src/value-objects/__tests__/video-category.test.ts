import { describe, expect, it } from "vitest";
import { VideoCategory, YOUTUBE_CATEGORIES } from "../video-category";

describe("VideoCategory", () => {
	describe("constructor", () => {
		it("should create a valid video category", () => {
			const category = new VideoCategory("20");
			expect(category.toId()).toBe("20");
		});

		it("should trim whitespace", () => {
			const category = new VideoCategory("  20  ");
			expect(category.toId()).toBe("20");
		});

		it("should throw error for empty string", () => {
			expect(() => new VideoCategory("")).toThrow();
		});

		it("should throw error for whitespace only", () => {
			expect(() => new VideoCategory("   ")).toThrow();
		});
	});

	describe("toJapaneseName", () => {
		it("should return Japanese name for known categories", () => {
			expect(new VideoCategory("20").toJapaneseName()).toBe("ゲーム");
			expect(new VideoCategory("22").toJapaneseName()).toBe("ブログ");
			expect(new VideoCategory("10").toJapaneseName()).toBe("音楽");
		});

		it("should fallback to English name for unknown categories", () => {
			expect(new VideoCategory("999").toJapaneseName()).toBe("Category 999");
		});
	});

	describe("getEnglishName", () => {
		it("should return English name for known categories", () => {
			expect(new VideoCategory("20").getEnglishName()).toBe("Gaming");
			expect(new VideoCategory("22").getEnglishName()).toBe("People & Blogs");
			expect(new VideoCategory("10").getEnglishName()).toBe("Music");
		});

		it("should return generic name for unknown categories", () => {
			expect(new VideoCategory("999").getEnglishName()).toBe("Category 999");
		});

		it("should work with all predefined categories", () => {
			Object.entries(YOUTUBE_CATEGORIES).forEach(([id, name]) => {
				expect(new VideoCategory(id).getEnglishName()).toBe(name);
			});
		});
	});

	describe("toNumber", () => {
		it("should convert category ID to number", () => {
			expect(new VideoCategory("20").toNumber()).toBe(20);
			expect(new VideoCategory("1").toNumber()).toBe(1);
			expect(new VideoCategory("999").toNumber()).toBe(999);
		});
	});

	describe("validation", () => {
		it("should be valid for numeric string", () => {
			const category = new VideoCategory("20");
			expect(category.isValid()).toBe(true);
			expect(category.getValidationErrors()).toEqual([]);
		});

		it("should be invalid for non-numeric string", () => {
			const category = new VideoCategory("abc");
			expect(category.isValid()).toBe(false);
			expect(category.getValidationErrors()).toContain("Category ID must be numeric");
		});

		it("should be invalid for alphanumeric string", () => {
			const category = new VideoCategory("20a");
			expect(category.isValid()).toBe(false);
			expect(category.getValidationErrors()).toContain("Category ID must be numeric");
		});
	});

	describe("toString", () => {
		it("should return Japanese name", () => {
			expect(new VideoCategory("20").toString()).toBe("ゲーム");
		});
	});

	describe("toId", () => {
		it("should return raw category ID", () => {
			expect(new VideoCategory("20").toId()).toBe("20");
		});
	});

	describe("clone", () => {
		it("should create a copy of the category", () => {
			const original = new VideoCategory("20");
			const cloned = original.clone();

			expect(cloned.toId()).toBe(original.toId());
			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);
		});
	});

	describe("equals", () => {
		it("should return true for same category ID", () => {
			const category1 = new VideoCategory("20");
			const category2 = new VideoCategory("20");
			expect(category1.equals(category2)).toBe(true);
		});

		it("should return false for different category ID", () => {
			const category1 = new VideoCategory("20");
			const category2 = new VideoCategory("22");
			expect(category1.equals(category2)).toBe(false);
		});

		it("should return false for null", () => {
			const category = new VideoCategory("20");
			expect(category.equals(null as any)).toBe(false);
		});

		it("should return false for undefined", () => {
			const category = new VideoCategory("20");
			expect(category.equals(undefined as any)).toBe(false);
		});

		it("should return false for different type", () => {
			const category = new VideoCategory("20");
			expect(category.equals("20" as any)).toBe(false);
		});
	});
});
