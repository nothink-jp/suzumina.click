import type { WorkDocument } from "@suzumina.click/shared-types";
import { describe, expect, it, vi } from "vitest";
import { generateDataQualityReport, generateWorksStats } from "../work-statistics";

vi.mock("@/lib/logger", () => ({
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
}));

const work = (over: Partial<WorkDocument>): WorkDocument => over as WorkDocument;

const works: WorkDocument[] = [
	work({
		category: "SOU",
		price: { current: 1000 } as never,
		rating: { stars: 4 } as never,
		genres: ["癒し", "ASMR"],
		creators: { voice_by: [{ name: "声優A" }] } as never,
		highResImageUrl: "http://img/h.jpg",
		dataSources: { searchResult: {}, infoAPI: {} } as never,
	}),
	work({
		category: "SOU",
		price: { current: 2000 } as never,
		rating: { stars: 2 } as never,
		genres: ["癒し"],
		creators: {
			voice_by: [{ name: "声優A" }, { name: "声優B" }],
			scenario_by: [{ name: "脚本" }],
		} as never,
	}),
	work({ category: "GAM", price: { current: 3000 } as never, genres: ["ゲーム"] }),
];

describe("generateWorksStats", () => {
	it("overview を集計する（平均価格は四捨五入）", async () => {
		const stats = await generateWorksStats(works);
		expect(stats.overview.totalWorks).toBe(3);
		expect(stats.overview.totalValue).toBe(6000);
		expect(stats.overview.averagePrice).toBe(2000);
	});

	it("カテゴリ別に集計し平均を算出する", async () => {
		const stats = await generateWorksStats(works);
		expect(stats.byCategory.SOU?.count).toBe(2);
		expect(stats.byCategory.SOU?.averagePrice).toBe(1500);
		expect(stats.byCategory.SOU?.averageRating).toBe(3); // (4+2)/2
		expect(stats.byCategory.GAM?.count).toBe(1);
	});

	it("人気タグ・人気声優を出現数の降順で返す", async () => {
		const stats = await generateWorksStats(works);
		expect(stats.trends.popularTags[0]).toEqual({ tag: "癒し", count: 2 });
		expect(stats.trends.popularVoiceActors[0]).toEqual({ voiceActor: "声優A", count: 2 });
	});
});

describe("generateDataQualityReport", () => {
	it("各品質指標とパーセンテージを集計する", () => {
		const report = generateDataQualityReport(works);
		expect(report.total).toBe(3);
		expect(report.hasHighResImage).toBe(1);
		expect(report.hasVoiceActors).toBe(2);
		expect(report.hasDetailedCreators).toBe(1); // scenario_by を持つ 1 件
		expect(report.hasRating).toBe(2);
		expect(report.hasGenres).toBe(3);
		expect(report.hasDataSources).toBe(1);
		expect(report.dataSourceCoverage.searchResultAndInfoAPI).toBe(1); // searchResult & infoAPI
		expect(report.percentages.hasGenres).toBe(100);
		expect(report.percentages.hasHighResImage).toBe(33); // round(1/3*100)
	});
});
