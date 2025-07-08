/**
 * DLsite データマッパー
 *
 * HTMLパーサーから得られた生データを型安全なデータ構造に変換します。
 */

import {
	type CampaignInfo,
	type DLsiteWorkBase,
	DLsiteWorkBaseSchema,
	type LanguageDownload,
	type LocalePrice,
	type OptimizedFirestoreDLsiteWorkData,
	type PriceInfo,
	type RankingInfo,
	type RatingDetail,
	type RatingInfo,
	type SalesStatus,
	type SeriesInfo,
	type TranslationInfo,
} from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";
import type { DetailPageData } from "./dlsite-detail-parser";
import { fetchAndParseWorkDetail } from "./dlsite-detail-parser";
import type { ParsedWorkData } from "./dlsite-parser";
import { mapToOptimizedStructure } from "./dlsite-unified-mapper";

/**
 * DLsite info エンドポイントのレスポンス型定義
 * 実際のAPIレスポンス（254フィールド）から重要なフィールドを抽出
 */
export interface DLsiteInfoResponse {
	// === 基本情報 ===
	workno?: string; // 作品ID (RJ01415251)
	work_name?: string; // 作品名
	maker_id?: string; // メーカーID
	maker_name?: string; // メーカー・サークル名
	age_category?: number; // 年齢制限カテゴリ
	site_id?: string; // サイトID
	regist_date?: string; // 登録日
	work_options?: string; // 作品オプション
	file_type?: string; // ファイル形式

	// === 評価情報（実際のAPI構造） ===
	rate_average?: number; // 平均評価（旧フィールド・互換性維持）
	rate_average_star?: number; // 実際の評価（10-50の範囲、星1-5 x 10）
	rate_average_2dp?: number; // 小数点2桁の平均評価
	rate_count?: number; // 評価数
	rate_count_detail?: {
		// 星別評価数（実際の構造）
		"5": number;
		"4": number;
		"3": number;
		"2": number;
		"1": number;
	};

	// === 価格情報（実際のAPI構造） ===
	price?: number; // 基本価格（円）
	price_en?: number; // 英語版価格
	is_discount_work?: boolean; // 割引作品フラグ
	currency_price?: Record<string, number>; // 多通貨価格（USD, EUR等）
	locale_price?: Record<string, number>; // 地域別価格

	// === 統計情報 ===
	dl_count?: number; // ダウンロード数
	wishlist_count?: number; // ウィッシュリスト数
	review_count?: number; // レビュー数

	// ランキング情報
	rank?: Array<{
		term: string;
		category: string;
		rank: number;
		rank_date: string;
	}>;

	// 価格情報（多通貨）- 旧形式
	prices_old?: Array<{
		currency: string;
		price: number;
		price_string: string;
	}>;

	// キャンペーン情報
	campaign?: {
		campaign_id?: string;
		discount_campaign_id?: number;
		discount_end_date?: string;
		discount_url?: string;
	};

	// シリーズ情報
	title?: {
		title_id?: string;
		title_name?: string;
		title_work_count?: number;
		is_title_completed?: boolean;
	};

	// 翻訳情報 - 旧形式
	translation_old?: {
		is_translation_agree?: boolean;
		is_volunteer?: boolean;
		is_original?: boolean;
		is_parent?: boolean;
		is_child?: boolean;
		original_workno?: string;
		parent_workno?: string;
		child_worknos?: string[];
		lang?: string;
		production_trade_price_rate?: number;
	};

	// 言語別ダウンロード情報 - 旧形式
	language_editions_old?: Array<{
		workno: string;
		edition_id?: number;
		edition_type?: string;
		display_order?: number;
		label: string;
		lang: string;
		dl_count: string;
		display_label: string;
	}>;

	// 販売状態フラグ
	sales_status?: {
		is_sale?: boolean;
		on_sale?: number;
		is_discount?: boolean;
		is_pointup?: boolean;
		is_free?: boolean;
		is_rental?: boolean;
		is_sold_out?: boolean;
		is_reserve_work?: boolean;
		is_reservable?: boolean;
		is_timesale?: boolean;
		dlsiteplay_work?: boolean;
	};

	// === クリエイター情報（実際のAPI構造） ===
	creaters?: {
		illust_by?: Array<{
			id: string;
			name: string;
			classification: string;
			sub_classification?: string;
		}>;
		voice_by?: Array<{
			id: string;
			name: string;
			classification: string;
			sub_classification?: string;
		}>;
		scenario_by?: Array<{
			id: string;
			name: string;
			classification: string;
			sub_classification?: string;
		}>;
		music_by?: Array<{
			id: string;
			name: string;
			classification: string;
			sub_classification?: string;
		}>;
		other_by?: Array<{
			id: string;
			name: string;
			classification: string;
			sub_classification?: string;
		}>;
	};

