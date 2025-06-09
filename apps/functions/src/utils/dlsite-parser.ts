/**
 * DLsite HTML パーサー
 *
 * DLsiteの検索結果HTMLから作品情報を抽出する機能を提供します。
 * 30.jsonのサンプルデータに基づいて実装されています。
 */

import type { WorkCategory } from "@suzumina.click/shared-types";
import * as cheerio from "cheerio";
import * as logger from "./logger";

/**
 * HTMLから抽出される生のデータ構造
 */
export interface ParsedWorkData {
  /** DLsite商品ID（RJ236867など） */
  productId: string;
  /** 作品タイトル */
  title: string;
  /** サークル名 */
  circle: string;
  /** 声優名（存在する場合） */
  author?: string;
  /** 作品カテゴリ */
  category: WorkCategory;
  /** 作品ページURL */
  workUrl: string;
  /** サムネイル画像URL */
  thumbnailUrl: string;
  /** 現在価格 */
  currentPrice: number;
  /** 元の価格（セール時） */
  originalPrice?: number;
  /** 割引率 */
  discount?: number;
  /** ポイント */
  point?: number;
  /** 評価（星の数） */
  stars?: number;
  /** 評価数 */
  ratingCount?: number;
  /** レビュー数 */
  reviewCount?: number;
  /** 販売数 */
  salesCount?: number;
  /** 年齢制限情報 */
  ageRating?: string;
  /** 独占配信フラグ */
  isExclusive: boolean;
  /** 作品タグ */
  tags?: string[];
  /** サンプル画像情報 */
  sampleImages: Array<{
    thumb: string;
    width?: number;
    height?: number;
  }>;
}

/**
 * 作品カテゴリをDLsiteのclass名から変換
 */
export function extractCategoryFromClass(
  categoryElement: cheerio.Cheerio,
): WorkCategory {
  const classNames = categoryElement.attr("class") || "";

  if (classNames.includes("type_ADV")) return "ADV";
  if (classNames.includes("type_SOU")) return "SOU";
  if (classNames.includes("type_RPG")) return "RPG";
  if (classNames.includes("type_MOV")) return "MOV";
  if (classNames.includes("type_MNG")) return "MNG";
  if (classNames.includes("type_GAM")) return "GAM";
  if (classNames.includes("type_CG")) return "CG";
  if (classNames.includes("type_TOL")) return "TOL";
  if (classNames.includes("type_ET3")) return "ET3";
  if (classNames.includes("type_SLN")) return "SLN";
  if (classNames.includes("type_ACN")) return "ACN";
  if (classNames.includes("type_PZL")) return "PZL";
  if (classNames.includes("type_QIZ")) return "QIZ";
  if (classNames.includes("type_TBL")) return "TBL";
  if (classNames.includes("type_DGT")) return "DGT";

  return "etc";
}

/**
 * 価格文字列から数値を抽出
 */
export function extractPriceNumber(priceText: string): number {
  const match = priceText.match(/(\d+(?:,\d+)*)/);
  if (match) {
    return Number.parseInt(match[1].replace(/,/g, ""), 10);
  }
  return 0;
}

/**
 * 評価の星の数を抽出
 */
export function extractStarRating(ratingElement: cheerio.Cheerio): number {
  const className = ratingElement.attr("class") || "";
  const match = className.match(/star_(\d+)/);
  if (match) {
    return Number.parseInt(match[1], 10) / 10; // star_45 -> 4.5
  }
  return 0;
}

/**
 * 括弧内の数値を抽出（評価数、レビュー数など）
 */
export function extractNumberFromParentheses(text: string): number {
  const match = text.match(/\((\d+(?:,\d+)*)\)/);
  if (match) {
    return Number.parseInt(match[1].replace(/,/g, ""), 10);
  }
  return 0;
}

/**
 * サンプル画像データを解析
 */
