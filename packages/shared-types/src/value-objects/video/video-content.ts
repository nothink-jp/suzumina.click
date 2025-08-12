/**
 * Video Content Value Object
 *
 * Represents content-related information about a video including
 * privacy status, upload status, content details, and other content metadata.
 */

import type { VideoId as VideoIdBrand } from "../../core/ids";
import { requireNonEmptyString } from "../base/transforms";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * Video privacy status
 */
export type PrivacyStatus = "public" | "unlisted" | "private";

/**
 * Upload status
 */
export type UploadStatus = "uploaded" | "processed" | "failed" | "rejected" | "deleted";

/**
 * Video ID value object
 */
export class VideoId extends BaseValueObject<VideoId> implements ValidatableValueObject<VideoId> {
	private readonly value: VideoIdBrand;

	constructor(value: string) {
		super();
		const sanitizedValue = requireNonEmptyString(value, "videoId").trim();
		// Convert string to branded type
		this.value = sanitizedValue as VideoIdBrand;
	}

	/**
	 * Returns YouTube video URL
	 */
	toUrl(): string {
		return `https://www.youtube.com/watch?v=${this.value as string}`;
	}

	/**
	 * Returns YouTube video embed URL
	 */
	toEmbedUrl(): string {
		return `https://www.youtube.com/embed/${this.value as string}`;
	}

	/**
	 * Returns YouTube video thumbnail URL
	 */
	toThumbnailUrl(quality: "default" | "medium" | "high" | "standard" | "maxres" = "high"): string {
		const qualityMap = {
			default: "default",
			medium: "mqdefault",
			high: "hqdefault",
			standard: "sddefault",
			maxres: "maxresdefault",
		};
		return `https://img.youtube.com/vi/${this.value as string}/${qualityMap[quality]}.jpg`;
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		// YouTube video IDs are typically 11 characters
		if ((this.value as string).length !== 11) {
			errors.push("Video ID should be 11 characters");
		}

		// Basic validation for allowed characters
		if (!(this.value as string).match(/^[a-zA-Z0-9_-]+$/)) {
			errors.push("Video ID contains invalid characters");
		}

		return errors;
	}

	toString(): string {
		return this.value as string;
	}

	toPlainObject(): string {
		return this.value as string;
	}

	clone(): VideoId {
		return new VideoId(this.value as string);
	}

	equals(other: VideoId): boolean {
		if (!other || !(other instanceof VideoId)) {
			return false;
		}
		return (this.value as string) === (other.value as string);
	}
}

/**
 * Published date value object
 */
export class PublishedAt extends BaseValueObject<PublishedAt> {
	private readonly value: Date;

	constructor(value: Date | string) {
		super();
		this.value = value instanceof Date ? value : new Date(value);
	}

