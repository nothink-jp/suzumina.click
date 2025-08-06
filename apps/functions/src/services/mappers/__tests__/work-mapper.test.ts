/**
 * Work Mapper テスト
 *
 * 薄いマッピング層の動作確認
 */

import type { DLsiteApiResponse } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { WorkMapper } from "../work-mapper";

// Domain Service のモックは不要になった（直接APIデータを使用）

describe("WorkMapper", () => {
	const mockRawApiData: DLsiteApiResponse = {
		workno: "RJ12345678",
		product_id: "RJ12345678",
		work_name: "テスト作品",
		maker_name: "テストサークル",
		maker_id: "RG99999",

		price: 1100,
		official_price: 1100,
		discount_rate: 0,

		rate_average_star: 4.5,
		rate_count: 100,
		rate_count_detail: {
			"1": 10,
			"2": 0,
			"3": 10,
			"4": 30,
			"5": 60,
		},

		regist_date: "2024-01-15",
		age_category: 3,
		work_type: "SOU",
		work_type_string: "音声作品",

		genres: [
			{ id: "1", name: "ASMR", search_val: "asmr" },
			{ id: "2", name: "バイノーラル", search_val: "binaural" },
		],

		creaters: {
			voice_by: [
				{ id: "cv001", name: "声優A" },
				{ id: "cv002", name: "声優B" },
			],
			scenario_by: [{ id: "sc001", name: "シナリオライター" }],
		},

		image_thum: "//img.dlsite.jp/modpub/images2/work/doujin/RJ12345678_img_thum.jpg",
		image_main: "//img.dlsite.jp/modpub/images2/work/doujin/RJ12345678_img_main.jpg",
	};

	describe("toWork", () => {
		it("基本的な作品情報を正しくマッピングできる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.id).toBe("RJ12345678");
			expect(work.productId).toBe("RJ12345678");
			expect(work.title).toBe("テスト作品");
			expect(work.circle).toBe("テストサークル");
			expect(work.circleId).toBe("RG99999");
		});

		it("作品カテゴリを正しくマッピングできる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.category).toBe("SOU");
			expect(work.originalCategoryText).toBe("音声作品");
		});

		it("URLを正しく生成できる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.workUrl).toBe("https://www.dlsite.com/maniax/work/=/product_id/RJ12345678.html");
			expect(work.thumbnailUrl).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ12345678_img_thum.jpg",
			);
			expect(work.highResImageUrl).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ12345678_img_main.jpg",
			);
		});

		it("年齢制限を正しくマッピングできる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.ageRating).toBe("R18");
		});
	});

	describe("toPrice", () => {
		it("通常価格を正しくマッピングできる", () => {
			const price = WorkMapper.toPrice(mockRawApiData);

			expect(price).toBeDefined();
			expect(price!.current).toBe(1100);
			expect(price!.currency).toBe("JPY");
			expect(price!.original).toBeUndefined();
			expect(price!.discount).toBeUndefined();
		});

		it("割引価格を正しくマッピングできる", () => {
			const discountData: DLsiteApiResponse = {
				...mockRawApiData,
				price: 770,
				official_price: 1100,
				discount_rate: 30,
			};

			const price = WorkMapper.toPrice(discountData);

			expect(price).toBeDefined();
			expect(price!.current).toBe(770);
			expect(price!.original).toBe(1100);
			expect(price!.discount).toBe(30);
		});

		it("無料作品を正しくマッピングできる", () => {
			const freeData: DLsiteApiResponse = {
				...mockRawApiData,
				price: 0,
				official_price: 0,
			};

			const price = WorkMapper.toPrice(freeData);

			expect(price).toBeDefined();
			expect(price!.current).toBe(0);
		});
	});

	describe("toRating", () => {
		it("評価情報を正しくマッピングできる", () => {
			const rating = WorkMapper.toRating(mockRawApiData);

			expect(rating).toBeDefined();
			expect(rating!.stars).toBe(45); // 45 on 0-50 scale
			expect(rating!.count).toBe(100);
		});

		it("評価分布を正しくマッピングできる", () => {
			const rating = WorkMapper.toRating(mockRawApiData);

			expect(rating?.ratingDetail).toBeDefined();
			// APIからの評価分布をそのまま保持（0件の評価も含む）
			expect(rating!.ratingDetail).toEqual([
				{ review_point: 1, count: 10, ratio: 10 },
				{ review_point: 3, count: 10, ratio: 10 },
				{ review_point: 4, count: 30, ratio: 30 },
				{ review_point: 5, count: 60, ratio: 60 },
			]);
		});

		it("評価がない場合はundefinedを返す", () => {
			const noRatingData: DLsiteApiResponse = {
				...mockRawApiData,
				rate_count: 0,
				rate_average_star: undefined,
			};

			const rating = WorkMapper.toRating(noRatingData);

			expect(rating).toBeUndefined();
		});

		it("評価分布がない場合も正しく処理できる", () => {
			const noDistributionData: DLsiteApiResponse = {
				...mockRawApiData,
				rate_count_detail: undefined,
			};

			const rating = WorkMapper.toRating(noDistributionData);

			expect(rating).toBeDefined();
			expect(rating!.ratingDetail).toBeUndefined();
		});
	});

	describe("クリエイター情報の抽出", () => {
		it("声優情報を正しく抽出できる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.creators?.voice_by).toEqual([
				{ id: "cv001", name: "声優A" },
				{ id: "cv002", name: "声優B" },
			]);
		});

		it("シナリオライター情報を正しく抽出できる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.creators?.scenario_by).toEqual([{ id: "sc001", name: "シナリオライター" }]);
		});

		it("creatersフィールドがない場合はundefinedを返す", () => {
			const dataWithoutCreaters: DLsiteApiResponse = {
				...mockRawApiData,
				creaters: undefined,
				author: "CV:テスト声優1,テスト声優2",
			};

			const work = WorkMapper.toWork(dataWithoutCreaters);

			// APIのcreaters.voice_byのみを使用し、authorフィールドからの抽出は行わない
			expect(work.creators).toBeUndefined();
		});
	});

	describe("ジャンル情報の抽出", () => {
		it("通常のジャンルを正しく抽出できる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.genres).toEqual(["ASMR", "バイノーラル"]);
		});

		it("すべてのジャンルをそのまま保持する", () => {
			const dataWithPromo: DLsiteApiResponse = {
				...mockRawApiData,
				genres: [
					{ id: "1", name: "ASMR", search_val: "asmr" },
					{ id: "2", name: "30%OFFキャンペーン", search_val: "campaign" },
					{ id: "3", name: "新作ピックアップ", search_val: "pickup" },
				],
			};

			const work = WorkMapper.toWork(dataWithPromo);

			// APIのgenresフィールドをそのまま保持（フィルタリングなし）
			expect(work.genres).toEqual(["ASMR", "30%OFFキャンペーン", "新作ピックアップ"]);
		});
	});

	describe("日付情報の変換", () => {
		it("リリース日を正しく変換できる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.releaseDate).toBe("2024-01-15");
			expect(work.releaseDateISO).toMatch(/2024-01-15T/);
			expect(work.releaseDateDisplay).toBe("2024年1月15日");
		});

		it("日付がない場合はundefinedを返す", () => {
			const noDateData: DLsiteApiResponse = {
				...mockRawApiData,
				regist_date: undefined,
			};

			const work = WorkMapper.toWork(noDateData);

			expect(work.releaseDate).toBeUndefined();
			expect(work.releaseDateISO).toBeUndefined();
			expect(work.releaseDateDisplay).toBeUndefined();
		});
	});

	describe("プロトコル相対URLの正規化", () => {
		it("プロトコル相対URLをHTTPSに変換する", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.thumbnailUrl).toMatch(/^https:/);
			expect(work.highResImageUrl).toMatch(/^https:/);
		});

		it("すでにHTTPSのURLはそのまま保持する", () => {
			const httpsData: DLsiteApiResponse = {
				...mockRawApiData,
				image_thum: "https://img.dlsite.jp/test.jpg",
			};

			const work = WorkMapper.toWork(httpsData);

			expect(work.thumbnailUrl).toBe("https://img.dlsite.jp/test.jpg");
		});
	});
});
