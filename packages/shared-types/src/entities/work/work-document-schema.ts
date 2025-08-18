/**
 * Work Document Schema
 *
 * Complete Firestore document schema for DLsite works.
 * Separated for better maintainability.
 */

import { z } from "zod";
import { AggregatedCharacteristicsSchema } from "../user-evaluation";
import {
	CampaignInfoSchema,
	CreatorsSchema,
	DataSourceTrackingSchema,
	IndividualAPICustomGenreSchema,
	IndividualAPIEditionSchema,
	IndividualAPIImageSchema,
	IndividualAPIWorkOptionSchema,
	LanguageDownloadSchema,
	LocalePriceSchema,
	PriceInfoSchema,
	RatingInfoSchema,
	SalesStatusSchema,
	SampleImageSchema,
	SeriesInfoSchema,
	TranslationInfoSchema,
	WorkCategorySchema,
} from "./work-schemas";

/**
 * 基本的なDLsite作品データのZodスキーマ定義
 * Individual Info API準拠フィールド重視の統一されたデータ構造
 */
export const DLsiteWorkBaseSchema = z.object({
	/** FirestoreドキュメントID */
	id: z.string().min(1, {
		message: "作品IDは1文字以上である必要があります",
	}),
	/** DLsite商品ID（RJ236867など） - Individual Info API `workno` */
	productId: z.string().min(1, {
		message: "商品IDは1文字以上である必要があります",
	}),
	/** 作品タイトル - Individual Info API `work_name` */
	title: z.string().min(1, {
		message: "作品タイトルは1文字以上である必要があります",
	}),
	/** サークル名 - Individual Info API `maker_name` */
	circle: z.string().min(1, {
		message: "サークル名は1文字以上である必要があります",
	}),
	/** サークルID - Individual Info API `circle_id` (例: "RG23954") */
	circleId: z.string().optional(),
	/** 作品説明 */
	description: z.string().default(""),
	/** 作品カテゴリ（フィルタリング用） */
	category: WorkCategorySchema,
	/** 元のカテゴリテキスト（表示用） */
	originalCategoryText: z.string().optional(),
	/** DLsite作品ページURL */
	workUrl: z.string().url({
		message: "作品URLは有効なURL形式である必要があります",
	}),
	/** サムネイル画像URL */
	thumbnailUrl: z.string().url({
		message: "サムネイルURLは有効なURL形式である必要があります",
	}),
	/** 高解像度ジャケット画像URL（詳細ページから取得） */
	highResImageUrl: z.string().url().optional(),
	/** 価格情報 */
	price: PriceInfoSchema,
	/** 評価情報 */
	rating: RatingInfoSchema.optional(),

	// === Individual Info API準拠クリエイター情報 ===
	/** クリエイター情報 - Individual Info API `creaters` オブジェクト */
	creaters: CreatorsSchema.optional(),

	// === Individual Info API準拠日付・メタデータ ===
	/** 登録日時 - Individual Info API `regist_date` */
	registDate: z.string().optional(),
	/** 更新日時 - Individual Info API `update_date` */
	updateDate: z.string().optional(),

	// === Individual Info API準拠評価・ランキング ===
	/** 平均評価 - Individual Info API `rate_average_star` (10-50スケール) */
	rateAverageStar: z.number().optional(),
	/** 評価詳細分布 - Individual Info API `rate_count_detail` */
	rateCountDetail: z.record(z.string(), z.number()).optional(),

	// === Individual Info API準拠ジャンル・タグ ===
	/** カスタムジャンル - Individual Info API `custom_genres` 配列 */
	customGenres: z.array(IndividualAPICustomGenreSchema).default([]),
	/** 作品オプション - Individual Info API `work_options` オブジェクト */
	workOptions: z.record(z.string(), IndividualAPIWorkOptionSchema).default({}),

	// === Individual Info API準拠シリーズ・翻訳情報 ===
	/** シリーズID - Individual Info API `series_id` */
	seriesId: z.string().optional(),
	/** シリーズ名 - Individual Info API `series_name` */
	seriesName: z.string().optional(),
	/** 翻訳情報 - Individual Info API `translation_info` */
	translationInfo: TranslationInfoSchema.optional(),

	// === Individual Info API準拠ファイル・技術情報 ===
	/** ファイル形式 - Individual Info API `file_type` */
	fileType: z.string().optional(),
	/** ファイル形式表示名 - Individual Info API `file_type_string` */
	fileTypeString: z.string().optional(),
	/** 特殊ファイル形式 - Individual Info API `file_type_special` */
	fileTypeSpecial: z.string().optional(),
	/** 作品オプション - Individual Info API `options` */
	options: z.string().optional(),
	/** 作品属性 - Individual Info API `work_attributes` */
	workAttributes: z.string().optional(),
	/** ファイル日付 - Individual Info API `file_date` */
	fileDate: z.string().optional(),
	/** ファイルサイズ - Individual Info API `file_size` */
	fileSize: z.number().optional(),

	// === Individual Info API準拠画像情報 ===
	/** メイン画像 - Individual Info API `image_main` */
	imageMain: IndividualAPIImageSchema.optional(),
	/** サムネイル画像 - Individual Info API `image_thum` */
	imageThumb: IndividualAPIImageSchema.optional(),
	/** ミニサムネイル - Individual Info API `image_thum_mini` */
	imageThumbMini: IndividualAPIImageSchema.optional(),
	/** サンプル画像群 - Individual Info API `image_samples` */
	imageSamples: z.array(IndividualAPIImageSchema).default([]),
	/** サンプル画像 */
	sampleImages: z.array(SampleImageSchema).default([]),

	// === Individual Info API準拠販売・価格情報 ===
	/** 販売状態 - Individual Info API `on_sale` */
	onSale: z.number().int().min(0).max(1).optional(),
	/** 割引対象 - Individual Info API `is_discount_work` */
	isDiscountWork: z.boolean().optional(),
	/** キャンペーンID - Individual Info API `campaign_id` */
	campaignId: z.number().int().optional(),
	/** キャンペーン開始日 - Individual Info API `campaign_start_date` */
	campaignStartDate: z.string().optional(),
	/** キャンペーン終了日 - Individual Info API `campaign_end_date` */
	campaignEndDate: z.string().optional(),
	/** ポイント - Individual Info API `point` */
	point: z.number().int().nonnegative().optional(),
	/** 基本ポイント率 - Individual Info API `default_point` */
	defaultPoint: z.number().int().min(0).max(100).optional(),

	// === Individual Info API準拠年齢制限情報 ===
	/** 年齢カテゴリ（数値） - Individual Info API `age_category` */
	ageCategory: z.number().int().optional(),
	/** 年齢カテゴリ名 - Individual Info API `age_category_string` */
	ageCategoryString: z.string().optional(),

	// DLsite infoエンドポイントから取得される追加データ
	/** メーカーID - Individual Info API `maker_id` */
	makerId: z.string().optional(),
	// === Individual Info API準拠ランキング情報 ===
	/** 日間ランキング - Individual Info API `rank_day` */
	rankDay: z.number().optional(),
	/** 日間ランキング日付 - Individual Info API `rank_day_date` */
	rankDayDate: z.string().optional(),
	/** 週間ランキング - Individual Info API `rank_week` */
	rankWeek: z.number().optional(),
	/** 週間ランキング日付 - Individual Info API `rank_week_date` */
	rankWeekDate: z.string().optional(),
	/** 月間ランキング - Individual Info API `rank_month` */
	rankMonth: z.number().optional(),
	/** 月間ランキング日付 - Individual Info API `rank_month_date` */
	rankMonthDate: z.string().optional(),
	/** 年間ランキング - Individual Info API `rank_year` */
	rankYear: z.number().optional(),
	/** 年間ランキング日付 - Individual Info API `rank_year_date` */
	rankYearDate: z.string().optional(),
	/** 総合ランキング - Individual Info API `rank_total` */
	rankTotal: z.number().optional(),
	/** 総合ランキング日付 - Individual Info API `rank_total_date` */
	rankTotalDate: z.string().optional(),

	// === Individual Info API準拠プラットフォーム情報 ===
	/** 対応プラットフォーム - Individual Info API `platform` */
	platform: z.array(z.string()).default([]),
	/** PC対応 - Individual Info API `is_pc_work` */
	isPcWork: z.boolean().optional(),
	/** スマートフォン対応 - Individual Info API `is_smartphone_work` */
	isSmartphoneWork: z.boolean().optional(),
	/** Android専用 - Individual Info API `is_android_only_work` */
	isAndroidOnlyWork: z.boolean().optional(),
	/** iOS専用 - Individual Info API `is_ios_only_work` */
	isIosOnlyWork: z.boolean().optional(),
	/** DLsitePlay対応 - Individual Info API `is_dlsiteplay_work` */
	isDlsiteplayWork: z.boolean().optional(),
	/** DLsitePlay専用 - Individual Info API `is_dlsiteplay_only_work` */
	isDlsiteplayOnlyWork: z.boolean().optional(),

	// === Individual Info API準拠エディション情報 ===
	/** エディション情報 - Individual Info API `editions` */
	editions: z.array(IndividualAPIEditionSchema).default([]),
	/** 集計された特性評価 */
	aggregatedCharacteristics: AggregatedCharacteristicsSchema.optional(),
	/** 多通貨価格情報 */
	localePrices: z.array(LocalePriceSchema).optional(),
	/** キャンペーン情報 */
	campaignInfo: CampaignInfoSchema.optional(),
	/** シリーズ情報 */
	seriesInfo: SeriesInfoSchema.optional(),
	/** 言語別ダウンロード情報 */
	languageDownloads: z.array(LanguageDownloadSchema).optional(),
	/** 販売状態フラグ */
	salesStatus: SalesStatusSchema.optional(),
	/** ポイント還元率 */
	defaultPointRate: z.number().int().min(0).max(100).optional(),
});

