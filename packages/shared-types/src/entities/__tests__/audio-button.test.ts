import { describe, expect, it } from "vitest";
import {
	AudioContent,
	ButtonCategory,
	ButtonTags,
	ButtonText,
} from "../../value-objects/audio-button/audio-content";
import {
	AudioReference,
	AudioVideoId,
	AudioVideoTitle,
	Timestamp,
} from "../../value-objects/audio-button/audio-reference";
import {
	ButtonDislikeCount,
	ButtonLikeCount,
	ButtonStatistics,
	ButtonViewCount,
} from "../../value-objects/audio-button/button-statistics";
import { AudioButton, AudioButtonId } from "../audio-button";

describe("AudioButtonId", () => {
	describe("constructor", () => {
		it("should create valid ID", () => {
			const id = new AudioButtonId("ab_123");
			expect(id.toString()).toBe("ab_123");
		});

		it("should throw error for empty ID", () => {
			expect(() => new AudioButtonId("")).toThrow("AudioButton ID cannot be empty");
			expect(() => new AudioButtonId("   ")).toThrow("AudioButton ID cannot be empty");
		});
	});

	describe("generate", () => {
		it("should generate unique IDs", () => {
			const id1 = AudioButtonId.generate();
			const id2 = AudioButtonId.generate();

			expect(id1.toString()).toMatch(/^ab_[a-z0-9]+_[a-z0-9]+$/);
			expect(id2.toString()).toMatch(/^ab_[a-z0-9]+_[a-z0-9]+$/);
			expect(id1.equals(id2)).toBe(false);
		});
	});

	describe("equals", () => {
		it("should return true for same ID", () => {
			const id1 = new AudioButtonId("ab_123");
			const id2 = new AudioButtonId("ab_123");
			expect(id1.equals(id2)).toBe(true);
		});

		it("should return false for different IDs", () => {
			const id1 = new AudioButtonId("ab_123");
			const id2 = new AudioButtonId("ab_456");
			expect(id1.equals(id2)).toBe(false);
		});
	});
});

