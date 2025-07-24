import { z } from "zod";
import { AggregatedCharacteristicsSchema } from "./user-evaluation";

/**
 * DLsite作品カテゴリの型定義
 * HTMLから抽出される作品種別に対応
 */
export const WorkCategorySchema = z.enum([
	"ADV", // アドベンチャー
	"SOU", // ボイス・ASMR
	"RPG", // ロールプレイング
	"MOV", // 動画
	"MNG", // マンガ
	"GAM", // ゲーム
	"CG", // CG・イラスト
	"TOL", // ツール・アクセサリ
	"ET3", // その他・3D
	"SLN", // シミュレーション
	"ACN", // アクション
	"PZL", // パズル
	"QIZ", // クイズ
	"TBL", // テーブル
	"DGT", // デジタルノベル
	"etc", // その他
]);

/**
 * DLsite作品カテゴリコードから日本語表示名へのマッピング
 */
export const WORK_CATEGORY_DISPLAY_NAMES: Record<WorkCategory, string> = {
	ADV: "アドベンチャー",
	SOU: "ボイス・ASMR",
	RPG: "ロールプレイング",
	MOV: "動画",
	MNG: "マンガ",
	GAM: "ゲーム",
	CG: "CG・イラスト",
	TOL: "ツール・アクセサリ",
	ET3: "その他・3D",
	SLN: "シミュレーション",
	ACN: "アクション",
	PZL: "パズル",
	QIZ: "クイズ",
	TBL: "テーブル",
	DGT: "デジタルノベル",
	etc: "その他",
} as const;

/**
 * DLsite作品言語の型定義
 * DLsiteで対応されている言語コードに対応
 */
export const WorkLanguageSchema = z.enum([
	"ja", // 日本語
	"en", // 英語
	"zh-cn", // 簡体中文
	"zh-tw", // 繁體中文
	"ko", // 한국어
	"es", // スペイン語
	"not-required", // 言語不要
	"dlsite-official", // DLsite公式
	"other", // その他言語
]);

/**
 * DLsite作品言語コードから日本語表示名へのマッピング
 */
export const WORK_LANGUAGE_DISPLAY_NAMES: Record<WorkLanguage, string> = {
	ja: "日本語",
	en: "英語",
	"zh-cn": "简体中文",
	"zh-tw": "繁體中文",
	ko: "한국어",
	es: "Español",
	"not-required": "言語不要",
	"dlsite-official": "DLsite公式",
	other: "その他言語",
} as const;

/**
 * 価格情報のZodスキーマ定義
 */
export const PriceInfoSchema = z.object({
	/** 現在価格（円） */
	current: z.number().int().nonnegative(),
	/** 元の価格（セール時のみ）（円） */
	original: z.number().int().nonnegative().optional(),
	/** 通貨コード */
	currency: z.string().default("JPY"),
	/** 割引率（パーセント） */
	discount: z.number().int().min(0).max(100).optional(),
	/** ポイント */
	point: z.number().int().nonnegative().optional(),
	/** 無料作品・価格取得失敗フラグ */
	isFreeOrMissingPrice: z.boolean().optional(),
});

/**
 * 評価詳細情報のZodスキーマ定義
 */
export const RatingDetailSchema = z.object({
	/** 評価ポイント（1-5星） */
	review_point: z.number().int().min(1).max(5),
	/** 該当件数 */
	count: z.number().int().nonnegative(),
	/** 割合（パーセント） */
	ratio: z.number().int().min(0).max(100),
});

/**
 * 評価情報のZodスキーマ定義
 */
export const RatingInfoSchema = z.object({
	/** 星評価（1-5） */
	stars: z.number().min(0).max(5),
	/** 評価数 */
	count: z.number().int().nonnegative(),
	/** レビュー数 */
	reviewCount: z.number().int().nonnegative().optional(),
	/** 評価詳細分布 */
	ratingDetail: z.array(RatingDetailSchema).optional(),
	/** 小数点2桁の評価平均 */
	averageDecimal: z.number().min(0).max(5).optional(),
});

/**
 * サンプル画像情報のZodスキーマ定義
 */
export const SampleImageSchema = z.object({
	/** サムネイル画像URL */
	thumb: z.string().url(),
	/** 画像幅 */
	width: z.number().int().positive().optional(),
	/** 画像高さ */
	height: z.number().int().positive().optional(),
});

/**
 * ランキング情報のZodスキーマ定義
 */
export const RankingInfoSchema = z.object({
	/** 期間（day/week/month/year/total） */
	term: z.enum(["day", "week", "month", "year", "total"]),
	/** カテゴリ（all/voice等） */
	category: z.string(),
	/** 順位 */
	rank: z.number().int().positive(),
	/** ランキング日付 */
	rank_date: z.string(),
});

