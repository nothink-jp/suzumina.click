/**
 * AudioButton Entity
 *
 * Represents an audio button with rich domain behavior using Value Objects.
 * This implementation follows the Entity Implementation Guidelines,
 * prioritizing practical design for Next.js + Cloud Functions environment.
 */

import { z } from "zod";
import type { AudioButtonPlainObject } from "../plain-objects/audio-button-plain";
import type { FirestoreServerAudioButtonData } from "../types/firestore/audio-button";
import { AudioContent, ButtonTags, ButtonText } from "../value-objects/audio-button/audio-content";
import {
	AudioReference,
	AudioVideoId,
	AudioVideoTitle,
	Timestamp,
} from "../value-objects/audio-button/audio-reference";
import {
	ButtonDislikeCount,
	ButtonLikeCount,
	ButtonStatistics,
	ButtonViewCount,
} from "../value-objects/audio-button/button-statistics";
import { BaseEntity, type EntityValidatable } from "./base/entity";

/**
 * Audio Button ID value object
 */
export class AudioButtonId {
	constructor(private readonly value: string) {
		if (!value || value.trim().length === 0) {
			throw new Error("AudioButton ID cannot be empty");
		}
	}

	toString(): string {
		return this.value;
	}

	equals(other: AudioButtonId): boolean {
		return other instanceof AudioButtonId && this.value === other.value;
	}

	/**
	 * Generates a new AudioButton ID
	 */
	static generate(): AudioButtonId {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 8);
		return new AudioButtonId(`ab_${timestamp}_${random}`);
	}
}

/**
 * Creator information for AudioButton
 */
export interface AudioButtonCreatorInfo {
	readonly id: string;
	readonly name: string;
}

/**
 * Legacy type for Firestore audio button data
 * @deprecated Use FirestoreServerAudioButtonData from types/firestore/audio-button.ts
 */
export type FirestoreAudioButtonData = FirestoreServerAudioButtonData;

/**
 * Audio button list result
 */
export interface AudioButtonListResult {
	items: AudioButtonPlainObject[];
	total: number;
	page: number;
	pageSize: number;
}

/**
 * AudioButton Entity
 */
export class AudioButton extends BaseEntity<AudioButton> implements EntityValidatable<AudioButton> {
	constructor(
		public readonly id: AudioButtonId,
		public readonly content: AudioContent,
		public readonly reference: AudioReference,
		public readonly statistics: ButtonStatistics,
		private readonly _createdBy: AudioButtonCreatorInfo,
		private readonly _isPublic: boolean = true,
		private readonly _createdAt: Date = new Date(),
		private readonly _updatedAt: Date = new Date(),
		private readonly _favoriteCount: number = 0,
	) {
		super();
	}

	/**
	 * Gets creator information
	 */
	get createdBy(): AudioButtonCreatorInfo {
		return { ...this._createdBy };
	}

	/**
	 * Checks if button is public
	 */
	get isPublic(): boolean {
		return this._isPublic;
	}

	/**
	 * Gets creation date
	 */
	get createdAt(): Date {
		return new Date(this._createdAt);
	}

	/**
	 * Gets last update date
	 */
	get updatedAt(): Date {
		return new Date(this._updatedAt);
	}

	/**
	 * Gets favorite count
	 */
	get favoriteCount(): number {
		return this._favoriteCount;
	}

