/**
 * Plain object types for Work entity
 *
 * These types are used for Server/Client Component boundary in Next.js
 */

import type { WorkCategory, WorkLanguage } from "../entities/work";

/**
 * Individual creator information
 */
export interface CreatorInfoPlain {
	id: string;
	name: string;
}

/**
 * Creator information for works
 */
export interface WorkCreatorsPlain {
	voiceActors: CreatorInfoPlain[];
	scenario: CreatorInfoPlain[];
	illustration: CreatorInfoPlain[];
	music: CreatorInfoPlain[];
	others: CreatorInfoPlain[];
	// 互換性のための名前配列
	voiceActorNames: string[];
	scenarioNames: string[];
	illustrationNames: string[];
	musicNames: string[];
	otherNames: string[];
}

/**
 * Price information plain object
 */
export interface WorkPricePlain {
	current: number;
	original?: number;
	currency: string;
	discount?: number;
	point?: number;
	isFree: boolean;
	isDiscounted: boolean;
	formattedPrice: string;
}

/**
 * Rating information plain object
 */
export interface WorkRatingPlain {
	stars: number;
	count: number;
	average: number;
	reviewCount?: number;
	distribution?: Record<number, number>;
	hasRatings: boolean;
	isHighlyRated: boolean;
	reliability: "high" | "medium" | "low" | "insufficient";
	formattedRating: string;
}

/**
 * Series information plain object
 */
export interface WorkSeriesPlain {
	id?: string;
	name?: string;
	workCount?: number;
	isCompleted?: boolean;
}

/**
 * Sales status plain object
 */
export interface WorkSalesStatusPlain {
	isOnSale: boolean;
	isDiscounted: boolean;
	isFree: boolean;
	isSoldOut: boolean;
	isReserveWork: boolean;
	dlsiteplaySupported: boolean;
}

/**
 * Sample image plain object
 */
export interface WorkSampleImagePlain {
	thumbnailUrl: string;
	width?: number;
	height?: number;
}

/**
 * Computed properties for work business logic
 *
 * This interface can be extended in the future to add more computed properties
 * without breaking existing implementations.
 */
export interface WorkComputedProperties {
	// Display-related
	displayTitle: string;
	displayCircle: string;
	displayCategory: string;
	displayAgeRating: string;
	displayReleaseDate: string;
	relativeUrl: string;

	// Business logic
	isAdultContent: boolean;
	isVoiceWork: boolean;
	isGameWork: boolean;
	isMangaWork: boolean;
	hasDiscount: boolean;
	isNewRelease: boolean;
	isPopular: boolean;

	// Language-related
	primaryLanguage: WorkLanguage;
	availableLanguages: WorkLanguage[];

	// Search and filtering
	searchableText: string;
	tags: string[];

	// Future computed properties can be added here as optional fields
	// For example:
	// recommendationScore?: number;
	// similarityHash?: string;
	// contentWarnings?: string[];
}

/**
 * Plain object representation of Work entity for Next.js serialization
 */
export interface WorkPlainObject {
	// === Basic Identification ===
	id: string;
	productId: string;
	baseProductId?: string;

	// === Basic Work Information ===
	title: string;
	titleMasked?: string;
	titleKana?: string;
	altName?: string;
	circle: string;
	circleId?: string;
	circleEn?: string;
	description: string;
	category: WorkCategory;
	originalCategoryText?: string;
	workUrl: string;
	thumbnailUrl: string;
	highResImageUrl?: string;

	// === Structured Data ===
	price: WorkPricePlain;
	rating?: WorkRatingPlain;
	creators: WorkCreatorsPlain;
	series?: WorkSeriesPlain;
	salesStatus: WorkSalesStatusPlain;

	// === Extended Metadata ===
	ageRating?: string;
	ageCategory?: number;
	ageCategoryString?: string;
	workType?: string;
	workTypeString?: string;
	workFormat?: string;
	fileFormat?: string;
	fileType?: string;
	fileTypeString?: string;
	fileSize?: number;
	genres: string[];
	customGenres: string[];
	sampleImages: WorkSampleImagePlain[];

	// === Date Information ===
	registDate?: string;
	updateDate?: string;
	releaseDate?: string;
	releaseDateISO?: string;
	releaseDateDisplay?: string;
	createdAt: string;
	updatedAt: string;
	lastFetchedAt: string;

	// === Translation and Language ===
	translationInfo?: {
		isTranslationAgree: boolean;
		isOriginal: boolean;
		originalWorkno?: string;
		lang?: string;
	};
	languageDownloads?: Array<{
		workno: string;
		label: string;
		lang: string;
		dlCount: string;
	}>;

	// === Computed Properties ===
	_computed: WorkComputedProperties;
}

/**
 * Work list result with plain objects
 */
export interface WorkListResultPlain {
	works: WorkPlainObject[];
	hasMore: boolean;
	lastWork?: WorkPlainObject;
	totalCount?: number;
	filteredCount?: number;
}