/**
 * 多通貨価格情報のZodスキーマ定義
 */
export const LocalePriceSchema = z.object({
	/** 通貨コード */
	currency: z.string(),
	/** 価格 */
	price: z.number().nonnegative(),
	/** 表示用価格文字列 */
	priceString: z.string(),
});

/**
 * キャンペーン情報のZodスキーマ定義
 */
export const CampaignInfoSchema = z.object({
	/** キャンペーンID */
	campaignId: z.string().optional(),
	/** 割引キャンペーンID */
	discountCampaignId: z.number().int().optional(),
	/** 割引終了日 */
	discountEndDate: z.string().optional(),
	/** 割引ページURL */
	discountUrl: z.string().url().optional(),
});

/**
 * シリーズ情報のZodスキーマ定義
 */
export const SeriesInfoSchema = z.object({
	/** シリーズID */
	titleId: z.string().optional(),
	/** シリーズ名 */
	titleName: z.string().optional(),
	/** シリーズ作品数 */
	titleWorkCount: z.number().int().nonnegative().optional(),
	/** シリーズ完結フラグ */
	isTitleCompleted: z.boolean().optional(),
});

/**
 * 翻訳情報のZodスキーマ定義
 */
export const TranslationInfoSchema = z.object({
	/** 翻訳許可フラグ */
	isTranslationAgree: z.boolean().optional(),
	/** ボランティア翻訳フラグ */
	isVolunteer: z.boolean().optional(),
	/** オリジナル作品フラグ */
	isOriginal: z.boolean().optional(),
	/** 親作品フラグ */
	isParent: z.boolean().optional(),
	/** 子作品フラグ */
	isChild: z.boolean().optional(),
	/** 原作作品番号 */
	originalWorkno: z.string().optional(),
	/** 親作品番号 */
	parentWorkno: z.string().optional(),
	/** 子作品番号リスト */
	childWorknos: z.array(z.string()).optional(),
	/** 言語 */
	lang: z.string().optional(),
	/** 翻訳報酬率 */
	productionTradePriceRate: z.number().int().min(0).max(100).optional(),
});

/**
 * 言語別ダウンロード情報のZodスキーマ定義
 */
export const LanguageDownloadSchema = z.object({
	/** 作品番号 */
	workno: z.string(),
	/** エディションID */
	editionId: z.number().int().optional(),
	/** エディションタイプ */
	editionType: z.string().optional(),
	/** 表示順 */
	displayOrder: z.number().int().optional(),
	/** 言語ラベル */
	label: z.string(),
	/** 言語コード */
	lang: z.string(),
	/** ダウンロード数 */
	dlCount: z.string(),
	/** 表示用ラベル */
	displayLabel: z.string(),
});

/**
 * DLsite販売状態フラグのZodスキーマ定義
 */
export const SalesStatusSchema = z.object({
	/** 販売中フラグ */
	isSale: z.boolean().optional(),
	/** セール中フラグ */
	onSale: z.number().int().min(0).max(1).optional(),
	/** 割引中フラグ */
	isDiscount: z.boolean().optional(),
	/** ポイントアップ中フラグ */
	isPointup: z.boolean().optional(),
	/** 無料フラグ */
	isFree: z.boolean().optional(),
	/** レンタルフラグ */
	isRental: z.boolean().optional(),
	/** 売り切れフラグ */
	isSoldOut: z.boolean().optional(),
	/** 予約作品フラグ */
	isReserveWork: z.boolean().optional(),
	/** 予約可能フラグ */
	isReservable: z.boolean().optional(),
	/** タイムセールフラグ */
	isTimesale: z.boolean().optional(),
	/** DLsite Play対応フラグ */
	dlsiteplayWork: z.boolean().optional(),
});

/**
 * Individual Info API準拠のクリエイター情報スキーマ定義
 */
export const IndividualAPICreatorSchema = z.object({
	/** ID付きクリエイター情報 */
	id: z.string().optional(),
	/** クリエイター名 */
	name: z.string(),
});

/**
 * Individual Info API準拠のクリエイター情報オブジェクト
 */
export const CreatorsSchema = z.object({
	/** 声優（CV）- Individual Info API `creaters.voice_by` */
	voice_by: z.array(IndividualAPICreatorSchema).default([]),
	/** シナリオ担当者 - Individual Info API `creaters.scenario_by` */
	scenario_by: z.array(IndividualAPICreatorSchema).default([]),
	/** イラスト担当者 - Individual Info API `creaters.illust_by` */
	illust_by: z.array(IndividualAPICreatorSchema).default([]),
	/** 音楽担当者 - Individual Info API `creaters.music_by` */
	music_by: z.array(IndividualAPICreatorSchema).default([]),
	/** その他制作者 - Individual Info API `creaters.others_by` */
	others_by: z.array(IndividualAPICreatorSchema).default([]),
	/** 制作担当者 - Individual Info API `creaters.created_by` */
	created_by: z.array(IndividualAPICreatorSchema).default([]),
});