	/**
	 * Returns age in days
	 */
	getAgeInDays(): number {
		const now = new Date();
		const diffMs = now.getTime() - this.value.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24));
	}

	/**
	 * Returns human-readable relative time
	 */
	toRelativeTime(): string {
		const days = this.getAgeInDays();

		if (days === 0) {
			return "今日";
		}
		if (days === 1) {
			return "昨日";
		}
		if (days < 7) {
			return `${days}日前`;
		}
		if (days < 30) {
			const weeks = Math.floor(days / 7);
			return `${weeks}週間前`;
		}
		if (days < 365) {
			const months = Math.floor(days / 30);
			return `${months}ヶ月前`;
		}

		const years = Math.floor(days / 365);
		return `${years}年前`;
	}

	/**
	 * Returns formatted date string
	 */
	toFormattedString(locale = "ja-JP"): string {
		return this.value.toLocaleDateString(locale, {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}

	toDate(): Date {
		return new Date(this.value);
	}

	toISOString(): string {
		return this.value.toISOString();
	}

	toString(): string {
		return this.value.toISOString();
	}

	toPlainObject(): string {
		return this.value.toISOString();
	}

	clone(): PublishedAt {
		return new PublishedAt(new Date(this.value));
	}

	equals(other: PublishedAt): boolean {
		if (!other || !(other instanceof PublishedAt)) {
			return false;
		}
		return this.value.getTime() === other.value.getTime();
	}
}

/**
 * Content details value object
 */
export class ContentDetails extends BaseValueObject<ContentDetails> {
	constructor(
		public readonly dimension?: "2d" | "3d",
		public readonly definition?: "hd" | "sd",
		public readonly caption?: boolean,
		public readonly licensedContent?: boolean,
		public readonly projection?: "rectangular" | "360",
	) {
		super();
	}

	/**
	 * Checks if video is HD
	 */
	isHD(): boolean {
		return this.definition === "hd";
	}

	/**
	 * Checks if video has captions
	 */
	hasCaption(): boolean {
		return this.caption === true;
	}

	/**
	 * Checks if video is 360 degree video
	 */
	is360Video(): boolean {
		return this.projection === "360";
	}

	toPlainObject(): {
		dimension?: "2d" | "3d";
		definition?: "hd" | "sd";
		caption?: boolean;
		licensedContent?: boolean;
		projection?: "rectangular" | "360";
	} {
		return {
			dimension: this.dimension,
			definition: this.definition,
			caption: this.caption,
			licensedContent: this.licensedContent,
			projection: this.projection,
		};
	}

	clone(): ContentDetails {
		return new ContentDetails(
			this.dimension,
			this.definition,
			this.caption,
			this.licensedContent,
			this.projection,
		);
	}

	equals(other: ContentDetails): boolean {
		if (!other || !(other instanceof ContentDetails)) {
			return false;
		}
		return (
			this.dimension === other.dimension &&
			this.definition === other.definition &&
			this.caption === other.caption &&
			this.licensedContent === other.licensedContent &&
			this.projection === other.projection
		);
	}
}

/**
 * Composite Video Content value object
 */
export class VideoContent
	extends BaseValueObject<VideoContent>
	implements ValidatableValueObject<VideoContent>
{
	constructor(
		public readonly videoId: VideoId,
		public readonly publishedAt: PublishedAt,
		public readonly privacyStatus: PrivacyStatus,
		public readonly uploadStatus: UploadStatus,
		public readonly contentDetails?: ContentDetails,
		public readonly embedHtml?: string,
		public readonly tags?: string[],
		public readonly embeddable?: boolean,
	) {
		super();
	}

	/**
	 * Creates VideoContent from plain object
	 */
	static fromPlainObject(data: {
		videoId: string;
		publishedAt: string | Date;
		privacyStatus: string;
		uploadStatus: string;
		contentDetails?: {
			dimension?: string;
			definition?: string;
			caption?: boolean;
			licensedContent?: boolean;
			projection?: string;
		};
		embedHtml?: string;
		tags?: string[];
		embeddable?: boolean;
	}): VideoContent {
		return new VideoContent(
			new VideoId(data.videoId),
			new PublishedAt(data.publishedAt),
			data.privacyStatus as PrivacyStatus,
			data.uploadStatus as UploadStatus,
			data.contentDetails
				? new ContentDetails(
						data.contentDetails.dimension as "2d" | "3d" | undefined,
						data.contentDetails.definition as "hd" | "sd" | undefined,
						data.contentDetails.caption,
						data.contentDetails.licensedContent,
						data.contentDetails.projection as "rectangular" | "360" | undefined,
					)
				: undefined,
			data.embedHtml,
			data.tags,
			data.embeddable,
		);
	}

	/**
	 * Checks if video is public
	 */
	isPublic(): boolean {
		return this.privacyStatus === "public";
	}

	/**
	 * Checks if video is available
	 */
	isAvailable(): boolean {
		return this.uploadStatus === "processed" && this.privacyStatus !== "private";
	}

	/**
	 * Checks if video is embeddable
	 */
	isEmbeddable(): boolean {
		return this.embeddable !== false;
	}

	/**
	 * Returns video age
	 */
	getVideoAge(): string {
		return this.publishedAt.toRelativeTime();
	}

	/**
	 * Checks if video has specific tag
	 */
	hasTag(tag: string): boolean {
		if (!this.tags) {
			return false;
		}
		return this.tags.some((t) => t.toLowerCase() === tag.toLowerCase());
	}

	/**
	 * Returns video URL
	 */
	getUrl(): string {
		return this.videoId.toUrl();
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Validate video ID
		if (!this.videoId.isValid()) {
			errors.push(...this.videoId.getValidationErrors().map((e) => `VideoId: ${e}`));
		}

		// Validate privacy status
		const validPrivacyStatuses: PrivacyStatus[] = ["public", "unlisted", "private"];
		if (!validPrivacyStatuses.includes(this.privacyStatus)) {
			errors.push(`Invalid privacy status: ${this.privacyStatus}`);
		}

		// Validate upload status
		const validUploadStatuses: UploadStatus[] = [
			"uploaded",
			"processed",
			"failed",
			"rejected",
			"deleted",
		];
		if (!validUploadStatuses.includes(this.uploadStatus)) {
			errors.push(`Invalid upload status: ${this.uploadStatus}`);
		}

		return errors;
	}

	/**
	 * Returns a plain object representation
	 */
	toPlainObject(): {
		videoId: string;
		publishedAt: string;
		privacyStatus: PrivacyStatus;
		uploadStatus: UploadStatus;
		contentDetails?: {
			dimension?: "2d" | "3d";
			definition?: "hd" | "sd";
			caption?: boolean;
			licensedContent?: boolean;
			projection?: "rectangular" | "360";
		};
		embedHtml?: string;
		tags?: string[];
		embeddable?: boolean;
	} {
		return {
			videoId: this.videoId.toString(),
			publishedAt: this.publishedAt.toISOString(),
			privacyStatus: this.privacyStatus,
			uploadStatus: this.uploadStatus,
			contentDetails: this.contentDetails
				? {
						dimension: this.contentDetails.dimension,
						definition: this.contentDetails.definition,
						caption: this.contentDetails.caption,
						licensedContent: this.contentDetails.licensedContent,
						projection: this.contentDetails.projection,
					}
				: undefined,
			embedHtml: this.embedHtml,
			tags: this.tags,
			embeddable: this.embeddable,
		};
	}

	clone(): VideoContent {
		return new VideoContent(
			this.videoId.clone(),
			this.publishedAt.clone(),
			this.privacyStatus,
			this.uploadStatus,
			this.contentDetails?.clone(),
			this.embedHtml,
			this.tags ? [...this.tags] : undefined,
			this.embeddable,
		);
	}

	equals(other: VideoContent): boolean {
		if (!other || !(other instanceof VideoContent)) {
			return false;
		}

		// Check tags equality
		const tagsEqual = (() => {
			if (this.tags === undefined && other.tags === undefined) {
				return true;
			}
			if (this.tags === undefined || other.tags === undefined) {
				return false;
			}
			if (this.tags.length !== other.tags.length) {
				return false;
			}
			return this.tags.every((tag, i) => tag === other.tags?.[i]);
		})();

		// Handle contentDetails equality
		const contentDetailsEqual = (() => {
			if (this.contentDetails === undefined && other.contentDetails === undefined) {
				return true;
			}
			if (this.contentDetails === undefined || other.contentDetails === undefined) {
				return false;
			}
			return this.contentDetails.equals(other.contentDetails);
		})();

		return (
			this.videoId.equals(other.videoId) &&
			this.publishedAt.equals(other.publishedAt) &&
			this.privacyStatus === other.privacyStatus &&
			this.uploadStatus === other.uploadStatus &&
			contentDetailsEqual &&
			this.embedHtml === other.embedHtml &&
			tagsEqual &&
			this.embeddable === other.embeddable
		);
	}
}
