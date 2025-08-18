/**
 * Work Factory
 *
 * Factory functions for creating Work entities from various data sources.
 * Extracted from Work entity to follow Single Responsibility Principle.
 */

import type { DatabaseError } from "../../core/result";
import { databaseError, err, type Result } from "../../core/result";
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
	const titleResult = WorkTitle.create(data.title, data.maskedTitle, data.titleKana, data.altTitle);
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

	return circleBuilderResult;
}

/**
 * Sets creators and financial properties on WorkBuilder
 */
function setCreatorsAndFinancials(
	builder: WorkBuilder,
	data: WorkDocument,
): Result<WorkBuilder, DatabaseError> {
	// Set Creators
	const creatorsResult = WorkCreators.fromCreatorsObject(data.creators);
	if (creatorsResult.isErr()) {
		return err(databaseError(creatorsResult.error.message, "INVALID_DATA"));
	}
	const creatorsBuilderResult = builder.withCreators(creatorsResult.value);
	if (creatorsBuilderResult.isErr()) {
		return err(databaseError(creatorsBuilderResult.error.message, "INVALID_DATA"));
	}

	// Set Price
	const priceResult = WorkPrice.create(data.prices?.price ?? 0, data.prices?.currency);
	if (priceResult.isErr()) {
		return err(databaseError(priceResult.error.message, "INVALID_DATA"));
	}
	const priceBuilderResult = creatorsBuilderResult.value.withPrice(priceResult.value);
	if (priceBuilderResult.isErr()) {
		return err(databaseError(priceBuilderResult.error.message, "INVALID_DATA"));
	}

	// Set Rating
	const ratingResult = WorkRating.create(
		data.rating?.stars ?? 0,
		data.rating?.count ?? 0,
		data.rating?.average ?? data.rating?.stars ?? 0,
		data.rating?.reviewCount,
		data.rating?.distribution,
	);
	if (ratingResult.isErr()) {
		return err(databaseError(ratingResult.error.message, "INVALID_DATA"));
	}
	const ratingBuilderResult = priceBuilderResult.value.withRating(ratingResult.value);
	if (ratingBuilderResult.isErr()) {
		return err(databaseError(ratingBuilderResult.error.message, "INVALID_DATA"));
	}

	return ratingBuilderResult;
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
	if (salesStatusResult.isErr()) {
		return err(databaseError(salesStatusResult.error.message, "INVALID_DATA"));
	}

	// Set Series Info
	const seriesInfo = createSeriesInfo(data);
	const seriesResult = salesStatusResult.value.withSeriesInfo(seriesInfo);
	if (seriesResult.isErr()) {
		return err(databaseError(seriesResult.error.message, "INVALID_DATA"));
	}

	// Set Extended Info
	const extendedInfo = createExtendedInfo(data);
	const extendedResult = seriesResult.value.withExtendedInfo(extendedInfo);
	if (extendedResult.isErr()) {
		return err(databaseError(extendedResult.error.message, "INVALID_DATA"));
	}

	// Set Metadata
	const metadata = createMetadata(data);
	const metadataResult = extendedResult.value.withMetadata(metadata);
	if (metadataResult.isErr()) {
		return err(databaseError(metadataResult.error.message, "INVALID_DATA"));
	}

	return metadataResult;
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
			return validationResult as Result<Work, DatabaseError>;
		}

		const builder = WorkBuilder.create();

		// Set basic properties
		const basicResult = setBasicProperties(builder, data);
		if (basicResult.isErr()) {
			return basicResult as Result<Work, DatabaseError>;
		}

		// Set creators and financials
		const creatorsResult = setCreatorsAndFinancials(basicResult.value, data);
		if (creatorsResult.isErr()) {
			return creatorsResult as Result<Work, DatabaseError>;
		}

		// Set additional properties
		const additionalResult = setAdditionalProperties(creatorsResult.value, data);
		if (additionalResult.isErr()) {
			return additionalResult as Result<Work, DatabaseError>;
		}

		// Build the Work entity
		return additionalResult.value.build();
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
		saleDate: parseDate(data.salesStatus?.saleDate),
		preSaleDate: parseDate(data.salesStatus?.preSaleDate),
		isOnSale: data.salesStatus?.isOnSale ?? true,
		isSoldOut: data.salesStatus?.isSoldOut ?? false,
		salesCount: data.salesStatus?.salesCount,
		wishlistCount: data.salesStatus?.wishlistCount,
		dlsiteExclusive: data.salesStatus?.dlsiteExclusive ?? false,
		dlsitePlayWork: data.salesStatus?.dlsiteplayWork ?? false,
		retailPrice: data.prices?.retailPrice,
		discountRate: data.prices?.discountRate,
		discountEndDate: parseDate(data.prices?.discountEndDate),
		pointRate: data.prices?.pointRate,
		grantPointDate: parseDate(data.prices?.grantPointDate),
		fanzaExclusive: data.salesStatus?.fanzaExclusive ?? false,
		isHidden: data.salesStatus?.isHidden ?? false,
		affiliateAllowed: data.salesStatus?.affiliateAllowed ?? true,
		downloads: data.salesStatus?.downloads,
		monthlyDownloads: data.salesStatus?.monthlyDownloads,
		weeklyDownloads: data.salesStatus?.weeklyDownloads,
		lastModified: parseDate(data.modifiedDate ?? data.updatedAt),
	};
}

