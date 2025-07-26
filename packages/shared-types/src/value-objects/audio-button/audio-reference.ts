/**
 * Audio Reference Value Object
 *
 * Represents a reference to a specific location in a YouTube video.
 * Handles timestamp formatting, URL generation, and duration calculations.
 */

import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * Video ID value object for YouTube videos
 */
export class AudioVideoId extends BaseValueObject<AudioVideoId> {
	private readonly value: string;

	constructor(value: string) {
		super();
		if (!this.isValidYouTubeId(value)) {
			throw new Error("Invalid YouTube video ID format");
		}
		this.value = value;
	}

	private isValidYouTubeId(id: string): boolean {
		// YouTube video IDs are 11 characters long and contain alphanumeric chars, - and _
		return /^[a-zA-Z0-9_-]{11}$/.test(id);
	}

	toString(): string {
		return this.value;
	}

	toYouTubeUrl(): string {
		return `https://youtube.com/watch?v=${this.value}`;
	}

	toEmbedUrl(): string {
		return `https://youtube.com/embed/${this.value}`;
	}

	clone(): AudioVideoId {
		return new AudioVideoId(this.value);
	}

	equals(other: AudioVideoId): boolean {
		if (!other || !(other instanceof AudioVideoId)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Video title value object
 */
export class AudioVideoTitle extends BaseValueObject<AudioVideoTitle> {
	private readonly value: string;

	constructor(value: string) {
		super();
		if (!value || value.trim().length === 0) {
			throw new Error("Video title cannot be empty");
		}
		this.value = value.trim();
	}

	toString(): string {
		return this.value;
	}

	/**
	 * Returns truncated title for display
	 */
	toDisplayString(maxLength = 50): string {
		if (this.value.length <= maxLength) {
			return this.value;
		}
		return `${this.value.slice(0, maxLength)}...`;
	}

	clone(): AudioVideoTitle {
		return new AudioVideoTitle(this.value);
	}

	equals(other: AudioVideoTitle): boolean {
		if (!other || !(other instanceof AudioVideoTitle)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Timestamp value object
 */
export class Timestamp
	extends BaseValueObject<Timestamp>
	implements ValidatableValueObject<Timestamp>
{
	private readonly value: number;

	constructor(value: number) {
		super();
		this.value = Math.max(0, Math.floor(value));
	}

	/**
	 * Formats timestamp as HH:MM:SS or MM:SS
	 */
	format(): string {
		const hours = Math.floor(this.value / 3600);
		const minutes = Math.floor((this.value % 3600) / 60);
		const seconds = this.value % 60;

		if (hours > 0) {
			return (
				hours +
				":" +
				minutes.toString().padStart(2, "0") +
				":" +
				seconds.toString().padStart(2, "0")
			);
		}
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}

	/**
	 * Converts to total seconds
	 */
	toSeconds(): number {
		return this.value;
	}

	/**
	 * Creates Timestamp from time string (HH:MM:SS or MM:SS)
	 */
	static fromTimeString(timeString: string): Timestamp {
		if (!timeString || timeString.trim().length === 0) {
			throw new Error("Invalid time format");
		}

		const parts = timeString.split(":").map((p) => Number.parseInt(p, 10));

		let seconds = 0;
		if (
			parts.length === 3 &&
			parts[0] !== undefined &&
			parts[1] !== undefined &&
			parts[2] !== undefined
		) {
			// HH:MM:SS
			seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
		} else if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
			// MM:SS
			seconds = parts[0] * 60 + parts[1];
		} else if (parts.length === 1 && parts[0] !== undefined) {
			// SS
			seconds = parts[0];
		} else {
			throw new Error("Invalid time format");
		}

		if (Number.isNaN(seconds)) {
			throw new Error("Invalid time format");
		}

		return new Timestamp(seconds);
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];
		if (this.value < 0) {
			errors.push("Timestamp cannot be negative");
		}
		if (!Number.isInteger(this.value)) {
			errors.push("Timestamp must be an integer");
		}
		return errors;
	}

	clone(): Timestamp {
		return new Timestamp(this.value);
	}

	equals(other: Timestamp): boolean {
		if (!other || !(other instanceof Timestamp)) {
			return false;
		}
		return this.value === other.value;
	}
}

/**
 * Audio Reference composite value object
 */
export class AudioReference
	extends BaseValueObject<AudioReference>
	implements ValidatableValueObject<AudioReference>
{
	constructor(
		public readonly videoId: AudioVideoId,
		public readonly videoTitle: AudioVideoTitle,
		public readonly startTimestamp: Timestamp,
		public readonly endTimestamp?: Timestamp,
		public readonly workId?: string,
	) {
		super();
	}

	/**
	 * Gets YouTube URL with timestamp
	 */
	getYouTubeUrl(): string {
		return `${this.videoId.toYouTubeUrl()}&t=${this.startTimestamp.toSeconds()}`;
	}

	/**
	 * Gets embed URL with start and end times
	 */
	getEmbedUrl(): string {
		let url = `${this.videoId.toEmbedUrl()}?start=${this.startTimestamp.toSeconds()}`;
		if (this.endTimestamp) {
			url += `&end=${this.endTimestamp.toSeconds()}`;
		}
		return url;
	}

	/**
	 * Calculates duration if end timestamp is provided
	 */
	getDuration(): number | null {
		if (!this.endTimestamp) {
			return null;
		}
		return this.endTimestamp.toSeconds() - this.startTimestamp.toSeconds();
	}

	/**
	 * Formats duration as MM:SS
	 */
	formatDuration(): string | null {
		const duration = this.getDuration();
		if (duration === null) {
			return null;
		}

		const minutes = Math.floor(duration / 60);
		const seconds = duration % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}

	/**
	 * Checks if reference is linked to a work
	 */
	hasWorkLink(): boolean {
		return !!this.workId;
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Validate timestamps
		if (!this.startTimestamp.isValid()) {
			errors.push(...this.startTimestamp.getValidationErrors().map((e) => `Start timestamp: ${e}`));
		}

		if (this.endTimestamp && !this.endTimestamp.isValid()) {
			errors.push(...this.endTimestamp.getValidationErrors().map((e) => `End timestamp: ${e}`));
		}

		// Validate timestamp order
		if (this.endTimestamp && this.endTimestamp.toSeconds() <= this.startTimestamp.toSeconds()) {
			errors.push("End timestamp must be after start timestamp");
		}

		// Validate work ID format
		if (this.workId && !/^RJ\d{6,8}$/.test(this.workId)) {
			errors.push("Invalid work ID format");
		}

		return errors;
	}

	/**
	 * Creates a plain object representation
	 */
	toPlainObject(): {
		videoId: string;
		videoTitle: string;
		timestamp: number;
		endTimestamp?: number;
		workId?: string;
	} {
		return {
			videoId: this.videoId.toString(),
			videoTitle: this.videoTitle.toString(),
			timestamp: this.startTimestamp.toSeconds(),
			endTimestamp: this.endTimestamp?.toSeconds(),
			workId: this.workId,
		};
	}

	clone(): AudioReference {
		return new AudioReference(
			this.videoId.clone(),
			this.videoTitle.clone(),
			this.startTimestamp.clone(),
			this.endTimestamp?.clone(),
			this.workId,
		);
	}

	equals(other: AudioReference): boolean {
		if (!other || !(other instanceof AudioReference)) {
			return false;
		}

		const endTimestampEquals = (() => {
			if (this.endTimestamp === undefined && other.endTimestamp === undefined) {
				return true;
			}
			if (this.endTimestamp === undefined || other.endTimestamp === undefined) {
				return false;
			}
			return this.endTimestamp.equals(other.endTimestamp);
		})();

		return (
			this.videoId.equals(other.videoId) &&
			this.videoTitle.equals(other.videoTitle) &&
			this.startTimestamp.equals(other.startTimestamp) &&
			endTimestampEquals &&
			this.workId === other.workId
		);
	}
}
