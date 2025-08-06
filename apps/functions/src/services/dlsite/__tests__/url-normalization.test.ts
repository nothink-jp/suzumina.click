/**
 * URL正規化機能のテスト
 * プロトコル相対URLの正規化が正しく動作することを検証
 */

import type { DLsiteApiResponse } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { WorkMapper } from "../../mappers/work-mapper";

describe("URL正規化機能", () => {
	it("プロトコル相対URLを正しく正規化する", () => {
		const mockApiData: DLsiteApiResponse = {
			workno: "RJ01037463",
			product_id: "RJ01037463",
			work_name: "テスト作品",
			maker_name: "テストサークル",
			maker_id: "TEST123",
			age_category: 1,
			regist_date: "2024-01-01",
			on_sale: 1,
			work_type: "SOU",
			work_type_string: "音声作品",
			site_id: "maniax",
			author: "テスト声優",
			price: 1000,
			price_without_tax: 909,
			official_price: 1000,
			official_price_without_tax: 909,
			discount_rate: 0,
			is_discount_work: false,
			rate_average: 4.5,
			rate_average_star: 45,
			rate_count: 100,
			dl_count: 500,
			// プロトコル相対URLのテストケース
			image_thum: "//img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_sam.jpg",
			image_main: "//img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_main.jpg",
			image_samples: [
				"//img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_sample1.jpg",
				"//img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_sample2.jpg",
			],
		};

		const result = WorkMapper.toWork(mockApiData);

		// メイン画像URLの正規化確認
		expect(result.thumbnailUrl).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_sam.jpg",
		);
		expect(result.highResImageUrl).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_main.jpg",
		);

		// サンプル画像URLの正規化確認
		expect(result.sampleImages).toHaveLength(2);
		expect(result.sampleImages[0].thumb).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_sample1.jpg",
		);
		expect(result.sampleImages[1].thumb).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_sample2.jpg",
		);
	});

	it("既に正しい形式のURLはそのまま維持する", () => {
		const mockApiData: DLsiteApiResponse = {
			workno: "RJ01037463",
			product_id: "RJ01037463",
			work_name: "テスト作品",
			maker_name: "テストサークル",
			maker_id: "TEST123",
			age_category: 1,
			regist_date: "2024-01-01",
			on_sale: 1,
			work_type: "SOU",
			work_type_string: "音声作品",
			site_id: "maniax",
			author: "テスト声優",
			price: 1000,
			price_without_tax: 909,
			official_price: 1000,
			official_price_without_tax: 909,
			discount_rate: 0,
			is_discount_work: false,
			rate_average: 4.5,
			rate_average_star: 45,
			rate_count: 100,
			dl_count: 500,
			// 既に正しい形式のURLのテストケース
			image_thum:
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_sam.jpg",
			image_main:
				"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_main.jpg",
		};

		const result = WorkMapper.toWork(mockApiData);

		// 正しい形式のURLは変更されないことを確認
		expect(result.thumbnailUrl).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_sam.jpg",
		);
		expect(result.highResImageUrl).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_main.jpg",
		);
	});

	it("srcsetから抽出した高解像度URLも正規化される", () => {
		const mockApiData: DLsiteApiResponse = {
			workno: "RJ01037463",
			product_id: "RJ01037463",
			work_name: "テスト作品",
			maker_name: "テストサークル",
			maker_id: "TEST123",
			age_category: 1,
			regist_date: "2024-01-01",
			on_sale: 1,
			work_type: "SOU",
			work_type_string: "音声作品",
			site_id: "maniax",
			author: "テスト声優",
			price: 1000,
			price_without_tax: 909,
			official_price: 1000,
			official_price_without_tax: 909,
			discount_rate: 0,
			is_discount_work: false,
			rate_average: 4.5,
			rate_average_star: 45,
			rate_count: 100,
			dl_count: 500,
			// srcsetでプロトコル相対URLを含むテストケース
			srcset:
				"//img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_main.jpg 1x, //img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_main_2x.jpg 2x",
		};

		const result = WorkMapper.toWork(mockApiData);

		// srcsetから抽出した高解像度URLの正規化確認
		expect(result.highResImageUrl).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01038000/RJ01037463_img_main_2x.jpg",
		);
	});

	it("undefinedやnullのURLは適切に処理される", () => {
		const mockApiData: DLsiteApiResponse = {
			workno: "RJ01037463",
			product_id: "RJ01037463",
			work_name: "テスト作品",
			maker_name: "テストサークル",
			maker_id: "TEST123",
			age_category: 1,
			regist_date: "2024-01-01",
			on_sale: 1,
			work_type: "SOU",
			work_type_string: "音声作品",
			site_id: "maniax",
			author: "テスト声優",
			price: 1000,
			price_without_tax: 909,
			official_price: 1000,
			official_price_without_tax: 909,
			discount_rate: 0,
			is_discount_work: false,
			rate_average: 4.5,
			rate_average_star: 45,
			rate_count: 100,
			dl_count: 500,
			// URLが存在しないケース
			image_thum: undefined,
			image_main: undefined,
		};

		const result = WorkMapper.toWork(mockApiData);

		// デフォルトURLが設定されることを確認
		expect(result.thumbnailUrl).toBe(
			"https://img.dlsite.jp/modpub/images2/work/doujin/RJ01037463_img_main.jpg",
		);
		expect(result.highResImageUrl).toBeUndefined();
	});

	it("必須フィールドが欠損していても処理される", () => {
		const mockApiData: DLsiteApiResponse = {
			workno: "RJ01037463",
			// work_name と maker_name が欠損
			// price 情報も欠損
		};

		const result = WorkMapper.toWork(mockApiData);

		// フォールバック値が設定されることを確認
		expect(result.id).toBe("RJ01037463");
		expect(result.title).toBe("Unknown Work RJ01037463");
		expect(result.circle).toBe("Unknown Maker");
		expect(result.price.current).toBe(0);
		expect(result.price.isFreeOrMissingPrice).toBe(true);
	});

	it("画像URLが数値型でも正しく処理される", () => {
		const mockApiData: DLsiteApiResponse = {
			workno: "RJ01037463",
			work_name: "テスト作品",
			maker_name: "テストサークル",
			age_category: 1,
			price: 1000,
			// 画像URLが数値として来るケース（API仕様によってはありうる）
			image_thum: 123456 as any,
			image_main: 789012 as any,
			srcset: 345678 as any,
			image_samples: [111, 222, 333] as any,
		};

		const result = WorkMapper.toWork(mockApiData);

		// 数値が文字列に変換されて処理されることを確認
		expect(result.thumbnailUrl).toBe("123456");
		expect(result.highResImageUrl).toBe("789012");
		expect(result.sampleImages).toHaveLength(3);
		expect(result.sampleImages[0].thumb).toBe("111");
		expect(result.sampleImages[1].thumb).toBe("222");
		expect(result.sampleImages[2].thumb).toBe("333");
	});

	it("画像URLがオブジェクト型でも正しく処理される", () => {
		const mockApiData: DLsiteApiResponse = {
			workno: "RJ01037463",
			work_name: "テスト作品",
			maker_name: "テストサークル",
			age_category: 1,
			price: 1000,
			// 画像URLがオブジェクトとして来るケース
			image_thum: { url: "//img.dlsite.jp/test_thumb.jpg" } as any,
			image_main: { src: "//img.dlsite.jp/test_main.jpg" } as any,
			srcset: { invalid: "object" } as any, // 無効なオブジェクト
			image_samples: [
				{ url: "//img.dlsite.jp/sample1.jpg" },
				{ invalid: "object" }, // 無効なオブジェクト
				"//img.dlsite.jp/sample3.jpg",
			] as any,
		};

		const result = WorkMapper.toWork(mockApiData);

		// オブジェクトから適切なプロパティが抽出されて正規化されることを確認
		expect(result.thumbnailUrl).toBe("https://img.dlsite.jp/test_thumb.jpg");
		expect(result.highResImageUrl).toBe("https://img.dlsite.jp/test_main.jpg");
		expect(result.sampleImages).toHaveLength(2); // 無効なオブジェクトはフィルタされる
		expect(result.sampleImages[0].thumb).toBe("https://img.dlsite.jp/sample1.jpg");
		expect(result.sampleImages[1].thumb).toBe("https://img.dlsite.jp/sample3.jpg");
	});
});
