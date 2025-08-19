/**
 * Video Entity
 *
 * Represents a YouTube video with rich domain behavior using Value Objects.
 * This new implementation maintains backward compatibility while introducing
 * a cleaner domain model with proper encapsulation and business logic.
 */

import {
	type DatabaseError,
	databaseError,
	err,
	ok,
	type Result,
	type ValidationError,
	validationError,
} from "../core/result";
import type { VideoComputedProperties, VideoPlainObject } from "../plain-objects/video-plain";
import type {
	FirestoreServerVideoData,
	LiveBroadcastContent,
	VideoType,
} from "../types/firestore/video";
import { Channel } from "../value-objects/video/channel";
import {
	ContentDetails,
	type PrivacyStatus,
	PublishedAt,
	type UploadStatus,
	VideoContent,
	VideoId,
} from "../value-objects/video/video-content";
import {
	VideoDescription,
	VideoDuration,
	VideoMetadata,
	VideoTitle,
} from "../value-objects/video/video-metadata";
import {
	CommentCount,
	DislikeCount,
	LikeCount,
	VideoStatistics,
	ViewCount,
} from "../value-objects/video/video-statistics";
import { BaseEntity, type EntityValidatable } from "./base/entity";

// Legacy types are removed - using direct entity to Firestore conversion

/**
 * Tag types for the 3-layer tag system
 */
export interface VideoTags {
	playlistTags: string[];
	userTags: string[];
	contentTags?: string[]; // From YouTube API
}

/**
 * Audio button association
 */
export interface AudioButtonInfo {
	count: number;
	hasButtons: boolean;
}

// Re-export Plain Object types from separate file
export type { VideoComputedProperties, VideoPlainObject } from "../plain-objects/video-plain";

// Re-export Firestore types for convenience
export type {
	FirestoreServerVideoData,
	FirestoreVideoData,
	LiveBroadcastContent,
	VideoType,
} from "../types/firestore/video";

/**
 * Frontend video data type - Plain object for Server/Client Component boundary
 */
export type FrontendVideoData = VideoPlainObject;

/**
 * Video list result type
 */
export interface VideoListResult {
	items: VideoPlainObject[];
	videos: VideoPlainObject[]; // Alias for backward compatibility
	total: number;
	page: number;
	pageSize: number;
	hasMore?: boolean;
}

/**
 * Live streaming information
 */
export interface LiveStreamingDetails {
	scheduledStartTime?: Date;
	scheduledEndTime?: Date;
	actualStartTime?: Date;
	actualEndTime?: Date;
	concurrentViewers?: number;
}

/**
 * Video Entity
 *
 * The root entity for video domain model.
 * Aggregates various value objects to represent a complete video.
 */
export class Video extends BaseEntity<Video> implements EntityValidatable<Video> {
	private _lastModified: Date;

	private constructor(
		private readonly _content: VideoContent,
		private readonly _metadata: VideoMetadata,
		private readonly _channel: Channel,
		private readonly _statistics?: VideoStatistics,
		private readonly _tags: VideoTags = { playlistTags: [], userTags: [] },
		private readonly _audioButtonInfo: AudioButtonInfo = { count: 0, hasButtons: false },
		private readonly _liveStreamingDetails?: LiveStreamingDetails,
		private readonly _liveBroadcastContent: string = "none",
		private readonly _videoType: string = "normal",
		private readonly _lastFetchedAt: Date = new Date(),
	) {
		super();
		this._lastModified = new Date();
	}

	/**
	 * Factory method to create a Video with validation
	 */
	static create(
		content: VideoContent,
		metadata: VideoMetadata,
		channel: Channel,
		statistics?: VideoStatistics,
		tags: VideoTags = { playlistTags: [], userTags: [] },
		audioButtonInfo: AudioButtonInfo = { count: 0, hasButtons: false },
		liveStreamingDetails?: LiveStreamingDetails,
		liveBroadcastContent = "none",
		videoType = "normal",
		lastFetchedAt: Date = new Date(),
	): Result<Video, ValidationError> {
		// Validate input parameters
		if (!content) {
			return err(validationError("content", "VideoContent is required"));
		}
		if (!metadata) {
			return err(validationError("metadata", "VideoMetadata is required"));
		}
		if (!channel) {
			return err(validationError("channel", "Channel is required"));
		}

		// Validate tag constraints
		if (tags.userTags && tags.userTags.length > 10) {
			return err(validationError("tags.userTags", "User tags must not exceed 10 items"));
		}
		if (tags.userTags) {
			for (let i = 0; i < tags.userTags.length; i++) {
				const tag = tags.userTags[i];
				if (!tag || tag.length < 1 || tag.length > 30) {
					return err(
						validationError(
							"tags.userTags",
							`User tag at index ${i} must be between 1 and 30 characters`,
						),
					);
				}
			}
		}

		// Validate audio button info
		if (audioButtonInfo.count < -1) {
			return err(
				validationError("audioButtonInfo.count", "Audio button count must be -1 or greater"),
			);
		}

		// Validate live broadcast content
		const validBroadcastContent = ["none", "live", "upcoming"];
		if (!validBroadcastContent.includes(liveBroadcastContent)) {
			return err(
				validationError(
					"liveBroadcastContent",
					`Invalid live broadcast content: ${liveBroadcastContent}`,
				),
			);
		}

		// Validate video type
		const validVideoTypes = ["normal", "live", "upcoming", "archived", "premiere", "possibly_live"];
		if (!validVideoTypes.includes(videoType)) {
			return err(validationError("videoType", `Invalid video type: ${videoType}`));
		}

		const video = new Video(
			content,
			metadata,
			channel,
			statistics,
			tags,
			audioButtonInfo,
			liveStreamingDetails,
			liveBroadcastContent,
			videoType,
			lastFetchedAt,
		);

		return ok(video);
	}

