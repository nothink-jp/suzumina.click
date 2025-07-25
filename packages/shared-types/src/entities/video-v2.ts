/**
 * Video Entity V2
 *
 * Represents a YouTube video with rich domain behavior using Value Objects.
 * This new implementation maintains backward compatibility while introducing
 * a cleaner domain model with proper encapsulation and business logic.
 */

import { Channel } from "../value-objects/channel";
import {
	ContentDetails,
	type PrivacyStatus,
	PublishedAt,
	type UploadStatus,
	VideoContent,
	VideoId,
} from "../value-objects/video-content";
import {
	VideoDescription,
	VideoDuration,
	VideoMetadata,
	VideoTitle,
} from "../value-objects/video-metadata";
import {
	CommentCount,
	DislikeCount,
	LikeCount,
	VideoStatistics,
	ViewCount,
} from "../value-objects/video-statistics";

/**
 * Legacy format interface for type safety
 */
interface LegacyVideoData {
	// Core fields
	id?: string;
	videoId?: string;
	title: string;
	description?: string;
	channelId: string;
	channelTitle: string;
	categoryId?: string;
	publishedAt: string;
	lastFetchedAt?: string;

	// Content details
	duration?: string;
	dimension?: string;
	definition?: string;
	caption?: boolean;
	licensedContent?: boolean;
	projection?: string;

	// Statistics
	statistics?: {
		viewCount?: number;
		likeCount?: number;
		dislikeCount?: number;
		favoriteCount?: number;
		commentCount?: number;
	};

	// Status
	status?: {
		privacyStatus?: string;
		uploadStatus?: string;
	};

	// Player
	player?: {
		embedHtml?: string;
	};

	// Tags
	tags?: string[];
	playlistTags?: string[];
	userTags?: string[];

	// Audio button info
	audioButtonCount?: number;
	hasAudioButtons?: boolean;

	// Live streaming
	liveStreamingDetails?: {
		scheduledStartTime?: string;
		scheduledEndTime?: string;
		actualStartTime?: string;
		actualEndTime?: string;
		concurrentViewers?: number;
	};

	// Additional fields
	liveBroadcastContent?: string;
	videoType?: string;
}

/**
 * Legacy output format interface
 */
interface LegacyVideoOutput {
	// Core fields
	id: string;
	videoId: string;
	title: string;
	description: string;
	channelId: string;
	channelTitle: string;
	publishedAt: string;
	publishedAtISO: string;
	lastFetchedAt: string;
	lastFetchedAtISO: string;
	thumbnailUrl: string;
	audioButtonCount: number;
	hasAudioButtons: boolean;
	playlistTags: string[];
	userTags: string[];

	// Optional fields
	duration?: string;
	dimension?: string;
	definition?: string;
	caption?: boolean;
	licensedContent?: boolean;
	statistics?: {
		viewCount: number;
		likeCount?: number;
		dislikeCount?: number;
		favoriteCount?: number;
		commentCount?: number;
	};
	status?: {
		privacyStatus: string;
		uploadStatus: string;
	};
	player?: {
		embedHtml: string;
	};
	tags?: string[];
	liveStreamingDetails?: {
		scheduledStartTime?: string;
		scheduledEndTime?: string;
		actualStartTime?: string;
		actualEndTime?: string;
		concurrentViewers?: number;
	};
	thumbnails?: {
		default: { url: string };
		medium: { url: string };
		high: { url: string };
	};
}

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
export class Video {
	private _lastModified: Date;

