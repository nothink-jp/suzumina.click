/**
 * Individual Info API専用作品データマッパー
 *
 * 100% API-Only アーキテクチャ実現のため、Individual Info APIレスポンス（254フィールド）から
 * OptimizedFirestoreDLsiteWorkData への直接変換を行います。
 *
 * HTMLスクレイピング完全廃止により、dlsiteWorksコレクションの内容は
 * Individual Info APIレスポンスのみになります。
 */

import type {
	OptimizedFirestoreDLsiteWorkData,
	PriceInfo,
	RatingInfo,
	WorkCategory,
} from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";

/**
 * Individual Info API レスポンスの完全型定義（254フィールド）
 * DLsite API仕様に基づく包括的データ構造
 */
export interface IndividualInfoAPIResponse {
	// === 基本作品情報 ===
	workno: string;
	product_id: string;
	work_name: string;
	maker_name: string;
	maker_id: string;

	// === 価格・販売情報 ===
	price: number;
	price_without_tax: number;
	official_price: number;
	official_price_without_tax: number;
	price_en: number;
	price_eur: number;
	discount_rate: number;
	is_discount_work: boolean;

	// === 多通貨・地域対応 ===
	currency_price?: Record<string, number>;
	locale_price?: Array<{
		currency: string;
		price: number;
		priceString: string;
	}>;

	// === 評価・統計情報 ===
	rate_average: number;
	rate_average_star: number;
	rate_count: number;
	rate_count_detail?: Array<{
		review_point: number;
		count: number;
		ratio: number;
	}>;

	// === ダウンロード・販売統計 ===
	dl_count: number | string;
	sales_count?: number;
	wishlist_count?: number;
	point?: number;

	// === ランキング情報 ===
	rank?: {
		day?: number;
		week?: number;
		month?: number;
		year?: number;
		total?: number;
	};

	// === 作品メタデータ ===
	age_category: number;
	regist_date: string;
	update_date?: string;
	on_sale: number;

	// === 作品分類 ===
	work_type: string;
	work_type_string: string;
	site_id: string;
	author: string;
	author_en?: string;

	// === ジャンル・タグ ===
	genre?: Array<{
		id: string;
		name: string;
	}>;
	keyword?: string[];

	// === プラットフォーム対応 ===
	platform?: string[];
	is_pc_work?: boolean;
	is_smartphone_work?: boolean;

	// === ファイル情報 ===
	file_type?: string;
	file_type_string?: string;
	file_size?: number;
	file_size_string?: string;

	// === 画像情報 ===
	image_main?: string;
	image_thum?: string;
	image_samples?: string[];
	srcset?: string;

	// === キャンペーン情報 ===
	campaign?: {
		campaign_id: number;
		discount_campaign_id?: number;
		discount_end_date?: string;
		discount_url?: string;
		campaign_name?: string;
	};

	// === シリーズ情報 ===
	title?: {
		title_id: string;
		title_name: string;
		title_work_count: number;
		is_title_completed: boolean;
	};

	// === 翻訳・言語情報 ===
	translation?: {
		is_translation_agree: boolean;
		is_volunteer: boolean;
		is_original: boolean;
		is_parent: boolean;
		is_child: boolean;
		original_workno?: string;
		parent_workno?: string;
		child_worknos?: string[];
		lang: string;
		production_trade_price_rate?: number;
	};

	// === 言語版情報 ===
	language_editions?: Array<{
		workno: string;
		edition_id?: number;
		edition_type?: string;
		display_order?: number;
		label: string;
		lang: string;
		dl_count?: string;
		display_label?: string;
	}>;

	// === 販売状態 ===
	sales_status?: {
		is_sale: boolean;
		on_sale: number;
		is_discount: boolean;
		is_pointup: boolean;
		is_free: boolean;
		is_rental: boolean;
		is_sold_out: boolean;
		is_reserve_work: boolean;
		is_reservable: boolean;
		is_timesale: boolean;
		dlsiteplay_work: boolean;
	};

	// === その他 ===
	default_point_rate?: number;
	work_options?: string;
	exclusive?: boolean;

	// === システム関連 ===
	last_modified?: string;
	cache_version?: string;
}

/**
 * DLsite作品タイプから標準カテゴリコードへの変換
 */
