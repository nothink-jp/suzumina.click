/**
 * DLsite HTMLパーサーのテスト
 *
 * 実際のDLsiteから最新データを取得してパーサーの動作を検証します。
 */

import * as cheerio from "cheerio";
import { beforeAll, describe, expect, it } from "vitest";
import {
  extractCategoryFromClass,
  extractNumberFromParentheses,
  extractPriceNumber,
  extractStarRating,
  parseSampleImages,
  parseWorksFromHTML,
  parseWorksFromSearchResult,
} from "./dlsite-parser";

// テスト用のDLsite検索URL（新しいHTML形式）
const TEST_DLSITE_URL =
  "https://www.dlsite.com/maniax/fsr/=/language/jp/sex_category[0]/male/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/options_and_or/and/options[0]/JPN/options[1]/NM/page/1/show_type/1";

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

  describe("parseSampleImages function", () => {
    // parseSampleImages関数を直接インポートするためのモジュール再エクスポートが必要
    // ここでは間接的にテストする
    it("有効なサンプル画像データを処理できる", () => {
      const mockHtml = `
        <table class="work_1col_table">
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ123456.html">
                  <img src="//img.dlsite.jp/test.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <dt class="work_name">
                  <a href="/product_id/RJ123456.html" title="テスト作品">
                    テスト作品
                  </a>
                </dt>
                <dd class="maker_name"><a href="#">テストサークル</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts"><span class="work_price_base">100</span><span class="work_price_suffix">円</span></span>
                  </span>
                </dd>
                <dd data-view_samples='[{"thumb":"//img.dlsite.jp/sample1.jpg","width":"600","height":"400"},{"thumb":"//img.dlsite.jp/sample2.jpg"}]'>サンプル</dd>
              </dl>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mockHtml);
      expect(works).toHaveLength(1);
      expect(works[0].sampleImages).toHaveLength(2);
      expect(works[0].sampleImages[0].thumb).toBe(
        "//img.dlsite.jp/sample1.jpg",
      );
      expect(works[0].sampleImages[0].width).toBe(600);
      expect(works[0].sampleImages[0].height).toBe(400);
      expect(works[0].sampleImages[1].thumb).toBe(
        "//img.dlsite.jp/sample2.jpg",
      );
      expect(works[0].sampleImages[1].width).toBeUndefined();
    });

    it("無効なサンプル画像データを適切に処理できる", () => {
      const mockHtml = `
        <table class="work_1col_table">
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ123456.html">
                  <img src="//img.dlsite.jp/test.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <dt class="work_name">
                  <a href="/product_id/RJ123456.html" title="テスト作品">
                    テスト作品
                  </a>
                </dt>
                <dd class="maker_name"><a href="#">テストサークル</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts"><span class="work_price_base">100</span><span class="work_price_suffix">円</span></span>
                  </span>
                </dd>
                <dd data-view_samples='invalid json'>サンプル</dd>
              </dl>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mockHtml);
      expect(works).toHaveLength(1);
      expect(works[0].sampleImages).toHaveLength(0);
    });

    it("空のサンプル画像データを適切に処理できる", () => {
      const mockHtml = `
        <table class="work_1col_table">
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ123456.html">
                  <img src="//img.dlsite.jp/test.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <dt class="work_name">
                  <a href="/product_id/RJ123456.html" title="テスト作品">
                    テスト作品
                  </a>
                </dt>
                <dd class="maker_name"><a href="#">テストサークル</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts"><span class="work_price_base">100</span><span class="work_price_suffix">円</span></span>
                  </span>
                </dd>
                <dd data-view_samples="null">サンプル</dd>
              </dl>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mockHtml);
      expect(works).toHaveLength(1);
      expect(works[0].sampleImages).toHaveLength(0);
    });
  });

  describe("extractCategoryFromClass function", () => {
    it("各種カテゴリクラスを正しく識別できる", () => {
      const testCases = [
        {
          html: '<div class="work_category type_ADV">ADV</div>',
          expected: "ADV",
        },
        {
          html: '<div class="work_category type_SOU">音声作品</div>',
          expected: "SOU",
        },
        {
          html: '<div class="work_category type_RPG">RPG</div>',
          expected: "RPG",
        },
        {
          html: '<div class="work_category type_MOV">動画</div>',
          expected: "MOV",
        },
        {
          html: '<div class="work_category type_MNG">マンガ</div>',
          expected: "MNG",
        },
        {
          html: '<div class="work_category type_GAM">ゲーム</div>',
          expected: "GAM",
        },
        {
          html: '<div class="work_category type_CG">CG・イラスト</div>',
          expected: "CG",
        },
        {
          html: '<div class="work_category type_TOL">ツール/アクセサリ</div>',
          expected: "TOL",
        },
        {
          html: '<div class="work_category type_ET3">その他・3D</div>',
          expected: "ET3",
        },
        {
          html: '<div class="work_category type_SLN">シミュレーション</div>',
          expected: "SLN",
        },
        {
          html: '<div class="work_category type_ACN">アクション</div>',
          expected: "ACN",
        },
        {
          html: '<div class="work_category type_PZL">パズル</div>',
          expected: "PZL",
        },
        {
          html: '<div class="work_category type_QIZ">クイズ</div>',
          expected: "QIZ",
        },
        {
          html: '<div class="work_category type_TBL">テーブル</div>',
          expected: "TBL",
        },
        {
          html: '<div class="work_category type_DGT">デジタルノベル</div>',
          expected: "DGT",
        },
        {
          html: '<div class="work_category unknown_type">不明</div>',
          expected: "etc",
        },
      ];

      for (const testCase of testCases) {
        const mockHtml = `
          <table class="work_1col_table">
            <tr>
              <td class="work_1col_thumb">
                <div class="work_thumb">
                  <a href="/product_id/RJ123456.html">
                    <img src="//img.dlsite.jp/test.jpg" />
                  </a>
                  ${testCase.html}
                </div>
              </td>
              <td>
                <dl class="work_1col">
                  <dt class="work_name">
                    <a href="/product_id/RJ123456.html" title="テスト作品">
                      テスト作品
                    </a>
                  </dt>
                  <dd class="maker_name"><a href="#">テストサークル</a></dd>
                  <dd class="work_price_wrap">
                    <span class="work_price">
                      <span class="work_price_parts"><span class="work_price_base">100</span><span class="work_price_suffix">円</span></span>
                    </span>
                  </dd>
                </dl>
              </td>
            </tr>
          </table>
        `;

        const works = parseWorksFromHTML(mockHtml);
        expect(works).toHaveLength(1);
        expect(works[0].category).toBe(testCase.expected);
      }
    });
  });

  describe("エラーハンドリング", () => {
    it("必須フィールドが欠けている作品をスキップできる", () => {
      const mockHtml = `
        <table class="work_1col_table">
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ123456.html">
                  <img src="//img.dlsite.jp/test.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <!-- タイトルなし（work_name要素が欠けている） -->
                <dd class="maker_name"><a href="#">テストサークル</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts"><span class="work_price_base">100</span><span class="work_price_suffix">円</span></span>
                  </span>
                </dd>
              </dl>
            </td>
          </tr>
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ123457.html">
                  <img src="//img.dlsite.jp/test.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <dt class="work_name">
                  <a href="/product_id/RJ123457.html" title="有効な作品">
                    有効な作品
                  </a>
                </dt>
                <dd class="maker_name"><a href="#">テストサークル</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts"><span class="work_price_base">100</span><span class="work_price_suffix">円</span></span>
                  </span>
                </dd>
              </dl>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mockHtml);
      expect(works).toHaveLength(1);
      expect(works[0].productId).toBe("RJ123457");
    });

    it("サークル名が欠けている作品をスキップできる", () => {
      const mockHtml = `
        <table class="work_1col_table">
          <tr>
            <td>
              <a href="/product_id/RJ123456.html" title="テスト作品">
                <img src="//img.dlsite.jp/test.jpg" />
              </a>
              <!-- サークル名なし -->
              <div class="work_category type_SOU">音声作品</div>
              <div class="work_price">
                <div class="work_price_parts"><span class="work_price_base">100円</span></div>
              </div>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mockHtml);
      expect(works).toHaveLength(0);
    });

    it("作品URLが欠けている作品をスキップできる", () => {
      const mockHtml = `
        <table class="work_1col_table">
          <tr>
            <td>
              <a title="テスト作品">
                <img src="//img.dlsite.jp/test.jpg" />
              </a>
              <div class="maker_name"><a href="#">テストサークル</a></div>
              <div class="work_category type_SOU">音声作品</div>
              <div class="work_price">
                <div class="work_price_parts"><span class="work_price_base">100円</span></div>
              </div>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mockHtml);
      expect(works).toHaveLength(0);
    });

    it("サムネイル画像URLが欠けている作品をスキップできる", () => {
      const mockHtml = `
        <table class="work_1col_table">
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ123456.html">
                  <!-- 画像なし -->
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <dt class="work_name">
                  <a href="/product_id/RJ123456.html" title="テスト作品">
                    テスト作品
                  </a>
                </dt>
                <dd class="maker_name"><a href="#">テストサークル</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts"><span class="work_price_base">100</span><span class="work_price_suffix">円</span></span>
                  </span>
                </dd>
              </dl>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mockHtml);
      expect(works).toHaveLength(1); // サムネイルがなくてもデフォルト画像を使用するため作品は作成される
    });
  });

  describe("URL正規化テスト", () => {
    it("相対URLを絶対URLに変換できる", () => {
      const mockHtml = `
        <table class="work_1col_table">
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ123456.html">
                  <img src="//img.dlsite.jp/test.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <dt class="work_name">
                  <a href="/product_id/RJ123456.html" title="テスト作品">
                    テスト作品
                  </a>
                </dt>
                <dd class="maker_name"><a href="#">テストサークル</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts"><span class="work_price_base">100</span><span class="work_price_suffix">円</span></span>
                  </span>
                </dd>
              </dl>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mockHtml);
      expect(works).toHaveLength(1);
      expect(works[0].workUrl).toBe(
        "https://www.dlsite.com/product_id/RJ123456.html",
      );
      expect(works[0].thumbnailUrl).toBe("https://img.dlsite.jp/test.jpg");
    });

    it("既に絶対URLの場合はそのまま保持できる", () => {
      const mockHtml = `
        <table class="work_1col_table">
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="https://www.dlsite.com/product_id/RJ123456.html">
                  <img src="https://img.dlsite.jp/test.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <dt class="work_name">
                  <a href="https://www.dlsite.com/product_id/RJ123456.html" title="テスト作品">
                    テスト作品
                  </a>
                </dt>
                <dd class="maker_name"><a href="#">テストサークル</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts"><span class="work_price_base">100</span><span class="work_price_suffix">円</span></span>
                  </span>
                </dd>
              </dl>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mockHtml);
      expect(works).toHaveLength(1);
      expect(works[0].workUrl).toBe(
        "https://www.dlsite.com/product_id/RJ123456.html",
      );
      expect(works[0].thumbnailUrl).toBe("https://img.dlsite.jp/test.jpg");
    });
  });

  describe("ヘルパー関数のユニットテスト", () => {
    describe("extractPriceNumber", () => {
      it("通常の価格文字列から正しく数値を抽出できる", () => {
        expect(extractPriceNumber("100円")).toBe(100);
        expect(extractPriceNumber("1,000円")).toBe(1000);
        expect(extractPriceNumber("10,000円")).toBe(10000);
        expect(extractPriceNumber("￥1,234")).toBe(1234);
      });

      it("カンマ区切りの価格も正しく処理できる", () => {
        expect(extractPriceNumber("12,345円")).toBe(12345);
        expect(extractPriceNumber("100,000円")).toBe(100000);
        expect(extractPriceNumber("1,234,567円")).toBe(1234567);
      });

      it("数値が含まれていない場合は0を返す", () => {
        expect(extractPriceNumber("円")).toBe(0);
        expect(extractPriceNumber("価格未定")).toBe(0);
        expect(extractPriceNumber("")).toBe(0);
        expect(extractPriceNumber("無料")).toBe(0);
      });

      it("前後にテキストが含まれていても数値を抽出できる", () => {
        expect(extractPriceNumber("価格: 500円 (税込)")).toBe(500);
        expect(extractPriceNumber("通常価格 2,500円")).toBe(2500);
      });
    });

    describe("extractStarRating", () => {
      it("星評価のクラス名から正しく評価値を抽出できる", () => {
        const $ = cheerio.load('<div class="star_45"></div>');
        const element = $(".star_45");
        expect(extractStarRating(element)).toBe(4.5);
      });

      it("異なる評価値も正しく処理できる", () => {
        const $ = cheerio.load('<div class="star_50"></div>');
        expect(extractStarRating($(".star_50"))).toBe(5.0);

        const $2 = cheerio.load('<div class="star_35"></div>');
        expect(extractStarRating($2(".star_35"))).toBe(3.5);

        const $3 = cheerio.load('<div class="star_10"></div>');
        expect(extractStarRating($3(".star_10"))).toBe(1.0);
      });

      it("星評価のクラスが無い場合は0を返す", () => {
        const $ = cheerio.load('<div class="no-rating"></div>');
        const element = $(".no-rating");
        expect(extractStarRating(element)).toBe(0);
      });

      it("クラス名が不正な場合は0を返す", () => {
        const $ = cheerio.load('<div class="star_invalid"></div>');
        const element = $(".star_invalid");
        expect(extractStarRating(element)).toBe(0);
      });
    });

    describe("extractNumberFromParentheses", () => {
      it("括弧内の数値を正しく抽出できる", () => {
        expect(extractNumberFromParentheses("評価 (123)")).toBe(123);
        expect(extractNumberFromParentheses("レビュー (45)")).toBe(45);
        expect(extractNumberFromParentheses("(1)")).toBe(1);
      });

      it("カンマ区切りの数値も正しく処理できる", () => {
        expect(extractNumberFromParentheses("評価 (1,234)")).toBe(1234);
        expect(extractNumberFromParentheses("レビュー (10,000)")).toBe(10000);
        expect(extractNumberFromParentheses("(123,456)")).toBe(123456);
      });

      it("括弧が無い場合は0を返す", () => {
        expect(extractNumberFromParentheses("評価")).toBe(0);
        expect(extractNumberFromParentheses("123")).toBe(0);
        expect(extractNumberFromParentheses("")).toBe(0);
      });

      it("括弧内に数値が無い場合は0を返す", () => {
        expect(extractNumberFromParentheses("評価 ()")).toBe(0);
        expect(extractNumberFromParentheses("評価 (なし)")).toBe(0);
        expect(extractNumberFromParentheses("評価 (abc)")).toBe(0);
      });

      it("複数の括弧がある場合は最初の数値を抽出する", () => {
        expect(extractNumberFromParentheses("評価 (123) その他 (456)")).toBe(
          123,
        );
      });
    });

    describe("parseSampleImages", () => {
      it("有効なJSONデータからサンプル画像情報を抽出できる", () => {
        const sampleData = JSON.stringify([
          { thumb: "thumb1.jpg", width: "200", height: "300" },
          { thumb: "thumb2.jpg", width: "400", height: "600" },
        ]);

        const result = parseSampleImages(sampleData);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          thumb: "thumb1.jpg",
          width: 200,
          height: 300,
        });
        expect(result[1]).toEqual({
          thumb: "thumb2.jpg",
          width: 400,
          height: 600,
        });
      });

      it("width、heightが無い場合もthumbは抽出できる", () => {
        const sampleData = JSON.stringify([
          { thumb: "thumb1.jpg" },
          { thumb: "thumb2.jpg", width: "200" },
        ]);

        const result = parseSampleImages(sampleData);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          thumb: "thumb1.jpg",
          width: undefined,
          height: undefined,
        });
        expect(result[1]).toEqual({
          thumb: "thumb2.jpg",
          width: 200,
          height: undefined,
        });
      });

      it("不正なJSONの場合は空配列を返す", () => {
        const result = parseSampleImages("invalid json");
        expect(result).toEqual([]);
      });

      it("配列でないJSONの場合は空配列を返す", () => {
        const sampleData = JSON.stringify({ thumb: "thumb1.jpg" });
        const result = parseSampleImages(sampleData);
        expect(result).toEqual([]);
      });

      it("空文字列の場合は空配列を返す", () => {
        const result = parseSampleImages("");
        expect(result).toEqual([]);
      });
    });
  });

  describe("エラーハンドリングとエッジケース", () => {
    it("HTMLパース時の各種エラーケースを適切に処理できる", () => {
      // 不正なHTMLでもエラーを起こさない
      const invalidHtml = "<invalid><html>test";
      const works = parseWorksFromHTML(invalidHtml);
      expect(works).toEqual([]);
    });

    it("必須フィールドが一部欠けていても他の作品は処理できる", () => {
      const mixedHtml = `
        <table class="work_1col_table">
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ111111.html">
                  <img src="//img.dlsite.jp/test.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <!-- タイトルが欠けている（work_name要素がない） -->
                <dd class="maker_name"><a href="#">サークル1</a></dd>
              </dl>
            </td>
          </tr>
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ222222.html">
                  <img src="//img.dlsite.jp/test2.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <dt class="work_name">
                  <a href="/product_id/RJ222222.html" title="正常な作品">
                    正常な作品
                  </a>
                </dt>
                <dd class="maker_name"><a href="#">サークル2</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts"><span class="work_price_base">200</span><span class="work_price_suffix">円</span></span>
                  </span>
                </dd>
              </dl>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(mixedHtml);
      expect(works).toHaveLength(1);
      expect(works[0].productId).toBe("RJ222222");
      expect(works[0].title).toBe("正常な作品");
    });

    it("価格情報が様々な形式でも対応できる", () => {
      const priceVariationsHtml = `
        <table class="work_1col_table">
          <tr>
            <td class="work_1col_thumb">
              <div class="work_thumb">
                <a href="/product_id/RJ333333.html">
                  <img src="test.jpg" />
                </a>
                <div class="work_category type_SOU">音声作品</div>
              </div>
            </td>
            <td>
              <dl class="work_1col">
                <dt class="work_name">
                  <div class="icon_wrap">
                    <span class="icon_lead_01 type_sale" title="25%OFF">25%OFF</span>
                  </div>
                  <a href="/product_id/RJ333333.html" title="価格テスト作品">
                    価格テスト作品
                  </a>
                </dt>
                <dd class="maker_name"><a href="#">テストサークル</a></dd>
                <dd class="work_price_wrap">
                  <span class="work_price">
                    <span class="work_price_parts">
                      <span class="work_price_base">1500</span>
                      <span class="work_price_suffix">円</span>
                    </span>
                  </span>
                  <span class="strike">
                    <span class="work_price_parts">
                      <span class="work_price_base">2000</span>
                      <span class="work_price_suffix">円</span>
                    </span>
                  </span>
                  <span class="separator">/</span>
                  <span class="work_point">150pt (10%還元)</span>
                </dd>
              </dl>
            </td>
          </tr>
        </table>
      `;

      const works = parseWorksFromHTML(priceVariationsHtml);
      expect(works).toHaveLength(1);
      expect(works[0].currentPrice).toBe(1500);
      expect(works[0].originalPrice).toBe(2000);
      expect(works[0].discount).toBe(25);
      expect(works[0].point).toBe(150);
    });
  });
});
