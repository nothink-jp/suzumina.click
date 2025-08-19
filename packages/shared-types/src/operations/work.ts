/**
 * Work Business Operations
 *
 * Pure functions for work-related business logic.
 * Replaces Work Entity methods with functional approach.
 */

import type { WorkPlainObject } from "../plain-objects/work-plain";

// Constants from Work Entity
const GAME_CATEGORIES = ["GAM", "RPG", "ACN", "SLN", "ADV", "PZL", "QIZ", "TBL", "DGT"] as const;

const VOICE_CATEGORIES = ["SOU", "MUS", "AMT"] as const;
const MANGA_CATEGORIES = ["MNG", "ICG"] as const;

/**
 * Checks if a work contains adult content
 */
export function isAdultContent(work: WorkPlainObject): boolean {
	if (!work.ageRating) return false;

	const rating = work.ageRating.toLowerCase();
	return (
		rating.includes("18") ||
		rating.includes("adult") ||
		rating.includes("r18") ||
		work.ageCategory === 3
	);
}

/**
 * Checks if a work is voice-related
 */
export function isVoiceWork(work: WorkPlainObject): boolean {
	return (
		VOICE_CATEGORIES.includes(work.category as (typeof VOICE_CATEGORIES)[number]) ||
		work.workType === "SOU"
	);
}

/**
 * Checks if a work is a game
 */
export function isGameWork(work: WorkPlainObject): boolean {
	return (
		GAME_CATEGORIES.includes(work.category as (typeof GAME_CATEGORIES)[number]) ||
		work.workType === "GAM"
	);
}

/**
 * Checks if a work is manga/comic
 */
export function isMangaWork(work: WorkPlainObject): boolean {
	return (
		MANGA_CATEGORIES.includes(work.category as (typeof MANGA_CATEGORIES)[number]) ||
		work.workType === "MNG" ||
		work.workType === "ICG"
	);
}

/**
 * Checks if a work is a new release (within 30 days)
 */
export function isNewRelease(work: WorkPlainObject): boolean {
	if (!work.releaseDate) return false;

	const releaseDate = new Date(work.releaseDate);
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	return releaseDate >= thirtyDaysAgo;
}

/**
 * Checks if a work is popular based on rating and review count
 */
export function isPopular(work: WorkPlainObject): boolean {
	if (!work.rating) return false;

	return (work.rating.average >= 4.0 && work.rating.count >= 50) || work.rating.count >= 100;
}

/**
 * Checks if a work is currently on sale
 */
export function isOnSale(work: WorkPlainObject): boolean {
	return work.salesStatus.isOnSale && !work.salesStatus.isSoldOut;
}

/**
 * Checks if a work has a discount
 */
export function hasDiscount(work: WorkPlainObject): boolean {
	return work.salesStatus.isDiscounted || work.price.isDiscounted;
}

/**
 * Gets searchable text for a work
 */
export function getSearchableText(work: WorkPlainObject): string {
	const parts = [
		work.title,
		work.titleKana,
		work.altName,
		work.circle,
		work.circleEn,
		work.description,
		...work.genres,
		...work.customGenres,
		...work.creators.voiceActorNames,
		...work.creators.scenarioNames,
		...work.creators.illustrationNames,
	].filter(Boolean);

	return parts.join(" ").toLowerCase();
}

/**
 * Gets all tags for a work
 */
export function getAllTags(work: WorkPlainObject): string[] {
	const tags = new Set<string>();

	// Add genres
	work.genres.forEach((genre) => tags.add(genre));
	work.customGenres.forEach((genre) => tags.add(genre));

	// Add category tags
	if (isVoiceWork(work)) tags.add("音声作品");
	if (isGameWork(work)) tags.add("ゲーム");
	if (isMangaWork(work)) tags.add("マンガ");
	if (isAdultContent(work)) tags.add("成人向け");
	if (isNewRelease(work)) tags.add("新作");
	if (hasDiscount(work)) tags.add("割引中");

	return Array.from(tags);
}

/**
 * Formats work price display
 */
export function formatWorkPrice(work: WorkPlainObject): string {
	return work.price.formattedPrice;
}

/**
 * Gets discount percentage
 */
export function getDiscountPercentage(work: WorkPlainObject): number | null {
	if (!work.price.discount) return null;
	return work.price.discount;
}

/**
 * Checks if work has high quality rating
 */
export function hasHighQualityRating(work: WorkPlainObject): boolean {
	if (!work.rating) return false;
	return work.rating.average >= 4.5 && work.rating.count >= 10;
}

/**
 * Gets work type display string
 */
export function getWorkTypeDisplay(work: WorkPlainObject): string {
	if (isVoiceWork(work)) return "音声・ASMR";
	if (isGameWork(work)) return "ゲーム";
	if (isMangaWork(work)) return "マンガ・CG集";
	return work.workTypeString || "その他";
}

/**
 * Calculates work popularity score (0-100)
 */
export function calculatePopularityScore(work: WorkPlainObject): number {
	let score = 0;

	// Rating component (max 50 points)
	if (work.rating) {
		const ratingScore = (work.rating.average / 5) * 30;
		const reviewScore = Math.min(work.rating.count / 100, 1) * 20;
		score += ratingScore + reviewScore;
	}

	// Recency component (max 30 points)
	if (isNewRelease(work)) {
		score += 30;
	} else if (work.releaseDate) {
		const daysSinceRelease = Math.floor(
			(Date.now() - new Date(work.releaseDate).getTime()) / (1000 * 60 * 60 * 24),
		);
		score += Math.max(0, 30 - daysSinceRelease / 10);
	}

	// Sales status component (max 20 points)
	if (hasDiscount(work)) score += 10;
	if (work.salesStatus.isOnSale) score += 10;

	return Math.min(100, Math.round(score));
}

/**
 * Work operations namespace for backward compatibility
 */
export const workOperations = {
	isAdultContent,
	isVoiceWork,
	isGameWork,
	isMangaWork,
	isNewRelease,
	isPopular,
	isOnSale,
	hasDiscount,
	getSearchableText,
	getAllTags,
	formatWorkPrice,
	getDiscountPercentage,
	hasHighQualityRating,
	getWorkTypeDisplay,
	calculatePopularityScore,
};