	// Getters for accessing value objects
	get content(): VideoContent {
		return this._content;
	}

	get metadata(): VideoMetadata {
		return this._metadata;
	}

	get channel(): Channel {
		return this._channel;
	}

	get audioButtonInfo(): AudioButtonInfo {
		return { ...this._audioButtonInfo };
	}

	get liveStreamingDetails():
		| {
				scheduledStartTime?: string;
				scheduledEndTime?: string;
				actualStartTime?: string;
				actualEndTime?: string;
				concurrentViewers?: number;
		  }
		| undefined {
		if (!this._liveStreamingDetails) return undefined;

		return {
			scheduledStartTime: this._liveStreamingDetails.scheduledStartTime?.toISOString(),
			scheduledEndTime: this._liveStreamingDetails.scheduledEndTime?.toISOString(),
			actualStartTime: this._liveStreamingDetails.actualStartTime?.toISOString(),
			actualEndTime: this._liveStreamingDetails.actualEndTime?.toISOString(),
			concurrentViewers: this._liveStreamingDetails.concurrentViewers,
		};
	}

	get lastFetchedAt(): string {
		return this._lastFetchedAt.toISOString();
	}

	get lastModified(): Date {
		return new Date(this._lastModified);
	}

	// Identity
	get id(): string {
		return this._content.videoId.toString();
	}

	// Compatibility getters for legacy code
	get videoId(): string {
		return this.id;
	}

	get title(): string {
		return this._metadata.title.toString();
	}

	get description(): string {
		return this._metadata.description.toString();
	}

	get channelId(): string {
		return this._channel.id.toString();
	}

	get channelTitle(): string {
		return this._channel.title.toString();
	}

	get publishedAt(): string {
		return this._content.publishedAt.toISOString();
	}

	get publishedAtISO(): string {
		return this._content.publishedAt.toISOString();
	}

	get lastFetchedAtISO(): string {
		return this._lastFetchedAt.toISOString();
	}

	get thumbnailUrl(): string {
		return this._content.videoId.toThumbnailUrl();
	}

	get thumbnails(): { default: { url: string }; medium: { url: string }; high: { url: string } } {
		return {
			default: { url: this._content.videoId.toThumbnailUrl("default") },
			medium: { url: this._content.videoId.toThumbnailUrl("medium") },
			high: { url: this._content.videoId.toThumbnailUrl("high") },
		};
	}

	get audioButtonCount(): number {
		return this._audioButtonInfo.count;
	}

	get hasAudioButtons(): boolean {
		return this._audioButtonInfo.hasButtons;
	}

	get playlistTags(): string[] {
		return [...this._tags.playlistTags];
	}

	get userTags(): string[] {
		return [...this._tags.userTags];
	}

	// duration getterの重複を修正
	get duration(): string | undefined {
		return this._metadata.duration?.toString();
	}

	get categoryId(): string | undefined {
		return this._channel.toPlainObject().categoryId;
	}

	get liveBroadcastContent(): string {
		return this._liveBroadcastContent;
	}

	get player(): { embedHtml: string; embedWidth?: number; embedHeight?: number } | undefined {
		return this._content.embedHtml ? { embedHtml: this._content.embedHtml } : undefined;
	}

	get statistics():
		| {
				viewCount?: number;
				likeCount?: number;
				dislikeCount?: number;
				favoriteCount?: number;
				commentCount?: number;
		  }
		| undefined {
		if (!this._statistics) return undefined;
		return {
			viewCount: this._statistics.viewCount.toNumber(),
			likeCount: this._statistics.likeCount?.toNumber(),
			dislikeCount: this._statistics.dislikeCount?.toNumber(),
			favoriteCount: this._statistics.favoriteCount,
			commentCount: this._statistics.commentCount?.toNumber(),
		};
	}

	get tags(): string[] | undefined {
		return this._content.tags;
	}

	// Additional compatibility getters
	get videoType(): string | undefined {
		return this._videoType;
	}

	get topicDetails(): { topicCategories?: string[] } | undefined {
		// Not implemented in current Video entity
		return undefined;
	}

