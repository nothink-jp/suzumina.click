import { describe, expect, it } from "vitest";
import {
	ButtonDislikeCount,
	ButtonLikeCount,
	ButtonStatistics,
	ButtonViewCount,
} from "../button-statistics";

describe("ButtonViewCount", () => {
	describe("constructor", () => {
		it("should create valid view count", () => {
			const count = new ButtonViewCount(100);
			expect(count.toNumber()).toBe(100);
		});

		it("should floor decimal values", () => {
			const count = new ButtonViewCount(100.7);
			expect(count.toNumber()).toBe(100);
		});

		it("should handle negative values by setting to 0", () => {
			const count = new ButtonViewCount(-10);
			expect(count.toNumber()).toBe(0);
		});
	});

	describe("toAbbreviated", () => {
		it("should return plain number for values under 1000", () => {
			expect(new ButtonViewCount(999).toAbbreviated()).toBe("999");
		});

		it("should abbreviate thousands", () => {
			expect(new ButtonViewCount(1000).toAbbreviated()).toBe("1.0K");
			expect(new ButtonViewCount(1500).toAbbreviated()).toBe("1.5K");
			expect(new ButtonViewCount(999999).toAbbreviated()).toBe("1000.0K");
		});

		it("should abbreviate millions", () => {
			expect(new ButtonViewCount(1000000).toAbbreviated()).toBe("1.0M");
			expect(new ButtonViewCount(1500000).toAbbreviated()).toBe("1.5M");
		});
	});

	describe("toLocaleString", () => {
		it("should format with Japanese locale by default", () => {
			const count = new ButtonViewCount(1234567);
			expect(count.toLocaleString()).toBe("1,234,567");
		});

		it("should format with specified locale", () => {
			const count = new ButtonViewCount(1234567);
			// Result depends on locale implementation
			const result = count.toLocaleString("en-US");
			expect(result).toMatch(/1,234,567/);
		});
	});

	describe("increment", () => {
		it("should increment by 1 by default", () => {
			const count = new ButtonViewCount(100);
			const incremented = count.increment();

			expect(count.toNumber()).toBe(100); // Original unchanged
			expect(incremented.toNumber()).toBe(101);
		});

		it("should increment by specified amount", () => {
			const count = new ButtonViewCount(100);
			const incremented = count.increment(10);

			expect(incremented.toNumber()).toBe(110);
		});
	});

	describe("validation", () => {
		it("should be valid for positive integers", () => {
			const count = new ButtonViewCount(100);
			expect(count.isValid()).toBe(true);
			expect(count.getValidationErrors()).toEqual([]);
		});
	});
});

describe("ButtonLikeCount", () => {
	describe("calculateRatio", () => {
		it("should calculate correct ratio", () => {
			const likes = new ButtonLikeCount(75);
			expect(likes.calculateRatio(100)).toBe(0.75);
		});

		it("should handle zero total", () => {
			const likes = new ButtonLikeCount(50);
			expect(likes.calculateRatio(0)).toBe(0);
		});
	});

	describe("toPercentage", () => {
		it("should format percentage correctly", () => {
			const likes = new ButtonLikeCount(75);
			expect(likes.toPercentage(100)).toBe("75.0%");
		});
	});

	describe("equals", () => {
		it("should return true for same value", () => {
			const likes1 = new ButtonLikeCount(50);
			const likes2 = new ButtonLikeCount(50);
			expect(likes1.equals(likes2)).toBe(true);
		});

		it("should return false for different values", () => {
			const likes1 = new ButtonLikeCount(50);
			const likes2 = new ButtonLikeCount(60);
			expect(likes1.equals(likes2)).toBe(false);
		});
	});
});

describe("ButtonDislikeCount", () => {
	describe("calculateRatio", () => {
		it("should calculate correct ratio", () => {
			const dislikes = new ButtonDislikeCount(25);
			expect(dislikes.calculateRatio(100)).toBe(0.25);
		});
	});

	describe("toPercentage", () => {
		it("should format percentage correctly", () => {
			const dislikes = new ButtonDislikeCount(25);
			expect(dislikes.toPercentage(100)).toBe("25.0%");
		});
	});
});