	// === ジャンル情報（実際のAPI構造） ===
	genres?: Array<{
		name: string;
		id: number;
		search_val: string;
		name_base: string;
	}>;

	// === 言語版情報（実際のAPI構造） ===
	language_editions?: Array<{
		workno: string;
		edition_id: number;
		edition_type: string;
		display_order: number;
		label: string;
		lang: string;
		dl_count?: string;
		display_label?: string;
	}>;

	// === 翻訳情報（実際のAPI構造） ===
	translation_info?: {
		is_translation_agree?: boolean;
		is_volunteer?: boolean;
		is_original?: boolean;
		is_parent?: boolean;
		is_child?: boolean;
		original_workno?: string;
		parent_workno?: string;
		child_worknos?: string[];
		lang?: string;
		translation_bonus_langs?: string[];
		production_trade_price_rate?: number;
	};

	// === 画像情報（高優先度） ===
	image_main?: {
		workno: string;
		type: string;
		file_name: string;
		file_size: string;
		width: string;
		height: string;
		url: string;
		resize_url?: string;
		relative_url?: string;
	};
	image_thum?: {
		workno: string;
		type: string;
		file_name: string;
		file_size: string;
		width: string;
		height: string;
		url: string;
		resize_url?: string;
	};
	image_thumb?: string; // リサイズ済み画像URL
	image_thumb_touch?: string; // タッチ向けリサイズ画像URL
	image_samples?: Array<{
		// サンプル画像
		url: string;
		width?: string;
		height?: string;
	}>;

	// === 割引・キャンペーン情報（高優先度） ===
	discount?: {
		id: string;
		workno: string;
		status: string;
		campaign_id: number;
		start_date: number;
		end_date: number;
		campaign_price: number;
		discount_rate: number;
		restore_price: number;
		title: string;
	};
	campaign_id?: number;
	campaign_start_date?: string;
	campaign_end_date?: string;
	official_price?: number; // 定価
	official_price_without_tax?: number; // 定価（税抜）
	official_price_usd?: number; // USD定価
	official_price_eur?: number; // EUR定価

	// === ランキング情報（高優先度） ===
	rank_total?: number; // 総合ランキング
	rank_total_date?: string;
	rank_year?: number; // 年間ランキング
	rank_year_date?: string;
	rank_month?: number; // 月間ランキング
	rank_month_date?: string;
	rank_week?: number; // 週間ランキング
	rank_week_date?: string;
	rank_day?: number; // 日間ランキング
	rank_day_date?: string;

	// === 表示・設定情報（中優先度） ===
	work_type?: string; // 作品種別（SOU等）
	work_type_string?: string; // 作品種別表示名
	is_show_rate?: boolean; // 評価表示フラグ
	is_viewable_sample?: boolean; // サンプル表示可能フラグ
	is_oauth_work?: boolean; // OAuth作品フラグ
	is_limit_work?: boolean; // 限定作品フラグ
	is_rental_work?: boolean; // レンタル作品フラグ
	is_voice_pack?: boolean; // ボイスパック作品フラグ

	// === 地域価格詳細情報 ===
	locale_official_price?: Record<string, number>; // 地域別定価
	locale_price_str?: Record<string, string>; // 地域別価格表示文字列

	// === その他・下位互換性 ===
	default_point_rate?: number;
	voice_actors?: string[]; // 下位互換性のため維持（非推奨）

	// === 旧フィールド（下位互換性のため維持） ===
	prices?: Array<{
		// 旧多通貨価格形式
		currency: string;
		price: number;
		price_string: string;
	}>;
	translation?: {
		// 旧翻訳情報形式
		is_translation_agree?: boolean;
		is_volunteer?: boolean;
		is_original?: boolean;
		is_parent?: boolean;
		is_child?: boolean;
		original_workno?: string;
		parent_workno?: string;
		child_worknos?: string[];
		lang?: string;
		production_trade_price_rate?: number;
	};
}

/**
 * DLsiteのinfoエンドポイントから作品の詳細情報を取得
 */
