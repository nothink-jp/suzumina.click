/**
 * Firestore Transformers
 *
 * Pure functions for transforming data between Firestore and application formats.
 * Replaces Work Entity's fromFirestoreData method.
 */

import type { WorkDocument } from "../entities/work/work-document-schema";
import type { WorkCategory } from "../entities/work/work-types";
import type {
	WorkCreatorsPlain,
	WorkPlainObject,
	WorkPricePlain,
	WorkRatingPlain,
	WorkSalesStatusPlain,
	WorkSeriesPlain,
} from "../plain-objects/work-plain";

/**
 * Transforms Firestore document to WorkPlainObject
 */
export function fromFirestore(doc: WorkDocument): WorkPlainObject {
	const price = transformPrice(doc);
	const rating = transformRating(doc);
	const creators = transformCreators(doc);
	const series = transformSeries(doc);
	const salesStatus = transformSalesStatus(doc);
	const sampleImages = transformSampleImages(doc);
	const computed = createComputedProperties(doc, price, rating, salesStatus);

	return {
		// Basic identification
		id: doc.id,
		productId: doc.productId,
		baseProductId: doc.baseProductId,

		// Basic work information
		title: doc.title,
		titleMasked: doc.titleMasked,
		titleKana: doc.titleKana,
		altName: doc.altName,
		circle: doc.circle,
		circleId: doc.circleId,
		circleEn: doc.circleEn,
		description: doc.description ?? "",
		category: doc.category as WorkCategory,
		originalCategoryText: doc.originalCategoryText,
		workUrl: doc.workUrl ?? "",
		thumbnailUrl: doc.thumbnailUrl ?? "",
		highResImageUrl: doc.highResImageUrl,

		// Structured data
		price,
		rating,
		creators,
		series,
		salesStatus,

		// Extended metadata
		ageRating: doc.ageRating,
		ageCategory: doc.ageCategory,
		ageCategoryString: doc.ageCategoryString,
		workType: doc.workType,
		workTypeString: doc.workTypeString,
		workFormat: doc.workFormat,
		fileFormat: doc.fileFormat,
		fileType: doc.fileType,
		fileTypeString: doc.fileTypeString,
		fileSize: doc.fileSize,
		genres: doc.genres ?? [],
		customGenres: doc.customGenres?.map((g) => g.name ?? "") ?? [],
		sampleImages,

		// Date information
		registDate: doc.registDate,
		updateDate: doc.updateDate,
		releaseDate: doc.releaseDate,
		releaseDateISO: doc.releaseDateISO,
		releaseDateDisplay: doc.releaseDateDisplay,
		createdAt: doc.createdAt ?? new Date().toISOString(),
		updatedAt: doc.updatedAt ?? new Date().toISOString(),
		lastFetchedAt: doc.lastFetchedAt ?? new Date().toISOString(),

		// Translation and language
		translationInfo: doc.translationInfo,
		languageDownloads: doc.languageDownloads,

		// Computed properties
		_computed: computed,
	};
}

/**
 * Transforms WorkPlainObject to Firestore document format
 */