export function parseSampleImages(
  sampleData: string,
): Array<{ thumb: string; width?: number; height?: number }> {
  if (!sampleData || sampleData.trim() === "") {
    // 空のデータは正常ケース（サンプル画像がない作品）
    return [];
  }

  try {
    const samples = JSON.parse(sampleData);
    if (Array.isArray(samples)) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return samples.map((sample: any) => ({
        thumb: sample.thumb || "",
        width: sample.width ? Number.parseInt(sample.width, 10) : undefined,
        height: sample.height ? Number.parseInt(sample.height, 10) : undefined,
      }));
    }

    // 配列でない場合はサンプル画像なしとして処理
    logger.debug("サンプル画像データが配列ではありません:", {
      sampleData: sampleData.substring(0, 100),
    });
  } catch (error) {
    // JSONパースエラーは警告レベルを下げ、作品処理を継続
    logger.debug("サンプル画像データのJSONパースに失敗（作品処理は継続）:", {
      error: error instanceof Error ? error.message : String(error),
      sampleDataPreview: sampleData.substring(0, 100),
    });
  }
  return [];
}

/**
 * タグ情報を抽出する関数
 */
export function extractTags($item: cheerio.Cheerio): string[] {
  const tags: string[] = [];

  // search_tag内のリンクからタグを抽出
  $item.find(".search_tag a").each((_, element) => {
    const tagText = cheerio.load(element)(element).text().trim();
    if (tagText && !tags.includes(tagText)) {
      tags.push(tagText);
    }
  });

  return tags;
}

/**
 * DLsiteの検索結果HTMLから作品データを抽出（新HTML構造対応）
 */