export async function fetchWorkInfo(productId: string): Promise<DLsiteInfoResponse | null> {
	try {
		const url = `https://www.dlsite.com/maniax/api/=/product.json?workno=${productId}`;

		logger.debug(`DLsite info API リクエスト: ${url}`);

		const response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept: "application/json, text/plain, */*",
				"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
				"Cache-Control": "no-cache",
				Referer: "https://www.dlsite.com/",
			},
		});

		if (!response.ok) {
			logger.warn(
				`DLsite info API エラー (${productId}): ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const data = await response.json();

		// APIレスポンスの基本的な検証
		if (!data || typeof data !== "object") {
			logger.warn(`DLsite info API: 無効なレスポンス (${productId})`);
			return null;
		}

		logger.debug(`DLsite info API 成功 (${productId}): データを取得しました`);
		return data as DLsiteInfoResponse;
	} catch (error) {
		logger.error(`DLsite info API リクエストに失敗 (${productId}):`, error);
		return null;
	}
}

/**
 * DLsite info データから評価詳細を抽出（実際のAPI構造対応）
 */
export function extractRatingDetails(infoData: DLsiteInfoResponse): RatingDetail[] {
	// 新しい構造（オブジェクト形式）を優先
	if (
		infoData.rate_count_detail &&
		typeof infoData.rate_count_detail === "object" &&
		!Array.isArray(infoData.rate_count_detail)
	) {
		const details: RatingDetail[] = [];
		for (let star = 5; star >= 1; star--) {
			const count = infoData.rate_count_detail[
				star.toString() as keyof typeof infoData.rate_count_detail
			] as number;
			if (typeof count === "number" && count > 0) {
				details.push({
					review_point: star,
					count: count,
					ratio: 0, // 比率は後で計算可能
				});
			}
		}
		return details;
	}

	// 下位互換性: 旧配列形式
	if (infoData.rate_count_detail && Array.isArray(infoData.rate_count_detail)) {
		return infoData.rate_count_detail.map(
			(detail: { review_point: number; count: number; ratio: number }) => ({
				review_point: detail.review_point,
				count: detail.count,
				ratio: detail.ratio,
			}),
		);
	}

	return [];
}

/**
 * DLsite info データからランキング情報を抽出
 */
export function extractRankingInfo(infoData: DLsiteInfoResponse): RankingInfo[] {
	if (!infoData.rank || !Array.isArray(infoData.rank)) {
		return [];
	}

	return infoData.rank.map((rank) => ({
		term: rank.term as "day" | "week" | "month" | "year" | "total",
		category: rank.category,
		rank: rank.rank,
		rank_date: rank.rank_date,
	}));
}

/**
 * DLsite info データから多通貨価格情報を抽出
 */
export function extractLocalePrices(infoData: DLsiteInfoResponse): LocalePrice[] {
	if (!infoData.prices || !Array.isArray(infoData.prices)) {
		return [];
	}

	return infoData.prices.map((price) => ({
		currency: price.currency,
		price: price.price,
		priceString: price.price_string,
	}));
}

/**
 * DLsite info データからキャンペーン情報を抽出
 */
export function extractCampaignInfo(infoData: DLsiteInfoResponse): CampaignInfo | undefined {
	if (!infoData.campaign) {
		return undefined;
	}

	return {
		campaignId: infoData.campaign.campaign_id,
		discountCampaignId: infoData.campaign.discount_campaign_id,
		discountEndDate: infoData.campaign.discount_end_date,
		discountUrl: infoData.campaign.discount_url,
	};
}

/**
 * DLsite info データからシリーズ情報を抽出
 */
export function extractSeriesInfo(infoData: DLsiteInfoResponse): SeriesInfo | undefined {
	if (!infoData.title) {
		return undefined;
	}

	return {
		titleId: infoData.title.title_id,
		titleName: infoData.title.title_name,
		titleWorkCount: infoData.title.title_work_count,
		isTitleCompleted: infoData.title.is_title_completed,
	};
}

/**
 * DLsite info データから翻訳情報を抽出
 */
export function extractTranslationInfo(infoData: DLsiteInfoResponse): TranslationInfo | undefined {
	if (!infoData.translation) {
		return undefined;
	}

	return {
		isTranslationAgree: infoData.translation.is_translation_agree,
		isVolunteer: infoData.translation.is_volunteer,
		isOriginal: infoData.translation.is_original,
		isParent: infoData.translation.is_parent,
		isChild: infoData.translation.is_child,
		originalWorkno: infoData.translation.original_workno,
		parentWorkno: infoData.translation.parent_workno,
		childWorknos: infoData.translation.child_worknos,
		lang: infoData.translation.lang,
		productionTradePriceRate: infoData.translation.production_trade_price_rate,
	};
}

/**
 * DLsite info データから言語別ダウンロード情報を抽出
 */
export function extractLanguageDownloads(infoData: DLsiteInfoResponse): LanguageDownload[] {
	if (!infoData.language_editions || !Array.isArray(infoData.language_editions)) {
		return [];
	}

	return infoData.language_editions.map((edition) => ({
		workno: edition.workno,
		editionId: edition.edition_id,
		editionType: edition.edition_type,
		displayOrder: edition.display_order,
		label: edition.label,
		lang: edition.lang,
		dlCount: edition.dl_count || "0", // undefinedの場合はデフォルト値を設定
		displayLabel: edition.display_label || edition.label, // undefinedの場合はlabelを使用
	}));
}

/**
 * DLsite info データから画像情報を抽出
 */
export function extractImageInfo(infoData: DLsiteInfoResponse): {
	mainImage?: string;
	thumbnailImage?: string;
	highResImage?: string;
	sampleImages?: Array<{ url: string; width?: number; height?: number }>;
} {
	const result: {
		mainImage?: string;
		thumbnailImage?: string;
		highResImage?: string;
		sampleImages?: Array<{ url: string; width?: number; height?: number }>;
	} = {};

	// メイン画像
	if (infoData.image_main?.url) {
		result.mainImage = infoData.image_main.url.startsWith("//")
			? `https:${infoData.image_main.url}`
			: infoData.image_main.url;
	}

	// サムネイル画像
	if (infoData.image_thum?.url) {
		result.thumbnailImage = infoData.image_thum.url.startsWith("//")
			? `https:${infoData.image_thum.url}`
			: infoData.image_thum.url;
	}

	// 高解像度画像（リサイズ済み）
	if (infoData.image_thumb) {
		result.highResImage = infoData.image_thumb.startsWith("//")
			? `https:${infoData.image_thumb}`
			: infoData.image_thumb;
	}

	// サンプル画像
	if (infoData.image_samples && Array.isArray(infoData.image_samples)) {
		result.sampleImages = infoData.image_samples.map((img) => ({
			url: img.url.startsWith("//") ? `https:${img.url}` : img.url,
			width: img.width ? Number.parseInt(img.width, 10) : undefined,
			height: img.height ? Number.parseInt(img.height, 10) : undefined,
		}));
	}

	return result;
}

/**
 * DLsite info データから割引・キャンペーン詳細情報を抽出
 */
export function extractDiscountInfo(infoData: DLsiteInfoResponse): {
	isDiscountWork?: boolean;
	discountRate?: number;
	campaignPrice?: number;
	originalPrice?: number;
	campaignTitle?: string;
	campaignStartDate?: string;
	campaignEndDate?: string;
} {
	const result: {
		isDiscountWork?: boolean;
		discountRate?: number;
		campaignPrice?: number;
		originalPrice?: number;
		campaignTitle?: string;
		campaignStartDate?: string;
		campaignEndDate?: string;
	} = {};

	// 割引フラグ
	result.isDiscountWork = infoData.is_discount_work || false;

	// 割引詳細情報
	if (infoData.discount) {
		result.discountRate = infoData.discount.discount_rate;
		result.campaignPrice = infoData.discount.campaign_price;
		result.originalPrice = infoData.discount.restore_price;
		result.campaignTitle = infoData.discount.title;
	}

	// キャンペーン期間情報
	if (infoData.campaign_start_date) {
		result.campaignStartDate = infoData.campaign_start_date;
	}
	if (infoData.campaign_end_date) {
		result.campaignEndDate = infoData.campaign_end_date;
	}

	// 定価情報
	if (infoData.official_price) {
		result.originalPrice = result.originalPrice || infoData.official_price;
	}

	return result;
}

/**
 * DLsite info データから詳細ランキング情報を抽出
 */
export function extractDetailedRankingInfo(infoData: DLsiteInfoResponse): {
	dailyRank?: { rank: number; date: string };
	weeklyRank?: { rank: number; date: string };
	monthlyRank?: { rank: number; date: string };
	yearlyRank?: { rank: number; date: string };
	totalRank?: { rank: number; date: string };
} {
	const result: {
		dailyRank?: { rank: number; date: string };
		weeklyRank?: { rank: number; date: string };
		monthlyRank?: { rank: number; date: string };
		yearlyRank?: { rank: number; date: string };
		totalRank?: { rank: number; date: string };
	} = {};

	// 日間ランキング
	if (infoData.rank_day && infoData.rank_day_date) {
		result.dailyRank = { rank: infoData.rank_day, date: infoData.rank_day_date };
	}

	// 週間ランキング
	if (infoData.rank_week && infoData.rank_week_date) {
		result.weeklyRank = { rank: infoData.rank_week, date: infoData.rank_week_date };
	}

	// 月間ランキング
	if (infoData.rank_month && infoData.rank_month_date) {
		result.monthlyRank = { rank: infoData.rank_month, date: infoData.rank_month_date };
	}

	// 年間ランキング
	if (infoData.rank_year && infoData.rank_year_date) {
		result.yearlyRank = { rank: infoData.rank_year, date: infoData.rank_year_date };
	}

	// 総合ランキング
	if (infoData.rank_total && infoData.rank_total_date) {
		result.totalRank = { rank: infoData.rank_total, date: infoData.rank_total_date };
	}

	return result;
}

/**
 * DLsite info データから販売状態を抽出
 */
export function extractSalesStatus(infoData: DLsiteInfoResponse): SalesStatus | undefined {
	if (!infoData.sales_status) {
		return undefined;
	}

	return {
		isSale: infoData.sales_status.is_sale,
		onSale: infoData.sales_status.on_sale,
		isDiscount: infoData.sales_status.is_discount,
		isPointup: infoData.sales_status.is_pointup,
		isFree: infoData.sales_status.is_free,
		isRental: infoData.sales_status.is_rental,
		isSoldOut: infoData.sales_status.is_sold_out,
		isReserveWork: infoData.sales_status.is_reserve_work,
		isReservable: infoData.sales_status.is_reservable,
		isTimesale: infoData.sales_status.is_timesale,
		dlsiteplayWork: infoData.sales_status.dlsiteplay_work,
	};
}

/**
 * 声優名を抽出（実際のAPI構造対応）
 */
export function extractVoiceActors(infoData: DLsiteInfoResponse): string[] {
	const voiceActors: string[] = [];

	// 新しいcreaters構造から抽出（優先）
	if (infoData.creaters?.voice_by) {
		voiceActors.push(...infoData.creaters.voice_by.map((creator) => creator.name));
	}

	// 下位互換性: 旧voice_actorsフィールドからも抽出
	if (infoData.voice_actors && Array.isArray(infoData.voice_actors)) {
		voiceActors.push(
			...infoData.voice_actors.filter((actor) => actor && typeof actor === "string"),
		);
	}

	return [...new Set(voiceActors)]; // 重複除去
}

/**
 * 実際のAPI構造からクリエイター情報を抽出
 */
export function extractCreators(infoData: DLsiteInfoResponse): {
	voiceActors: string[];
	scenario: string[];
	illustration: string[];
	music: string[];
	author: string[];
} {
	const result = {
		voiceActors: [] as string[],
		scenario: [] as string[],
		illustration: [] as string[],
		music: [] as string[],
		author: [] as string[],
	};

	if (!infoData.creaters) {
		return result;
	}

	// 声優
	if (infoData.creaters.voice_by) {
		result.voiceActors = infoData.creaters.voice_by.map((creator) => creator.name);
	}

	// シナリオ
	if (infoData.creaters.scenario_by) {
		result.scenario = infoData.creaters.scenario_by.map((creator) => creator.name);
	}

	// イラスト
	if (infoData.creaters.illust_by) {
		result.illustration = infoData.creaters.illust_by.map((creator) => creator.name);
	}

	// 音楽
	if (infoData.creaters.music_by) {
		result.music = infoData.creaters.music_by.map((creator) => creator.name);
	}

	// その他作者
	if (infoData.creaters.other_by) {
		result.author = infoData.creaters.other_by.map((creator) => creator.name);
	}

	return result;
}

/**
 * 実際のAPI構造からジャンル情報を抽出
 */
export function extractGenres(infoData: DLsiteInfoResponse): string[] {
	if (!infoData.genres || !Array.isArray(infoData.genres)) {
		return [];
	}

	return infoData.genres
		.map((genre) => genre.name)
		.filter((name) => name && typeof name === "string");
}

/**
 * パースされたデータからPriceInfo構造に変換
 */
export function mapToPriceInfo(parsed: ParsedWorkData): PriceInfo {
	return {
		current: parsed.currentPrice,
		original: parsed.originalPrice,
		currency: "JPY",
		discount: parsed.discount,
		point: parsed.point,
	};
}

/**
 * パースされたデータからRatingInfo構造に変換
 */
export function mapToRatingInfo(
	parsed: ParsedWorkData,
	infoData?: DLsiteInfoResponse,
	detailPageData?: DetailPageData,
): RatingInfo | undefined {
	// 詳細ページから精密な評価データが取得できた場合を最優先
	if (detailPageData?.detailedRating?.stars) {
		return {
			stars: detailPageData.detailedRating.stars,
			count:
				detailPageData.detailedRating.ratingCount ||
				infoData?.rate_count ||
				parsed.ratingCount ||
				0,
			reviewCount: infoData?.review_count || parsed.reviewCount,
			ratingDetail: infoData ? extractRatingDetails(infoData) : undefined,
			averageDecimal: detailPageData.detailedRating.stars, // 詳細ページの精密評価を使用
		};
	}

	// info APIからより精密な評価データがある場合はそれを使用
	if (infoData?.rate_average_2dp && infoData?.rate_count) {
		return {
			stars: infoData.rate_average_star
				? infoData.rate_average_star / 10
				: infoData.rate_average || parsed.stars || 0,
			count: infoData.rate_count,
			reviewCount: infoData.review_count,
			ratingDetail: extractRatingDetails(infoData),
			averageDecimal: infoData.rate_average_2dp,
		};
	}

	// 新しいrate_average_star フィールドがある場合（より精密）
	if (infoData?.rate_average_star && infoData?.rate_count) {
		return {
			stars: infoData.rate_average_star / 10, // 10-50 → 1.0-5.0に変換
			count: infoData.rate_count,
			reviewCount: infoData.review_count,
			ratingDetail: extractRatingDetails(infoData),
			averageDecimal: infoData.rate_average_star / 10,
		};
	}

	// HTMLパースからの基本データを使用
	if (parsed.stars === undefined || parsed.stars === 0) {
		return undefined;
	}

	return {
		stars: parsed.stars,
		count: parsed.ratingCount || 0,
		reviewCount: parsed.reviewCount,
	};
}

/**
 * 相対URLを絶対URLに変換
 */
function normalizeUrl(url: string): string {
	if (url.startsWith("https://") || url.startsWith("http://")) {
		return url;
	}
	if (url.startsWith("//")) {
		return `https:${url}`;
	}
	if (url.startsWith("/")) {
		return `https://www.dlsite.com${url}`;
	}
	// スラッシュで始まらない相対パスの場合、DLsiteのルートパスとして扱う
	return `https://www.dlsite.com/${url}`;
}

