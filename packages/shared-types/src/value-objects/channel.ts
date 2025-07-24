/**
 * Channel Value Object
 *
 * Represents a YouTube channel with its ID and title.
 * Ensures channel information is valid and consistent.
 */

import { requireNonEmptyString } from "./base/transforms";
import { BaseValueObject, type ValidatableValueObject } from "./base/value-object";

/**
 * YouTube Channel ID value object
 */
export class ChannelId
	extends BaseValueObject<ChannelId>
	implements ValidatableValueObject<ChannelId>
{
	private readonly value: string;

	constructor(value: string) {
		super();
		this.value = requireNonEmptyString(value, "channelId").trim();
	}

	/**
	 * Returns the YouTube channel URL
	 */
	toUrl(): string {
		return `https://www.youtube.com/channel/${this.value}`;
	}

	/**
	 * Returns the YouTube channel handle URL (if it's a handle)
	 */
	toHandleUrl(): string {
		if (this.value.startsWith("@")) {
			return `https://www.youtube.com/${this.value}`;
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
		if (!this.value.startsWith("@") && this.value.length !== 24) {
			errors.push("Channel ID should be 24 characters or start with @");
		}

		// Basic validation for allowed characters
		if (!this.value.match(/^[@a-zA-Z0-9_-]+$/)) {
			errors.push("Channel ID contains invalid characters");
		}

		return errors;
	}

	toString(): string {
		return this.value;
	}

	clone(): ChannelId {
		return new ChannelId(this.value);
	}

	equals(other: ChannelId): boolean {
		if (!other || !(other instanceof ChannelId)) {
			return false;
		}
		return this.value === other.value;
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
	) {
		super();
	}

	/**
	 * Creates Channel from plain object
	 */
	static fromPlainObject(data: { channelId: string; channelTitle: string }): Channel {
		return new Channel(new ChannelId(data.channelId), new ChannelTitle(data.channelTitle));
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
	} {
		return {
			channelId: this.id.toString(),
			channelTitle: this.title.toString(),
		};
	}

	clone(): Channel {
		return new Channel(this.id.clone(), this.title.clone());
	}

	equals(other: Channel): boolean {
		if (!other || !(other instanceof Channel)) {
			return false;
		}
		return this.id.equals(other.id) && this.title.equals(other.title);
	}
}