const WORK_TYPE_TO_CATEGORY: Record<string, WorkCategory> = {
	// 音声作品
	SOU: "SOU",
	音声作品: "SOU",
	Voice: "SOU",

	// ゲーム
	GAM: "GAM",
	ゲーム: "GAM",
	Game: "GAM",

	// アドベンチャー
	ADV: "ADV",
	アドベンチャー: "ADV",
	Adventure: "ADV",

	// RPG
	RPG: "RPG",
	ロールプレイング: "RPG",

	// 動画
	MOV: "MOV",
	動画: "MOV",
	Movie: "MOV",

	// マンガ
	MNG: "MNG",
	マンガ: "MNG",
	Manga: "MNG",

	// CG・イラスト
	CG: "CG",
	CG集: "CG",
	イラスト: "CG",

	// ツール・アクセサリ
	TOL: "TOL",
	ツール: "TOL",
	Tool: "TOL",

	// その他
	ET3: "ET3",
	SLN: "SLN",
	ACN: "ACN",
	PZL: "PZL",
	QIZ: "QIZ",
	TBL: "TBL",
	DGT: "DGT",
};

/**
 * Individual Info APIレスポンスから作品カテゴリを推定
 */
function extractWorkCategory(apiData: IndividualInfoAPIResponse): WorkCategory {
	// work_type_stringを優先
	if (apiData.work_type_string) {
		const category = WORK_TYPE_TO_CATEGORY[apiData.work_type_string];
		if (category) return category;
	}

	// work_typeをフォールバック
	if (apiData.work_type) {
		const category = WORK_TYPE_TO_CATEGORY[apiData.work_type];
		if (category) return category;
	}

	// その他の推定ロジック
	if (apiData.author?.includes("CV:") || apiData.work_name?.includes("ボイス")) {
		return "SOU";
	}

	// デフォルト
	return "etc";
}

/**
 * 価格情報の変換
 */
function extractPriceInfo(apiData: IndividualInfoAPIResponse): PriceInfo {
	const currentPrice = apiData.price || 0;
	const originalPrice = apiData.official_price;
	const discountRate = apiData.discount_rate || 0;

	return {
		current: currentPrice,
		original: originalPrice && originalPrice !== currentPrice ? originalPrice : undefined,
		currency: "JPY",
		discount: discountRate > 0 ? discountRate : undefined,
		point: apiData.point,
	};
}

/**
 * 評価情報の変換
 */
function extractRatingInfo(apiData: IndividualInfoAPIResponse): RatingInfo | undefined {
	const stars = apiData.rate_average_star || apiData.rate_average;
	const count = apiData.rate_count;

	if (!stars || !count || count === 0) {
		return undefined;
	}

	return {
		stars,
		count,
		reviewCount: count,
		ratingDetail: apiData.rate_count_detail?.map((detail) => ({
			review_point: detail.review_point,
			count: detail.count,
			ratio: detail.ratio,
		})),
		averageDecimal: stars,
	};
}

/**
 * 声優情報の抽出（authorフィールドから）
 */
function extractVoiceActors(apiData: IndividualInfoAPIResponse): string[] {
	if (!apiData.author) return [];

	// "CV:田中涼子,山田花子" のような形式から声優名を抽出
	const cvMatch = apiData.author?.match(/CV:([^,]+(?:,[^,]+)*)/);
	if (cvMatch?.[1]) {
		return cvMatch[1]
			.split(",")
			.map((name) => name.trim())
			.filter(Boolean);
	}

	// 単一の作者名の場合
	if (apiData.author && !apiData.author.includes("CV:")) {
		return [apiData.author.trim()];
	}

	return [];
}

/**
 * ジャンル・タグの抽出
 */
function extractGenresAndTags(apiData: IndividualInfoAPIResponse): {
	genres: string[];
	tags: string[];
} {
	const genres: string[] = [];
	const tags: string[] = [];

	// genre配列から抽出
	if (apiData.genre && Array.isArray(apiData.genre)) {
		for (const genreItem of apiData.genre) {
			if (genreItem.name) {
				genres.push(genreItem.name);
			}
		}
	}

	// keyword配列から抽出
	if (apiData.keyword && Array.isArray(apiData.keyword)) {
		tags.push(...apiData.keyword.filter(Boolean));
	}

	return { genres, tags };
}

/**
 * ランキング情報の変換（一時的に未使用）
 */