	constructor(
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
		this._lastModified = new Date();
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

	get statistics(): VideoStatistics | undefined {
		return this._statistics;
	}

	get tags(): VideoTags {
		return { ...this._tags };
	}

	get audioButtonInfo(): AudioButtonInfo {
		return { ...this._audioButtonInfo };
	}

	get liveStreamingDetails(): LiveStreamingDetails | undefined {
		return this._liveStreamingDetails ? { ...this._liveStreamingDetails } : undefined;
	}

	get lastFetchedAt(): Date {
		return new Date(this._lastFetchedAt);
	}

	get lastModified(): Date {
		return new Date(this._lastModified);
	}

	// Identity
	get id(): string {
		return this._content.videoId.toString();
	}

	// Business logic methods

	/**
	 * Checks if the video is available for viewing
	 */
	isAvailable(): boolean {
		return this._content.isAvailable();
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
	 * Checks if the video has audio buttons
	 */
	hasAudioButtons(): boolean {
		return this._audioButtonInfo.hasButtons;
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
		return this._liveBroadcastContent === "live";
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
	updateUserTags(tags: string[]): Video {
		if (tags.length > 10) {
			throw new Error("ユーザータグは最大10個まで設定できます");
		}
		const validTags = tags.filter((tag) => tag.length >= 1 && tag.length <= 30);

		return new Video(
			this._content,
			this._metadata,
			this._channel,
			this._statistics,
			{ ...this._tags, userTags: validTags },
			this._audioButtonInfo,
			this._liveStreamingDetails,
			this._liveBroadcastContent,
			this._videoType,
			this._lastFetchedAt,
		);
	}

	/**
	 * Updates statistics
	 */
	updateStatistics(statistics: VideoStatistics): Video {
		return new Video(
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
	}

	/**
	 * Updates audio button information
	 */
	updateAudioButtonInfo(info: AudioButtonInfo): Video {
		return new Video(
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
	}

	/**
	 * Creates channel from legacy data
	 */
	private static createChannelFromLegacy(data: LegacyVideoData): Channel {
		return Channel.fromPlainObject({
			channelId: data.channelId,
			channelTitle: data.channelTitle,
			categoryId: data.categoryId,
		});
	}

	/**
	 * Creates metadata from legacy data
	 */
	private static createMetadataFromLegacy(data: LegacyVideoData): VideoMetadata {
		return new VideoMetadata(
			new VideoTitle(data.title),
			new VideoDescription(data.description || ""),
			data.duration ? new VideoDuration(data.duration) : undefined,
			data.dimension as "2d" | "3d" | undefined,
			data.definition as "hd" | "sd" | undefined,
			data.caption,
			data.licensedContent,
		);
	}

	/**
	 * Creates content from legacy data
	 */
	private static createContentFromLegacy(data: LegacyVideoData): VideoContent {
		const hasContentDetails =
			data.definition ||
			data.dimension ||
			data.caption !== undefined ||
			data.licensedContent !== undefined;

		const contentDetails = hasContentDetails
			? new ContentDetails(
					data.dimension as "2d" | "3d" | undefined,
					data.definition as "hd" | "sd" | undefined,
					data.caption,
					data.licensedContent,
					data.projection as "rectangular" | "360" | undefined,
				)
			: undefined;

		return new VideoContent(
			new VideoId(data.videoId || data.id || ""),
			new PublishedAt(data.publishedAt),
			(data.status?.privacyStatus as PrivacyStatus) || "public",
			(data.status?.uploadStatus as UploadStatus) || "processed",
			contentDetails,
			data.player?.embedHtml,
			data.tags,
		);
	}

	/**
	 * Creates statistics from legacy data
	 */
	private static createStatisticsFromLegacy(data: LegacyVideoData): VideoStatistics | undefined {
		if (!data.statistics) {
			return undefined;
		}

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
	 * Creates live streaming details from legacy data
	 */
	private static createLiveStreamingDetailsFromLegacy(
		data: LegacyVideoData,
	): LiveStreamingDetails | undefined {
		if (!data.liveStreamingDetails) {
			return undefined;
		}

		const details = data.liveStreamingDetails;
		return {
			scheduledStartTime: details.scheduledStartTime
				? new Date(details.scheduledStartTime)
				: undefined,
			scheduledEndTime: details.scheduledEndTime ? new Date(details.scheduledEndTime) : undefined,
			actualStartTime: details.actualStartTime ? new Date(details.actualStartTime) : undefined,
			actualEndTime: details.actualEndTime ? new Date(details.actualEndTime) : undefined,
			concurrentViewers: details.concurrentViewers,
		};
	}

	/**
	 * Creates a Video from legacy format
	 */
	static fromLegacyFormat(data: LegacyVideoData): Video {
		return new Video(
			Video.createContentFromLegacy(data),
			Video.createMetadataFromLegacy(data),
			Video.createChannelFromLegacy(data),
			Video.createStatisticsFromLegacy(data),
			{
				playlistTags: data.playlistTags || [],
				userTags: data.userTags || [],
				contentTags: data.tags,
			},
			{
				count: data.audioButtonCount || 0,
				hasButtons: data.hasAudioButtons || false,
			},
			Video.createLiveStreamingDetailsFromLegacy(data),
			data.liveBroadcastContent || "none",
			data.videoType || "normal",
			data.lastFetchedAt ? new Date(data.lastFetchedAt) : new Date(),
		);
	}

	/**
	 * Creates base legacy object
	 */
	private createBaseLegacyObject(): LegacyVideoOutput {
		return {
			id: this.id,
			videoId: this.id,
			title: this._metadata.title.toString(),
			description: this._metadata.description.toString(),
			channelId: this._channel.id.toString(),
			channelTitle: this._channel.title.toString(),
			publishedAt: this._content.publishedAt.toISOString(),
			publishedAtISO: this._content.publishedAt.toISOString(),
			lastFetchedAt: this._lastFetchedAt.toISOString(),
			lastFetchedAtISO: this._lastFetchedAt.toISOString(),
			thumbnailUrl: this._content.videoId.toThumbnailUrl(),
			audioButtonCount: this._audioButtonInfo.count,
			hasAudioButtons: this._audioButtonInfo.hasButtons,
			playlistTags: this._tags.playlistTags,
			userTags: this._tags.userTags,
		};
	}

	/**
	 * Adds metadata fields to legacy object
	 */
	private addMetadataToLegacy(base: LegacyVideoOutput): void {
		if (this._metadata.duration) {
			base.duration = this._metadata.duration.toString();
		}
		if (this._metadata.dimension) {
			base.dimension = this._metadata.dimension;
		}
		if (this._metadata.definition) {
			base.definition = this._metadata.definition;
		}
		if (this._metadata.hasCaption !== undefined) {
			base.caption = this._metadata.hasCaption;
		}
		if (this._metadata.isLicensedContent !== undefined) {
			base.licensedContent = this._metadata.isLicensedContent;
		}
	}

	/**
	 * Adds statistics to legacy object
	 */
	private addStatisticsToLegacy(base: LegacyVideoOutput): void {
		if (this._statistics) {
			base.statistics = {
				viewCount: this._statistics.viewCount.toNumber(),
				likeCount: this._statistics.likeCount?.toNumber(),
				dislikeCount: this._statistics.dislikeCount?.toNumber(),
				favoriteCount: this._statistics.favoriteCount,
				commentCount: this._statistics.commentCount?.toNumber(),
			};
		}
	}

	/**
	 * Adds content details to legacy object
	 */
	private addContentDetailsToLegacy(base: LegacyVideoOutput): void {
		if (this._content.contentDetails) {
			base.status = {
				privacyStatus: this._content.privacyStatus,
				uploadStatus: this._content.uploadStatus,
			};
		}

		if (this._content.embedHtml) {
			base.player = {
				embedHtml: this._content.embedHtml,
			};
		}

		if (this._content.tags) {
			base.tags = this._content.tags;
		}
	}

	/**
	 * Adds live streaming details to legacy object
	 */
	private addLiveStreamingToLegacy(base: LegacyVideoOutput): void {
		if (!this._liveStreamingDetails) {
			return;
		}

		const details: NonNullable<LegacyVideoOutput["liveStreamingDetails"]> = {};
		const streaming = this._liveStreamingDetails;

		if (streaming.scheduledStartTime) {
			details.scheduledStartTime = streaming.scheduledStartTime.toISOString();
		}
		if (streaming.scheduledEndTime) {
			details.scheduledEndTime = streaming.scheduledEndTime.toISOString();
		}
		if (streaming.actualStartTime) {
			details.actualStartTime = streaming.actualStartTime.toISOString();
		}
		if (streaming.actualEndTime) {
			details.actualEndTime = streaming.actualEndTime.toISOString();
		}
		if (streaming.concurrentViewers !== undefined) {
			details.concurrentViewers = streaming.concurrentViewers;
		}

		base.liveStreamingDetails = details;
	}

	/**
	 * Converts to legacy format for backward compatibility
	 */
	toLegacyFormat(): LegacyVideoOutput {
		const base = this.createBaseLegacyObject();

		// Add optional fields
		this.addMetadataToLegacy(base);
		this.addStatisticsToLegacy(base);
		this.addContentDetailsToLegacy(base);
		this.addLiveStreamingToLegacy(base);

		// Add thumbnails for frontend compatibility
		base.thumbnails = {
			default: { url: this._content.videoId.toThumbnailUrl("default") },
			medium: { url: this._content.videoId.toThumbnailUrl("medium") },
			high: { url: this._content.videoId.toThumbnailUrl("high") },
		};

		return base;
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
		return new Video(
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
	}
}
