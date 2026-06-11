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
	createdAt?: string | { toDate?: () => Date; _seconds?: number };
	updatedAt?: string | { toDate?: () => Date; _seconds?: number };
}

/**
 * Convert timestamp to ISO string
 */
function toISOString(
	timestamp: string | { toDate?: () => Date; _seconds?: number } | undefined,
): string {
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
 * Extract basic fields from legacy data
 */
function extractBasicFields(data: LegacyAudioButtonData) {
	return {
		buttonText: data.buttonText || data.title || data.text || "",
		videoId: data.videoId || data.sourceVideoId || "",
		videoTitle: data.videoTitle || data.sourceVideoTitle || "",
		videoThumbnailUrl: data.videoThumbnailUrl || data.sourceVideoThumbnailUrl,
		creatorId: data.creatorId || data.createdBy || "unknown",
		creatorName: data.creatorName || data.createdByName || "Unknown",
	};
}

/**
 * Extract stats from legacy data
 */
function extractStats(data: LegacyAudioButtonData) {
	const playCount = data.stats?.playCount ?? data.playCount ?? 0;
	const likeCount = data.stats?.likeCount ?? data.likeCount ?? 0;
	const dislikeCount = data.stats?.dislikeCount ?? data.dislikeCount ?? 0;
	const favoriteCount = data.stats?.favoriteCount ?? data.favoriteCount ?? 0;
	const engagementRate =
		data.stats?.engagementRate ?? calculateEngagementRate(playCount, likeCount, dislikeCount);

	return { playCount, likeCount, dislikeCount, favoriteCount, engagementRate };
}

/**
 * Calculate time-related fields
 */
function calculateTimeFields(data: LegacyAudioButtonData) {
	const startTime = data.startTime ?? 0;
	const endTime = data.endTime ?? startTime;
	const duration = data.duration ?? endTime - startTime;

	return { startTime, endTime, duration };
}

/**
 * Build computed properties
 */
function buildComputedProperties(
	stats: ReturnType<typeof extractStats>,
	duration: number,
	buttonText: string,
	videoTitle: string,
	creatorName: string,
	tags: string[],
) {
	const { playCount, likeCount, dislikeCount, engagementRate } = stats;
	const isPopular = playCount >= 100;
	const popularityScore = playCount + likeCount * 2 - dislikeCount;

	// createAudioButton と同一の表記（0秒→"再生" / <60秒→"N秒" / それ以上→"m:ss"）に統一する。
	// 生成経路（fromFirestore / createAudioButton）で durationText がズレないように formatDuration を正本とする。
	const durationText = formatDuration(duration);

	const searchableText = [
		buttonText.toLowerCase(),
		videoTitle.toLowerCase(),
		creatorName.toLowerCase(),
		...tags.map((tag) => tag.toLowerCase()),
	].join(" ");

	return {
		isPopular,
		engagementRate,
		engagementRatePercentage: engagementRate * 100,
		popularityScore,
		searchableText,
		durationText,
		relativeTimeText: "たった今", // TODO: Calculate from createdAt
	};
}

/**
 * Transforms legacy Firestore data to unified AudioButton format
 * Handles all historical field name variations
 */
export function fromFirestore(data: LegacyAudioButtonData & { id?: string }): AudioButton | null {
	try {
		const basic = extractBasicFields(data);

		// Basic validation
		if (!basic.buttonText || !basic.videoId) {
			return null;
		}

		const stats = extractStats(data);
		const time = calculateTimeFields(data);
		const tags = data.tags || [];

		const computed = buildComputedProperties(
			stats,
			time.duration,
			basic.buttonText,
			basic.videoTitle,
			basic.creatorName,
			tags,
		);

		return {
			id: data.id || "",
			buttonText: basic.buttonText,
			videoId: basic.videoId,
			videoTitle: basic.videoTitle,
			videoThumbnailUrl: basic.videoThumbnailUrl,
			startTime: time.startTime,
			endTime: time.endTime,
			duration: time.duration,
			tags,
			creatorId: basic.creatorId,
			creatorName: basic.creatorName,
			isPublic: data.isPublic ?? true,
			stats,
			createdAt: toISOString(data.createdAt),
			updatedAt: toISOString(data.updatedAt || data.createdAt),
			_computed: computed,
		};
	} catch (_error) {
		return null;
	}
}

/**
 * Transforms AudioButton to Firestore document format
 */
export function toFirestore(audioButton: Partial<AudioButton>): AudioButtonDocument {
	// idと_computedフィールドを除外してFirestore用のドキュメントを作成
	const { id, _computed, ...documentData } = audioButton as AudioButton & {
		id?: string;
		_computed?: unknown;
	};

	// 未使用変数の警告を抑制（構造化代入で除外するため）
	void id;
	void _computed;

	return documentData as AudioButtonDocument;
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

// Re-export as namespace for backward compatibility
export const audioButtonTransformers = {
	fromFirestore,
	toFirestore,
};