// function extractRankingHistory(apiData: IndividualInfoAPIResponse): RankingInfo[] {
// 	if (!apiData.rank) return [];
//
// 	const rankings: RankingInfo[] = [];
// 	const now = new Date().toISOString().split('T')[0];
//
// 	for (const [term, rank] of Object.entries(apiData.rank)) {
// 		if (rank && rank > 0) {
// 			rankings.push({
// 				term: term as "day" | "week" | "month" | "year" | "total",
// 				category: "all",
// 				rank,
// 				rank_date: now || new Date().toISOString(),
// 			});
// 		}
// 	}
//
// 	return rankings;
// }

/**
 * 多通貨価格情報の変換（一時的に未使用）
 */
// function extractLocalePrices(apiData: IndividualInfoAPIResponse): LocalePrice[] {
// 	const localePrices: LocalePrice[] = [];
//
// 	// 基本価格
// 	localePrices.push({
// 		currency: "JPY",
// 		price: apiData.price || 0,
// 		priceString: `¥${(apiData.price || 0).toLocaleString()}`,
// 	});
//
// 	// USD価格
// 	if (apiData.price_en) {
// 		localePrices.push({
// 			currency: "USD",
// 			price: apiData.price_en,
// 			priceString: `$${apiData.price_en.toFixed(2)}`,
// 		});
// 	}
//
// 	// EUR価格
// 	if (apiData.price_eur) {
// 		localePrices.push({
// 			currency: "EUR",
// 			price: apiData.price_eur,
// 			priceString: `€${apiData.price_eur.toFixed(2)}`,
// 		});
// 	}
//
// 	// その他の通貨
// 	if (apiData.currency_price) {
// 		for (const [currency, price] of Object.entries(apiData.currency_price)) {
// 			if (currency !== "JPY" && currency !== "USD" && currency !== "EUR" && price > 0) {
// 				localePrices.push({
// 					currency,
// 					price,
// 					priceString: `${price} ${currency}`,
// 				});
// 			}
// 		}
// 	}
//
// 	// locale_price配列からの追加
// 	if (apiData.locale_price && Array.isArray(apiData.locale_price)) {
// 		for (const localePrice of apiData.locale_price) {
// 			const existing = localePrices.find(lp => lp.currency === localePrice.currency);
// 			if (!existing && localePrice.price > 0) {
// 				localePrices.push({
// 					currency: localePrice.currency,
// 					price: localePrice.price,
// 					priceString: localePrice.priceString || `${localePrice.price} ${localePrice.currency}`,
// 				});
// 			}
// 		}
// 	}
//
// 	return localePrices;
// }

