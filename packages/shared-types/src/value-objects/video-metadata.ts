/**
 * Video Metadata Value Object
 *
 * Represents metadata information about a video including
 * title, description, duration, and other descriptive attributes.
 */

import { requireNonEmptyString, requireNonNull } from "./base/transforms";
import { BaseValueObject, type ValidatableValueObject } from "./base/value-object";

/**
 * Video duration value object for ISO 8601 duration format
 * Example: "PT1H2M3S" = 1 hour, 2 minutes, 3 seconds
 */
export class VideoDuration
	extends BaseValueObject<VideoDuration>
	implements ValidatableValueObject<VideoDuration>
{
	private readonly value: string;

	constructor(value: string) {
		super();
		this.value = requireNonNull(value, "duration");
	}

	/**
	 * Parses ISO 8601 duration and returns total seconds
	 */
	toSeconds(): number {
		const match = this.value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
		if (!match) {
			return 0;
		}
		const hours = Number.parseInt(match[1] || "0", 10);
		const minutes = Number.parseInt(match[2] || "0", 10);
		const seconds = Number.parseInt(match[3] || "0", 10);
		return hours * 3600 + minutes * 60 + seconds;
	}

	/**
	 * Returns human-readable format
	 */
	toHumanReadable(): string {
		const seconds = this.toSeconds();
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		const parts: string[] = [];
		if (hours > 0) parts.push(`${hours}時間`);
		if (minutes > 0) parts.push(`${minutes}分`);
		if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);

		return parts.join("");
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];
		if (!this.value.match(/^PT(?:\d+H)?(?:\d+M)?(?:\d+S)?$/)) {
			errors.push("Invalid ISO 8601 duration format");
		}
		return errors;
	}

	toString(): string {
		return this.value;
	}

	clone(): VideoDuration {
		return new VideoDuration(this.value);
	}
}

/**
 * Video title value object
 */
export class VideoTitle
	extends BaseValueObject<VideoTitle>
	implements ValidatableValueObject<VideoTitle>
{
	private readonly value: string;

	constructor(value: string) {
		super();
		this.value = requireNonEmptyString(value, "title").trim();
	}

	/**
	 * Returns truncated title for display
	 */
	truncate(maxLength: number): string {
		if (this.value.length <= maxLength) {
			return this.value;
		}
		return `${this.value.substring(0, maxLength - 3)}...`;
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];
		if (this.value.length === 0) {
			errors.push("Title cannot be empty");
		}
		if (this.value.length > 100) {
			errors.push("Title cannot exceed 100 characters");
		}
		return errors;
	}

	toString(): string {
		return this.value;
	}

	clone(): VideoTitle {
		return new VideoTitle(this.value);
	}
}

/**
 * Video description value object
 */
export class VideoDescription extends BaseValueObject<VideoDescription> {
	private readonly value: string;

	constructor(value: string) {
		super();
		this.value = requireNonNull(value, "description");
	}

	/**
	 * Returns first N lines of description
	 */
	getFirstLines(n: number): string {
		const lines = this.value.split("\n");
		return lines.slice(0, n).join("\n");
	}

	/**
	 * Extracts URLs from description
	 */
	extractUrls(): string[] {
		const urlRegex = /https?:\/\/[^\s]+/g;
		return this.value.match(urlRegex) || [];
	}

	/**
	 * Checks if description contains specific keyword
	 */
	contains(keyword: string): boolean {
		return this.value.toLowerCase().includes(keyword.toLowerCase());
	}

	toString(): string {
		return this.value;
	}

	clone(): VideoDescription {
		return new VideoDescription(this.value);
	}
}

/**
 * Composite Video Metadata value object
 */
export class VideoMetadata
	extends BaseValueObject<VideoMetadata>
	implements ValidatableValueObject<VideoMetadata>
{
	constructor(
		public readonly title: VideoTitle,
		public readonly description: VideoDescription,
		public readonly duration?: VideoDuration,
		public readonly dimension?: "2d" | "3d",
		public readonly definition?: "hd" | "sd",
		public readonly hasCaption?: boolean,
		public readonly isLicensedContent?: boolean,
	) {
		super();
	}

	/**
	 * Creates VideoMetadata from plain object
	 */
	static fromPlainObject(data: {
		title: string;
		description: string;
		duration?: string;
		dimension?: string;
		definition?: string;
		caption?: boolean;
		licensedContent?: boolean;
	}): VideoMetadata {
		return new VideoMetadata(
			new VideoTitle(data.title),
			new VideoDescription(data.description),
			data.duration ? new VideoDuration(data.duration) : undefined,
			data.dimension === "3d" ? "3d" : "2d",
			data.definition === "sd" ? "sd" : "hd",
			data.caption,
			data.licensedContent,
		);
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Validate title
		errors.push(...this.title.getValidationErrors().map((e) => `Title: ${e}`));

		// Validate duration if present
		if (this.duration && !this.duration.isValid()) {
			errors.push(...this.duration.getValidationErrors().map((e) => `Duration: ${e}`));
		}

		return errors;
	}

	/**
	 * Returns a plain object representation
	 */
	toPlainObject(): {
		title: string;
		description: string;
		duration?: string;
		dimension?: "2d" | "3d";
		definition?: "hd" | "sd";
		hasCaption?: boolean;
		isLicensedContent?: boolean;
	} {
		return {
			title: this.title.toString(),
			description: this.description.toString(),
			duration: this.duration?.toString(),
			dimension: this.dimension,
			definition: this.definition,
			hasCaption: this.hasCaption,
			isLicensedContent: this.isLicensedContent,
		};
	}

	clone(): VideoMetadata {
		return new VideoMetadata(
			this.title.clone(),
			this.description.clone(),
			this.duration?.clone(),
			this.dimension,
			this.definition,
			this.hasCaption,
			this.isLicensedContent,
		);
	}

	equals(other: VideoMetadata): boolean {
		if (!other || !(other instanceof VideoMetadata)) {
			return false;
		}
		// Handle duration comparison separately for clarity
		const durationEquals = (() => {
			if (this.duration === undefined && other.duration === undefined) {
				return true;
			}
			if (this.duration === undefined || other.duration === undefined) {
				return false;
			}
			return this.duration.equals(other.duration);
		})();

		return (
			this.title.equals(other.title) &&
			this.description.equals(other.description) &&
			durationEquals &&
			this.dimension === other.dimension &&
			this.definition === other.definition &&
			this.hasCaption === other.hasCaption &&
			this.isLicensedContent === other.isLicensedContent
		);
	}
}
