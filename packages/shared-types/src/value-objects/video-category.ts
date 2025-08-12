/**
 * Video Category Value Object
 *
 * Represents a YouTube video category.
 * YouTube has predefined category IDs (e.g., "22" for "People & Blogs").
 */

import { requireNonEmptyString } from "./base/transforms";
import { BaseValueObject, type ValidatableValueObject } from "./base/value-object";

/**
 * Predefined YouTube categories (commonly used)
 */
export const YOUTUBE_CATEGORIES = {
	"1": "Film & Animation",
	"2": "Autos & Vehicles",
	"10": "Music",
	"15": "Pets & Animals",
	"17": "Sports",
	"19": "Travel & Events",
	"20": "Gaming",
	"22": "People & Blogs",
	"23": "Comedy",
	"24": "Entertainment",
	"25": "News & Politics",
	"26": "Howto & Style",
	"27": "Education",
	"28": "Science & Technology",
} as const;

export type CategoryId = keyof typeof YOUTUBE_CATEGORIES;

/**
 * Video Category value object
 */
export class VideoCategory
	extends BaseValueObject<VideoCategory>
	implements ValidatableValueObject<VideoCategory>
{
	private readonly value: string;

	constructor(value: string) {
		super();
		this.value = requireNonEmptyString(value, "categoryId").trim();
	}

	/**
	 * Returns the category name in Japanese
	 */
	toJapaneseName(): string {
		// Map common categories to Japanese names
		const japaneseNames: Record<string, string> = {
			"1": "映画とアニメーション",
			"2": "車と乗り物",
			"10": "音楽",
			"15": "ペットと動物",
			"17": "スポーツ",
			"19": "旅行とイベント",
			"20": "ゲーム",
			"22": "ブログ",
			"23": "コメディ",
			"24": "エンターテイメント",
			"25": "ニュースと政治",
			"26": "ハウツーとスタイル",
			"27": "教育",
			"28": "科学と技術",
		};

		return japaneseNames[this.value] || this.getEnglishName();
	}

	/**
	 * Returns the category name in English
	 */
	getEnglishName(): string {
		return YOUTUBE_CATEGORIES[this.value as CategoryId] || `Category ${this.value}`;
	}

	/**
	 * Returns the numeric category ID
	 */
	toNumber(): number {
		return Number.parseInt(this.value, 10);
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Check if it's a valid numeric string
		if (!/^\d+$/.test(this.value)) {
			errors.push("Category ID must be numeric");
		}

		return errors;
	}

	toString(): string {
		return this.toJapaneseName();
	}

	/**
	 * Returns the raw category ID
	 */
	toId(): string {
		return this.value;
	}

	toPlainObject(): string {
		return this.value;
	}

	clone(): VideoCategory {
		return new VideoCategory(this.value);
	}

	equals(other: VideoCategory): boolean {
		if (!other || !(other instanceof VideoCategory)) {
			return false;
		}
		return this.value === other.value;
	}
}
