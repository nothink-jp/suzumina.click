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
	LanguageDownload,
	OptimizedFirestoreDLsiteWorkData,
	PriceInfo,
	RatingInfo,
	TranslationInfo,
	WorkCategory,
} from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";

/**
 * Individual Info API レスポンスの完全型定義（254フィールド）
 * DLsite API仕様に基づく包括的データ構造
 */
/**
 * LanguageEditionItem interface
 * 言語版アイテムの型定義
 */
interface LanguageEditionItem {
	workno: string;
	edition_id?: number;
	edition_type?: string;
	display_order?: number;
	label: string;
	lang: string;
	dl_count?: string;
	display_label?: string;
}

export interface IndividualInfoAPIResponse {
	// === 基本作品情報 ===
	workno?: string;
	product_id?: string;
	work_name?: string;
	maker_name?: string;
	maker_id?: string;

	// === 価格・販売情報 ===
	price?: number;
	price_without_tax?: number;
	official_price?: number;
	official_price_without_tax?: number;
	price_en?: number;
	price_eur?: number;
	discount_rate?: number;
	is_discount_work?: boolean;

	// === 多通貨・地域対応 ===
	currency_price?: Record<string, number>;
	locale_price?: Array<{
		currency: string;
		price: number;
		priceString: string;
	}>;

	// === 評価・統計情報 ===
	rate_average?: number;
	rate_average_star?: number;
	rate_count?: number;
	rate_count_detail?: Array<{
		review_point: number;
		count: number;
		ratio: number;
	}>;

	// === ダウンロード・販売統計 ===
	dl_count?: number | string;
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
	age_category?: number;
	regist_date?: string;
	update_date?: string;
	on_sale?: number;

	// === 作品分類 ===
	work_type?: string;
	work_type_string?: string;
	site_id?: string;
	author?: string;
	author_en?: string;

	// === クリエイター情報 ===
	creaters?: {
		voice_by?: Array<{
			id: string;
			name: string;
		}>;
		scenario_by?: Array<{
			id: string;
			name: string;
		}>;
		illust_by?: Array<{
			id: string;
			name: string;
		}>;
		music_by?: Array<{
			id: string;
			name: string;
		}>;
		directed_by?: Array<{
			id: string;
			name: string;
		}>;
		others_by?: Array<{
			id: string;
			name: string;
		}>;
	};

