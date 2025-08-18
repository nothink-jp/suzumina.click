/**
 * Work Factory
 *
 * Factory functions for creating Work entities from various data sources.
 * Extracted from Work entity to follow Single Responsibility Principle.
 */

import type { DatabaseError } from "../../core/result";
import { databaseError, err, ok, type Result } from "../../core/result";
import type { WorkPlainObject } from "../../plain-objects/work-plain";
import { Circle } from "../../value-objects/work/circle";
import { WorkCreators } from "../../value-objects/work/work-creators";
import { WorkPrice } from "../../value-objects/work/work-price";
import { WorkRating } from "../../value-objects/work/work-rating";
import { WorkTitle } from "../../value-objects/work/work-title";
import type {
	Work,
	WorkExtendedInfo,
	WorkMetadata,
	WorkSalesStatus,
	WorkSeriesInfo,
} from "../work-entity";
import { WorkBuilder } from "./work-builder";
import type { WorkDocument } from "./work-document-schema";

/**
 * Validates required fields for Work creation
 */
function validateRequiredFields(data: WorkDocument): Result<void, DatabaseError> {
	if (!data.productId || !data.title || !data.circle) {
		return err(
			databaseError("Missing required fields: productId, title, or circle", "INVALID_DATA"),
		);
	}
	return { isOk: () => true, isErr: () => false } as Result<void, DatabaseError>;
}

/**
 * Sets basic properties on WorkBuilder
 */
function setBasicProperties(
	builder: WorkBuilder,
	data: WorkDocument,
): Result<WorkBuilder, DatabaseError> {
	// Set ID
	const idResult = builder.withId(data.productId);
	if (idResult.isErr()) {
		return err(databaseError(idResult.error.message, "INVALID_DATA"));
	}

	// Set Title
	const titleResult = WorkTitle.create(data.title, data.titleMasked, data.titleKana, data.altName);
	if (titleResult.isErr()) {
		return err(databaseError(titleResult.error.message, "INVALID_DATA"));
	}
	const titleBuilderResult = idResult.value.withTitle(
		titleResult.value.toString(),
		titleResult.value.getMasked(),
		titleResult.value.getKana(),
		titleResult.value.getAltName(),
	);
	if (titleBuilderResult.isErr()) {
		return err(databaseError(titleBuilderResult.error.message, "INVALID_DATA"));
	}

	// Set Circle (following the original implementation pattern)
	const circleResult = Circle.create(data.circleId || "UNKNOWN", data.circle, data.circleEn);
	if (circleResult.isErr()) {
		return err(databaseError(circleResult.error.message, "INVALID_DATA"));
	}
	const circleBuilderResult = titleBuilderResult.value.withCircle(
		circleResult.value.id,
		circleResult.value.name,
	);
	if (circleBuilderResult.isErr()) {
		return err(databaseError(circleBuilderResult.error.message, "INVALID_DATA"));
	}

	return ok(circleBuilderResult.value);
}

/**
 * Sets creators and financial properties on WorkBuilder
 */
function setCreatorsAndFinancials(
	builder: WorkBuilder,
	data: WorkDocument,
): Result<WorkBuilder, DatabaseError> {
	// Set Creators
	let creatorsBuilderResult = builder;
	if (data.creators) {
		// Transform creators data to ensure id is present
		const transformedCreators = {
			voice_by: data.creators.voice_by?.map((c) => ({ id: c.id || "UNKNOWN", name: c.name })) || [],
			scenario_by:
				data.creators.scenario_by?.map((c) => ({ id: c.id || "UNKNOWN", name: c.name })) || [],
			illust_by:
				data.creators.illust_by?.map((c) => ({ id: c.id || "UNKNOWN", name: c.name })) || [],
			music_by: data.creators.music_by?.map((c) => ({ id: c.id || "UNKNOWN", name: c.name })) || [],
			others_by:
				data.creators.others_by?.map((c) => ({ id: c.id || "UNKNOWN", name: c.name })) || [],
			created_by:
				data.creators.created_by?.map((c) => ({ id: c.id || "UNKNOWN", name: c.name })) || [],
		};
		const creatorsResult = WorkCreators.fromCreatorsObject(transformedCreators);
		if (creatorsResult.isErr()) {
			return err(databaseError(creatorsResult.error.message, "INVALID_DATA"));
		}
		creatorsBuilderResult = builder.withCreators(creatorsResult.value);
	}

	// Set Price
	const priceResult = WorkPrice.create(data.price?.current ?? 0, data.price?.currency);
	if (priceResult.isErr()) {
		return err(databaseError(priceResult.error.message, "INVALID_DATA"));
	}
	const priceBuilderResult = creatorsBuilderResult.withWorkPrice(priceResult.value);

	// Set Rating
	const ratingResult = WorkRating.create(
		data.rating?.stars ?? 0,
		data.rating?.count ?? 0,
		data.rating?.averageDecimal ?? data.rating?.stars ?? 0,
		data.rating?.reviewCount,
		data.rating?.ratingDetail?.reduce(
			(acc, item) => {
				acc[item.review_point] = item.count;
				return acc;
			},
			{} as Record<number, number>,
		),
	);
	if (ratingResult.isErr()) {
		return err(databaseError(ratingResult.error.message, "INVALID_DATA"));
	}
	const ratingBuilderResult = priceBuilderResult.withWorkRating(ratingResult.value);

	return ok(ratingBuilderResult);
}

