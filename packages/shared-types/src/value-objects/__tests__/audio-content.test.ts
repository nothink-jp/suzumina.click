import { describe, expect, it } from "vitest";
import { AudioContent, ButtonCategory, ButtonTags, ButtonText } from "../audio-content";

describe("ButtonText", () => {
	describe("constructor", () => {
		it("should create valid button text", () => {
			const text = new ButtonText("Hello World");
			expect(text.toString()).toBe("Hello World");
		});

		it("should trim whitespace", () => {
			const text = new ButtonText("  Hello World  ");
			expect(text.toString()).toBe("Hello World");
		});

		it("should throw error for empty text", () => {
			expect(() => new ButtonText("")).toThrow("Button text cannot be empty");
			expect(() => new ButtonText("   ")).toThrow("Button text cannot be empty");
		});

		it("should throw error for text exceeding 200 characters", () => {
			const longText = "a".repeat(201);
			expect(() => new ButtonText(longText)).toThrow("Button text cannot exceed 200 characters");
		});
	});

	describe("toDisplayString", () => {
		it("should return full text if under max length", () => {
			const text = new ButtonText("Short text");
			expect(text.toDisplayString(20)).toBe("Short text");
		});

		it("should truncate long text", () => {
			const text = new ButtonText("This is a very long button text that needs truncation");
			expect(text.toDisplayString(20)).toBe("This is a very long ...");
		});

		it("should use default max length of 50", () => {
			const longText = "A".repeat(60);
			const text = new ButtonText(longText);
			expect(text.toDisplayString()).toBe("A".repeat(50) + "...");
		});
	});

	describe("toSearchableText", () => {
		it("should convert to lowercase", () => {
			const text = new ButtonText("Hello WORLD");
			expect(text.toSearchableText()).toBe("hello world");
		});

		it("should normalize unicode characters", () => {
			const text = new ButtonText("ｈｅｌｌｏ　ｗｏｒｌｄ");
			expect(text.toSearchableText()).toBe("hello world");
		});

		it("should normalize whitespace", () => {
			const text = new ButtonText("hello　　world    test");
			expect(text.toSearchableText()).toBe("hello world test");
		});
	});

	describe("length", () => {
		it("should return text length", () => {
			const text = new ButtonText("Hello");
			expect(text.length()).toBe(5);
		});
	});
});

describe("ButtonCategory", () => {
	describe("constructor", () => {
		it("should create valid categories", () => {
			expect(() => new ButtonCategory("greeting")).not.toThrow();
			expect(() => new ButtonCategory("reaction")).not.toThrow();
			expect(() => new ButtonCategory("emotion")).not.toThrow();
			expect(() => new ButtonCategory("action")).not.toThrow();
			expect(() => new ButtonCategory("sound")).not.toThrow();
			expect(() => new ButtonCategory("other")).not.toThrow();
		});

		it("should throw error for invalid category", () => {
			expect(() => new ButtonCategory("invalid")).toThrow("Invalid category: invalid");
		});
	});

	describe("static constants", () => {
		it("should provide category constants", () => {
			expect(ButtonCategory.GREETING).toBe("greeting");
			expect(ButtonCategory.REACTION).toBe("reaction");
			expect(ButtonCategory.EMOTION).toBe("emotion");
			expect(ButtonCategory.ACTION).toBe("action");
			expect(ButtonCategory.SOUND).toBe("sound");
			expect(ButtonCategory.OTHER).toBe("other");
		});
	});

	describe("toDisplayName", () => {
		it("should return Japanese display names", () => {
			expect(new ButtonCategory("greeting").toDisplayName()).toBe("挨拶");
			expect(new ButtonCategory("reaction").toDisplayName()).toBe("リアクション");
			expect(new ButtonCategory("emotion").toDisplayName()).toBe("感情");
			expect(new ButtonCategory("action").toDisplayName()).toBe("アクション");
			expect(new ButtonCategory("sound").toDisplayName()).toBe("効果音");
			expect(new ButtonCategory("other").toDisplayName()).toBe("その他");
		});
	});

	describe("toEmoji", () => {
		it("should return category emojis", () => {
			expect(new ButtonCategory("greeting").toEmoji()).toBe("👋");
			expect(new ButtonCategory("reaction").toEmoji()).toBe("💬");
			expect(new ButtonCategory("emotion").toEmoji()).toBe("😊");
			expect(new ButtonCategory("action").toEmoji()).toBe("🎬");
			expect(new ButtonCategory("sound").toEmoji()).toBe("🔊");
			expect(new ButtonCategory("other").toEmoji()).toBe("📌");
		});
	});

	describe("getAllCategories", () => {
		it("should return all valid categories", () => {
			const categories = ButtonCategory.getAllCategories();
			expect(categories).toHaveLength(6);
			expect(categories.map((c) => c.toString())).toEqual([
				"greeting",
				"reaction",
				"emotion",
				"action",
				"sound",
				"other",
			]);
		});
	});
});

