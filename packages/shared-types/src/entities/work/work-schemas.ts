/**
 * Work Schemas
 *
 * Zod schema definitions for DLsite work data structures.
 * Separated from work.ts for better code organization (KISS principle).
 */

import { z } from "zod";

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
	"th", // タイ語
	"de", // ドイツ語
	"fr", // フランス語
	"it", // イタリア語
	"pt", // ポルトガル語
	"ru", // ロシア語
	"vi", // ベトナム語
	"id", // インドネシア語
	"not-required", // 言語不要
	"dlsite-official", // DLsite公式
	"other", // その他言語
]);

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
 * クリエイター情報スキーマ
 * DLsite API の `creaters` を正規化した構造
 */
export const CreatorsSchema = z.object({
	/** 声優（CV）- DLsite API `creaters.voice_by` から */
	voice_by: z.array(IndividualAPICreatorSchema).default([]),
	/** シナリオ担当者 - DLsite API `creaters.scenario_by` から */
	scenario_by: z.array(IndividualAPICreatorSchema).default([]),
	/** イラスト担当者 - DLsite API `creaters.illust_by` から */
	illust_by: z.array(IndividualAPICreatorSchema).default([]),
	/** 音楽担当者 - DLsite API `creaters.music_by` から */
	music_by: z.array(IndividualAPICreatorSchema).default([]),
	/** その他制作者 - DLsite API `creaters.others_by` から */
	others_by: z.array(IndividualAPICreatorSchema).default([]),
	/** 制作担当者 - DLsite API `creaters.created_by` から */
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
 * ページネーションパラメータのZodスキーマ定義
 */
export const WorkPaginationParamsSchema = z.object({
	limit: z.number().int().positive(),
	startAfter: z.string().optional(),
	author: z.string().optional(),
	category: WorkCategorySchema.optional(),
});
