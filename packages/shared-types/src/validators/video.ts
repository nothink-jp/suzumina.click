/**
 * Video Validation Functions
 *
 * Pure functions for validating video data.
 * Replaces Video Entity validation with functional approach.
 */

import type { VideoPlainObject } from "../plain-objects/video-plain";

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

// Helper functions to reduce complexity
function validateRequiredFields(video: VideoPlainObject, errors: string[]): void {
	if (!video.videoId) errors.push("Video ID is required");
	if (!video.title) errors.push("Title is required");
	if (!video.channelId) errors.push("Channel ID is required");
	if (!video.channelTitle) errors.push("Channel title is required");
}

function validateVideoType(video: VideoPlainObject, errors: string[]): void {
	const validVideoTypes = ["normal", "live", "upcoming", "archived", "premiere", "possibly_live"];
	if (video.videoType && !validVideoTypes.includes(video.videoType)) {
		errors.push(`Invalid video type: ${video.videoType}`);
	}
}

function validateBroadcastContent(video: VideoPlainObject, errors: string[]): void {
	const validBroadcastContent = ["none", "live", "upcoming"];
	if (video.liveBroadcastContent && !validBroadcastContent.includes(video.liveBroadcastContent)) {
		errors.push(`Invalid live broadcast content: ${video.liveBroadcastContent}`);
	}
}

function validateTags(video: VideoPlainObject, errors: string[]): void {
	if (!video.tags?.userTags) return;

	if (video.tags.userTags.length > 10) {
		errors.push("User tags must not exceed 10 items");
	}

	video.tags.userTags.forEach((tag, index) => {
		if (!tag || tag.length < 1 || tag.length > 30) {
			errors.push(`User tag at index ${index} must be between 1 and 30 characters`);
		}
	});
}

function validateAudioButtonInfo(video: VideoPlainObject, errors: string[]): void {
	if (video.audioButtonInfo && video.audioButtonInfo.count < -1) {
		errors.push("Audio button count must be -1 or greater");
	}
}

function validateDuration(video: VideoPlainObject, errors: string[]): void {
	if (!video.duration) return;

	const durationPattern = /^PT(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?$/;
	if (!durationPattern.test(video.duration)) {
		errors.push(`Invalid duration format: ${video.duration}`);
	}
}

function validateTimestamps(video: VideoPlainObject, errors: string[]): void {
	if (video.publishedAt) {
		const publishedDate = new Date(video.publishedAt);
		if (Number.isNaN(publishedDate.getTime())) {
			errors.push("Invalid published date");
		}
	}

	if (video.lastFetchedAt) {
		const fetchedDate = new Date(video.lastFetchedAt);
		if (Number.isNaN(fetchedDate.getTime())) {
			errors.push("Invalid last fetched date");
		}
	}
}

function validateStatistics(video: VideoPlainObject, errors: string[]): void {
	if (!video.statistics) return;

	if (video.statistics.viewCount !== undefined && video.statistics.viewCount < 0) {
		errors.push("View count cannot be negative");
	}
	if (video.statistics.likeCount !== undefined && video.statistics.likeCount < 0) {
		errors.push("Like count cannot be negative");
	}
	if (video.statistics.commentCount !== undefined && video.statistics.commentCount < 0) {
		errors.push("Comment count cannot be negative");
	}
}

/**
 * Validates a video plain object
 */
export function validateVideo(video: VideoPlainObject): ValidationResult {
	const errors: string[] = [];

	validateRequiredFields(video, errors);
	validateVideoType(video, errors);
	validateBroadcastContent(video, errors);
	validateTags(video, errors);
	validateAudioButtonInfo(video, errors);
	validateDuration(video, errors);
	validateTimestamps(video, errors);
	validateStatistics(video, errors);

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates video ID format
 */
export function validateVideoId(videoId: string): boolean {
	// YouTube video ID is typically 11 characters
	const pattern = /^[a-zA-Z0-9_-]{11}$/;
	return pattern.test(videoId);
}

/**
 * Validates channel ID format
 */
export function validateChannelId(channelId: string): boolean {
	// YouTube channel ID starts with UC and is 24 characters total
	const pattern = /^UC[a-zA-Z0-9_-]{22}$/;
	return pattern.test(channelId);
}

/**
 * Validates if a video can be updated
 */
export function canUpdateVideo(video: VideoPlainObject): boolean {
	// Don't update very recent videos (less than 1 hour old)
	const publishedAt = new Date(video.publishedAt);
	const oneHourAgo = new Date();
	oneHourAgo.setHours(oneHourAgo.getHours() - 1);

	if (publishedAt > oneHourAgo) {
		return false;
	}

	// Don't update if recently fetched (less than 5 minutes)
	const lastFetched = new Date(video.lastFetchedAt);
	const fiveMinutesAgo = new Date();
	fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

	if (lastFetched > fiveMinutesAgo) {
		return false;
	}

	return true;
}

/**
 * Video validators namespace for backward compatibility
 */
export const videoValidators = {
	validateVideo,
	validateVideoId,
	validateChannelId,
	canUpdateVideo,
};
