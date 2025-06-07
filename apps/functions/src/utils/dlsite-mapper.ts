/**
 * DLsite データマッパー
 *
 * HTMLパーサーから得られた生データを型安全なデータ構造に変換します。
 */

import {
  type DLsiteWorkBase,
  DLsiteWorkBaseSchema,
  type FirestoreDLsiteWorkData,
  FirestoreDLsiteWorkSchema,
  type PriceInfo,
  type RatingInfo,
} from "@suzumina.click/shared-types";
import type { ParsedWorkData } from "./dlsite-parser";
import * as logger from "./logger";

/**
 * パースされたデータからPriceInfo構造に変換
 */
function mapToPriceInfo(parsed: ParsedWorkData): PriceInfo {
  return {
    current: parsed.currentPrice,
    original: parsed.originalPrice,
    currency: "JPY",
    discount: parsed.discount,
    point: parsed.point,
  };
}

/**
 * パースされたデータからRatingInfo構造に変換
 */
function mapToRatingInfo(parsed: ParsedWorkData): RatingInfo | undefined {
  if (parsed.stars === undefined || parsed.stars === 0) {
    return undefined;
  }

  return {
    stars: parsed.stars,
    count: parsed.ratingCount || 0,
    reviewCount: parsed.reviewCount,
  };
}

/**
 * 相対URLを絶対URLに変換
 */
function normalizeUrl(url: string): string {
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  if (url.startsWith("/")) {
    return `https://www.dlsite.com${url}`;
  }
  // スラッシュで始まらない相対パスの場合、DLsiteのルートパスとして扱う
  return `https://www.dlsite.com/${url}`;
}

/**
 * パースされた作品データをDLsiteWorkBase形式に変換
 */
export function mapToWorkBase(parsed: ParsedWorkData): DLsiteWorkBase {
  try {
    const price = mapToPriceInfo(parsed);
    const rating = mapToRatingInfo(parsed);

    // サンプル画像のURLを正規化
    const normalizedSampleImages = parsed.sampleImages.map((sample) => ({
      thumb: normalizeUrl(sample.thumb),
      width: sample.width,
      height: sample.height,
    }));

    const workBase: DLsiteWorkBase = {
      id: parsed.productId, // FirestoreドキュメントIDとして商品IDを使用
      productId: parsed.productId,
      title: parsed.title,
      circle: parsed.circle,
      author: parsed.author,
      description: "", // HTMLパーサーでは説明は抽出しないため空文字
      category: parsed.category,
      workUrl: normalizeUrl(parsed.workUrl),
      thumbnailUrl: normalizeUrl(parsed.thumbnailUrl),
      price,
      rating,
      salesCount: parsed.salesCount,
      ageRating: parsed.ageRating,
      tags: [], // HTMLパーサーではタグは抽出しないため空配列
      sampleImages: normalizedSampleImages,
      isExclusive: parsed.isExclusive,
    };

    // Zodスキーマで検証
    return DLsiteWorkBaseSchema.parse(workBase);
  } catch (error) {
    logger.error(`作品データのマッピングに失敗: ${parsed.productId}`, {
      error,
      parsed,
    });
    throw new Error(`作品データのマッピングに失敗: ${parsed.productId}`);
  }
}

/**
 * DLsiteWorkBaseをFirestore保存用のデータに変換
 */
export function mapToFirestoreData(
  base: DLsiteWorkBase,
  existingData?: Partial<FirestoreDLsiteWorkData>,
): FirestoreDLsiteWorkData {
  try {
    const now = new Date().toISOString();

    const firestoreData: FirestoreDLsiteWorkData = {
      ...base,
      lastFetchedAt: now,
      createdAt: existingData?.createdAt || now, // 既存データがあれば作成日時を保持
      updatedAt: now,
    };

    // Zodスキーマで検証
    return FirestoreDLsiteWorkSchema.parse(firestoreData);
  } catch (error) {
    logger.error(`Firestoreデータの変換に失敗: ${base.id}`, { error, base });
    throw new Error(`Firestoreデータの変換に失敗: ${base.id}`);
  }
}

/**
 * 複数の作品データを一括変換
 */
