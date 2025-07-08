/**
 * DLsite Individual Info API フィールドマッピング機能
 * 254フィールドのAPIレスポンスから時系列データを抽出・変換
 */

import type { RegionalPrice, TimeSeriesRawData } from "@suzumina.click/shared-types";

/**
 * Individual Info API レスポンスの型定義（必要なフィールドのみ）
 */
export interface IndividualInfoAPIResponse {
	// === 基本情報 ===
	workno: string;
	product_id: string;
	work_name: string;
	maker_name: string;

	// === 価格情報（時系列対象） ===
	price: number; // 現在価格（税込）
	price_without_tax: number; // 現在価格（税抜）
	official_price: number; // 定価（税込）
	official_price_without_tax: number; // 定価（税抜）
	price_en: number; // USD価格
	price_eur: number; // EUR価格
	discount_rate: number; // 割引率（0-100）
	is_discount_work: boolean; // 割引対象フラグ
	campaign_id?: number; // キャンペーンID

	// === 多通貨価格情報 ===
	currency_price?: Record<string, number>; // 通貨別価格
	locale_price?: Array<{
		currency: string;
		price: number;
		priceString: string;
	}>;

	// === 販売・評価情報（時系列対象） ===
	dl_count?: string | number; // ダウンロード数
	rate_average_star?: number; // 平均評価（1-5）
	rate_count?: number; // 評価数
	rank_day?: number; // 日別ランキング
	rank_week?: number; // 週別ランキング
	rank_month?: number; // 月別ランキング
	sales_count?: number; // 販売数
	wishlist_count?: number; // ウィッシュリスト数

	// === その他メタ情報 ===
	regist_date?: string; // 登録日時
	update_date?: string; // 更新日時
	on_sale?: number; // 販売状態（0=停止, 1=販売中）
}

/**
 * 通貨コード正規化マッピング
 * DLsite APIの通貨コードを標準RegionalPriceキーに変換
 */
const CURRENCY_CODE_MAPPING: Record<string, keyof RegionalPrice> = {
	// 日本円
	JPY: "JP",
	jpy: "JP",
	jp: "JP",
	japanese_yen: "JP",

	// 米ドル
	USD: "US",
	usd: "US",
	us: "US",
	dollar: "US",
	en: "US", // DLsite price_en フィールド

	// ユーロ
	EUR: "EU",
	eur: "EU",
	eu: "EU",
	euro: "EU",

	// 中国元
	CNY: "CN",
	cny: "CN",
	cn: "CN",
	rmb: "CN",
	yuan: "CN",

	// 台湾ドル
	TWD: "TW",
	twd: "TW",
	tw: "TW",
	taiwan_dollar: "TW",

	// 韓国ウォン
	KRW: "KR",
	krw: "KR",
	kr: "KR",
	won: "KR",
	korean_won: "KR",
};

/**
 * 通貨別価格情報を6地域標準形式に変換
 */
