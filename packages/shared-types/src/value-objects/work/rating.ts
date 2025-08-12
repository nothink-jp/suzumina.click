import { z } from "zod";
import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * Rating distribution interface
 */
interface RatingDistribution {
	1: number;
	2: number;
	3: number;
	4: number;
	5: number;
}

/**
 * Rating data interface for internal use
 */
interface RatingData {
	stars: number;
	count: number;
	average: number;
	distribution?: RatingDistribution;
}

/**
 * Rating Value Object
 *
 * 不変で評価情報を表現する値オブジェクト
 * DLsite作品の評価データを扱う
 * Enhanced with BaseValueObject and Result pattern for type safety
 */
export class RatingValueObject
	extends BaseValueObject<RatingValueObject>
	implements ValidatableValueObject<RatingValueObject>
{
	private constructor(private readonly data: RatingData) {
		super();
	}

	/**
	 * Creates a Rating with validation
	 * @param data - The rating data
	 * @returns Result containing Rating or ValidationError
	 */
	static create(data: {
		stars: number;
		count: number;
		average: number;
		distribution?: RatingDistribution;
	}): Result<RatingValueObject, ValidationError> {
		const validation = RatingValueObject.validate(data);
		if (!validation.isValid) {
			return err(validationError("rating", validation.error ?? "評価の検証に失敗しました"));
		}

		return ok(new RatingValueObject(data));
	}

	/**
	 * Creates a Rating from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing Rating or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<RatingValueObject, ValidationError> {
		if (!obj || typeof obj !== "object") {
			return err(validationError("rating", "Rating data must be an object"));
		}

		const data = obj as Record<string, unknown>;

		if (
			typeof data.stars !== "number" ||
			typeof data.count !== "number" ||
			typeof data.average !== "number"
		) {
			return err(
				validationError("rating", "Rating must have stars, count, and average as numbers"),
			);
		}

		const ratingData: RatingData = {
			stars: data.stars,
			count: data.count,
			average: data.average,
		};

		if (data.distribution && typeof data.distribution === "object") {
			const dist = data.distribution as Record<string, unknown>;
			if (RatingValueObject.isValidDistribution(dist)) {
				ratingData.distribution = dist as unknown as RatingDistribution;
			}
		}

		return RatingValueObject.create(ratingData);
	}

	/**
	 * Validates rating data
	 */
	private static validate(data: RatingData): { isValid: boolean; error?: string } {
		if (data.stars < 0 || data.stars > 5) {
			return { isValid: false, error: "Stars must be between 0 and 5" };
		}

		if (data.count < 0 || !Number.isInteger(data.count)) {
			return { isValid: false, error: "Count must be a non-negative integer" };
		}

		if (data.average < 0 || data.average > 5) {
			return { isValid: false, error: "Average must be between 0 and 5" };
		}

		if (data.distribution && !RatingValueObject.isValidDistribution(data.distribution)) {
			return { isValid: false, error: "Distribution must contain valid rating counts" };
		}

		return { isValid: true };
	}

	/**
	 * Validates distribution object
	 */
	private static isValidDistribution(dist: unknown): boolean {
		if (!dist || typeof dist !== "object") return false;
		const d = dist as Record<string, unknown>;
		for (const key of ["1", "2", "3", "4", "5"]) {
			if (typeof d[key] !== "number" || d[key] < 0 || !Number.isInteger(d[key])) {
				return false;
			}
		}
		return true;
	}

	// Accessors

	get stars(): number {
		return this.data.stars;
	}

	get count(): number {
		return this.data.count;
	}

	get average(): number {
		return this.data.average;
	}

	get distribution(): RatingDistribution | undefined {
		return this.data.distribution ? { ...this.data.distribution } : undefined;
	}

	// Business logic methods

	/**
	 * 評価があるかどうか
	 */
	hasRatings(): boolean {
		return this.data.count > 0;
	}

	/**
	 * 高評価かどうか（4.0以上）
	 */
	isHighlyRated(): boolean {
		return this.data.average >= 4.0;
	}

	/**
	 * 評価の信頼性（評価数ベース）
	 */
	reliability(): RatingReliability {
		if (this.data.count >= 100) return "high";
		if (this.data.count >= 50) return "medium";
		if (this.data.count >= 10) return "low";
		return "insufficient";
	}

	/**
	 * 星数の整数表現（表示用）
	 */
	displayStars(): number {
		return Math.round(this.data.stars);
	}

	/**
	 * パーセンテージ表現（0-100）
	 */
	percentage(): number {
		return (this.data.average / 5) * 100;
	}

	/**
	 * フォーマット済み文字列
	 */
	format(): string {
		return `★${this.data.average.toFixed(1)} (${this.data.count}件)`;
	}

	// ValidatableValueObject implementation

	isValid(): boolean {
		return RatingValueObject.validate(this.data).isValid;
	}

	getValidationErrors(): string[] {
		const validation = RatingValueObject.validate(this.data);
		return validation.isValid ? [] : [validation.error ?? "評価の検証に失敗しました"];
	}

	// BaseValueObject implementation

	equals(other: RatingValueObject): boolean {
		if (!other || !(other instanceof RatingValueObject)) {
			return false;
		}

		return (
			this.data.stars === other.data.stars &&
			this.data.count === other.data.count &&
			this.data.average === other.data.average
		);
	}

	clone(): RatingValueObject {
		return new RatingValueObject({
			stars: this.data.stars,
			count: this.data.count,
			average: this.data.average,
			distribution: this.data.distribution ? { ...this.data.distribution } : undefined,
		});
	}

	toPlainObject(): RatingData {
		return {
			stars: this.data.stars,
			count: this.data.count,
			average: this.data.average,
			distribution: this.data.distribution ? { ...this.data.distribution } : undefined,
		};
	}
}

