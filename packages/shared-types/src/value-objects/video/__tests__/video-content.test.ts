import { describe, expect, it } from "vitest";
import {
	ContentDetails,
	type PrivacyStatus,
	PublishedAt,
	type UploadStatus,
	VideoContent,
	VideoId,
} from "../video-content";

describe("VideoId", () => {
	describe("constructor", () => {
		it("should create valid video ID", () => {
			const id = new VideoId("dQw4w9WgXcQ");
			expect(id.toString()).toBe("dQw4w9WgXcQ");
		});

		it("should trim whitespace", () => {
			const id = new VideoId("  dQw4w9WgXcQ  ");
			expect(id.toString()).toBe("dQw4w9WgXcQ");
		});

		it("should throw for empty string", () => {
			expect(() => new VideoId("")).toThrow("videoId must not be empty");
		});
	});

	describe("toUrl", () => {
		it("should generate correct YouTube URL", () => {
			const id = new VideoId("dQw4w9WgXcQ");
			expect(id.toUrl()).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		});
	});

	describe("toEmbedUrl", () => {
		it("should generate correct embed URL", () => {
			const id = new VideoId("dQw4w9WgXcQ");
			expect(id.toEmbedUrl()).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
		});
	});

	describe("toThumbnailUrl", () => {
		it("should generate default quality thumbnail", () => {
			const id = new VideoId("dQw4w9WgXcQ");
			expect(id.toThumbnailUrl()).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
		});

		it("should generate maxres thumbnail", () => {
			const id = new VideoId("dQw4w9WgXcQ");
			expect(id.toThumbnailUrl("maxres")).toBe(
				"https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
			);
		});

		it("should generate medium quality thumbnail", () => {
			const id = new VideoId("dQw4w9WgXcQ");
			expect(id.toThumbnailUrl("medium")).toBe(
				"https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
			);
		});
	});

	describe("validation", () => {
		it("should validate 11-character ID", () => {
			const id = new VideoId("dQw4w9WgXcQ");
			expect(id.isValid()).toBe(true);
			expect(id.getValidationErrors()).toHaveLength(0);
		});

		it("should invalidate wrong length", () => {
			const id = new VideoId("abc123"); // 6 characters
			expect(id.isValid()).toBe(false);
			expect(id.getValidationErrors()).toContain("Video ID should be 11 characters");
		});

		it("should invalidate special characters", () => {
			const id = new VideoId("abc!@#$%^&*");
			expect(id.isValid()).toBe(false);
			expect(id.getValidationErrors()).toContain("Video ID contains invalid characters");
		});
	});

	describe("equals", () => {
		it("should equal same ID", () => {
			const id1 = new VideoId("dQw4w9WgXcQ");
			const id2 = new VideoId("dQw4w9WgXcQ");
			expect(id1.equals(id2)).toBe(true);
		});

		it("should not equal different IDs", () => {
			const id1 = new VideoId("dQw4w9WgXcQ");
			const id2 = new VideoId("oHg5SJYRHA0");
			expect(id1.equals(id2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new VideoId("dQw4w9WgXcQ");
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("PublishedAt", () => {
	describe("constructor", () => {
		it("should accept Date object", () => {
			const date = new Date("2024-01-01");
			const published = new PublishedAt(date);
			expect(published.toDate().getTime()).toBe(date.getTime());
		});

		it("should accept date string", () => {
			const published = new PublishedAt("2024-01-01T00:00:00Z");
			expect(published.toDate().getFullYear()).toBe(2024);
		});
	});

	describe("getAgeInDays", () => {
		it("should calculate age correctly", () => {
			const daysAgo = 10;
			const date = new Date();
			date.setDate(date.getDate() - daysAgo);
			const published = new PublishedAt(date);

			expect(published.getAgeInDays()).toBe(daysAgo);
		});

		it("should return 0 for today", () => {
			const published = new PublishedAt(new Date());
			expect(published.getAgeInDays()).toBe(0);
		});
	});

	describe("toRelativeTime", () => {
		it("should return '今日' for today", () => {
			const published = new PublishedAt(new Date());
			expect(published.toRelativeTime()).toBe("今日");
		});

		it("should return '昨日' for yesterday", () => {
			const date = new Date();
			date.setDate(date.getDate() - 1);
			const published = new PublishedAt(date);
			expect(published.toRelativeTime()).toBe("昨日");
		});

		it("should return days for less than a week", () => {
			const date = new Date();
			date.setDate(date.getDate() - 5);
			const published = new PublishedAt(date);
			expect(published.toRelativeTime()).toBe("5日前");
		});

		it("should return weeks for less than a month", () => {
			const date = new Date();
			date.setDate(date.getDate() - 14);
			const published = new PublishedAt(date);
			expect(published.toRelativeTime()).toBe("2週間前");
		});

		it("should return months for less than a year", () => {
			const date = new Date();
			date.setDate(date.getDate() - 60);
			const published = new PublishedAt(date);
			expect(published.toRelativeTime()).toBe("2ヶ月前");
		});

		it("should return years for old videos", () => {
			const date = new Date();
			date.setFullYear(date.getFullYear() - 2);
			const published = new PublishedAt(date);
			expect(published.toRelativeTime()).toBe("2年前");
		});
	});

	describe("toFormattedString", () => {
		it("should format with Japanese locale", () => {
			const published = new PublishedAt("2024-01-15T00:00:00Z");
			const formatted = published.toFormattedString("ja-JP");
			expect(formatted).toContain("2024");
			expect(formatted).toContain("1");
			expect(formatted).toContain("15");
		});
	});

	describe("equals", () => {
		it("should equal same date", () => {
			const date = new Date("2024-01-01");
			const published1 = new PublishedAt(date);
			const published2 = new PublishedAt(date);
			expect(published1.equals(published2)).toBe(true);
		});

		it("should not equal different dates", () => {
			const published1 = new PublishedAt("2024-01-01");
			const published2 = new PublishedAt("2024-01-02");
			expect(published1.equals(published2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new PublishedAt("2024-01-01");
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.toDate()).not.toBe(original.toDate());
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("ContentDetails", () => {
	describe("isHD", () => {
		it("should return true for HD", () => {
			const details = new ContentDetails("2d", "hd");
			expect(details.isHD()).toBe(true);
		});

		it("should return false for SD", () => {
			const details = new ContentDetails("2d", "sd");
			expect(details.isHD()).toBe(false);
		});

		it("should return false for undefined", () => {
			const details = new ContentDetails();
			expect(details.isHD()).toBe(false);
		});
	});

	describe("hasCaption", () => {
		it("should return true when caption is true", () => {
			const details = new ContentDetails("2d", "hd", true);
			expect(details.hasCaption()).toBe(true);
		});

		it("should return false when caption is false or undefined", () => {
			const details1 = new ContentDetails("2d", "hd", false);
			const details2 = new ContentDetails();
			expect(details1.hasCaption()).toBe(false);
			expect(details2.hasCaption()).toBe(false);
		});
	});

	describe("is360Video", () => {
		it("should return true for 360 videos", () => {
			const details = new ContentDetails("2d", "hd", false, false, "360");
			expect(details.is360Video()).toBe(true);
		});

		it("should return false for rectangular videos", () => {
			const details = new ContentDetails("2d", "hd", false, false, "rectangular");
			expect(details.is360Video()).toBe(false);
		});
	});

	describe("equals", () => {
		it("should equal identical details", () => {
			const details1 = new ContentDetails("2d", "hd", true, false, "rectangular");
			const details2 = new ContentDetails("2d", "hd", true, false, "rectangular");
			expect(details1.equals(details2)).toBe(true);
		});

		it("should not equal with different values", () => {
			const details1 = new ContentDetails("2d", "hd", true);
			const details2 = new ContentDetails("3d", "hd", true);
			expect(details1.equals(details2)).toBe(false);
		});

		it("should handle undefined values", () => {
			const details1 = new ContentDetails();
			const details2 = new ContentDetails();
			expect(details1.equals(details2)).toBe(true);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new ContentDetails("2d", "hd", true, false, "rectangular");
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("VideoContent", () => {
	const createSampleContent = () => {
		return new VideoContent(
			new VideoId("dQw4w9WgXcQ"),
			new PublishedAt("2024-01-01"),
			"public" as PrivacyStatus,
			"processed" as UploadStatus,
			new ContentDetails("2d", "hd", true, false, "rectangular"),
			'<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
			["music", "rickroll", "classic"],
		);
	};

	describe("fromPlainObject", () => {
		it("should create from plain object with all fields", () => {
			const content = VideoContent.fromPlainObject({
				videoId: "dQw4w9WgXcQ",
				publishedAt: "2024-01-01T00:00:00Z",
				privacyStatus: "public",
				uploadStatus: "processed",
				contentDetails: {
					dimension: "2d",
					definition: "hd",
					caption: true,
					licensedContent: false,
					projection: "rectangular",
				},
				embedHtml: "<iframe>...</iframe>",
				tags: ["tag1", "tag2"],
			});

			expect(content.videoId.toString()).toBe("dQw4w9WgXcQ");
			expect(content.privacyStatus).toBe("public");
			expect(content.uploadStatus).toBe("processed");
			expect(content.contentDetails?.isHD()).toBe(true);
			expect(content.tags).toEqual(["tag1", "tag2"]);
		});

		it("should handle missing optional fields", () => {
			const content = VideoContent.fromPlainObject({
				videoId: "dQw4w9WgXcQ",
				publishedAt: new Date(),
				privacyStatus: "public",
				uploadStatus: "processed",
			});

			expect(content.contentDetails).toBeUndefined();
			expect(content.embedHtml).toBeUndefined();
			expect(content.tags).toBeUndefined();
		});
	});

	describe("isPublic", () => {
		it("should return true for public videos", () => {
			const content = createSampleContent();
			expect(content.isPublic()).toBe(true);
		});

		it("should return false for private videos", () => {
			const content = new VideoContent(
				new VideoId("dQw4w9WgXcQ"),
				new PublishedAt(new Date()),
				"private" as PrivacyStatus,
				"processed" as UploadStatus,
			);
			expect(content.isPublic()).toBe(false);
		});
	});

	describe("isAvailable", () => {
		it("should return true for processed public videos", () => {
			const content = createSampleContent();
			expect(content.isAvailable()).toBe(true);
		});

		it("should return true for processed unlisted videos", () => {
			const content = new VideoContent(
				new VideoId("dQw4w9WgXcQ"),
				new PublishedAt(new Date()),
				"unlisted" as PrivacyStatus,
				"processed" as UploadStatus,
			);
			expect(content.isAvailable()).toBe(true);
		});

		it("should return false for private videos", () => {
			const content = new VideoContent(
				new VideoId("dQw4w9WgXcQ"),
				new PublishedAt(new Date()),
				"private" as PrivacyStatus,
				"processed" as UploadStatus,
			);
			expect(content.isAvailable()).toBe(false);
		});

		it("should return false for failed uploads", () => {
			const content = new VideoContent(
				new VideoId("dQw4w9WgXcQ"),
				new PublishedAt(new Date()),
				"public" as PrivacyStatus,
				"failed" as UploadStatus,
			);
			expect(content.isAvailable()).toBe(false);
		});
	});

	describe("hasTag", () => {
		it("should find tag case-insensitively", () => {
			const content = createSampleContent();
			expect(content.hasTag("Music")).toBe(true);
			expect(content.hasTag("MUSIC")).toBe(true);
			expect(content.hasTag("music")).toBe(true);
		});

		it("should return false for missing tag", () => {
			const content = createSampleContent();
			expect(content.hasTag("gaming")).toBe(false);
		});

		it("should return false when tags undefined", () => {
			const content = new VideoContent(
				new VideoId("dQw4w9WgXcQ"),
				new PublishedAt(new Date()),
				"public" as PrivacyStatus,
				"processed" as UploadStatus,
			);
			expect(content.hasTag("music")).toBe(false);
		});
	});

	describe("validation", () => {
		it("should validate valid content", () => {
			const content = createSampleContent();
			expect(content.isValid()).toBe(true);
			expect(content.getValidationErrors()).toHaveLength(0);
		});

		it("should validate video ID", () => {
			const content = new VideoContent(
				new VideoId("short"), // Invalid
				new PublishedAt(new Date()),
				"public" as PrivacyStatus,
				"processed" as UploadStatus,
			);

			expect(content.isValid()).toBe(false);
			const errors = content.getValidationErrors();
			expect(errors.some((e) => e.includes("VideoId:"))).toBe(true);
		});

		it("should validate privacy status", () => {
			const content = new VideoContent(
				new VideoId("dQw4w9WgXcQ"),
				new PublishedAt(new Date()),
				"invalid" as any,
				"processed" as UploadStatus,
			);

			expect(content.isValid()).toBe(false);
			const errors = content.getValidationErrors();
			expect(errors.some((e) => e.includes("Invalid privacy status"))).toBe(true);
		});

		it("should validate upload status", () => {
			const content = new VideoContent(
				new VideoId("dQw4w9WgXcQ"),
				new PublishedAt(new Date()),
				"public" as PrivacyStatus,
				"invalid" as any,
			);

			expect(content.isValid()).toBe(false);
			const errors = content.getValidationErrors();
			expect(errors.some((e) => e.includes("Invalid upload status"))).toBe(true);
		});
	});

	describe("toPlainObject", () => {
		it("should convert to plain object", () => {
			const content = createSampleContent();
			const plain = content.toPlainObject();

			expect(plain.videoId).toBe("dQw4w9WgXcQ");
			expect(plain.privacyStatus).toBe("public");
			expect(plain.uploadStatus).toBe("processed");
			expect(plain.contentDetails?.dimension).toBe("2d");
			expect(plain.tags).toEqual(["music", "rickroll", "classic"]);
		});
	});

	describe("equals", () => {
		it("should equal identical content", () => {
			const content1 = createSampleContent();
			const content2 = createSampleContent();
			expect(content1.equals(content2)).toBe(true);
		});

		it("should not equal with different video ID", () => {
			const content1 = createSampleContent();
			const content2 = new VideoContent(
				new VideoId("oHg5SJYRHA0"), // different
				content1.publishedAt,
				content1.privacyStatus,
				content1.uploadStatus,
				content1.contentDetails,
				content1.embedHtml,
				content1.tags,
			);
			expect(content1.equals(content2)).toBe(false);
		});

		it("should handle tags equality", () => {
			const content1 = new VideoContent(
				new VideoId("dQw4w9WgXcQ"),
				new PublishedAt(new Date()),
				"public" as PrivacyStatus,
				"processed" as UploadStatus,
				undefined,
				undefined,
				["tag1", "tag2"],
			);
			const content2 = new VideoContent(
				new VideoId("dQw4w9WgXcQ"),
				new PublishedAt(content1.publishedAt.toDate()),
				"public" as PrivacyStatus,
				"processed" as UploadStatus,
				undefined,
				undefined,
				["tag1", "tag2"],
			);
			expect(content1.equals(content2)).toBe(true);
		});

		it("should detect different tag order", () => {
			const base = new VideoId("dQw4w9WgXcQ");
			const date = new PublishedAt(new Date());
			const content1 = new VideoContent(
				base,
				date,
				"public" as PrivacyStatus,
				"processed" as UploadStatus,
				undefined,
				undefined,
				["tag1", "tag2"],
			);
			const content2 = new VideoContent(
				base,
				date,
				"public" as PrivacyStatus,
				"processed" as UploadStatus,
				undefined,
				undefined,
				["tag2", "tag1"],
			);
			expect(content1.equals(content2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = createSampleContent();
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);

			// Verify deep clone
			expect(cloned.videoId).not.toBe(original.videoId);
			expect(cloned.publishedAt).not.toBe(original.publishedAt);
			expect(cloned.contentDetails).not.toBe(original.contentDetails);
			expect(cloned.tags).not.toBe(original.tags);
		});
	});
});
