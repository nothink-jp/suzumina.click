/**
 * Video Business Operations
 *
 * Pure functions for video-related business logic.
 * Replaces Video Entity methods with functional approach.
 */

import type { VideoPlainObject } from "../plain-objects/video-plain";
import type { VideoType } from "../types/firestore/video";
import { determineVideoType, isLiveVideoType } from "./video-type";

/**
 * 配信状態の判定に使う videoType。正本は fromFirestore が算出した `_computed.videoType`。
 * `_computed` を持たない入力だけ正本の判定関数で算出する（取得時点の liveBroadcastContent や
 * 保存済み videoType は stale になりうるので見ない。SPR-403）。
 */
function currentVideoType(video: VideoPlainObject): VideoType {
	return video._computed?.videoType ?? determineVideoType(video);
}

/**
 * Checks if a video is archived (older streams)
 */
export function isArchived(video: VideoPlainObject): boolean {
	if (video._computed?.isArchived !== undefined) {
		return video._computed.isArchived;
	}
	return currentVideoType(video) === "archived";
}

/**
 * Checks if a video is a premiere
 */
export function isPremiere(video: VideoPlainObject): boolean {
	if (video._computed?.isPremiere !== undefined) {
		return video._computed.isPremiere;
	}
	return currentVideoType(video) === "premiere";
}

/**
 * 配信中か（possibly_live を含む。isLiveVideoType 参照）
 */
export function isLive(video: VideoPlainObject): boolean {
	return isLiveVideoType(currentVideoType(video));
}

/**
 * 配信予定か
 */
export function isUpcoming(video: VideoPlainObject): boolean {
	return currentVideoType(video) === "upcoming";
}

/**
 * Checks if audio buttons can be created for this video
 */
export function canCreateButton(video: VideoPlainObject): boolean {
	// Use _computed properties if available
	if (video._computed?.canCreateButton !== undefined) {
		return video._computed.canCreateButton;
	}

	// Only archived videos can have buttons
	return isArchived(video);
}

/**
 * Alias for backward compatibility with old naming
 */
export const canCreateAudioButton = canCreateButton;

/** 配信状態（videoType）ごとの作成不可理由。ここに無い videoType は配信状態では弾かない */
const STREAM_STATE_ERROR_MESSAGES: Partial<Record<VideoType, string>> = {
	live: "ライブ配信中は音声ボタンを作成できません",
	possibly_live: "配信中の可能性があるため、アーカイブが公開されるまで音声ボタンを作成できません",
	upcoming: "配信予定の動画には音声ボタンを作成できません",
};

/**
 * Gets error message explaining why audio button cannot be created
 */
export function getAudioButtonCreationErrorMessage(video: VideoPlainObject): string | null {
	const streamMessage = STREAM_STATE_ERROR_MESSAGES[currentVideoType(video)];
	if (streamMessage) {
		return streamMessage;
	}

	if (!video.duration || video.duration === "PT0S") {
		return "動画の長さが不明なため音声ボタンを作成できません";
	}

	return null;
}

/**
 * Gets the display title for a video
 */
export function getDisplayTitle(video: VideoPlainObject): string {
	return video.title;
}

/**
 * Gets the YouTube URL for a video
 */
export function getYouTubeUrl(video: VideoPlainObject): string {
	return `https://www.youtube.com/watch?v=${video.videoId}`;
}

/**
 * Gets the thumbnail URL for a video
 */
export function getThumbnailUrl(
	video: VideoPlainObject,
	quality: "default" | "medium" | "high" | "standard" | "maxres" = "medium",
): string {
	const thumbnails = video.thumbnails;

	// Try to get requested quality, fallback to available ones
	if (thumbnails?.[quality]) {
		return thumbnails[quality].url;
	}

	// Fallback order
	const fallbackOrder: Array<"default" | "medium" | "high" | "standard" | "maxres"> = [
		"medium",
		"high",
		"standard",
		"default",
		"maxres",
	];
	for (const q of fallbackOrder) {
		if (thumbnails?.[q]) {
			return thumbnails[q].url;
		}
	}

	// Last resort - construct URL from video ID
	return `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
}

/**
 * Formats video duration for display
 */
export function formatDuration(duration: string): string {
	// Duration is in ISO 8601 format (PT#M#S)
	const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return "0:00";

	const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
	const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
	const seconds = match[3] ? Number.parseInt(match[3], 10) : 0;

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Gets video view count as formatted string
 */
export function getFormattedViewCount(video: VideoPlainObject): string {
	const count = video.statistics?.viewCount || 0;

	if (count >= 10000) {
		return `${(count / 10000).toFixed(1)}万`;
	}
	return count.toLocaleString();
}

/**
 * Gets all tags for a video (combined from all sources)
 *
 * SPR-276: ユーザータグ（`tags.userTags`）は集約しない。編集 UI・Server Action ともに撤去され、
 * cron 側も SPR-273 以降このフィールドを書かない（undefined 伝播で既存値を温存するだけ）ため、
 * **値を入れる経路が一つも残っていない**。フィールド自体は移行判断が別途あるので Firestore
 * とスキーマには残すが、ここで読むと「編集できないのに概要タブにだけ再出現する」非対称を招く。
 */
export function getAllTags(video: VideoPlainObject): string[] {
	const tags = new Set<string>();

	// Add playlist tags
	if (video.tags?.playlistTags) {
		video.tags.playlistTags.forEach((tag) => {
			tags.add(tag);
		});
	}

	// Add content tags from YouTube
	if (video.tags?.contentTags) {
		video.tags.contentTags.forEach((tag) => {
			tags.add(tag);
		});
	}

	return Array.from(tags);
}

/**
 * Checks if video is older than specified days
 */
export function isOlderThan(video: VideoPlainObject, days: number): boolean {
	const publishedAt = new Date(video.publishedAt);
	const daysAgo = new Date();
	daysAgo.setDate(daysAgo.getDate() - days);
	return publishedAt < daysAgo;
}

/**
 * Gets video age in days
 */
export function getAgeInDays(video: VideoPlainObject): number {
	const publishedAt = new Date(video.publishedAt);
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - publishedAt.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Video operations namespace for backward compatibility
 */
export const videoOperations = {
	isArchived,
	isPremiere,
	isLive,
	isUpcoming,
	canCreateButton,
	canCreateAudioButton,
	getAudioButtonCreationErrorMessage,
	getDisplayTitle,
	getYouTubeUrl,
	getThumbnailUrl,
	formatDuration,
	getFormattedViewCount,
	getAllTags,
	isOlderThan,
	getAgeInDays,
};