describe("AudioButton", () => {
	const createSampleButton = (
		overrides?: Partial<{
			id: string;
			text: string;
			category?: string;
			tags?: string[];
			videoId: string;
			videoTitle: string;
			startTime: number;
			endTime?: number;
			viewCount?: number;
			likeCount?: number;
			dislikeCount?: number;
			creatorId: string;
			creatorName: string;
			isPublic?: boolean;
			favoriteCount?: number;
		}>,
	) => {
		const defaults = {
			id: "ab_123",
			text: "Sample Button",
			videoId: "dQw4w9WgXcQ",
			videoTitle: "Test Video",
			startTime: 120,
			creatorId: "user_123",
			creatorName: "Test User",
		};
		const params = { ...defaults, ...overrides };

		const content = new AudioContent(
			new ButtonText(params.text),
			params.category ? new ButtonCategory(params.category) : undefined,
			new ButtonTags(params.tags || []),
		);

		const reference = new AudioReference(
			new AudioVideoId(params.videoId),
			new AudioVideoTitle(params.videoTitle),
			new Timestamp(params.startTime),
			params.endTime !== undefined ? new Timestamp(params.endTime) : undefined,
		);

		const statistics = new ButtonStatistics(
			new ButtonViewCount(params.viewCount || 0),
			new ButtonLikeCount(params.likeCount || 0),
			new ButtonDislikeCount(params.dislikeCount || 0),
		);

		return new AudioButton(
			new AudioButtonId(params.id),
			content,
			reference,
			statistics,
			{
				id: params.creatorId,
				name: params.creatorName,
			},
			params.isPublic ?? true,
			new Date("2024-01-01"),
			new Date("2024-01-01"),
			params.favoriteCount || 0,
		);
	};

	describe("constructor", () => {
		it("should create valid audio button", () => {
			const button = createSampleButton();

			expect(button.id.toString()).toBe("ab_123");
			expect(button.content.text.toString()).toBe("Sample Button");
			expect(button.reference.videoId.toString()).toBe("dQw4w9WgXcQ");
			expect(button.statistics.viewCount.toNumber()).toBe(0);
			expect(button.createdBy).toEqual({ id: "user_123", name: "Test User" });
			expect(button.isPublic).toBe(true);
			expect(button.favoriteCount).toBe(0);
		});
	});

	describe("update methods", () => {
		it("should update content", () => {
			const button = createSampleButton();
			const newContent = new AudioContent(
				new ButtonText("Updated Button"),
				new ButtonCategory("greeting"),
				new ButtonTags(["new", "tags"]),
			);

			const updated = button.updateContent(newContent);

			expect(button.content.text.toString()).toBe("Sample Button"); // Original unchanged
			expect(updated.content.text.toString()).toBe("Updated Button");
			expect(updated.content.category?.toString()).toBe("greeting");
			expect(updated.updatedAt.getTime()).toBeGreaterThan(button.updatedAt.getTime());
		});

		it("should update visibility", () => {
			const button = createSampleButton({ isPublic: true });
			const updated = button.updateVisibility(false);

			expect(button.isPublic).toBe(true); // Original unchanged
			expect(updated.isPublic).toBe(false);
			expect(updated.updatedAt.getTime()).toBeGreaterThan(button.updatedAt.getTime());
		});
	});

	describe("statistics methods", () => {
		it("should record play", () => {
			const button = createSampleButton({ viewCount: 100 });
			const updated = button.recordPlay();

			expect(button.statistics.viewCount.toNumber()).toBe(100); // Original unchanged
			expect(updated.statistics.viewCount.toNumber()).toBe(101);
			expect(updated.statistics.lastUsedAt).toBeDefined();
		});

		it("should record like", () => {
			const button = createSampleButton({ likeCount: 10 });
			const updated = button.recordLike();

			expect(button.statistics.likeCount.toNumber()).toBe(10); // Original unchanged
			expect(updated.statistics.likeCount.toNumber()).toBe(11);
		});

		it("should record dislike", () => {
			const button = createSampleButton({ dislikeCount: 5 });
			const updated = button.recordDislike();

			expect(button.statistics.dislikeCount.toNumber()).toBe(5); // Original unchanged
			expect(updated.statistics.dislikeCount.toNumber()).toBe(6);
		});
	});

	describe("favorite methods", () => {
		it("should increment favorite", () => {
			const button = createSampleButton({ favoriteCount: 10 });
			const updated = button.incrementFavorite();

			expect(button.favoriteCount).toBe(10); // Original unchanged
			expect(updated.favoriteCount).toBe(11);
		});

		it("should decrement favorite", () => {
			const button = createSampleButton({ favoriteCount: 10 });
			const updated = button.decrementFavorite();

			expect(button.favoriteCount).toBe(10); // Original unchanged
			expect(updated.favoriteCount).toBe(9);
		});

		it("should not go below zero when decrementing", () => {
			const button = createSampleButton({ favoriteCount: 0 });
			const updated = button.decrementFavorite();

			expect(updated.favoriteCount).toBe(0);
		});
	});

	describe("query methods", () => {
		it("should check popularity", () => {
			const popularButton = createSampleButton({
				viewCount: 1000,
				likeCount: 90,
				dislikeCount: 10,
			});
			expect(popularButton.isPopular()).toBe(true);

			const unpopularButton = createSampleButton({
				viewCount: 50,
				likeCount: 5,
				dislikeCount: 5,
			});
			expect(unpopularButton.isPopular()).toBe(false);
		});

		it("should calculate engagement rate", () => {
			const button = createSampleButton({
				viewCount: 1000,
				likeCount: 50,
				dislikeCount: 50,
			});
			expect(button.getEngagementRate()).toBe(0.1); // 100 interactions / 1000 views
		});

		it("should calculate popularity score", () => {
			const button = createSampleButton({
				viewCount: 1000,
				likeCount: 50,
				dislikeCount: 10,
			});
			// Formula: views + (likes * 2) - dislikes = 1000 + (50 * 2) - 10 = 1090
			expect(button.getPopularityScore()).toBe(1090);
		});

		it("should calculate engagement rate percentage", () => {
			const button = createSampleButton({
				viewCount: 1000,
				likeCount: 50,
				dislikeCount: 50,
			});
			// Formula: (likes + dislikes) / views * 100 = 100 / 1000 * 100 = 10%
			expect(button.getEngagementRatePercentage()).toBe(10);
		});

		it("should return 0 engagement rate for zero views", () => {
			const button = createSampleButton({
				viewCount: 0,
				likeCount: 0,
				dislikeCount: 0,
			});
			expect(button.getEngagementRatePercentage()).toBe(0);
		});

		it("should check creator ownership", () => {
			const button = createSampleButton({ creatorId: "user_123" });
			expect(button.belongsTo("user_123")).toBe(true);
			expect(button.belongsTo("user_456")).toBe(false);
		});

		it("should generate searchable text", () => {
			const button = createSampleButton({
				text: "Hello World",
				tags: ["greeting", "test"],
				videoTitle: "Test Video Title",
				creatorName: "John Doe",
			});

			const searchText = button.getSearchableText();
			expect(searchText).toContain("hello world");
			expect(searchText).toContain("greeting");
			expect(searchText).toContain("test");
			expect(searchText).toContain("test video title");
			expect(searchText).toContain("john doe");
		});
	});

	describe("validation", () => {
		it("should be valid for correct data", () => {
			const button = createSampleButton();
			expect(button.isValid()).toBe(true);
			expect(button.getValidationErrors()).toEqual([]);
		});

		it("should validate creator info", () => {
			const button = new AudioButton(
				AudioButtonId.generate(),
				new AudioContent(new ButtonText("Test")),
				new AudioReference(
					new AudioVideoId("dQw4w9WgXcQ"),
					new AudioVideoTitle("Test"),
					new Timestamp(0),
				),
				new ButtonStatistics(),
				{ id: "", name: "" }, // Invalid creator info
				true,
			);

			expect(button.isValid()).toBe(false);
			expect(button.getValidationErrors()).toContain("Creator information is incomplete");
		});

		it("should validate timestamps", () => {
			const button = new AudioButton(
				AudioButtonId.generate(),
				new AudioContent(new ButtonText("Test")),
				new AudioReference(
					new AudioVideoId("dQw4w9WgXcQ"),
					new AudioVideoTitle("Test"),
					new Timestamp(0),
				),
				new ButtonStatistics(),
				{ id: "user", name: "User" },
				true,
				new Date("2024-01-02"), // Created after updated
				new Date("2024-01-01"), // Updated before created
			);

			expect(button.isValid()).toBe(false);
			expect(button.getValidationErrors()).toContain("Created date cannot be after updated date");
		});

		it("should validate favorite count", () => {
			const button = new AudioButton(
				AudioButtonId.generate(),
				new AudioContent(new ButtonText("Test")),
				new AudioReference(
					new AudioVideoId("dQw4w9WgXcQ"),
					new AudioVideoTitle("Test"),
					new Timestamp(0),
				),
				new ButtonStatistics(),
				{ id: "user", name: "User" },
				true,
				new Date(),
				new Date(),
				-1, // Negative favorite count
			);

			expect(button.isValid()).toBe(false);
			expect(button.getValidationErrors()).toContain("Favorite count cannot be negative");
		});
	});

	describe("clone", () => {
		it("should create deep copy", () => {
			const button = createSampleButton();
			const cloned = button.clone();

			expect(cloned.equals(button)).toBe(true);
			expect(cloned).not.toBe(button); // Different instances

			// Verify deep copy
			const updatedClone = cloned.updateContent(new AudioContent(new ButtonText("Modified")));
			expect(button.content.text.toString()).toBe("Sample Button");
			expect(cloned.content.text.toString()).toBe("Sample Button");
			expect(updatedClone.content.text.toString()).toBe("Modified");
		});
	});

	describe("equals", () => {
		it("should return true for identical buttons", () => {
			const button1 = createSampleButton();
			const button2 = createSampleButton();
			expect(button1.equals(button2)).toBe(true);
		});

		it("should return false for different IDs", () => {
			const button1 = createSampleButton({ id: "ab_123" });
			const button2 = createSampleButton({ id: "ab_456" });
			expect(button1.equals(button2)).toBe(false);
		});

		it("should return false for different content", () => {
			const button1 = createSampleButton({ text: "Button 1" });
			const button2 = createSampleButton({ text: "Button 2" });
			expect(button1.equals(button2)).toBe(false);
		});

		it("should return false for different creators", () => {
			const button1 = createSampleButton({ creatorId: "user_123" });
			const button2 = createSampleButton({ creatorId: "user_456" });
			expect(button1.equals(button2)).toBe(false);
		});

		it("should return false for null or wrong type", () => {
			const button = createSampleButton();
			expect(button.equals(null as any)).toBe(false);
			expect(button.equals({} as any)).toBe(false);
		});
	});
});
