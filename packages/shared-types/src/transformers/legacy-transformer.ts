/**
 * Legacy Transformer - 既存型との相互変換
 *
 * WorkPlainObject ↔ WorkData の変換を提供
 * 段階的移行のためのブリッジ層
 */

import { WorkActions } from "../actions/work-actions";
import type { WorkCategory, WorkLanguage } from "../entities/work/work-types";
import type { WorkData } from "../models/work-data";
import type { WorkComputedProperties, WorkPlainObject } from "../plain-objects/work-plain";

/**
 * WorkPlainObject → WorkData 変換
 */
export const fromWorkPlainObject = (plain: WorkPlainObject): WorkData => {
	return {
		id: plain.id,
		productId: plain.productId,
		title: plain.title,
		maskedTitle: plain.titleMasked,
		circle: {
			id: plain.circleId || "UNKNOWN",
			name: plain.circle,
			nameEn: plain.circleEn,
		},
		price: {
			current: plain.price?.current || 0,
			original: plain.price?.original,
			discountRate: plain.price?.discount,
			currency: plain.price?.currency || "JPY",
		},
		releaseDate: plain.releaseDate || plain.registDate || new Date().toISOString(),
		registeredDate: plain.registDate,
		lastModified: plain.updateDate,
		rating: plain.rating
			? {
					average: plain.rating.average,
					count: plain.rating.count,
					reviewCount: plain.rating.reviewCount,
				}
			: undefined,
		category: plain.category,
		workType: plain.workType,
		tags: plain.genres,
		description: plain.description,
		imageUrl: plain.highResImageUrl,
		thumbnailUrl: plain.thumbnailUrl,
		workUrl: plain.workUrl,
		saleCount: plain.rating?.count,
		reviewCount: plain.rating?.reviewCount,
		isAdult: plain.ageRating === "R18" || plain.ageRating === "R-18",
		hasStock: plain.salesStatus?.isOnSale,
		ageRating: plain.ageRating,
		creators: plain.creators
			? {
					voiceActor: plain.creators.voiceActors,
					scenario: plain.creators.scenario,
					illustration: plain.creators.illustration,
					music: plain.creators.music,
					other: plain.creators.others,
				}
			: undefined,
	};
};

/**
 * デフォルトのcomputedプロパティを生成
 */
const createDefaultComputedProperties = (data: WorkData): WorkComputedProperties => ({
	displayTitle: data.title,
	displayCircle: data.circle?.name || "",
	displayCategory: data.category || "",
	displayAgeRating: data.ageRating || "全年齢",
	displayReleaseDate: data.releaseDate || "",
	relativeUrl: `/works/${data.productId}`,
	isAdultContent: data.isAdult || false,
	isVoiceWork: false,
	isGameWork: false,
	isMangaWork: false,
	hasDiscount: (data.price?.discountRate || 0) > 0,
	isNewRelease: WorkActions.isNewRelease(data),
	isPopular: false,
	primaryLanguage: "ja" as WorkLanguage,
	availableLanguages: ["ja"] as WorkLanguage[],
	searchableText: data.title,
	tags: data.tags ? [...data.tags] : [],
});

/**
 * WorkDataのcomputedプロパティを生成
 */
const createComputedProperties = (
	data: WorkData,
	withComputed: WorkData,
): WorkComputedProperties => {
	const defaultProps = createDefaultComputedProperties(data);

	if (!withComputed._computed) {
		return defaultProps;
	}

	return {
		...defaultProps,
		displayTitle: withComputed._computed.displayTitle || defaultProps.displayTitle,
		hasDiscount: withComputed._computed.isOnSale || defaultProps.hasDiscount,
		isNewRelease: withComputed._computed.isNewRelease || defaultProps.isNewRelease,
	};
};

/**
 * WorkDataからcreatorsを生成
 */