function extractRegionalPrices(apiResponse: IndividualInfoAPIResponse): RegionalPrice {
	const regionalPrices: Partial<RegionalPrice> = {};

	// 1. 基本価格フィールドから抽出
	regionalPrices.JP = apiResponse.price || apiResponse.official_price || 0;
	regionalPrices.US = apiResponse.price_en || 0;
	regionalPrices.EU = apiResponse.price_eur || 0;

	// 2. currency_price フィールドから抽出
	if (apiResponse.currency_price) {
		for (const [currencyCode, price] of Object.entries(apiResponse.currency_price)) {
			const normalizedCurrency = CURRENCY_CODE_MAPPING[currencyCode.toLowerCase()];
			if (normalizedCurrency && typeof price === "number" && price > 0) {
				regionalPrices[normalizedCurrency] = price;
			}
		}
	}

	// 3. locale_price 配列から抽出
	if (apiResponse.locale_price && Array.isArray(apiResponse.locale_price)) {
		for (const localePrice of apiResponse.locale_price) {
			if (localePrice && typeof localePrice === "object") {
				const normalizedCurrency = CURRENCY_CODE_MAPPING[localePrice.currency?.toLowerCase()];
				if (normalizedCurrency && typeof localePrice.price === "number" && localePrice.price > 0) {
					regionalPrices[normalizedCurrency] = localePrice.price;
				}
			}
		}
	}

	// 4. 未設定通貨のデフォルト値設定（JPY基準で推定）
	const jpyPrice = regionalPrices.JP || 0;
	if (jpyPrice > 0) {
		// 簡易為替レート（固定値、実際の運用では外部APIから取得推奨）
		const exchangeRates = {
			US: 0.0067, // 1 JPY = 0.0067 USD
			EU: 0.0061, // 1 JPY = 0.0061 EUR
			CN: 0.048, // 1 JPY = 0.048 CNY
			TW: 0.21, // 1 JPY = 0.21 TWD
			KR: 8.9, // 1 JPY = 8.9 KRW
		};

		if (!regionalPrices.US) regionalPrices.US = Math.round(jpyPrice * exchangeRates.US * 100) / 100;
		if (!regionalPrices.EU) regionalPrices.EU = Math.round(jpyPrice * exchangeRates.EU * 100) / 100;
		if (!regionalPrices.CN) regionalPrices.CN = Math.round(jpyPrice * exchangeRates.CN * 100) / 100;
		if (!regionalPrices.TW) regionalPrices.TW = Math.round(jpyPrice * exchangeRates.TW);
		if (!regionalPrices.KR) regionalPrices.KR = Math.round(jpyPrice * exchangeRates.KR);
	}

	// 5. 0未満の値を0に正規化
	return {
		JP: Math.max(regionalPrices.JP || 0, 0),
		US: Math.max(regionalPrices.US || 0, 0),
		EU: Math.max(regionalPrices.EU || 0, 0),
		CN: Math.max(regionalPrices.CN || 0, 0),
		TW: Math.max(regionalPrices.TW || 0, 0),
		KR: Math.max(regionalPrices.KR || 0, 0),
	};
}

/**
 * 数値文字列を安全に数値に変換
 */
function safeParseNumber(value: string | number | undefined): number | undefined {
	if (typeof value === "number") {
		return Number.isNaN(value) ? undefined : value;
	}
	if (typeof value === "string") {
		// カンマ区切りの数値文字列に対応（例: "1,234" → 1234）
		const cleanValue = value.replace(/,/g, "");
		const parsed = Number.parseFloat(cleanValue);
		return Number.isNaN(parsed) ? undefined : parsed;
	}
	return undefined;
}

/**
 * Individual Info API レスポンスから時系列生データを抽出
 */
export function mapIndividualInfoToTimeSeriesData(
	apiResponse: IndividualInfoAPIResponse,
	timestamp: Date = new Date(),
): TimeSeriesRawData {
	const isoTimestamp = timestamp.toISOString();
	const date = isoTimestamp.split("T")[0] || ""; // YYYY-MM-DD
	const time = isoTimestamp.split("T")[1]?.split(".")[0] || ""; // HH:mm:ss

	// 地域別価格情報の抽出
	const regionalPrices = extractRegionalPrices(apiResponse);

	// 数値データの安全な抽出
	const salesCount = safeParseNumber(apiResponse.sales_count);
	const wishlistCount = safeParseNumber(apiResponse.wishlist_count);
	const dlCount = safeParseNumber(apiResponse.dl_count);
	const ratingAverage = apiResponse.rate_average_star;
	const ratingCount = safeParseNumber(apiResponse.rate_count);

	return {
		workId: apiResponse.workno || apiResponse.product_id,
		timestamp: isoTimestamp,
		date,
		time,

		// 価格情報
		regionalPrices,
		discountRate: Math.max(0, Math.min(100, apiResponse.discount_rate || 0)),
		campaignId: apiResponse.campaign_id,

		// 販売・ランキング情報
		salesCount: salesCount || dlCount, // salesCountがない場合はdlCountで代替
		wishlistCount,
		rankDay: apiResponse.rank_day,
		rankWeek: apiResponse.rank_week,
		rankMonth: apiResponse.rank_month,

		// 評価情報
		ratingAverage:
			ratingAverage && ratingAverage >= 0 && ratingAverage <= 5 ? ratingAverage : undefined,
		ratingCount,
	};
}

