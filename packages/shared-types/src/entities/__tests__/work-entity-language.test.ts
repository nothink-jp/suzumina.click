/**
 * Work entity language detection tests
 */

import { describe, expect, it } from "vitest";
import type { WorkDocument } from "../work";
import { Work } from "../work-entity";

/**
 * Helper function to create test work data
 */
function createTestWorkData(overrides: Partial<WorkDocument> = {}): WorkDocument {
	return {
		id: "RJ000001",
		productId: "RJ000001",
		title: "Test Work",
		titleMasked: "Test Work",
		titleKana: "テストワーク",
		altName: "",
		circle: "Test Circle",
		circleId: "RG00001",
		circleEn: "Test Circle",
		description: "Test description",
		workType: "MNG",
		workTypeString: "マンガ",
		category: "MNG",
		originalCategoryText: "マンガ",
		workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ000001.html",
		thumbnailUrl: "https://img.dlsite.jp/modpub/images2/work/doujin/RJ001000/RJ000001_img_main.jpg",
		highResImageUrl:
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ001000/RJ000001_img_main.jpg",
		salesStatus: {
			isSale: true,
			isDiscount: false,
			isFree: false,
			isSoldOut: false,
			isReserveWork: false,
			dlsiteplayWork: false,
		},
		price: {
			current: 1000,
			original: 1000,
			currency: "JPY",
			discount: 0,
			point: 100,
			isFreeOrMissingPrice: false,
		},
		rating: {
			stars: 4.5,
			count: 10,
			reviewCount: 10,
			averageDecimal: 4.5,
		},
		releaseDate: "2024-01-01T00:00:00.000Z",
		ageCategory: 3,
		genres: [],
		customGenres: [],
		sampleImages: [],
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
		lastFetchedAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("Work Entity - Language Detection", () => {
	describe("getPrimaryLanguage", () => {
		it("should detect Thai language for RJ01425328 when it's in languageDownloads", () => {
			const workData = createTestWorkData({
				id: "RJ01425328",
				productId: "RJ01425328",
				title: "Test Thai Work",
				languageDownloads: [
					{
						lang: "JPN",
						workno: "RJ01304475",
						dlCount: "1000",
						label: "日本語",
						displayLabel: "日本語",
						displayOrder: 1,
						editionId: 32825,
						editionType: "language",
					},
					{
						lang: "THA",
						workno: "RJ01425328",
						dlCount: "100",
						label: "タイ語",
						displayLabel: "タイ語",
						displayOrder: 25,
						editionId: 32825,
						editionType: "language",
					},
				],
			});

			const work = Work.fromFirestoreData(workData);
			if (!work) throw new Error("Failed to create work entity");
			const plainObject = work.toPlainObject();

			expect(plainObject._computed?.primaryLanguage).toBe("th");
		});

		it("should detect Japanese language when workId matches first entry", () => {
			const workData = createTestWorkData({
				id: "RJ01304475",
				productId: "RJ01304475",
				title: "Test Japanese Work",
				languageDownloads: [
					{
						lang: "JPN",
						workno: "RJ01304475",
						dlCount: "1000",
						label: "日本語",
						displayLabel: "日本語",
						displayOrder: 1,
						editionId: 32825,
						editionType: "language",
					},
					{
						lang: "THA",
						workno: "RJ01425328",
						dlCount: "100",
						label: "タイ語",
						displayLabel: "タイ語",
						displayOrder: 25,
						editionId: 32825,
						editionType: "language",
					},
				],
			});

			const work = Work.fromFirestoreData(workData);
			if (!work) throw new Error("Failed to create work entity");
			const plainObject = work.toPlainObject();

			expect(plainObject._computed?.primaryLanguage).toBe("ja");
		});

		it("should fall back to first language when workId doesn't match any entry", () => {
			const workData = createTestWorkData({
				id: "RJ99999999",
				productId: "RJ99999999",
				title: "Test Unknown Work",
				languageDownloads: [
					{
						lang: "ENG",
						workno: "RJ01304475",
						dlCount: "1000",
						label: "英語",
						displayLabel: "英語",
						displayOrder: 1,
						editionId: 32825,
						editionType: "language",
					},
					{
						lang: "THA",
						workno: "RJ01425328",
						dlCount: "100",
						label: "タイ語",
						displayLabel: "タイ語",
						displayOrder: 25,
						editionId: 32825,
						editionType: "language",
					},
				],
			});

			const work = Work.fromFirestoreData(workData);
			if (!work) throw new Error("Failed to create work entity");
			const plainObject = work.toPlainObject();

			expect(plainObject._computed?.primaryLanguage).toBe("en");
		});

		it("should detect language from title when no languageDownloads", () => {
			const workData = createTestWorkData({
				title: "Test Work 繁体中文版",
			});

			const work = Work.fromFirestoreData(workData);
			if (!work) throw new Error("Failed to create work entity");
			const plainObject = work.toPlainObject();

			expect(plainObject._computed?.primaryLanguage).toBe("zh-tw");
		});

		it("should handle various language codes correctly", () => {
			const testCases = [
				{ code: "JPN", expected: "ja" },
				{ code: "日本語", expected: "ja" },
				{ code: "ENG", expected: "en" },
				{ code: "英語", expected: "en" },
				{ code: "THA", expected: "th" },
				{ code: "タイ語", expected: "th" },
				{ code: "KOR", expected: "ko" },
				{ code: "한국어", expected: "ko" },
				{ code: "簡体中文", expected: "zh-cn" },
				{ code: "繁體中文", expected: "zh-tw" },
			];

			for (const testCase of testCases) {
				const workData = createTestWorkData({
					id: "RJ123456",
					languageDownloads: [
						{
							lang: testCase.code,
							workno: "RJ123456",
							dlCount: "100",
							label: testCase.code,
							displayLabel: testCase.code,
							displayOrder: 1,
							editionId: 1,
							editionType: "language",
						},
					],
				});

				const work = Work.fromFirestoreData(workData);
				if (!work) throw new Error("Failed to create work entity");
				const plainObject = work.toPlainObject();

				expect(plainObject._computed?.primaryLanguage).toBe(testCase.expected);
			}
		});
	});

	describe("getAvailableLanguages", () => {
		it("should list all available languages from languageDownloads", () => {
			const workData = createTestWorkData({
				languageDownloads: [
					{
						lang: "JPN",
						workno: "RJ01304475",
						dlCount: "1000",
						label: "日本語",
						displayLabel: "日本語",
						displayOrder: 1,
						editionId: 32825,
						editionType: "language",
					},
					{
						lang: "ENG",
						workno: "RJ01304476",
						dlCount: "500",
						label: "英語",
						displayLabel: "英語",
						displayOrder: 2,
						editionId: 32825,
						editionType: "language",
					},
					{
						lang: "THA",
						workno: "RJ01425328",
						dlCount: "100",
						label: "タイ語",
						displayLabel: "タイ語",
						displayOrder: 25,
						editionId: 32825,
						editionType: "language",
					},
				],
			});

			const work = Work.fromFirestoreData(workData);
			if (!work) throw new Error("Failed to create work entity");
			const plainObject = work.toPlainObject();

			expect(plainObject._computed?.availableLanguages).toContain("ja");
			expect(plainObject._computed?.availableLanguages).toContain("en");
			expect(plainObject._computed?.availableLanguages).toContain("th");
			expect(plainObject._computed?.availableLanguages).toHaveLength(3);
		});

		it("should handle unknown language codes", () => {
			const workData = createTestWorkData({
				languageDownloads: [
					{
						lang: "UNKNOWN",
						workno: "RJ123456",
						dlCount: "100",
						label: "Unknown",
						displayLabel: "Unknown",
						displayOrder: 1,
						editionId: 1,
						editionType: "language",
					},
				],
			});

			const work = Work.fromFirestoreData(workData);
			if (!work) throw new Error("Failed to create work entity");
			const plainObject = work.toPlainObject();

			expect(plainObject._computed?.availableLanguages).toContain("other");
		});
	});
});
