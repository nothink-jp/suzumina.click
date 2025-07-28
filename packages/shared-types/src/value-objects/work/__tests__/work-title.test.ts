import { describe, expect, it } from "vitest";
import { WorkTitle } from "../work-title";

describe("WorkTitle", () => {
	describe("constructor", () => {
		it("should create a valid work title", () => {
			const title = new WorkTitle("Test Title", "T*** T****", "てすとたいとる", "Test Alt");
			expect(title.toString()).toBe("Test Title");
			expect(title.getMasked()).toBe("T*** T****");
			expect(title.getKana()).toBe("てすとたいとる");
			expect(title.getAltName()).toBe("Test Alt");
		});

		it("should create title with minimal parameters", () => {
			const title = new WorkTitle("Test Title");
			expect(title.toString()).toBe("Test Title");
			expect(title.getMasked()).toBe("Test Title");
			expect(title.getKana()).toBeUndefined();
			expect(title.getAltName()).toBeUndefined();
		});

		it("should throw error for empty title", () => {
			expect(() => new WorkTitle("")).toThrow("Work title cannot be empty");
			expect(() => new WorkTitle("   ")).toThrow("Work title cannot be empty");
		});
	});

	describe("getMasked", () => {
		it("should return masked title if available", () => {
			const title = new WorkTitle("Test Title", "T*** T****");
			expect(title.getMasked()).toBe("T*** T****");
		});

		it("should return original title if no mask", () => {
			const title = new WorkTitle("Test Title");
			expect(title.getMasked()).toBe("Test Title");
		});
	});

	describe("toDisplayString", () => {
		it("should prefer alt name if available", () => {
			const title = new WorkTitle("Original", undefined, undefined, "Alternative");
			expect(title.toDisplayString()).toBe("Alternative");
		});

		it("should fallback to original if no alt name", () => {
			const title = new WorkTitle("Original");
			expect(title.toDisplayString()).toBe("Original");
		});
	});

	describe("contains", () => {
		it("should find keyword in main title", () => {
			const title = new WorkTitle("The Great Adventure");
			expect(title.contains("great")).toBe(true);
			expect(title.contains("GREAT")).toBe(true);
			expect(title.contains("adventure")).toBe(true);
		});

		it("should find keyword in alt name", () => {
			const title = new WorkTitle("Original", undefined, undefined, "Alternative Name");
			expect(title.contains("alternative")).toBe(true);
			expect(title.contains("name")).toBe(true);
		});

		it("should find keyword in kana", () => {
			const title = new WorkTitle("Title", undefined, "たいとる");
			expect(title.contains("たいとる")).toBe(true);
		});

		it("should return false for non-matching keyword", () => {
			const title = new WorkTitle("Title", undefined, "たいとる", "Alt");
			expect(title.contains("missing")).toBe(false);
		});

		it("should handle case insensitive search", () => {
			const title = new WorkTitle("Title");
			expect(title.contains("TITLE")).toBe(true);
			expect(title.contains("title")).toBe(true);
			expect(title.contains("TiTlE")).toBe(true);
		});
	});

	describe("getSearchableText", () => {
		it("should combine all title variations", () => {
			const title = new WorkTitle("Main", undefined, "かな", "Alt");
			expect(title.getSearchableText()).toBe("Main Alt かな");
		});

		it("should handle missing variations", () => {
			const title = new WorkTitle("Main");
			expect(title.getSearchableText()).toBe("Main");
		});

		it("should include only available variations", () => {
			const title = new WorkTitle("Main", undefined, undefined, "Alt");
			expect(title.getSearchableText()).toBe("Main Alt");
		});
	});

	describe("toJSON", () => {
		it("should include all properties", () => {
			const title = new WorkTitle("Main", "M***", "まいん", "Alternative");
			expect(title.toJSON()).toEqual({
				value: "Main",
				masked: "M***",
				kana: "まいん",
				altName: "Alternative",
			});
		});

		it("should exclude undefined properties", () => {
			const title = new WorkTitle("Main");
			expect(title.toJSON()).toEqual({
				value: "Main",
			});
		});

		it("should include only defined properties", () => {
			const title = new WorkTitle("Main", undefined, "まいん");
			expect(title.toJSON()).toEqual({
				value: "Main",
				kana: "まいん",
			});
		});
	});

	describe("equals", () => {
		it("should return true for equal titles", () => {
			const title1 = new WorkTitle("Main", "M***", "まいん", "Alt");
			const title2 = new WorkTitle("Main", "M***", "まいん", "Alt");
			expect(title1.equals(title2)).toBe(true);
		});

		it("should return false for different values", () => {
			const title1 = new WorkTitle("Main1");
			const title2 = new WorkTitle("Main2");
			expect(title1.equals(title2)).toBe(false);
		});

		it("should return false for different masked", () => {
			const title1 = new WorkTitle("Main", "M***");
			const title2 = new WorkTitle("Main", "M**");
			expect(title1.equals(title2)).toBe(false);
		});

		it("should return false for different kana", () => {
			const title1 = new WorkTitle("Main", undefined, "まいん");
			const title2 = new WorkTitle("Main", undefined, "めいん");
			expect(title1.equals(title2)).toBe(false);
		});

		it("should return false for different alt name", () => {
			const title1 = new WorkTitle("Main", undefined, undefined, "Alt1");
			const title2 = new WorkTitle("Main", undefined, undefined, "Alt2");
			expect(title1.equals(title2)).toBe(false);
		});

		it("should handle undefined values", () => {
			const title1 = new WorkTitle("Main");
			const title2 = new WorkTitle("Main");
			expect(title1.equals(title2)).toBe(true);
		});

		it("should return false for non-WorkTitle", () => {
			const title = new WorkTitle("Main");
			expect(title.equals("Main" as any)).toBe(false);
			expect(title.equals(null as any)).toBe(false);
		});
	});

	describe("withAltName", () => {
		it("should create new title with alt name", () => {
			const original = new WorkTitle("Main", "M***", "まいん");
			const updated = original.withAltName("New Alt");

			expect(updated.toString()).toBe("Main");
			expect(updated.getMasked()).toBe("M***");
			expect(updated.getKana()).toBe("まいん");
			expect(updated.getAltName()).toBe("New Alt");
			expect(updated).not.toBe(original);
		});

		it("should update existing alt name", () => {
			const original = new WorkTitle("Main", undefined, undefined, "Old Alt");
			const updated = original.withAltName("New Alt");

			expect(updated.getAltName()).toBe("New Alt");
			expect(original.getAltName()).toBe("Old Alt");
		});
	});

	describe("create", () => {
		it("should create title with all parameters", () => {
			const title = WorkTitle.create("Main", "M***", "まいん", "Alt");
			expect(title.toString()).toBe("Main");
			expect(title.getMasked()).toBe("M***");
			expect(title.getKana()).toBe("まいん");
			expect(title.getAltName()).toBe("Alt");
		});

		it("should create title with minimal parameters", () => {
			const title = WorkTitle.create("Main");
			expect(title.toString()).toBe("Main");
			expect(title.getMasked()).toBe("Main");
			expect(title.getKana()).toBeUndefined();
			expect(title.getAltName()).toBeUndefined();
		});
	});
});