	get recordingDetails(): Record<string, unknown> | undefined {
		// Not implemented in current Video entity
		return undefined;
	}

	get regionRestriction(): { allowed?: string[]; blocked?: string[] } | undefined {
		// Not implemented in current Video entity
		return undefined;
	}

	get definition(): string | undefined {
		return this._metadata.definition;
	}

	get dimension(): string | undefined {
		return this._metadata.dimension;
	}

	get caption(): boolean | undefined {
		return this._metadata.hasCaption;
	}

	get licensedContent(): boolean | undefined {
		return this._metadata.isLicensedContent;
	}

	get status():
		| { privacyStatus: string; uploadStatus: string; embeddable?: boolean; commentStatus?: string }
		| undefined {
		return {
			privacyStatus: this._content.privacyStatus,
			uploadStatus: this._content.uploadStatus,
			embeddable: this._content.embeddable,
		};
	}

	get contentRating(): Record<string, unknown> | undefined {
		// Not implemented in current Video entity
		return undefined;
	}

	// Business logic methods

	/**
	 * Checks if the video is available for viewing
	 */
	isAvailable(): boolean {
		return this._content.isAvailable();
	}

	/**
	 * Checks if the video is embeddable
	 */
	isEmbeddable(): boolean {
		return this._content.isEmbeddable();
	}

	/**
	 * Checks if the video is live or upcoming
	 */
	isLiveOrUpcoming(): boolean {
		if (!this._liveStreamingDetails) {
			return false;
		}
		const now = new Date();
		return (
			(this._liveStreamingDetails.scheduledStartTime !== undefined &&
				this._liveStreamingDetails.scheduledStartTime > now) ||
			(this._liveStreamingDetails.actualStartTime !== undefined &&
				!this._liveStreamingDetails.actualEndTime)
		);
	}

	/**
	 * Checks if the video is currently live
	 */
	isLive(): boolean {
		if (!this._liveStreamingDetails) {
			return false;
		}
		return (
			this._liveStreamingDetails.actualStartTime !== undefined &&
			!this._liveStreamingDetails.actualEndTime
		);
	}

	/**
	 * Get YouTube URL for the video
	 */
	getYouTubeUrl(): string {
		return `https://youtube.com/watch?v=${this._content.videoId.toString()}`;
	}

	/**
	 * Get live stream start time if available
	 */
	getLiveStreamStartTime(): Date | null {
		return this._liveStreamingDetails?.actualStartTime || null;
	}

	/**
	 * Check if this is a live stream
	 */
	isLiveStream(): boolean {
		// First check liveBroadcastContent
		if (this._liveBroadcastContent === "live") return true;

		// Also check liveStreamingDetails for ongoing streams
		// This handles cases where liveBroadcastContent is not updated properly
		if (
			this._liveStreamingDetails?.actualStartTime &&
			!this._liveStreamingDetails.actualEndTime &&
			this._liveStreamingDetails.concurrentViewers !== undefined
		) {
			return true;
		}

		return false;
	}

	/**
	 * Check if this is an upcoming stream
	 */
	isUpcomingStream(): boolean {
		return this._liveBroadcastContent === "upcoming";
	}

	/**
	 * Check if this is an archived stream
	 */
	isArchivedStream(): boolean {
		// Check explicit video type first
		if (this._videoType === "archived") {
			return true;
		}

		// Can't be archived if it's currently live or upcoming
		if (this._liveBroadcastContent === "live" || this._liveBroadcastContent === "upcoming") {
			return false;
		}

		// If it has actual end time, it's an archived stream
		if (this._liveStreamingDetails?.actualEndTime) {
			// Duration over 15 minutes indicates a stream archive
			const duration = this._metadata.duration;
			if (duration) {
				const durationMs = duration.toMilliseconds();
				return durationMs > 15 * 60 * 1000; // 15 minutes
			}
			return true;
		}

		return false;
	}

	/**
	 * Check if this is a premiere video
	 */
	isPremiere(): boolean {
		// If it has live streaming details but duration is 15 minutes or less
		if (this._liveStreamingDetails?.actualEndTime) {
			const duration = this._metadata.duration;
			if (duration) {
				const durationMs = duration.toMilliseconds();
				return durationMs <= 15 * 60 * 1000; // 15 minutes or less
			}
		}
		return false;
	}

	/**
	 * Updates user tags
	 */
	updateUserTags(tags: string[]): Result<Video, ValidationError> {
		const result = Video.create(
			this._content,
			this._metadata,
			this._channel,
			this._statistics,
			{ ...this._tags, userTags: tags },
			this._audioButtonInfo,
			this._liveStreamingDetails,
			this._liveBroadcastContent,
			this._videoType,
			this._lastFetchedAt,
		);

		return result;
	}

	/**
	 * Updates statistics
	 */
	updateStatistics(statistics: VideoStatistics): Result<Video, ValidationError> {
		const result = Video.create(
			this._content,
			this._metadata,
			this._channel,
			statistics,
			this._tags,
			this._audioButtonInfo,
			this._liveStreamingDetails,
			this._liveBroadcastContent,
			this._videoType,
			this._lastFetchedAt,
		);

		return result;
	}

