/**
 * Price Calculation Domain Service
 *
 * 価格計算に関するビジネスロジックを集約したドメインサービス
 * ステートレスで、Priceエンティティと協調して動作
 */

import type { Price, PriceHistoryEntry } from "@suzumina.click/shared-types";
import { PriceComparison } from "@suzumina.click/shared-types";

export class PriceCalculationService {
	/**
	 * 割引率から割引後価格を計算
	 */
	static calculateDiscountPrice(originalPrice: number, discountRate: number): number {
		if (discountRate < 0 || discountRate > 100) {
			throw new Error("Discount rate must be between 0 and 100");
		}
		return Math.floor(originalPrice * (1 - discountRate / 100));
	}

	/**
	 * ポイント還元率を計算
	 */
	static calculatePointRate(price: number, points: number): number {
		if (price <= 0) return 0;
		return Math.round((points / price) * 100);
	}

	/**
	 * 実質価格を計算（ポイント還元考慮）
	 */
	static calculateEffectivePrice(price: Price): number {
		const pointValue = price.point || 0;
		return Math.max(0, price.amount - pointValue);
	}

	/**
	 * 価格履歴から最安値を取得
	 */
	static getLowestPriceFromHistory(history: PriceHistoryEntry[]): Price | undefined {
		const prices = history.map((entry) => entry.price);
		return PriceComparison.getLowest(prices);
	}

	/**
	 * 価格履歴から最高値を取得
	 */
	static getHighestPriceFromHistory(history: PriceHistoryEntry[]): Price | undefined {
		const prices = history.map((entry) => entry.price);
		return PriceComparison.getHighest(prices);
	}

	/**
	 * 価格履歴から平均価格を計算
	 */
	static calculateAveragePrice(history: PriceHistoryEntry[]): number {
		if (history.length === 0) return 0;
		const sum = history.reduce((total, entry) => total + entry.price.amount, 0);
		return Math.round(sum / history.length);
	}

	/**
	 * キャンペーン期間中かチェック
	 */
	static isInCampaign(entry: PriceHistoryEntry): boolean {
		return entry.campaign !== undefined && entry.campaign !== null;
	}

	/**
	 * 価格変動率を計算（前日比）
	 */
	static calculateDailyChangeRate(history: PriceHistoryEntry[], date: Date): number | undefined {
		const sortedHistory = [...history].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
		);

		const targetDateStr = date.toISOString().split("T")[0];
		const targetIndex = sortedHistory.findIndex(
			(entry) => entry.date.split("T")[0] === targetDateStr,
		);

		if (targetIndex <= 0 || targetIndex >= sortedHistory.length) {
			return undefined;
		}

		const previousEntry = sortedHistory[targetIndex - 1];
		const currentEntry = sortedHistory[targetIndex];
		if (!previousEntry || !currentEntry) {
			return undefined;
		}
		const previousPrice = previousEntry.price;
		const currentPrice = currentEntry.price;

		try {
			return PriceComparison.calculateChangeRate(previousPrice, currentPrice);
		} catch {
			// 通貨が異なる場合
			return undefined;
		}
	}

	/**
	 * 割引期間を計算
	 */
	static calculateDiscountPeriod(
		history: PriceHistoryEntry[],
		thresholdRate = 10,
	): { start: Date; end: Date; discountRate: number }[] {
		const periods: { start: Date; end: Date; discountRate: number }[] = [];
		let currentPeriod: { start: Date; end: Date; discountRate: number } | null = null;

		const sortedHistory = [...history].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
		);

		for (const entry of sortedHistory) {
			const discountRate = entry.price.discount || 0;

			if (discountRate >= thresholdRate) {
				if (!currentPeriod) {
					currentPeriod = {
						start: new Date(entry.date),
						end: new Date(entry.date),
						discountRate,
					};
				} else {
					currentPeriod.end = new Date(entry.date);
					if (discountRate > currentPeriod.discountRate) {
						currentPeriod.discountRate = discountRate;
					}
				}
			} else if (currentPeriod) {
				periods.push(currentPeriod);
				currentPeriod = null;
			}
		}

		if (currentPeriod) {
			periods.push(currentPeriod);
		}

		return periods;
	}

	/**
	 * 価格の妥当性を検証
	 */
	static validatePriceRange(price: Price, category: string): boolean {
		const priceRanges: Record<string, { min: number; max: number }> = {
			voice: { min: 100, max: 10000 },
			game: { min: 500, max: 15000 },
			comic: { min: 100, max: 5000 },
			// その他のカテゴリを追加
		};

		const range = priceRanges[category];
		if (!range) return true; // 未定義カテゴリは検証スキップ

		return price.amount >= range.min && price.amount <= range.max;
	}

	/**
	 * 通貨変換（簡易版）
	 * 実際の実装では為替レートAPIを使用すべき
	 */
	static convertCurrency(
		price: Price,
		targetCurrency: string,
		exchangeRates: Record<string, number>,
	): Price {
		if (price.currency === targetCurrency) {
			return price;
		}

		const fromRate = exchangeRates[price.currency] || 1;
		const toRate = exchangeRates[targetCurrency] || 1;
		// Convert to base currency (JPY=1), then to target currency
		// If USD rate is 150, it means 1 USD = 150 JPY, so divide by the rate
		const convertedAmount = Math.round((price.amount * fromRate) / toRate);

		return {
			...price,
			amount: convertedAmount,
			currency: targetCurrency,
			// 変換後は元の価格情報をクリア
			original: undefined,
			discount: undefined,
		};
	}
}
