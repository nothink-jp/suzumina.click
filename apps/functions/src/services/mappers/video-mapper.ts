/**
 * Video Mapper (Plain Object Version)
 *
 * Maps YouTube API data to VideoPlainObject.
 * This is a simplified version that works with plain objects instead of entities.
 */

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { parseDurationToSeconds } from "@suzumina.click/shared-types";

import type { youtube_v3 } from "googleapis";
import * as logger from "../../shared/logger";

/**
 * Helper function to determine video type
 */
function determineVideoType(
	youtubeVideo: youtube_v3.Schema$Video,
): "normal" | "short" | "live" | "premiere" | "archived" {
	const snippet = youtubeVideo.snippet;
	const contentDetails = youtubeVideo.contentDetails;
	const liveStreamingDetails = youtubeVideo.liveStreamingDetails;

	// Check for shorts
	if (snippet?.title?.includes("#shorts") || snippet?.description?.includes("#shorts")) {
		return "short";
	}

	const duration = contentDetails?.duration;
	if (duration && parseDurationToSeconds(duration) < 60) {
		return "short";
	}

	// Check for live content
	if (liveStreamingDetails) {
		if (!liveStreamingDetails.actualEndTime) {
			if (liveStreamingDetails.actualStartTime) {
				return "live";
			}
			return "premiere";
		}

		// Archived stream
		if (duration && parseDurationToSeconds(duration) > 15 * 60) {
			return "archived";
		}
		return "premiere";
	}

	return "normal";
}

/**
 * Helper function to calculate audio button info
 */
function calculateAudioButtonInfo(videoType: string): {
	count: number;
	hasButtons: boolean;
} {
	const canCreate = videoType === "normal" || videoType === "archived";
	return {
		count: 0,
		hasButtons: canCreate,
	};
}

/**
 * Maps YouTube API video data to VideoPlainObject
 *
 * @param youtubeVideo - Video data from YouTube API
 * @param playlistTags - Playlist tags for the video
 * @param userTags - User-defined tags for the video
 * @returns VideoPlainObject or null if mapping fails
 */