/**
 * パースされた作品データをDLsiteWorkBase形式に変換（詳細データ統合対応）
 */
export function mapToWorkBase(
	parsed: ParsedWorkData,
	infoData?: DLsiteInfoResponse | null,
	detailPageData?: DetailPageData | null,
	existingData?: OptimizedFirestoreDLsiteWorkData | null,
): DLsiteWorkBase {
	try {
		const price = mapToPriceInfo(parsed);
		const rating = mapToRatingInfo(parsed, infoData || undefined, detailPageData || undefined);

		// サンプル画像のURLを正規化
		const normalizedSampleImages = parsed.sampleImages.map((sample) => ({
			thumb: normalizeUrl(sample.thumb),
			width: sample.width,
			height: sample.height,
		}));

		// === 重複データ統合処理 ===

		// Individual Info APIから新しいクリエイター構造を取得
		const apiCreators = infoData
			? extractCreators(infoData)
			: {
					voiceActors: [],
					scenario: [],
					illustration: [],
					music: [],
					author: [],
				};

		// 声優情報の統合（Individual Info API + 詳細ページ + 既存データ）
		const consolidatedVoiceActors = [
			...new Set([
				...apiCreators.voiceActors,
				...(detailPageData?.voiceActors || []),
				...(existingData?.voiceActors || []), // 既存データ保持
			]),
		];

		// シナリオ情報の統合（Individual Info API + 詳細ページ + 既存データ）
		const consolidatedScenario = [
			...new Set([
				...apiCreators.scenario,
				...(detailPageData?.scenario || []),
				...(existingData?.scenario || []), // 既存データ保持
			]),
		];

		// イラスト情報の統合（Individual Info API + 詳細ページ + 既存データ）
		const consolidatedIllustration = [
			...new Set([
				...apiCreators.illustration,
				...(detailPageData?.illustration || []),
				...(existingData?.illustration || []), // 既存データ保持
			]),
		];

		// 音楽情報の統合（Individual Info API + 詳細ページ + 既存データ）
		const consolidatedMusic = [
			...new Set([
				...apiCreators.music,
				...(detailPageData?.music || []),
				...(existingData?.music || []), // 既存データ保持
			]),
		];

		// その他作者情報の統合（Individual Info API + 詳細ページ + 既存データ）
		const consolidatedAuthor = [
			...new Set([
				...apiCreators.author,
				...(detailPageData?.author || []),
				...(existingData?.author || []), // 既存データ保持
			]),
		];

		// タグ情報の統合（優先順: parsed.tags > detailPageData.basicInfo.genres > Individual Info APIジャンル > existingData）
		const apiGenres = infoData ? extractGenres(infoData) : [];
		const consolidatedTags = [
			...new Set([
				...(parsed.tags || []),
				...(detailPageData?.basicInfo?.genres || []),
				...apiGenres,
				...(existingData?.tags || []), // 既存データ保持
			]),
		];

		// 作品情報の統合
		const consolidatedReleaseDate = detailPageData?.basicInfo?.releaseDate;
		const consolidatedSeriesName = detailPageData?.basicInfo?.seriesName;
		const consolidatedAgeRating = detailPageData?.basicInfo?.ageRating || parsed.ageRating;
		const consolidatedWorkFormat = detailPageData?.basicInfo?.workFormat;
		const consolidatedFileFormat = detailPageData?.basicInfo?.fileFormat;

		const workBase: DLsiteWorkBase = {
			id: parsed.productId, // FirestoreドキュメントIDとして商品IDを使用
			productId: parsed.productId,
			title: parsed.title,
			circle: parsed.circle,
			description: detailPageData?.detailedDescription || "", // 詳細ページから取得した説明文を使用
			category: parsed.category,
			workUrl: normalizeUrl(parsed.workUrl),
			thumbnailUrl: normalizeUrl(parsed.thumbnailUrl),
			highResImageUrl: detailPageData?.highResImageUrl, // 詳細ページから取得した高解像度画像URL
			price,
			rating,
			salesCount: parsed.salesCount || infoData?.dl_count,

			// === 統合されたクリエイター情報（5種類） ===
			voiceActors: consolidatedVoiceActors,
			scenario: consolidatedScenario,
			illustration: consolidatedIllustration,
			music: consolidatedMusic,
			author: consolidatedAuthor,

			// === 統合された作品情報 ===
			releaseDate: consolidatedReleaseDate,
			seriesName: consolidatedSeriesName,
			ageRating: consolidatedAgeRating,
			workFormat: consolidatedWorkFormat,
			fileFormat: consolidatedFileFormat,
			tags: consolidatedTags,

			sampleImages: normalizedSampleImages,
			isExclusive: parsed.isExclusive,

			// === 最小限の基本情報（重複除去済み） ===
			basicInfo: {
				detailTags: (detailPageData?.basicInfo?.detailTags || []).filter(
					(tag: string) => !consolidatedTags.includes(tag),
				), // タグと重複しない詳細タグのみ
				other: {},
			},

			// その他の拡張フィールド
			...(detailPageData && {
				fileInfo: detailPageData.fileInfo,
				bonusContent: detailPageData.bonusContent || [],
			}),

			// infoデータから追加される拡張フィールド
			...(infoData && {
				wishlistCount: infoData.wishlist_count,
				totalDownloadCount: infoData.dl_count,
				makerId: infoData.maker_id,
				ageCategory: infoData.age_category,
				registDate: infoData.regist_date,
				options: infoData.work_options,
				rankingHistory: extractRankingInfo(infoData),
				localePrices: extractLocalePrices(infoData),
				campaignInfo: extractCampaignInfo(infoData),
				defaultPointRate: infoData.default_point_rate,
				seriesInfo: extractSeriesInfo(infoData),
				translationInfo: extractTranslationInfo(infoData),
				languageDownloads: extractLanguageDownloads(infoData),
				salesStatus: extractSalesStatus(infoData),

				// === 新しいAPI構造フィールド ===
				workno: infoData.workno,
				siteId: infoData.site_id,
				fileType: infoData.file_type,
				basePrice: infoData.price,
				priceEn: infoData.price_en,
				isDiscountWork: infoData.is_discount_work,
				currencyPrice: infoData.currency_price,
				localePrice: infoData.locale_price,
				rateAverageStar: infoData.rate_average_star,
				translationInfo2: infoData.translation_info, // 新翻訳情報構造
				customGenres: apiGenres, // 実際のAPI構造からのジャンル
			}),
		};

		// Zodスキーマで検証
		return DLsiteWorkBaseSchema.parse(workBase);
	} catch (error) {
		logger.error(`作品データのマッピングに失敗: ${parsed.productId}`, {
			error,
			parsed,
		});
		throw new Error(`作品データのマッピングに失敗: ${parsed.productId}`);
	}
}

