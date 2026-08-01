import type { PriceHistoryDocument } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { summarizePriceHistory } from "../price-summary";

function entry(overrides: Partial<PriceHistoryDocument> & { date: string }): PriceHistoryDocument {
	return {
		workId: "RJ01616204",
		capturedAt: `${overrides.date}T03:00:00.000Z`,
		price: 1760,
		officialPrice: 1760,
		localePrice: {},
		localeOfficialPrice: {},
		discountRate: 0,
		...overrides,
	};
}

describe("summarizePriceHistory", () => {
	it("最安値・最高値・セール日数・最大割引率を出す", () => {
		const summary = summarizePriceHistory([
			entry({ date: "2026-07-01", price: 1760, discountRate: 0 }),
			entry({ date: "2026-07-02", price: 1232, discountRate: 30 }),
			entry({ date: "2026-07-03", price: 1232, discountRate: 30 }),
			entry({ date: "2026-07-04", price: 1760, discountRate: 0 }),
		]);

		expect(summary).toEqual({
			observedDays: 4,
			startDate: "2026-07-01",
			endDate: "2026-07-04",
			currentPrice: 1760,
			lowestPrice: 1232,
			lowestDate: "2026-07-02",
			highestPrice: 1760,
			saleDays: 2,
			maxDiscountRate: 30,
			isCurrentlyLowest: false,
		});
	});

	it("入力順が日付順でなくても日付で並べ直す", () => {
		const summary = summarizePriceHistory([
			entry({ date: "2026-07-04", price: 1500 }),
			entry({ date: "2026-07-01", price: 1760 }),
		]);
		expect(summary?.startDate).toBe("2026-07-01");
		expect(summary?.endDate).toBe("2026-07-04");
		expect(summary?.currentPrice).toBe(1500);
	});

	it("最安値が同値なら古い方の日付を残す", () => {
		const summary = summarizePriceHistory([
			entry({ date: "2026-07-01", price: 1232, discountRate: 30 }),
			entry({ date: "2026-07-05", price: 1232, discountRate: 30 }),
			entry({ date: "2026-07-09", price: 1760 }),
		]);
		expect(summary?.lowestDate).toBe("2026-07-01");
	});

	it("現在が最安なら isCurrentlyLowest が true", () => {
		const summary = summarizePriceHistory([
			entry({ date: "2026-07-01", price: 1760 }),
			entry({ date: "2026-07-02", price: 1232, discountRate: 30 }),
		]);
		expect(summary?.isCurrentlyLowest).toBe(true);
	});

	it("price が無い日は officialPrice で代替する", () => {
		const summary = summarizePriceHistory([
			entry({ date: "2026-07-01", price: null, officialPrice: 1980 }),
		]);
		expect(summary?.currentPrice).toBe(1980);
	});

	it("price も officialPrice も無い日は集計から外す", () => {
		const summary = summarizePriceHistory([
			entry({ date: "2026-07-01", price: null, officialPrice: null }),
			entry({ date: "2026-07-02", price: 1760 }),
		]);
		expect(summary?.observedDays).toBe(1);
		expect(summary?.startDate).toBe("2026-07-02");
	});

	it("価格を取り出せる日が1日も無ければ null", () => {
		expect(
			summarizePriceHistory([entry({ date: "2026-07-01", price: null, officialPrice: null })]),
		).toBeNull();
	});

	it("空配列は null", () => {
		expect(summarizePriceHistory([])).toBeNull();
	});

	it("1日分しか無くても成立する", () => {
		const summary = summarizePriceHistory([entry({ date: "2026-07-01", price: 1760 })]);
		expect(summary).toMatchObject({
			observedDays: 1,
			lowestPrice: 1760,
			highestPrice: 1760,
			isCurrentlyLowest: true,
			saleDays: 0,
		});
	});
});
