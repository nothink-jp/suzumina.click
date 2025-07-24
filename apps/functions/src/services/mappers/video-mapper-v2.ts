/**
 * Video Mapper V2
 *
 * Maps YouTube API data to the new Video Entity V2 domain model.
 * Provides conversion between YouTube API responses and our domain entities
 * while maintaining backward compatibility with the existing system.
 */

import {
	Channel,
	ChannelId,
	ChannelTitle,
	CommentCount,
	ContentDetails,
	DislikeCount,
	LikeCount,
	type PrivacyStatus,
	PublishedAt,
	parseDate,
	safeParseNumber,
	type UploadStatus,
	Video,
	VideoContent,
	VideoDescription,
	VideoDuration,
	VideoId,
	VideoMetadata,
	VideoStatistics,
	VideoTitle,
	ViewCount,
} from "@suzumina.click/shared-types";

/**
 * Legacy format type from the Video Entity
 *
 * This interface represents the original video data structure used before
 * the Entity/Value Object architecture migration. It maintains backward
 * compatibility with existing systems while the codebase transitions to
 * the new Video Entity V2 domain model.
 *
 * @deprecated Will be removed in v3.0.0 (target: April 30, 2026, reviewed July 2025). Migrate to Video Entity V2
 */
interface LegacyVideoData {
	// Core fields
	id?: string;
	videoId?: string;
	title: string;
	description?: string;
	channelId: string;
	channelTitle: string;
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
}

import type { youtube_v3 } from "googleapis";
import * as logger from "../../shared/logger";

/**
 * Type alias for YouTube Live Streaming Details
 * Provides better readability when working with YouTube API responses
 */
type YouTubeLiveStreamingDetails = youtube_v3.Schema$VideoLiveStreamingDetails;

/**
 * Maps YouTube API video data to Video Entity V2
 *
 * @param youtubeVideo - Video data from YouTube API
 * @param playlistTags - Playlist tags for the video
 * @param userTags - User-defined tags for the video
 * @returns Video Entity or null if mapping fails
 */
