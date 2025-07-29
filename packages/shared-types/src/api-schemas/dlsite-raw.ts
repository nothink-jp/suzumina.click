import { z } from "zod";

/**
 * DLsite Individual Info API Raw Schema
 *
 * APIレスポンスの薄い抽象化層
 * 254フィールドから必要なフィールドのみを定義
 */

// === 基本情報 ===
export const DLsiteRawWork = z.object({
	workno: z.string().optional(),
	product_id: z.string().optional(),
	work_name: z.string().optional(),
	maker_id: z.string().optional(),
	maker_name: z.string().optional(),
	maker_name_en: z.string().nullable().optional(),
	age_category: z.number().optional(),
	site_id: z.string().optional(),
	regist_date: z.string().optional(),
	work_options: z.string().optional(),
	file_type: z.string().optional(),
	file_size: z.number().optional(),
	author: z.string().optional(),
	work_type: z.string().optional(),
	work_type_string: z.string().optional(),
	intro_s: z.string().optional(),
	price: z.number().optional(),
	official_price: z.number().optional(),
	discount_rate: z.number().optional(),
	on_sale: z.number().optional(),
	point: z.number().optional(),
	file_type_string: z.string().optional(),
	file_type_special: z.string().optional(),
	image_main: z.any().optional(),
	image_thum: z.any().optional(),
	srcset: z.string().optional(),
	image_samples: z.array(z.any()).optional(),
});

// === 評価情報 ===
export const DLsiteRawRating = z.object({
	rate_average: z.number().optional(),
	rate_average_star: z.number().optional(),
	rate_average_2dp: z.number().optional(),
	rate_count: z.number().optional(),
	rate_count_detail: z.record(z.string(), z.number()).optional(),
});

// === 販売統計 ===
export const DLsiteRawStats = z.object({
	dl_count: z.number().optional(),
	wishlist_count: z.number().optional(),
	review_count: z.number().optional(),
});

// === 価格情報 ===
export const DLsiteRawPrice = z.object({
	currency: z.string(),
	price: z.number(),
	price_string: z.string(),
});

export const DLsiteRawPrices = z.array(DLsiteRawPrice);

// === ジャンル情報 ===
export const DLsiteRawGenre = z.object({
	name: z.string(),
	id: z.number(),
	search_val: z.string(),
	name_base: z.string(),
});

export const DLsiteRawGenres = z.array(DLsiteRawGenre);

// === シリーズ情報 ===
export const DLsiteRawSeries = z.object({
	title_id: z.string(),
	title_name: z.string(),
	title_work_count: z.number(),
	is_title_completed: z.boolean(),
});

// === キャンペーン情報 ===
export const DLsiteRawCampaign = z.object({
	campaign_id: z.string().optional(),
	discount_campaign_id: z.string().optional(),
	discount_end_date: z.string().optional(),
	discount_url: z.string().optional(),
});

// === 翻訳情報 ===
export const DLsiteRawTranslation = z.object({
	is_translation_agree: z.boolean().optional(),
	is_volunteer: z.boolean().optional(),
	is_original: z.boolean().optional(),
	is_parent: z.boolean().optional(),
	is_child: z.boolean().optional(),
	original_workno: z.string().optional(),
	parent_workno: z.string().optional(),
	child_worknos: z.array(z.string()).optional(),
	lang: z.string().optional(),
	production_trade_price_rate: z.number().optional(),
});

// === 言語版情報 ===
export const DLsiteRawLanguageEdition = z.object({
	workno: z.string(),
	edition_id: z.number(),
	edition_type: z.string(),
	display_order: z.number(),
	label: z.string(),
	lang: z.string(),
	dl_count: z.string().optional(),
	display_label: z.string().optional(),
});

export const DLsiteRawLanguageEditions = z.array(DLsiteRawLanguageEdition);

// === ランキング情報 ===
export const DLsiteRawRank = z.object({
	term: z.string(),
	category: z.string(),
	rank: z.number(),
	rank_date: z.string(),
});

export const DLsiteRawRanks = z.array(DLsiteRawRank);

// === 販売状態 ===
export const DLsiteRawSalesStatus = z.object({
	is_sale: z.boolean().optional(),
	on_sale: z.number().optional(),
	is_discount: z.boolean().optional(),
	is_pointup: z.boolean().optional(),
	is_free: z.boolean().optional(),
	is_rental: z.boolean().optional(),
	is_sold_out: z.boolean().optional(),
	is_reserve_work: z.boolean().optional(),
	is_reservable: z.boolean().optional(),
	is_timesale: z.boolean().optional(),
	dlsiteplay_work: z.boolean().optional(),
});

// === クリエイター情報（creaters API） ===
export const DLsiteRawCreater = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
});

export const DLsiteRawCreaters = z.array(DLsiteRawCreater);

// === 統合APIレスポンス ===
export const DLsiteRawApiResponse = z.object({
	// 基本情報
	...DLsiteRawWork.shape,
	// 評価情報
	...DLsiteRawRating.shape,
	// 販売統計
	...DLsiteRawStats.shape,
	// 価格
	prices: DLsiteRawPrices.optional(),
	// ジャンル
	genres: DLsiteRawGenres.optional(),
	// 画像
	thumb_url: z.string().optional(),
	// シリーズ
	title: DLsiteRawSeries.optional(),
	// キャンペーン
	campaign: DLsiteRawCampaign.optional(),
	// 翻訳
	translation: DLsiteRawTranslation.optional(),
	// 言語版
	language_editions: DLsiteRawLanguageEditions.optional(),
	// ランキング
	rank: DLsiteRawRanks.optional(),
	// 販売状態
	sales_status: DLsiteRawSalesStatus.optional(),
	// その他
	default_point_rate: z.number().optional(),
	// クリエイター情報（creaters APIから）
	creaters: z
		.union([
			DLsiteRawCreaters,
			z.object({
				voice_by: DLsiteRawCreaters.optional(),
				illust_by: DLsiteRawCreaters.optional(),
				scenario_by: DLsiteRawCreaters.optional(),
				music_by: DLsiteRawCreaters.optional(),
				others_by: DLsiteRawCreaters.optional(),
				directed_by: DLsiteRawCreaters.optional(),
			}),
		])
		.optional(),
	// 多言語価格
	locale_price: z
		.union([
			z.record(z.string(), z.number()),
			z.array(z.object({ currency: z.string(), price: z.number() })),
		])
		.optional(),
	locale_official_price: z
		.union([
			z.record(z.string(), z.number()),
			z.array(z.object({ currency: z.string(), price: z.number() })),
		])
		.optional(),
});

export type DLsiteRawApiResponse = z.infer<typeof DLsiteRawApiResponse>;

/**
 * APIレスポンスのバリデーション
 */
export const validateApiResponse = (data: unknown): DLsiteRawApiResponse | null => {
	try {
		return DLsiteRawApiResponse.parse(data);
	} catch (_error) {
		return null;
	}
};

/**
 * プロトコル相対URLの正規化
 */
export const normalizeUrl = (url?: string): string | undefined => {
	if (!url) return undefined;
	return url.startsWith("//") ? `https:${url}` : url;
};
