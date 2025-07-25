/**
 * AudioButton Entity V2
 *
 * Represents an audio button with rich domain behavior using Value Objects.
 * This new implementation maintains backward compatibility while introducing
 * a cleaner domain model with proper encapsulation and business logic.
 */

import { AudioContent, ButtonTags, ButtonText } from "../value-objects/audio-content";
import {
	AudioReference,
	AudioVideoId,
	AudioVideoTitle,
	Timestamp,
} from "../value-objects/audio-reference";
import {
	ButtonDislikeCount,
	ButtonLikeCount,
	ButtonStatistics,
	ButtonViewCount,
} from "../value-objects/button-statistics";
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
 * AudioButton Entity V2
 */
export class AudioButtonV2
	extends BaseEntity<AudioButtonV2>
	implements EntityValidatable<AudioButtonV2>
{
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
	 * Creates AudioButton from legacy format
	 */
	static fromLegacy(data: {
		id: string;
		title: string;
		description?: string;
		tags?: string[];
		sourceVideoId: string;
		sourceVideoTitle?: string;
		startTime: number;
		endTime: number;
		createdBy: string;
		createdByName: string;
		isPublic?: boolean;
		playCount?: number;
		likeCount?: number;
		dislikeCount?: number;
		favoriteCount?: number;
		createdAt: string;
		updatedAt: string;
	}): AudioButtonV2 {
		// Create value objects from legacy data
		const content = new AudioContent(
			new ButtonText(data.title),
			undefined, // Category will be inferred from tags or set later
			new ButtonTags(data.tags || []),
		);

		const reference = new AudioReference(
			new AudioVideoId(data.sourceVideoId),
			new AudioVideoTitle(data.sourceVideoTitle || "Unknown Video"),
			new Timestamp(data.startTime),
			new Timestamp(data.endTime),
		);

		const statistics = new ButtonStatistics(
			new ButtonViewCount(data.playCount || 0),
			new ButtonLikeCount(data.likeCount || 0),
			new ButtonDislikeCount(data.dislikeCount || 0),
		);

		return new AudioButtonV2(
			new AudioButtonId(data.id),
			content,
			reference,
			statistics,
			{
				id: data.createdBy,
				name: data.createdByName,
			},
			data.isPublic ?? true,
			new Date(data.createdAt),
			new Date(data.updatedAt),
			data.favoriteCount || 0,
		);
	}

	/**
	 * Converts to legacy format
	 */
	toLegacy(): {
		id: string;
		title: string;
		description?: string;
		tags: string[];
		sourceVideoId: string;
		sourceVideoTitle?: string;
		startTime: number;
		endTime: number;
		createdBy: string;
		createdByName: string;
		isPublic: boolean;
		playCount: number;
		likeCount: number;
		dislikeCount: number;
		favoriteCount: number;
		createdAt: string;
		updatedAt: string;
	} {
		const plain = this.reference.toPlainObject();
		return {
			id: this.id.toString(),
			title: this.content.text.toString(),
			description: this.content.text.length() > 50 ? this.content.text.toString() : undefined,
			tags: this.content.tags.toArray(),
			sourceVideoId: plain.videoId,
			sourceVideoTitle: plain.videoTitle,
			startTime: plain.timestamp,
			endTime: plain.endTimestamp || plain.timestamp,
			createdBy: this._createdBy.id,
			createdByName: this._createdBy.name,
			isPublic: this._isPublic,
			playCount: this.statistics.viewCount.toNumber(),
			likeCount: this.statistics.likeCount.toNumber(),
			dislikeCount: this.statistics.dislikeCount.toNumber(),
			favoriteCount: this._favoriteCount,
			createdAt: this._createdAt.toISOString(),
			updatedAt: this._updatedAt.toISOString(),
		};
	}

	/**
	 * Updates content (returns new instance)
	 */
	updateContent(content: AudioContent): AudioButtonV2 {
		return new AudioButtonV2(
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
	updateVisibility(isPublic: boolean): AudioButtonV2 {
		return new AudioButtonV2(
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
	recordPlay(): AudioButtonV2 {
		return new AudioButtonV2(
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
	recordLike(): AudioButtonV2 {
		return new AudioButtonV2(
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
	recordDislike(): AudioButtonV2 {
		return new AudioButtonV2(
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
	incrementFavorite(): AudioButtonV2 {
		return new AudioButtonV2(
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
	decrementFavorite(): AudioButtonV2 {
		return new AudioButtonV2(
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
	clone(): AudioButtonV2 {
		return new AudioButtonV2(
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
	equals(other: AudioButtonV2): boolean {
		if (!other || !(other instanceof AudioButtonV2)) {
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