	/**
	 * Updates audio button information
	 */
	updateAudioButtonInfo(info: AudioButtonInfo): Result<Video, ValidationError> {
		const result = Video.create(
			this._content,
			this._metadata,
			this._channel,
			this._statistics,
			this._tags,
			info,
			this._liveStreamingDetails,
			this._liveBroadcastContent,
			this._videoType,
			this._lastFetchedAt,
		);

		return result;
	}

	/**
	 * Convert Firestore timestamp to Date object
	 */
	private static convertTimestamp(timestamp: unknown): Date | undefined {
		if (!timestamp) return undefined;
		if (timestamp instanceof Date) return timestamp;
		if (typeof timestamp === "string") return new Date(timestamp);
		if (typeof timestamp === "object" && "_seconds" in timestamp) {
			return new Date((timestamp as { _seconds: number })._seconds * 1000);
		}
		if (typeof timestamp === "object" && "toDate" in timestamp) {
			const timestampWithToDate = timestamp as { toDate: () => Date };
			return timestampWithToDate.toDate();
		}
		return undefined;
	}

	/**
	 * Create VideoStatistics from Firestore data
	 */
	private static createStatisticsFromFirestore(
		data: FirestoreServerVideoData,
	): VideoStatistics | undefined {
		if (!data.statistics) return undefined;

		return new VideoStatistics(
			new ViewCount(data.statistics.viewCount || 0),
			data.statistics.likeCount !== undefined
				? new LikeCount(data.statistics.likeCount)
				: undefined,
			data.statistics.dislikeCount !== undefined
				? new DislikeCount(data.statistics.dislikeCount)
				: undefined,
			data.statistics.favoriteCount,
			data.statistics.commentCount !== undefined
				? new CommentCount(data.statistics.commentCount)
				: undefined,
		);
	}

	/**
	 * Create LiveStreamingDetails from Firestore data
	 */
	private static createLiveStreamingDetailsFromFirestore(
		data: FirestoreServerVideoData,
	): LiveStreamingDetails | undefined {
		if (!data.liveStreamingDetails) return undefined;

		return {
			scheduledStartTime: Video.convertTimestamp(data.liveStreamingDetails.scheduledStartTime),
			scheduledEndTime: Video.convertTimestamp(data.liveStreamingDetails.scheduledEndTime),
			actualStartTime: Video.convertTimestamp(data.liveStreamingDetails.actualStartTime),
			actualEndTime: Video.convertTimestamp(data.liveStreamingDetails.actualEndTime),
			concurrentViewers: data.liveStreamingDetails.concurrentViewers,
		};
	}

	/**
	 * Create ContentDetails from Firestore data
	 */
	private static createContentDetailsFromFirestore(
		data: FirestoreServerVideoData,
	): ContentDetails | undefined {
		if (
			!data.definition &&
			!data.dimension &&
			data.caption === undefined &&
			data.licensedContent === undefined
		) {
			return undefined;
		}

		const result = ContentDetails.create(
			data.dimension as "2d" | "3d" | undefined,
			data.definition as "hd" | "sd" | undefined,
			typeof data.caption === "boolean" ? data.caption : data.caption === "true",
			data.licensedContent,
			undefined,
		);
		if (result.isErr()) {
			return undefined; // Return undefined if creation fails
		}
		return result.value;
	}

	/**
	 * Validates required fields for Video creation
	 */
	private static validateRequiredFields(
		data: FirestoreServerVideoData,
	): Result<void, DatabaseError> {
		if (!data.videoId) {
			return err(databaseError("fromFirestoreData", "Missing required field: videoId"));
		}
		if (!data.title) {
			return err(databaseError("fromFirestoreData", "Missing required field: title"));
		}
		if (!data.channelId) {
			return err(databaseError("fromFirestoreData", "Missing required field: channelId"));
		}
		if (!data.channelTitle) {
			return err(databaseError("fromFirestoreData", "Missing required field: channelTitle"));
		}
		return ok(undefined);
	}

