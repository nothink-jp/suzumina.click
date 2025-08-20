/**
 * AudioButton Data Transformers
 *
 * Pure functions for transforming audio button data between different formats.
 * Handles migration from legacy formats to unified structure.
 */

import type { AudioButton, AudioButtonDocument } from "../types/audio-button";

/**
 * Legacy data format (for migration)
 */
interface LegacyAudioButtonData {
	// Various field name patterns
	id?: string;
	title?: string;
	buttonText?: string;
	text?: string;
	sourceVideoId?: string;
	videoId?: string;
	sourceVideoTitle?: string;
	videoTitle?: string;
	sourceVideoThumbnailUrl?: string;
	videoThumbnailUrl?: string;
	startTime?: number;
	endTime?: number;
	duration?: number;
	tags?: string[];
	createdBy?: string;
	creatorId?: string;
	createdByName?: string;
	creatorName?: string;
	isPublic?: boolean;
	playCount?: number;
	likeCount?: number;
	dislikeCount?: number;
	favoriteCount?: number;
	stats?: {
		playCount?: number;
		likeCount?: number;
		dislikeCount?: number;
		favoriteCount?: number;
		engagementRate?: number;
	};
	createdAt?: any;
	updatedAt?: any;
}

/**
 * Convert timestamp to ISO string
 */
function toISOString(timestamp: any): string {
	if (typeof timestamp === "string") return timestamp;
	if (timestamp?.toDate) return timestamp.toDate().toISOString();
	if (timestamp?._seconds) {
		return new Date(timestamp._seconds * 1000).toISOString();
	}
	return new Date().toISOString();
}

/**
 * Calculate engagement rate
 */
function calculateEngagementRate(
	playCount: number,
	likeCount: number,
	dislikeCount: number,
): number {
	if (playCount === 0) return 0;
	return (likeCount + dislikeCount) / playCount;
}

/**
 * Transforms legacy Firestore data to unified AudioButton format
 * Handles all historical field name variations
 */
export function fromFirestore(data: LegacyAudioButtonData & { id?: string }): AudioButton | null {
	try {
		// Handle various field name patterns
		const buttonText = data.buttonText || data.title || data.text || "";
		const videoId = data.videoId || data.sourceVideoId || "";
		const videoTitle = data.videoTitle || data.sourceVideoTitle || "";

		// Basic validation
		if (!buttonText || !videoId) {
			return null;
		}

		// Extract stats (handle both flat and nested structure)
		const playCount = data.stats?.playCount ?? data.playCount ?? 0;
		const likeCount = data.stats?.likeCount ?? data.likeCount ?? 0;
		const dislikeCount = data.stats?.dislikeCount ?? data.dislikeCount ?? 0;
		const favoriteCount = data.stats?.favoriteCount ?? data.favoriteCount ?? 0;
		const engagementRate =
			data.stats?.engagementRate ?? calculateEngagementRate(playCount, likeCount, dislikeCount);

		// Calculate duration
		const startTime = data.startTime ?? 0;
		const endTime = data.endTime ?? startTime;
		const duration = data.duration ?? endTime - startTime;

		// Calculate computed properties
		const isPopular = playCount >= 100;
		const popularityScore = playCount + likeCount * 2 - dislikeCount;
		const minutes = Math.floor(duration / 60);
		const seconds = Math.floor(duration % 60);
		const durationText = `${minutes}:${seconds.toString().padStart(2, "0")}`;
		const relativeTimeText = "たった今"; // TODO: Calculate from createdAt

		// Build searchable text
		const searchableText = [
			buttonText.toLowerCase(),
			videoTitle.toLowerCase(),
			data.creatorName?.toLowerCase() || data.createdByName?.toLowerCase() || "",
			...(data.tags || []).map((tag) => tag.toLowerCase()),
		].join(" ");

		return {
			id: data.id || "",
			buttonText,
			videoId,
			videoTitle,
			videoThumbnailUrl: data.videoThumbnailUrl || data.sourceVideoThumbnailUrl,
			startTime,
			endTime,
			duration,
			tags: data.tags || [],
			creatorId: data.creatorId || data.createdBy || "unknown",
			creatorName: data.creatorName || data.createdByName || "Unknown",
			isPublic: data.isPublic ?? true,
			stats: {
				playCount,
				likeCount,
				dislikeCount,
				favoriteCount,
				engagementRate,
			},
			createdAt: toISOString(data.createdAt),
			updatedAt: toISOString(data.updatedAt || data.createdAt),
			_computed: {
				isPopular,
				engagementRate,
				engagementRatePercentage: engagementRate * 100,
				popularityScore,
				searchableText,
				durationText,
				relativeTimeText,
			},
		};
	} catch (_error) {
		return null;
	}
}

/**
 * Transforms AudioButton to Firestore document format
 */
export function toFirestore(audioButton: Partial<AudioButton>): AudioButtonDocument {
	const { id, ...data } = audioButton as AudioButton;
	return data;
}

/**
 * Format duration for display
 */