export function toFirestore(work: WorkPlainObject): Partial<WorkDocument> {
	return {
		id: work.id,
		productId: work.productId,
		baseProductId: work.baseProductId,
		title: work.title,
		titleMasked: work.titleMasked,
		titleKana: work.titleKana,
		altName: work.altName,
		circle: work.circle,
		circleId: work.circleId,
		circleEn: work.circleEn,
		description: work.description,
		category: work.category,
		originalCategoryText: work.originalCategoryText,
		workUrl: work.workUrl,
		thumbnailUrl: work.thumbnailUrl,
		highResImageUrl: work.highResImageUrl,

		// Convert structured data back
		price: work.price
			? {
					current: work.price.current,
					original: work.price.original,
					currency: work.price.currency,
					discount: work.price.discount,
					point: work.price.point,
					isFree: work.price.isFree,
					isDiscounted: work.price.isDiscounted,
				}
			: undefined,

		rating: work.rating
			? {
					average: work.rating.average,
					count: work.rating.count,
					reviewCount: work.rating.reviewCount,
					distribution: work.rating.distribution,
				}
			: undefined,

		creators: {
			voiceActors: work.creators.voiceActors,
			scenario: work.creators.scenario,
			illustration: work.creators.illustration,
			music: work.creators.music,
			createdBy: work.creators.others,
			voiceActorNames: work.creators.voiceActorNames,
			scenarioNames: work.creators.scenarioNames,
			illustrationNames: work.creators.illustrationNames,
			musicNames: work.creators.musicNames,
			otherNames: work.creators.otherNames,
		},

		seriesInfo: work.series,
		salesStatus: work.salesStatus,

		ageRating: work.ageRating,
		ageCategory: work.ageCategory,
		ageCategoryString: work.ageCategoryString,
		workType: work.workType,
		workTypeString: work.workTypeString,
		workFormat: work.workFormat,
		fileFormat: work.fileFormat,
		fileType: work.fileType,
		fileTypeString: work.fileTypeString,
		fileSize: work.fileSize,
		genres: work.genres,
		customGenres: work.customGenres.map((name) => ({ name })),
		sampleImages: work.sampleImages.map((img) => ({
			thumb: img.thumbnailUrl,
			width: img.width,
			height: img.height,
		})),

		registDate: work.registDate,
		updateDate: work.updateDate,
		releaseDate: work.releaseDate,
		releaseDateISO: work.releaseDateISO,
		releaseDateDisplay: work.releaseDateDisplay,
		createdAt: work.createdAt,
		updatedAt: work.updatedAt,
		lastFetchedAt: work.lastFetchedAt,

		translationInfo: work.translationInfo,
		languageDownloads: work.languageDownloads,
	};
}

// Helper functions

function transformPrice(doc: WorkDocument): WorkPricePlain {
	return {
		current: doc.price?.current ?? 0,
		original: doc.price?.original,
		currency: doc.price?.currency ?? "JPY",
		discount: doc.price?.discount,
		point: doc.price?.point,
		isFree: doc.price?.isFree ?? false,
		isDiscounted: doc.price?.isDiscounted ?? false,
		formattedPrice: formatPrice(doc.price?.current ?? 0, doc.price?.currency ?? "JPY"),
	};
}

function transformRating(doc: WorkDocument): WorkRatingPlain | undefined {
	if (!doc.rating) return undefined;

	return {
		stars: doc.rating.average ?? 0,
		count: doc.rating.count ?? 0,
		average: doc.rating.average ?? 0,
		reviewCount: doc.rating.reviewCount,
		distribution: doc.rating.distribution,
		hasRatings: (doc.rating.count ?? 0) > 0,
		isHighlyRated: (doc.rating.average ?? 0) >= 4.0 && (doc.rating.count ?? 0) >= 10,
		reliability: getRatingReliability(doc.rating.count ?? 0),
		formattedRating: formatRating(doc.rating.average ?? 0),
	};
}

function transformCreators(doc: WorkDocument): WorkCreatorsPlain {
	const mapCreator = (c: { id?: string; name?: string }) => ({
		id: c.id ?? "",
		name: c.name ?? "",
	});

	return {
		voiceActors: doc.creators?.voiceActors?.map(mapCreator) ?? [],
		scenario: doc.creators?.scenario?.map(mapCreator) ?? [],
		illustration: doc.creators?.illustration?.map(mapCreator) ?? [],
		music: doc.creators?.music?.map(mapCreator) ?? [],
		others: doc.creators?.createdBy?.map(mapCreator) ?? [],
		voiceActorNames: doc.creators?.voiceActorNames ?? [],
		scenarioNames: doc.creators?.scenarioNames ?? [],
		illustrationNames: doc.creators?.illustrationNames ?? [],
		musicNames: doc.creators?.musicNames ?? [],
		otherNames: doc.creators?.otherNames ?? [],
	};
}

function transformSeries(doc: WorkDocument): WorkSeriesPlain | undefined {
	if (!doc.seriesInfo) return undefined;

	return {
		id: doc.seriesInfo.id,
		name: doc.seriesInfo.name,
		workCount: doc.seriesInfo.workCount,
		isCompleted: doc.seriesInfo.isCompleted,
	};
}