	/**
	 * Creates VideoContent from Firestore data
	 */
	private static createVideoContent(
		data: FirestoreServerVideoData,
	): Result<VideoContent, DatabaseError> {
		try {
			// Create VideoId
			const videoIdResult = VideoId.create(data.videoId);
			if (videoIdResult.isErr()) {
				return err(
					databaseError(
						"fromFirestoreData",
						`Failed to create VideoId: ${videoIdResult.error.message}`,
					),
				);
			}

			// Create PublishedAt
			const publishedAtResult = PublishedAt.create(
				Video.convertTimestamp(data.publishedAt) || new Date(),
			);
			if (publishedAtResult.isErr()) {
				return err(
					databaseError(
						"fromFirestoreData",
						`Failed to create PublishedAt: ${publishedAtResult.error.message}`,
					),
				);
			}

			// Create VideoContent
			// Convert structured tags to flat array for VideoContent
			const flatTags: string[] = [];
			if (data.tags?.playlistTags) flatTags.push(...data.tags.playlistTags);
			if (data.tags?.userTags) flatTags.push(...data.tags.userTags);
			if (data.tags?.contentTags) flatTags.push(...data.tags.contentTags);

			const contentResult = VideoContent.create(
				videoIdResult.value,
				publishedAtResult.value,
				(data.status?.privacyStatus as PrivacyStatus) || "public",
				(data.status?.uploadStatus as UploadStatus) || "processed",
				Video.createContentDetailsFromFirestore(data),
				data.player?.embedHtml,
				flatTags.length > 0 ? flatTags : undefined,
				data.status?.embeddable,
			);
			if (contentResult.isErr()) {
				return err(
					databaseError(
						"fromFirestoreData",
						`Failed to create VideoContent: ${contentResult.error.message}`,
					),
				);
			}
			return ok(contentResult.value);
		} catch (error) {
			return err(
				databaseError(
					"fromFirestoreData",
					`Failed to create VideoContent: ${error instanceof Error ? error.message : "Unknown error"}`,
				),
			);
		}
	}

	/**
	 * Creates VideoMetadata from Firestore data
	 */
	private static createVideoMetadata(
		data: FirestoreServerVideoData,
	): Result<VideoMetadata, DatabaseError> {
		try {
			const metadata = new VideoMetadata(
				new VideoTitle(data.title),
				new VideoDescription(data.description || ""),
				data.duration ? new VideoDuration(data.duration) : undefined,
				data.dimension as "2d" | "3d" | undefined,
				data.definition as "hd" | "sd" | undefined,
				typeof data.caption === "boolean" ? data.caption : data.caption === "true",
				data.licensedContent,
			);
			return ok(metadata);
		} catch (error) {
			return err(
				databaseError(
					"fromFirestoreData",
					`Failed to create VideoMetadata: ${error instanceof Error ? error.message : "Unknown error"}`,
				),
			);
		}
	}

	/**
	 * Creates Channel from Firestore data
	 */
	private static createChannel(data: FirestoreServerVideoData): Result<Channel, DatabaseError> {
		try {
			const channel = Channel.fromPlainObject({
				channelId: data.channelId,
				channelTitle: data.channelTitle,
				categoryId: data.categoryId,
			});
			return ok(channel);
		} catch (error) {
			return err(
				databaseError(
					"fromFirestoreData",
					`Failed to create Channel: ${error instanceof Error ? error.message : "Unknown error"}`,
				),
			);
		}
	}

	/**
	 * Creates a Video directly from Firestore data
	 * Returns Result<Video, DatabaseError> for proper error handling
	 */
	static fromFirestoreData(data: FirestoreServerVideoData): Result<Video, DatabaseError> {
		try {
			// Validate required fields
			const validationResult = Video.validateRequiredFields(data);
			if (validationResult.isErr()) {
				return err(validationResult.error);
			}

			// Create content
			const contentResult = Video.createVideoContent(data);
			if (contentResult.isErr()) {
				return err(contentResult.error);
			}
			const content = contentResult.value;

			// Create metadata
			const metadataResult = Video.createVideoMetadata(data);
			if (metadataResult.isErr()) {
				return err(metadataResult.error);
			}
			const metadata = metadataResult.value;

			// Create channel
			const channelResult = Video.createChannel(data);
			if (channelResult.isErr()) {
				return err(channelResult.error);
			}
			const channel = channelResult.value;

			// Create optional components
			const statistics = Video.createStatisticsFromFirestore(data);
			const liveStreamingDetails = Video.createLiveStreamingDetailsFromFirestore(data);
			const lastFetchedAt = Video.convertTimestamp(data.lastFetchedAt) || new Date();

			// Create the Video instance
			const video = new Video(
				content,
				metadata,
				channel,
				statistics,
				{
					playlistTags: data.tags?.playlistTags || data.playlistTags || [],
					userTags: data.tags?.userTags || data.userTags || [],
					contentTags: data.tags?.contentTags || [],
				},
				{
					count: data.audioButtonCount || 0,
					hasButtons: data.hasAudioButtons || false,
				},
				liveStreamingDetails,
				data.liveBroadcastContent || "none",
				"normal",
				lastFetchedAt,
			);

			return ok(video);
		} catch (error) {
			return err(
				databaseError(
					"fromFirestoreData",
					`Unexpected error creating Video from Firestore data: ${error instanceof Error ? error.message : "Unknown error"}`,
				),
			);
		}
	}

	/**
	 * Convert to Firestore format for direct persistence
	 */
	toFirestore(): FirestoreServerVideoData {
		const data: FirestoreServerVideoData = {
			...this.getCoreFirestoreFields(),
			...this.getOptionalFirestoreFields(),
			...this.getContentFirestoreFields(),
		};

		// Add complex nested objects
		this.addStatisticsToFirestore(data);
		this.addLiveStreamingToFirestore(data);
		this.addStatusToFirestore(data);
		this.addPlayerToFirestore(data);

		return data;
	}

