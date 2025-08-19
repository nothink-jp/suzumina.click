/**
 * API Transformer - 外部API → 内部データモデル変換
 *
 * DLsite APIのsnake_caseレスポンスを
 * 内部のcamelCaseデータモデルに変換
 */

import type { CircleData } from "../models/circle-data";
import type { CreatorsData, PriceData, RatingData, WorkData } from "../models/work-data";

/**
 * DLsite API レスポンス型（主要フィールドのみ）
 */
interface DLsiteAPIResponse {
	workno?: string;
	product_id?: string;
	work_name?: string;
	maker_id?: string;
	maker_name?: string;
	maker_name_en?: string | null;
	price?: number;
	official_price?: number;
	discount_rate?: number;
	regist_date?: string;
	update_date?: string;
	rate_average?: number;
	rate_average_star?: number;
	rate_count?: number;
	dl_count?: number;
	review_count?: number;
	work_type?: string;
	work_type_string?: string;
	age_category?: number;
	intro_s?: string;
	image_main?: unknown;
	image_thum?: unknown;
	author?: unknown[];
}

/**
 * DLsite API → WorkData 変換
 */
export const fromDLsiteAPI = (raw: DLsiteAPIResponse): WorkData | null => {
	// 必須フィールドチェック
	const productId = raw.product_id || raw.workno;
	const title = raw.work_name;
	const circleId = raw.maker_id;
	const circleName = raw.maker_name;

	if (!productId || !title || !circleId || !circleName) {
		return null;
	}

	return {
		id: productId,
		productId,
		title,
		maskedTitle: undefined, // APIには含まれない
		circle: {
			id: circleId,
			name: circleName,
			nameEn: raw.maker_name_en || undefined,
		},
		price: extractPrice(raw),
		releaseDate: raw.regist_date || new Date().toISOString(),
		registeredDate: raw.regist_date,
		lastModified: raw.update_date || new Date().toISOString(),
		rating: extractRating(raw),
		category: mapAgeCategory(raw.age_category),
		workType: raw.work_type_string || raw.work_type,
		tags: undefined, // APIには含まれない
		description: raw.intro_s,
		imageUrl: extractImageUrl(raw.image_main, productId),
		thumbnailUrl: extractImageUrl(raw.image_thum, productId),
		workUrl: generateWorkUrl(productId, raw.age_category),
		saleCount: raw.dl_count,
		reviewCount: raw.review_count,
		isAdult: (raw.age_category || 0) >= 18,
		hasStock: true, // デジタル作品は常に在庫あり
		creators: extractCreators(raw),
	};
};

/**
 * 価格情報の抽出
 */
const extractPrice = (raw: DLsiteAPIResponse): PriceData => {
	const current = raw.price || 0;
	const original = raw.official_price;
	const discountRate = raw.discount_rate;

	return {
		current,
		original,
		discountRate,
		currency: "JPY",
	};
};

/**
 * 評価情報の抽出
 */
const extractRating = (raw: DLsiteAPIResponse): RatingData | undefined => {
	if (!raw.rate_count || raw.rate_count === 0) {
		return undefined;
	}

	return {
		average: raw.rate_average_star || raw.rate_average || 0,
		count: raw.rate_count,
		reviewCount: raw.review_count,
	};
};

/**
 * 年齢カテゴリのマッピング
 */
const mapAgeCategory = (ageCategory?: number): string => {
	if (!ageCategory) return "all-ages";
	if (ageCategory >= 18) return "adult";
	if (ageCategory >= 15) return "r15";
	return "all-ages";
};

/**
 * 画像URLの抽出
 */
const extractImageUrl = (imageData: unknown, productId: string): string => {
	if (typeof imageData === "string") {
		return imageData;
	}

	if (imageData && typeof imageData === "object" && "url" in imageData) {
		const url = (imageData as Record<string, unknown>).url;
		if (typeof url === "string") {
			return url;
		}
	}

	// デフォルトURL生成
	const productGroup = productId.replace(/\d+$/, "000");
	return `https://img.dlsite.jp/modpub/images2/work/doujin/${productGroup}/${productId}_img_main.jpg`;
};

/**
 * 作品URLの生成
 */
const generateWorkUrl = (productId: string, ageCategory?: number): string => {
	const site = (ageCategory || 0) >= 18 ? "maniax" : "home";
	return `https://www.dlsite.com/${site}/work/=/product_id/${productId}.html`;
};

/**
 * クリエイター情報の抽出
 */
const extractCreators = (raw: DLsiteAPIResponse): CreatorsData | undefined => {
	if (!raw.author || !Array.isArray(raw.author)) {
		return undefined;
	}

	// 簡易実装：詳細なクリエイター情報は別APIから取得
	return undefined;
};

/**
 * Circle情報の抽出
 */
export const extractCircleFromAPI = (raw: DLsiteAPIResponse): CircleData | null => {
	const circleId = raw.maker_id;
	const circleName = raw.maker_name;

	if (!circleId || !circleName) {
		return null;
	}

	return {
		id: circleId,
		name: circleName,
		nameEn: raw.maker_name_en || undefined,
		workIds: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
};

/**
 * バッチ変換
 */
export const batchTransformFromAPI = (responses: DLsiteAPIResponse[]): WorkData[] => {
	return responses.map(fromDLsiteAPI).filter((work): work is WorkData => work !== null);
};