export type RatingReliability = "high" | "medium" | "low" | "insufficient";

/**
 * 評価統計
 */
export const RatingStatistics = z.object({
	/** 総評価数 */
	totalCount: z.number().int().min(0),
	/** 平均評価 */
	averageRating: z.number().min(0).max(5),
	/** 中央値 */
	median: z.number().min(1).max(5),
	/** 最頻値 */
	mode: z.number().min(1).max(5),
	/** 標準偏差 */
	standardDeviation: z.number().min(0),
});

export type RatingStatistics = z.infer<typeof RatingStatistics>;

/**
 * 評価集計ユーティリティ
 */
export const RatingAggregation = {
	/**
	 * 複数の評価から統計を計算
	 */
	calculateStatistics: (ratings: number[]): RatingStatistics | null => {
		if (ratings.length === 0) return null;

		const sum = ratings.reduce((acc, val) => acc + val, 0);
		const average = sum / ratings.length;

		// 中央値を計算
		const sorted = [...ratings].sort((a, b) => a - b);
		const midIndex = Math.floor(sorted.length / 2);
		const median =
			sorted.length % 2 === 0
				? ((sorted[midIndex - 1] ?? 0) + (sorted[midIndex] ?? 0)) / 2
				: (sorted[midIndex] ?? 0);

		// 最頻値を計算
		const frequency = ratings.reduce(
			(acc, val) => {
				acc[val] = (acc[val] || 0) + 1;
				return acc;
			},
			{} as Record<number, number>,
		);
		const modeEntry = Object.entries(frequency).sort(([, a], [, b]) => b - a)[0];
		const mode = modeEntry ? Number(modeEntry[0]) : sorted[Math.floor(sorted.length / 2)];

		// 標準偏差を計算
		const variance = ratings.reduce((acc, val) => acc + (val - average) ** 2, 0) / ratings.length;
		const standardDeviation = Math.sqrt(variance);

		return RatingStatistics.parse({
			totalCount: ratings.length,
			averageRating: average,
			median,
			mode,
			standardDeviation,
		});
	},

	/**
	 * DLsite APIの評価値（10-50）を1-5に変換
	 */
	fromDLsiteRating: (apiRating: number): number => {
		return apiRating / 10;
	},

	/**
	 * 評価分布から平均を計算
	 */
	calculateAverageFromDistribution: (distribution: Record<number, number>): number => {
		let totalScore = 0;
		let totalCount = 0;

		for (const [rating, count] of Object.entries(distribution)) {
			totalScore += Number(rating) * count;
			totalCount += count;
		}

		return totalCount > 0 ? totalScore / totalCount : 0;
	},
};

// Type alias for backward compatibility
export type Rating = RatingValueObject;
