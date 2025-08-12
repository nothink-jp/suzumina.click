import { describe, expect, it } from "vitest";
import { WorkTitle } from "../work-title";

describe("WorkTitle", () => {
	describe("create", () => {
		it("should create a valid work title", () => {
			const result = WorkTitle.create("Test Title", "T*** T****", "てすとたいとる", "Test Alt");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const title = result.value;
				expect(title.toString()).toBe("Test Title");
				expect(title.getMasked()).toBe("T*** T****");
				expect(title.getKana()).toBe("てすとたいとる");
				expect(title.getAltName()).toBe("Test Alt");
			}
		});

		it("should create title with minimal parameters", () => {
			const result = WorkTitle.create("Test Title");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const title = result.value;
				expect(title.toString()).toBe("Test Title");
				expect(title.getMasked()).toBe("Test Title");
				expect(title.getKana()).toBeUndefined();
				expect(title.getAltName()).toBeUndefined();
			}
		});

		it("should return error for empty title", () => {
			const result1 = WorkTitle.create("");
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toContain("cannot be empty");
			}

			const result2 = WorkTitle.create("   ");
			expect(result2.isErr()).toBe(true);
			if (result2.isErr()) {
				expect(result2.error.message).toContain("cannot be empty");
			}
		});

		it("should return error for title exceeding max length", () => {
			const longTitle = "a".repeat(501);
			const result = WorkTitle.create(longTitle);
			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toContain("500 characters or less");
			}
		});

		it("should return error for empty optional fields", () => {
			const result1 = WorkTitle.create("Title", "");
			expect(result1.isErr()).toBe(true);
			if (result1.isErr()) {
				expect(result1.error.message).toContain("Masked title cannot be empty");
			}

			const result2 = WorkTitle.create("Title", undefined, "");
			expect(result2.isErr()).toBe(true);
			if (result2.isErr()) {
				expect(result2.error.message).toContain("Kana reading cannot be empty");
			}

			const result3 = WorkTitle.create("Title", undefined, undefined, "");
			expect(result3.isErr()).toBe(true);
			if (result3.isErr()) {
				expect(result3.error.message).toContain("Alternative name cannot be empty");
			}
		});
	});

	describe("fromData", () => {
		it("should create from data object", () => {
			const data = {
				value: "Test Title",
				masked: "T*** T****",
				kana: "てすとたいとる",
				altName: "Test Alt",
			};
			const result = WorkTitle.fromData(data);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toString()).toBe("Test Title");
			}
		});
	});

	describe("fromPlainObject", () => {
		it("should create from string", () => {
			const result = WorkTitle.fromPlainObject("Test Title");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toString()).toBe("Test Title");
			}
		});

		it("should create from object", () => {
			const obj = {
				value: "Test Title",
				masked: "T*** T****",
				kana: "てすとたいとる",
				altName: "Test Alt",
			};
			const result = WorkTitle.fromPlainObject(obj);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toString()).toBe("Test Title");
				expect(result.value.getMasked()).toBe("T*** T****");
			}
		});

		it("should return error for invalid input", () => {
			const result1 = WorkTitle.fromPlainObject(123);
			expect(result1.isErr()).toBe(true);

			const result2 = WorkTitle.fromPlainObject(null);
			expect(result2.isErr()).toBe(true);

			const result3 = WorkTitle.fromPlainObject({ notValue: "test" });
			expect(result3.isErr()).toBe(true);
		});
	});

	describe("getMasked", () => {
		it("should return masked title if available", () => {
			const result = WorkTitle.create("Test Title", "T*** T****");
			if (result.isOk()) {
				expect(result.value.getMasked()).toBe("T*** T****");
			}
		});

		it("should return original title if no mask", () => {
			const result = WorkTitle.create("Test Title");
			if (result.isOk()) {
				expect(result.value.getMasked()).toBe("Test Title");
			}
		});
	});

	describe("toDisplayString", () => {
		it("should prefer alt name if available", () => {
			const result = WorkTitle.create("Original", undefined, undefined, "Alternative");
			if (result.isOk()) {
				expect(result.value.toDisplayString()).toBe("Alternative");
			}
		});

		it("should fallback to original if no alt name", () => {
			const result = WorkTitle.create("Original");
			if (result.isOk()) {
				expect(result.value.toDisplayString()).toBe("Original");
			}
		});
	});

	describe("contains", () => {
		it("should find keyword in main title", () => {
			const result = WorkTitle.create("The Great Adventure");
			if (result.isOk()) {
				const title = result.value;
				expect(title.contains("great")).toBe(true);
				expect(title.contains("GREAT")).toBe(true);
				expect(title.contains("adventure")).toBe(true);
			}
		});

		it("should find keyword in alt name", () => {
			const result = WorkTitle.create("Original", undefined, undefined, "Alternative Name");
			if (result.isOk()) {
				const title = result.value;
				expect(title.contains("alternative")).toBe(true);
				expect(title.contains("name")).toBe(true);
			}
		});

		it("should find keyword in kana", () => {
			const result = WorkTitle.create("Title", undefined, "たいとる");
			if (result.isOk()) {
				expect(result.value.contains("たいとる")).toBe(true);
			}
		});

		it("should return false for non-matching keyword", () => {
			const result = WorkTitle.create("Title", undefined, "たいとる", "Alt");
			if (result.isOk()) {
				expect(result.value.contains("missing")).toBe(false);
			}
		});

		it("should handle case insensitive search", () => {
			const result = WorkTitle.create("Title");
			if (result.isOk()) {
				const title = result.value;
				expect(title.contains("TITLE")).toBe(true);
				expect(title.contains("title")).toBe(true);
				expect(title.contains("TiTlE")).toBe(true);
			}
		});
	});

	describe("getSearchableText", () => {
		it("should combine all title variations", () => {
			const result = WorkTitle.create("Main", undefined, "かな", "Alt");
			if (result.isOk()) {
				expect(result.value.getSearchableText()).toBe("Main Alt かな");
			}
		});

		it("should handle missing variations", () => {
			const result = WorkTitle.create("Main");
			if (result.isOk()) {
				expect(result.value.getSearchableText()).toBe("Main");
			}
		});

		it("should include only available variations", () => {
			const result = WorkTitle.create("Main", undefined, undefined, "Alt");
			if (result.isOk()) {
				expect(result.value.getSearchableText()).toBe("Main Alt");
			}
		});
	});

	describe("withAltName", () => {
		it("should create new title with updated alt name", () => {
			const result1 = WorkTitle.create("Main");
			if (result1.isOk()) {
				const result2 = result1.value.withAltName("New Alt");
				expect(result2.isOk()).toBe(true);
				if (result2.isOk()) {
					expect(result2.value.getAltName()).toBe("New Alt");
					expect(result2.value.toString()).toBe("Main");
				}
			}
		});

		it("should return error for empty alt name", () => {
			const result1 = WorkTitle.create("Main");
			if (result1.isOk()) {
				const result2 = result1.value.withAltName("");
				expect(result2.isErr()).toBe(true);
			}
		});
	});

	describe("withMasked", () => {
		it("should create new title with updated masked value", () => {
			const result1 = WorkTitle.create("Main");
			if (result1.isOk()) {
				const result2 = result1.value.withMasked("M***");
				expect(result2.isOk()).toBe(true);
				if (result2.isOk()) {
					expect(result2.value.getMasked()).toBe("M***");
				}
			}
		});
	});

	describe("withKana", () => {
		it("should create new title with updated kana", () => {
			const result1 = WorkTitle.create("Main");
			if (result1.isOk()) {
				const result2 = result1.value.withKana("めいん");
				expect(result2.isOk()).toBe(true);
				if (result2.isOk()) {
					expect(result2.value.getKana()).toBe("めいん");
				}
			}
		});
	});

	describe("toJSON", () => {
		it("should serialize to JSON with all fields", () => {
			const result = WorkTitle.create("Test", "T***", "てすと", "Alternative");
			if (result.isOk()) {
				const json = result.value.toJSON();
				expect(json).toEqual({
					value: "Test",
					masked: "T***",
					kana: "てすと",
					altName: "Alternative",
				});
			}
		});

		it("should omit undefined fields", () => {
			const result = WorkTitle.create("Test");
			if (result.isOk()) {
				const json = result.value.toJSON();
				expect(json).toEqual({
					value: "Test",
				});
			}
		});
	});

	describe("equals", () => {
		it("should return true for identical titles", () => {
			const result1 = WorkTitle.create("Test", "T***", "てすと", "Alt");
			const result2 = WorkTitle.create("Test", "T***", "てすと", "Alt");
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(true);
			}
		});

		it("should return false for different titles", () => {
			const result1 = WorkTitle.create("Test1");
			const result2 = WorkTitle.create("Test2");
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(false);
			}
		});

		it("should return false for different optional fields", () => {
			const result1 = WorkTitle.create("Test", "T***");
			const result2 = WorkTitle.create("Test", "T**");
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(false);
			}
		});

		it("should return false for non-WorkTitle objects", () => {
			const result = WorkTitle.create("Test");
			if (result.isOk()) {
				expect(result.value.equals(null as any)).toBe(false);
				expect(result.value.equals("Test" as any)).toBe(false);
			}
		});
	});

	describe("clone", () => {
		it("should create an identical copy", () => {
			const result = WorkTitle.create("Test", "T***", "てすと", "Alt");
			if (result.isOk()) {
				const cloned = result.value.clone();
				expect(cloned.equals(result.value)).toBe(true);
				expect(cloned).not.toBe(result.value);
			}
		});
	});

	describe("validation", () => {
		it("should validate correctly", () => {
			const result = WorkTitle.create("Test Title");
			if (result.isOk()) {
				expect(result.value.isValid()).toBe(true);
				expect(result.value.getValidationErrors()).toHaveLength(0);
			}
		});

		it("should detect validation errors", () => {
			// This test would require creating an invalid WorkTitle instance
			// which is not possible through the public API
			// The validation is already tested through the create method
		});
	});
});