	/**
	 * Creates AudioButton from Firestore data (most important method)
	 */
	static fromFirestoreData(data: FirestoreServerAudioButtonData): AudioButton | null {
		try {
			// Timestamp processing helper
			const convertTimestamp = (timestamp: unknown): Date => {
				if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
					// biome-ignore lint/suspicious/noExplicitAny: Firestore Timestamp type handling
					return (timestamp as any).toDate();
				}
				if (typeof timestamp === "string") {
					return new Date(timestamp);
				}
				return new Date();
			};

			// Create value objects from Firestore data
			const content = new AudioContent(
				new ButtonText(data.title),
				undefined, // Category will be inferred from tags or set later
				new ButtonTags(data.tags || []),
			);

			const reference = new AudioReference(
				new AudioVideoId(data.sourceVideoId),
				new AudioVideoTitle(data.sourceVideoTitle || "Unknown Video"),
				new Timestamp(data.startTime),
				new Timestamp(data.endTime || data.startTime),
			);

			const statistics = new ButtonStatistics(
				new ButtonViewCount(data.playCount || 0),
				new ButtonLikeCount(data.likeCount || 0),
				new ButtonDislikeCount(data.dislikeCount || 0),
			);

			return new AudioButton(
				new AudioButtonId(data.id || AudioButtonId.generate().toString()),
				content,
				reference,
				statistics,
				{
					id: data.createdBy,
					name: data.createdByName,
				},
				data.isPublic ?? true,
				convertTimestamp(data.createdAt),
				convertTimestamp(data.updatedAt),
				data.favoriteCount || 0,
			);
		} catch (_error) {
			// In development, this error would be caught by error boundary
			// In production, we return null to gracefully handle invalid data
			// TODO: Consider using a proper logging service for production environments
			return null;
		}
	}

	/**
	 * Updates content (returns new instance)
	 */
	updateContent(content: AudioContent): AudioButton {
		return new AudioButton(
			this.id,
			content,
			this.reference,
			this.statistics,
			this._createdBy,
			this._isPublic,
			this._createdAt,
			new Date(),
			this._favoriteCount,
		);
	}

	/**
	 * Updates visibility (returns new instance)
	 */
	updateVisibility(isPublic: boolean): AudioButton {
		return new AudioButton(
			this.id,
			this.content,
			this.reference,
			this.statistics,
			this._createdBy,
			isPublic,
			this._createdAt,
			new Date(),
			this._favoriteCount,
		);
	}

	/**
	 * Records a play event (returns new instance)
	 */
	recordPlay(): AudioButton {
		return new AudioButton(
			this.id,
			this.content,
			this.reference,
			this.statistics.incrementView(),
			this._createdBy,
			this._isPublic,
			this._createdAt,
			new Date(),
			this._favoriteCount,
		);
	}

	/**
	 * Records a like (returns new instance)
	 */
	recordLike(): AudioButton {
		return new AudioButton(
			this.id,
			this.content,
			this.reference,
			this.statistics.addLike(),
			this._createdBy,
			this._isPublic,
			this._createdAt,
			new Date(),
			this._favoriteCount,
		);
	}

	/**
	 * Records a dislike (returns new instance)
	 */
	recordDislike(): AudioButton {
		return new AudioButton(
			this.id,
			this.content,
			this.reference,
			this.statistics.addDislike(),
			this._createdBy,
			this._isPublic,
			this._createdAt,
			new Date(),
			this._favoriteCount,
		);
	}

	/**
	 * Increments favorite count (returns new instance)
	 */
	incrementFavorite(): AudioButton {
		return new AudioButton(
			this.id,
			this.content,
			this.reference,
			this.statistics,
			this._createdBy,
			this._isPublic,
			this._createdAt,
			new Date(),
			this._favoriteCount + 1,
		);
	}

	/**
	 * Decrements favorite count (returns new instance)
	 */
	decrementFavorite(): AudioButton {
		return new AudioButton(
			this.id,
			this.content,
			this.reference,
			this.statistics,
			this._createdBy,
			this._isPublic,
			this._createdAt,
			new Date(),
			Math.max(0, this._favoriteCount - 1),
		);
	}

	/**
	 * Checks if button is popular
	 */
	isPopular(): boolean {
		return this.statistics.isPopular();
	}

	/**
	 * Gets engagement rate
	 */
	getEngagementRate(): number {
		return this.statistics.getEngagementRate();
	}

	/**
	 * Calculates popularity score
	 * Formula: views + (likes * 2) - dislikes
	 */
	getPopularityScore(): number {
		const views = this.statistics.viewCount.toNumber();
		const likes = this.statistics.likeCount.toNumber();
		const dislikes = this.statistics.dislikeCount.toNumber();
		return views + likes * 2 - dislikes;
	}

	/**
	 * Gets engagement rate as percentage
	 * Formula: (likes + dislikes) / views * 100
	 */
	getEngagementRatePercentage(): number {
		const views = this.statistics.viewCount.toNumber();
		const likes = this.statistics.likeCount.toNumber();
		const dislikes = this.statistics.dislikeCount.toNumber();
		if (views === 0) return 0;
		return Math.round(((likes + dislikes) / views) * 100);
	}

	/**
	 * Checks if button belongs to a specific creator
	 */
	belongsTo(creatorId: string): boolean {
		return this._createdBy.id === creatorId;
	}

	/**
	 * Gets searchable text for full-text search
	 */
	getSearchableText(): string {
		const parts = [
			this.content.getSearchableText(),
			this.reference.videoTitle.toDisplayString().toLowerCase(),
			this._createdBy.name.toLowerCase(),
		];
		return parts.join(" ");
	}

	/**
	 * Converts to Firestore format for persistence
	 */
	toFirestore(): FirestoreServerAudioButtonData {
		const referenceData = this.reference.toPlainObject();
		return {
			id: this.id.toString(),
			title: this.content.text.toString(),
			description: this.content.text.length() > 50 ? this.content.text.toString() : undefined,
			tags: this.content.tags.toArray(),
			sourceVideoId: referenceData.videoId,
			sourceVideoTitle: referenceData.videoTitle,
			sourceVideoThumbnailUrl: undefined, // Will be set from external source if needed
			startTime: referenceData.timestamp,
			endTime: referenceData.endTimestamp || referenceData.timestamp,
			createdBy: this._createdBy.id,
			createdByName: this._createdBy.name,
			isPublic: this._isPublic,
			playCount: this.statistics.viewCount.toNumber(),
			likeCount: this.statistics.likeCount.toNumber(),
			dislikeCount: this.statistics.dislikeCount.toNumber(),
			favoriteCount: this._favoriteCount,
			createdAt: this._createdAt,
			updatedAt: this._updatedAt,
		};
	}

	/**
	 * Converts to Plain Object for Server Component boundary (required)
	 */
	toPlainObject(): AudioButtonPlainObject {
		// Calculate duration for display
		const referenceData = this.reference.toPlainObject();
		const duration =
			(referenceData.endTimestamp || referenceData.timestamp) - referenceData.timestamp;
		const minutes = Math.floor(duration / 60);
		const seconds = Math.floor(duration % 60);
		const durationText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

		// Calculate relative time
		const now = new Date();
		const diffMs = now.getTime() - this._createdAt.getTime();
		const diffMinutes = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		let relativeTimeText: string;
		if (diffDays > 0) {
			relativeTimeText = `${diffDays}日前`;
		} else if (diffHours > 0) {
			relativeTimeText = `${diffHours}時間前`;
		} else if (diffMinutes > 0) {
			relativeTimeText = `${diffMinutes}分前`;
		} else {
			relativeTimeText = "たった今";
		}

		return {
			// All base data
			id: this.id.toString(),
			title: this.content.text.toString(),
			description: this.content.text.length() > 50 ? this.content.text.toString() : undefined,
			tags: this.content.tags.toArray(),
			sourceVideoId: referenceData.videoId,
			sourceVideoTitle: referenceData.videoTitle,
			sourceVideoThumbnailUrl: undefined,
			startTime: referenceData.timestamp,
			endTime: referenceData.endTimestamp || referenceData.timestamp,
			createdBy: this._createdBy.id,
			createdByName: this._createdBy.name,
			isPublic: this._isPublic,
			playCount: this.statistics.viewCount.toNumber(),
			likeCount: this.statistics.likeCount.toNumber(),
			dislikeCount: this.statistics.dislikeCount.toNumber(),
			favoriteCount: this._favoriteCount,
			createdAt: this._createdAt.toISOString(),
			updatedAt: this._updatedAt.toISOString(),

			// Computed properties (important for client component performance)
			_computed: {
				isPopular: this.isPopular(),
				engagementRate: this.getEngagementRate(),
				engagementRatePercentage: this.getEngagementRatePercentage(),
				popularityScore: this.getPopularityScore(),
				searchableText: this.getSearchableText(),
				durationText,
				relativeTimeText,
			},
		};
	}

	/**
	 * Validates the entity
	 */
	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	/**
	 * Gets validation errors
	 */
	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Validate content
		if (!this.content.isValid()) {
			errors.push(...this.content.getValidationErrors());
		}

		// Validate reference
		if (!this.reference.isValid()) {
			errors.push(...this.reference.getValidationErrors());
		}

		// Validate statistics
		if (!this.statistics.isValid()) {
			errors.push(...this.statistics.getValidationErrors());
		}

		// Validate creator info
		if (!this._createdBy.id || !this._createdBy.name) {
			errors.push("Creator information is incomplete");
		}

		// Validate timestamps
		if (this._createdAt > this._updatedAt) {
			errors.push("Created date cannot be after updated date");
		}

		// Validate favorite count
		if (this._favoriteCount < 0) {
			errors.push("Favorite count cannot be negative");
		}

		return errors;
	}

	/**
	 * Clones the entity
	 */
	clone(): AudioButton {
		return new AudioButton(
			this.id,
			this.content.clone(),
			this.reference.clone(),
			this.statistics.clone(),
			{ ...this._createdBy },
			this._isPublic,
			new Date(this._createdAt),
			new Date(this._updatedAt),
			this._favoriteCount,
		);
	}

	/**
	 * Checks equality
	 */
	equals(other: AudioButton): boolean {
		if (!other || !(other instanceof AudioButton)) {
			return false;
		}

		return (
			this.id.equals(other.id) &&
			this.content.equals(other.content) &&
			this.reference.equals(other.reference) &&
			this.statistics.equals(other.statistics) &&
			this._createdBy.id === other._createdBy.id &&
			this._createdBy.name === other._createdBy.name &&
			this._isPublic === other._isPublic &&
			this._createdAt.getTime() === other._createdAt.getTime() &&
			this._updatedAt.getTime() === other._updatedAt.getTime() &&
			this._favoriteCount === other._favoriteCount
		);
	}
}

