import type { IndividualInfoAPIResponse } from "../dlsite/individual-info-to-work-mapper";

/**
 * locale_priceからJPY価格を抽出
 */
function extractJPYFromLocalePrice(apiResponse: IndividualInfoAPIResponse): number | undefined {
	if (Array.isArray(apiResponse.locale_price)) {
		// 配列の場合（型定義に従う）
		const jpyEntry = apiResponse.locale_price.find(
			(entry) => entry.currency === "JPY" || entry.currency === "ja_JP",
		);
		return jpyEntry?.price;
	}

	if (typeof apiResponse.locale_price === "object" && apiResponse.locale_price !== null) {
		// オブジェクトの場合（実際のレスポンス）
		const localePriceObj = apiResponse.locale_price as Record<string, number>;
		return localePriceObj.ja_JP || localePriceObj.JPY;
	}

	return undefined;
}

/**
 * 価格タイプに応じて適切な価格を返す
 */
function getPriceByType(
	price: number,
	priceType: "regular" | "discount",
	apiResponse: IndividualInfoAPIResponse,
): number {
	if (priceType === "discount") {
		// セール価格の場合は、既にセール適用済みの価格をそのまま返す
		return price;
	}

	// 定価の場合、セール中なら official_price を使用
	const discountRate = apiResponse.discount_rate || 0;
	if (discountRate > 0 && apiResponse.official_price) {
		return apiResponse.official_price;
	}
	return price;
}

/**
 * Individual Info APIレスポンスからJPY価格を抽出
 * @param apiResponse Individual Info APIレスポンス
 * @param priceType 価格タイプ（'regular' | 'discount'）
 * @returns JPY価格
 */
export function extractJPYPrice(
	apiResponse: IndividualInfoAPIResponse,
	priceType: "regular" | "discount",
): number {
	// locale_priceからJPY価格を抽出
	const jpyPrice = extractJPYFromLocalePrice(apiResponse);
	if (jpyPrice !== undefined) {
		return getPriceByType(jpyPrice, priceType, apiResponse);
	}

	// フォールバック: 直接価格を使用
	const price = apiResponse.price || 0;
	return getPriceByType(price, priceType, apiResponse);
}

/**
 * 価格データが有効かどうかを検証
 * @param apiResponse Individual Info APIレスポンス
 * @returns 有効な価格データが存在するかどうか
 */
export function isValidPriceData(apiResponse: IndividualInfoAPIResponse): boolean {
	// 直接価格フィールドをチェック
	const hasDirectPrice = typeof apiResponse.price === "number" && apiResponse.price >= 0;

	// locale_priceをチェック（配列またはオブジェクト）
	const hasLocalePrices =
		(Array.isArray(apiResponse.locale_price) && apiResponse.locale_price.length > 0) ||
		(typeof apiResponse.locale_price === "object" &&
			apiResponse.locale_price !== null &&
			Object.keys(apiResponse.locale_price).length > 0);

	return hasDirectPrice || hasLocalePrices;
}

/**
 * セール中かどうかを判定
 * @param apiResponse Individual Info APIレスポンス
 * @returns セール中かどうか
 */
export function isOnSale(apiResponse: IndividualInfoAPIResponse): boolean {
	const discountRate = apiResponse.discount_rate || 0;
	return discountRate > 0;
}

/**
 * 最安価格を計算
 * @param apiResponse Individual Info APIレスポンス
 * @returns 最安価格（セール中の場合はセール価格、そうでなければ定価）
 */
export function calculateLowestPrice(apiResponse: IndividualInfoAPIResponse): number {
	const regularPrice = extractJPYPrice(apiResponse, "regular");
	if (isOnSale(apiResponse)) {
		return extractJPYPrice(apiResponse, "discount");
	}
	return regularPrice;
}