export function mapYouTubeToVideoPlainObject(
	youtubeVideo: youtube_v3.Schema$Video,
	playlistTags: string[] = [],
	userTags: string[] = [],
): VideoPlainObject | null {
	try {
		// Validate required fields
		if (!youtubeVideo.id || !youtubeVideo.snippet) {
			logger.warn("Missing required fields in YouTube video data", {
				hasId: !!youtubeVideo.id,
				hasSnippet: !!youtubeVideo.snippet,
			});
			return null;
		}

		const snippet = youtubeVideo.snippet;
		const contentDetails = youtubeVideo.contentDetails;
		const statistics = youtubeVideo.statistics;
		const liveStreamingDetails = youtubeVideo.liveStreamingDetails;

		// Determine video type using helper
		const videoType = determineVideoType(youtubeVideo);

		// Calculate audio button info
		const audioButtonInfo = calculateAudioButtonInfo(videoType);

		// Create live streaming details
		const liveDetails: VideoPlainObject["liveStreamingDetails"] = liveStreamingDetails
			? {
					scheduledStartTime: liveStreamingDetails.scheduledStartTime || undefined,
					scheduledEndTime: liveStreamingDetails.scheduledEndTime || undefined,
					actualStartTime: liveStreamingDetails.actualStartTime || undefined,
					actualEndTime: liveStreamingDetails.actualEndTime || undefined,
					concurrentViewers:
						typeof liveStreamingDetails.concurrentViewers === "string"
							? Number.parseInt(liveStreamingDetails.concurrentViewers, 10)
							: liveStreamingDetails.concurrentViewers || undefined,
				}
			: undefined;

		// Create the VideoPlainObject
		const video: VideoPlainObject = {
			id: youtubeVideo.id,
			videoId: youtubeVideo.id,
			title: snippet.title || "",
			description: snippet.description || "",
			publishedAt: snippet.publishedAt || new Date().toISOString(),
			thumbnailUrl: getBestThumbnail(snippet.thumbnails),
			lastFetchedAt: new Date().toISOString(),
			channelId: snippet.channelId || "",
			channelTitle: snippet.channelTitle || "",
			categoryId: snippet.categoryId || "",
			duration: contentDetails?.duration || "",
			statistics: statistics
				? {
						viewCount: Number.parseInt(statistics.viewCount || "0", 10),
						likeCount: Number.parseInt(statistics.likeCount || "0", 10),
						commentCount: Number.parseInt(statistics.commentCount || "0", 10),
					}
				: undefined,
			liveBroadcastContent: (snippet.liveBroadcastContent ||
				"none") as VideoPlainObject["liveBroadcastContent"],
			liveStreamingDetails: liveDetails,
			videoType,
			// Use both new and old format for compatibility
			tags: {
				playlistTags,
				userTags,
				contentTags: snippet.tags || [],
			},
			// Keep legacy fields for backward compatibility
			playlistTags,
			userTags,
			audioButtonCount: audioButtonInfo.count,
			hasAudioButtons: audioButtonInfo.hasButtons,
			_computed: {
				isArchived: videoType === "archived",
				isPremiere: videoType === "premiere",
				isLive: videoType === "live",
				isUpcoming: videoType === "upcoming",
				canCreateButton: videoType === "archived",
				videoType,
				thumbnailUrl: getBestThumbnail(snippet.thumbnails),
				youtubeUrl: `https://youtube.com/watch?v=${youtubeVideo.id}`,
			},
		};

		return video;
	} catch (error) {
		logger.error("Failed to map YouTube video to plain object", {
			videoId: youtubeVideo.id,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return null;
	}
}

/**
 * Gets the best available thumbnail URL
 */
function getBestThumbnail(thumbnails: youtube_v3.Schema$ThumbnailDetails | undefined): string {
	if (!thumbnails) return "";

	// Priority: maxres > standard > high > medium > default
	if (thumbnails.maxres?.url) return thumbnails.maxres.url;
	if (thumbnails.standard?.url) return thumbnails.standard.url;
	if (thumbnails.high?.url) return thumbnails.high.url;
	if (thumbnails.medium?.url) return thumbnails.medium.url;
	if (thumbnails.default?.url) return thumbnails.default.url;

	return "";
}

/**
 * Batch mapping result
 */
export interface BatchMappingResult {
	videos: VideoPlainObject[];
	errors: VideoMappingError[];
	totalProcessed: number;
	successCount: number;
	failureCount: number;
}

/**
 * Video mapping error
 */
export interface VideoMappingError {
	videoId?: string;
	field: string;
	reason: string;
}

/**
 * Maps multiple YouTube videos to VideoPlainObjects with error tracking
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
	const videos: VideoPlainObject[] = [];
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

			const video = mapYouTubeToVideoPlainObject(youtubeVideo, playlistTags, userTags);
			if (video) {
				videos.push(video);
			} else {
				errors.push({
					videoId: youtubeVideo.id,
					field: "mapping",
					reason: "Failed to create VideoPlainObject",
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

// Re-export the main function with the old name for backward compatibility
export const mapYouTubeToVideoEntity = mapYouTubeToVideoPlainObject;

// Backward compatibility exports (using object instead of class)
export const VideoMapper = {
	fromYouTubeAPI(video: youtube_v3.Schema$Video): VideoPlainObject | null {
		return mapYouTubeToVideoPlainObject(video);
	},

	fromYouTubeAPIWithTags(
		video: youtube_v3.Schema$Video,
		playlistTags: string[] = [],
		userTags: string[] = [],
	): VideoPlainObject | null {
		return mapYouTubeToVideoPlainObject(video, playlistTags, userTags);
	},
};