/**
 * Sets additional properties on WorkBuilder
 */
function setAdditionalProperties(
	builder: WorkBuilder,
	data: WorkDocument,
): Result<WorkBuilder, DatabaseError> {
	// Set Sales Status
	const salesStatus = createSalesStatus(data);
	const salesStatusResult = builder.withSalesStatus(salesStatus);

	// Set Series Info
	const seriesInfo = createSeriesInfo(data);
	const seriesResult = seriesInfo
		? salesStatusResult.withSeriesInfo(seriesInfo)
		: salesStatusResult;

	// Set Extended Info
	const extendedInfo = createExtendedInfo(data);
	const extendedResult = seriesResult.withExtendedInfo(extendedInfo);

	// Set Metadata
	const metadata = createMetadata(data);
	const metadataResult = extendedResult.withMetadata(metadata);

	return ok(metadataResult);
}

/**
 * Creates Work from Firestore data (most important method)
 * Returns Result<Work, DatabaseError> for proper error handling
 */
export function createWorkFromFirestoreData(data: WorkDocument): Result<Work, DatabaseError> {
	try {
		// Validate required fields
		const validationResult = validateRequiredFields(data);
		if (validationResult.isErr()) {
			return err(databaseError("Missing required fields", "INVALID_DATA"));
		}

		const builder = WorkBuilder.create();

		// Set basic properties
		const basicResult = setBasicProperties(builder, data);
		if (basicResult.isErr()) {
			return err(databaseError(basicResult.error.detail, "INVALID_DATA"));
		}

		// Set creators and financials
		const creatorsResult = setCreatorsAndFinancials(basicResult.value, data);
		if (creatorsResult.isErr()) {
			return err(databaseError(creatorsResult.error.detail, "INVALID_DATA"));
		}

		// Set additional properties
		const additionalResult = setAdditionalProperties(creatorsResult.value, data);
		if (additionalResult.isErr()) {
			return err(databaseError(additionalResult.error.detail, "INVALID_DATA"));
		}

		// Build the Work entity
		const buildResult = additionalResult.value.build();
		if (buildResult.isErr()) {
			return err(databaseError(buildResult.error.message, "CONVERSION_ERROR"));
		}
		return ok(buildResult.value);
	} catch (error) {
		return err(
			databaseError(`Failed to create Work from Firestore data: ${error}`, "CONVERSION_ERROR"),
		);
	}
}

/**
 * Creates Work from plain object (not yet implemented)
 * This will be used for deserialization from JSON
 */
export function createWorkFromPlainObject(_obj: WorkPlainObject): Result<Work, DatabaseError> {
	// TODO: Implement this method
	return err(databaseError("fromPlainObject not yet implemented", "NOT_IMPLEMENTED"));
}

/**
 * Utility to safely parse dates from Firestore
 */
function parseDate(date: unknown): Date | undefined {
	if (!date) return undefined;
	if (date instanceof Date) return date;
	if (typeof date === "object" && "toDate" in date && typeof date.toDate === "function") {
		return date.toDate();
	}
	if (typeof date === "string" || typeof date === "number") {
		const parsed = new Date(date);
		return Number.isNaN(parsed.getTime()) ? undefined : parsed;
	}
	return undefined;
}

