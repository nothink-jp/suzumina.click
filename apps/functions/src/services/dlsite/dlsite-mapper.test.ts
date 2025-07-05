import type { DLsiteWorkBase, FirestoreDLsiteWorkData } from "@suzumina.click/shared-types";
import { describe, expect, it, vi } from "vitest";
import {
	extractCampaignInfo,
	extractLocalePrices,
	extractRankingInfo,
	extractVoiceActors,
	fetchWorkInfo,
	mapMultipleWorksWithInfo,
	mapToFirestoreData,
	mapToWorkBase,
	shouldUpdateWork,
	validateWorkData,
} from "./dlsite-mapper";
import type { ParsedWorkData } from "./dlsite-parser";

describe("DLsite Mapper", () => {
	describe("mapToWorkBase", () => {
		it("パースされたデータを正しくDLsiteWorkBase形式に変換できる", () => {
			const parsedData: ParsedWorkData = {
				productId: "RJ123456",
				title: "テスト作品",
				circle: "テストサークル",
				author: ["テスト作者"],
				category: "SOU",
				workUrl: "/work/=/product_id/RJ123456.html",
				thumbnailUrl: "/img_sam/RJ123456_sam.jpg",
				currentPrice: 1000,
				originalPrice: 1500,
				discount: 33,
				point: 50,
				stars: 4.5,
				ratingCount: 100,
				reviewCount: 50,
				salesCount: 1000,
				ageRating: "全年齢",
				sampleImages: [
					{ thumb: "sample1.jpg", width: 560, height: 420 },
					{ thumb: "sample2.jpg", width: 560, height: 420 },
				],
				isExclusive: true,
			};

			const result = mapToWorkBase(parsedData);

			expect(result).toEqual({
				id: "RJ123456",
				productId: "RJ123456",
				title: "テスト作品",
				circle: "テストサークル",
				description: "",
				category: "SOU",
				workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
				thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
				highResImageUrl: undefined,
				price: {
					current: 1000,
					original: 1500,
					currency: "JPY",
					discount: 33,
					point: 50,
				},
				rating: {
					stars: 4.5,
					count: 100,
					reviewCount: 50,
				},
				salesCount: 1000,
				// 統合されたクリエイター情報
				voiceActors: ["テスト作者"],
				scenario: [],
				illustration: [],
				music: [],
				design: [],
				otherCreators: {},
				// 統合された作品情報
				releaseDate: undefined,
				seriesName: undefined,
				ageRating: "全年齢",
				workFormat: undefined,
				fileFormat: undefined,
				tags: [],
				userEvaluationCount: 0,
				sampleImages: [
					{
						thumb: "https://www.dlsite.com/sample1.jpg",
						width: 560,
						height: 420,
					},
					{
						thumb: "https://www.dlsite.com/sample2.jpg",
						width: 560,
						height: 420,
					},
				],
				isExclusive: true,
				// 最小限の基本情報（重複除去済み）
				basicInfo: {
					detailTags: [],
					other: {},
				},
			});
		});

		it("評価情報がない場合はundefinedになる", () => {
			const parsedData: ParsedWorkData = {
				productId: "RJ123456",
				title: "テスト作品",
				circle: "テストサークル",
				author: ["テスト作者"],
				category: "SOU",
				workUrl: "/work/=/product_id/RJ123456.html",
				thumbnailUrl: "/img_sam/RJ123456_sam.jpg",
				currentPrice: 1000,
				originalPrice: 1500,
				discount: 33,
				point: 50,
				stars: 0,
				ratingCount: 0,
				salesCount: 1000,
				ageRating: "全年齢",
				sampleImages: [],
				isExclusive: false,
			};

			const result = mapToWorkBase(parsedData);

			expect(result.rating).toBeUndefined();
			// 統合されたフィールドが正しく設定されていることを確認
			expect(result.voiceActors).toEqual(["テスト作者"]);
			expect(result.scenario).toEqual([]);
			expect(result.illustration).toEqual([]);
			expect(result.music).toEqual([]);
			expect(result.design).toEqual([]);
			expect(result.basicInfo).toEqual({ detailTags: [], other: {} });
		});
	});

	describe("mapToFirestoreData", () => {
		it("DLsiteWorkBaseをFirestore用データに変換できる", () => {
			const workBase: DLsiteWorkBase = {
				id: "RJ123456",
				productId: "RJ123456",
				title: "テスト作品",
				circle: "テストサークル",
				description: "",
				category: "SOU",
				workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
				thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
				price: {
					current: 1000,
					original: 1500,
					currency: "JPY",
					discount: 33,
					point: 50,
				},
				rating: {
					stars: 4.5,
					count: 100,
					reviewCount: 50,
				},
				salesCount: 1000,
				// 統合されたクリエイター情報
				voiceActors: ["テスト作者"],
				scenario: [],
				illustration: [],
				music: [],
				design: [],
				otherCreators: {},
				// 統合された作品情報
				ageRating: "全年齢",
				tags: [],
				userEvaluationCount: 0,
				sampleImages: [
					{
						thumb: "https://www.dlsite.com/sample1.jpg",
						width: 560,
						height: 420,
					},
				],
				isExclusive: true,
				// 最小限の基本情報
				basicInfo: {
					detailTags: [],
					other: {},
				},
			};

			const result = mapToFirestoreData(workBase);

			expect(result).toMatchObject(workBase);
			expect(result.lastFetchedAt).toBeDefined();
			expect(result.createdAt).toBeDefined();
			expect(result.updatedAt).toBeDefined();
			expect(typeof result.lastFetchedAt).toBe("string");
			expect(typeof result.createdAt).toBe("string");
			expect(typeof result.updatedAt).toBe("string");
		});
	});

	describe("shouldUpdateWork", () => {
		const baseExisting: FirestoreDLsiteWorkData = {
			id: "RJ123456",
			productId: "RJ123456",
			title: "テスト作品",
			circle: "テストサークル",
			description: "",
			category: "SOU",
			workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
			thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
			price: {
				current: 1000,
				original: 1500,
				currency: "JPY",
				discount: 33,
				point: 50,
			},
			rating: {
				stars: 4.5,
				count: 100,
				reviewCount: 50,
			},
			salesCount: 1000,
			// 統合されたクリエイター情報
			voiceActors: ["テスト作者"],
			scenario: [],
			illustration: [],
			music: [],
			design: [],
			otherCreators: {},
			// 統合された作品情報
			ageRating: "全年齢",
			tags: [],
			userEvaluationCount: 0,
			sampleImages: [],
			isExclusive: false,
			// 最小限の基本情報
			basicInfo: {
				detailTags: [],
				other: {},
			},
			lastFetchedAt: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		it("価格が変更された場合はtrueを返す", () => {
			const newData: DLsiteWorkBase = {
				...baseExisting,
				price: {
					...baseExisting.price,
					current: 800,
				},
			};

			const result = shouldUpdateWork(newData, baseExisting);
			expect(result).toBe(true);
		});

		it("変更がない場合はfalseを返す", () => {
			const newData: DLsiteWorkBase = { ...baseExisting };

			const result = shouldUpdateWork(newData, baseExisting);
			expect(result).toBe(false);
		});
	});

	describe("validateWorkData", () => {
		it("有効なデータに対してisValid=trueを返す", () => {
			const validWork: DLsiteWorkBase = {
				id: "RJ123456",
				productId: "RJ123456",
				title: "テスト作品",
				circle: "テストサークル",
				description: "",
				category: "SOU",
				workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
				thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
				price: {
					current: 1000,
					original: 1500,
					currency: "JPY",
					discount: 33,
					point: 50,
				},
				rating: {
					stars: 4.5,
					count: 100,
					reviewCount: 50,
				},
				salesCount: 1000,
				// 統合されたクリエイター情報
				voiceActors: ["テスト作者"],
				scenario: [],
				illustration: [],
				music: [],
				design: [],
				otherCreators: {},
				// 統合された作品情報
				ageRating: "全年齢",
				tags: [],
				userEvaluationCount: 0,
				sampleImages: [],
				isExclusive: false,
				// 最小限の基本情報
				basicInfo: {
					detailTags: [],
					other: {},
				},
			};

			const result = validateWorkData(validWork);

			expect(result.isValid).toBe(true);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe("fetchWorkInfo", () => {
		it("有効な作品IDでinfo APIからデータを取得できる", async () => {
			const mockResponse = {
				work_name: "テスト作品",
				maker_name: "テストサークル",
				dl_count: 5000,
				wishlist_count: 150,
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await fetchWorkInfo("RJ123456");

			expect(result).toBeDefined();
			expect(result?.work_name).toBe("テスト作品");
			expect(result?.dl_count).toBe(5000);
		});

		it("APIエラーの場合はnullを返す", async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

			const result = await fetchWorkInfo("RJ123456");

			expect(result).toBeNull();
		});
	});

	describe("extractVoiceActors", () => {
		it("声優情報を正しく抽出できる", () => {
			const infoData = {
				voice_actors: ["声優1", "声優2", "声優3"],
			} as any;

			const result = extractVoiceActors(infoData);

			expect(result).toEqual(["声優1", "声優2", "声優3"]);
		});

		it("声優情報がない場合は空配列を返す", () => {
			const infoData = {} as any;

			const result = extractVoiceActors(infoData);

			expect(result).toEqual([]);
		});
	});

	describe("extractRankingInfo", () => {
		it("ランキング情報を正しく抽出できる", () => {
			const infoData = {
				rank: [
					{
						term: "day",
						category: "all",
						rank: 15,
					},
					{
						term: "week",
						category: "voice",
						rank: 5,
					},
				],
			} as any;

			const result = extractRankingInfo(infoData);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				term: "day",
				category: "all",
				rank: 15,
			});
			expect(result[1]).toEqual({
				term: "week",
				category: "voice",
				rank: 5,
			});
		});

		it("ランキング情報がない場合は空配列を返す", () => {
			const infoData = {} as any;

			const result = extractRankingInfo(infoData);

			expect(result).toEqual([]);
		});
	});

	describe("extractLocalePrices", () => {
		it("多通貨価格情報を正しく抽出できる", () => {
			const infoData = {
				prices: [
					{
						currency: "JPY",
						price: 1000,
						price_string: "1,000円",
					},
					{
						currency: "USD",
						price: 10,
						price_string: "$10.00",
					},
				],
			} as any;

			const result = extractLocalePrices(infoData);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				currency: "JPY",
				price: 1000,
				priceString: "1,000円",
			});
			expect(result[1]).toEqual({
				currency: "USD",
				price: 10,
				priceString: "$10.00",
			});
		});

		it("価格情報がない場合は空配列を返す", () => {
			const infoData = {} as any;

			const result = extractLocalePrices(infoData);

			expect(result).toEqual([]);
		});
	});

	describe("extractCampaignInfo", () => {
		it("キャンペーン情報を正しく抽出できる", () => {
			const infoData = {
				campaign: {
					campaign_id: "CAMP123",
					discount_campaign_id: "DISC456",
					discount_end_date: "2023-12-31 23:59:59",
					discount_url: "https://example.com/discount",
				},
			} as any;

			const result = extractCampaignInfo(infoData);

			expect(result).toEqual({
				campaignId: "CAMP123",
				discountCampaignId: "DISC456",
				discountEndDate: "2023-12-31 23:59:59",
				discountUrl: "https://example.com/discount",
			});
		});

		it("キャンペーン情報がない場合はundefinedを返す", () => {
			const infoData = {} as any;

			const result = extractCampaignInfo(infoData);

			expect(result).toBeUndefined();
		});
	});

	describe("mapMultipleWorksWithInfo", () => {
		it("HTMLデータとinfoデータを統合して変換できる", async () => {
			const parsedWorks: ParsedWorkData[] = [
				{
					productId: "RJ123456",
					title: "テスト作品",
					circle: "テストサークル",
					author: ["テスト作者"],
					category: "SOU",
					workUrl: "/work/=/product_id/RJ123456.html",
					thumbnailUrl: "/img_sam/RJ123456_sam.jpg",
					currentPrice: 1000,
					salesCount: 1000,
					ageRating: "全年齢",
					sampleImages: [],
					isExclusive: false,
				},
			];

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					dl_count: 5000,
					wishlist_count: 150,
					rate_count: 100,
					rate_average_2dp: 4.25,
				}),
			});

			const result = await mapMultipleWorksWithInfo(parsedWorks);

			expect(result).toHaveLength(1);
			expect(result[0].productId).toBe("RJ123456");
			// 統合されたフィールドが正しく設定されていることを確認
			expect(result[0].voiceActors).toEqual(["テスト作者"]);
			// 最適化構造ではbasicInfoは詳細データがある場合のみ設定される
			expect(result[0].basicInfo).toBeUndefined();
		});

		it("info APIエラーでもHTMLデータで処理を継続できる", async () => {
			const parsedWorks: ParsedWorkData[] = [
				{
					productId: "RJ123456",
					title: "テスト作品",
					circle: "テストサークル",
					author: ["テスト作者"],
					category: "SOU",
					workUrl: "/work/=/product_id/RJ123456.html",
					thumbnailUrl: "/img_sam/RJ123456_sam.jpg",
					currentPrice: 1000,
					salesCount: 1000,
					ageRating: "全年齢",
					sampleImages: [],
					isExclusive: false,
				},
			];

			global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

			const result = await mapMultipleWorksWithInfo(parsedWorks);

			expect(result).toHaveLength(1);
			expect(result[0].productId).toBe("RJ123456");
			// 統合されたフィールドが正しく設定されていることを確認
			expect(result[0].voiceActors).toEqual(["テスト作者"]);
			// 最適化構造ではbasicInfoは詳細データがある場合のみ設定される
			expect(result[0].basicInfo).toBeUndefined();
		});
	});
});
