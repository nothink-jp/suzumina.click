/**
 * Firestore Work Data Types
 *
 * This file contains Firestore-specific type definitions for Work entity.
 * Separated from entity file to avoid circular dependencies.
 */

import type { WorkCategory } from "../../entities/work";

/**
 * Firestore server work data type
 * This type represents the structure of work data stored in Firestore
 */
export interface FirestoreServerWorkData {
	// === Basic Identification ===
	/** Firestore document ID */
	id: string;
	/** DLsite product ID (e.g., "RJ236867") */
	productId: string;
	/** Base product ID for variant works */
	baseProductId?: string;

	// === Basic Work Information ===
	/** Work title */
	title: string;
	/** Masked title for sensitive content */
	titleMasked?: string;
	/** Title reading (kana) */
	titleKana?: string;
	/** Alternative name */
	altName?: string;
	/** Circle/Maker name */
	circle: string;
	/** Circle/Maker ID */
	circleId?: string;
	/** Circle name in English */
	circleEn?: string;
	/** Work description */
	description?: string;
	/** Work type */
	workType?: string;
	/** Work type display string */
	workTypeString?: string;
	/** Work category for filtering */
	category: WorkCategory;
	/** Original category text for display */
	originalCategoryText?: string;
	/** DLsite work page URL */
	workUrl: string;
	/** Thumbnail image URL */
	thumbnailUrl: string;
	/** High resolution image URL */
	highResImageUrl?: string;

	// === Price Information ===
	/** Current price in JPY */
	currentPrice: number;
	/** Original price before discount */
	originalPrice?: number;
	/** Currency code */
	currency: string;
	/** Discount percentage */
	discount?: number;
	/** Points */
	point?: number;
	/** Free or missing price flag */
	isFreeOrMissingPrice?: boolean;

	// === Rating Information ===
	/** Star rating (0-5) */
	ratingStars?: number;
	/** Rating count */
	ratingCount?: number;
	/** Review count */
	reviewCount?: number;
	/** Average rating (decimal) */
	averageRating?: number;
	/** Rating distribution */
	ratingDetail?: Array<{
		review_point: number;
		count: number;
		ratio: number;
	}>;

	// === Creator Information ===
	/** Voice actors */
	voiceActors?: string[];
	/** Scenario writers */
	scenario?: string[];
	/** Illustrators */
	illustration?: string[];
	/** Music creators */
	music?: string[];
	/** Other authors */
	author?: string[];

	// === Genre and Tags ===
	/** DLsite official genres */
	genres?: string[];
	/** Custom genres */
	customGenres?: Array<{
		genre_key: string;
		name: string;
		name_en?: string;
		display_order?: number;
	}>;
	/** Work options */
	workOptions?: Record<
		string,
		{
			name: string;
			name_en?: string;
		}
	>;

	// === Date Information ===
	/** Registration date */
	registDate?: string;
	/** Update date */
	updateDate?: string;
	/** Release date (original string) */
	releaseDate?: string;
	/** ISO format date for sorting */
	releaseDateISO?: string;
	/** Display format date in Japanese */
	releaseDateDisplay?: string;

	// === Extended Metadata ===
	/** Series ID */
	seriesId?: string;
	/** Series name */
	seriesName?: string;
	/** Age rating */
	ageRating?: string;
	/** Age category (numeric) */
	ageCategory?: number;
	/** Age category string */
	ageCategoryString?: string;
	/** Work format */
	workFormat?: string;
	/** File format */
	fileFormat?: string;
	/** File type */
	fileType?: string;
	/** File type display string */
	fileTypeString?: string;
	/** File size in bytes */
	fileSize?: number;

	// === Sample Images ===
	/** Sample image URLs */
	sampleImages?: Array<{
		thumb: string;
		width?: number;
		height?: number;
	}>;

	// === Sales and Campaign Information ===
	/** On sale flag (0 or 1) */
	onSale?: number;
	/** Discount work flag */
	isDiscountWork?: boolean;
	/** Campaign ID */
	campaignId?: number;
	/** Sales status flags */
	salesStatus?: {
		isSale?: boolean;
		onSale?: number;
		isDiscount?: boolean;
		isPointup?: boolean;
		isFree?: boolean;
		isRental?: boolean;
		isSoldOut?: boolean;
		isReserveWork?: boolean;
		isReservable?: boolean;
		isTimesale?: boolean;
		dlsiteplayWork?: boolean;
	};

	// === Translation and Language ===
	/** Translation information */
	translationInfo?: {
		isTranslationAgree?: boolean;
		isVolunteer?: boolean;
		isOriginal?: boolean;
		isParent?: boolean;
		isChild?: boolean;
		originalWorkno?: string;
		parentWorkno?: string;
		childWorknos?: string[];
		lang?: string;
		productionTradePriceRate?: number;
	};
	/** Language downloads */
	languageDownloads?: Array<{
		workno: string;
		editionId?: number;
		editionType?: string;
		displayOrder?: number;
		label: string;
		lang: string;
		dlCount: string;
		displayLabel: string;
	}>;

	// === System Management ===
	/** Last fetched timestamp */
	lastFetchedAt: unknown; // Firestore Timestamp
	/** Creation timestamp */
	createdAt: unknown; // Firestore Timestamp
	/** Update timestamp */
	updatedAt: unknown; // Firestore Timestamp
}

// Alias for backward compatibility
export type FirestoreWorkData = FirestoreServerWorkData;