describe("ButtonStatistics", () => {
	const createStats = (overrides?: {
		viewCount?: number;
		likeCount?: number;
		dislikeCount?: number;
		lastUsedAt?: Date;
	}) => {
		const defaults = {
			viewCount: 0,
			likeCount: 0,
			dislikeCount: 0,
		};
		const params = { ...defaults, ...overrides };

		return new ButtonStatistics(
			new ButtonViewCount(params.viewCount),
			new ButtonLikeCount(params.likeCount),
			new ButtonDislikeCount(params.dislikeCount),
			params.lastUsedAt,
		);
	};

	describe("fromPlainObject", () => {
		it("should create from plain object", () => {
			const stats = ButtonStatistics.fromPlainObject({
				viewCount: 100,
				likeCount: 80,
				dislikeCount: 20,
				lastUsedAt: "2024-01-01T00:00:00Z",
			});

			expect(stats.viewCount.toNumber()).toBe(100);
			expect(stats.likeCount.toNumber()).toBe(80);
			expect(stats.dislikeCount.toNumber()).toBe(20);
			expect(stats.lastUsedAt).toEqual(new Date("2024-01-01T00:00:00Z"));
		});

		it("should handle missing values", () => {
			const stats = ButtonStatistics.fromPlainObject({});

			expect(stats.viewCount.toNumber()).toBe(0);
			expect(stats.likeCount.toNumber()).toBe(0);
			expect(stats.dislikeCount.toNumber()).toBe(0);
			expect(stats.lastUsedAt).toBeUndefined();
		});
	});

	describe("getTotalInteractions", () => {
		it("should sum likes and dislikes", () => {
			const stats = createStats({ likeCount: 80, dislikeCount: 20 });
			expect(stats.getTotalInteractions()).toBe(100);
		});
	});

	describe("getLikePercentage", () => {
		it("should calculate correct percentage", () => {
			const stats = createStats({ likeCount: 80, dislikeCount: 20 });
			expect(stats.getLikePercentage()).toBe(80);
		});

		it("should return 0 for no interactions", () => {
			const stats = createStats();
			expect(stats.getLikePercentage()).toBe(0);
		});
	});

	describe("getPopularityScore", () => {
		it("should calculate popularity score", () => {
			const stats = createStats({
				viewCount: 1000,
				likeCount: 100,
				dislikeCount: 10,
			});

			const score = stats.getPopularityScore();
			expect(score).toBeGreaterThan(0);
		});

		it("should return 0 for no views", () => {
			const stats = createStats();
			expect(stats.getPopularityScore()).toBe(0);
		});

		it("should normalize by log of views", () => {
			const stats1 = createStats({
				viewCount: 100,
				likeCount: 10,
				dislikeCount: 0,
			});

			const stats2 = createStats({
				viewCount: 10000,
				likeCount: 1000,
				dislikeCount: 0,
			});

			// Despite proportional likes, score per view should be lower for high view count
			const scorePerView1 = stats1.getPopularityScore() / 100;
			const scorePerView2 = stats2.getPopularityScore() / 10000;
			expect(scorePerView1).toBeGreaterThan(scorePerView2);
		});
	});

	describe("isPopular", () => {
		it("should identify popular buttons", () => {
			const stats = createStats({
				viewCount: 1000,
				likeCount: 90,
				dislikeCount: 10,
			});
			expect(stats.isPopular()).toBe(true);
		});

		it("should require minimum views", () => {
			const stats = createStats({
				viewCount: 50,
				likeCount: 45,
				dislikeCount: 5,
			});
			expect(stats.isPopular()).toBe(false);
		});

		it("should require high like percentage", () => {
			const stats = createStats({
				viewCount: 1000,
				likeCount: 50,
				dislikeCount: 50,
			});
			expect(stats.isPopular()).toBe(false);
		});

		it("should require minimum interactions", () => {
			const stats = createStats({
				viewCount: 1000,
				likeCount: 5,
				dislikeCount: 0,
			});
			expect(stats.isPopular()).toBe(false);
		});
	});

	describe("getEngagementRate", () => {
		it("should calculate engagement rate", () => {
			const stats = createStats({
				viewCount: 1000,
				likeCount: 50,
				dislikeCount: 50,
			});
			expect(stats.getEngagementRate()).toBe(0.1); // 100 interactions / 1000 views
		});

		it("should return 0 for no views", () => {
			const stats = createStats();
			expect(stats.getEngagementRate()).toBe(0);
		});
	});

	describe("update methods", () => {
		it("should increment view", () => {
			const now = new Date();
			const stats = createStats({ viewCount: 100 });
			const updated = stats.incrementView();

			expect(stats.viewCount.toNumber()).toBe(100); // Original unchanged
			expect(updated.viewCount.toNumber()).toBe(101);
			expect(updated.lastUsedAt).toBeDefined();
			expect(updated.lastUsedAt!.getTime()).toBeGreaterThanOrEqual(now.getTime());
		});

		it("should add like", () => {
			const stats = createStats({ likeCount: 10 });
			const updated = stats.addLike();

			expect(stats.likeCount.toNumber()).toBe(10); // Original unchanged
			expect(updated.likeCount.toNumber()).toBe(11);
		});

		it("should add dislike", () => {
			const stats = createStats({ dislikeCount: 5 });
			const updated = stats.addDislike();

			expect(stats.dislikeCount.toNumber()).toBe(5); // Original unchanged
			expect(updated.dislikeCount.toNumber()).toBe(6);
		});
	});

	describe("validation", () => {
		it("should be valid for correct data", () => {
			const stats = createStats({
				viewCount: 100,
				likeCount: 50,
				dislikeCount: 10,
			});
			expect(stats.isValid()).toBe(true);
			expect(stats.getValidationErrors()).toEqual([]);
		});

		it("should validate interaction count", () => {
			const stats = createStats({
				viewCount: 10,
				likeCount: 50,
				dislikeCount: 50,
			});
			expect(stats.isValid()).toBe(false);
			expect(stats.getValidationErrors()).toContain("Total interactions cannot exceed view count");
		});

		it("should allow interactions equal to views", () => {
			const stats = createStats({
				viewCount: 100,
				likeCount: 60,
				dislikeCount: 40,
			});
			expect(stats.isValid()).toBe(true);
		});
	});

	describe("toPlainObject", () => {
		it("should convert to plain object", () => {
			const lastUsed = new Date("2024-01-01T00:00:00Z");
			const stats = createStats({
				viewCount: 100,
				likeCount: 80,
				dislikeCount: 20,
				lastUsedAt: lastUsed,
			});

			expect(stats.toPlainObject()).toEqual({
				viewCount: 100,
				likeCount: 80,
				dislikeCount: 20,
				lastUsedAt: "2024-01-01T00:00:00.000Z",
			});
		});

		it("should omit undefined lastUsedAt", () => {
			const stats = createStats();
			const plain = stats.toPlainObject();

			expect(plain.lastUsedAt).toBeUndefined();
		});
	});

	describe("equals", () => {
		it("should return true for identical statistics", () => {
			const date = new Date();
			const stats1 = createStats({
				viewCount: 100,
				likeCount: 80,
				dislikeCount: 20,
				lastUsedAt: date,
			});
			const stats2 = createStats({
				viewCount: 100,
				likeCount: 80,
				dislikeCount: 20,
				lastUsedAt: date,
			});
			expect(stats1.equals(stats2)).toBe(true);
		});

		it("should return false for different counts", () => {
			const stats1 = createStats({ viewCount: 100 });
			const stats2 = createStats({ viewCount: 101 });
			expect(stats1.equals(stats2)).toBe(false);
		});

		it("should handle lastUsedAt comparison", () => {
			const stats1 = createStats({ lastUsedAt: new Date("2024-01-01") });
			const stats2 = createStats({ lastUsedAt: new Date("2024-01-02") });
			expect(stats1.equals(stats2)).toBe(false);

			const stats3 = createStats();
			const stats4 = createStats();
			expect(stats3.equals(stats4)).toBe(true);
		});
	});
});