/**
 * Creates WorkSeriesInfo from Firestore data
 */
function createSeriesInfo(data: WorkDocument): WorkSeriesInfo | undefined {
	if (!data.series?.id) return undefined;

	return {
		id: data.series.id,
		name: data.series.name ?? "",
		// TODO: Implement ordering logic
		order: 0,
		nextWorkId: undefined,
		previousWorkId: undefined,
	};
}

/**
 * Creates basic extended info properties
 */
function createBasicExtendedInfo(data: WorkDocument) {
	return {
		tags: data.tags ?? [],
		genres: data.genres ?? [],
		categories: data.categories ?? [],
		ageRating: data.ageRating ?? "all-ages",
		language: data.language ?? "ja-jp",
		workType: data.workType ?? "other",
		format: data.format ?? "other",
		fileSize: data.fileSize,
		productFormats: data.productFormats ?? [],
		imageUrls: {
			main: data.imageUrls?.main ?? "",
			thumbnail: data.imageUrls?.thumbnail,
			samples: data.imageUrls?.samples ?? [],
		},
		description: data.description ?? "",
		shortDescription: data.shortDescription,
		catchCopy: data.catchCopy,
		announcement: data.announcement,
		upgradeInformation: data.upgradeInformation,
		keywords: data.keywords ?? [],
		affiliateInfo: data.affiliateInfo,
		specialCategories: data.specialCategories ?? [],
	};
}

/**
 * Creates user-related flags
 */
function createUserFlags(data: WorkDocument) {
	return {
		isPurchased: data.isPurchased ?? false,
		isFavorite: data.isFavorite ?? false,
		isWishlisted: data.isWishlisted ?? false,
	};
}

/**
 * Creates platform and feature flags
 */
function createFeatureFlags(data: WorkDocument) {
	return {
		isRanking: data.isRanking ?? false,
		isDiscounted: data.isDiscounted ?? false,
		isNew: data.isNew ?? false,
		isBrowserOnly: data.isBrowserOnly ?? false,
		isPc: data.isPc ?? false,
		isAndroidApp: data.isAndroidApp ?? false,
		isIosApp: data.isIosApp ?? false,
		isExclusive: data.isExclusive ?? false,
		isBulkOnly: data.isBulkOnly ?? false,
		isLimitedEdition: data.isLimitedEdition ?? false,
		isTrialAvailable: data.isTrialAvailable ?? false,
		hasCoupon: data.hasCoupon ?? false,
		isTranslated: data.isTranslated ?? false,
	};
}

/**
 * Creates additional extended info properties
 */
function createAdditionalExtendedInfo(data: WorkDocument) {
	return {
		translationType: data.translationType,
		supportedLanguages: data.supportedLanguages ?? [],
		lastWatchedDate: parseDate(data.lastWatchedDate),
		lastDownloadedDate: parseDate(data.lastDownloadedDate),
		lastUpdatedDate: parseDate(data.lastUpdatedDate),
		cienUrl: data.cienUrl,
		dlAffiliateUrl: data.dlAffiliateUrl,
		fanzaAffiliateUrl: data.fanzaAffiliateUrl,
		productPageUrl: data.productPageUrl,
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
	};
}

/**
 * Creates WorkMetadata from Firestore data
 */
function createMetadata(data: WorkDocument): WorkMetadata {
	return {
		version: 1,
		dataSource: "firestore",
		lastIndexedAt: parseDate(data.lastIndexedAt),
		registrationDate: parseDate(data.createdAt),
		lastModifiedDate: parseDate(data.updatedAt),
		createdAt: parseDate(data.createdAt),
		updatedAt: parseDate(data.updatedAt),
		reviewedAt: undefined,
		indexedAt: parseDate(data.indexedAt),
		revisionNumber: 1,
		schemaVersion: "1.0.0",
		isDeleted: false,
		deletedAt: undefined,
		dataQuality: "low",
		hasHighResolutionImages: false,
		hasDetailedCreators: !!data.creators,
		hasStructuredData: true,
		hasCompleteInformation: false,
		hasPriceHistory: false,
		hasReviewData: !!data.rating,
		hasSalesData: !!data.salesStatus,
		hasDownloadData: false,
		hasAffiliateData: false,
		dlsiteplaySupported: data.salesStatus?.dlsiteplayWork ?? false,
	};
}

// Legacy exports for backward compatibility
export const WorkFactory = {
	fromFirestoreData: createWorkFromFirestoreData,
	fromPlainObject: createWorkFromPlainObject,
};
