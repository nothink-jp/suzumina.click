/**
 * Channel Value Object
 *
 * Represents a YouTube channel with its ID and title.
 * Ensures channel information is valid and consistent.
 */

import type { ChannelId as ChannelIdBrand } from "../../core/ids";
import { requireNonEmptyString } from "../base/transforms";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";
import { VideoCategory } from "../video-category";

/**
 * YouTube Channel ID value object
 */
export class ChannelId
	extends BaseValueObject<ChannelId>
	implements ValidatableValueObject<ChannelId>
{
	private readonly value: ChannelIdBrand;

	constructor(value: string) {
		super();
		const sanitizedValue = requireNonEmptyString(value, "channelId").trim();
		// Convert string to branded type
		this.value = sanitizedValue as ChannelIdBrand;
	}

	/**
	 * Returns the YouTube channel URL
	 */
	toUrl(): string {
		return `https://www.youtube.com/channel/${this.value as string}`;
	}

	/**
	 * Returns the YouTube channel handle URL (if it's a handle)
	 */
	toHandleUrl(): string {
		if ((this.value as string).startsWith("@")) {
			return `https://www.youtube.com/${this.value as string}`;
		}
		return this.toUrl();
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		// YouTube channel IDs are typically 24 characters
		// But handles start with @ and can vary in length
		if (!(this.value as string).startsWith("@") && (this.value as string).length !== 24) {
			errors.push("Channel ID should be 24 characters or start with @");
		}

		// Basic validation for allowed characters
		if (!(this.value as string).match(/^[@a-zA-Z0-9_-]+$/)) {
			errors.push("Channel ID contains invalid characters");
		}

		return errors;
	}

	toString(): string {
		return this.value as string;
	}

	toPlainObject(): string {
		return this.value as string;
	}

	clone(): ChannelId {
		return new ChannelId(this.value as string);
	}

	equals(other: ChannelId): boolean {
		if (!other || !(other instanceof ChannelId)) {
			return false;
		}
		return (this.value as string) === (other.value as string);
	}
}

/**
 * Channel title value object
 */
export class ChannelTitle
	extends BaseValueObject<ChannelTitle>
	implements ValidatableValueObject<ChannelTitle>
{
	private readonly value: string;

	constructor(value: string) {
		super();
		this.value = requireNonEmptyString(value, "channelTitle").trim();
	}

	/**
	 * Returns title with prefix/suffix
	 */
	withPrefix(prefix: string): string {
		return `${prefix}${this.value}`;
	}

	withSuffix(suffix: string): string {
		return `${this.value}${suffix}`;
	}

	/**
	 * Returns title in uppercase
	 */
	toUpperCase(): string {
		return this.value.toUpperCase();
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		if (this.value.length === 0) {
			errors.push("Channel title cannot be empty");
		}

		if (this.value.length > 100) {
			errors.push("Channel title cannot exceed 100 characters");
		}

		return errors;
	}

	toString(): string {
		return this.value;
	}

	toPlainObject(): string {
		return this.value;
	}

	clone(): ChannelTitle {
		return new ChannelTitle(this.value);
	}

	equals(other: ChannelTitle): boolean {
		if (!other || !(other instanceof ChannelTitle)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Composite Channel value object
 */
export class Channel extends BaseValueObject<Channel> implements ValidatableValueObject<Channel> {
	constructor(
		public readonly id: ChannelId,
		public readonly title: ChannelTitle,
		public readonly category?: VideoCategory,
	) {
		super();
	}

	/**
	 * Creates Channel from plain object
	 */
	static fromPlainObject(data: {
		channelId: string;
		channelTitle: string;
		categoryId?: string;
	}): Channel {
		return new Channel(
			new ChannelId(data.channelId),
			new ChannelTitle(data.channelTitle),
			data.categoryId ? new VideoCategory(data.categoryId) : undefined,
		);
	}

	/**
	 * Returns channel URL
	 */
	getUrl(): string {
		return this.id.toUrl();
	}

	/**
	 * Returns formatted display name
	 */
	getDisplayName(): string {
		return this.title.toString();
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Validate ID
		errors.push(...this.id.getValidationErrors().map((e) => `ID: ${e}`));

		// Validate title
		errors.push(...this.title.getValidationErrors().map((e) => `Title: ${e}`));

		return errors;
	}

	/**
	 * Returns a plain object representation
	 */
	toPlainObject(): {
		channelId: string;
		channelTitle: string;
		categoryId?: string;
	} {
		return {
			channelId: this.id.toString(),
			channelTitle: this.title.toString(),
			categoryId: this.category?.toId(),
		};
	}

	clone(): Channel {
		return new Channel(this.id.clone(), this.title.clone(), this.category?.clone());
	}

	equals(other: Channel): boolean {
		if (!other || !(other instanceof Channel)) {
			return false;
		}
		// Handle category comparison
		const categoryEquals = (() => {
			if (this.category === undefined && other.category === undefined) {
				return true;
			}
			if (this.category === undefined || other.category === undefined) {
				return false;
			}
			return this.category.equals(other.category);
		})();

		return this.id.equals(other.id) && this.title.equals(other.title) && categoryEquals;
	}
}
