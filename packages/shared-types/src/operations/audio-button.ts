/**
 * AudioButton Business Operations
 *
 * Pure functions for audio-button-related business logic.
 * Replaces AudioButton Entity methods with functional approach.
 */

import type { AudioButton } from "../types/audio-button";

/**
 * Checks if button is public
 */
export function isPublic(button: AudioButton): boolean {
	return button.isPublic;
}

/**
 * Gets display text for button
 */
export function getDisplayText(button: AudioButton): string {
	return button.buttonText;
}

/**
 * Gets YouTube URL for the source video
 */
export function getYouTubeUrl(button: AudioButton): string {
	return `https://www.youtube.com/watch?v=${button.videoId}`;
}

/**
 * Gets YouTube URL with timestamp
 */
export function getYouTubeUrlWithTime(button: AudioButton): string {
	const startTime = Math.floor(button.startTime);
	return `https://www.youtube.com/watch?v=${button.videoId}&t=${startTime}s`;
}

/**
 * Formats timestamp for display (HH:MM:SS or MM:SS)
 */
export function formatTimestamp(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Gets formatted start time
 */
export function getFormattedStartTime(button: AudioButton): string {
	return formatTimestamp(button.startTime);
}

/**
 * Gets formatted end time
 */
export function getFormattedEndTime(button: AudioButton): string {
	const endTime = button.endTime || button.startTime;
	return formatTimestamp(endTime);
}

/**
 * Gets duration in seconds
 */
export function getDuration(button: AudioButton): number {
	const endTime = button.endTime || button.startTime;
	return endTime - button.startTime;
}

/**
 * Gets formatted duration
 */
export function getFormattedDuration(button: AudioButton): string {
	const duration = getDuration(button);
	return formatTimestamp(duration);
}

/**
 * Checks if button has been played
 */
export function hasBeenPlayed(button: AudioButton): boolean {
	return (button.stats.playCount || 0) > 0;
}

/**
 * Gets total engagement (likes + dislikes)
 */
export function getTotalEngagement(button: AudioButton): number {
	return (button.stats.likeCount || 0) + (button.stats.dislikeCount || 0);
}

/**
 * Gets engagement rate (engagement / views)
 */
export function getEngagementRate(button: AudioButton): number {
	const plays = button.stats.playCount || 0;
	if (plays === 0) return 0;
	return getTotalEngagement(button) / plays;
}

/**
 * Gets like ratio (likes / total engagement)
 */
export function getLikeRatio(button: AudioButton): number {
	const engagement = getTotalEngagement(button);
	if (engagement === 0) return 0;
	return (button.stats.likeCount || 0) / engagement;
}

/**
 * Checks if button is popular (high engagement)
 */
export function isPopular(button: AudioButton, threshold = 100): boolean {
	return (button.stats.playCount || 0) >= threshold;
}

/**
 * Gets all tags combined
 */
export function getAllTags(button: AudioButton): string[] {
	return button.tags || [];
}

/**
 * Checks if button has specific tag
 */
export function hasTag(button: AudioButton, tag: string): boolean {
	return getAllTags(button).includes(tag);
}

/**
 * Gets creator name
 */
export function getCreatorName(button: AudioButton): string {
	return button.creatorName;
}

/**
 * Gets creator ID
 */
export function getCreatorId(button: AudioButton): string {
	return button.creatorId;
}

/**
 * Checks if button was created by specific user
 */
export function isCreatedBy(button: AudioButton, userId: string): boolean {
	return button.creatorId === userId;
}

/**
 * Gets age in days
 */
export function getAgeInDays(button: AudioButton): number {
	const createdAt = new Date(button.createdAt);
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - createdAt.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Checks if button is recent (created within N days)
 */
export function isRecent(button: AudioButton, days = 7): boolean {
	return getAgeInDays(button) <= days;
}

/**
 * Gets formatted view count
 */
export function getFormattedViewCount(button: AudioButton): string {
	const count = button.stats.playCount || 0;
	if (count >= 10000) {
		return `${(count / 10000).toFixed(1)}万`;
	}
	return count.toLocaleString();
}

/**
 * Gets formatted like count
 */
export function getFormattedLikeCount(button: AudioButton): string {
	const count = button.stats.likeCount || 0;
	if (count >= 10000) {
		return `${(count / 10000).toFixed(1)}万`;
	}
	return count.toLocaleString();
}

/**
 * Gets share URL for the button
 */
export function getShareUrl(button: AudioButton): string {
	// Assuming the app is hosted at suzumina.click
	return `https://suzumina.click/buttons/${button.id}`;
}

/**
 * Checks if button overlaps with time range
 */
export function overlapsWithTimeRange(
	button: AudioButton,
	startTime: number,
	endTime: number,
): boolean {
	const buttonEndTime = button.endTime || button.startTime;
	return !(buttonEndTime <= startTime || button.startTime >= endTime);
}

/**
 * AudioButton operations namespace for backward compatibility
 */
export const audioButtonOperations = {
	isPublic,
	getDisplayText,
	getYouTubeUrl,
	getYouTubeUrlWithTime,
	formatTimestamp,
	getFormattedStartTime,
	getFormattedEndTime,
	getDuration,
	getFormattedDuration,
	hasBeenPlayed,
	getTotalEngagement,
	getEngagementRate,
	getLikeRatio,
	isPopular,
	getAllTags,
	hasTag,
	getCreatorName,
	getCreatorId,
	isCreatedBy,
	getAgeInDays,
	isRecent,
	getFormattedViewCount,
	getFormattedLikeCount,
	getShareUrl,
	overlapsWithTimeRange,
};