const createCreatorsPlain = (data: WorkData) => ({
	voiceActors: data.creators?.voiceActor ? [...data.creators.voiceActor] : [],
	scenario: data.creators?.scenario ? [...data.creators.scenario] : [],
	illustration: data.creators?.illustration ? [...data.creators.illustration] : [],
	music: data.creators?.music ? [...data.creators.music] : [],
	others: data.creators?.other ? [...data.creators.other] : [],
	voiceActorNames: data.creators?.voiceActor?.map((c) => c.name) || [],
	scenarioNames: data.creators?.scenario?.map((c) => c.name) || [],
	illustrationNames: data.creators?.illustration?.map((c) => c.name) || [],
	musicNames: data.creators?.music?.map((c) => c.name) || [],
	otherNames: data.creators?.other?.map((c) => c.name) || [],
});

/**
 * WorkDataからratingを生成
 */
const createRatingPlain = (data: WorkData) => {
	if (!data.rating) return undefined;
	return {
		average: data.rating.average,
		count: data.rating.count,
		reviewCount: data.rating.reviewCount || 0,
		hasRatings: data.rating.count > 0,
		formattedRating: `${data.rating.average.toFixed(1)} (${data.rating.count}件)`,
		stars: Math.round(data.rating.average),
		isHighlyRated: data.rating.average >= 4.0,
		reliability: (data.rating.count >= 10 ? "high" : data.rating.count >= 5 ? "medium" : "low") as
			| "high"
			| "medium"
			| "low"
			| "insufficient",
	};
};

/**
 * WorkData → WorkPlainObject 変換（後方互換）
 */
export const toWorkPlainObject = (data: WorkData): WorkPlainObject => {
	// 計算済みプロパティを生成
	const withComputed = WorkActions.computeProperties(data);

	return {
		id: data.id,
		productId: data.productId,
		title: data.title,
		titleMasked: data.maskedTitle,
		titleKana: undefined, // 新システムでは使用しない
		circle: data.circle.name,
		circleId: data.circle.id,
		circleEn: data.circle.nameEn,
		registDate: data.registeredDate || data.releaseDate,
		releaseDate: data.releaseDate,
		updateDate: data.lastModified,
		price: {
			current: data.price?.current || 0,
			original: data.price?.original,
			currency: data.price?.currency || "JPY",
			discount: data.price?.discountRate,
			point: undefined,
			isFree: (data.price?.current || 0) === 0,
			isDiscounted: (data.price?.discountRate || 0) > 0,
			formattedPrice: WorkActions.formatPrice(data),
		},
		rating: createRatingPlain(data),
		category: data.category as WorkCategory,
		workType: data.workType,
		genres: data.tags ? [...data.tags] : [],
		customGenres: [],
		description: data.description || "",
		highResImageUrl: data.imageUrl,
		thumbnailUrl: data.thumbnailUrl || WorkActions.generateThumbnailUrl(data),
		workUrl: data.workUrl || WorkActions.generateWorkUrl(data),
		creators: createCreatorsPlain(data),
		_computed: createComputedProperties(data, withComputed),
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		lastFetchedAt: new Date().toISOString(),
		salesStatus: {
			isOnSale: true,
			isDiscounted: (data.price?.discountRate || 0) > 0,
			isFree: (data.price?.current || 0) === 0,
			isSoldOut: false,
			isReserveWork: false,
			dlsiteplaySupported: false,
		},
		sampleImages: [],
	};
};

/**
 * バッチ変換ユーティリティ
 */
export const batchFromPlainObject = (plains: WorkPlainObject[]): WorkData[] => {
	return plains.map(fromWorkPlainObject);
};

export const batchToPlainObject = (works: WorkData[]): WorkPlainObject[] => {
	return works.map(toWorkPlainObject);
};

/**
 * 型判定ユーティリティ
 */
export const isWorkPlainObject = (obj: unknown): obj is WorkPlainObject => {
	if (!obj || typeof obj !== "object") return false;
	const work = obj as Record<string, unknown>;
	return (
		typeof work.id === "string" &&
		typeof work.productId === "string" &&
		typeof work.title === "string" &&
		"_computed" in work
	);
};

export const isWorkData = (obj: unknown): obj is WorkData => {
	if (!obj || typeof obj !== "object") return false;
	const work = obj as Record<string, unknown>;
	return (
		typeof work.id === "string" &&
		typeof work.productId === "string" &&
		typeof work.title === "string" &&
		work.circle !== null &&
		typeof work.circle === "object" &&
		typeof (work.circle as Record<string, unknown>).id === "string"
	);
};
