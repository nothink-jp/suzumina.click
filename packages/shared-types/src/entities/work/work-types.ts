/**
 * Work Types
 *
 * Type definitions for DLsite work data structures.
 * Extracted from Zod schemas for better organization.
 */

import type { z } from "zod";
import type {
	CampaignInfoSchema,
	CreatorsSchema,
	DataSourceTrackingSchema,
	IndividualAPICreatorSchema,
	IndividualAPICustomGenreSchema,
	IndividualAPIEditionSchema,
	IndividualAPIGenreSchema,
	IndividualAPIImageSchema,
	IndividualAPIWorkOptionSchema,
	LanguageDownloadSchema,
	LocalePriceSchema,
	PriceInfoSchema,
	RankingInfoSchema,
	RatingDetailSchema,
	RatingInfoSchema,
	SalesStatusSchema,
	SampleImageSchema,
	SeriesInfoSchema,
	TranslationInfoSchema,
	WorkCategorySchema,
	WorkLanguageSchema,
	WorkPaginationParamsSchema,
} from "./work-schemas";

// Type extraction from Zod schemas
export type WorkCategory = z.infer<typeof WorkCategorySchema>;
export type WorkLanguage = z.infer<typeof WorkLanguageSchema>;
export type PriceInfo = z.infer<typeof PriceInfoSchema>;
export type RatingInfo = z.infer<typeof RatingInfoSchema>;
export type RatingDetail = z.infer<typeof RatingDetailSchema>;
export type SampleImage = z.infer<typeof SampleImageSchema>;
export type IndividualAPICreator = z.infer<typeof IndividualAPICreatorSchema>;
export type Creators = z.infer<typeof CreatorsSchema>;
export type IndividualAPIImage = z.infer<typeof IndividualAPIImageSchema>;
export type IndividualAPIGenre = z.infer<typeof IndividualAPIGenreSchema>;
export type IndividualAPICustomGenre = z.infer<typeof IndividualAPICustomGenreSchema>;
export type IndividualAPIWorkOption = z.infer<typeof IndividualAPIWorkOptionSchema>;
export type IndividualAPIEdition = z.infer<typeof IndividualAPIEditionSchema>;
export type RankingInfo = z.infer<typeof RankingInfoSchema>;
export type LocalePrice = z.infer<typeof LocalePriceSchema>;
export type CampaignInfo = z.infer<typeof CampaignInfoSchema>;
export type SeriesInfo = z.infer<typeof SeriesInfoSchema>;
export type TranslationInfo = z.infer<typeof TranslationInfoSchema>;
export type LanguageDownload = z.infer<typeof LanguageDownloadSchema>;
export type SalesStatus = z.infer<typeof SalesStatusSchema>;
export type DataSourceTracking = z.infer<typeof DataSourceTrackingSchema>;
export type WorkPaginationParams = z.infer<typeof WorkPaginationParamsSchema>;

// FirestoreServerWorkData has been removed
// Use WorkDocument from work-document-schema.ts instead
// WorkDocument is the canonical type for Firestore documents
