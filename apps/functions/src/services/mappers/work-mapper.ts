/**
 * Work Mapper - DLsite Individual Info API の薄い抽象化
 *
 * 新しいshared-types構造を使用した薄いマッピング層
 * ビジネスロジックはDomain Serviceに委譲
 */

import type {
	DLsiteApiResponse,
	LanguageDownload,
	PriceInfo,
	RatingInfo,
	SalesStatus,
	TranslationInfo,
	WorkCategory,
	WorkDocument,
} from "@suzumina.click/shared-types";
import { DateFormatter } from "@suzumina.click/shared-types";

// 言語エディション項目の型定義
interface LanguageEditionItem {
	workno: string;
	label: string;
	lang: string;
	dl_count?: string;
	display_label?: string;
	edition_id?: number;
	edition_type?: string;
	display_order?: number;
}

// 画像オブジェクトの型定義
interface ImageObject {
	url?: string;
	src?: string;
	[key: string]: unknown;
}

/**
 * Raw APIレスポンスからWorkエンティティに変換
 */
export function toWork(raw: DLsiteApiResponse): WorkDocument {
	const productId = raw.workno || raw.product_id || "";

	return {
		// === 基本識別情報 ===
		id: productId,
		productId,
		circleId: raw.maker_id,
		baseProductId: undefined, // Not available in raw API

		// === 基本作品情報 ===
		title: raw.work_name || `Unknown Work ${productId}`,
		titleMasked: raw.work_name || `Unknown Work ${productId}`, // Use work_name as fallback
		titleKana: undefined, // Not available in raw API
		altName: undefined, // Not available in raw API
		circle: raw.maker_name || "Unknown Maker",
		circleEn: undefined, // Not available in raw API
		description: raw.intro_s || "",
		workType: raw.work_type,
		workTypeString: raw.work_type_string,
		category: (raw.work_type as WorkCategory) || "etc",
		originalCategoryText: raw.work_type_string || raw.work_type,
		workUrl: `https://www.dlsite.com/maniax/work/=/product_id/${productId}.html`,
		thumbnailUrl: extractThumbnailUrl(raw, productId),
		highResImageUrl: extractHighResImageUrl(raw),

		// === 価格・評価情報 ===
		price: toPrice(raw) || { current: 0, currency: "JPY" },
		rating: toRating(raw),

		// === クリエイター情報 ===
		// DLsite APIの`creaters`を`creators`に正規化
		creators: normalizeCreators(raw),

		// === ジャンル情報 ===
		genres: extractGenres(raw),
		customGenres: extractCustomGenres(raw),

		// === 日付情報 ===
		releaseDate: raw.regist_date,
		releaseDateISO: raw.regist_date ? toISODate(raw.regist_date) : undefined,
		releaseDateDisplay: raw.regist_date ? formatDateDisplay(raw.regist_date) : undefined,
		registDate: raw.regist_date,
		updateDate: undefined, // Not available in raw API
		modifyFlag: undefined, // Not available in raw API

		// === 拡張メタデータ ===
		seriesId: raw.title?.title_id,
		seriesName: raw.title?.title_name,
		ageRating: mapAgeRating(raw.age_category),
		ageCategory: raw.age_category,
		ageCategoryString: mapAgeCategoryString(raw.age_category),
		workFormat: raw.work_type_string,
		fileFormat: raw.file_type_string,

		// === ファイル情報 ===
		fileType: raw.file_type,
		fileTypeString: raw.file_type_string,
		fileTypeSpecial: raw.file_type_special,
		fileSize: raw.file_size,

		// === サンプル画像 ===
		sampleImages: extractSampleImages(raw),

		// === 翻訳・言語情報 ===
		translationInfo: toTranslationInfo(raw),
		languageDownloads: toLanguageDownloads(raw),

		// === 販売状態情報 ===
		salesStatus: toSalesStatus(raw),

		// === データソース追跡 ===
		dataSources: {
			infoAPI: {
				lastFetched: new Date().toISOString(),
				customGenres: [],
			},
		},

		// === システム管理情報 ===
		lastFetchedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
}

/**
 * 価格情報への変換
 */
export function toPrice(raw: DLsiteApiResponse): PriceInfo | undefined {
	const current = raw.price ?? 0;
	const basePrice: PriceInfo = {
		current,
		currency: "JPY",
		original: raw.official_price !== current ? raw.official_price : undefined,
		discount: raw.discount_rate && raw.discount_rate > 0 ? raw.discount_rate : undefined,
		point: raw.point,
		isFreeOrMissingPrice: current === 0,
	};
	if (raw.locale_price || raw.locale_official_price) {
		// 一時的なフィールド追加のためanyキャストを使用
		const extendedPrice = basePrice as PriceInfo & {
			localePrices?: unknown;
			localeOfficialPrices?: unknown;
		};
		extendedPrice.localePrices = raw.locale_price;
		extendedPrice.localeOfficialPrices = raw.locale_official_price;
	}
	return basePrice;
}

/**
 * 評価情報への変換
 * APIが提供する評価分布をそのまま保持
 */
export function toRating(raw: DLsiteApiResponse): RatingInfo | undefined {
	const avgRating = raw.rate_average_star ?? raw.rate_average ?? 0;
	const count = raw.rate_count ?? 0;
	if (!avgRating || !count) return undefined;

	// Convert 0-5 scale to 0-50 scale
	const stars = Math.round(avgRating * 10);

	// Convert rate_count_detail to proper ratingDetail format
	const ratingDetail = raw.rate_count_detail
		? [1, 2, 3, 4, 5]
				.map((reviewPoint) => {
					const detailCount = raw.rate_count_detail?.[reviewPoint.toString()] || 0;
					return {
						review_point: reviewPoint,
						count: detailCount,
						ratio: count > 0 ? Math.round((detailCount / count) * 100) : 0,
					};
				})
				.filter((detail) => detail.count > 0)
		: undefined;

	return {
		stars,
		count,
		ratingDetail,
	};
}

/**
 * 年齢制限のマッピング
 */
function mapAgeRating(ageCategory?: number): string | undefined {
	const AGE_RATING_MAP: Record<number, string> = {
		1: "全年齢",
		2: "R15",
		3: "R18",
	};
	return ageCategory ? AGE_RATING_MAP[ageCategory] : undefined;
}

/**
 * 年齢カテゴリ文字列のマッピング
 */
function mapAgeCategoryString(ageCategory?: number): string | undefined {
	const AGE_CATEGORY_STRING_MAP: Record<number, string> = {
		1: "general",
		2: "r15",
		3: "adult",
	};
	return ageCategory ? AGE_CATEGORY_STRING_MAP[ageCategory] : undefined;
}

/**
 * サムネイルURLの抽出
 */
function extractThumbnailUrl(raw: DLsiteApiResponse, productId: string): string {
	const url = extractUrlFromImageField(raw.image_thum);

	// URLが取得できた場合はそれを返す、できなかった場合はデフォルトURL
	return url || `https://img.dlsite.jp/modpub/images2/work/doujin/${productId}_img_main.jpg`;
}

/**
 * 高解像度画像URLの抽出
 */
function extractHighResImageUrl(raw: DLsiteApiResponse): string | undefined {
	// image_mainから抽出
	const mainUrl = extractUrlFromImageField(raw.image_main);
	if (mainUrl) return mainUrl;

	// srcsetから抽出
	return extractUrlFromSrcset(raw.srcset);
}

/**
 * 画像フィールドからURLを抽出
 */
function extractUrlFromImageField(value: unknown): string | undefined {
	if (!value) return undefined;

	// 文字列の場合
	if (typeof value === "string") {
		return normalizeUrl(value);
	}

	// 数値の場合
	if (typeof value === "number") {
		return value.toString();
	}

	// オブジェクトの場合
	if (typeof value === "object" && value !== null) {
		const obj = value as ImageObject;
		if (obj.url && typeof obj.url === "string") {
			return normalizeUrl(obj.url);
		}
		if (obj.src && typeof obj.src === "string") {
			return normalizeUrl(obj.src);
		}
	}

	return undefined;
}

/**
 * srcsetからURLを抽出
 */
function extractUrlFromSrcset(srcset: unknown): string | undefined {
	if (!srcset) return undefined;

	if (typeof srcset === "string") {
		const urls = srcset.split(",").map((s) => s.trim().split(" ")[0]);
		const lastUrl = urls[urls.length - 1];
		return lastUrl ? normalizeUrl(lastUrl) : undefined;
	}

	if (typeof srcset === "number") {
		return String(srcset);
	}

	return undefined;
}

/**
 * DLsite APIの`creaters`を`creators`に正規化
 */
function normalizeCreators(raw: DLsiteApiResponse): WorkDocument["creators"] | undefined {
	if (!raw.creaters) return undefined;
	if (Array.isArray(raw.creaters)) return undefined;

	return {
		voice_by: raw.creaters.voice_by || [],
		scenario_by: raw.creaters.scenario_by || [],
		illust_by: raw.creaters.illust_by || [],
		music_by: raw.creaters.music_by || [],
		others_by: raw.creaters.others_by || [],
		created_by: [], // Not available in raw API, always empty
	};
}

/**
 * ジャンル情報の抽出
 */
function extractGenres(raw: DLsiteApiResponse): string[] {
	return raw.genres?.map((g) => g.name).filter((name) => name) || [];
}

/**
 * カスタムジャンル情報の抽出
 */
function extractCustomGenres(raw: DLsiteApiResponse): Array<{
	genre_key: string;
	name: string;
	name_en?: string;
	display_order?: number;
}> {
	if (!raw.genres) return [];
	return raw.genres.map((g) => ({
		genre_key: g.search_val || g.name, // Use search_val as genre_key
		name: g.name,
		name_en: undefined, // Not available in raw API
		display_order: undefined, // Not available in raw API
	}));
}

/**
 * サンプル画像の抽出
 */
function extractSampleImages(
	raw: DLsiteApiResponse,
): Array<{ thumb: string; width?: number; height?: number }> {
	if (!raw.image_samples?.length) return [];

	return raw.image_samples
		.map(extractSampleImageUrl)
		.filter((thumb): thumb is string => thumb !== undefined)
		.map((thumb) => ({ thumb }));
}

/**
 * サンプル画像アイテムからURLを抽出
 */
function extractSampleImageUrl(item: unknown): string | undefined {
	// extractUrlFromImageFieldを再利用して、コードの重複を削減
	return extractUrlFromImageField(item);
}

/**
 * 翻訳情報の変換
 */
function toTranslationInfo(raw: DLsiteApiResponse): TranslationInfo | undefined {
	if (!raw.translation) return undefined;
	return {
		isTranslationAgree: raw.translation.is_translation_agree,
		isVolunteer: raw.translation.is_volunteer,
		isOriginal: raw.translation.is_original,
		originalWorkno: raw.translation.original_workno,
		lang: raw.translation.lang,
	};
}

/**
 * 言語別ダウンロード情報の変換
 */
function toLanguageDownloads(raw: DLsiteApiResponse): LanguageDownload[] {
	if (!raw.language_editions) return [];

	// 配列形式の場合
	if (Array.isArray(raw.language_editions)) {
		return raw.language_editions.map((edition) => ({
			workno: edition.workno,
			label: edition.label,
			lang: edition.lang,
			dlCount: edition.dl_count || "",
			displayLabel: edition.display_label || edition.label,
			editionId: edition.edition_id,
			editionType: edition.edition_type,
			displayOrder: edition.display_order,
		}));
	}

	// オブジェクト形式の場合
	return Object.values(raw.language_editions as Record<string, LanguageEditionItem>).map(
		(edition) => ({
			workno: edition.workno,
			label: edition.label,
			lang: edition.lang,
			dlCount: edition.dl_count || "",
			displayLabel: edition.display_label || edition.label,
			editionId: edition.edition_id,
			editionType: edition.edition_type,
			displayOrder: edition.display_order,
		}),
	);
}

/**
 * 日付をISO形式に変換
 */
function toISODate(dateStr: string): string | undefined {
	const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (match) return `${dateStr}T00:00:00.000Z`;
	return DateFormatter.optimizeDateFormats(dateStr)?.iso;
}

/**
 * 日付を表示形式に変換
 */
function formatDateDisplay(dateStr: string): string | undefined {
	return DateFormatter.optimizeDateFormats(dateStr)?.display;
}

/**
 * 販売状態情報の変換
 */
function toSalesStatus(raw: DLsiteApiResponse): SalesStatus | undefined {
	if (!raw.sales_status) return undefined;

	return {
		isSale: raw.sales_status.is_sale,
		onSale: raw.sales_status.on_sale,
		isDiscount: raw.sales_status.is_discount,
		isPointup: raw.sales_status.is_pointup,
		isFree: raw.sales_status.is_free,
		isRental: raw.sales_status.is_rental,
		isSoldOut: raw.sales_status.is_sold_out,
		isReserveWork: raw.sales_status.is_reserve_work,
		isReservable: raw.sales_status.is_reservable,
		isTimesale: raw.sales_status.is_timesale,
		dlsiteplayWork: raw.sales_status.dlsiteplay_work,
	};
}

/**
 * URL正規化（プロトコル相対URLをHTTPSに）
 */
function normalizeUrl(url: string): string {
	return url.startsWith("//") ? `https:${url}` : url;
}

// WorkMapperクラスとの互換性のため、名前付きエクスポートも提供
export const WorkMapper = {
	toWork,
	toPrice,
	toRating,
};