function formatDuration(seconds: number): string {
	if (seconds === 0) return "再生";
	if (seconds < 60) return `${Math.floor(seconds)}秒`;
	const minutes = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Create a new AudioButton with defaults
 */
export function createAudioButton(params: {
	buttonText: string;
	videoId: string;
	videoTitle: string;
	startTime: number;
	endTime: number;
	tags?: string[];
	creatorId: string;
	creatorName: string;
	isPublic?: boolean;
}): AudioButton {
	const duration = params.endTime - params.startTime;
	const now = new Date().toISOString();
	const durationText = formatDuration(duration);
	const searchableText = [
		params.buttonText.toLowerCase(),
		params.videoTitle.toLowerCase(),
		params.creatorName.toLowerCase(),
		...(params.tags || []).map((tag) => tag.toLowerCase()),
	].join(" ");

	return {
		id: "", // Will be set by Firestore
		buttonText: params.buttonText,
		videoId: params.videoId,
		videoTitle: params.videoTitle,
		startTime: params.startTime,
		endTime: params.endTime,
		duration,
		tags: params.tags || [],
		creatorId: params.creatorId,
		creatorName: params.creatorName,
		isPublic: params.isPublic ?? true,
		stats: {
			playCount: 0,
			likeCount: 0,
			dislikeCount: 0,
			favoriteCount: 0,
			engagementRate: 0,
		},
		createdAt: now,
		updatedAt: now,
		_computed: {
			isPopular: false,
			engagementRate: 0,
			engagementRatePercentage: 0,
			popularityScore: 0,
			searchableText,
			durationText,
			relativeTimeText: "たった今",
		},
	};
}

/**
 * Update an AudioButton
 */
export function updateAudioButton(
	audioButton: AudioButton,
	updates: Partial<Pick<AudioButton, "buttonText" | "tags" | "isPublic">>,
): AudioButton {
	return {
		...audioButton,
		...updates,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Increment view count
 */
export function incrementViewCount(audioButton: AudioButton): AudioButton {
	const newStats = {
		...audioButton.stats,
		playCount: audioButton.stats.playCount + 1,
		engagementRate: calculateEngagementRate(
			audioButton.stats.playCount + 1,
			audioButton.stats.likeCount,
			audioButton.stats.dislikeCount,
		),
	};

	return {
		...audioButton,
		stats: newStats,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Increment like count
 */
export function incrementLikeCount(audioButton: AudioButton): AudioButton {
	const newStats = {
		...audioButton.stats,
		likeCount: audioButton.stats.likeCount + 1,
		engagementRate: calculateEngagementRate(
			audioButton.stats.playCount,
			audioButton.stats.likeCount + 1,
			audioButton.stats.dislikeCount,
		),
	};

	return {
		...audioButton,
		stats: newStats,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Decrement like count
 */
export function decrementLikeCount(audioButton: AudioButton): AudioButton {
	const newStats = {
		...audioButton.stats,
		likeCount: Math.max(0, audioButton.stats.likeCount - 1),
		engagementRate: calculateEngagementRate(
			audioButton.stats.playCount,
			Math.max(0, audioButton.stats.likeCount - 1),
			audioButton.stats.dislikeCount,
		),
	};

	return {
		...audioButton,
		stats: newStats,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Increment dislike count
 */
export function incrementDislikeCount(audioButton: AudioButton): AudioButton {
	const newStats = {
		...audioButton.stats,
		dislikeCount: audioButton.stats.dislikeCount + 1,
		engagementRate: calculateEngagementRate(
			audioButton.stats.playCount,
			audioButton.stats.likeCount,
			audioButton.stats.dislikeCount + 1,
		),
	};

	return {
		...audioButton,
		stats: newStats,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Decrement dislike count
 */
export function decrementDislikeCount(audioButton: AudioButton): AudioButton {
	const newStats = {
		...audioButton.stats,
		dislikeCount: Math.max(0, audioButton.stats.dislikeCount - 1),
		engagementRate: calculateEngagementRate(
			audioButton.stats.playCount,
			audioButton.stats.likeCount,
			Math.max(0, audioButton.stats.dislikeCount - 1),
		),
	};

	return {
		...audioButton,
		stats: newStats,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Increment favorite count
 */
export function incrementFavoriteCount(audioButton: AudioButton): AudioButton {
	const newStats = {
		...audioButton.stats,
		favoriteCount: audioButton.stats.favoriteCount + 1,
	};

	return {
		...audioButton,
		stats: newStats,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Decrement favorite count
 */
export function decrementFavoriteCount(audioButton: AudioButton): AudioButton {
	const newStats = {
		...audioButton.stats,
		favoriteCount: Math.max(0, audioButton.stats.favoriteCount - 1),
	};

	return {
		...audioButton,
		stats: newStats,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Generate a unique ID (for client-side use only)
 */
export function generateId(): string {
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Re-export as namespace for backward compatibility
export const audioButtonTransformers = {
	fromFirestore,
	toFirestore,
	createAudioButton,
	updateAudioButton,
	incrementViewCount,
	incrementLikeCount,
	decrementLikeCount,
	incrementDislikeCount,
	decrementDislikeCount,
	incrementFavoriteCount,
	decrementFavoriteCount,
	generateId,
};