	/**
	 * Get core required fields for Firestore
	 */
	private getCoreFirestoreFields(): Pick<
		FirestoreServerVideoData,
		| "videoId"
		| "title"
		| "description"
		| "channelId"
		| "channelTitle"
		| "publishedAt"
		| "thumbnailUrl"
		| "lastFetchedAt"
	> {
		return {
			videoId: this.id,
			title: this.title,
			description: this.description,
			channelId: this.channelId,
			channelTitle: this.channelTitle,
			publishedAt: this._content.publishedAt.toDate(),
			thumbnailUrl: this.thumbnailUrl,
			lastFetchedAt: this._lastFetchedAt,
		};
	}

	/**
	 * Get optional fields for Firestore
	 */
	private getOptionalFirestoreFields(): Partial<FirestoreServerVideoData> {
		const fields: Partial<FirestoreServerVideoData> = {};

		if (this._videoType) {
			fields.videoType = this._videoType as VideoType;
		}
		if (this._liveBroadcastContent) {
			fields.liveBroadcastContent = this._liveBroadcastContent as LiveBroadcastContent;
		}
		// Only include audio button fields if count is not -1
		// -1 is a sentinel value indicating "do not update"
		if (this._audioButtonInfo.count >= 0) {
			fields.audioButtonCount = this._audioButtonInfo.count;
			fields.hasAudioButtons = this._audioButtonInfo.hasButtons;
		}

		return fields;
	}

	/**
	 * Get content-related fields for Firestore
	 */
	private getContentFirestoreFields(): Partial<FirestoreServerVideoData> {
		const fields: Partial<FirestoreServerVideoData> = {};

		if (this.duration) fields.duration = this.duration;
		if (this.categoryId) fields.categoryId = this.categoryId;
		// Use _tags (VideoTags object) instead of tags getter (string[])
		if (this._tags) {
			fields.tags = {
				playlistTags: this._tags.playlistTags,
				userTags: this._tags.userTags,
				contentTags: this._tags.contentTags,
			};
		}
		if (this.playlistTags.length > 0) fields.playlistTags = this.playlistTags;
		if (this.userTags.length > 0) fields.userTags = this.userTags;
		if (this.dimension) fields.dimension = this.dimension;
		if (this.definition) fields.definition = this.definition;
		if (this.caption !== undefined) fields.caption = this.caption;
		if (this.licensedContent !== undefined) fields.licensedContent = this.licensedContent;

		return fields;
	}

	/**
	 * Add statistics to Firestore data if available
	 */
	private addStatisticsToFirestore(data: FirestoreServerVideoData): void {
		if (this._statistics) {
			data.statistics = {
				viewCount: this._statistics.viewCount.toNumber(),
				likeCount: this._statistics.likeCount?.toNumber(),
				dislikeCount: this._statistics.dislikeCount?.toNumber(),
				favoriteCount: this._statistics.favoriteCount,
				commentCount: this._statistics.commentCount?.toNumber(),
			};
		}
	}

	/**
	 * Add live streaming details to Firestore data if available
	 */
	private addLiveStreamingToFirestore(data: FirestoreServerVideoData): void {
		if (this._liveStreamingDetails) {
			data.liveStreamingDetails = {
				scheduledStartTime: this._liveStreamingDetails.scheduledStartTime,
				scheduledEndTime: this._liveStreamingDetails.scheduledEndTime,
				actualStartTime: this._liveStreamingDetails.actualStartTime,
				actualEndTime: this._liveStreamingDetails.actualEndTime,
				concurrentViewers: this._liveStreamingDetails.concurrentViewers,
			};
		}
	}

	/**
	 * Add status to Firestore data if available
	 */
	private addStatusToFirestore(data: FirestoreServerVideoData): void {
		if (
			this._content.privacyStatus ||
			this._content.uploadStatus ||
			this._content.embeddable !== undefined
		) {
			data.status = {
				privacyStatus: this._content.privacyStatus,
				uploadStatus: this._content.uploadStatus,
				embeddable: this._content.embeddable,
			};
		}
	}

	/**
	 * Add player to Firestore data if available
	 */
	private addPlayerToFirestore(data: FirestoreServerVideoData): void {
		if (this._content.embedHtml) {
			data.player = {
				embedHtml: this._content.embedHtml,
			};
		}
	}

	/**
	 * Checks equality based on video ID
	 */
	equals(other: Video): boolean {
		if (!other || !(other instanceof Video)) {
			return false;
		}
		return this.id === other.id;
	}