/**
 * Individual Info API準拠の画像情報スキーマ定義
 */
export const IndividualAPIImageSchema = z.object({
	/** 作品番号 */
	workno: z.string().optional(),
	/** ファイルタイプ */
	type: z.string().optional(),
	/** ファイル名 */
	file_name: z.string().optional(),
	/** 画像URL */
	url: z.string().url().optional(),
	/** 画像幅 */
	width: z.number().int().positive().optional(),
	/** 画像高さ */
	height: z.number().int().positive().optional(),
});

/**
 * Individual Info API準拠のジャンル情報スキーマ定義
 */
export const IndividualAPIGenreSchema = z.object({
	/** ジャンル名 */
	name: z.string(),
	/** ジャンルID */
	id: z.number().int().optional(),
	/** 検索値 */
	search_val: z.string().optional(),
});

/**
 * Individual Info API準拠のカスタムジャンル情報スキーマ定義
 */
export const IndividualAPICustomGenreSchema = z.object({
	/** ジャンルキー */
	genre_key: z.string(),
	/** ジャンル名 */
	name: z.string(),
	/** 多言語名 */
	name_en: z.string().optional(),
	/** 表示順 */
	display_order: z.number().int().optional(),
});

/**
 * Individual Info API準拠の作品オプション情報スキーマ定義
 */
export const IndividualAPIWorkOptionSchema = z.object({
	/** オプション名 */
	name: z.string(),
	/** 英語オプション名 */
	name_en: z.string().optional(),
});

/**
 * Individual Info API準拠のエディション情報スキーマ定義
 */
export const IndividualAPIEditionSchema = z.object({
	/** 作品番号 */
	workno: z.string(),
	/** エディションID */
	edition_id: z.number().int().optional(),
	/** ラベル */
	label: z.string(),
	/** 表示順 */
	display_order: z.number().int().optional(),
});

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
 * データソース追跡情報のZodスキーマ定義
 */
export const DataSourceTrackingSchema = z.object({
	/** 検索結果データ */
	searchResult: z
		.object({
			lastFetched: z.string().datetime(),
			genres: z.array(z.string()).default([]),
			basicInfo: z.any().optional(),
		})
		.optional(),
	/** InfoAPIデータ */
	infoAPI: z
		.object({
			lastFetched: z.string().datetime(),
			customGenres: z.array(z.string()).default([]),
		})
		.optional(),
});

/**
 * 最適化されたFirestore DLsite作品データのZodスキーマ定義
 * FIRESTORE_STRUCTURE.md準拠の構造
 */
