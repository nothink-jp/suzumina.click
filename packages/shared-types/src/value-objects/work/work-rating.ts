/**
 * Work Rating Value Object
 *
 * Immutable value object representing work rating information
 * Refactored to use BaseValueObject and Result pattern for type safety
 */

import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import type { WorkRatingPlain } from "../../plain-objects/work-plain";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * WorkRating data structure
 */
interface WorkRatingData {
	stars: number;
	count: number;
	average: number;
	reviewCount?: number;
	distribution?: Record<number, number>;
}

/**
 * WorkRating Value Object with enhanced type safety
 */
export class WorkRating
	extends BaseValueObject<WorkRating>
	implements ValidatableValueObject<WorkRating>
{
	private constructor(
		private readonly _stars: number,
		private readonly _count: number,
		private readonly _average: number,
		private readonly _reviewCount?: number,
		private readonly _distribution?: Record<number, number>,
	) {
		super();
	}

	/**
	 * Creates a WorkRating with validation
	 * @param stars - Star rating (0-5)
	 * @param count - Number of ratings
	 * @param average - Average rating (0-5)
	 * @param reviewCount - Optional number of reviews
	 * @param distribution - Optional rating distribution
	 * @returns Result containing WorkRating or ValidationError
	 */
	static create(
		stars: number,
		count: number,
		average: number,
		reviewCount?: number,
		distribution?: Record<number, number>,
	): Result<WorkRating, ValidationError> {
		const validation = WorkRating.validate({ stars, count, average, reviewCount, distribution });
		if (!validation.isValid) {
			return err(validationError("workRating", validation.error ?? "評価の検証に失敗しました"));
		}
		return ok(new WorkRating(stars, count, average, reviewCount, distribution));
	}

	/**
	 * Creates a WorkRating from data object
	 * @param data - WorkRating data object
	 * @returns Result containing WorkRating or ValidationError
	 */
	static fromData(data: WorkRatingData): Result<WorkRating, ValidationError> {
		return WorkRating.create(
			data.stars,
			data.count,
			data.average,
			data.reviewCount,
			data.distribution,
		);
	}

	/**
	 * Creates a WorkRating from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing WorkRating or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<WorkRating, ValidationError> {
		if (typeof obj !== "object" || obj === null) {
			return err(validationError("workRating", "WorkRating must be an object"));
		}

		const data = obj as Record<string, unknown>;

		if (typeof data.stars !== "number") {
			return err(validationError("stars", "Stars must be a number"));
		}
		if (typeof data.count !== "number") {
			return err(validationError("count", "Count must be a number"));
		}
		if (typeof data.average !== "number") {
			return err(validationError("average", "Average must be a number"));
		}

		const reviewCount = typeof data.reviewCount === "number" ? data.reviewCount : undefined;
		const distribution =
			data.distribution && typeof data.distribution === "object"
				? (data.distribution as Record<number, number>)
				: undefined;

		return WorkRating.create(data.stars, data.count, data.average, reviewCount, distribution);
	}

	/**
	 * Validates WorkRating data
	 */
	private static validate(data: {
		stars: number;
		count: number;
		average: number;
		reviewCount?: number;
		distribution?: Record<number, number>;
	}): { isValid: boolean; error?: string } {
		if (data.stars < 0 || data.stars > 5) {
			return { isValid: false, error: "Stars must be between 0 and 5" };
		}
		if (data.count < 0) {
			return { isValid: false, error: "Count cannot be negative" };
		}
		if (data.average < 0 || data.average > 5) {
			return { isValid: false, error: "Average must be between 0 and 5" };
		}
		if (data.reviewCount !== undefined && data.reviewCount < 0) {
			return { isValid: false, error: "Review count cannot be negative" };
		}
		return { isValid: true };
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

	// ValidatableValueObject implementation

	isValid(): boolean {
		return WorkRating.validate({
			stars: this._stars,
			count: this._count,
			average: this._average,
			reviewCount: this._reviewCount,
			distribution: this._distribution,
		}).isValid;
	}

	getValidationErrors(): string[] {
		const validation = WorkRating.validate({
			stars: this._stars,
			count: this._count,
			average: this._average,
			reviewCount: this._reviewCount,
			distribution: this._distribution,
		});
		return validation.isValid ? [] : [validation.error ?? "評価の検証に失敗しました"];
	}

	// BaseValueObject implementation

	equals(other: WorkRating): boolean {
		if (!other || !(other instanceof WorkRating)) {
			return false;
		}

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

	clone(): WorkRating {
		const distributionCopy = this._distribution ? { ...this._distribution } : undefined;
		return new WorkRating(
			this._stars,
			this._count,
			this._average,
			this._reviewCount,
			distributionCopy,
		);
	}

	toPlainObject(): WorkRatingPlain {
		return {
			stars: this._stars,
			count: this._count,
			average: this._average,
			reviewCount: this._reviewCount,
			distribution: this._distribution ? { ...this._distribution } : undefined,
			hasRatings: this.hasRatings(),
			isHighlyRated: this.isHighlyRated(),
			reliability: this.getReliability(),
			formattedRating: this.format(),
		};
	}

	/**
	 * Creates from DLsite API rating (10-50 scale)
	 * @param apiRating - API rating (10-50)
	 * @param count - Number of ratings
	 * @param reviewCount - Optional review count
	 * @param distribution - Optional distribution
	 * @returns Result containing WorkRating or ValidationError
	 */
	static fromDLsiteRating(
		apiRating: number,
		count: number,
		reviewCount?: number,
		distribution?: Record<string, number>,
	): Result<WorkRating, ValidationError> {
		// Validate DLsite API rating range
		if (apiRating < 10 || apiRating > 50) {
			return err(validationError("apiRating", "DLsite評価は10-50の範囲である必要があります"));
		}

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

		return WorkRating.create(stars, count, average, reviewCount, numericDistribution);
	}

	/**
	 * Creates an empty rating
	 * @returns Result containing empty WorkRating or ValidationError
	 */
	static empty(): Result<WorkRating, ValidationError> {
		return WorkRating.create(0, 0, 0);
	}
}