/**
 * Individual Info APIレスポンスから OptimizedFirestoreDLsiteWorkData への変換
 * 100% API-Only アーキテクチャの核となる変換関数
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Core data transformation logic requires complex mapping
export function mapIndividualInfoAPIToWorkData(
	apiData: IndividualInfoAPIResponse,
	existingData?: OptimizedFirestoreDLsiteWorkData,
): OptimizedFirestoreDLsiteWorkData {
	const now = new Date().toISOString();
	const productId = apiData.workno || apiData.product_id;

	logger.info(`Individual Info API -> Work data mapping: ${productId}`);

	// 基本情報の変換
	const category = extractWorkCategory(apiData);
	const price = extractPriceInfo(apiData);
	const rating = extractRatingInfo(apiData);
	const voiceActors = extractVoiceActors(apiData);
	const { genres, tags } = extractGenresAndTags(apiData);

	// キャンペーン情報（一時的に未使用）
	// const campaignInfo: CampaignInfo | undefined = apiData.campaign ? {
	// 	campaignId: apiData.campaign.campaign_id?.toString(),
	// 	discountCampaignId: apiData.campaign.discount_campaign_id,
	// 	discountEndDate: apiData.campaign.discount_end_date,
	// 	discountUrl: apiData.campaign.discount_url,
	// } : undefined;

	// シリーズ情報（一時的に未使用）
	// const seriesInfo: SeriesInfo | undefined = apiData.title ? {
	// 	titleId: apiData.title.title_id,
	// 	titleName: apiData.title.title_name,
	// 	titleWorkCount: apiData.title.title_work_count,
	// 	isTitleCompleted: apiData.title.is_title_completed,
	// } : undefined;

	// 翻訳情報（一時的に未使用）
	// const translationInfo: TranslationInfo | undefined = apiData.translation ? {
	// 	isTranslationAgree: apiData.translation.is_translation_agree,
	// 	isVolunteer: apiData.translation.is_volunteer,
	// 	isOriginal: apiData.translation.is_original,
	// 	isParent: apiData.translation.is_parent,
	// 	isChild: apiData.translation.is_child,
	// 	originalWorkno: apiData.translation.original_workno,
	// 	parentWorkno: apiData.translation.parent_workno,
	// 	childWorknos: apiData.translation.child_worknos,
	// 	lang: apiData.translation.lang,
	// 	productionTradePriceRate: apiData.translation.production_trade_price_rate,
	// } : undefined;

	// 言語版情報（一時的に未使用）
	// const languageDownloads: LanguageDownload[] | undefined = apiData.language_editions?.map(le => ({
	// 	workno: le.workno,
	// 	editionId: le.edition_id,
	// 	editionType: le.edition_type,
	// 	displayOrder: le.display_order,
	// 	label: le.label,
	// 	lang: le.lang,
	// 	dlCount: le.dl_count || "0",
	// 	displayLabel: le.display_label || le.label,
	// }));

	// 販売状態（一時的に未使用）
	// const salesStatus: SalesStatus | undefined = apiData.sales_status ? {
	// 	isSale: apiData.sales_status.is_sale,
	// 	onSale: apiData.sales_status.on_sale,
	// 	isDiscount: apiData.sales_status.is_discount,
	// 	isPointup: apiData.sales_status.is_pointup,
	// 	isFree: apiData.sales_status.is_free,
	// 	isRental: apiData.sales_status.is_rental,
	// 	isSoldOut: apiData.sales_status.is_sold_out,
	// 	isReserveWork: apiData.sales_status.is_reserve_work,
	// 	isReservable: apiData.sales_status.is_reservable,
	// 	isTimesale: apiData.sales_status.is_timesale,
	// 	dlsiteplayWork: apiData.sales_status.dlsiteplay_work,
	// } : undefined;

	// DLsite作品URL生成
	const workUrl = `https://www.dlsite.com/maniax/work/=/product_id/${productId}.html`;

	// 画像URL生成（高解像度対応）
	const thumbnailUrl =
		apiData.image_thum ||
		apiData.image_main ||
		`https://img.dlsite.jp/modpub/images2/work/doujin/${productId}_img_main.jpg`;
	const highResImageUrl =
		apiData.image_main || (apiData.srcset ? extractHighResFromSrcset(apiData.srcset) : undefined);

	// 販売数の正規化
	const salesCount =
		typeof apiData.dl_count === "string"
			? Number.parseInt(apiData.dl_count.replace(/,/g, ""), 10) || 0
			: apiData.dl_count || 0;

	return {
		// === 基本識別情報 ===
		id: productId,
		productId,

		// === 基本作品情報 ===
		title: apiData.work_name || "",
		circle: apiData.maker_name || "",
		description: "", // Individual Info APIには詳細説明なし
		category,
		originalCategoryText: apiData.work_type_string || apiData.work_type,
		workUrl,
		thumbnailUrl,
		highResImageUrl,

		// === 価格・評価情報 ===
		price,
		rating,
		salesCount,
		wishlistCount: apiData.wishlist_count,
		totalDownloadCount: salesCount,

		// === クリエイター情報（Individual Info APIで取得可能な範囲） ===
		voiceActors,
		scenario: [], // Individual Info APIには詳細クリエイター情報なし
		illustration: [],
		music: [],
		author: voiceActors.length > 0 ? [] : apiData.author ? [apiData.author] : [],

		// === ジャンル・タグ ===
		genres,
		tags,
		customTags: genres.length > 0 ? genres : undefined,

		// === 日付情報 ===
		releaseDate: apiData.regist_date,
		releaseDateISO: apiData.regist_date ? convertToISODate(apiData.regist_date) : undefined,
		releaseDateDisplay: apiData.regist_date ? formatDateForDisplay(apiData.regist_date) : undefined,

		// === 拡張メタデータ ===
		seriesName: apiData.title?.title_name,
		ageRating: apiData.age_category?.toString(),
		workFormat: apiData.work_type_string,
		fileFormat: apiData.file_type_string,

		// === Individual Info API特有データ ===

		// === ファイル・サンプル情報（制限あり） ===
		fileInfo: apiData.file_size_string
			? {
					totalSizeText: apiData.file_size_string,
					totalSizeBytes: apiData.file_size,
					formats: apiData.file_type_string ? [apiData.file_type_string] : [],
					additionalFiles: [], // Individual Info APIには詳細ファイル情報なし
				}
			: undefined,
		bonusContent: [], // Individual Info APIには特典情報なし
		sampleImages:
			apiData.image_samples?.map((url, _index) => ({
				thumb: url,
				width: undefined,
				height: undefined,
			})) || [],
		isExclusive: apiData.exclusive || false,

		// === データソース追跡（Individual Info API単一ソース） ===
		dataSources: {
			infoAPI: {
				lastFetched: now,
				salesCount,
				wishlistCount: apiData.wishlist_count,
				customGenres: genres,
			},
		},

		// === システム管理情報 ===
		lastFetchedAt: now,
		createdAt: existingData?.createdAt || now,
		updatedAt: now,
	};
}

/**
 * srcset文字列から最高解像度の画像URLを抽出
 */
