import { describe, expect, it } from "vitest";
import {
	CommentCount,
	DislikeCount,
	LikeCount,
	VideoStatistics,
	ViewCount,
} from "../video-statistics";

describe("ViewCount", () => {
	describe("constructor", () => {
		it("should create valid view count", () => {
			const count = new ViewCount(12345);
			expect(count.toNumber()).toBe(12345);
		});

		it("should floor decimal values", () => {
			const count = new ViewCount(123.45);
			expect(count.toNumber()).toBe(123);
		});

		it("should handle negative values by setting to 0", () => {
			const count = new ViewCount(-100);
			expect(count.toNumber()).toBe(0);
		});
	});

	describe("toAbbreviated", () => {
		it("should return plain number for < 1K", () => {
			const count = new ViewCount(999);
			expect(count.toAbbreviated()).toBe("999");
		});

		it("should abbreviate thousands", () => {
			const count = new ViewCount(1234);
			expect(count.toAbbreviated()).toBe("1.2K");
		});

		it("should abbreviate millions", () => {
			const count = new ViewCount(1234567);
			expect(count.toAbbreviated()).toBe("1.2M");
		});

		it("should abbreviate billions", () => {
			const count = new ViewCount(1234567890);
			expect(count.toAbbreviated()).toBe("1.2B");
		});
	});

	describe("toLocaleString", () => {
		it("should format with Japanese locale", () => {
			const count = new ViewCount(1234567);
			expect(count.toLocaleString("ja-JP")).toBe("1,234,567");
		});

		it("should use default locale", () => {
			const count = new ViewCount(1234567);
			expect(count.toLocaleString()).toBeTruthy();
		});
	});

	describe("increment", () => {
		it("should increment by 1 by default", () => {
			const count = new ViewCount(100);
			const incremented = count.increment();
			expect(incremented.toNumber()).toBe(101);
			expect(count.toNumber()).toBe(100); // Original unchanged
		});

		it("should increment by custom amount", () => {
			const count = new ViewCount(100);
			const incremented = count.increment(50);
			expect(incremented.toNumber()).toBe(150);
		});
	});

	describe("validation", () => {
		it("should validate positive integer", () => {
			const count = new ViewCount(100);
			expect(count.isValid()).toBe(true);
			expect(count.getValidationErrors()).toHaveLength(0);
		});

		it("should always be valid due to constructor normalization", () => {
			const count1 = new ViewCount(-100); // Normalized to 0
			const count2 = new ViewCount(123.45); // Floored to 123
			expect(count1.isValid()).toBe(true);
			expect(count2.isValid()).toBe(true);
		});
	});

	describe("equals", () => {
		it("should equal same count", () => {
			const count1 = new ViewCount(12345);
			const count2 = new ViewCount(12345);
			expect(count1.equals(count2)).toBe(true);
		});

		it("should not equal different counts", () => {
			const count1 = new ViewCount(12345);
			const count2 = new ViewCount(54321);
			expect(count1.equals(count2)).toBe(false);
		});

		it("should handle null/undefined", () => {
			const count = new ViewCount(100);
			expect(count.equals(null as any)).toBe(false);
			expect(count.equals(undefined as any)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new ViewCount(12345);
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.toNumber()).toBe(original.toNumber());
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("LikeCount", () => {
	describe("constructor", () => {
		it("should create valid like count", () => {
			const count = new LikeCount(100);
			expect(count.toNumber()).toBe(100);
		});

		it("should handle negative values", () => {
			const count = new LikeCount(-50);
			expect(count.toNumber()).toBe(0);
		});
	});

	describe("calculateRatio", () => {
		it("should calculate ratio correctly", () => {
			const likes = new LikeCount(75);
			expect(likes.calculateRatio(100)).toBe(0.75);
		});

		it("should return 0 for zero total", () => {
			const likes = new LikeCount(50);
			expect(likes.calculateRatio(0)).toBe(0);
		});

		it("should handle negative total", () => {
			const likes = new LikeCount(50);
			expect(likes.calculateRatio(-100)).toBe(0);
		});
	});

	describe("toPercentage", () => {
		it("should format percentage correctly", () => {
			const likes = new LikeCount(75);
			expect(likes.toPercentage(100)).toBe("75.0%");
		});

		it("should handle decimal percentages", () => {
			const likes = new LikeCount(333);
			expect(likes.toPercentage(1000)).toBe("33.3%");
		});

		it("should return 0% for zero total", () => {
			const likes = new LikeCount(50);
			expect(likes.toPercentage(0)).toBe("0.0%");
		});
	});

	describe("equals", () => {
		it("should equal same count", () => {
			const count1 = new LikeCount(100);
			const count2 = new LikeCount(100);
			expect(count1.equals(count2)).toBe(true);
		});

		it("should not equal different counts", () => {
			const count1 = new LikeCount(100);
			const count2 = new LikeCount(200);
			expect(count1.equals(count2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new LikeCount(100);
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("DislikeCount", () => {
	describe("constructor", () => {
		it("should create valid dislike count", () => {
			const count = new DislikeCount(50);
			expect(count.toNumber()).toBe(50);
		});

		it("should floor decimal values", () => {
			const count = new DislikeCount(50.7);
			expect(count.toNumber()).toBe(50);
		});

		it("should handle negative values", () => {
			const count = new DislikeCount(-10);
			expect(count.toNumber()).toBe(0);
		});
	});

	describe("calculateRatio", () => {
		it("should calculate correct ratio", () => {
			const count = new DislikeCount(20);
			expect(count.calculateRatio(100)).toBeCloseTo(0.2);
		});

		it("should handle zero total", () => {
			const count = new DislikeCount(20);
			expect(count.calculateRatio(0)).toBe(0);
		});

		it("should handle negative total", () => {
			const count = new DislikeCount(20);
			expect(count.calculateRatio(-100)).toBe(0);
		});
	});

	describe("toPercentage", () => {
		it("should format as percentage", () => {
			const count = new DislikeCount(25);
			expect(count.toPercentage(100)).toBe("25.0%");
		});

		it("should handle decimal percentages", () => {
			const count = new DislikeCount(333);
			expect(count.toPercentage(1000)).toBe("33.3%");
		});
	});

	describe("equals", () => {
		it("should equal same count", () => {
			const count1 = new DislikeCount(100);
			const count2 = new DislikeCount(100);
			expect(count1.equals(count2)).toBe(true);
		});

		it("should not equal different counts", () => {
			const count1 = new DislikeCount(100);
			const count2 = new DislikeCount(200);
			expect(count1.equals(count2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new DislikeCount(100);
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("CommentCount", () => {
	describe("isDisabled", () => {
		it("should return true for zero comments", () => {
			const count = new CommentCount(0);
			expect(count.isDisabled()).toBe(true);
		});

		it("should return false for non-zero comments", () => {
			const count = new CommentCount(10);
			expect(count.isDisabled()).toBe(false);
		});
	});

	describe("equals and clone", () => {
		it("should equal same count", () => {
			const count1 = new CommentCount(50);
			const count2 = new CommentCount(50);
			expect(count1.equals(count2)).toBe(true);
		});

		it("should clone correctly", () => {
			const original = new CommentCount(100);
			const cloned = original.clone();
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("VideoStatistics", () => {
	const createSampleStats = () => {
		return new VideoStatistics(
			new ViewCount(100000),
			new LikeCount(5000),
			new DislikeCount(100), // dislike
			200, // favorite
			new CommentCount(500),
		);
	};

	describe("fromPlainObject", () => {
		it("should create from plain object with all fields", () => {
			const stats = VideoStatistics.fromPlainObject({
				viewCount: "123456",
				likeCount: "1234",
				dislikeCount: "12",
				favoriteCount: "100",
				commentCount: "456",
			});

			expect(stats.viewCount.toNumber()).toBe(123456);
			expect(stats.likeCount?.toNumber()).toBe(1234);
			expect(stats.dislikeCount?.toNumber()).toBe(12);
			expect(stats.favoriteCount).toBe(100);
			expect(stats.commentCount?.toNumber()).toBe(456);
		});

		it("should handle missing optional fields", () => {
			const stats = VideoStatistics.fromPlainObject({
				viewCount: 100000,
			});

			expect(stats.viewCount.toNumber()).toBe(100000);
			expect(stats.likeCount).toBeUndefined();
			expect(stats.dislikeCount).toBeUndefined();
			expect(stats.favoriteCount).toBeUndefined();
			expect(stats.commentCount).toBeUndefined();
		});

		it("should convert string numbers", () => {
			const stats = VideoStatistics.fromPlainObject({
				viewCount: "1000",
				likeCount: "100",
			});

			expect(stats.viewCount.toNumber()).toBe(1000);
			expect(stats.likeCount?.toNumber()).toBe(100);
		});
	});

	describe("getTotalInteractions", () => {
		it("should sum likes and dislikes", () => {
			const stats = createSampleStats();
			expect(stats.getTotalInteractions()).toBe(5100); // 5000 + 100
		});

		it("should handle missing values", () => {
			const stats = new VideoStatistics(new ViewCount(1000));
			expect(stats.getTotalInteractions()).toBe(0);
		});
	});

	describe("getLikePercentage", () => {
		it("should calculate percentage correctly", () => {
			const stats = createSampleStats();
			const percentage = stats.getLikePercentage();
			expect(percentage).toBeCloseTo(98.04, 2); // 5000 / 5100 * 100
		});

		it("should return 0 for no interactions", () => {
			const stats = new VideoStatistics(new ViewCount(1000));
			expect(stats.getLikePercentage()).toBe(0);
		});
	});

	describe("getEngagementMetrics", () => {
		it("should calculate all metrics", () => {
			const stats = createSampleStats();
			const metrics = stats.getEngagementMetrics();

			expect(metrics.viewCount).toBe(100000);
			expect(metrics.likeRatio).toBeCloseTo(0.05, 2); // 5000 / 100000
			expect(metrics.commentRatio).toBeCloseTo(0.005, 3); // 500 / 100000
			expect(metrics.engagementRate).toBeCloseTo(0.055, 3); // (5000 + 500) / 100000
		});

		it("should handle zero views", () => {
			const stats = new VideoStatistics(
				new ViewCount(0),
				new LikeCount(0),
				new DislikeCount(0),
				0,
				new CommentCount(0),
			);
			const metrics = stats.getEngagementMetrics();

			expect(metrics.viewCount).toBe(0);
			expect(metrics.likeRatio).toBe(0);
			expect(metrics.commentRatio).toBe(0);
			expect(metrics.engagementRate).toBe(0);
		});
	});

	describe("validation", () => {
		it("should validate valid statistics", () => {
			const stats = createSampleStats();
			expect(stats.isValid()).toBe(true);
			expect(stats.getValidationErrors()).toHaveLength(0);
		});

		it("should detect when likes exceed views", () => {
			const stats = new VideoStatistics(new ViewCount(100), new LikeCount(200));

			expect(stats.isValid()).toBe(false);
			const errors = stats.getValidationErrors();
			expect(errors).toContain("Like count cannot exceed view count");
		});
	});

	describe("toPlainObject", () => {
		it("should convert to plain object", () => {
			const stats = createSampleStats();
			const plain = stats.toPlainObject();

			expect(plain).toEqual({
				viewCount: 100000,
				likeCount: 5000,
				dislikeCount: 100,
				favoriteCount: 200,
				commentCount: 500,
			});
		});

		it("should handle undefined optional fields", () => {
			const stats = new VideoStatistics(new ViewCount(1000));
			const plain = stats.toPlainObject();

			expect(plain).toEqual({
				viewCount: 1000,
				likeCount: undefined,
				dislikeCount: undefined,
				favoriteCount: undefined,
				commentCount: undefined,
			});
		});
	});

	describe("equals", () => {
		it("should equal identical statistics", () => {
			const stats1 = createSampleStats();
			const stats2 = createSampleStats();
			expect(stats1.equals(stats2)).toBe(true);
		});

		it("should not equal with different view count", () => {
			const stats1 = createSampleStats();
			const stats2 = new VideoStatistics(
				new ViewCount(200000), // different
				stats1.likeCount,
				stats1.dislikeCount,
				stats1.favoriteCount,
				stats1.commentCount,
			);
			expect(stats1.equals(stats2)).toBe(false);
		});

		it("should handle undefined optional fields", () => {
			const stats1 = new VideoStatistics(new ViewCount(1000), new LikeCount(100));
			const stats2 = new VideoStatistics(new ViewCount(1000), new LikeCount(100));
			expect(stats1.equals(stats2)).toBe(true);
		});

		it("should not equal when optional field differs", () => {
			const stats1 = new VideoStatistics(new ViewCount(1000), new LikeCount(100));
			const stats2 = new VideoStatistics(new ViewCount(1000));
			expect(stats1.equals(stats2)).toBe(false);
		});

		it("should handle null/undefined", () => {
			const stats = createSampleStats();
			expect(stats.equals(null as any)).toBe(false);
			expect(stats.equals(undefined as any)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = createSampleStats();
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);

			// Verify deep clone
			expect(cloned.viewCount).not.toBe(original.viewCount);
			expect(cloned.likeCount).not.toBe(original.likeCount);
			expect(cloned.commentCount).not.toBe(original.commentCount);
		});
	});
});
