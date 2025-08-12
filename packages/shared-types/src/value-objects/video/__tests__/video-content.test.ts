import { describe, expect, it } from "vitest";
import type { Result } from "../../../core/result";
import {
	ContentDetails,
	type PrivacyStatus,
	PublishedAt,
	type UploadStatus,
	VideoContent,
	VideoId,
} from "../video-content";

// Helper function to unwrap Result values for testing
function unwrap<T, E>(result: Result<T, E>): T {
	if (result.isErr()) {
		throw new Error(`Failed to create value: ${JSON.stringify(result.error)}`);
	}
	return result.value;
}

describe("VideoId", () => {
	describe("factory method", () => {
		it("should create valid video ID", () => {
			const result = VideoId.create("dQw4w9WgXcQ");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toString()).toBe("dQw4w9WgXcQ");
			}
		});

		it("should trim whitespace", () => {
			const result = VideoId.create("  dQw4w9WgXcQ  ");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toString()).toBe("dQw4w9WgXcQ");
			}
		});

		it("should return error for empty string", () => {
			const result = VideoId.create("");
			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.message).toContain("videoId must not be empty");
			}
		});
	});

	describe("toUrl", () => {
		it("should generate correct YouTube URL", () => {
			const id = unwrap(VideoId.create("dQw4w9WgXcQ"));
			expect(id.toUrl()).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		});
	});

	describe("toEmbedUrl", () => {
		it("should generate correct embed URL", () => {
			const result = VideoId.create("dQw4w9WgXcQ");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toEmbedUrl()).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
			}
		});
	});

	describe("toThumbnailUrl", () => {
		it("should generate default quality thumbnail", () => {
			const id = unwrap(VideoId.create("dQw4w9WgXcQ"));
			expect(id.toThumbnailUrl()).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
		});

		it("should generate maxres thumbnail", () => {
			const id = unwrap(VideoId.create("dQw4w9WgXcQ"));
			expect(id.toThumbnailUrl("maxres")).toBe(
				"https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
			);
		});

		it("should generate medium quality thumbnail", () => {
			const id = unwrap(VideoId.create("dQw4w9WgXcQ"));
			expect(id.toThumbnailUrl("medium")).toBe(
				"https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
			);
		});
	});

	describe("validation", () => {
		it("should validate 11-character ID", () => {
			const id = unwrap(VideoId.create("dQw4w9WgXcQ"));
			expect(id.isValid()).toBe(true);
			expect(id.getValidationErrors()).toHaveLength(0);
		});

		it("should invalidate wrong length", () => {
			// Test validation through the created object
			const result = VideoId.create("abc123");
			expect(result.isOk()).toBe(true); // Factory method succeeds
			if (result.isOk()) {
				const id = result.value;
				expect(id.isValid()).toBe(false);
				expect(id.getValidationErrors()).toContain("Video ID should be 11 characters");
			}
		});

		it("should invalidate special characters", () => {
			// Test validation through the created object
			const result = VideoId.create("abc!@#$%^&*");
			expect(result.isOk()).toBe(true); // Factory method succeeds
			if (result.isOk()) {
				const id = result.value;
				expect(id.isValid()).toBe(false);
				expect(id.getValidationErrors()).toContain("Video ID contains invalid characters");
			}
		});
	});

	describe("equals", () => {
		it("should equal same ID", () => {
			const id1 = unwrap(VideoId.create("dQw4w9WgXcQ"));
			const id2 = unwrap(VideoId.create("dQw4w9WgXcQ"));
			expect(id1.equals(id2)).toBe(true);
		});

		it("should not equal different IDs", () => {
			const id1 = unwrap(VideoId.create("dQw4w9WgXcQ"));
			const id2 = unwrap(VideoId.create("oHg5SJYRHA0"));
			expect(id1.equals(id2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = unwrap(VideoId.create("dQw4w9WgXcQ"));
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("PublishedAt", () => {
	describe("factory method", () => {
		it("should accept Date object", () => {
			const date = new Date("2024-01-01");
			const result = PublishedAt.create(date);
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toDate().getTime()).toBe(date.getTime());
			}
		});

		it("should accept date string", () => {
			const result = PublishedAt.create("2024-01-01T00:00:00Z");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toDate().getFullYear()).toBe(2024);
			}
		});
	});

	describe("getAgeInDays", () => {
		it("should calculate age correctly", () => {
			const daysAgo = 10;
			const date = new Date();
			date.setDate(date.getDate() - daysAgo);
			const published = unwrap(PublishedAt.create(date));

			expect(published.getAgeInDays()).toBe(daysAgo);
		});

		it("should return 0 for today", () => {
			const published = unwrap(PublishedAt.create(new Date()));
			expect(published.getAgeInDays()).toBe(0);
		});
	});

	describe("toRelativeTime", () => {
		it("should return '今日' for today", () => {
			const published = unwrap(PublishedAt.create(new Date()));
			expect(published.toRelativeTime()).toBe("今日");
		});

		it("should return '昨日' for yesterday", () => {
			const date = new Date();
			date.setDate(date.getDate() - 1);
			const published = unwrap(PublishedAt.create(date));
			expect(published.toRelativeTime()).toBe("昨日");
		});

		it("should return days for less than a week", () => {
			const date = new Date();
			date.setDate(date.getDate() - 5);
			const published = unwrap(PublishedAt.create(date));
			expect(published.toRelativeTime()).toBe("5日前");
		});

		it("should return weeks for less than a month", () => {
			const date = new Date();
			date.setDate(date.getDate() - 14);
			const published = unwrap(PublishedAt.create(date));
			expect(published.toRelativeTime()).toBe("2週間前");
		});

		it("should return months for less than a year", () => {
			const date = new Date();
			date.setDate(date.getDate() - 60);
			const published = unwrap(PublishedAt.create(date));
			expect(published.toRelativeTime()).toBe("2ヶ月前");
		});

		it("should return years for old videos", () => {
			const date = new Date();
			date.setFullYear(date.getFullYear() - 2);
			const published = unwrap(PublishedAt.create(date));
			expect(published.toRelativeTime()).toBe("2年前");
		});
	});

	describe("toFormattedString", () => {
		it("should format with Japanese locale", () => {
			const published = unwrap(PublishedAt.create("2024-01-15T00:00:00Z"));
			const formatted = published.toFormattedString("ja-JP");
			expect(formatted).toContain("2024");
			expect(formatted).toContain("1");
			expect(formatted).toContain("15");
		});
	});

	describe("equals", () => {
		it("should equal same date", () => {
			const date = new Date("2024-01-01");
			const published1 = unwrap(PublishedAt.create(date));
			const published2 = unwrap(PublishedAt.create(date));
			expect(published1.equals(published2)).toBe(true);
		});

		it("should not equal different dates", () => {
			const published1 = unwrap(PublishedAt.create("2024-01-01"));
			const published2 = unwrap(PublishedAt.create("2024-01-02"));
			expect(published1.equals(published2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = unwrap(PublishedAt.create("2024-01-01"));
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
			const details = unwrap(ContentDetails.create("2d", "hd"));
			expect(details.isHD()).toBe(true);
		});

		it("should return false for SD", () => {
			const details = unwrap(ContentDetails.create("2d", "sd"));
			expect(details.isHD()).toBe(false);
		});

		it("should return false for undefined", () => {
			const details = unwrap(ContentDetails.create());
			expect(details.isHD()).toBe(false);
		});
	});

	describe("hasCaption", () => {
		it("should return true when caption is true", () => {
			const details = unwrap(ContentDetails.create("2d", "hd", true));
			expect(details.hasCaption()).toBe(true);
		});

		it("should return false when caption is false or undefined", () => {
			const details1 = unwrap(ContentDetails.create("2d", "hd", false));
			const details2 = unwrap(ContentDetails.create());
			expect(details1.hasCaption()).toBe(false);
			expect(details2.hasCaption()).toBe(false);
		});
	});

	describe("is360Video", () => {
		it("should return true for 360 videos", () => {
			const details = unwrap(ContentDetails.create("2d", "hd", false, false, "360"));
			expect(details.is360Video()).toBe(true);
		});

		it("should return false for rectangular videos", () => {
			const details = unwrap(ContentDetails.create("2d", "hd", false, false, "rectangular"));
			expect(details.is360Video()).toBe(false);
		});
	});

	describe("equals", () => {
		it("should equal identical details", () => {
			const details1 = unwrap(ContentDetails.create("2d", "hd", true, false, "rectangular"));
			const details2 = unwrap(ContentDetails.create("2d", "hd", true, false, "rectangular"));
			expect(details1.equals(details2)).toBe(true);
		});

		it("should not equal with different values", () => {
			const details1 = unwrap(ContentDetails.create("2d", "hd", true));
			const details2 = unwrap(ContentDetails.create("3d", "hd", true));
			expect(details1.equals(details2)).toBe(false);
		});

		it("should handle undefined values", () => {
			const details1 = unwrap(ContentDetails.create());
			const details2 = unwrap(ContentDetails.create());
			expect(details1.equals(details2)).toBe(true);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = unwrap(ContentDetails.create("2d", "hd", true, false, "rectangular"));
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("VideoContent", () => {
	const createSampleContent = () => {
		return unwrap(
			VideoContent.create(
				unwrap(VideoId.create("dQw4w9WgXcQ")),
				unwrap(PublishedAt.create("2024-01-01")),
				"public" as PrivacyStatus,
				"processed" as UploadStatus,
				unwrap(ContentDetails.create("2d", "hd", true, false, "rectangular")),
				'<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
				["music", "rickroll", "classic"],
			),
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
			const content = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("dQw4w9WgXcQ")),
					unwrap(PublishedAt.create(new Date())),
					"private" as PrivacyStatus,
					"processed" as UploadStatus,
				),
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
			const content = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("dQw4w9WgXcQ")),
					unwrap(PublishedAt.create(new Date())),
					"unlisted" as PrivacyStatus,
					"processed" as UploadStatus,
				),
			);
			expect(content.isAvailable()).toBe(true);
		});

		it("should return false for private videos", () => {
			const content = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("dQw4w9WgXcQ")),
					unwrap(PublishedAt.create(new Date())),
					"private" as PrivacyStatus,
					"processed" as UploadStatus,
				),
			);
			expect(content.isAvailable()).toBe(false);
		});

		it("should return false for failed uploads", () => {
			const content = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("dQw4w9WgXcQ")),
					unwrap(PublishedAt.create(new Date())),
					"public" as PrivacyStatus,
					"failed" as UploadStatus,
				),
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
			const content = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("dQw4w9WgXcQ")),
					unwrap(PublishedAt.create(new Date())),
					"public" as PrivacyStatus,
					"processed" as UploadStatus,
				),
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
			const content = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("short")), // Invalid
					unwrap(PublishedAt.create(new Date())),
					"public" as PrivacyStatus,
					"processed" as UploadStatus,
				),
			);

			expect(content.isValid()).toBe(false);
			const errors = content.getValidationErrors();
			expect(errors.some((e: string) => e.includes("VideoId:"))).toBe(true);
		});

		it("should validate privacy status", () => {
			const content = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("dQw4w9WgXcQ")),
					unwrap(PublishedAt.create(new Date())),
					"invalid" as any,
					"processed" as UploadStatus,
				),
			);

			expect(content.isValid()).toBe(false);
			const errors = content.getValidationErrors();
			expect(errors.some((e: string) => e.includes("Invalid privacy status"))).toBe(true);
		});

		it("should validate upload status", () => {
			const content = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("dQw4w9WgXcQ")),
					unwrap(PublishedAt.create(new Date())),
					"public" as PrivacyStatus,
					"invalid" as any,
				),
			);

			expect(content.isValid()).toBe(false);
			const errors = content.getValidationErrors();
			expect(errors.some((e: string) => e.includes("Invalid upload status"))).toBe(true);
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
			const content2 = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("oHg5SJYRHA0")), // different
					content1.publishedAt,
					content1.privacyStatus,
					content1.uploadStatus,
					content1.contentDetails,
					content1.embedHtml,
					content1.tags,
				),
			);
			expect(content1.equals(content2)).toBe(false);
		});

		it("should handle tags equality", () => {
			const content1 = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("dQw4w9WgXcQ")),
					unwrap(PublishedAt.create(new Date())),
					"public" as PrivacyStatus,
					"processed" as UploadStatus,
					undefined,
					undefined,
					["tag1", "tag2"],
				),
			);
			const content2 = unwrap(
				VideoContent.create(
					unwrap(VideoId.create("dQw4w9WgXcQ")),
					unwrap(PublishedAt.create(content1.publishedAt.toDate())),
					"public" as PrivacyStatus,
					"processed" as UploadStatus,
					undefined,
					undefined,
					["tag1", "tag2"],
				),
			);
			expect(content1.equals(content2)).toBe(true);
		});

		it("should detect different tag order", () => {
			const base = unwrap(VideoId.create("dQw4w9WgXcQ"));
			const date = unwrap(PublishedAt.create(new Date()));
			const content1 = unwrap(
				VideoContent.create(
					base,
					date,
					"public" as PrivacyStatus,
					"processed" as UploadStatus,
					undefined,
					undefined,
					["tag1", "tag2"],
				),
			);
			const content2 = unwrap(
				VideoContent.create(
					base,
					date,
					"public" as PrivacyStatus,
					"processed" as UploadStatus,
					undefined,
					undefined,
					["tag2", "tag1"],
				),
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
