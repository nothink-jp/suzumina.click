/**
 * DLsite HTMLパーサーのテスト
 * フィクスチャーデータを使用して重要な機能のみをテスト
 */

import { describe, expect, it } from "vitest";
import {
	extractNumberFromParentheses,
	extractPriceNumber,
	extractStarRating,
	parseSampleImages,
	parseWorksFromHTML,
	parseWorksFromSearchResult,
} from "./dlsite-parser";

// テスト用フィクスチャーデータ（実際のDLsite HTML構造に基づく）
const mockSearchResultJson = JSON.stringify({
	search_result: `
    <table class="work_1col_table">
      <tr>
        <td>
          <a href="/maniax/work/=/product_id/RJ12345.html">
            <img src="//img.dlsite.jp/modpub/images2/work/doujin/RJ123/RJ12345/RJ12345_img_main.jpg" alt="テスト作品">
          </a>
          <div class="work_name">
            <a href="/maniax/work/=/product_id/RJ12345.html">テスト作品タイトル</a>
          </div>
          <div class="maker_name">
            <a href="/maniax/circle/profile/=/maker_id/RG12345.html">涼花みなせ</a>
          </div>
          <div class="work_price">
            <span class="work_price_parts">1,100円</span>
          </div>
          <div class="work_category type_SOU">ボイス・ASMR</div>
        </td>
      </tr>
    </table>
  `,
});

const mockHtmlData = `
  <table class="work_1col_table">
    <tr>
      <td>
        <a href="/maniax/work/=/product_id/RJ54321.html">
          <img src="//img.dlsite.jp/modpub/images2/work/doujin/RJ54/RJ54321_img_main.jpg" alt="HTML作品">
        </a>
        <div class="work_name">
          <a href="/maniax/work/=/product_id/RJ54321.html">HTML解析テスト作品</a>
        </div>
        <div class="maker_name">
          <a href="/maniax/circle/profile/=/maker_id/RG54321.html">テストサークル</a>
        </div>
        <div class="work_price">
          <span class="work_price_parts">2,200円</span>
        </div>
      </td>
    </tr>
  </table>
`;

