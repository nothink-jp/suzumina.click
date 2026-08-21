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

		// SPR-272: 実APIの値域に合わせる。rate_average_star は 10-50 の整数（0.5刻み）で、
		// 評価件数を表す rate_count は API が返さない（件数の実体は rate_count_detail の合計）。
		rate_average_star: 45,
		rate_count_detail: {
			"1": 10,
			"2": 0,
			"3": 10,
			"4": 30,
			"5": 50,
		},

		regist_date: "2024-01-15",
		age_category: 3,
		work_type: "SOU",
		work_type_string: "音声作品",

		genres: [
			{ id: 1, name: "ASMR", search_val: "asmr", name_base: "asmr" },
			{ id: 2, name: "バイノーラル", search_val: "binaural", name_base: "binaural" },
		],

		creaters: {
			voice_by: [
				{ id: "cv001", name: "声優A", type: "voice" },
				{ id: "cv002", name: "声優B", type: "voice" },
			],
			scenario_by: [{ id: "sc001", name: "シナリオライター", type: "scenario" }],
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

	describe("salesStatus（SPR-264: フラットフィールドからのマッピング）", () => {
		it("is_discount_workがtrueの作品はisSale/isDiscountがtrueになる", () => {
			const work = WorkMapper.toWork({
				...mockRawApiData,
				is_discount_work: true,
				on_sale: 1,
			});

			expect(work.salesStatus?.isSale).toBe(true);
			expect(work.salesStatus?.isDiscount).toBe(true);
			expect(work.salesStatus?.onSale).toBe(1);
		});

		it("is_discount_workがfalseの作品はisSale/isDiscountがfalseになる", () => {
			const work = WorkMapper.toWork({
				...mockRawApiData,
				is_discount_work: false,
			});

			expect(work.salesStatus?.isSale).toBe(false);
			expect(work.salesStatus?.isDiscount).toBe(false);
		});

		it("実APIに存在しないネストされたsales_statusフィールドには依存しない", () => {
			// SPR-264: 旧実装は`raw.sales_status`（実APIには存在しないネストオブジェクト）を
			// 参照しており、常にsalesStatusがundefinedになっていた。フラットフィールドのみで
			// 判定できることを確認する。
			const work = WorkMapper.toWork({
				...mockRawApiData,
				is_discount_work: true,
			});

			expect(work.salesStatus).toBeDefined();
			expect(work.salesStatus?.isSale).toBe(true);
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
		it("評価情報を正しくマッピングできる（10-50スケール→0-5・件数は分布の合計）", () => {
			const rating = WorkMapper.toRating(mockRawApiData);

			expect(rating).toBeDefined();
			// rate_average_star=45（10-50スケール）→ 4.5（RatingInfo.stars は 0-5）
			expect(rating!.stars).toBe(4.5);
			// APIは合計値を返さないため rate_count_detail の合計を評価件数とする
			expect(rating!.count).toBe(100);
		});

		it("stars はスキーマ上限(5)を超えない", () => {
			// SPR-272 回帰防止: 旧実装は `* 10` していたため満点作品で 500 になっていた
			const maxRated: DLsiteApiResponse = {
				...mockRawApiData,
				rate_average_star: 50,
			};

			expect(WorkMapper.toRating(maxRated)!.stars).toBe(5);
		});

		it("評価分布を正しくマッピングできる", () => {
			const rating = WorkMapper.toRating(mockRawApiData);

			expect(rating?.ratingDetail).toBeDefined();
			// APIからの評価分布をそのまま保持（0件の評価も含む）
			expect(rating!.ratingDetail).toEqual([
				{ review_point: 1, count: 10, ratio: 10 },
				{ review_point: 3, count: 10, ratio: 10 },
				{ review_point: 4, count: 30, ratio: 30 },
				{ review_point: 5, count: 50, ratio: 50 },
			]);
		});

		it("評価がない場合はundefinedを返す", () => {
			const noRatingData: DLsiteApiResponse = {
				...mockRawApiData,
				rate_count_detail: undefined,
				rate_average_star: undefined,
			};

			const rating = WorkMapper.toRating(noRatingData);

			expect(rating).toBeUndefined();
		});

		it("評価分布が無ければ件数を確定できないためundefinedを返す", () => {
			// SPR-272: 件数の唯一のソースが rate_count_detail になったため、
			// 分布が無い＝評価が付いていない、と扱う（実APIでは150件中150件で分布あり）。
			const noDistributionData: DLsiteApiResponse = {
				...mockRawApiData,
				rate_count_detail: undefined,
			};

			expect(WorkMapper.toRating(noDistributionData)).toBeUndefined();
		});
	});

	describe("クリエイター情報の抽出", () => {
		it("声優情報を正しく抽出できる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.creators?.voice_by).toEqual([
				{ id: "cv001", name: "声優A", type: "voice" },
				{ id: "cv002", name: "声優B", type: "voice" },
			]);
		});

		it("シナリオライター情報を正しく抽出できる", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.creators?.scenario_by).toEqual([
				{ id: "sc001", name: "シナリオライター", type: "scenario" },
			]);
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
					{ id: 1, name: "ASMR", search_val: "asmr", name_base: "asmr" },
					{ id: 2, name: "30%OFFキャンペーン", search_val: "campaign", name_base: "campaign" },
					{ id: 3, name: "新作ピックアップ", search_val: "pickup", name_base: "pickup" },
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

	// SPR-312: DLsite API は画像未登録の作品で no_img プレースホルダを返す。
	// これを保存すると web の remotePatterns 外のホストになり、JSON-LD / OG 画像も壊れる。
	describe("「画像なし」プレースホルダの正規化", () => {
		const NO_IMG_SAM = "//www.dlsite.com/images/web/home/no_img_sam.gif";
		const NO_IMG_MAIN = "//www.dlsite.com/images/web/home/no_img_main.gif";

		it("image_thum が no_img なら image_main の URL を使う", () => {
			// 翻訳版は image_main が元作品の画像を指す（実データ: RJ01113566 → RJ01098758）
			const work = WorkMapper.toWork({
				...mockRawApiData,
				image_thum: { url: NO_IMG_SAM },
				image_main: {
					url: "//img.dlsite.jp/modpub/images2/work/doujin/RJ01099000/RJ01098758_img_main.jpg",
				},
			} as DLsiteApiResponse);

			expect(work.thumbnailUrl).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01099000/RJ01098758_img_main.jpg",
			);
		});

		it("image_main が no_img なら highResImageUrl は undefined になる", () => {
			const work = WorkMapper.toWork({
				...mockRawApiData,
				image_main: { url: NO_IMG_MAIN },
			} as DLsiteApiResponse);

			expect(work.highResImageUrl).toBeUndefined();
		});

		it("image_thum / image_main とも no_img なら次の千番台のフォールバックURLになる", () => {
			const work = WorkMapper.toWork({
				...mockRawApiData,
				workno: "RJ01041035",
				image_thum: { url: NO_IMG_SAM },
				image_main: { url: NO_IMG_MAIN },
			} as DLsiteApiResponse);

			expect(work.thumbnailUrl).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01042000/RJ01041035_img_main.jpg",
			);
			expect(work.highResImageUrl).toBeUndefined();
		});

		it("フォールバックURLは元IDの桁数を保ち、千番台ちょうどでも次の千番台へ繰り上げる", () => {
			const sixDigits = WorkMapper.toWork({
				...mockRawApiData,
				workno: "RJ252366",
				image_thum: { url: NO_IMG_SAM },
				image_main: { url: NO_IMG_MAIN },
			} as DLsiteApiResponse);
			expect(sixDigits.thumbnailUrl).toContain("/doujin/RJ253000/RJ252366_img_main.jpg");

			const onBoundary = WorkMapper.toWork({
				...mockRawApiData,
				workno: "RJ01042000",
				image_thum: { url: NO_IMG_SAM },
				image_main: { url: NO_IMG_MAIN },
			} as DLsiteApiResponse);
			expect(onBoundary.thumbnailUrl).toContain("/doujin/RJ01043000/RJ01042000_img_main.jpg");
		});

		it("正常な画像URLの作品は挙動が変わらない", () => {
			const work = WorkMapper.toWork(mockRawApiData);

			expect(work.thumbnailUrl).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ12345678_img_thum.jpg",
			);
			expect(work.highResImageUrl).toBe(
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ12345678_img_main.jpg",
			);
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