export function mapMultipleWorks(
  parsedWorks: ParsedWorkData[],
  existingDataMap?: Map<string, Partial<FirestoreDLsiteWorkData>>,
): FirestoreDLsiteWorkData[] {
  const results: FirestoreDLsiteWorkData[] = [];
  const errors: string[] = [];

  for (const parsed of parsedWorks) {
    try {
      const workBase = mapToWorkBase(parsed);
      const existingData = existingDataMap?.get(parsed.productId);
      const firestoreData = mapToFirestoreData(workBase, existingData);
      results.push(firestoreData);
    } catch (error) {
      logger.warn(`作品${parsed.productId}の変換をスキップ:`, { error });
      errors.push(parsed.productId);
    }
  }

  if (errors.length > 0) {
    logger.warn(`${errors.length}件の作品変換に失敗:`, { errors });
  }

  logger.info(
    `作品データ変換完了: ${results.length}件成功, ${errors.length}件失敗`,
  );
  return results;
}

/**
 * 作品データの更新が必要かどうかを判定
 */
export function shouldUpdateWork(
  newData: DLsiteWorkBase,
  existingData: FirestoreDLsiteWorkData,
): boolean {
  // 価格が変更された場合
  if (newData.price.current !== existingData.price.current) {
    return true;
  }

  // 評価が変更された場合
  if (newData.rating?.count !== existingData.rating?.count) {
    return true;
  }

  // 販売数が変更された場合
  if (newData.salesCount !== existingData.salesCount) {
    return true;
  }

  // タイトルが変更された場合
  if (newData.title !== existingData.title) {
    return true;
  }

  // 24時間以上更新されていない場合
  const lastUpdated = new Date(existingData.updatedAt);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (lastUpdated < twentyFourHoursAgo) {
    return true;
  }

  return false;
}

/**
 * 更新が必要な作品のみをフィルタリング
 */
export function filterWorksForUpdate(
  newWorks: DLsiteWorkBase[],
  existingWorksMap: Map<string, FirestoreDLsiteWorkData>,
): {
  toCreate: DLsiteWorkBase[];
  toUpdate: Array<{ new: DLsiteWorkBase; existing: FirestoreDLsiteWorkData }>;
  unchanged: DLsiteWorkBase[];
} {
  const toCreate: DLsiteWorkBase[] = [];
  const toUpdate: Array<{
    new: DLsiteWorkBase;
    existing: FirestoreDLsiteWorkData;
  }> = [];
  const unchanged: DLsiteWorkBase[] = [];

  for (const newWork of newWorks) {
    const existing = existingWorksMap.get(newWork.productId);

    if (!existing) {
      toCreate.push(newWork);
    } else if (shouldUpdateWork(newWork, existing)) {
      toUpdate.push({ new: newWork, existing });
    } else {
      unchanged.push(newWork);
    }
  }

  logger.info("作品更新判定完了:", {
    toCreate: toCreate.length,
    toUpdate: toUpdate.length,
    unchanged: unchanged.length,
  });

  return { toCreate, toUpdate, unchanged };
}

/**
 * データ品質チェック
 */
export function validateWorkData(work: DLsiteWorkBase): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // 必須フィールドのチェック
  if (!work.title.trim()) {
    warnings.push("タイトルが空です");
  }

  if (!work.circle.trim()) {
    warnings.push("サークル名が空です");
  }

  // 価格の妥当性チェック
  if (work.price.current < 0) {
    warnings.push("価格が負の値です");
  }

  if (work.price.original && work.price.original <= work.price.current) {
    warnings.push("元の価格が現在価格以下です");
  }

  if (
    work.price.discount &&
    (work.price.discount < 0 || work.price.discount > 100)
  ) {
    warnings.push("割引率が不正です (0-100%の範囲外)");
  }

  // 評価の妥当性チェック
  if (work.rating) {
    if (work.rating.stars < 0 || work.rating.stars > 5) {
      warnings.push("評価星数が不正です (0-5の範囲外)");
    }
    if (work.rating.count < 0) {
      warnings.push("評価数が負の値です");
    }
  }

  // URL の妥当性チェック
  try {
    new URL(work.workUrl);
  } catch {
    warnings.push("作品URLが不正です");
  }

  try {
    new URL(work.thumbnailUrl);
  } catch {
    warnings.push("サムネイルURLが不正です");
  }

  const isValid = warnings.length === 0;
  return { isValid, warnings };
}