describe("DLsite Parser", () => {
	describe("parseWorksFromSearchResult", () => {
		it("JSON検索結果から作品データを正しく抽出できる", () => {
			const works = parseWorksFromSearchResult(mockSearchResultJson);

			expect(works).toHaveLength(1);
			expect(works[0]).toMatchObject({
				productId: "RJ12345",
				title: "テスト作品タイトル",
				circle: "涼花みなせ",
				currentPrice: 1100,
				category: "SOU",
				workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ12345.html",
				isExclusive: false,
			});
		});

		it("無効なJSONに対してエラーハンドリングできる", () => {
			const works = parseWorksFromSearchResult("invalid json");
			expect(works).toEqual([]);
		});

		it("空のJSONに対してエラーハンドリングできる", () => {
			const works = parseWorksFromSearchResult(JSON.stringify({}));
			expect(works).toEqual([]);
		});
	});

	describe("parseWorksFromHTML", () => {
		it("HTMLから直接作品データを抽出できる", () => {
			const works = parseWorksFromHTML(mockHtmlData);

			expect(works).toHaveLength(1);
			expect(works[0]).toMatchObject({
				productId: "RJ54321",
				title: "HTML解析テスト作品",
				circle: "テストサークル",
				currentPrice: 2200,
			});
		});

		it("空のHTMLに対してエラーハンドリングできる", () => {
			const works = parseWorksFromHTML("");
			expect(works).toEqual([]);
		});
	});

	describe("ユーティリティ関数", () => {
		describe("extractPriceNumber", () => {
			it("通常の価格文字列から正しく数値を抽出できる", () => {
				expect(extractPriceNumber("1,100円")).toBe(1100);
				expect(extractPriceNumber("500円")).toBe(500);
				expect(extractPriceNumber("無料")).toBe(0);
			});

			it("不正な形式の場合は0を返す", () => {
				expect(extractPriceNumber("")).toBe(0);
				expect(extractPriceNumber("価格不明")).toBe(0);
			});
		});

		describe("extractStarRating", () => {
			it("星評価のクラス名から正しく評価値を抽出できる", () => {
				const mockElement = { attr: (_name: string) => "star_50" };
				expect(extractStarRating(mockElement)).toBe(5.0);

				const mockElement2 = { attr: (_name: string) => "star_40" };
				expect(extractStarRating(mockElement2)).toBe(4.0);

				const mockElement3 = { attr: (_name: string) => "star_25" };
				expect(extractStarRating(mockElement3)).toBe(2.5);
			});

			it("星評価のクラスが無い場合は0を返す", () => {
				const mockElement = { attr: (_name: string) => "" };
				expect(extractStarRating(mockElement)).toBe(0);

				const mockElement2 = { attr: (_name: string) => "other-class" };
				expect(extractStarRating(mockElement2)).toBe(0);
			});
		});

		describe("extractNumberFromParentheses", () => {
			it("括弧内の数値を正しく抽出できる", () => {
				expect(extractNumberFromParentheses("DL数(1,000)")).toBe(1000);
				expect(extractNumberFromParentheses("評価(500)")).toBe(500);
			});

			it("括弧が無い場合は0を返す", () => {
				expect(extractNumberFromParentheses("DL数")).toBe(0);
				expect(extractNumberFromParentheses("")).toBe(0);
			});
		});

		describe("parseSampleImages", () => {
			it("有効なJSONデータからサンプル画像情報を抽出できる", () => {
				const jsonData = JSON.stringify([
					{ thumb: "/path/to/image1.jpg", width: 560, height: 420 },
					{ thumb: "/path/to/image2.jpg", width: 560, height: 420 },
				]);

				const result = parseSampleImages(jsonData);
				expect(result).toHaveLength(2);
				expect(result[0]).toEqual({
					thumb: "/path/to/image1.jpg",
					width: 560,
					height: 420,
				});
			});

			it("不正なJSONの場合は空配列を返す", () => {
				expect(parseSampleImages("invalid json")).toEqual([]);
				expect(parseSampleImages("")).toEqual([]);
			});
		});
	});

	describe("エラーハンドリング", () => {
		it("必須フィールドが欠けている作品をスキップできる", () => {
			const incompleteHtml = `
        <table class="work_1col_table">
          <tr>
            <td>
              <div class="work_name">
                <a href="/maniax/work/=/product_id/RJ99999.html">タイトルのみ</a>
              </div>
              <!-- サークル名とURLが欠如 -->
            </td>
          </tr>
        </table>
      `;

			const works = parseWorksFromHTML(incompleteHtml);
			expect(works).toEqual([]);
		});

		it("部分的なデータでも処理を継続できる", () => {
			const partialHtml = `
        <table class="work_1col_table">
          <tr>
            <td>
              <a href="/maniax/work/=/product_id/RJ88888.html">
                <img src="//img.dlsite.jp/modpub/images2/work/doujin/RJ88/RJ88888_img_main.jpg" alt="部分データ">
              </a>
              <div class="work_name">
                <a href="/maniax/work/=/product_id/RJ88888.html">部分データ作品</a>
              </div>
              <div class="maker_name">
                <a href="/maniax/circle/profile/=/maker_id/RG88888.html">テストサークル</a>
              </div>
              <!-- 価格や評価情報が欠如 -->
            </td>
          </tr>
        </table>
      `;

			const works = parseWorksFromHTML(partialHtml);
			expect(works).toHaveLength(1);
			expect(works[0]).toMatchObject({
				productId: "RJ88888",
				title: "部分データ作品",
				circle: "テストサークル",
				currentPrice: 0, // デフォルト値
			});
		});
	});
});
