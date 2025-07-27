/**
 * Work Rating Value Object
 *
 * Immutable value object representing work rating information
 */
export class WorkRating {
	constructor(
		private readonly _stars: number,
		private readonly _count: number,
		private readonly _average: number,
		private readonly _reviewCount?: number,
		private readonly _distribution?: Record<number, number>,
	) {
		if (_stars < 0 || _stars > 5) {
			throw new Error("Stars must be between 0 and 5");
		}
		if (_count < 0) {
			throw new Error("Count cannot be negative");
		}
		if (_average < 0 || _average > 5) {
			throw new Error("Average must be between 0 and 5");
		}
		if (_reviewCount !== undefined && _reviewCount < 0) {
			throw new Error("Review count cannot be negative");
		}
	}

	get stars(): number {
		return this._stars;
	}

	get count(): number {
		return this._count;
	}

	get average(): number {
		return this._average;
	}

	get reviewCount(): number | undefined {
		return this._reviewCount;
	}

	get distribution(): Record<number, number> | undefined {
		return this._distribution ? { ...this._distribution } : undefined;
	}

	/**
	 * Checks if has any ratings
	 */
	hasRatings(): boolean {
		return this._count > 0;
	}

	/**
	 * Checks if is highly rated (4.0 or above)
	 */
	isHighlyRated(): boolean {
		return this._average >= 4.0;
	}

	/**
	 * Gets rating reliability based on count
	 */
	getReliability(): "high" | "medium" | "low" | "insufficient" {
		if (this._count >= 100) return "high";
		if (this._count >= 50) return "medium";
		if (this._count >= 10) return "low";
		return "insufficient";
	}

	/**
	 * Gets display stars (rounded)
	 */
	getDisplayStars(): number {
		return Math.round(this._stars);
	}

	/**
	 * Gets percentage (0-100)
	 */
	getPercentage(): number {
		return (this._average / 5) * 100;
	}

	/**
	 * Formats rating for display
	 */
	format(): string {
		return `★${this._average.toFixed(1)} (${this._count}件)`;
	}

	/**
	 * Formats with review count if available
	 */
	formatWithReviews(): string {
		if (this._reviewCount !== undefined && this._reviewCount > 0) {
			return `★${this._average.toFixed(1)} (${this._count}件の評価, ${this._reviewCount}件のレビュー)`;
		}
		return this.format();
	}

	/**
	 * Returns string representation
	 */
	toString(): string {
		return this.formatWithReviews();
	}

	/**
	 * Returns JSON representation
	 */
	toJSON() {
		return {
			stars: this._stars,
			count: this._count,
			average: this._average,
			...(this._reviewCount !== undefined && { reviewCount: this._reviewCount }),
			...(this._distribution && { distribution: this._distribution }),
		};
	}

	/**
	 * Converts to plain object
	 */
	toPlainObject() {
		return {
			stars: this._stars,
			count: this._count,
			average: this._average,
			reviewCount: this._reviewCount,
			distribution: this.distribution,
			hasRatings: this.hasRatings(),
			isHighlyRated: this.isHighlyRated(),
			reliability: this.getReliability(),
			formattedRating: this.format(),
		};
	}

	equals(other: WorkRating): boolean {
		if (!(other instanceof WorkRating)) return false;

		// Basic properties comparison
		if (
			this._stars !== other._stars ||
			this._count !== other._count ||
			this._average !== other._average ||
			this._reviewCount !== other._reviewCount
		) {
			return false;
		}

		// Distribution comparison
		if (!this._distribution && !other._distribution) return true;
		if (!this._distribution || !other._distribution) return false;

		const keys1 = Object.keys(this._distribution);
		const keys2 = Object.keys(other._distribution);
		if (keys1.length !== keys2.length) return false;

		return keys1.every((key) => {
			const numKey = Number(key);
			return this._distribution?.[numKey] === other._distribution?.[numKey];
		});
	}

	/**
	 * Creates from DLsite API rating (10-50 scale)
	 */
	static fromDLsiteRating(
		apiRating: number,
		count: number,
		reviewCount?: number,
		distribution?: Record<string, number>,
	): WorkRating {
		const stars = apiRating / 10; // Convert 10-50 to 1-5
		const average = stars;

		// Convert distribution keys to numbers
		let numericDistribution: Record<number, number> | undefined;
		if (distribution) {
			numericDistribution = {};
			for (const [key, value] of Object.entries(distribution)) {
				numericDistribution[Number.parseInt(key, 10)] = value;
			}
		}

		return new WorkRating(stars, count, average, reviewCount, numericDistribution);
	}

	/**
	 * Creates from legacy rating info
	 */
	static fromLegacyRatingInfo(ratingInfo?: {
		stars: number;
		count: number;
		reviewCount?: number;
		ratingDetail?: Array<{
			review_point: number;
			count: number;
			ratio: number;
		}>;
		averageDecimal?: number;
	}): WorkRating | undefined {
		if (!ratingInfo) return undefined;

		// Convert rating detail to distribution
		let distribution: Record<number, number> | undefined;
		if (ratingInfo.ratingDetail) {
			distribution = {};
			for (const detail of ratingInfo.ratingDetail) {
				distribution[detail.review_point] = detail.count;
			}
		}

		const average = ratingInfo.averageDecimal || ratingInfo.stars;

		return new WorkRating(
			ratingInfo.stars,
			ratingInfo.count,
			average,
			ratingInfo.reviewCount,
			distribution,
		);
	}

	/**
	 * Creates an empty rating
	 */
	static empty(): WorkRating {
		return new WorkRating(0, 0, 0);
	}
}