export function parseWorksFromHTML(html: string): ParsedWorkData[] {
  const $ = cheerio.load(html);
  const works: ParsedWorkData[] = [];

  logger.debug("HTMLパース開始（新構造対応）");

  // 新しい構造: table.work_1col_table の tr 要素から作品情報を取得
  $("table.work_1col_table tr").each(
    (index: number, element: cheerio.Element) => {
      try {
        const $item = $(element);

        // productIdの抽出（a要素のhrefまたはidから）
        const linkElement = $item.find("a[href*='/product_id/']").first();
        if (linkElement.length === 0) {
          // 作品データがない行（ヘッダー行など）はスキップ
          return;
        }

        const href = linkElement.attr("href") || "";
        const productIdMatch = href.match(/\/product_id\/([^.]+)\.html/);
        if (!productIdMatch) {
          logger.warn(
            `作品${index}: product_idが抽出できません。href: ${href}`,
          );
          return;
        }
        const productId = productIdMatch[1];

        // タイトルは .work_name 内のリンクから取得
        const titleElement = $item
          .find(".work_name a[href*='/product_id/']")
          .first();
        const title =
          titleElement.attr("title")?.trim() ||
          titleElement.text().trim() ||
          "";
        if (!title) {
          logger.warn(`作品${productId}: タイトルが見つかりません`);
          return;
        }

        const circle = $item.find(".maker_name a").first().text().trim();
        if (!circle) {
          logger.warn(`作品${productId}: サークル名が見つかりません`);
          return;
        }

        // 声優名の抽出（author要素から）
        const author = $item.find(".author a").text().trim() || undefined;

        // カテゴリの抽出
        const categoryElement = $item.find(".work_category");
        const category = extractCategoryFromClass(categoryElement);

        // URLの抽出
        const workUrl = href;
        if (!workUrl) {
          logger.warn(`作品${productId}: 作品URLが見つかりません`);
          return;
        }

        // サムネイル画像URLの抽出
        let thumbnailUrl =
          $item.find("img.lazy").attr("src") ||
          $item.find("img").first().attr("src") ||
          $item.find("img.work_thumb").attr("src") ||
          $item.find("img[data-src]").attr("data-src") ||
          "";

        if (!thumbnailUrl) {
          // サムネイル画像が見つからない場合はデフォルト画像を使用
          thumbnailUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/${productId.slice(0, 4)}000/${productId}/${productId}_img_main.jpg`;
          logger.debug(
            `作品${productId}: サムネイル画像URLが見つからないため、デフォルトURLを使用`,
          );
        }

        // 価格情報の抽出（新構造対応）
        const currentPriceText = $item
          .find(".work_price .work_price_parts")
          .not(".strike .work_price_parts")
          .text()
          .trim();
        const currentPrice = extractPriceNumber(currentPriceText);

        const originalPriceText = $item
          .find(".strike .work_price_parts")
          .text()
          .trim();
        const originalPrice = originalPriceText
          ? extractPriceNumber(originalPriceText)
          : undefined;

        // 割引率の抽出
        const discountElement = $item.find(".icon_lead_01.type_sale");
        const discountText = discountElement.text().trim();
        let discount: number | undefined;
        if (discountText) {
          const discountMatch = discountText.match(/(\d+)%OFF/);
          if (discountMatch) {
            discount = Number.parseInt(discountMatch[1], 10);
          }
        }

        // ポイントの抽出
        const pointText = $item.find(".work_point").text().trim();
        const pointMatch = pointText.match(/(\d+)pt/);
        const point = pointMatch
          ? Number.parseInt(pointMatch[1], 10)
          : undefined;

        // 評価情報の抽出
        const ratingElement = $item.find(".star_rating");
        let stars: number | undefined;
        let ratingCount: number | undefined;
        let reviewCount: number | undefined;

        if (ratingElement.length > 0) {
          stars = extractStarRating(ratingElement);
          const ratingText = ratingElement.text().trim();
          ratingCount = extractNumberFromParentheses(ratingText);
        }

        // レビュー数の抽出
        const reviewElement = $item.find(".work_review a");
        if (reviewElement.length > 0) {
          const reviewText = reviewElement.text().trim();
          reviewCount = extractNumberFromParentheses(reviewText);
        }

        // 販売数の抽出
        const salesElement = $item.find(`._dl_count_${productId}`);
        let salesCount: number | undefined;
        if (salesElement.length > 0) {
          const salesText = salesElement.text().trim();
          salesCount = extractPriceNumber(salesText);
        }

        // 年齢制限の抽出
        const ageRatingElement = $item.find(".icon_GEN, .icon_R15, .icon_R18");
        const ageRating =
          ageRatingElement.attr("title") ||
          ageRatingElement.text().trim() ||
          undefined;

        // 独占配信フラグの判定
        const isExclusive =
          $item.find(".icon_lead_01.type_exclusive").length > 0;

        // タグ情報の抽出（新機能）
        const tags = extractTags($item);

        // サンプル画像の抽出
        const sampleButton = $item.find("[data-view_samples]");
        let sampleImages: Array<{
          thumb: string;
          width?: number;
          height?: number;
        }> = [];
        if (sampleButton.length > 0) {
          const sampleData = sampleButton.attr("data-view_samples");
          if (sampleData) {
            sampleImages = parseSampleImages(sampleData);
          }
        }

        const work: ParsedWorkData = {
          productId,
          title,
          circle,
          author,
          category,
          workUrl: workUrl.startsWith("https://")
            ? workUrl
            : `https://www.dlsite.com${workUrl}`,
          thumbnailUrl: thumbnailUrl.startsWith("//")
            ? `https:${thumbnailUrl}`
            : thumbnailUrl,
          currentPrice,
          originalPrice,
          discount,
          point,
          stars,
          ratingCount,
          reviewCount,
          salesCount,
          ageRating,
          isExclusive,
          sampleImages,
          tags, // 新しく追加されたタグ情報
        };

        works.push(work);
        logger.debug(
          `作品${productId}の解析完了: ${title}, タグ数: ${tags.length}`,
        );
      } catch (error) {
        logger.error(`作品${index}の解析中にエラーが発生:`, error);
      }
    },
  );

  logger.info(`HTMLパース完了: ${works.length}件の作品を抽出`);
  return works;
}

/**
 * 単一の作品検索結果JSONからHTMLを抽出してパース
 */
export function parseWorksFromSearchResult(
  searchResultJson: string,
): ParsedWorkData[] {
  try {
    const data = JSON.parse(searchResultJson);
    const html = data.search_result;

    if (typeof html !== "string") {
      throw new Error("search_resultフィールドが文字列ではありません");
    }

    return parseWorksFromHTML(html);
  } catch (error) {
    logger.error("検索結果JSONの解析に失敗:", error);
    return [];
  }
}
