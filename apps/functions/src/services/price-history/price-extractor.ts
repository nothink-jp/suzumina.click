import type { DLsiteApiResponse } from "@suzumina.click/shared-types";

/**
 * 価格データが有効かどうかを検証
 * @param apiResponse Individual Info APIレスポンス
 * @returns 有効な価格データが存在するかどうか
 */
export function isValidPriceData(apiResponse: DLsiteApiResponse): boolean {
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