/**
 * WorkDocumentスキーマ定義 - Firestoreドキュメント用
 *
 * Firestore上の作品ドキュメントの完全な型定義
 * FIRESTORE_STRUCTURE.md準拠の構造
 * @since 2025-07-27
 */
export const WorkDocumentSchema = z.object({
	// === 基本識別情報 ===
	/** FirestoreドキュメントID */
	id: z.string(),
	/** DLsite商品ID - Individual Info API `workno` / `product_id` */
	productId: z.string(),
	/** 基本商品ID - Individual Info API `base_product_id` */
	baseProductId: z.string().optional(),

	// === 基本作品情報 ===
	/** 作品タイトル - Individual Info API `work_name` */
	title: z.string().min(1),
	/** マスク済みタイトル - Individual Info API `work_name_masked` */
	titleMasked: z.string().optional(),
	/** タイトル読み - Individual Info API `work_name_kana` */
	titleKana: z.string().optional(),
	/** 代替名 - Individual Info API `alt_name` */
	altName: z.string().optional(),
	/** サークル名 - Individual Info API `maker_name` */
	circle: z.string().min(1),
	/** サークルID - Individual Info API `maker_id` */
	circleId: z.string().optional(),
	/** 英語サークル名 - Individual Info API `maker_name_en` */
	circleEn: z.string().optional(),
	/** 作品説明 - Individual Info API `intro_s` */
	description: z.string(),
	/** 作品タイプ - Individual Info API `work_type` */
	workType: z.string().optional(),
	/** 作品タイプ名 - Individual Info API `work_type_string` */
	workTypeString: z.string().optional(),
	/** 作品カテゴリ - Individual Info API `work_category` */
	workCategory: z.string().optional(),
	/** 作品カテゴリ（フィルタリング用） */
	category: WorkCategorySchema,
	/** 元のカテゴリテキスト（表示用） */
	originalCategoryText: z.string().optional(),
	/** DLsite作品ページURL */
	workUrl: z.string(),
	/** サムネイル画像 */
	thumbnailUrl: z.string(),
	/** 高解像度画像（詳細ページから取得） */
	highResImageUrl: z.string().optional(),

	// === 価格・評価情報（統合済み） ===
	/** 統合価格情報 */
	price: PriceInfoSchema,
	/** 統合評価情報 */
	rating: RatingInfoSchema.optional(),

	// === クリエイター情報 ===
	/** クリエイター情報 - DLsite API の `creaters` を正規化した `creators` */
	creators: CreatorsSchema.optional(),

	// === ジャンル情報 ===
	/** DLsite公式ジャンル（Individual Info APIから取得） */
	genres: z.array(z.string()).default([]),
	/** カスタムジャンル */
	customGenres: z
		.array(
			z.object({
				genre_key: z.string(),
				name: z.string(),
				name_en: z.string().optional(),
				display_order: z.number().optional(),
			}),
		)
		.default([]),

	// === Individual Info API準拠日付情報 ===
	/** 登録日時 - Individual Info API `regist_date` */
	registDate: z.string().optional(),
	/** 更新日時 - Individual Info API `update_date` */
	updateDate: z.string().optional(),
	/** 変更フラグ - Individual Info API `modify_flg` */
	modifyFlag: z.number().int().optional(),

	// === 下位互換用日付情報（レガシー） ===
	/** 販売日（元の文字列） */
	releaseDate: z.string().optional(),
	/** ソート用ISO日付（YYYY-MM-DD） */
	releaseDateISO: z.string().optional(),
	/** 表示用日本語日付（2023年03月05日） */
	releaseDateDisplay: z.string().optional(),

	// === 拡張メタデータ ===
	/** シリーズID */
	seriesId: z.string().optional(),
	/** シリーズ名 */
	seriesName: z.string().optional(),
	/** 年齢制限 */
	ageRating: z.string().optional(),
	/** 年齢カテゴリ（数値） */
	ageCategory: z.number().optional(),
	/** 年齢カテゴリ文字列 */
	ageCategoryString: z.string().optional(),
	/** 作品形式 */
	workFormat: z.string().optional(),
	/** ファイル形式 */
	fileFormat: z.string().optional(),
	/** ファイルタイプ - Individual Info API `file_type` */
	fileType: z.string().optional(),
	/** ファイルタイプ表示名 - Individual Info API `file_type_string` */
	fileTypeString: z.string().optional(),
	/** 特殊ファイルタイプ - Individual Info API `file_type_special` */
	fileTypeSpecial: z.string().optional(),
	/** ファイルサイズ - Individual Info API `file_size` */
	fileSize: z.number().optional(),

	/** サンプル画像 */
	sampleImages: z
		.array(
			z.object({
				thumb: z.string(),
				width: z.number().optional(),
				height: z.number().optional(),
			}),
		)
		.default([]),

	// === 言語・翻訳情報 ===
	/** 翻訳情報 */
	translationInfo: TranslationInfoSchema.optional(),
	/** 言語別ダウンロード情報 */
	languageDownloads: z.array(LanguageDownloadSchema).optional(),

	// === 販売状態情報 ===
	/** 販売状態フラグ */
	salesStatus: SalesStatusSchema.optional(),

	// === 統合データソース追跡 ===
	/** データソース別追跡情報 */
	dataSources: DataSourceTrackingSchema.optional(),

	// === システム管理情報 ===
	/** 最終取得日時 */
	lastFetchedAt: z.string().datetime(),
	/** 作成日時 */
	createdAt: z.string().datetime(),
	/** 更新日時 */
	updatedAt: z.string().datetime(),
});

/**
 * Type definitions extracted from schemas
 */
export type DLsiteWorkBase = z.infer<typeof DLsiteWorkBaseSchema>;
export type WorkDocument = z.infer<typeof WorkDocumentSchema>;