	/**
	 * Creates a copy of the video
	 */
	clone(): Video {
		const result = Video.create(
			this._content.clone(),
			this._metadata.clone(),
			this._channel.clone(),
			this._statistics?.clone(),
			{ ...this._tags },
			{ ...this._audioButtonInfo },
			this._liveStreamingDetails ? { ...this._liveStreamingDetails } : undefined,
			this._liveBroadcastContent,
			this._videoType,
			new Date(this._lastFetchedAt),
		);

		if (result.isErr()) {
			// This should not happen in normal circumstances since we're cloning existing valid data
			// But if it does, we need to handle it gracefully
			throw new Error(`Failed to clone video: ${result.error.message}`);
		}

		return result.value;
	}

	/**
	 * Validates the entity and returns whether it's valid
	 */
	isValid(): boolean {
		// Validate required value objects
		if (!this._content.isValid()) return false;
		if (!this._metadata.isValid()) return false;
		if (!this._channel.isValid()) return false;

		// Validate optional value objects
		if (this._statistics && !this._statistics.isValid()) return false;

		// Validate tag constraints
		if (this._tags.userTags.length > 10) return false;
		if (this._tags.userTags.some((tag) => tag.length < 1 || tag.length > 30)) return false;

		// Validate audio button info
		if (this._audioButtonInfo.count < -1) return false;

		// Validate live broadcast content
		const validBroadcastContent = ["none", "live", "upcoming"];
		if (!validBroadcastContent.includes(this._liveBroadcastContent)) return false;

		// Validate video type
		const validVideoTypes = ["normal", "live", "upcoming", "archived", "premiere", "possibly_live"];
		if (!validVideoTypes.includes(this._videoType)) return false;

		return true;
	}

	/**
	 * Returns an array of validation error messages
	 */
	getValidationErrors(): string[] {
		const errors: string[] = [];

		// Check required value objects
		if (!this._content.isValid()) {
			errors.push(...this._content.getValidationErrors().map((e) => `Content: ${e}`));
		}
		if (!this._metadata.isValid()) {
			errors.push(...this._metadata.getValidationErrors().map((e) => `Metadata: ${e}`));
		}
		if (!this._channel.isValid()) {
			errors.push(...this._channel.getValidationErrors().map((e) => `Channel: ${e}`));
		}

		// Check optional value objects
		if (this._statistics && !this._statistics.isValid()) {
			errors.push(...this._statistics.getValidationErrors().map((e) => `Statistics: ${e}`));
		}

		// Check tag constraints
		if (this._tags.userTags.length > 10) {
			errors.push("User tags must not exceed 10 items");
		}
		this._tags.userTags.forEach((tag, index) => {
			if (tag.length < 1 || tag.length > 30) {
				errors.push(`User tag at index ${index} must be between 1 and 30 characters`);
			}
		});

		// Check audio button info
		if (this._audioButtonInfo.count < -1) {
			errors.push("Audio button count must be -1 or greater");
		}

		// Check live broadcast content
		const validBroadcastContent = ["none", "live", "upcoming"];
		if (!validBroadcastContent.includes(this._liveBroadcastContent)) {
			errors.push(`Invalid live broadcast content: ${this._liveBroadcastContent}`);
		}

		// Check video type
		const validVideoTypes = ["normal", "live", "upcoming", "archived", "premiere", "possibly_live"];
		if (!validVideoTypes.includes(this._videoType)) {
			errors.push(`Invalid video type: ${this._videoType}`);
		}

		return errors;
	}

	/**
	 * Get video type for display
	 */
	getVideoType(): VideoComputedProperties["videoType"] {
		// First check the liveBroadcastContent field
		if (this._liveBroadcastContent === "live") return "live";
		if (this._liveBroadcastContent === "upcoming") return "upcoming";

		// Check if it's currently live based on liveStreamingDetails
		// This handles cases where liveBroadcastContent is "none" but the stream is still live
		if (
			this._liveStreamingDetails?.actualStartTime &&
			!this._liveStreamingDetails.actualEndTime &&
			this._liveStreamingDetails.concurrentViewers !== undefined
		) {
			return "live";
		}

		// Check if it's an upcoming stream based on scheduledStartTime
		// This handles cases where liveBroadcastContent is "none" but scheduledStartTime is in the future
		if (
			this._liveStreamingDetails?.scheduledStartTime &&
			!this._liveStreamingDetails.actualStartTime
		) {
			const now = new Date();
			if (this._liveStreamingDetails.scheduledStartTime > now) {
				return "upcoming";
			}
			// 配信予定時刻を過ぎているが、actualStartTimeがない場合
			// データ更新の遅延により、実際は配信中の可能性がある
			return "possibly_live";
		}

		// Then check if it's an archived stream or premiere
		if (this.isArchivedStream()) return "archived";
		if (this.isPremiere()) return "premiere";

		return "normal";
	}

	/**
	 * Check if audio button can be created
	 */
	canCreateAudioButton(): boolean {
		// ライブ配信中または配信予定の動画は作成不可
		if (this._liveBroadcastContent === "live" || this._liveBroadcastContent === "upcoming") {
			return false;
		}

		// liveStreamingDetailsが存在しactualEndTimeがある場合は配信アーカイブ
		// 15分以上の動画のみ音声ボタン作成可能
		if (this._liveStreamingDetails?.actualEndTime) {
			const duration = this._metadata.duration;
			if (duration) {
				const durationMs = duration.toMilliseconds();
				return durationMs > 15 * 60 * 1000; // 15 minutes
			}
		}

		// それ以外は作成不可
		return false;
	}

