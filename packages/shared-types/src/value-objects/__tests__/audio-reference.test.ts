import { describe, expect, it } from "vitest";
import { AudioReference, AudioVideoId, AudioVideoTitle, Timestamp } from "../audio-reference";

describe("AudioVideoId", () => {
	describe("constructor", () => {
		it("should create valid YouTube video ID", () => {
			const id = new AudioVideoId("dQw4w9WgXcQ");
			expect(id.toString()).toBe("dQw4w9WgXcQ");
		});

		it("should throw error for invalid video ID", () => {
			expect(() => new AudioVideoId("")).toThrow("Invalid YouTube video ID format");
			expect(() => new AudioVideoId("short")).toThrow("Invalid YouTube video ID format");
			expect(() => new AudioVideoId("toolongvideoid")).toThrow("Invalid YouTube video ID format");
			expect(() => new AudioVideoId("invalid!id")).toThrow("Invalid YouTube video ID format");
		});
	});

	describe("URL generation", () => {
		it("should generate YouTube URL", () => {
			const id = new AudioVideoId("dQw4w9WgXcQ");
			expect(id.toYouTubeUrl()).toBe("https://youtube.com/watch?v=dQw4w9WgXcQ");
		});

		it("should generate embed URL", () => {
			const id = new AudioVideoId("dQw4w9WgXcQ");
			expect(id.toEmbedUrl()).toBe("https://youtube.com/embed/dQw4w9WgXcQ");
		});
	});

	describe("equals", () => {
		it("should return true for same ID", () => {
			const id1 = new AudioVideoId("dQw4w9WgXcQ");
			const id2 = new AudioVideoId("dQw4w9WgXcQ");
			expect(id1.equals(id2)).toBe(true);
		});

		it("should return false for different IDs", () => {
			const id1 = new AudioVideoId("dQw4w9WgXcQ");
			const id2 = new AudioVideoId("oHg5SJYRHA0");
			expect(id1.equals(id2)).toBe(false);
		});
	});
});

describe("AudioVideoTitle", () => {
	describe("constructor", () => {
		it("should create valid title", () => {
			const title = new AudioVideoTitle("Test Video Title");
			expect(title.toString()).toBe("Test Video Title");
		});

		it("should trim whitespace", () => {
			const title = new AudioVideoTitle("  Test Video Title  ");
			expect(title.toString()).toBe("Test Video Title");
		});

		it("should throw error for empty title", () => {
			expect(() => new AudioVideoTitle("")).toThrow("Video title cannot be empty");
			expect(() => new AudioVideoTitle("   ")).toThrow("Video title cannot be empty");
		});
	});

	describe("toDisplayString", () => {
		it("should return full title if under max length", () => {
			const title = new AudioVideoTitle("Short Title");
			expect(title.toDisplayString(20)).toBe("Short Title");
		});

		it("should truncate long titles", () => {
			const title = new AudioVideoTitle(
				"This is a very long video title that needs to be truncated",
			);
			expect(title.toDisplayString(20)).toBe("This is a very long ...");
		});

		it("should use default max length of 50", () => {
			const longTitle = "A".repeat(60);
			const title = new AudioVideoTitle(longTitle);
			expect(title.toDisplayString()).toBe(`${"A".repeat(50)}...`);
		});
	});
});

describe("Timestamp", () => {
	describe("constructor", () => {
		it("should create valid timestamp", () => {
			const ts = new Timestamp(125);
			expect(ts.toSeconds()).toBe(125);
		});

		it("should floor decimal values", () => {
			const ts = new Timestamp(125.7);
			expect(ts.toSeconds()).toBe(125);
		});

		it("should handle negative values by setting to 0", () => {
			const ts = new Timestamp(-10);
			expect(ts.toSeconds()).toBe(0);
		});
	});

	describe("format", () => {
		it("should format seconds only", () => {
			const ts = new Timestamp(45);
			expect(ts.format()).toBe("0:45");
		});

		it("should format minutes and seconds", () => {
			const ts = new Timestamp(125);
			expect(ts.format()).toBe("2:05");
		});

		it("should format hours, minutes and seconds", () => {
			const ts = new Timestamp(3725);
			expect(ts.format()).toBe("1:02:05");
		});

		it("should pad minutes and seconds with zeros", () => {
			const ts = new Timestamp(3603);
			expect(ts.format()).toBe("1:00:03");
		});
	});

	describe("fromTimeString", () => {
		it("should parse seconds only", () => {
			const ts = Timestamp.fromTimeString("45");
			expect(ts.toSeconds()).toBe(45);
		});

		it("should parse MM:SS format", () => {
			const ts = Timestamp.fromTimeString("2:05");
			expect(ts.toSeconds()).toBe(125);
		});

		it("should parse HH:MM:SS format", () => {
			const ts = Timestamp.fromTimeString("1:02:05");
			expect(ts.toSeconds()).toBe(3725);
		});

		it("should throw error for invalid format", () => {
			expect(() => Timestamp.fromTimeString("1:2:3:4")).toThrow("Invalid time format");
			expect(() => Timestamp.fromTimeString("")).toThrow("Invalid time format");
		});
	});

	describe("validation", () => {
		it("should be valid for positive integers", () => {
			const ts = new Timestamp(100);
			expect(ts.isValid()).toBe(true);
			expect(ts.getValidationErrors()).toEqual([]);
		});

		it("should handle already floored negative values", () => {
			const ts = new Timestamp(-10); // Constructor sets to 0
			expect(ts.isValid()).toBe(true);
			expect(ts.getValidationErrors()).toEqual([]);
		});
	});
});