/**
 * Type guard to check if a value is an AudioButton-like object
 */
export function isAudioButton(value: unknown): value is AudioButtonPlainObject {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		"sourceVideoId" in value &&
		"startTime" in value
	);
}

/**
 * Zod schema for frontend audio button data validation
 */
export const FrontendAudioButtonSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	tags: z.array(z.string()),
	sourceVideoId: z.string(),
	sourceVideoTitle: z.string(),
	sourceVideoThumbnailUrl: z.string().optional(),
	startTime: z.number(),
	endTime: z.number().optional(),
	createdBy: z.string(),
	createdByName: z.string(),
	isPublic: z.boolean(),
	playCount: z.number(),
	likeCount: z.number(),
	dislikeCount: z.number().optional(),
	favoriteCount: z.number().optional(),
	createdAt: z.union([z.date(), z.string()]),
	updatedAt: z.union([z.date(), z.string()]),
	durationText: z.string().optional(),
	relativeTimeText: z.string().optional(),
});

/**
 * Input type for creating audio button
 */
export interface CreateAudioButtonInput {
	title: string;
	description?: string;
	tags: string[];
	sourceVideoId: string;
	sourceVideoTitle: string;
	startTime: number;
	endTime: number;
	isPublic?: boolean;
}

/**
 * Input type for updating audio button
 */
export interface UpdateAudioButtonInput {
	id: string;
	title?: string;
	description?: string;
	tags?: string[];
	isPublic?: boolean;
}

/**
 * Query type for audio buttons
 */
export interface AudioButtonQuery {
	limit?: number;
	offset?: number;
	page?: number;
	sortBy?: "newest" | "oldest" | "popular" | "mostPlayed";
	tags?: string[];
	sourceVideoId?: string;
	createdBy?: string;
	onlyPublic?: boolean;
	searchText?: string;
	createdAfter?: string;
	createdBefore?: string;
	playCountMin?: number;
	playCountMax?: number;
	likeCountMin?: number;
	likeCountMax?: number;
	favoriteCountMin?: number;
	favoriteCountMax?: number;
	durationMin?: number;
	durationMax?: number;
	includeTotalCount?: boolean;
}
