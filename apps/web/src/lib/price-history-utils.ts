import type { PriceHistoryDocument } from "@suzumina.click/shared-types";

/**
 * 価格統計情報を計算
 * @param priceHistory 価格履歴データ
 * @returns 価格統計情報
 */
export function calculatePriceStatistics(priceHistory: PriceHistoryDocument[]) {
	if (priceHistory.length === 0) {
		return {
			minPrice: 0,
			maxPrice: 0,
			currentPrice: 0,
			avgPrice: 0,
			totalDataPoints: 0,
			priceChangeCount: 0,
			campaignCount: 0,
		};
	}

	const prices = priceHistory.map((h) => h.regularPrice);
	const discountPrices = priceHistory
		.filter((h) => h.discountPrice !== undefined)
		.map((h) => h.discountPrice as number);

	const allPrices = [...prices, ...discountPrices];
	const minPrice = Math.min(...allPrices);
	const maxPrice = Math.max(...allPrices);
	const currentPrice = priceHistory[priceHistory.length - 1]?.regularPrice || 0;
	const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);

	const priceChangeCount = priceHistory.filter((h) => h.priceChanged).length;
	const campaignCount = priceHistory.filter((h) => h.newCampaign).length;

	return {
		minPrice,
		maxPrice,
		currentPrice,
		avgPrice,
		totalDataPoints: priceHistory.length,
		priceChangeCount,
		campaignCount,
	};
}