	/**
	 * Convert to plain object for Next.js serialization
	 */
	toPlainObject(): VideoPlainObject {
		// Convert timestamps
		const convertTimestamp = (date: Date | undefined): string => {
			if (!date) return new Date().toISOString(); // デフォルト値
			return date.toISOString();
		};

		// Convert live streaming details
		const liveStreamingDetails = this._liveStreamingDetails
			? {
					scheduledStartTime: this._liveStreamingDetails.scheduledStartTime?.toISOString(),
					scheduledEndTime: this._liveStreamingDetails.scheduledEndTime?.toISOString(),
					actualStartTime: this._liveStreamingDetails.actualStartTime?.toISOString(),
					actualEndTime: this._liveStreamingDetails.actualEndTime?.toISOString(),
					concurrentViewers: this._liveStreamingDetails.concurrentViewers,
				}
			: undefined;

		return {
			// Core fields
			id: this.id,
			videoId: this.videoId,
			title: this.title,
			description: this.description,
			channelId: this.channelId,
			channelTitle: this.channelTitle,
			publishedAt: convertTimestamp(this._content.publishedAt.toDate()),
			thumbnailUrl: this.thumbnailUrl,
			lastFetchedAt: convertTimestamp(this._lastFetchedAt),

			// Audio button info
			audioButtonCount: this.audioButtonCount,
			hasAudioButtons: this.hasAudioButtons,

			// Content details
			duration: this.duration,
			categoryId: this.categoryId,
			tags: {
				playlistTags: this._tags.playlistTags,
				userTags: this._tags.userTags,
				contentTags: this._tags.contentTags,
			},
			playlistTags: this.playlistTags,
			userTags: this.userTags,

			// Statistics
			statistics: this.statistics,

			// Live streaming
			liveStreamingDetails,
			liveBroadcastContent: this.liveBroadcastContent as LiveBroadcastContent,
			videoType: this._videoType as VideoType,

			// Video quality details
			dimension: this.dimension,
			definition: this.definition,
			caption: this.caption,
			licensedContent: this.licensedContent,

			// Video status
			status: this.status,

			// Player embed
			player: this.player,

			// Topic details
			topicDetails: this.topicDetails,

			// Computed properties
			_computed: {
				isArchived: this.isArchivedStream(),
				isPremiere: this.isPremiere(),
				isLive: this.isLiveStream(),
				isUpcoming: this.isUpcomingStream(),
				canCreateButton: this.canCreateAudioButton(),
				videoType: this.getVideoType(),
				thumbnailUrl: this.thumbnailUrl,
				youtubeUrl: this.getYouTubeUrl(),
			},
		};
	}
}

/**
 * 動画が音声ボタン作成可能かどうかを判定する関数
 * ビジネスルール: 配信アーカイブのみ音声ボタン作成可能
 * @param video 動画データ
 * @returns 音声ボタン作成可能かどうか
 */
export function canCreateAudioButton(video: FrontendVideoData): boolean {
	// VideoPlainObjectは常に_computedプロパティを持つ
	return video._computed.canCreateButton;
}

/**
 * 音声ボタン作成不可の理由を返す関数
 * @param video 動画データ
 * @returns エラーメッセージ
 */
export function getAudioButtonCreationErrorMessage(video: FrontendVideoData): string | null {
	// 作成可能な場合はnullを返す
	if (video._computed.canCreateButton) {
		return null;
	}

	// videoTypeに基づいてエラーメッセージを返す
	switch (video._computed.videoType) {
		case "live":
			return "ライブ配信中は音声ボタンを作成できません";
		case "upcoming":
			return "配信予定の動画には音声ボタンを作成できません";
		case "premiere":
			return "プレミア公開動画には音声ボタンを作成できません";
		case "normal":
			return "音声ボタンを作成できるのは配信アーカイブのみです";
		case "archived":
			// アーカイブなのに作成できない場合（通常はないはず）
			return "この動画では音声ボタンを作成できません";
		default:
			return "音声ボタンを作成できません";
	}
}

/**
 * Convert Firestore data to frontend video format
 * @param data Firestore video data or Video entity
 * @returns Frontend video data (Plain object)
 */
export function convertToFrontendVideo(data: FirestoreServerVideoData | Video): FrontendVideoData {
	// If it's already a Video entity, convert to plain object
	if (data instanceof Video) {
		return data.toPlainObject();
	}

	// Convert Firestore data to Video entity and then to plain object
	const result = Video.fromFirestoreData(data);
	if (result.isErr()) {
		throw new Error(`Failed to convert Firestore data to frontend video: ${result.error.detail}`);
	}
	return result.value.toPlainObject();
}