/**
 * Individual Info API からの時系列データ取得を検証
 */
export function validateTimeSeriesData(data: TimeSeriesRawData): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// 必須フィールドの検証
	if (!data.workId) {
		errors.push("作品IDが設定されていません");
	}

	if (!data.timestamp) {
		errors.push("タイムスタンプが設定されていません");
	}

	if (!data.date || !data.time) {
		errors.push("日付または時刻が正しく設定されていません");
	}

	// 価格情報の検証
	const priceValues = Object.values(data.regionalPrices);
	const hasValidPrice = priceValues.some((price) => price > 0);
	if (!hasValidPrice) {
		errors.push("有効な価格情報が設定されていません");
	}

	// 割引率の検証
	if (data.discountRate < 0 || data.discountRate > 100) {
		errors.push("割引率が無効な範囲です（0-100%）");
	}

	// 評価の検証
	if (data.ratingAverage !== undefined && (data.ratingAverage < 0 || data.ratingAverage > 5)) {
		errors.push("評価が無効な範囲です（0-5）");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * 複数のIndividual Info APIレスポンスから時系列データの配列を生成
 */
export function mapMultipleIndividualInfoToTimeSeries(
	apiResponses: IndividualInfoAPIResponse[],
	baseTimestamp: Date = new Date(),
): TimeSeriesRawData[] {
	return apiResponses
		.map((response, index) => {
			// 各レスポンスに少しずつタイムスタンプをずらして重複を防ぐ
			const timestamp = new Date(baseTimestamp.getTime() + index * 1000); // 1秒ずつずらし
			return mapIndividualInfoToTimeSeriesData(response, timestamp);
		})
		.filter((data) => validateTimeSeriesData(data).isValid);
}

/**
 * 6地域通貨での価格変化を検出
 */
export function detectPriceChanges(
	previousData: TimeSeriesRawData,
	currentData: TimeSeriesRawData,
): {
	hasChanges: boolean;
	changes: Array<{
		currency: keyof RegionalPrice;
		previousPrice: number;
		currentPrice: number;
		changePercentage: number;
	}>;
} {
	const changes: Array<{
		currency: keyof RegionalPrice;
		previousPrice: number;
		currentPrice: number;
		changePercentage: number;
	}> = [];

	for (const currency of ["JP", "US", "EU", "CN", "TW", "KR"] as const) {
		const previousPrice = previousData.regionalPrices[currency];
		const currentPrice = currentData.regionalPrices[currency];

		if (previousPrice > 0 && currentPrice > 0 && previousPrice !== currentPrice) {
			const changePercentage = ((currentPrice - previousPrice) / previousPrice) * 100;
			changes.push({
				currency,
				previousPrice,
				currentPrice,
				changePercentage: Math.round(changePercentage * 100) / 100, // 小数点2桁
			});
		}
	}

	return {
		hasChanges: changes.length > 0,
		changes,
	};
}

/**
 * デバッグ用：Individual Info API レスポンスの価格関連フィールドを抽出
 */
export function debugExtractPriceFields(
	apiResponse: Record<string, unknown>,
): Record<string, unknown> {
	const priceFields = [
		"price",
		"price_without_tax",
		"official_price",
		"official_price_without_tax",
		"price_en",
		"price_eur",
		"discount_rate",
		"is_discount_work",
		"campaign_id",
		"currency_price",
		"locale_price",
	];

	const extracted: Record<string, unknown> = {};
	for (const field of priceFields) {
		if (field in apiResponse) {
			extracted[field] = apiResponse[field];
		}
	}

	return extracted;
}