describe("ButtonTags", () => {
	describe("constructor", () => {
		it("should create empty tags", () => {
			const tags = new ButtonTags();
			expect(tags.size()).toBe(0);
			expect(tags.toArray()).toEqual([]);
		});

		it("should normalize and deduplicate tags", () => {
			const tags = new ButtonTags(["Tag1", " TAG1 ", "tag2", "TAG2"]);
			expect(tags.size()).toBe(2);
			expect(tags.toArray()).toEqual(["tag1", "tag2"]);
		});

		it("should filter empty tags", () => {
			const tags = new ButtonTags(["tag1", "", "  ", "tag2"]);
			expect(tags.toArray()).toEqual(["tag1", "tag2"]);
		});

		it("should throw error for more than 10 tags", () => {
			const manyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
			expect(() => new ButtonTags(manyTags)).toThrow("Cannot have more than 10 tags");
		});

		it("should filter tags longer than 30 characters", () => {
			const longTag = "a".repeat(31);
			const tags = new ButtonTags(["valid", longTag]);
			expect(tags.toArray()).toEqual(["valid"]);
		});
	});

	describe("has", () => {
		it("should check tag existence case-insensitively", () => {
			const tags = new ButtonTags(["tag1", "TAG2"]);
			expect(tags.has("tag1")).toBe(true);
			expect(tags.has("TAG1")).toBe(true);
			expect(tags.has("tag2")).toBe(true);
			expect(tags.has("TAG2")).toBe(true);
			expect(tags.has("tag3")).toBe(false);
		});
	});

	describe("add", () => {
		it("should add new tag", () => {
			const tags = new ButtonTags(["tag1"]);
			const newTags = tags.add("tag2");

			expect(tags.toArray()).toEqual(["tag1"]); // Original unchanged
			expect(newTags.toArray()).toEqual(["tag1", "tag2"]);
		});

		it("should not duplicate existing tags", () => {
			const tags = new ButtonTags(["tag1"]);
			const newTags = tags.add("TAG1");

			expect(newTags.toArray()).toEqual(["tag1"]);
		});

		it("should not add empty tags", () => {
			const tags = new ButtonTags(["tag1"]);
			const newTags = tags.add("  ");

			expect(newTags.toArray()).toEqual(["tag1"]);
		});
	});

	describe("remove", () => {
		it("should remove tag", () => {
			const tags = new ButtonTags(["tag1", "tag2", "tag3"]);
			const newTags = tags.remove("tag2");

			expect(tags.toArray()).toEqual(["tag1", "tag2", "tag3"]); // Original unchanged
			expect(newTags.toArray()).toEqual(["tag1", "tag3"]);
		});

		it("should remove tag case-insensitively", () => {
			const tags = new ButtonTags(["tag1", "tag2"]);
			const newTags = tags.remove("TAG2");

			expect(newTags.toArray()).toEqual(["tag1"]);
		});
	});

	describe("toSearchableText", () => {
		it("should join tags with spaces", () => {
			const tags = new ButtonTags(["tag1", "tag2", "tag3"]);
			expect(tags.toSearchableText()).toBe("tag1 tag2 tag3");
		});

		it("should return empty string for no tags", () => {
			const tags = new ButtonTags();
			expect(tags.toSearchableText()).toBe("");
		});
	});

	describe("validation", () => {
		it("should validate tag count", () => {
			const tags = new ButtonTags(["tag1", "tag2"]);
			expect(tags.isValid()).toBe(true);
			expect(tags.getValidationErrors()).toEqual([]);
		});
	});

	describe("equals", () => {
		it("should return true for same tags", () => {
			const tags1 = new ButtonTags(["tag1", "tag2"]);
			const tags2 = new ButtonTags(["tag2", "tag1"]); // Order doesn't matter
			expect(tags1.equals(tags2)).toBe(true);
		});

		it("should return false for different tags", () => {
			const tags1 = new ButtonTags(["tag1", "tag2"]);
			const tags2 = new ButtonTags(["tag1", "tag3"]);
			expect(tags1.equals(tags2)).toBe(false);
		});

		it("should return false for different tag counts", () => {
			const tags1 = new ButtonTags(["tag1", "tag2"]);
			const tags2 = new ButtonTags(["tag1"]);
			expect(tags1.equals(tags2)).toBe(false);
		});
	});
});

