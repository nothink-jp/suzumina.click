/**
 * AudioButton Data Transformers
 *
 * Pure functions for transforming audio button data between different formats.
 * Replaces AudioButton Entity transformation methods with functional approach.
 */

import type { AudioButtonPlainObject } from "../plain-objects/audio-button-plain";
import type { FirestoreServerAudioButtonData } from "../types/firestore/audio-button";

/**
 * Transforms Firestore data to AudioButtonPlainObject
 */
export function fromFirestore(data: FirestoreServerAudioButtonData): AudioButtonPlainObject | null {
	try {
		// Basic validation
		if (!data || !data.title) {
			return null;
		}

		// Calculate computed properties
		const playCount = data.playCount || 0;
		const likeCount = data.likeCount || 0;
		const dislikeCount = data.dislikeCount || 0;
		const totalEngagement = likeCount + dislikeCount;
		const engagementRate = playCount > 0 ? totalEngagement / playCount : 0;
		const isPopular = playCount >= 100;
		const popularityScore = playCount + likeCount * 2 - dislikeCount;

		// Calculate duration text
		const duration = (data.endTime || data.startTime) - data.startTime;
		const minutes = Math.floor(duration / 60);
		const seconds = Math.floor(duration % 60);
		const durationText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

		// Calculate relative time (placeholder - will use actual timestamp when available)
		const relativeTimeText = "たった今";

		// Build searchable text
		const searchableText = [
			data.title.toLowerCase(),
			data.sourceVideoTitle?.toLowerCase() || "",
			data.createdByName.toLowerCase(),
			...(data.tags || []).map((tag) => tag.toLowerCase()),
		].join(" ");

		return {
			id: data.id || "",
			title: data.title,
			description: data.description,
			tags: data.tags || [],
			sourceVideoId: data.sourceVideoId,
			sourceVideoTitle: data.sourceVideoTitle,
			sourceVideoThumbnailUrl: data.sourceVideoThumbnailUrl,
			startTime: data.startTime,
			endTime: data.endTime,
			createdBy: data.createdBy,
			createdByName: data.createdByName,
			isPublic: data.isPublic !== undefined ? data.isPublic : true,
			playCount: playCount,
			likeCount: likeCount,
			dislikeCount: dislikeCount,
			favoriteCount: data.favoriteCount,
			createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
			updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
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
	} catch (error) {
		console.error("Failed to transform Firestore data to AudioButton:", error);
		return null;
	}
}

/**
 * Transforms AudioButtonPlainObject to Firestore data
 */
export function toFirestore(button: AudioButtonPlainObject): FirestoreServerAudioButtonData {
	return {
		id: button.id,
		title: button.title,
		description: button.description,
		tags: button.tags || [],
		sourceVideoId: button.sourceVideoId,
		sourceVideoTitle: button.sourceVideoTitle,
		sourceVideoThumbnailUrl: button.sourceVideoThumbnailUrl,
		startTime: button.startTime,
		endTime: button.endTime,
		createdBy: button.createdBy,
		createdByName: button.createdByName,
		isPublic: button.isPublic,
		playCount: button.playCount || 0,
		likeCount: button.likeCount || 0,
		dislikeCount: button.dislikeCount,
		favoriteCount: button.favoriteCount,
		createdAt: button.createdAt,
		updatedAt: button.updatedAt,
	};
}

/**
 * Creates a new AudioButtonPlainObject with provided data
 */
export function createAudioButton(params: {
	id: string;
	title: string;
	description?: string;
	startTime: number;
	endTime?: number;
	sourceVideoId: string;
	sourceVideoTitle?: string;
	tags?: string[];
	createdBy: string;
	createdByName: string;
	isPublic?: boolean;
}): AudioButtonPlainObject {
	const now = new Date().toISOString();
	const endTime = params.endTime || params.startTime;

	// Calculate duration text
	const duration = endTime - params.startTime;
	const minutes = Math.floor(duration / 60);
	const seconds = Math.floor(duration % 60);
	const durationText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

	return {
		id: params.id,
		title: params.title,
		description: params.description,
		tags: params.tags || [],
		sourceVideoId: params.sourceVideoId,
		sourceVideoTitle: params.sourceVideoTitle,
		sourceVideoThumbnailUrl: undefined,
		startTime: params.startTime,
		endTime: endTime,
		createdBy: params.createdBy,
		createdByName: params.createdByName,
		isPublic: params.isPublic !== undefined ? params.isPublic : true,
		playCount: 0,
		likeCount: 0,
		dislikeCount: 0,
		favoriteCount: 0,
		createdAt: now,
		updatedAt: now,
		_computed: {
			isPopular: false,
			engagementRate: 0,
			engagementRatePercentage: 0,
			popularityScore: 0,
			searchableText:
				`${params.title} ${params.sourceVideoTitle || ""} ${params.createdByName}`.toLowerCase(),
			durationText,
			relativeTimeText: "たった今",
		},
	};
}

/**
 * Updates an existing AudioButtonPlainObject with partial data
 */
export function updateAudioButton(
	button: AudioButtonPlainObject,
	updates: Partial<
		Pick<AudioButtonPlainObject, "title" | "tags" | "isPublic" | "startTime" | "endTime">
	>,
): AudioButtonPlainObject {
	return {
		...button,
		...updates,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Increments view count
 */
export function incrementViewCount(button: AudioButtonPlainObject): AudioButtonPlainObject {
	return {
		...button,
		playCount: (button.playCount || 0) + 1,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Increments like count
 */
export function incrementLikeCount(button: AudioButtonPlainObject): AudioButtonPlainObject {
	return {
		...button,
		likeCount: (button.likeCount || 0) + 1,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Decrements like count
 */
export function decrementLikeCount(button: AudioButtonPlainObject): AudioButtonPlainObject {
	return {
		...button,
		likeCount: Math.max(0, (button.likeCount || 0) - 1),
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Increments dislike count
 */
export function incrementDislikeCount(button: AudioButtonPlainObject): AudioButtonPlainObject {
	return {
		...button,
		dislikeCount: (button.dislikeCount || 0) + 1,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Decrements dislike count
 */
export function decrementDislikeCount(button: AudioButtonPlainObject): AudioButtonPlainObject {
	return {
		...button,
		dislikeCount: Math.max(0, (button.dislikeCount || 0) - 1),
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Increments favorite count
 */
export function incrementFavoriteCount(button: AudioButtonPlainObject): AudioButtonPlainObject {
	return {
		...button,
		favoriteCount: (button.favoriteCount || 0) + 1,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Decrements favorite count
 */
export function decrementFavoriteCount(button: AudioButtonPlainObject): AudioButtonPlainObject {
	return {
		...button,
		favoriteCount: Math.max(0, (button.favoriteCount || 0) - 1),
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Updates statistics in bulk
 */
export function updateStatistics(
	button: AudioButtonPlainObject,
	stats: Partial<Pick<AudioButtonPlainObject, "playCount" | "likeCount" | "dislikeCount">>,
): AudioButtonPlainObject {
	return {
		...button,
		...stats,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Generates a new AudioButton ID
 */
export function generateId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `ab_${timestamp}_${random}`;
}

/**
 * Transforms for API response (removes sensitive data)
 */
export function toApiResponse(button: AudioButtonPlainObject): AudioButtonPlainObject {
	// For now, return as-is, but could filter sensitive fields if needed
	return button;
}

/**
 * Transforms array of Firestore data to AudioButtonPlainObject array
 */
export function fromFirestoreArray(
	dataArray: FirestoreServerAudioButtonData[],
): AudioButtonPlainObject[] {
	return dataArray
		.map(fromFirestore)
		.filter((button): button is AudioButtonPlainObject => button !== null);
}

/**
 * AudioButton transformers namespace for backward compatibility
 */
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
	updateStatistics,
	generateId,
	toApiResponse,
	fromFirestoreArray,
};
