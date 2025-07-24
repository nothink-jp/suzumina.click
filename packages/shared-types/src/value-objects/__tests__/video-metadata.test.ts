import { describe, expect, it } from "vitest";
import { VideoDescription, VideoDuration, VideoMetadata, VideoTitle } from "../video-metadata";

describe("VideoDuration", () => {
	describe("constructor", () => {
		it("should create valid duration", () => {
			const duration = new VideoDuration("PT1H2M3S");
			expect(duration.toString()).toBe("PT1H2M3S");
		});

		it("should throw for null value", () => {
			expect(() => new VideoDuration(null as any)).toThrow(
				"duration must not be null or undefined",
			);
		});
	});

	describe("toSeconds", () => {
		it("should convert full duration to seconds", () => {
			const duration = new VideoDuration("PT1H2M3S");
			expect(duration.toSeconds()).toBe(3723); // 1*3600 + 2*60 + 3
		});

		it("should handle hours only", () => {
			const duration = new VideoDuration("PT2H");
			expect(duration.toSeconds()).toBe(7200);
		});

		it("should handle minutes only", () => {
			const duration = new VideoDuration("PT30M");
			expect(duration.toSeconds()).toBe(1800);
		});

		it("should handle seconds only", () => {
			const duration = new VideoDuration("PT45S");
			expect(duration.toSeconds()).toBe(45);
		});

		it("should handle invalid format", () => {
			const duration = new VideoDuration("invalid");
			expect(duration.toSeconds()).toBe(0);
		});
	});

	describe("toHumanReadable", () => {
		it("should format full duration", () => {
			const duration = new VideoDuration("PT1H2M3S");
			expect(duration.toHumanReadable()).toBe("1時間2分3秒");
		});

		it("should format hours and minutes", () => {
			const duration = new VideoDuration("PT2H30M");
			expect(duration.toHumanReadable()).toBe("2時間30分");
		});

		it("should format minutes and seconds", () => {
			const duration = new VideoDuration("PT5M30S");
			expect(duration.toHumanReadable()).toBe("5分30秒");
		});

		it("should format seconds only", () => {
			const duration = new VideoDuration("PT45S");
			expect(duration.toHumanReadable()).toBe("45秒");
		});

		it("should handle zero duration", () => {
			const duration = new VideoDuration("PT0S");
			expect(duration.toHumanReadable()).toBe("0秒");
		});
	});

	describe("validation", () => {
		it("should validate correct format", () => {
			const duration = new VideoDuration("PT1H30M");
			expect(duration.isValid()).toBe(true);
			expect(duration.getValidationErrors()).toHaveLength(0);
		});

		it("should invalidate incorrect format", () => {
			const duration = new VideoDuration("1:30:00");
			expect(duration.isValid()).toBe(false);
			expect(duration.getValidationErrors()).toContain("Invalid ISO 8601 duration format");
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new VideoDuration("PT1H");
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.toString()).toBe(original.toString());
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("VideoTitle", () => {
	describe("constructor", () => {
		it("should trim whitespace", () => {
			const title = new VideoTitle("  Test Video  ");
			expect(title.toString()).toBe("Test Video");
		});

		it("should throw for empty string", () => {
			expect(() => new VideoTitle("")).toThrow("title must not be empty");
		});

		it("should throw for whitespace only", () => {
			expect(() => new VideoTitle("   ")).toThrow("title must not be empty");
		});
	});

	describe("truncate", () => {
		it("should not truncate short titles", () => {
			const title = new VideoTitle("Short");
			expect(title.truncate(10)).toBe("Short");
		});

		it("should truncate long titles", () => {
			const title = new VideoTitle("This is a very long video title");
			expect(title.truncate(20)).toBe("This is a very lo...");
		});

		it("should handle exact length", () => {
			const title = new VideoTitle("Exact");
			expect(title.truncate(5)).toBe("Exact");
		});
	});

	describe("validation", () => {
		it("should validate normal title", () => {
			const title = new VideoTitle("Normal Title");
			expect(title.isValid()).toBe(true);
			expect(title.getValidationErrors()).toHaveLength(0);
		});

		it("should invalidate very long title", () => {
			const longTitle = "a".repeat(101);
			const title = new VideoTitle(longTitle);
			expect(title.isValid()).toBe(false);
			expect(title.getValidationErrors()).toContain("Title cannot exceed 100 characters");
		});
	});

	describe("clone and equals", () => {
		it("should create equal clones", () => {
			const original = new VideoTitle("Test Title");
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);
		});

		it("should not equal different titles", () => {
			const title1 = new VideoTitle("Title 1");
			const title2 = new VideoTitle("Title 2");

			expect(title1.equals(title2)).toBe(false);
		});
	});
});

describe("VideoDescription", () => {
	const sampleDescription = `This is a sample video description.
It has multiple lines.
Visit https://example.com for more info.
Check out https://youtube.com/channel/123`;

	describe("constructor", () => {
		it("should accept any string including empty", () => {
			const desc1 = new VideoDescription("Test");
			const desc2 = new VideoDescription("");

			expect(desc1.toString()).toBe("Test");
			expect(desc2.toString()).toBe("");
		});

		it("should throw for null", () => {
			expect(() => new VideoDescription(null as any)).toThrow("description must not be null");
		});
	});

	describe("getFirstLines", () => {
		it("should return first N lines", () => {
			const desc = new VideoDescription(sampleDescription);
			const firstTwo = desc.getFirstLines(2);

			expect(firstTwo).toBe("This is a sample video description.\nIt has multiple lines.");
		});

		it("should handle fewer lines than requested", () => {
			const desc = new VideoDescription("Single line");
			expect(desc.getFirstLines(5)).toBe("Single line");
		});
	});

	describe("extractUrls", () => {
		it("should extract all URLs", () => {
			const desc = new VideoDescription(sampleDescription);
			const urls = desc.extractUrls();

			expect(urls).toHaveLength(2);
			expect(urls).toContain("https://example.com");
			expect(urls).toContain("https://youtube.com/channel/123");
		});

		it("should return empty array when no URLs", () => {
			const desc = new VideoDescription("No URLs here");
			expect(desc.extractUrls()).toHaveLength(0);
		});
	});

	describe("contains", () => {
		it("should find keyword case-insensitively", () => {
			const desc = new VideoDescription("This is a SAMPLE description");

			expect(desc.contains("sample")).toBe(true);
			expect(desc.contains("SAMPLE")).toBe(true);
			expect(desc.contains("Sample")).toBe(true);
		});

		it("should return false for missing keyword", () => {
			const desc = new VideoDescription("This is a description");
			expect(desc.contains("missing")).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new VideoDescription("Test description");
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.toString()).toBe(original.toString());
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("VideoMetadata", () => {
	const createSampleMetadata = () => {
		return new VideoMetadata(
			new VideoTitle("Sample Video"),
			new VideoDescription("Sample description"),
			new VideoDuration("PT10M30S"),
			"2d",
			"hd",
			true,
			false,
		);
	};

	describe("fromPlainObject", () => {
		it("should create from plain object with all fields", () => {
			const metadata = VideoMetadata.fromPlainObject({
				title: "Test Video",
				description: "Test description",
				duration: "PT5M",
				dimension: "3d",
				definition: "sd",
				caption: true,
				licensedContent: false,
			});

			expect(metadata.title.toString()).toBe("Test Video");
			expect(metadata.description.toString()).toBe("Test description");
			expect(metadata.duration?.toString()).toBe("PT5M");
			expect(metadata.dimension).toBe("3d");
			expect(metadata.definition).toBe("sd");
			expect(metadata.hasCaption).toBe(true);
			expect(metadata.isLicensedContent).toBe(false);
		});

		it("should handle missing optional fields", () => {
			const metadata = VideoMetadata.fromPlainObject({
				title: "Test Video",
				description: "Test description",
			});

			expect(metadata.duration).toBeUndefined();
			expect(metadata.dimension).toBe("2d"); // default
			expect(metadata.definition).toBe("hd"); // default
			expect(metadata.hasCaption).toBeUndefined();
			expect(metadata.isLicensedContent).toBeUndefined();
		});
	});

	describe("toPlainObject", () => {
		it("should convert to plain object", () => {
			const metadata = createSampleMetadata();
			const plain = metadata.toPlainObject();

			expect(plain).toEqual({
				title: "Sample Video",
				description: "Sample description",
				duration: "PT10M30S",
				dimension: "2d",
				definition: "hd",
				hasCaption: true,
				isLicensedContent: false,
			});
		});
	});

	describe("validation", () => {
		it("should validate valid metadata", () => {
			const metadata = createSampleMetadata();
			expect(metadata.isValid()).toBe(true);
			expect(metadata.getValidationErrors()).toHaveLength(0);
		});

		it("should report title errors", () => {
			const metadata = new VideoMetadata(
				new VideoTitle("a".repeat(101)), // too long
				new VideoDescription("Description"),
			);

			expect(metadata.isValid()).toBe(false);
			const errors = metadata.getValidationErrors();
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("Title:");
		});

		it("should report duration errors", () => {
			const metadata = new VideoMetadata(
				new VideoTitle("Title"),
				new VideoDescription("Description"),
				new VideoDuration("invalid"),
			);

			expect(metadata.isValid()).toBe(false);
			const errors = metadata.getValidationErrors();
			expect(errors.some((e) => e.includes("Duration:"))).toBe(true);
		});
	});

	describe("equals", () => {
		it("should equal identical metadata", () => {
			const metadata1 = createSampleMetadata();
			const metadata2 = createSampleMetadata();

			expect(metadata1.equals(metadata2)).toBe(true);
		});

		it("should not equal with different title", () => {
			const metadata1 = createSampleMetadata();
			const metadata2 = new VideoMetadata(
				new VideoTitle("Different Title"),
				metadata1.description,
				metadata1.duration,
				metadata1.dimension,
				metadata1.definition,
				metadata1.hasCaption,
				metadata1.isLicensedContent,
			);

			expect(metadata1.equals(metadata2)).toBe(false);
		});

		it("should not equal with different optional fields", () => {
			const metadata1 = createSampleMetadata();
			const metadata2 = new VideoMetadata(
				metadata1.title,
				metadata1.description,
				metadata1.duration,
				"3d", // different
				metadata1.definition,
				metadata1.hasCaption,
				metadata1.isLicensedContent,
			);

			expect(metadata1.equals(metadata2)).toBe(false);
		});

		it("should handle undefined duration correctly", () => {
			const metadata1 = new VideoMetadata(
				new VideoTitle("Title"),
				new VideoDescription("Description"),
				undefined,
			);
			const metadata2 = new VideoMetadata(
				new VideoTitle("Title"),
				new VideoDescription("Description"),
				undefined,
			);

			expect(metadata1.equals(metadata2)).toBe(true);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = createSampleMetadata();
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);

			// Verify deep clone
			expect(cloned.title).not.toBe(original.title);
			expect(cloned.description).not.toBe(original.description);
			expect(cloned.duration).not.toBe(original.duration);
		});
	});
});
