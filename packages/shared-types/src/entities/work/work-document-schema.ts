/**
 * Work Document Schema
 *
 * Complete Firestore document schema for DLsite works.
 * Separated for better maintainability.
 */

import { z } from "zod";
import {
	CreatorsSchema,
	DataSourceTrackingSchema,
	LanguageDownloadSchema,
	PriceInfoSchema,
	RatingInfoSchema,
	SalesStatusSchema,
	TranslationInfoSchema,
	WorkCategorySchema,
} from "./work-schemas";

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
	/** 特殊ファイルタイプ - Individual Info API `file_type_special`（API が null を返し、そのまま保存されている） */
	fileTypeSpecial: z.string().nullish(),
	/** ファイルサイズ - Individual Info API `file_size`（API が null を返し、そのまま保存されている） */
	fileSize: z.number().nullish(),

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
export type WorkDocument = z.infer<typeof WorkDocumentSchema>;
