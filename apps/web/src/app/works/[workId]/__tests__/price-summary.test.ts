import type { PriceHistoryDocument } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import {
	describePriceSummary,
	describePriceSummaryPeriod,
	formatPrice,
	formatSummaryDate,
	summarizePriceHistory,
} from "../price-summary";

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

describe("formatPrice", () => {
	it("3桁区切りの円表記にする", () => {
		expect(formatPrice(1760)).toBe("¥1,760");
		expect(formatPrice(0)).toBe("¥0");
	});
});

describe("formatSummaryDate", () => {
	it("ゼロ埋めを外した和式表記にする", () => {
		expect(formatSummaryDate("2026-07-02")).toBe("2026年7月2日");
		expect(formatSummaryDate("2026-12-25")).toBe("2026年12月25日");
	});

	it("想定外の形式は壊さずそのまま返す", () => {
		expect(formatSummaryDate("2026-07")).toBe("2026-07");
		expect(formatSummaryDate("")).toBe("");
		expect(formatSummaryDate("aaaa-bb-cc")).toBe("aaaa-bb-cc");
	});
});

describe("describePriceSummary", () => {
	function summaryOf(history: Parameters<typeof summarizePriceHistory>[0]) {
		const summary = summarizePriceHistory(history);
		if (!summary) throw new Error("サマリーが作れませんでした");
		return summary;
	}

	it("セールがあった期間は最安日・最大割引率・セール日数を述べる", () => {
		const text = describePriceSummary(
			summaryOf([
				entry({ date: "2026-07-01", price: 1760 }),
				entry({ date: "2026-07-02", price: 1232, discountRate: 30 }),
				entry({ date: "2026-07-03", price: 1760 }),
			]),
		);
		expect(text).toContain("最も安かったのは2026年7月2日の¥1,232で、最大30%OFFでした。");
		expect(text).toContain("3日間のうち1日がセール価格です。");
		expect(text).toContain("現在の価格は最安値より¥528高い状態です。");
	});

	it("セールが無い期間は据え置きである旨を述べる", () => {
		const text = describePriceSummary(
			summaryOf([
				entry({ date: "2026-07-01", price: 1760 }),
				entry({ date: "2026-07-02", price: 1760 }),
			]),
		);
		expect(text).toContain("観測した2日間はセールがなく、¥1,760のまま推移しています。");
		expect(text).toContain("現在の価格は、この期間の最安値と同じです。");
	});

	it("現在が最安なら差額ではなく一致を述べる", () => {
		const text = describePriceSummary(
			summaryOf([
				entry({ date: "2026-07-01", price: 1760 }),
				entry({ date: "2026-07-02", price: 1232, discountRate: 30 }),
			]),
		);
		expect(text).toContain("現在の価格は、この期間の最安値と同じです。");
		expect(text).not.toContain("高い状態です");
	});

	it("期間のリード文に作品名と観測日数が入る", () => {
		const text = describePriceSummaryPeriod(
			summaryOf([
				entry({ date: "2026-07-01", price: 1760 }),
				entry({ date: "2026-07-31", price: 1760 }),
			]),
			"テスト作品",
		);
		expect(text).toBe(
			"2026年7月1日〜2026年7月31日の2日間、当サイトが記録した「テスト作品」の価格です。",
		);
	});
});