/**
 * DLsiteWorkBaseをFirestore保存用のデータに変換
 */
// mapToFirestoreData関数は削除 - OptimizedFirestoreDLsiteWorkDataのみ使用

/**
 * 複数の作品データをinfoデータと合わせて一括変換 (最適化構造)
 */
export async function mapMultipleWorksWithInfo(
	parsedWorks: ParsedWorkData[],
	existingDataMap?: Map<string, Partial<OptimizedFirestoreDLsiteWorkData>>,
): Promise<OptimizedFirestoreDLsiteWorkData[]> {
	const results: OptimizedFirestoreDLsiteWorkData[] = [];
	const errors: string[] = [];

	for (const parsed of parsedWorks) {
		try {
			// 詳細情報を取得（エラーが発生してもnullが返される）
			const infoData = await fetchWorkInfo(parsed.productId);

			// 最適化された統合マッピングを使用（詳細ページデータなし）
			const existingData = existingDataMap?.get(parsed.productId);
			const optimizedData = mapToOptimizedStructure(
				parsed,
				infoData || undefined,
				null,
				existingData as OptimizedFirestoreDLsiteWorkData,
			);
			results.push(optimizedData);

			if (infoData) {
				logger.debug(`作品${parsed.productId}: info APIデータを統合しました`);
			} else {
				logger.debug(`作品${parsed.productId}: HTMLデータのみで処理しました`);
			}
		} catch (error) {
			logger.warn(`作品${parsed.productId}の変換をスキップ:`, { error });
			errors.push(parsed.productId);
		}

		// レート制限対応: APIリクエスト間に短い遅延を入れる
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	if (errors.length > 0) {
		logger.warn(`${errors.length}件の作品変換に失敗:`, { errors });
	}

	logger.info(`作品データ変換完了: ${results.length}件成功, ${errors.length}件失敗`);
	return results;
}

/**
 * 複数の作品データを詳細データと合わせて一括変換 (最適化構造)
 */
export async function mapMultipleWorksWithDetailData(
	parsedWorks: ParsedWorkData[],
	existingDataMap?: Map<string, Partial<OptimizedFirestoreDLsiteWorkData>>,
): Promise<OptimizedFirestoreDLsiteWorkData[]> {
	const results: OptimizedFirestoreDLsiteWorkData[] = [];
	const errors: string[] = [];

	for (const parsed of parsedWorks) {
		try {
			// 詳細情報を取得（エラーが発生してもnullが返される）
			const infoData = await fetchWorkInfo(parsed.productId);

			// 詳細ページデータを取得（レート制限考慮）
			const extendedData = await fetchAndParseWorkDetail(parsed.productId);

			// 最適化された統合マッピングを使用
			const existingData = existingDataMap?.get(parsed.productId);
			const optimizedData = mapToOptimizedStructure(
				parsed,
				infoData || undefined,
				extendedData || undefined,
				existingData as OptimizedFirestoreDLsiteWorkData,
			);
			results.push(optimizedData);

			if (infoData) {
				logger.debug(`作品${parsed.productId}: info APIデータを統合しました`);
			}
			if (extendedData) {
				logger.debug(`作品${parsed.productId}: 詳細ページデータを統合しました`);
			}
			if (!infoData && !extendedData) {
				logger.debug(`作品${parsed.productId}: HTMLデータのみで処理しました`);
			}
		} catch (error) {
			logger.warn(`作品${parsed.productId}の変換をスキップ:`, { error });
			errors.push(parsed.productId);
		}

		// レート制限対応: 詳細ページ取得間に500ms遅延を入れる
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	if (errors.length > 0) {
		logger.warn(`${errors.length}件の作品変換に失敗:`, { errors });
	}

	logger.info(`詳細データ統合変換完了: ${results.length}件成功, ${errors.length}件失敗`);
	return results;
}

/**
 * 作品データの更新が必要かどうかを判定
 */
// shouldUpdateWork, filterWorksForUpdate関数は削除 - OptimizedFirestoreDLsiteWorkDataでは不要

/**
 * 必須フィールドの検証
 */
function validateRequiredFields(work: DLsiteWorkBase): string[] {
	const warnings: string[] = [];

	if (!work.title.trim()) {
		warnings.push("タイトルが空です");
	}

	if (!work.circle.trim()) {
		warnings.push("サークル名が空です");
	}

	return warnings;
}

/**
 * 価格情報の検証
 */
function validatePriceData(price: DLsiteWorkBase["price"]): string[] {
	const warnings: string[] = [];

	if (price.current < 0) {
		warnings.push("価格が負の値です");
	}

	if (price.original && price.original <= price.current) {
		warnings.push("元の価格が現在価格以下です");
	}

	if (price.discount && (price.discount < 0 || price.discount > 100)) {
		warnings.push("割引率が不正です (0-100%の範囲外)");
	}

	return warnings;
}

/**
 * 評価情報の検証
 */
function validateRatingData(rating?: DLsiteWorkBase["rating"]): string[] {
	const warnings: string[] = [];

	if (rating) {
		if (rating.stars < 0 || rating.stars > 5) {
			warnings.push("評価星数が不正です (0-5の範囲外)");
		}
		if (rating.count < 0) {
			warnings.push("評価数が負の値です");
		}
	}

	return warnings;
}

/**
 * URL形式の検証
 */
function validateUrls(work: DLsiteWorkBase): string[] {
	const warnings: string[] = [];

	try {
		new URL(work.workUrl);
	} catch {
		warnings.push("作品URLが不正です");
	}

	try {
		new URL(work.thumbnailUrl);
	} catch {
		warnings.push("サムネイルURLが不正です");
	}

	return warnings;
}

/**
 * データ品質チェック
 */
export function validateWorkData(work: DLsiteWorkBase): {
	isValid: boolean;
	warnings: string[];
} {
	const warnings = [
		...validateRequiredFields(work),
		...validatePriceData(work.price),
		...validateRatingData(work.rating),
		...validateUrls(work),
	];

	const isValid = warnings.length === 0;
	return { isValid, warnings };
}