describe("AudioReference", () => {
	const createSampleReference = (
		overrides?: Partial<{
			videoId: string;
			videoTitle: string;
			startTimestamp: number;
			endTimestamp?: number;
			workId?: string;
		}>,
	) => {
		const defaults = {
			videoId: "dQw4w9WgXcQ",
			videoTitle: "Test Video",
			startTimestamp: 120,
		};
		const params = { ...defaults, ...overrides };

		return new AudioReference(
			new AudioVideoId(params.videoId),
			new AudioVideoTitle(params.videoTitle),
			new Timestamp(params.startTimestamp),
			params.endTimestamp !== undefined ? new Timestamp(params.endTimestamp) : undefined,
			params.workId,
		);
	};

	describe("URL generation", () => {
		it("should generate YouTube URL with timestamp", () => {
			const ref = createSampleReference({ startTimestamp: 125 });
			expect(ref.getYouTubeUrl()).toBe("https://youtube.com/watch?v=dQw4w9WgXcQ&t=125");
		});

		it("should generate embed URL with start time", () => {
			const ref = createSampleReference({ startTimestamp: 125 });
			expect(ref.getEmbedUrl()).toBe("https://youtube.com/embed/dQw4w9WgXcQ?start=125");
		});

		it("should generate embed URL with start and end times", () => {
			const ref = createSampleReference({ startTimestamp: 125, endTimestamp: 200 });
			expect(ref.getEmbedUrl()).toBe("https://youtube.com/embed/dQw4w9WgXcQ?start=125&end=200");
		});
	});

	describe("duration", () => {
		it("should calculate duration when end timestamp is provided", () => {
			const ref = createSampleReference({ startTimestamp: 120, endTimestamp: 180 });
			expect(ref.getDuration()).toBe(60);
		});

		it("should return null when no end timestamp", () => {
			const ref = createSampleReference();
			expect(ref.getDuration()).toBeNull();
		});

		it("should format duration as MM:SS", () => {
			const ref = createSampleReference({ startTimestamp: 120, endTimestamp: 245 });
			expect(ref.formatDuration()).toBe("2:05");
		});

		it("should return null for format when no duration", () => {
			const ref = createSampleReference();
			expect(ref.formatDuration()).toBeNull();
		});
	});

	describe("work link", () => {
		it("should detect work link presence", () => {
			const ref1 = createSampleReference({ workId: "RJ123456" });
			expect(ref1.hasWorkLink()).toBe(true);

			const ref2 = createSampleReference();
			expect(ref2.hasWorkLink()).toBe(false);
		});
	});

	describe("validation", () => {
		it("should be valid for correct data", () => {
			const ref = createSampleReference({ workId: "RJ123456" });
			expect(ref.isValid()).toBe(true);
			expect(ref.getValidationErrors()).toEqual([]);
		});

		it("should validate work ID format", () => {
			const ref = createSampleReference({ workId: "invalid" });
			expect(ref.isValid()).toBe(false);
			expect(ref.getValidationErrors()).toContain("Invalid work ID format");
		});

		it("should validate timestamp order", () => {
			const ref = createSampleReference({ startTimestamp: 200, endTimestamp: 100 });
			expect(ref.isValid()).toBe(false);
			expect(ref.getValidationErrors()).toContain("End timestamp must be after start timestamp");
		});

		it("should validate equal timestamps", () => {
			const ref = createSampleReference({ startTimestamp: 100, endTimestamp: 100 });
			expect(ref.isValid()).toBe(false);
			expect(ref.getValidationErrors()).toContain("End timestamp must be after start timestamp");
		});
	});

	describe("toPlainObject", () => {
		it("should convert to plain object", () => {
			const ref = createSampleReference({
				startTimestamp: 120,
				endTimestamp: 180,
				workId: "RJ123456",
			});

			expect(ref.toPlainObject()).toEqual({
				videoId: "dQw4w9WgXcQ",
				videoTitle: "Test Video",
				timestamp: 120,
				endTimestamp: 180,
				workId: "RJ123456",
			});
		});

		it("should handle optional fields", () => {
			const ref = createSampleReference();
			const plain = ref.toPlainObject();

			expect(plain.endTimestamp).toBeUndefined();
			expect(plain.workId).toBeUndefined();
		});
	});

	describe("equals", () => {
		it("should return true for identical references", () => {
			const ref1 = createSampleReference({ workId: "RJ123456" });
			const ref2 = createSampleReference({ workId: "RJ123456" });
			expect(ref1.equals(ref2)).toBe(true);
		});

		it("should return false for different video IDs", () => {
			const ref1 = createSampleReference({ videoId: "dQw4w9WgXcQ" });
			const ref2 = createSampleReference({ videoId: "oHg5SJYRHA0" });
			expect(ref1.equals(ref2)).toBe(false);
		});

		it("should handle optional endTimestamp correctly", () => {
			const ref1 = createSampleReference({ endTimestamp: 180 });
			const ref2 = createSampleReference();
			expect(ref1.equals(ref2)).toBe(false);

			const ref3 = createSampleReference();
			const ref4 = createSampleReference();
			expect(ref3.equals(ref4)).toBe(true);
		});
	});
});
