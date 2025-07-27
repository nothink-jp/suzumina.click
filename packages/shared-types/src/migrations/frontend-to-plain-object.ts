/**
 * Migration helper for FrontendAudioButtonData to AudioButtonPlainObject
 */

import type { FrontendAudioButtonData } from "../entities/audio-button";
import type { AudioButtonPlainObject } from "../plain-objects/audio-button-plain";

/**
 * Converts FrontendAudioButtonData to AudioButtonPlainObject
 * This is a migration helper for the deprecated FrontendAudioButtonData type
 */
export function fromFrontendAudioButtonData(data: FrontendAudioButtonData): AudioButtonPlainObject {
	// Calculate computed properties
	const viewCount = data.playCount || 0;
	const likeCount = data.likeCount || 0;
	const dislikeCount = data.dislikeCount || 0;

	// Calculate engagement metrics
	const totalEngagements = likeCount + dislikeCount;
	const engagementRate = viewCount > 0 ? totalEngagements / viewCount : 0;
	const engagementRatePercentage = Math.round(engagementRate * 100);

	// Calculate popularity score
	const popularityScore = viewCount + likeCount * 2 - dislikeCount;

	// Check if popular (threshold: 100+ views or 50+ engagements)
	const isPopular = viewCount >= 100 || totalEngagements >= 50;

	// Build searchable text
	const searchableText = [
		data.title.toLowerCase(),
		...(data.tags || []).map((tag) => tag.toLowerCase()),
		(data.sourceVideoTitle || "").toLowerCase(),
		(data.createdByName || "").toLowerCase(),
	].join(" ");

	return {
		id: data.id,
		title: data.title,
		description: data.description,
		tags: data.tags || [],
		sourceVideoId: data.sourceVideoId,
		sourceVideoTitle: data.sourceVideoTitle,
		sourceVideoThumbnailUrl: data.sourceVideoThumbnailUrl,
		startTime: data.startTime,
		endTime: data.endTime || data.startTime,
		createdBy: data.createdBy,
		createdByName: data.createdByName,
		isPublic: data.isPublic,
		playCount: data.playCount || 0,
		likeCount: data.likeCount || 0,
		dislikeCount: data.dislikeCount || 0,
		favoriteCount: data.favoriteCount || 0,
		createdAt:
			typeof data.createdAt === "string" ? data.createdAt : (data.createdAt as Date).toISOString(),
		updatedAt:
			typeof data.updatedAt === "string" ? data.updatedAt : (data.updatedAt as Date).toISOString(),
		_computed: {
			isPopular,
			engagementRate,
			engagementRatePercentage,
			popularityScore,
			searchableText,
			durationText: data.durationText || "0:00",
			relativeTimeText: data.relativeTimeText || "たった今",
		},
	};
}