export const OptimizedFirestoreDLsiteWorkSchema = z.object({
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

	// === Individual Info API準拠クリエイター情報 ===
	/** クリエイター情報 - Individual Info API `creaters` オブジェクト */
	creaters: CreatorsSchema.optional(),

	// === 下位互換用統一クリエイター情報（レガシー） ===
	/** 声優（最優先データ） */
	voiceActors: z.array(z.string()).default([]),
	/** シナリオ */
	scenario: z.array(z.string()).default([]),
	/** イラスト */
	illustration: z.array(z.string()).default([]),
	/** 音楽 */
	music: z.array(z.string()).default([]),
	/** 作者（その他・声優と重複しない場合のみ） */
	author: z.array(z.string()).default([]),

	// === ジャンル情報 ===
	/** DLsite公式ジャンル（Individual Info APIから取得） */
	genres: z.array(z.string()).default([]),

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
	/** シリーズ名 */
	seriesName: z.string().optional(),
	/** 年齢制限 */
	ageRating: z.string().optional(),
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

// FirestoreDLsiteWorkSchemaは削除 - OptimizedFirestoreDLsiteWorkSchemaのみ使用

/**
 * フロントエンド表示用のDLsite作品データのZodスキーマ定義
 */
export const FrontendDLsiteWorkSchema = OptimizedFirestoreDLsiteWorkSchema.extend({
	/** 表示用価格文字列 */
	displayPrice: z.string(),
	/** 割引表示テキスト */
	discountText: z.string().optional(),
	/** 評価表示テキスト */
	ratingText: z.string().optional(),
	/** ウィッシュリスト表示テキスト */
	wishlistText: z.string().optional(),
	/** 相対URL */
	relativeUrl: z.string(),
	/** ISO形式の日付文字列（フロントエンドでの使用のため） */
	createdAtISO: z.string().datetime(),
	lastFetchedAtISO: z.string().datetime(),
	updatedAtISO: z.string().datetime(),
});

/**
 * 作品リスト結果のZodスキーマ定義
 */
export const WorkListResultSchema = z.object({
	works: z.array(FrontendDLsiteWorkSchema),
	hasMore: z.boolean(),
	lastWork: FrontendDLsiteWorkSchema.optional(),
	totalCount: z.number().int().nonnegative().optional(),
	filteredCount: z.number().int().nonnegative().optional(),
});

/**
 * ページネーションパラメータのZodスキーマ定義
 */
export const WorkPaginationParamsSchema = z.object({
	limit: z.number().int().positive(),
	startAfter: z.string().optional(),
	author: z.string().optional(),
	category: WorkCategorySchema.optional(),
});

// Zodスキーマから型を抽出
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
export type DLsiteWorkBase = z.infer<typeof DLsiteWorkBaseSchema>;
// FirestoreDLsiteWorkData型は削除 - OptimizedFirestoreDLsiteWorkDataのみ使用
export type OptimizedFirestoreDLsiteWorkData = z.infer<typeof OptimizedFirestoreDLsiteWorkSchema>;
export type DataSourceTracking = z.infer<typeof DataSourceTrackingSchema>;
export type FrontendDLsiteWorkData = z.infer<typeof FrontendDLsiteWorkSchema>;
export type WorkListResult = z.infer<typeof WorkListResultSchema>;
export type WorkPaginationParams = z.infer<typeof WorkPaginationParamsSchema>;

/**
 * 日付最適化ユーティリティ関数
 * 日本語日付文字列をISO形式と表示形式に変換
 */
export function optimizeDateFormats(dateString: string): {
	original: string;
	iso?: string;
	display: string;
} {
	// "2023年03月05日" → { iso: "2023-03-05", display: "2023年03月05日" }
	const match = dateString.match(/(\d{4})年(\d{2})月(\d{2})日/);
	if (match) {
		const [, year, month, day] = match;
		return {
			original: dateString,
			iso: `${year}-${month}-${day}`,
			display: dateString,
		};
	}

	// ISO形式の場合 "2023-03-05" → 日本語形式に変換
	const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		const [, year, month, day] = isoMatch;
		return {
			original: dateString,
			iso: dateString,
			display: `${year}年${month}月${day}日`,
		};
	}

	return {
		original: dateString,
		display: dateString,
	};
}

/**
 * ファイルサイズ文字列をバイト数に変換
 */
export function parseSizeToBytes(sizeText?: string): number | undefined {
	if (!sizeText) return undefined;
	const match = sizeText.match(/([\d.]+)\s*(MB|GB|KB)/i);
	if (!match) return undefined;

	const [, num, unit] = match;
	if (!unit || !num) return undefined;
	const size = Number.parseFloat(num);

	switch (unit.toUpperCase()) {
		case "KB":
			return Math.round(size * 1024);
		case "MB":
			return Math.round(size * 1024 * 1024);
		case "GB":
			return Math.round(size * 1024 * 1024 * 1024);
		default:
			return undefined;
	}
}

// migrateFileInfo関数は削除 - OptimizedFirestoreDLsiteWorkDataのみ使用

// migrateToOptimizedStructure関数は削除 - OptimizedFirestoreDLsiteWorkDataのみ使用

/**
 * Firestoreデータをフロントエンド表示用に変換するヘルパー関数
 * @param data Firestoreから取得したデータ
 * @returns フロントエンド表示用に変換されたデータ
 */
/**
 * 表示用価格テキストを生成
 */
function generateDisplayPrice(price: OptimizedFirestoreDLsiteWorkData["price"]): string {
	return price.discount && price.original
		? `${price.current}円（元：${price.original}円）`
		: `${price.current}円`;
}

/**
 * 評価テキストを生成
 */
function generateRatingText(
	rating?: OptimizedFirestoreDLsiteWorkData["rating"],
): string | undefined {
	return rating ? `★${rating.stars.toFixed(1)} (${rating.count}件)` : undefined;
}

/**
 * エラー時のフォールバック用フロントエンドデータを生成
 */
function createFallbackFrontendWork(
	data: OptimizedFirestoreDLsiteWorkData,
): FrontendDLsiteWorkData {
	// 安全なデータ抽出
	const thumbnailUrl = extractImageUrl(data.thumbnailUrl);
	const highResImageUrl = extractImageUrl(data.highResImageUrl);
	const voiceActors = extractArrayField(data.voiceActors);
	const scenario = extractArrayField(data.scenario);
	const illustration = extractArrayField(data.illustration);
	const music = extractArrayField(data.music);
	const author = extractArrayField(data.author);
	const genres = extractArrayField(data.genres);

	const displayPrice = generateDisplayPrice(data.price);
	const discountText = data.price.discount ? `${data.price.discount}%OFF` : undefined;
	const ratingText = generateRatingText(data.rating);
	const relativeUrl = `/maniax/work/=/product_id/${data.productId}.html`;
	const ageRating = data.ageRating || undefined;

	return {
		id: data.id,
		productId: data.productId,
		title: data.title,
		circle: data.circle,
		description: data.description || "",
		category: data.category,
		workUrl: data.workUrl,
		thumbnailUrl, // 修正: 安全に抽出
		highResImageUrl, // 修正: 安全に抽出
		price: data.price,
		rating: data.rating,

		// 統一されたクリエイター情報
		voiceActors, // 修正: 安全に抽出
		scenario, // 修正: 安全に抽出
		illustration, // 修正: 安全に抽出
		music, // 修正: 安全に抽出
		author, // 修正: 安全に抽出

		// 統一された作品情報
		releaseDate: data.releaseDate,
		seriesName: data.seriesName,
		ageRating,
		workFormat: data.workFormat,
		fileFormat: data.fileFormat,
		genres, // 修正: 安全に抽出

		sampleImages: data.sampleImages || [],
		dataSources: data.dataSources,

		lastFetchedAt: data.lastFetchedAt,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,
		displayPrice,
		discountText,
		ratingText,
		wishlistText: undefined,
		relativeUrl,
		createdAtISO: data.createdAt,
		lastFetchedAtISO: data.lastFetchedAt,
		updatedAtISO: data.updatedAt,
	};
}

/**
 * Firestoreの画像URLフィールドから文字列を安全に抽出
 */
function extractImageUrl(imageField: unknown): string {
	if (typeof imageField === "string") {
		return imageField;
	}
	if (imageField && typeof imageField === "object" && "url" in imageField) {
		const obj = imageField as { url: unknown };
		if (typeof obj.url === "string") {
			return obj.url;
		}
	}
	return "";
}

/**
 * Firestoreの配列フィールドから安全に配列を抽出
 */
function extractArrayField(arrayField: unknown): string[] {
	if (Array.isArray(arrayField)) {
		return arrayField.filter((item) => typeof item === "string");
	}
	return [];
}

export function convertToFrontendWork(
	data: OptimizedFirestoreDLsiteWorkData,
): FrontendDLsiteWorkData {
	// 画像URLの安全な抽出
	const thumbnailUrl = extractImageUrl(data.thumbnailUrl);
	const highResImageUrl = extractImageUrl(data.highResImageUrl);

	// 配列フィールドの安全な抽出
	const voiceActors = extractArrayField(data.voiceActors);
	const scenario = extractArrayField(data.scenario);
	const illustration = extractArrayField(data.illustration);
	const music = extractArrayField(data.music);
	const author = extractArrayField(data.author);
	const genres = extractArrayField(data.genres);

	// 表示用テキストの生成
	const displayPrice = generateDisplayPrice(data.price);
	const discountText = data.price.discount ? `${data.price.discount}%OFF` : undefined;
	const ratingText = generateRatingText(data.rating);
	const relativeUrl = `/maniax/work/=/product_id/${data.productId}.html`;

	// 年齢レーティングの取得
	const ageRating = data.ageRating || undefined;

	// FrontendDLsiteWorkSchema形式のデータを生成
	const frontendData: FrontendDLsiteWorkData = {
		...data,
		// 修正されたフィールド
		thumbnailUrl,
		highResImageUrl,
		voiceActors,
		scenario,
		illustration,
		music,
		author,
		genres,
		ageRating, // 修正: データソースから取得した年齢レーティングを使用
		displayPrice,
		discountText,
		ratingText,
		relativeUrl,
		createdAtISO: data.createdAt,
		lastFetchedAtISO: data.lastFetchedAt,
		updatedAtISO: data.updatedAt,
	};

	// データの検証
	try {
		return FrontendDLsiteWorkSchema.parse(frontendData);
	} catch (_error) {
		// エラー時でも最低限のデータを返す
		return createFallbackFrontendWork(data);
	}
}

/**
 * RSCからRCCへ安全にデータを渡すためのシリアライズ関数
 * @param data フロントエンド表示用データ
 * @returns シリアライズされたデータ文字列
 */
export function serializeWorkForRSC(data: FrontendDLsiteWorkData): string {
	return JSON.stringify(data);
}

/**
 * RCCでのデシリアライズ関数
 * @param serialized シリアライズされたデータ文字列
 * @returns 検証済みのフロントエンド表示用データ
 */
export function deserializeWorkForRCC(serialized: string): FrontendDLsiteWorkData {
	try {
		const data = JSON.parse(serialized);
		return FrontendDLsiteWorkSchema.parse(data);
	} catch (_error) {
		throw new Error("データの形式が無効です");
	}
}

/**
 * 作品リスト結果のシリアライズ関数
 * @param result 作品リスト結果
 * @returns シリアライズされたリスト結果
 */
export function serializeWorkListResult(result: WorkListResult): string {
	return JSON.stringify(result);
}

/**
 * 作品リスト結果のデシリアライズ関数
 * @param serialized シリアライズされたリスト結果
 * @returns 検証済みの作品リスト結果
 */
export function deserializeWorkListResult(serialized: string): WorkListResult {
	try {
		const data = JSON.parse(serialized);
		return WorkListResultSchema.parse(data);
	} catch (_error) {
		return { works: [], hasMore: false };
	}
}

/**
 * Firestoreサーバーサイド（Cloud Functions）向けのデータ型定義
 * Timestampを使用するサーバーサイド向け
 */
export interface FirestoreServerDLsiteWorkData {
	/** FirestoreドキュメントID */
	id: string;
	/** DLsite商品ID */
	productId: string;
	/** 作品タイトル */
	title: string;
	/** サークル名 */
	circle: string;
	/** 声優名（複数の場合あり） */
	author?: string[];
	/** 作品説明 */
	description: string;
	/** 作品カテゴリ */
	category: WorkCategory;
	/** DLsite作品ページURL */
	workUrl: string;
	/** サムネイル画像URL */
	thumbnailUrl: string;
	/** 価格情報 */
	price: PriceInfo;
	/** 評価情報 */
	rating?: RatingInfo;
	/** 年齢制限 */
	ageRating?: string;
	/** 作品タグ */
	tags: string[];
	/** サンプル画像 */
	sampleImages: SampleImage[];

	// DLsite infoエンドポイントから取得される追加データ
	/** メーカーID */
	makerId?: string;
	/** 年齢カテゴリ（数値） */
	ageCategory?: number;
	/** 作品登録日 */
	registDate?: string;
	/** 作品オプション（音声/トライアル等） */
	options?: string;
	/** ランキング履歴 */
	rankingHistory?: RankingInfo[];
	/** 多通貨価格情報 */
	localePrices?: LocalePrice[];
	/** キャンペーン情報 */
	campaignInfo?: CampaignInfo;
	/** シリーズ情報 */
	seriesInfo?: SeriesInfo;
	/** 翻訳情報 */
	translationInfo?: TranslationInfo;
	/** 言語別ダウンロード情報 */
	languageDownloads?: LanguageDownload[];
	/** 販売状態フラグ */
	salesStatus?: SalesStatus;
	/** ポイント還元率 */
	defaultPointRate?: number;
	/** カスタムジャンル */
	customGenres?: string[];

	// Firestoreのサーバーサイドモデルではタイムスタンプを使用
	/** 最終取得日時（Firestore.Timestamp型） */
	lastFetchedAt: unknown; // Firestore.Timestamp型 (Firestore依存を避けるためunknown)
	/** 作成日時（Firestore.Timestamp型） */
	createdAt: unknown; // Firestore.Timestamp型
	/** 更新日時（Firestore.Timestamp型） */
	updatedAt: unknown; // Firestore.Timestamp型
}

/**
 * 作品カテゴリコードから日本語表示名を取得
 * @param category 作品カテゴリコード
 * @returns 日本語表示名
 */
export function getWorkCategoryDisplayName(category: WorkCategory): string {
	return WORK_CATEGORY_DISPLAY_NAMES[category];
}

/**
 * 作品カテゴリコードから日本語表示名を安全に取得
 * 不明なカテゴリの場合はカテゴリコードをそのまま返す
 * @param category 作品カテゴリコード（不明な値の可能性あり）
 * @returns 日本語表示名またはカテゴリコード
 */
export function getWorkCategoryDisplayNameSafe(category: string): string {
	// WorkCategoryに含まれているかチェック
	if (category in WORK_CATEGORY_DISPLAY_NAMES) {
		return WORK_CATEGORY_DISPLAY_NAMES[category as WorkCategory];
	}
	// 不明なカテゴリの場合はそのまま返す
	return category;
}

/**
 * 作品データから表示用カテゴリ名を取得
 * 元のカテゴリテキストが利用可能な場合はそれを優先し、なければマッピングを使用
 * @param work 作品データ
 * @returns 表示用カテゴリ名
 */
export function getWorkCategoryDisplayText(work: {
	category: WorkCategory;
	originalCategoryText?: string;
}): string {
	// 元のカテゴリテキストが存在する場合はそれを使用（表示優先）
	if (work.originalCategoryText && work.originalCategoryText.trim() !== "") {
		return work.originalCategoryText;
	}

	// フォールバック: マッピングテーブルから取得
	return getWorkCategoryDisplayName(work.category);
}

/**
 * 作品言語コードから日本語表示名を取得
 * @param language 作品言語コード
 * @returns 日本語表示名
 */
export function getWorkLanguageDisplayName(language: WorkLanguage): string {
	return WORK_LANGUAGE_DISPLAY_NAMES[language];
}

/**
 * 作品言語コードから日本語表示名を安全に取得
 * 不明な言語の場合は言語コードをそのまま返す
 * @param language 作品言語コード（不明な値の可能性あり）
 * @returns 日本語表示名または言語コード
 */
export function getWorkLanguageDisplayNameSafe(language: string): string {
	// WorkLanguageに含まれているかチェック
	if (language in WORK_LANGUAGE_DISPLAY_NAMES) {
		return WORK_LANGUAGE_DISPLAY_NAMES[language as WorkLanguage];
	}
	// 不明な言語の場合はそのまま返す
	return language;
}

/**
 * Individual Info API年齢カテゴリから日本語表示名を取得
 * @param ageCategory Individual Info API `age_category` (1=全年齢, 2=R-15, 3=成人向け)
 * @returns 日本語表示名
 */
export function getAgeCategoryDisplayName(ageCategory: number): string {
	const labels: Record<number, string> = {
		1: "全年齢",
		2: "R-15",
		3: "18禁",
	};
	return labels[ageCategory] || "不明";
}

/**
 * Individual Info API年齢カテゴリ文字列から日本語表示名を取得
 * @param ageCategoryString Individual Info API `age_category_string` ("general", "r15", "adult")
 * @returns 日本語表示名
 */
export function getAgeCategoryStringDisplayName(ageCategoryString: string): string {
	const labels: Record<string, string> = {
		general: "全年齢",
		r15: "R-15",
		adult: "18禁",
	};
	return labels[ageCategoryString] || "不明";
}

/**
 * タイトルから言語を判定
 */
function detectLanguageFromTitle(title: string): WorkLanguage | null {
	// 繁体中文版の判定
	if (title.includes("繁体中文版") || title.includes("繁體中文版")) {
		return "zh-tw";
	}

	// 簡体中文版の判定
	if (title.includes("簡体中文版") || title.includes("简体中文版")) {
		return "zh-cn";
	}

	// 英語版の判定
	if (title.includes("English") || title.includes("英語版") || title.includes("English Version")) {
		return "en";
	}

	// 韓国語版の判定
	if (title.includes("한국어") || title.includes("韓国語版") || title.includes("Korean")) {
		return "ko";
	}

	// スペイン語版の判定
	if (title.includes("Español") || title.includes("Spanish") || title.includes("スペイン語版")) {
		return "es";
	}

	return null;
}

/**
 * languageDownloadsから言語を判定
 */
function detectLanguageFromDownloads(work: OptimizedFirestoreDLsiteWorkData): WorkLanguage | null {
	if (!work.languageDownloads || work.languageDownloads.length === 0) {
		return null;
	}

	// 現在の作品のworknoまたはproductIdに対応する言語情報を探す
	const currentWorkId = work.productId || work.id;
	const matchingLanguage = work.languageDownloads.find(
		(langDownload) => langDownload.workno === currentWorkId,
	);

	// 対応する言語が見つからない場合は最初の要素を使用（後方互換性）
	const targetLanguage = matchingLanguage || work.languageDownloads[0];
	if (!targetLanguage) {
		return null;
	}

	const primaryLangCode = targetLanguage.lang.toLowerCase();

	// DLsiteの言語コードをWorkLanguageに変換
	switch (primaryLangCode) {
		case "ja":
		case "japanese":
		case "jpn":
			return "ja";
		case "en":
		case "english":
		case "eng":
			return "en";
		case "zh-cn":
		case "zh_cn":
		case "chinese_simplified":
		case "chs":
		case "chi_hans":
			return "zh-cn";
		case "zh-tw":
		case "zh_tw":
		case "chinese_traditional":
		case "cht":
		case "chi_hant":
			return "zh-tw";
		case "ko":
		case "korean":
		case "kor":
		case "ko_kr":
			return "ko";
		case "es":
		case "spanish":
		case "spa":
			return "es";
		default:
			// 認識できない言語の場合はotherとして扱う
			return "other";
	}
}

/**
 * translationInfoから言語を判定
 */
function detectLanguageFromTranslation(
	work: OptimizedFirestoreDLsiteWorkData,
): WorkLanguage | null {
	if (!work.translationInfo) {
		return null;
	}

	// オリジナル作品であれば通常は日本語
	if (work.translationInfo.isOriginal) {
		return "ja";
	}
	// 翻訳作品の場合の言語判定はここに追加可能
	return null;
}

/**
 * ジャンルから言語を判定
 */
function detectLanguageFromGenres(work: OptimizedFirestoreDLsiteWorkData): WorkLanguage | null {
	const allGenres = [...(work.genres || [])];

	// 英語作品の判定
	if (
		allGenres.some(
			(genre) =>
				genre.includes("英語") || genre.includes("english") || genre.toLowerCase().includes("en"),
		)
	) {
		return "en";
	}

	// 中国語作品の判定
	if (
		allGenres.some(
			(genre) =>
				genre.includes("中文") ||
				genre.includes("繁體") ||
				genre.includes("簡體") ||
				genre.includes("chinese") ||
				genre.toLowerCase().includes("zh"),
		)
	) {
		// 繁体字・簡体字の区別
		if (allGenres.some((genre) => genre.includes("繁體") || genre.includes("traditional"))) {
			return "zh-tw";
		}
		return "zh-cn";
	}

	// 韓国語作品の判定
	if (
		allGenres.some(
			(genre) =>
				genre.includes("한국어") || genre.includes("korean") || genre.toLowerCase().includes("ko"),
		)
	) {
		return "ko";
	}

	// スペイン語作品の判定
	if (
		allGenres.some(
			(genre) =>
				genre.includes("spanish") ||
				genre.includes("español") ||
				genre.toLowerCase().includes("es"),
		)
	) {
		return "es";
	}

	return null;
}

/**
 * 作品のプライマリ言語を取得
 * @param work 作品データ
 * @returns プライマリ言語コード
 */
export function getWorkPrimaryLanguage(work: OptimizedFirestoreDLsiteWorkData): WorkLanguage {
	const title = work.title || "";

	// 1. タイトルから言語判定（最優先）
	const titleLanguage = detectLanguageFromTitle(title);
	if (titleLanguage) {
		return titleLanguage;
	}

	// 2. languageDownloads から言語を取得（2番目の優先度）
	const downloadLanguage = detectLanguageFromDownloads(work);
	if (downloadLanguage) {
		return downloadLanguage;
	}

	// 3. translationInfo から言語を推定（3番目の優先度）
	const translationLanguage = detectLanguageFromTranslation(work);
	if (translationLanguage) {
		return translationLanguage;
	}

	// 4. フォールバック: ジャンルから言語を推定
	const genreLanguage = detectLanguageFromGenres(work);
	if (genreLanguage) {
		return genreLanguage;
	}

	// 5. 最終フォールバック: 日本語（デフォルト）
	return "ja";
}

/**
 * 作品で利用可能な全言語を取得
 * @param work 作品データ
 * @returns 利用可能な言語コードの配列
 */
export function getWorkAvailableLanguages(work: OptimizedFirestoreDLsiteWorkData): WorkLanguage[] {
	const languages: Set<WorkLanguage> = new Set();

	// プライマリ言語を追加
	const primaryLang = getWorkPrimaryLanguage(work);
	languages.add(primaryLang);

	// languageDownloads から利用可能な言語を追加
	if (work.languageDownloads && work.languageDownloads.length > 0) {
		for (const langDownload of work.languageDownloads) {
			const langCode = langDownload.lang.toLowerCase();

			switch (langCode) {
				case "ja":
				case "japanese":
				case "jpn":
					languages.add("ja");
					break;
				case "en":
				case "english":
				case "eng":
					languages.add("en");
					break;
				case "zh-cn":
				case "zh_cn":
				case "chinese_simplified":
				case "chs":
				case "chi_hans":
					languages.add("zh-cn");
					break;
				case "zh-tw":
				case "zh_tw":
				case "chinese_traditional":
				case "cht":
				case "chi_hant":
					languages.add("zh-tw");
					break;
				case "ko":
				case "korean":
				case "kor":
					languages.add("ko");
					break;
				case "es":
				case "spanish":
				case "spa":
					languages.add("es");
					break;
				default:
					languages.add("other");
					break;
			}
		}
	}

	return Array.from(languages);
}

/**
 * 作品を言語でフィルタリング
 * @param works 作品配列
 * @param language フィルタリング対象言語
 * @returns フィルタリングされた作品配列
 */
export function filterWorksByLanguage(
	works: OptimizedFirestoreDLsiteWorkData[],
	language: string,
): OptimizedFirestoreDLsiteWorkData[] {
	if (!language || language === "all") {
		return works;
	}

	const targetLang = language.toLowerCase();

	return works.filter((work) => {
		// その作品自体のプライマリ言語のみをチェック
		// 翻訳シリーズ全体ではなく、個別作品の言語で判定
		const primaryLang = getWorkPrimaryLanguage(work);
		return primaryLang === targetLang;
	});
}

// ===================================================================
// 時系列データ型定義 (Time-series Data Types)
