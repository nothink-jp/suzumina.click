import type { Price, PriceHistoryEntry } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { PriceCalculationService } from "../price-calculation-service";

describe("PriceCalculationService", () => {
	describe("calculateDiscountPrice", () => {
		it("should calculate discounted price correctly", () => {
			expect(PriceCalculationService.calculateDiscountPrice(1000, 20)).toBe(800);
			expect(PriceCalculationService.calculateDiscountPrice(2500, 50)).toBe(1250);
			expect(PriceCalculationService.calculateDiscountPrice(999, 33)).toBe(669);
		});

		it("should throw error for invalid discount rate", () => {
			expect(() => PriceCalculationService.calculateDiscountPrice(1000, -10)).toThrow();
			expect(() => PriceCalculationService.calculateDiscountPrice(1000, 101)).toThrow();
		});

		it("should handle edge cases", () => {
			expect(PriceCalculationService.calculateDiscountPrice(1000, 0)).toBe(1000);
			expect(PriceCalculationService.calculateDiscountPrice(1000, 100)).toBe(0);
		});
	});

	describe("calculatePointRate", () => {
		it("should calculate point rate correctly", () => {
			expect(PriceCalculationService.calculatePointRate(1000, 100)).toBe(10);
			expect(PriceCalculationService.calculatePointRate(2500, 250)).toBe(10);
			expect(PriceCalculationService.calculatePointRate(1000, 33)).toBe(3);
		});

		it("should handle zero price", () => {
			expect(PriceCalculationService.calculatePointRate(0, 100)).toBe(0);
			expect(PriceCalculationService.calculatePointRate(-100, 10)).toBe(0);
		});
	});

	describe("calculateEffectivePrice", () => {
		it("should calculate effective price with points", () => {
			const price: Price = {
				amount: 1000,
				currency: "JPY",
				point: 100,
			};
			expect(PriceCalculationService.calculateEffectivePrice(price)).toBe(900);
		});

		it("should handle price without points", () => {
			const price: Price = {
				amount: 1000,
				currency: "JPY",
			};
			expect(PriceCalculationService.calculateEffectivePrice(price)).toBe(1000);
		});

		it("should not go below zero", () => {
			const price: Price = {
				amount: 100,
				currency: "JPY",
				point: 200,
			};
			expect(PriceCalculationService.calculateEffectivePrice(price)).toBe(0);
		});
	});

	describe("price history analysis", () => {
		const mockHistory: PriceHistoryEntry[] = [
			{
				date: "2024-01-01",
				price: { amount: 1000, currency: "JPY" },
			},
			{
				date: "2024-01-02",
				price: { amount: 800, currency: "JPY", discount: 20 },
			},
			{
				date: "2024-01-03",
				price: { amount: 1200, currency: "JPY" },
			},
		];

		it("should find lowest price from history", () => {
			const lowest = PriceCalculationService.getLowestPriceFromHistory(mockHistory);
			expect(lowest?.amount).toBe(800);
		});

		it("should find highest price from history", () => {
			const highest = PriceCalculationService.getHighestPriceFromHistory(mockHistory);
			expect(highest?.amount).toBe(1200);
		});

		it("should calculate average price", () => {
			const average = PriceCalculationService.calculateAveragePrice(mockHistory);
			expect(average).toBe(1000); // (1000 + 800 + 1200) / 3
		});

		it("should handle empty history", () => {
			expect(PriceCalculationService.getLowestPriceFromHistory([])).toBeUndefined();
			expect(PriceCalculationService.getHighestPriceFromHistory([])).toBeUndefined();
			expect(PriceCalculationService.calculateAveragePrice([])).toBe(0);
		});
	});

	describe("campaign detection", () => {
		it("should detect campaign period", () => {
			const entry: PriceHistoryEntry = {
				date: "2024-01-01",
				price: { amount: 800, currency: "JPY", discount: 20 },
				campaign: { name: "Summer Sale", discountRate: 20 },
			};
			expect(PriceCalculationService.isInCampaign(entry)).toBe(true);
		});

		it("should detect non-campaign period", () => {
			const entry: PriceHistoryEntry = {
				date: "2024-01-01",
				price: { amount: 1000, currency: "JPY" },
			};
			expect(PriceCalculationService.isInCampaign(entry)).toBe(false);
		});
	});

	describe("calculateDailyChangeRate", () => {
		const history: PriceHistoryEntry[] = [
			{
				date: "2024-01-01T00:00:00Z",
				price: { amount: 1000, currency: "JPY" },
			},
			{
				date: "2024-01-02T00:00:00Z",
				price: { amount: 900, currency: "JPY" },
			},
			{
				date: "2024-01-03T00:00:00Z",
				price: { amount: 1080, currency: "JPY" },
			},
		];

		it("should calculate daily change rate", () => {
			const rate = PriceCalculationService.calculateDailyChangeRate(
				history,
				new Date("2024-01-02"),
			);
			expect(rate).toBe(-10); // 10% decrease
		});

		it("should handle increase", () => {
			const rate = PriceCalculationService.calculateDailyChangeRate(
				history,
				new Date("2024-01-03"),
			);
			expect(rate).toBe(20); // 20% increase
		});

		it("should return undefined for first day", () => {
			const rate = PriceCalculationService.calculateDailyChangeRate(
				history,
				new Date("2024-01-01"),
			);
			expect(rate).toBeUndefined();
		});
	});

	describe("calculateDiscountPeriod", () => {
		const history: PriceHistoryEntry[] = [
			{
				date: "2024-01-01",
				price: { amount: 1000, currency: "JPY" },
			},
			{
				date: "2024-01-02",
				price: { amount: 800, currency: "JPY", discount: 20 },
			},
			{
				date: "2024-01-03",
				price: { amount: 700, currency: "JPY", discount: 30 },
			},
			{
				date: "2024-01-04",
				price: { amount: 1000, currency: "JPY" },
			},
			{
				date: "2024-01-05",
				price: { amount: 850, currency: "JPY", discount: 15 },
			},
		];

		it("should identify discount periods", () => {
			const periods = PriceCalculationService.calculateDiscountPeriod(history, 10);
			expect(periods).toHaveLength(2);
			expect(periods[0].discountRate).toBe(30); // highest discount in period
			expect(periods[1].discountRate).toBe(15);
		});

		it("should handle no discount periods", () => {
			const noDiscountHistory: PriceHistoryEntry[] = [
				{
					date: "2024-01-01",
					price: { amount: 1000, currency: "JPY" },
				},
			];
			const periods = PriceCalculationService.calculateDiscountPeriod(noDiscountHistory);
			expect(periods).toHaveLength(0);
		});
	});

	describe("validatePriceRange", () => {
		it("should validate price within range", () => {
			const price: Price = { amount: 1000, currency: "JPY" };
			expect(PriceCalculationService.validatePriceRange(price, "voice")).toBe(true);
		});

		it("should reject price outside range", () => {
			const price: Price = { amount: 50, currency: "JPY" };
			expect(PriceCalculationService.validatePriceRange(price, "voice")).toBe(false);
		});

		it("should accept unknown categories", () => {
			const price: Price = { amount: 99999, currency: "JPY" };
			expect(PriceCalculationService.validatePriceRange(price, "unknown")).toBe(true);
		});
	});

	describe("convertCurrency", () => {
		const exchangeRates = {
			JPY: 1,
			USD: 150,
			EUR: 160,
		};

		it("should convert currency correctly", () => {
			const price: Price = { amount: 1500, currency: "JPY" };
			const converted = PriceCalculationService.convertCurrency(price, "USD", exchangeRates);
			expect(converted.amount).toBe(10);
			expect(converted.currency).toBe("USD");
		});

		it("should return same price for same currency", () => {
			const price: Price = { amount: 1000, currency: "JPY" };
			const converted = PriceCalculationService.convertCurrency(price, "JPY", exchangeRates);
			expect(converted).toEqual(price);
		});

		it("should clear discount info after conversion", () => {
			const price: Price = {
				amount: 1500,
				currency: "JPY",
				original: 2000,
				discount: 25,
			};
			const converted = PriceCalculationService.convertCurrency(price, "USD", exchangeRates);
			expect(converted.original).toBeUndefined();
			expect(converted.discount).toBeUndefined();
		});
	});
});
