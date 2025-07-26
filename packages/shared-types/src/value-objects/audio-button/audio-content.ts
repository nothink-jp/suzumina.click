/**
 * Audio Content Value Object
 *
 * Represents the content and metadata of an audio button.
 * Handles text display, categorization, and search functionality.
 */

import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * Button text value object
 */
export class ButtonText
	extends BaseValueObject<ButtonText>
	implements ValidatableValueObject<ButtonText>
{
	private readonly value: string;

	constructor(value: string) {
		super();
		const trimmed = value.trim();
		if (!trimmed) {
			throw new Error("Button text cannot be empty");
		}
		if (trimmed.length > 200) {
			throw new Error("Button text cannot exceed 200 characters");
		}
		this.value = trimmed;
	}

	toString(): string {
		return this.value;
	}

	/**
	 * Returns truncated text for display
	 */
	toDisplayString(maxLength = 50): string {
		if (this.value.length <= maxLength) {
			return this.value;
		}
		return `${this.value.slice(0, maxLength)}...`;
	}

	/**
	 * Returns text length
	 */
	length(): number {
		return this.value.length;
	}

	/**
	 * Converts to searchable text (lowercase, normalized)
	 */
	toSearchableText(): string {
		return this.value
			.toLowerCase()
			.normalize("NFKC") // Normalize unicode characters
			.replace(/[\s　]+/g, " "); // Normalize whitespace
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];
		if (!this.value || this.value.trim().length === 0) {
			errors.push("Button text cannot be empty");
		}
		if (this.value.length > 200) {
			errors.push("Button text cannot exceed 200 characters");
		}
		return errors;
	}

	clone(): ButtonText {
		return new ButtonText(this.value);
	}

	equals(other: ButtonText): boolean {
		if (!other || !(other instanceof ButtonText)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Button category value object
 */
export class ButtonCategory extends BaseValueObject<ButtonCategory> {
	private static readonly VALID_CATEGORIES = [
		"greeting",
		"reaction",
		"emotion",
		"action",
		"sound",
		"other",
	] as const;

	public static readonly GREETING = "greeting" as const;
	public static readonly REACTION = "reaction" as const;
	public static readonly EMOTION = "emotion" as const;
	public static readonly ACTION = "action" as const;
	public static readonly SOUND = "sound" as const;
	public static readonly OTHER = "other" as const;

	private readonly value: string;

	constructor(value: string) {
		super();
		if (!ButtonCategory.isValidCategory(value)) {
			throw new Error(`Invalid category: ${value}`);
		}
		this.value = value;
	}

	private static isValidCategory(value: string): boolean {
		return (ButtonCategory.VALID_CATEGORIES as readonly string[]).includes(value);
	}

	toString(): string {
		return this.value;
	}

	/**
	 * Returns display name for the category
	 */
	toDisplayName(): string {
		const displayNames: Record<string, string> = {
			greeting: "挨拶",
			reaction: "リアクション",
			emotion: "感情",
			action: "アクション",
			sound: "効果音",
			other: "その他",
		};
		return displayNames[this.value] || this.value;
	}

	/**
	 * Returns emoji icon for the category
	 */
	toEmoji(): string {
		const emojis: Record<string, string> = {
			greeting: "👋",
			reaction: "💬",
			emotion: "😊",
			action: "🎬",
			sound: "🔊",
			other: "📌",
		};
		return emojis[this.value] || "📌";
	}

	/**
	 * Gets all valid categories
	 */
	static getAllCategories(): ButtonCategory[] {
		return ButtonCategory.VALID_CATEGORIES.map((cat) => new ButtonCategory(cat));
	}

	clone(): ButtonCategory {
		return new ButtonCategory(this.value);
	}

	equals(other: ButtonCategory): boolean {
		if (!other || !(other instanceof ButtonCategory)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Button tags collection value object
 */
export class ButtonTags
	extends BaseValueObject<ButtonTags>
	implements ValidatableValueObject<ButtonTags>
{
	private readonly tags: ReadonlySet<string>;

	constructor(tags: string[] = []) {
		super();
		// Normalize and deduplicate tags
		const normalized = tags
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag) => tag.length > 0 && tag.length <= 30);
		this.tags = new Set(normalized);

		if (this.tags.size > 10) {
			throw new Error("Cannot have more than 10 tags");
		}
	}

	/**
	 * Returns array of tags
	 */
	toArray(): string[] {
		return Array.from(this.tags);
	}

	/**
	 * Checks if a tag exists
	 */
	has(tag: string): boolean {
		return this.tags.has(tag.trim().toLowerCase());
	}

	/**
	 * Returns number of tags
	 */
	size(): number {
		return this.tags.size;
	}

	/**
	 * Adds a tag (returns new instance)
	 */
	add(tag: string): ButtonTags {
		const newTags = this.toArray();
		const normalized = tag.trim().toLowerCase();
		if (!this.tags.has(normalized) && normalized.length > 0) {
			newTags.push(normalized);
		}
		return new ButtonTags(newTags);
	}

	/**
	 * Removes a tag (returns new instance)
	 */
	remove(tag: string): ButtonTags {
		const normalized = tag.trim().toLowerCase();
		return new ButtonTags(this.toArray().filter((t) => t !== normalized));
	}

	/**
	 * Converts to searchable text
	 */
	toSearchableText(): string {
		return this.toArray().join(" ");
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];
		if (this.tags.size > 10) {
			errors.push("Cannot have more than 10 tags");
		}
		for (const tag of this.tags) {
			if (tag.length > 30) {
				errors.push(`Tag "${tag}" exceeds 30 characters`);
			}
		}
		return errors;
	}

	clone(): ButtonTags {
		return new ButtonTags(this.toArray());
	}

	equals(other: ButtonTags): boolean {
		if (!other || !(other instanceof ButtonTags)) {
			return false;
		}
		if (this.tags.size !== other.tags.size) {
			return false;
		}
		for (const tag of this.tags) {
			if (!other.tags.has(tag)) {
				return false;
			}
		}
		return true;
	}
}

/**
 * Audio Content composite value object
 */
export class AudioContent
	extends BaseValueObject<AudioContent>
	implements ValidatableValueObject<AudioContent>
{
	constructor(
		public readonly text: ButtonText,
		public readonly category?: ButtonCategory,
		public readonly tags: ButtonTags = new ButtonTags(),
		public readonly language: string = "ja",
	) {
		super();
	}

	/**
	 * Checks if content has a category
	 */
	hasCategory(): boolean {
		return !!this.category;
	}

	/**
	 * Checks if content has specific tag
	 */
	hasTag(tag: string): boolean {
		return this.tags.has(tag);
	}

	/**
	 * Returns display text (truncated)
	 */
	getDisplayText(maxLength = 50): string {
		return this.text.toDisplayString(maxLength);
	}

	/**
	 * Returns searchable text combining text and tags
	 */
	getSearchableText(): string {
		const parts = [this.text.toSearchableText()];
		if (this.tags.size() > 0) {
			parts.push(this.tags.toSearchableText());
		}
		return parts.join(" ");
	}

	/**
	 * Updates category (returns new instance)
	 */
	updateCategory(category: ButtonCategory | undefined): AudioContent {
		return new AudioContent(this.text, category, this.tags, this.language);
	}

	/**
	 * Updates tags (returns new instance)
	 */
	updateTags(tags: ButtonTags): AudioContent {
		return new AudioContent(this.text, this.category, tags, this.language);
	}

	/**
	 * Adds a tag (returns new instance)
	 */
	addTag(tag: string): AudioContent {
		return new AudioContent(this.text, this.category, this.tags.add(tag), this.language);
	}

	/**
	 * Removes a tag (returns new instance)
	 */
	removeTag(tag: string): AudioContent {
		return new AudioContent(this.text, this.category, this.tags.remove(tag), this.language);
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Validate text
		if (!this.text.isValid()) {
			errors.push(...this.text.getValidationErrors().map((e) => `Text: ${e}`));
		}

		// Validate tags
		if (!this.tags.isValid()) {
			errors.push(...this.tags.getValidationErrors().map((e) => `Tags: ${e}`));
		}

		// Validate language code
		if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(this.language)) {
			errors.push("Invalid language code format");
		}

		return errors;
	}

	/**
	 * Creates a plain object representation
	 */
	toPlainObject(): {
		text: string;
		category?: string;
		tags: string[];
		language: string;
	} {
		return {
			text: this.text.toString(),
			category: this.category?.toString(),
			tags: this.tags.toArray(),
			language: this.language,
		};
	}

	clone(): AudioContent {
		return new AudioContent(
			this.text.clone(),
			this.category?.clone(),
			this.tags.clone(),
			this.language,
		);
	}

	equals(other: AudioContent): boolean {
		if (!other || !(other instanceof AudioContent)) {
			return false;
		}

		const categoryEquals = (() => {
			if (this.category === undefined && other.category === undefined) {
				return true;
			}
			if (this.category === undefined || other.category === undefined) {
				return false;
			}
			return this.category.equals(other.category);
		})();

		return (
			this.text.equals(other.text) &&
			categoryEquals &&
			this.tags.equals(other.tags) &&
			this.language === other.language
		);
	}
}