describe("AudioContent", () => {
	const createSampleContent = (overrides?: {
		text?: string;
		category?: string;
		tags?: string[];
		language?: string;
	}) => {
		const defaults = {
			text: "Sample Button Text",
			tags: [],
			language: "ja",
		};
		const params = { ...defaults, ...overrides };

		return new AudioContent(
			new ButtonText(params.text),
			params.category ? new ButtonCategory(params.category) : undefined,
			new ButtonTags(params.tags),
			params.language,
		);
	};

	describe("hasCategory", () => {
		it("should detect category presence", () => {
			const content1 = createSampleContent({ category: "greeting" });
			expect(content1.hasCategory()).toBe(true);

			const content2 = createSampleContent();
			expect(content2.hasCategory()).toBe(false);
		});
	});

	describe("hasTag", () => {
		it("should check tag existence", () => {
			const content = createSampleContent({ tags: ["funny", "cute"] });
			expect(content.hasTag("funny")).toBe(true);
			expect(content.hasTag("FUNNY")).toBe(true); // Case insensitive
			expect(content.hasTag("serious")).toBe(false);
		});
	});

	describe("getDisplayText", () => {
		it("should return truncated text", () => {
			const content = createSampleContent({
				text: "This is a very long button text that needs to be truncated for display",
			});
			expect(content.getDisplayText(20)).toBe("This is a very long ...");
		});
	});

	describe("getSearchableText", () => {
		it("should combine text and tags", () => {
			const content = createSampleContent({
				text: "Hello World",
				tags: ["greeting", "friendly"],
			});
			expect(content.getSearchableText()).toBe("hello world greeting friendly");
		});

		it("should handle no tags", () => {
			const content = createSampleContent({ text: "Hello World" });
			expect(content.getSearchableText()).toBe("hello world");
		});
	});

	describe("updateCategory", () => {
		it("should update category", () => {
			const content = createSampleContent();
			const updated = content.updateCategory(new ButtonCategory("reaction"));

			expect(content.hasCategory()).toBe(false); // Original unchanged
			expect(updated.hasCategory()).toBe(true);
			expect(updated.category?.toString()).toBe("reaction");
		});

		it("should remove category", () => {
			const content = createSampleContent({ category: "greeting" });
			const updated = content.updateCategory(undefined);

			expect(content.hasCategory()).toBe(true); // Original unchanged
			expect(updated.hasCategory()).toBe(false);
		});
	});

	describe("tag management", () => {
		it("should add tag", () => {
			const content = createSampleContent({ tags: ["tag1"] });
			const updated = content.addTag("tag2");

			expect(content.tags.toArray()).toEqual(["tag1"]); // Original unchanged
			expect(updated.tags.toArray()).toEqual(["tag1", "tag2"]);
		});

		it("should remove tag", () => {
			const content = createSampleContent({ tags: ["tag1", "tag2"] });
			const updated = content.removeTag("tag1");

			expect(content.tags.toArray()).toEqual(["tag1", "tag2"]); // Original unchanged
			expect(updated.tags.toArray()).toEqual(["tag2"]);
		});
	});

	describe("validation", () => {
		it("should be valid for correct data", () => {
			const content = createSampleContent({
				category: "greeting",
				tags: ["hello", "morning"],
				language: "ja",
			});
			expect(content.isValid()).toBe(true);
			expect(content.getValidationErrors()).toEqual([]);
		});

		it("should validate language code", () => {
			const content1 = createSampleContent({ language: "en" });
			expect(content1.isValid()).toBe(true);

			const content2 = createSampleContent({ language: "en-US" });
			expect(content2.isValid()).toBe(true);

			const content3 = createSampleContent({ language: "invalid" });
			expect(content3.isValid()).toBe(false);
			expect(content3.getValidationErrors()).toContain("Invalid language code format");
		});
	});

	describe("toPlainObject", () => {
		it("should convert to plain object", () => {
			const content = createSampleContent({
				text: "Hello",
				category: "greeting",
				tags: ["morning", "friendly"],
				language: "ja",
			});

			expect(content.toPlainObject()).toEqual({
				text: "Hello",
				category: "greeting",
				tags: ["morning", "friendly"],
				language: "ja",
			});
		});

		it("should handle optional fields", () => {
			const content = createSampleContent();
			const plain = content.toPlainObject();

			expect(plain.category).toBeUndefined();
			expect(plain.tags).toEqual([]);
		});
	});

	describe("equals", () => {
		it("should return true for identical content", () => {
			const content1 = createSampleContent({ category: "greeting", tags: ["hello"] });
			const content2 = createSampleContent({ category: "greeting", tags: ["hello"] });
			expect(content1.equals(content2)).toBe(true);
		});

		it("should return false for different text", () => {
			const content1 = createSampleContent({ text: "Hello" });
			const content2 = createSampleContent({ text: "Hi" });
			expect(content1.equals(content2)).toBe(false);
		});

		it("should handle optional category correctly", () => {
			const content1 = createSampleContent({ category: "greeting" });
			const content2 = createSampleContent();
			expect(content1.equals(content2)).toBe(false);
		});

		it("should return false for different languages", () => {
			const content1 = createSampleContent({ language: "ja" });
			const content2 = createSampleContent({ language: "en" });
			expect(content1.equals(content2)).toBe(false);
		});
	});
});
