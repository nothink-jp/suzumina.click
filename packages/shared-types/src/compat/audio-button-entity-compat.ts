/**
 * AudioButton Entity Compatibility Wrapper
 *
 * Provides Entity-like interface for AudioButtonPlainObject.
 * This allows gradual migration from Entity to PlainObject.
 */

import * as operations from "../operations/audio-button";
import type { AudioButtonPlainObject } from "../plain-objects/audio-button-plain";
import * as validators from "../validators/audio-button";

/**
 * Compatibility wrapper that provides Entity-like methods for PlainObject
 */
export class AudioButtonCompat {
	constructor(private readonly plainObject: AudioButtonPlainObject) {}

	// === Plain object access ===
	toPlainObject(): AudioButtonPlainObject {
		return this.plainObject;
	}

	// === Entity-like property accessors ===
	get id() {
		return { toString: () => this.plainObject.id };
	}

	get content() {
		return {
			text: {
				toString: () => this.plainObject.title,
				length: () => this.plainObject.title.length,
			},
			tags: {
				toArray: () => this.plainObject.tags || [],
				has: (tag: string) => (this.plainObject.tags || []).includes(tag),
			},
		};
	}

	get reference() {
		const startTime = this.plainObject.startTime;
		const endTime = this.plainObject.endTime || startTime;

		return {
			videoId: { toString: () => this.plainObject.sourceVideoId },
			videoTitle: { toString: () => this.plainObject.sourceVideoTitle || "" },
			startTimestamp: {
				toSeconds: () => startTime,
				format: () => operations.formatTimestamp(startTime),
			},
			endTimestamp:
				endTime !== startTime
					? {
							toSeconds: () => endTime,
							format: () => operations.formatTimestamp(endTime),
						}
					: undefined,
		};
	}

	get statistics() {
		return {
			viewCount: {
				toNumber: () => this.plainObject.playCount || 0,
			},
			likeCount: {
				toNumber: () => this.plainObject.likeCount || 0,
			},
			dislikeCount: {
				toNumber: () => this.plainObject.dislikeCount || 0,
			},
		};
	}

	// === Entity methods using operations ===
	getPopularityScore(): number {
		const plays = this.plainObject.playCount || 0;
		const likes = this.plainObject.likeCount || 0;
		const dislikes = this.plainObject.dislikeCount || 0;
		return plays + likes * 2 - dislikes;
	}

	getEngagementRate(): number {
		return operations.getEngagementRate(this.plainObject);
	}

	getEngagementRatePercentage(): number {
		return this.getEngagementRate() * 100;
	}

	isPopular(): boolean {
		return operations.isPopular(this.plainObject);
	}

	isPublic(): boolean {
		return operations.isPublic(this.plainObject);
	}

	getDisplayText(): string {
		return operations.getDisplayText(this.plainObject);
	}

	getYouTubeUrl(): string {
		return operations.getYouTubeUrl(this.plainObject);
	}

	getYouTubeUrlWithTime(): string {
		return operations.getYouTubeUrlWithTime(this.plainObject);
	}

	getDuration(): number {
		return operations.getDuration(this.plainObject);
	}

	getFormattedDuration(): string {
		return operations.getFormattedDuration(this.plainObject);
	}

	hasBeenPlayed(): boolean {
		return operations.hasBeenPlayed(this.plainObject);
	}

	getTotalEngagement(): number {
		return operations.getTotalEngagement(this.plainObject);
	}

	getLikeRatio(): number {
		return operations.getLikeRatio(this.plainObject);
	}

	getAllTags(): string[] {
		return operations.getAllTags(this.plainObject);
	}

	hasTag(tag: string): boolean {
		return operations.hasTag(this.plainObject, tag);
	}

	getCreatorName(): string {
		return operations.getCreatorName(this.plainObject);
	}

	getCreatorId(): string {
		return operations.getCreatorId(this.plainObject);
	}

	isCreatedBy(userId: string): boolean {
		return operations.isCreatedBy(this.plainObject, userId);
	}

	getAgeInDays(): number {
		return operations.getAgeInDays(this.plainObject);
	}

	isRecent(days = 7): boolean {
		return operations.isRecent(this.plainObject, days);
	}

	getFormattedViewCount(): string {
		return operations.getFormattedViewCount(this.plainObject);
	}

	getFormattedLikeCount(): string {
		return operations.getFormattedLikeCount(this.plainObject);
	}

	// === Validation ===
	isValid(): boolean {
		const result = validators.validateAudioButton(this.plainObject);
		return result.isValid;
	}

	getValidationErrors(): string[] {
		const result = validators.validateAudioButton(this.plainObject);
		return result.errors;
	}
}

/**
 * Type guard to check if value is AudioButton-like
 */
export function isAudioButtonLike(
	value: unknown,
): value is AudioButtonPlainObject | AudioButtonCompat {
	if (!value || typeof value !== "object") return false;

	// Check if it's a compat wrapper
	if (value instanceof AudioButtonCompat) return true;

	// Check if it has required PlainObject fields
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.id === "string" &&
		typeof obj.title === "string" &&
		typeof obj.sourceVideoId === "string" &&
		typeof obj.startTime === "number"
	);
}

/**
 * Convert any AudioButton-like object to compatibility wrapper
 */
export function toAudioButtonCompat(
	audioButton: AudioButtonPlainObject | AudioButtonCompat | unknown,
): AudioButtonCompat {
	if (audioButton instanceof AudioButtonCompat) {
		return audioButton;
	}

	if (isAudioButtonLike(audioButton)) {
		const plain =
			audioButton instanceof AudioButtonCompat ? audioButton.toPlainObject() : audioButton;
		return new AudioButtonCompat(plain);
	}

	// If it's an old Entity with toPlainObject method
	if (audioButton && typeof audioButton === "object" && "toPlainObject" in audioButton) {
		const plainMethod = audioButton.toPlainObject as () => AudioButtonPlainObject;
		return new AudioButtonCompat(plainMethod());
	}

	throw new Error("Invalid AudioButton object");
}
