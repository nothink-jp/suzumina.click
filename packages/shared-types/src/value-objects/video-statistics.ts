/**
 * Video Statistics Value Object
 *
 * Represents statistical information about a video including
 * view count, like count, dislike count, comment count, and other metrics.
 */

import { BaseValueObject, type ValidatableValueObject } from "./base/value-object";

/**
 * View count value object
 */
export class ViewCount
	extends BaseValueObject<ViewCount>
	implements ValidatableValueObject<ViewCount>
{
	private readonly value: number;

	constructor(value: number) {
		super();
		this.value = Math.max(0, Math.floor(value));
	}

	/**
	 * Returns formatted view count with abbreviations
	 * e.g., 1234567 → "1.2M"
	 */
	toAbbreviated(): string {
		if (this.value >= 1_000_000_000) {
			return `${(this.value / 1_000_000_000).toFixed(1)}B`;
		}
		if (this.value >= 1_000_000) {
			return `${(this.value / 1_000_000).toFixed(1)}M`;
		}
		if (this.value >= 1_000) {
			return `${(this.value / 1_000).toFixed(1)}K`;
		}
		return this.value.toString();
	}

	/**
	 * Returns formatted view count with locale
	 */
	toLocaleString(locale = "ja-JP"): string {
		return this.value.toLocaleString(locale);
	}

	/**
	 * Increments view count
	 */
	increment(by = 1): ViewCount {
		return new ViewCount(this.value + by);
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];
		if (this.value < 0) {
			errors.push("View count cannot be negative");
		}
		if (!Number.isInteger(this.value)) {
			errors.push("View count must be an integer");
		}
		return errors;
	}

	toNumber(): number {
		return this.value;
	}

	toString(): string {
		return this.value.toString();
	}

	clone(): ViewCount {
		return new ViewCount(this.value);
	}

	equals(other: ViewCount): boolean {
		if (!other || !(other instanceof ViewCount)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Like count value object
 */
export class LikeCount extends BaseValueObject<LikeCount> {
	private readonly value: number;

	constructor(value: number) {
		super();
		this.value = Math.max(0, Math.floor(value));
	}

	/**
	 * Calculates like ratio
	 */
	calculateRatio(totalInteractions: number): number {
		if (totalInteractions === 0) {
			return 0;
		}
		return this.value / totalInteractions;
	}

	/**
	 * Returns percentage of likes
	 */
	toPercentage(totalInteractions: number): string {
		const ratio = this.calculateRatio(totalInteractions);
		return `${(ratio * 100).toFixed(1)}%`;
	}

	toNumber(): number {
		return this.value;
	}

	toString(): string {
		return this.value.toString();
	}

	clone(): LikeCount {
		return new LikeCount(this.value);
	}

	equals(other: LikeCount): boolean {
		if (!other || !(other instanceof LikeCount)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Dislike count value object
 */
export class DislikeCount extends BaseValueObject<DislikeCount> {
	private readonly value: number;

	constructor(value: number) {
		super();
		this.value = Math.max(0, Math.floor(value));
	}

	/**
	 * Calculates dislike ratio
	 */
	calculateRatio(totalInteractions: number): number {
		if (totalInteractions === 0) {
			return 0;
		}
		return this.value / totalInteractions;
	}

	/**
	 * Returns percentage of dislikes
	 */
	toPercentage(totalInteractions: number): string {
		const ratio = this.calculateRatio(totalInteractions);
		return `${(ratio * 100).toFixed(1)}%`;
	}

	toNumber(): number {
		return this.value;
	}

	toString(): string {
		return this.value.toString();
	}

	clone(): DislikeCount {
		return new DislikeCount(this.value);
	}

	equals(other: DislikeCount): boolean {
		if (!other || !(other instanceof DislikeCount)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Comment count value object
 */
export class CommentCount extends BaseValueObject<CommentCount> {
	private readonly value: number;

	constructor(value: number) {
		super();
		this.value = Math.max(0, Math.floor(value));
	}

	/**
	 * Checks if comments are disabled
	 */
	isDisabled(): boolean {
		return this.value === 0;
	}

	toNumber(): number {
		return this.value;
	}

	toString(): string {
		return this.value.toString();
	}

	clone(): CommentCount {
		return new CommentCount(this.value);
	}

	equals(other: CommentCount): boolean {
		if (!other || !(other instanceof CommentCount)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Composite Video Statistics value object
 */
export class VideoStatistics
	extends BaseValueObject<VideoStatistics>
	implements ValidatableValueObject<VideoStatistics>
{
	constructor(
		public readonly viewCount: ViewCount,
		public readonly likeCount?: LikeCount,
		public readonly dislikeCount?: DislikeCount,
		public readonly favoriteCount?: number,
		public readonly commentCount?: CommentCount,
	) {
		super();
	}

	/**
	 * Creates VideoStatistics from plain object
	 */
	static fromPlainObject(data: {
		viewCount: string | number;
		likeCount?: string | number;
		dislikeCount?: string | number;
		favoriteCount?: string | number;
		commentCount?: string | number;
	}): VideoStatistics {
		return new VideoStatistics(
			new ViewCount(Number(data.viewCount)),
			data.likeCount !== undefined ? new LikeCount(Number(data.likeCount)) : undefined,
			data.dislikeCount !== undefined ? new DislikeCount(Number(data.dislikeCount)) : undefined,
			data.favoriteCount !== undefined ? Number(data.favoriteCount) : undefined,
			data.commentCount !== undefined ? new CommentCount(Number(data.commentCount)) : undefined,
		);
	}

	/**
	 * Calculates total interactions (likes + dislikes)
	 */
	getTotalInteractions(): number {
		const likes = this.likeCount?.toNumber() ?? 0;
		const dislikes = this.dislikeCount?.toNumber() ?? 0;
		return likes + dislikes;
	}

	/**
	 * Calculates like percentage
	 */
	getLikePercentage(): number {
		const total = this.getTotalInteractions();
		if (total === 0) {
			return 0;
		}
		return ((this.likeCount?.toNumber() ?? 0) / total) * 100;
	}

	/**
	 * Returns engagement metrics
	 */
	getEngagementMetrics(): {
		viewCount: number;
		likeRatio: number;
		commentRatio: number;
		engagementRate: number;
	} {
		const views = this.viewCount.toNumber();
		const likes = this.likeCount?.toNumber() ?? 0;
		const comments = this.commentCount?.toNumber() ?? 0;

		return {
			viewCount: views,
			likeRatio: views > 0 ? likes / views : 0,
			commentRatio: views > 0 ? comments / views : 0,
			engagementRate: views > 0 ? (likes + comments) / views : 0,
		};
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Validate view count
		if (!this.viewCount.isValid()) {
			errors.push(...this.viewCount.getValidationErrors().map((e) => `ViewCount: ${e}`));
		}

		// Basic logical validations
		const likes = this.likeCount?.toNumber() ?? 0;
		const views = this.viewCount.toNumber();
		if (likes > views) {
			errors.push("Like count cannot exceed view count");
		}

		return errors;
	}

	/**
	 * Returns a plain object representation
	 */
	toPlainObject(): {
		viewCount: number;
		likeCount?: number;
		dislikeCount?: number;
		favoriteCount?: number;
		commentCount?: number;
	} {
		return {
			viewCount: this.viewCount.toNumber(),
			likeCount: this.likeCount?.toNumber(),
			dislikeCount: this.dislikeCount?.toNumber(),
			favoriteCount: this.favoriteCount,
			commentCount: this.commentCount?.toNumber(),
		};
	}

	clone(): VideoStatistics {
		return new VideoStatistics(
			this.viewCount.clone(),
			this.likeCount?.clone(),
			this.dislikeCount?.clone(),
			this.favoriteCount,
			this.commentCount?.clone(),
		);
	}

	equals(other: VideoStatistics): boolean {
		if (!other || !(other instanceof VideoStatistics)) {
			return false;
		}

		// Handle optional field comparisons
		const likeCountEquals = (() => {
			if (this.likeCount === undefined && other.likeCount === undefined) {
				return true;
			}
			if (this.likeCount === undefined || other.likeCount === undefined) {
				return false;
			}
			return this.likeCount.equals(other.likeCount);
		})();

		const dislikeCountEquals = (() => {
			if (this.dislikeCount === undefined && other.dislikeCount === undefined) {
				return true;
			}
			if (this.dislikeCount === undefined || other.dislikeCount === undefined) {
				return false;
			}
			return this.dislikeCount.equals(other.dislikeCount);
		})();

		const commentCountEquals = (() => {
			if (this.commentCount === undefined && other.commentCount === undefined) {
				return true;
			}
			if (this.commentCount === undefined || other.commentCount === undefined) {
				return false;
			}
			return this.commentCount.equals(other.commentCount);
		})();

		return (
			this.viewCount.equals(other.viewCount) &&
			likeCountEquals &&
			dislikeCountEquals &&
			this.favoriteCount === other.favoriteCount &&
			commentCountEquals
		);
	}
}
