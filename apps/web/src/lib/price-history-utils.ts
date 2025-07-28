import type { PriceHistoryDocument } from "@suzumina.click/shared-types";

// 通貨コードとロケールコードのマッピング
const CURRENCY_TO_LOCALE_MAP: Record<string, string> = {
	USD: "en_US",
	EUR: "de_DE",
	CNY: "zh_CN",
	TWD: "zh_TW",
	KRW: "ko_KR",
};

/**
 * 価格統計情報を計算
 * @param priceHistory 価格履歴データ
 * @param currency 表示通貨
 * @returns 価格統計情報
 */
export function calculatePriceStatistics(
	priceHistory: PriceHistoryDocument[],
	currency: "JPY" | "USD" | "EUR" | "CNY" | "TWD" | "KRW" = "JPY",
) {
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

	// 日本円の実際の販売価格を取得
	const getJPYPrice = (history: PriceHistoryDocument): number | null => {
		// データが欠損している場合
		if (history.price === null || history.officialPrice === null) {
			return null;
		}
		// セール中なら price（セール価格）、そうでなければ officialPrice（定価）
		return history.discountRate > 0 ? history.price : history.officialPrice;
	};

	// 国際通貨の実際の販売価格を取得
	const getInternationalPrice = (
		history: PriceHistoryDocument,
		localeCode: string,
	): number | null => {
		if (history.discountRate > 0) {
			// セール中ならセール価格
			const salePrice = history.localePrice?.[localeCode];
			return salePrice !== undefined ? salePrice : null;
		}
		// セールでなければ定価
		const officialPrice = history.localeOfficialPrice?.[localeCode];
		return officialPrice !== undefined ? officialPrice : null;
	};

	// 通貨別の実際の販売価格を取得（セール中ならセール価格、そうでなければ定価）
	const getActualPriceForCurrency = (history: PriceHistoryDocument): number | null => {
		if (currency === "JPY") {
			return getJPYPrice(history);
		}
		const localeCode = CURRENCY_TO_LOCALE_MAP[currency];
		if (!localeCode) return null;
		return getInternationalPrice(history, localeCode);
	};

	// 実際の販売価格（セール価格または定価）のリストを作成（nullを除外）
	const actualPricesWithNull = priceHistory.map((h) => getActualPriceForCurrency(h));
	const actualPrices = actualPricesWithNull.filter((p): p is number => p !== null);

	// 有効な価格データがない場合
	if (actualPrices.length === 0) {
		return {
			minPrice: 0,
			maxPrice: 0,
			currentPrice: 0,
			avgPrice: 0,
			totalDataPoints: priceHistory.length,
			priceChangeCount: 0,
			campaignCount: 0,
		};
	}

	// 統計計算
	const minPrice = Math.min(...actualPrices);
	const maxPrice = Math.max(...actualPrices);
	const lastHistory = priceHistory[priceHistory.length - 1];
	const lastPrice = lastHistory ? getActualPriceForCurrency(lastHistory) : null;
	const currentPrice = lastPrice !== null ? lastPrice : 0;
	const avgPrice = Math.round(actualPrices.reduce((sum, p) => sum + p, 0) / actualPrices.length);

	// 価格変更回数を計算（前日との比較）
	let priceChangeCount = 0;
	for (let i = 1; i < priceHistory.length; i++) {
		const prevHistory = priceHistory[i - 1];
		const currHistory = priceHistory[i];
		if (prevHistory && currHistory) {
			const prevPrice = getActualPriceForCurrency(prevHistory);
			const currPrice = getActualPriceForCurrency(currHistory);
			// null値はスキップ
			if (prevPrice === null || currPrice === null) {
				continue;
			}
			if (prevPrice !== currPrice) {
				priceChangeCount++;
			}
		}
	}

	// キャンペーン回数を計算（campaignIdが存在する日数）
	const campaignCount = priceHistory.filter((h) => h.campaignId !== undefined).length;

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