function extractHighResFromSrcset(srcset: string): string | undefined {
	// "url1 1x, url2 2x, url3 3x" 形式から最大解像度を選択
	const entries = srcset.split(",").map((entry) => entry.trim());
	let maxRes = 0;
	let bestUrl = "";

	for (const entry of entries) {
		const match = entry.match(/^(.+)\s+(\d+(?:\.\d+)?)x$/);
		if (match?.[1]) {
			const url = match[1];
			const resolution = Number.parseFloat(match[2] || "0");
			if (resolution > maxRes) {
				maxRes = resolution;
				bestUrl = url;
			}
		}
	}

	return bestUrl || undefined;
}

/**
 * 日付文字列をISO形式に変換
 */
function convertToISODate(dateString: string): string | undefined {
	try {
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) return undefined;

		return date.toISOString().split("T")[0]; // YYYY-MM-DD
	} catch (error) {
		logger.warn(`Date conversion failed: ${dateString}`, { error });
		return undefined;
	}
}

/**
 * 日付を表示用形式に変換
 */
function formatDateForDisplay(dateString: string): string | undefined {
	try {
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) return undefined;

		return date.toLocaleDateString("ja-JP", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	} catch (error) {
		logger.warn(`Date formatting failed: ${dateString}`, { error });
		return undefined;
	}
}

/**
 * Individual Info API専用の品質検証
 */
export function validateAPIOnlyWorkData(data: OptimizedFirestoreDLsiteWorkData): {
	isValid: boolean;
	errors: string[];
	quality: number;
} {
	const errors: string[] = [];

	// 必須フィールドチェック
	if (!data.title) errors.push("タイトルが不足");
	if (!data.circle) errors.push("サークル名が不足");
	if (!data.price.current) errors.push("価格情報が不足");
	if (!data.productId) errors.push("作品IDが不足");

	// Individual Info API特有の品質チェック
	if (!data.dataSources?.infoAPI) errors.push("Individual Info APIデータが不足");
	if (!data.circle) errors.push("メーカー情報が不足");
	if (!data.createdAt) errors.push("作成日が不足");

	// 品質スコア計算
	let quality = 100;
	quality -= errors.length * 10;

	if (data.rating) quality += 10;
	if (data.voiceActors.length > 0) quality += 10;
	if (data.genres.length > 0) quality += 5;
	if (data.salesCount && data.salesCount > 0) quality += 5;

	return {
		isValid: errors.length === 0,
		errors,
		quality: Math.max(0, Math.min(100, quality)),
	};
}

/**
 * バッチ処理用：複数のIndividual Info APIレスポンスを一括変換
 */
export function batchMapIndividualInfoAPIToWorkData(
	apiResponses: IndividualInfoAPIResponse[],
	existingDataMap?: Map<string, OptimizedFirestoreDLsiteWorkData>,
): OptimizedFirestoreDLsiteWorkData[] {
	const results: OptimizedFirestoreDLsiteWorkData[] = [];

	for (const apiData of apiResponses) {
		try {
			const productId = apiData.workno || apiData.product_id;
			const existingData = existingDataMap?.get(productId);

			const workData = mapIndividualInfoAPIToWorkData(apiData, existingData);
			results.push(workData);
		} catch (error) {
			logger.error(`Failed to map work data for ${apiData.workno || apiData.product_id}`, {
				error,
			});
		}
	}

	logger.info(`Batch mapping completed: ${results.length}/${apiResponses.length} works`);
	return results;
}
