/**
 * DLsite HTMLパーサーのテスト
 *
 * 実際のDLsiteから最新データを取得してパーサーの動作を検証します。
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  parseWorksFromHTML,
  parseWorksFromSearchResult,
} from "./dlsite-parser";

// テスト用のDLsite検索URL（30件取得用）
const TEST_DLSITE_URL =
  "https://www.dlsite.com/maniax/fsr/=/language/jp/sex_category[0]/male/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order[0]/release/options_and_or/and/options[0]/JPN/options[1]/NM/options_name[0]/%E6%97%A5%E6%9C%AC%E8%AA%9E%E4%BD%9C%E5%93%81/options_name[1]/%E8%A8%80%E8%AA%9E%E4%B8%8D%E5%95%8F%E4%BD%9C%E5%93%81/per_page/30/page/1/show_type/3/format/json";

/**
 * DLsiteからライブデータを取得する関数
 */
async function fetchDLsiteData(): Promise<{
  searchResult: string;
  html: string;
}> {
  try {
    // リクエストヘッダーを充実させる
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/html, */*",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "X-Requested-With": "XMLHttpRequest",
    };

    const response = await fetch(TEST_DLSITE_URL, { headers });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();

    // レスポンスがJSONかどうかを確認
    try {
      const jsonData = JSON.parse(responseText);
      if (jsonData.search_result) {
        return {
          searchResult: responseText,
          html: jsonData.search_result,
        };
      }
      throw new Error("search_result field not found in JSON response");
    } catch (jsonError) {
      // JSONでない場合、HTMLから検索結果を抽出する
      console.warn(
        "JSONレスポンスの解析に失敗、HTMLから直接データを抽出します",
      );

      // HTMLレスポンスの場合、HTMLをそのまま使用
      if (
        responseText.includes("<!DOCTYPE") ||
        responseText.includes("<html")
      ) {
        return {
          searchResult: JSON.stringify({ search_result: responseText }),
          html: responseText,
        };
      }

      throw new Error(`Invalid response format: ${jsonError}`);
    }
  } catch (error) {
    throw new Error(`Failed to fetch DLsite data: ${error}`);
  }
}

describe("DLsite Parser", () => {
  let sampleData: string;
  let sampleHtml: string;

  beforeAll(async () => {
    // 実際のDLsiteから最新データを取得
    try {
      const { searchResult, html } = await fetchDLsiteData();
      sampleData = searchResult;
      sampleHtml = html;

      console.log(
        `DLsiteから最新データを取得しました: ${new Date().toISOString()}`,
      );
    } catch (error) {
      console.error("DLsiteへのアクセスに失敗しました:", error);
      throw new Error(
        `テスト実行にはDLsiteからのライブデータが必要です: ${error}`,
      );
    }
  }, 30000); // 30秒のタイムアウト

  describe("parseWorksFromSearchResult", () => {
    it("DLsiteから作品データを正しく抽出できる", () => {
      const works = parseWorksFromSearchResult(sampleData);

      // 基本的な検証
      expect(works).toBeInstanceOf(Array);
      expect(works.length).toBeGreaterThan(0);
      expect(works.length).toBeLessThanOrEqual(30); // テスト用は30件制限

      // 最初の作品の詳細検証
      const firstWork = works[0];
      expect(firstWork).toBeDefined();
      expect(firstWork.productId).toMatch(/^RJ\d+$/); // RJ + 数字の形式
      expect(firstWork.title).toBeTruthy();
      expect(firstWork.circle).toBeTruthy();
      expect(firstWork.category).toBeTruthy();
      expect(typeof firstWork.currentPrice).toBe("number");
      expect(firstWork.currentPrice).toBeGreaterThanOrEqual(0);
    });

    it("涼花みなせの作品を正しく識別できる", () => {
      const works = parseWorksFromSearchResult(sampleData);

      // 涼花みなせが声優として参加している作品を抽出
      const suzukaWorks = works.filter(
        (work) =>
          work.author === "涼花みなせ" || work.title.includes("涼花みなせ"),
      );

      // 検索結果なので涼花みなせ関連の作品が含まれるはず
      expect(suzukaWorks.length).toBeGreaterThan(0);

      // 涼花みなせ関連の作品の基本検証
      for (const work of suzukaWorks) {
        expect(work.productId).toMatch(/^RJ\d+$/);
        expect(work.title).toBeTruthy();
        expect(work.circle).toBeTruthy();
      }
    });

    it("価格情報を正しく抽出できる", () => {
      const works = parseWorksFromSearchResult(sampleData);

      // 価格情報の基本検証
      for (const work of works) {
        expect(typeof work.currentPrice).toBe("number");
        expect(work.currentPrice).toBeGreaterThanOrEqual(0);

        if (work.originalPrice !== undefined) {
          expect(work.originalPrice).toBeGreaterThan(0);
        }

        if (work.discount !== undefined) {
          expect(work.discount).toBeGreaterThanOrEqual(0);
          expect(work.discount).toBeLessThanOrEqual(100);

          if (work.discount > 0 && work.originalPrice) {
            expect(work.currentPrice).toBeLessThan(work.originalPrice);
          }
        }
      }
    });

    it("評価情報を正しく抽出できる", () => {
      const works = parseWorksFromSearchResult(sampleData);

      // 評価情報の基本検証
      for (const work of works) {
        if (work.stars !== undefined) {
          expect(work.stars).toBeGreaterThanOrEqual(0);
          expect(work.stars).toBeLessThanOrEqual(5);
        }

        if (work.ratingCount !== undefined) {
          expect(work.ratingCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("カテゴリを正しく抽出できる", () => {
      const works = parseWorksFromSearchResult(sampleData);

      // 各作品にカテゴリが設定されていることを確認
      for (const work of works) {
        expect(work.category).toBeDefined();
        expect(typeof work.category).toBe("string");
        expect(work.category.length).toBeGreaterThan(0);
      }

      // 一般的なDLsiteカテゴリが含まれることを確認
      const categories = [...new Set(works.map((work) => work.category))];
      expect(categories.length).toBeGreaterThan(0);

      // 音声作品カテゴリが含まれる可能性が高い（涼花みなせ検索のため）
      const hasAudioCategories = categories.some(
        (cat) => cat === "SOU" || cat === "ADV" || cat === "RPG",
      );
      expect(hasAudioCategories).toBe(true);
    });

    it("URL情報を正しく抽出できる", () => {
      const works = parseWorksFromSearchResult(sampleData);

      for (const work of works) {
        // 作品URLの検証
        expect(work.workUrl).toMatch(/^https:\/\/www\.dlsite\.com/);
        expect(work.workUrl).toContain(work.productId);

        // サムネイルURLの検証
        expect(work.thumbnailUrl).toMatch(/^https?:\/\//);
      }
    });

    it("独占配信フラグを正しく判定できる", () => {
      const works = parseWorksFromSearchResult(sampleData);

      // 独占配信作品の存在確認
      const exclusiveWork = works.find((work) => work.isExclusive === true);
      expect(exclusiveWork).toBeDefined();

      // フラグの型確認
      for (const work of works) {
        expect(typeof work.isExclusive).toBe("boolean");
      }
    });

    it("無効なJSONに対してエラーハンドリングできる", () => {
      const invalidJson = "invalid json";
      const works = parseWorksFromSearchResult(invalidJson);

      expect(works).toBeInstanceOf(Array);
      expect(works.length).toBe(0);
    });
  });

  describe("parseWorksFromHTML", () => {
    it("HTMLから直接作品データを抽出できる", () => {
      const works = parseWorksFromHTML(sampleHtml);

      expect(works).toBeInstanceOf(Array);
      expect(works.length).toBeGreaterThan(0);

      // 基本フィールドの存在確認
      const firstWork = works[0];
      expect(firstWork.productId).toBeDefined();
      expect(firstWork.title).toBeDefined();
      expect(firstWork.circle).toBeDefined();
      expect(firstWork.workUrl).toBeDefined();
      expect(firstWork.thumbnailUrl).toBeDefined();
      expect(typeof firstWork.currentPrice).toBe("number");
    });

    it("空のHTMLに対してエラーハンドリングできる", () => {
      const emptyHtml = "<html><body></body></html>";
      const works = parseWorksFromHTML(emptyHtml);

      expect(works).toBeInstanceOf(Array);
      expect(works.length).toBe(0);
    });
  });

  describe("データ整合性チェック", () => {
    it("抽出された全作品のデータ整合性を確認", () => {
      const works = parseWorksFromSearchResult(sampleData);

      for (const [index, work] of works.entries()) {
        // 必須フィールドの確認
        expect(work.productId, `作品${index}: productId`).toBeTruthy();
        expect(work.title, `作品${index}: title`).toBeTruthy();
        expect(work.circle, `作品${index}: circle`).toBeTruthy();
        expect(work.workUrl, `作品${index}: workUrl`).toBeTruthy();
        expect(work.thumbnailUrl, `作品${index}: thumbnailUrl`).toBeTruthy();

        // 数値フィールドの確認
        expect(
          work.currentPrice,
          `作品${index}: currentPrice`,
        ).toBeGreaterThanOrEqual(0);

        if (work.originalPrice !== undefined) {
          expect(
            work.originalPrice,
            `作品${index}: originalPrice`,
          ).toBeGreaterThan(0);
        }

        if (work.discount !== undefined) {
          expect(
            work.discount,
            `作品${index}: discount`,
          ).toBeGreaterThanOrEqual(0);
          expect(work.discount, `作品${index}: discount`).toBeLessThanOrEqual(
            100,
          );
        }

        if (work.stars !== undefined) {
          expect(work.stars, `作品${index}: stars`).toBeGreaterThanOrEqual(0);
          expect(work.stars, `作品${index}: stars`).toBeLessThanOrEqual(5);
        }

        // 配列フィールドの確認
        expect(
          Array.isArray(work.sampleImages),
          `作品${index}: sampleImages`,
        ).toBe(true);
      }
    });
  });
});