/**
 * Creates WorkSalesStatus from Firestore data
 */
function createSalesStatus(data: WorkDocument): WorkSalesStatus {
	return {
		isOnSale: data.salesStatus?.isSale ?? true,
		isDiscounted: data.salesStatus?.isDiscount ?? false,
		isFree: data.salesStatus?.isFree ?? false,
		isSoldOut: false,
		isReserveWork: false,
		dlsiteplaySupported: data.salesStatus?.dlsiteplayWork ?? false,
	};
}

/**
 * Creates WorkSeriesInfo from Firestore data
 */
function createSeriesInfo(data: WorkDocument): WorkSeriesInfo | undefined {
	if (!data.seriesId) return undefined;

	return {
		id: data.seriesId,
		name: data.seriesName ?? "",
	};
}

/**
 * Creates basic extended info properties
 */
function createBasicExtendedInfo(data: WorkDocument) {
	return {
		tags: [],
		genres: data.genres ?? [],
		categories: [],
		ageRating: data.ageRating ?? "all-ages",
		language: "ja-jp",
		workType: data.workType ?? "other",
		format: data.fileFormat ?? "other",
		fileSize: data.fileSize,
		productFormats: [],
		imageUrls: {
			main: data.highResImageUrl ?? data.thumbnailUrl ?? "",
			thumbnail: data.thumbnailUrl,
			samples: data.sampleImages?.map((img) => img.thumb) ?? [],
		},
		description: data.description ?? "",
		shortDescription: undefined,
		catchCopy: undefined,
		announcement: undefined,
		upgradeInformation: undefined,
		keywords: [],
		affiliateInfo: undefined,
		specialCategories: [],
	};
}

/**
 * Creates user-related flags
 */
function createUserFlags(_data: WorkDocument) {
	return {
		isPurchased: false,
		isFavorite: false,
		isWishlisted: false,
	};
}

/**
 * Creates platform and feature flags
 */
function createFeatureFlags(data: WorkDocument) {
	return {
		isRanking: false,
		isDiscounted: data.salesStatus?.isDiscount ?? false,
		isNew: false,
		isBrowserOnly: false,
		isPc: false,
		isAndroidApp: false,
		isIosApp: false,
		isExclusive: false,
		isBulkOnly: false,
		isLimitedEdition: false,
		isTrialAvailable: false,
		hasCoupon: false,
		isTranslated: !!data.translationInfo,
	};
}

/**
 * Creates additional extended info properties
 */
function createAdditionalExtendedInfo(data: WorkDocument) {
	return {
		translationType: undefined,
		supportedLanguages: [],
		lastWatchedDate: undefined,
		lastDownloadedDate: undefined,
		lastUpdatedDate: parseDate(data.updateDate),
		cienUrl: undefined,
		dlAffiliateUrl: undefined,
		fanzaAffiliateUrl: undefined,
		productPageUrl: data.workUrl,
	};
}

/**
 * Creates WorkExtendedInfo from Firestore data
 */
function createExtendedInfo(data: WorkDocument): WorkExtendedInfo {
	return {
		...createBasicExtendedInfo(data),
		...createUserFlags(data),
		...createFeatureFlags(data),
		...createAdditionalExtendedInfo(data),
		// Add required fields
		customGenres: data.customGenres?.map((g) => g.name) ?? [],
		sampleImages: data.sampleImages ?? [],
		workUrl: data.workUrl,
		thumbnailUrl: data.thumbnailUrl,
	};
}

/**
 * Creates WorkMetadata from Firestore data
 */
function createMetadata(data: WorkDocument): WorkMetadata {
	return {
		registDate: parseDate(data.registDate),
		updateDate: parseDate(data.updateDate),
		releaseDate: parseDate(data.releaseDate ?? data.registDate),
		createdAt: parseDate(data.createdAt) ?? new Date(),
		updatedAt: parseDate(data.updatedAt) ?? new Date(),
		lastFetchedAt: parseDate(data.lastFetchedAt) ?? new Date(),
	};
}

// Legacy exports for backward compatibility
export const WorkFactory = {
	fromFirestoreData: createWorkFromFirestoreData,
	fromPlainObject: createWorkFromPlainObject,
};