	// === ジャンル・タグ ===
	genres?: Array<{
		id: string;
		name: string;
		search_val?: string;
	}>;
	custom_genres?: Array<{
		genre_key: string;
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
	image_main?: string | number | object;
	image_thum?: string | number | object;
	image_samples?: (string | number | object)[];
	srcset?: string | number | object;
	image_thumb?: string | number | object;
	image_thumb_touch?: string | number | object;

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

	// === 言語版情報 (配列・オブジェクト両対応) ===
	language_editions?: Array<LanguageEditionItem> | Record<string, LanguageEditionItem>;

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
	// 価格情報の安全な取得（undefinedやnullに対応）
	const currentPrice = typeof apiData.price === "number" ? apiData.price : 0;
	const originalPrice =
		typeof apiData.official_price === "number" ? apiData.official_price : undefined;
	const discountRate = typeof apiData.discount_rate === "number" ? apiData.discount_rate : 0;

	// 無料作品・価格取得失敗対応: 価格が0でも有効な価格情報として扱う
	return {
		current: currentPrice,
		original: originalPrice && originalPrice !== currentPrice ? originalPrice : undefined,
		currency: "JPY",
		discount: discountRate > 0 ? discountRate : undefined,
		point: typeof apiData.point === "number" ? apiData.point : undefined,
		isFreeOrMissingPrice:
			currentPrice === 0 || apiData.price === undefined || apiData.price === null, // 無料作品または価格取得失敗フラグ
	};
}

/**
 * 評価情報の変換
 */
function extractRatingInfo(apiData: IndividualInfoAPIResponse): RatingInfo | undefined {
	// 評価情報の安全な取得
	const stars =
		typeof apiData.rate_average_star === "number"
			? apiData.rate_average_star
			: typeof apiData.rate_average === "number"
				? apiData.rate_average
				: 0;
	const count = typeof apiData.rate_count === "number" ? apiData.rate_count : 0;

	if (!stars || !count || count === 0) {
		return undefined;
	}

	const ratingInfo = {
		stars,
		count,
		reviewCount: count,
		ratingDetail: Array.isArray(apiData.rate_count_detail)
			? apiData.rate_count_detail.map((detail) => ({
					review_point: detail.review_point || 0,
					count: detail.count || 0,
					ratio: detail.ratio || 0,
				}))
			: undefined,
		averageDecimal: stars,
	};

	return ratingInfo;
}

/**
 * 声優情報の抽出（creatorsフィールドから優先、authorフィールドからフォールバック）
 */
function extractVoiceActors(apiData: IndividualInfoAPIResponse): string[] {
	// 新しいcreatorsフィールドから抽出（優先）
	if (apiData.creaters?.voice_by && Array.isArray(apiData.creaters.voice_by)) {
		const voiceActors = apiData.creaters.voice_by
			.map((creator) => creator.name)
			.filter((name) => name && typeof name === "string" && name.trim() !== "");
		if (voiceActors.length > 0) {
			return voiceActors;
		}
	}

	// フォールバック：authorフィールドから抽出
	if (!apiData.author) return [];

	// "CV:田中涼子,山田花子" のような形式から声優名を抽出
	const cvMatch = apiData.author?.match(/CV:([^,]+(?:,[^,]+)*)/);
	if (cvMatch?.[1]) {
		const voiceActors = cvMatch[1]
			.split(",")
			.map((name) => name.trim())
			.filter((name) => name && name.trim() !== "");
		return voiceActors;
	}

	// "みずのちょう" のような単一の作者名の場合（CV:なし）
	if (apiData.author && !apiData.author.includes("CV:")) {
		return [apiData.author.trim()];
	}

	return [];
}

/**
 * DLsite公式ジャンル情報の抽出
 * プロモーション情報を除外したクリーンなジャンルのみを取得
 */
function extractGenres(apiData: IndividualInfoAPIResponse): string[] {
	const genres: string[] = [];

	// genres配列から抽出（公式ジャンルのみ）
	if (apiData.genres && Array.isArray(apiData.genres)) {
		for (const genreItem of apiData.genres) {
			if (genreItem.name && isValidGenre(genreItem.name)) {
				genres.push(genreItem.name);
			}
		}
	}

	return genres;
}

/**
 * プロモーション情報かどうかを判定
 * クーポン、キャンペーン、特集などの販促情報を除外
 */
function isValidGenre(genreName: string): boolean {
	const promotionalPatterns = [
		/\d+%OFF/, // 30%OFF等
		/クーポン/,
		/対象作品/,
		/特集/,
		/キャンペーン/,
		/アワード/,
		/投票/,
		/過去最安値/,
		/新作ピックアップ/,
	];

	return !promotionalPatterns.some((pattern) => pattern.test(genreName));
}

/**
 * 各種クリエイター情報の抽出
 */
function extractCreators(apiData: IndividualInfoAPIResponse): {
	scenario: string[];
	illustration: string[];
	music: string[];
	author: string[];
} {
	const scenario: string[] = [];
	const illustration: string[] = [];
	const music: string[] = [];
	const author: string[] = [];

	if (apiData.creaters) {
		// シナリオ作者
		if (apiData.creaters.scenario_by && Array.isArray(apiData.creaters.scenario_by)) {
			scenario.push(
				...apiData.creaters.scenario_by
					.map((creator) => creator.name)
					.filter((name) => name && typeof name === "string" && name.trim() !== ""),
			);
		}

		// イラスト作者
		if (apiData.creaters.illust_by && Array.isArray(apiData.creaters.illust_by)) {
			illustration.push(
				...apiData.creaters.illust_by
					.map((creator) => creator.name)
					.filter((name) => name && typeof name === "string" && name.trim() !== ""),
			);
		}

		// 音楽作者
		if (apiData.creaters.music_by && Array.isArray(apiData.creaters.music_by)) {
			music.push(
				...apiData.creaters.music_by
					.map((creator) => creator.name)
					.filter((name) => name && typeof name === "string" && name.trim() !== ""),
			);
		}

		// その他の作者
		if (apiData.creaters.others_by && Array.isArray(apiData.creaters.others_by)) {
			author.push(
				...apiData.creaters.others_by
					.map((creator) => creator.name)
					.filter((name) => name && typeof name === "string" && name.trim() !== ""),
			);
		}
	}

	return { scenario, illustration, music, author };
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

	// Individual Info API -> Work data mappingは省略

	// 基本フィールドの存在確認（寛容な処理）
	if (!productId) {
		throw new Error("Missing required field: workno or product_id");
	}

	// 基本フィールドのフォールバック値設定
	const workName: string = apiData.work_name || `Unknown Work ${productId}`;
	const makerName: string = apiData.maker_name || "Unknown Maker";

	// 重要なフィールドが不足している場合はワーニングログ
	// Missing fieldログは省略

	// 基本情報の変換
	const category = extractWorkCategory(apiData);
	const price = extractPriceInfo(apiData);
	const rating = extractRatingInfo(apiData);
	const voiceActors = extractVoiceActors(apiData);
	const genres = extractGenres(apiData);
	const creators = extractCreators(apiData);

	// 無料作品・価格取得失敗の詳細情報をログ出力
	const isFreeOrMissingPrice = price.isFreeOrMissingPrice;
	if (isFreeOrMissingPrice) {
		// 価格情報確認ログは省略
	}

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

	// 翻訳情報
	const translationInfo: TranslationInfo | undefined = apiData.translation
		? {
				isTranslationAgree: apiData.translation.is_translation_agree,
				isVolunteer: apiData.translation.is_volunteer,
				isOriginal: apiData.translation.is_original,
				isParent: apiData.translation.is_parent,
				isChild: apiData.translation.is_child,
				originalWorkno: apiData.translation.original_workno,
				parentWorkno: apiData.translation.parent_workno,
				childWorknos: apiData.translation.child_worknos,
				lang: apiData.translation.lang,
				productionTradePriceRate: apiData.translation.production_trade_price_rate,
			}
		: undefined;

	// 言語版情報 (配列・オブジェクト両対応)
	const languageDownloads: LanguageDownload[] | undefined = apiData.language_editions
		? Array.isArray(apiData.language_editions)
			? apiData.language_editions.map((le) => ({
					workno: le.workno,
					editionId: le.edition_id,
					editionType: le.edition_type,
					displayOrder: le.display_order,
					label: le.label,
					lang: le.lang,
					dlCount: le.dl_count || "0",
					displayLabel: le.display_label || le.label,
				}))
			: Object.values(apiData.language_editions as Record<string, LanguageEditionItem>).map(
					(le) => ({
						workno: le.workno,
						editionId: le.edition_id,
						editionType: le.edition_type,
						displayOrder: le.display_order,
						label: le.label,
						lang: le.lang,
						dlCount: le.dl_count || "0",
						displayLabel: le.display_label || le.label,
					}),
				)
		: undefined;

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

	// 画像URL生成（高解像度対応・プロトコル相対URL正規化）
	const rawThumbnailUrl =
		apiData.image_thumb ||
		apiData.image_thumb_touch ||
		apiData.image_thum ||
		apiData.image_main ||
		`https://img.dlsite.jp/modpub/images2/work/doujin/${productId}_img_main.jpg`;
	const rawHighResImageUrl =
		apiData.image_main ||
		apiData.image_thumb_touch ||
		(apiData.srcset ? extractHighResFromSrcset(apiData.srcset) : undefined);

	const thumbnailUrl = normalizeImageUrl(rawThumbnailUrl);
	const highResImageUrl = normalizeImageUrl(rawHighResImageUrl);

	// thumbnailUrlは必須フィールドなので、デフォルト画像URLを保証
	const defaultThumbnailUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/${productId}_img_main.jpg`;
	const finalThumbnailUrl = thumbnailUrl || defaultThumbnailUrl;

	const result = {
		// === 基本識別情報 ===
		id: productId,
		productId,
		circleId: apiData.maker_id || undefined, // サークルID追加

		// === 基本作品情報 ===
		title: workName,
		circle: makerName,
		description: "Individual Info APIより取得", // Individual Info APIには詳細説明なし
		category,
		originalCategoryText: apiData.work_type_string || apiData.work_type,
		workUrl,
		thumbnailUrl: finalThumbnailUrl,
		highResImageUrl,

		// === 価格・評価情報 ===
		price,
		rating,
		wishlistCount: apiData.wishlist_count,

		// === クリエイター情報（Individual Info APIで取得可能な範囲） ===
		voiceActors: voiceActors.filter((name) => name && name.trim() !== ""),
		scenario: creators.scenario.filter((name) => name && name.trim() !== ""),
		illustration: creators.illustration.filter((name) => name && name.trim() !== ""),
		music: creators.music.filter((name) => name && name.trim() !== ""),
		author:
			creators.author.length > 0
				? creators.author.filter((name) => name && name.trim() !== "")
				: voiceActors.length > 0
					? []
					: apiData.author && apiData.author.trim() !== ""
						? [apiData.author.trim()]
						: [],

		// === DLsite公式ジャンル ===
		genres: genres.filter((genre) => genre && genre.trim() !== ""),

		// === 日付情報 ===
		releaseDate: typeof apiData.regist_date === "string" ? apiData.regist_date : undefined,
		releaseDateISO:
			typeof apiData.regist_date === "string" ? convertToISODate(apiData.regist_date!) : undefined,
		releaseDateDisplay:
			typeof apiData.regist_date === "string"
				? formatDateForDisplay(apiData.regist_date!)
				: undefined,

		// === 拡張メタデータ ===
		seriesName: apiData.title?.title_name,
		ageRating:
			typeof apiData.age_category === "number" ? mapAgeCategory(apiData.age_category) : undefined,
		workFormat: apiData.work_type_string,
		fileFormat: apiData.file_type_string,

		// === Individual Info API準拠フィールド ===
		apiGenres:
			apiData.genres
				?.map((g) => ({
					name: g.name,
					id: g.id ? Number(g.id) : undefined,
					search_val: g.search_val,
				}))
				.filter((g) => g.name && g.name.trim() !== "") || [],
		apiCustomGenres:
			apiData.custom_genres
				?.map((g) => ({
					genre_key: g.genre_key,
					name: g.name,
				}))
				.filter((g) => g.name && g.name.trim() !== "") || [],
		apiWorkOptions:
			apiData.work_options && typeof apiData.work_options === "string"
				? { [apiData.work_options]: { name: apiData.work_options } }
				: {},

		// === Individual Info API特有データ ===
		creaters: apiData.creaters
			? {
					voice_by: (apiData.creaters?.voice_by || []).filter(
						(creator) => creator.name && creator.name.trim() !== "",
					),
					scenario_by: (apiData.creaters?.scenario_by || []).filter(
						(creator) => creator.name && creator.name.trim() !== "",
					),
					illust_by: (apiData.creaters?.illust_by || []).filter(
						(creator) => creator.name && creator.name.trim() !== "",
					),
					music_by: (apiData.creaters?.music_by || []).filter(
						(creator) => creator.name && creator.name.trim() !== "",
					),
					others_by: (apiData.creaters?.others_by || []).filter(
						(creator) => creator.name && creator.name.trim() !== "",
					),
					created_by: (apiData.creaters?.directed_by || []).filter(
						(creator) => creator.name && creator.name.trim() !== "",
					), // directed_by を created_by にマッピング
				}
			: undefined,

		// === ファイル・サンプル情報（制限あり） ===
		// fileInfo は廃止済み
		// fileInfo: apiData.file_size_string
		// 	? {
		// 			totalSizeText: apiData.file_size_string,
		// 			totalSizeBytes: apiData.file_size,
		// 			formats: apiData.file_type_string ? [apiData.file_type_string] : [],
		// 			additionalFiles: [], // Individual Info APIには詳細ファイル情報なし
		// 		}
		// 	: undefined,
		// bonusContent: [], // Individual Info APIには特典情報なし（廃止済み）
		sampleImages:
			apiData.image_samples
				?.map((url, _index) => {
					const normalizedUrl = normalizeImageUrl(url);
					const urlString = normalizedUrl || (url ? String(url) : "");
					return {
						thumb: urlString,
						width: undefined,
						height: undefined,
					};
				})
				.filter(
					(img) =>
						img.thumb &&
						img.thumb !== "[object Object]" &&
						img.thumb !== "" &&
						img.thumb.trim() !== "",
				) || [],
		isExclusive: apiData.exclusive || false,

		// === 翻訳・言語情報 ===
		translationInfo,
		languageDownloads,

		// === データソース追跡（Individual Info API単一ソース） ===
		dataSources: {
			infoAPI: {
				lastFetched: now,
				wishlistCount: apiData.wishlist_count,
				customGenres: genres,
			},
		},

		// === システム管理情報 ===
		lastFetchedAt: now,
		createdAt: existingData?.createdAt || now,
		updatedAt: now,
	};

	// 最終的な空文字列除去（再帰的）
	const cleanedResult = removeEmptyStringsRecursively(result);

	return cleanedResult as OptimizedFirestoreDLsiteWorkData;
}

/**
 * DLsite age_category 数値を年齢制限文字列にマッピング
 * @param ageCategory - DLsiteのage_categoryフィールド（数値）
 * @returns 年齢制限文字列
 */
function mapAgeCategory(ageCategory?: number): string | undefined {
	if (ageCategory === undefined || ageCategory === null) {
		return undefined;
	}

	// DLsite API の age_category 値のマッピング
	// 1: 全年齢
	// 2: R15 (15歳以上推奨)
	// 3: R18 (18歳以上推奨/成人向け)
	switch (ageCategory) {
		case 1:
			return "全年齢";
		case 2:
			return "R15";
		case 3:
			return "R18";
		default:
			// 不明な値の場合はログに記録して返す
			// Unknown age_categoryログは省略
			return "未設定";
	}
}

/**
 * srcset文字列から最高解像度の画像URLを抽出（URL正規化対応）
 */
function extractHighResFromSrcset(
	srcset: string | number | object | undefined,
): string | undefined {
	if (!srcset) return undefined;

	// オブジェクトの場合は処理をスキップ（srcsetは通常文字列）
	if (typeof srcset === "object") {
		// srcsetオブジェクトログは省略
		return undefined;
	}

	// 文字列以外の値が来た場合は文字列に変換
	const srcsetString = typeof srcset === "string" ? srcset : String(srcset);

	// 空文字列の場合はundefinedを返す
	if (!srcsetString || srcsetString.trim() === "" || srcsetString === "[object Object]")
		return undefined;

	// "url1 1x, url2 2x, url3 3x" 形式から最大解像度を選択
	const entries = srcsetString.split(",").map((entry) => entry.trim());
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

	return bestUrl ? normalizeImageUrl(bestUrl) : undefined;
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
		// Date conversion failedログは省略
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
		// Date formatting failedログは省略
		return undefined;
	}
}

/**
 * プロトコル相対URLを絶対URLに正規化
 * "//img.dlsite.jp/..." -> "https://img.dlsite.jp/..."
 */
function normalizeImageUrl(url: string | undefined | number | null | object): string | undefined {
	if (!url) return undefined;

	// オブジェクトの場合は適切なプロパティを探す、または文字列化を試行
	if (typeof url === "object" && url !== null) {
		// オブジェクトの場合、よくあるプロパティ名を探す
		const obj = url as any;
		const candidateUrl = obj.url || obj.src || obj.href || obj.path;
		if (candidateUrl && typeof candidateUrl === "string") {
			return normalizeImageUrl(candidateUrl);
		}
		// 適切なプロパティが見つからない場合はundefinedを返す
		// 画像URLオブジェクトログは省略
		return undefined;
	}

	// 文字列以外の値が来た場合は文字列に変換（数値やその他の型に対応）
	const urlString = typeof url === "string" ? url : String(url);

	// 空文字列や無効な文字列の場合はundefinedを返す
	if (!urlString || urlString.trim() === "" || urlString === "[object Object]") {
		return undefined;
	}

	// プロトコル相対URLを検出して正規化
	if (urlString.startsWith("//")) {
		return `https:${urlString}`;
	}

	// 既に正しい形式の場合はそのまま返す
	return urlString;
}

/**
 * データ内の全ての空文字列を再帰的に除去する
 */
function removeEmptyStringsRecursively(obj: any): any {
	if (Array.isArray(obj)) {
		return obj
			.map((item) => removeEmptyStringsRecursively(item))
			.filter((item) => {
				if (typeof item === "string") {
					return item.trim() !== "";
				}
				return item != null;
			});
	}

	if (obj && typeof obj === "object") {
		const result: any = {};
		for (const [key, value] of Object.entries(obj)) {
			if (typeof value === "string") {
				if (value.trim() !== "") {
					result[key] = value;
				}
			} else {
				const cleaned = removeEmptyStringsRecursively(value);
				if (cleaned != null) {
					result[key] = cleaned;
				}
			}
		}
		return result;
	}

	return obj;
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
	if (data.price?.current === undefined) errors.push("価格情報が不足");
	if (!data.productId) errors.push("作品IDが不足");

	// Individual Info API特有の品質チェック
	if (!data.dataSources?.infoAPI) errors.push("Individual Info APIデータが不足");
	if (!data.createdAt) errors.push("作成日が不足");

	// 品質スコア計算
	let quality = 100;
	quality -= errors.length * 10;

	if (data.rating) quality += 10;
	if (data.voiceActors?.length > 0) quality += 10;
	if (data.genres?.length > 0) quality += 5;

	const result = {
		isValid: errors.length === 0,
		errors,
		quality: Math.max(0, Math.min(100, quality)),
	};

	return result;
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
			if (!productId) {
				// Skipping work data mappingログは省略
				continue;
			}

			const existingData = existingDataMap?.get(productId);
			const workData = mapIndividualInfoAPIToWorkData(apiData, existingData);
			results.push(workData);
		} catch (error) {
			const productId = apiData?.workno || apiData?.product_id || "unknown";
			logger.error(`Failed to map work data for ${productId}`, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				apiDataKeys: apiData ? Object.keys(apiData) : "apiData is null/undefined",
				hasRequiredFields: {
					workno: !!apiData?.workno,
					work_name: !!apiData?.work_name,
					maker_name: !!apiData?.maker_name,
					price: apiData?.price !== undefined,
					age_category: apiData?.age_category !== undefined,
				},
			});
		}
	}

	// Batch mapping completedログは省略
	return results;
}