export function mapYouTubeToVideoEntity(
	youtubeVideo: youtube_v3.Schema$Video,
	playlistTags: string[] = [],
	userTags: string[] = [],
): Video | null {
	try {
		// Validate required fields
		if (!youtubeVideo.id || !youtubeVideo.snippet) {
			logger.warn("Missing required fields in YouTube video data", {
				hasId: !!youtubeVideo.id,
				hasSnippet: !!youtubeVideo.snippet,
			});
			return null;
		}

		// Create Channel
		const channel = createChannelFromYouTube(youtubeVideo.snippet);
		if (!channel) {
			return null;
		}

		// Create VideoContent
		const content = createVideoContentFromYouTube(youtubeVideo);
		if (!content) {
			return null;
		}

		// Create VideoMetadata
		const metadata = createVideoMetadataFromYouTube(youtubeVideo);
		if (!metadata) {
			return null;
		}

		// Create VideoStatistics (optional)
		const statistics = youtubeVideo.statistics
			? createVideoStatisticsFromYouTube(youtubeVideo.statistics)
			: undefined;

		// Create tags
		const tags = {
			playlistTags,
			userTags,
			contentTags: youtubeVideo.snippet.tags || undefined,
		};

		// Create audio button info (default values, will be updated by audio button service)
		const audioButtonInfo = {
			count: 0,
			hasButtons: false,
		};

		// Create live streaming details
		const liveStreamingDetails = youtubeVideo.liveStreamingDetails
			? mapLiveStreamingDetails(youtubeVideo.liveStreamingDetails)
			: undefined;

		// Create Video Entity
		return new Video(
			content,
			metadata,
			channel,
			statistics,
			tags,
			audioButtonInfo,
			liveStreamingDetails,
		);
	} catch (error) {
		logger.error("Failed to map YouTube video to entity", {
			videoId: youtubeVideo.id,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return null;
	}
}

/**
 * Creates Channel from YouTube snippet
 */
function createChannelFromYouTube(snippet: youtube_v3.Schema$VideoSnippet): Channel | null {
	if (!snippet.channelId || !snippet.channelTitle) {
		logger.warn("Missing channel information in YouTube snippet");
		return null;
	}

	try {
		return new Channel(new ChannelId(snippet.channelId), new ChannelTitle(snippet.channelTitle));
	} catch (error) {
		logger.error("Failed to create Channel", {
			channelId: snippet.channelId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return null;
	}
}

/**
 * Creates VideoContent from YouTube data
 */
function createVideoContentFromYouTube(video: youtube_v3.Schema$Video): VideoContent | null {
	if (!video.id || !video.snippet?.publishedAt) {
		logger.warn("Missing required fields for VideoContent");
		return null;
	}

	try {
		const videoId = new VideoId(video.id);

		// Validate publishedAt date
		const publishedDate = parseDate(video.snippet.publishedAt);
		if (!publishedDate) {
			logger.warn("Invalid publishedAt date", { publishedAt: video.snippet.publishedAt });
			return null;
		}

		const publishedAt = new PublishedAt(publishedDate);
		const privacyStatus = (video.status?.privacyStatus || "public") as PrivacyStatus;
		const uploadStatus = (video.status?.uploadStatus || "processed") as UploadStatus;

		// Create ContentDetails if available
		const contentDetails = video.contentDetails
			? new ContentDetails(
					video.contentDetails.dimension as "2d" | "3d" | undefined,
					video.contentDetails.definition as "hd" | "sd" | undefined,
					video.contentDetails.caption === "true",
					video.contentDetails.licensedContent ?? false,
					video.contentDetails.projection as "rectangular" | "360" | undefined,
				)
			: undefined;

		return new VideoContent(
			videoId,
			publishedAt,
			privacyStatus,
			uploadStatus,
			contentDetails,
			video.player?.embedHtml || undefined,
			video.snippet.tags || undefined,
		);
	} catch (error) {
		logger.error("Failed to create VideoContent", {
			videoId: video.id,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return null;
	}
}

/**
 * Creates VideoMetadata from YouTube data
 */
function createVideoMetadataFromYouTube(video: youtube_v3.Schema$Video): VideoMetadata | null {
	if (!video.snippet?.title) {
		logger.warn("Missing title for VideoMetadata");
		return null;
	}

	try {
		const title = new VideoTitle(video.snippet.title);
		const description = new VideoDescription(video.snippet.description || "");
		const duration = video.contentDetails?.duration
			? new VideoDuration(video.contentDetails.duration)
			: undefined;

		return new VideoMetadata(
			title,
			description,
			duration,
			video.contentDetails?.dimension as "2d" | "3d" | undefined,
			video.contentDetails?.definition as "hd" | "sd" | undefined,
			video.contentDetails?.caption === "true",
			video.contentDetails?.licensedContent || undefined,
		);
	} catch (error) {
		logger.error("Failed to create VideoMetadata", {
			videoId: video.id,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return null;
	}
}

/**
 * Creates VideoStatistics from YouTube statistics
 */
function createVideoStatisticsFromYouTube(
	stats: youtube_v3.Schema$VideoStatistics,
): VideoStatistics {
	const viewCount = new ViewCount(Number(stats.viewCount || "0"));
	const likeCount = stats.likeCount ? new LikeCount(Number(stats.likeCount)) : undefined;
	const dislikeCount = stats.dislikeCount
		? new DislikeCount(Number(stats.dislikeCount))
		: undefined;
	const favoriteCount = stats.favoriteCount
		? Math.max(0, safeParseNumber(stats.favoriteCount) ?? 0)
		: undefined;
	const commentCount = stats.commentCount
		? new CommentCount(Number(stats.commentCount))
		: undefined;

	return new VideoStatistics(viewCount, likeCount, dislikeCount, favoriteCount, commentCount);
}

/**
 * Maps live streaming details from YouTube API
 */
function mapLiveStreamingDetails(
	details: YouTubeLiveStreamingDetails,
): NonNullable<Video["liveStreamingDetails"]> {
	return {
		scheduledStartTime: parseDate(details.scheduledStartTime),
		scheduledEndTime: parseDate(details.scheduledEndTime),
		actualStartTime: parseDate(details.actualStartTime),
		actualEndTime: parseDate(details.actualEndTime),
		concurrentViewers: safeParseNumber(details.concurrentViewers),
	};
}

/**
 * Maps multiple YouTube videos to Video entities
 *
 * @param youtubeVideos - Array of YouTube API video data
 * @param playlistTagsMap - Map of video ID to playlist tags
 * @param userTagsMap - Map of video ID to user tags
 * @returns Array of successfully mapped Video entities
 */
export function mapYouTubeVideosToEntities(
	youtubeVideos: youtube_v3.Schema$Video[],
	playlistTagsMap: Map<string, string[]> = new Map(),
	userTagsMap: Map<string, string[]> = new Map(),
): Video[] {
	const mappedVideos: Video[] = [];
	let failedCount = 0;

	for (const youtubeVideo of youtubeVideos) {
		if (!youtubeVideo.id) {
			failedCount++;
			continue;
		}

		const playlistTags = playlistTagsMap.get(youtubeVideo.id) || [];
		const userTags = userTagsMap.get(youtubeVideo.id) || [];

		const video = mapYouTubeToVideoEntity(youtubeVideo, playlistTags, userTags);
		if (video) {
			mappedVideos.push(video);
		} else {
			failedCount++;
		}
	}

	if (failedCount > 0) {
		logger.warn(`Failed to map ${failedCount} videos out of ${youtubeVideos.length}`);
	}

	return mappedVideos;
}

/**
 * Maps Video Entity to legacy format for backward compatibility
 *
 * @param video - Video Entity
 * @returns Legacy format data
 */
export function mapVideoEntityToLegacy(video: Video): LegacyVideoData {
	return video.toLegacyFormat();
}

/**
 * Maps legacy format to Video Entity
 *
 * @param legacyData - Legacy video data
 * @returns Video Entity
 */
export function mapLegacyToVideoEntity(legacyData: LegacyVideoData): Video {
	return Video.fromLegacyFormat(legacyData);
}

/**
 * Error information for mapping failures
 */
export interface VideoMappingError {
	videoId?: string;
	field: string;
	reason: string;
}

/**
 * Result of batch video mapping
 */
export interface BatchMappingResult {
	videos: Video[];
	errors: VideoMappingError[];
	totalProcessed: number;
	successCount: number;
	failureCount: number;
}

/**
 * Maps YouTube videos with detailed error tracking
 *
 * @param youtubeVideos - Array of YouTube API video data
 * @param playlistTagsMap - Map of video ID to playlist tags
 * @param userTagsMap - Map of video ID to user tags
 * @returns Detailed mapping result with errors
 */
export function mapYouTubeVideosWithErrors(
	youtubeVideos: youtube_v3.Schema$Video[],
	playlistTagsMap: Map<string, string[]> = new Map(),
	userTagsMap: Map<string, string[]> = new Map(),
): BatchMappingResult {
	const videos: Video[] = [];
	const errors: VideoMappingError[] = [];

	for (const youtubeVideo of youtubeVideos) {
		try {
			if (!youtubeVideo.id) {
				errors.push({
					field: "id",
					reason: "Missing video ID",
				});
				continue;
			}

			if (!youtubeVideo.snippet) {
				errors.push({
					videoId: youtubeVideo.id,
					field: "snippet",
					reason: "Missing video snippet",
				});
				continue;
			}

			const playlistTags = playlistTagsMap.get(youtubeVideo.id) || [];
			const userTags = userTagsMap.get(youtubeVideo.id) || [];

			const video = mapYouTubeToVideoEntity(youtubeVideo, playlistTags, userTags);
			if (video) {
				videos.push(video);
			} else {
				errors.push({
					videoId: youtubeVideo.id,
					field: "mapping",
					reason: "Failed to create Video entity",
				});
			}
		} catch (error) {
			errors.push({
				videoId: youtubeVideo.id || undefined,
				field: "unknown",
				reason: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	return {
		videos,
		errors,
		totalProcessed: youtubeVideos.length,
		successCount: videos.length,
		failureCount: errors.length,
	};
}
