/**
 * Button Statistics Value Object
 *
 * Represents statistical data for an audio button including
 * view count, like/dislike counts, and calculated metrics.
 */

import { calculateRatio, formatPercentage } from "../../utils/number-parser";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * Button view count value object
 */
export class ButtonViewCount
	extends BaseValueObject<ButtonViewCount>
	implements ValidatableValueObject<ButtonViewCount>
{
	private readonly value: number;

	constructor(value: number) {
		super();
		this.value = Math.max(0, Math.floor(value));
	}

	/**
	 * Returns formatted view count with abbreviations
	 */
	toAbbreviated(): string {
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
	increment(by = 1): ButtonViewCount {
		return new ButtonViewCount(this.value + by);
	}

	toNumber(): number {
		return this.value;
	}

	toString(): string {
		return this.value.toString();
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

	clone(): ButtonViewCount {
		return new ButtonViewCount(this.value);
	}

	equals(other: ButtonViewCount): boolean {
		if (!other || !(other instanceof ButtonViewCount)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Button like count value object
 */
export class ButtonLikeCount extends BaseValueObject<ButtonLikeCount> {
	private readonly value: number;

	constructor(value: number) {
		super();
		this.value = Math.max(0, Math.floor(value));
	}

	/**
	 * Calculates like ratio
	 */
	calculateRatio(totalInteractions: number): number {
		return calculateRatio(this.value, totalInteractions);
	}

	/**
	 * Returns percentage of likes
	 */
	toPercentage(totalInteractions: number): string {
		return formatPercentage(this.value, totalInteractions);
	}

	toNumber(): number {
		return this.value;
	}

	toString(): string {
		return this.value.toString();
	}

	clone(): ButtonLikeCount {
		return new ButtonLikeCount(this.value);
	}

	equals(other: ButtonLikeCount): boolean {
		if (!other || !(other instanceof ButtonLikeCount)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Button dislike count value object
 */
export class ButtonDislikeCount extends BaseValueObject<ButtonDislikeCount> {
	private readonly value: number;

	constructor(value: number) {
		super();
		this.value = Math.max(0, Math.floor(value));
	}

	/**
	 * Calculates dislike ratio
	 */
	calculateRatio(totalInteractions: number): number {
		return calculateRatio(this.value, totalInteractions);
	}

	/**
	 * Returns percentage of dislikes
	 */
	toPercentage(totalInteractions: number): string {
		return formatPercentage(this.value, totalInteractions);
	}

	toNumber(): number {
		return this.value;
	}

	toString(): string {
		return this.value.toString();
	}

	clone(): ButtonDislikeCount {
		return new ButtonDislikeCount(this.value);
	}

	equals(other: ButtonDislikeCount): boolean {
		if (!other || !(other instanceof ButtonDislikeCount)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Composite Button Statistics value object
 */
export class ButtonStatistics
	extends BaseValueObject<ButtonStatistics>
	implements ValidatableValueObject<ButtonStatistics>
{
	constructor(
		public readonly viewCount: ButtonViewCount = new ButtonViewCount(0),
		public readonly likeCount: ButtonLikeCount = new ButtonLikeCount(0),
		public readonly dislikeCount: ButtonDislikeCount = new ButtonDislikeCount(0),
		private readonly _lastUsedAt?: Date,
	) {
		super();
	}

	/**
	 * Gets last used date
	 */
	get lastUsedAt(): Date | undefined {
		return this._lastUsedAt ? new Date(this._lastUsedAt) : undefined;
	}

	/**
	 * Creates ButtonStatistics from plain object
	 */
	static fromPlainObject(data: {
		viewCount?: number;
		likeCount?: number;
		dislikeCount?: number;
		lastUsedAt?: string | Date;
	}): ButtonStatistics {
		return new ButtonStatistics(
			new ButtonViewCount(data.viewCount || 0),
			new ButtonLikeCount(data.likeCount || 0),
			new ButtonDislikeCount(data.dislikeCount || 0),
			data.lastUsedAt ? new Date(data.lastUsedAt) : undefined,
		);
	}

	/**
	 * Calculates total interactions (likes + dislikes)
	 */
	getTotalInteractions(): number {
		return this.likeCount.toNumber() + this.dislikeCount.toNumber();
	}

	/**
	 * Calculates like percentage
	 */
	getLikePercentage(): number {
		const total = this.getTotalInteractions();
		if (total === 0) {
			return 0;
		}
		return (this.likeCount.toNumber() / total) * 100;
	}

	/**
	 * Calculates popularity score (weighted by views and likes)
	 */
	getPopularityScore(): number {
		const views = this.viewCount.toNumber();
		const likes = this.likeCount.toNumber();
		const dislikes = this.dislikeCount.toNumber();

		if (views === 0) {
			return 0;
		}

		// Weighted score: views + (likes * 2) - dislikes
		// Normalized by log of views to prevent huge buttons from dominating
		const rawScore = views + likes * 2 - dislikes;
		const normalizedScore = rawScore / Math.log10(views + 10); // +10 to avoid log(0)

		return Math.max(0, normalizedScore);
	}

	/**
	 * Checks if button is popular (based on like ratio and view count)
	 */
	isPopular(): boolean {
		const likePercentage = this.getLikePercentage();
		const views = this.viewCount.toNumber();
		const interactions = this.getTotalInteractions();

		// Popular if:
		// - Has at least 100 views AND
		// - Like percentage is >= 80% AND
		// - Has at least 10 interactions
		return views >= 100 && likePercentage >= 80 && interactions >= 10;
	}

	/**
	 * Returns engagement rate (interactions / views)
	 */
	getEngagementRate(): number {
		const views = this.viewCount.toNumber();
		if (views === 0) {
			return 0;
		}
		return this.getTotalInteractions() / views;
	}

	/**
	 * Updates statistics with view increment
	 */
	incrementView(): ButtonStatistics {
		return new ButtonStatistics(
			this.viewCount.increment(),
			this.likeCount,
			this.dislikeCount,
			new Date(),
		);
	}

	/**
	 * Updates statistics with like
	 */
	addLike(): ButtonStatistics {
		return new ButtonStatistics(
			this.viewCount,
			new ButtonLikeCount(this.likeCount.toNumber() + 1),
			this.dislikeCount,
			this._lastUsedAt,
		);
	}

	/**
	 * Updates statistics with dislike
	 */
	addDislike(): ButtonStatistics {
		return new ButtonStatistics(
			this.viewCount,
			this.likeCount,
			new ButtonDislikeCount(this.dislikeCount.toNumber() + 1),
			this._lastUsedAt,
		);
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

		// Validate logical constraints
		const views = this.viewCount.toNumber();
		const likes = this.likeCount.toNumber();
		const dislikes = this.dislikeCount.toNumber();

		// Interactions shouldn't exceed views (though this is more of a business rule)
		if (likes + dislikes > views && views > 0) {
			errors.push("Total interactions cannot exceed view count");
		}

		return errors;
	}

	/**
	 * Returns a plain object representation
	 */
	toPlainObject(): {
		viewCount: number;
		likeCount: number;
		dislikeCount: number;
		lastUsedAt?: string;
	} {
		const result: {
			viewCount: number;
			likeCount: number;
			dislikeCount: number;
			lastUsedAt?: string;
		} = {
			viewCount: this.viewCount.toNumber(),
			likeCount: this.likeCount.toNumber(),
			dislikeCount: this.dislikeCount.toNumber(),
		};

		if (this._lastUsedAt) {
			result.lastUsedAt = this._lastUsedAt.toISOString();
		}

		return result;
	}

	clone(): ButtonStatistics {
		return new ButtonStatistics(
			this.viewCount.clone(),
			this.likeCount.clone(),
			this.dislikeCount.clone(),
			this._lastUsedAt ? new Date(this._lastUsedAt) : undefined,
		);
	}

	equals(other: ButtonStatistics): boolean {
		if (!other || !(other instanceof ButtonStatistics)) {
			return false;
		}

		const lastUsedEquals = (() => {
			if (this._lastUsedAt === undefined && other._lastUsedAt === undefined) {
				return true;
			}
			if (this._lastUsedAt === undefined || other._lastUsedAt === undefined) {
				return false;
			}
			return this._lastUsedAt.getTime() === other._lastUsedAt.getTime();
		})();

		return (
			this.viewCount.equals(other.viewCount) &&
			this.likeCount.equals(other.likeCount) &&
			this.dislikeCount.equals(other.dislikeCount) &&
			lastUsedEquals
		);
	}
}