function transformSalesStatus(doc: WorkDocument): WorkSalesStatusPlain {
	return {
		isOnSale: doc.salesStatus?.isOnSale ?? true,
		isDiscounted: doc.salesStatus?.isDiscounted ?? false,
		isFree: doc.salesStatus?.isFree ?? false,
		isSoldOut: doc.salesStatus?.isSoldOut ?? false,
		isReserveWork: doc.salesStatus?.isReserveWork ?? false,
		dlsiteplaySupported: doc.salesStatus?.dlsiteplaySupported ?? false,
	};
}

function transformSampleImages(doc: WorkDocument): WorkPlainObject["sampleImages"] {
	return (
		doc.sampleImages?.map((img) => ({
			thumbnailUrl: img.thumb ?? "",
			width: img.width,
			height: img.height,
		})) ?? []
	);
}

function formatPrice(amount: number, currency: string): string {
	const formatter = new Intl.NumberFormat("ja-JP", {
		style: "currency",
		currency: currency,
	});
	return formatter.format(amount);
}

function formatRating(average: number): string {
	return `★${average.toFixed(1)}`;
}

function getRatingReliability(count: number): "high" | "medium" | "low" | "insufficient" {
	if (count >= 100) return "high";
	if (count >= 50) return "medium";
	if (count >= 10) return "low";
	return "insufficient";
}

function createComputedProperties(
	doc: WorkDocument,
	price: WorkPricePlain,
	rating: WorkRatingPlain | undefined,
	salesStatus: WorkSalesStatusPlain,
): WorkPlainObject["_computed"] {
	const category = doc.category as WorkCategory;

	return {
		displayTitle: doc.title,
		displayCircle: doc.circle,
		displayCategory: getCategoryDisplay(category),
		displayAgeRating: doc.ageRating ?? "全年齢",
		displayReleaseDate: doc.releaseDateDisplay ?? doc.releaseDate ?? "",
		relativeUrl: `/works/${doc.productId}`,

		isAdultContent: doc.ageCategory === 3 || (doc.ageRating?.includes("18") ?? false),
		isVoiceWork: ["SOU", "MUS", "AMT"].includes(category),
		isGameWork: ["GAM", "RPG", "ACN", "SLN", "ADV", "PZL", "QIZ", "TBL", "DGT"].includes(category),
		isMangaWork: ["MNG", "ICG"].includes(category),
		hasDiscount: salesStatus.isDiscounted || price.isDiscounted,
		isNewRelease: isWithinDays(doc.releaseDate, 30),
		isPopular:
			(rating?.count ?? 0) >= 100 || ((rating?.average ?? 0) >= 4.0 && (rating?.count ?? 0) >= 50),

		primaryLanguage: "JPN" as const,
		availableLanguages: doc.languageDownloads?.map((dl) => dl.lang as string) ?? ["JPN"],

		searchableText: [doc.title, doc.titleKana, doc.circle, doc.description, ...(doc.genres ?? [])]
			.filter(Boolean)
			.join(" ")
			.toLowerCase(),

		tags: [...(doc.genres ?? []), ...(doc.customGenres?.map((g) => g.name ?? "") ?? [])],
	};
}

function getCategoryDisplay(category: WorkCategory): string {
	const categoryMap: Record<WorkCategory, string> = {
		GAM: "ゲーム",
		RPG: "RPG",
		ACN: "アクション",
		SLN: "シミュレーション",
		ADV: "アドベンチャー",
		PZL: "パズル",
		QIZ: "クイズ",
		TBL: "テーブル",
		DGT: "デジタル",
		SOU: "音声・ASMR",
		MUS: "音楽",
		AMT: "ASMR",
		MNG: "マンガ",
		ICG: "CG・イラスト",
		MOV: "動画",
		TOL: "ツール",
		NOV: "ノベル",
		ET3: "その他",
	};
	return categoryMap[category] ?? category;
}

function isWithinDays(dateString: string | undefined, days: number): boolean {
	if (!dateString) return false;
	const date = new Date(dateString);
	const daysAgo = new Date();
	daysAgo.setDate(daysAgo.getDate() - days);
	return date >= daysAgo;
}

/**
 * Firestore transformers namespace
 */
export const workTransformers = {
	fromFirestore,
	toFirestore,
};
