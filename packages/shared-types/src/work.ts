import { z } from "zod";

/**
 * DLsite作品カテゴリの型定義
 * HTMLから抽出される作品種別に対応
 */
export const WorkCategorySchema = z.enum([
  "ADV", // アドベンチャー
  "SOU", // ボイス・ASMR
  "RPG", // ロールプレイング
  "MOV", // 動画
  "MNG", // マンガ
  "GAM", // ゲーム
  "CG", // CG・イラスト
  "TOL", // ツール・アクセサリ
  "ET3", // その他・3D
  "SLN", // シミュレーション
  "ACN", // アクション
  "PZL", // パズル
  "QIZ", // クイズ
  "TBL", // テーブル
  "DGT", // デジタルノベル
  "etc", // その他
]);

/**
 * 価格情報のZodスキーマ定義
 */
export const PriceInfoSchema = z.object({
  /** 現在価格（円） */
  current: z.number().int().nonnegative(),
  /** 元の価格（セール時のみ）（円） */
  original: z.number().int().nonnegative().optional(),
  /** 通貨コード */
  currency: z.string().default("JPY"),
  /** 割引率（パーセント） */
  discount: z.number().int().min(0).max(100).optional(),
  /** ポイント */
  point: z.number().int().nonnegative().optional(),
});

/**
 * 評価情報のZodスキーマ定義
 */
export const RatingInfoSchema = z.object({
  /** 星評価（1-5） */
  stars: z.number().min(0).max(5),
  /** 評価数 */
  count: z.number().int().nonnegative(),
  /** レビュー数 */
  reviewCount: z.number().int().nonnegative().optional(),
});

/**
 * サンプル画像情報のZodスキーマ定義
 */
export const SampleImageSchema = z.object({
  /** サムネイル画像URL */
  thumb: z.string().url(),
  /** 画像幅 */
  width: z.number().int().positive().optional(),
  /** 画像高さ */
  height: z.number().int().positive().optional(),
});

/**
 * 基本的なDLsite作品データのZodスキーマ定義
 */
export const DLsiteWorkBaseSchema = z.object({
  /** FirestoreドキュメントID */
  id: z.string().min(1, {
    message: "作品IDは1文字以上である必要があります",
  }),
  /** DLsite商品ID（RJ236867など） */
  productId: z.string().min(1, {
    message: "商品IDは1文字以上である必要があります",
  }),
  /** 作品タイトル */
  title: z.string().min(1, {
    message: "作品タイトルは1文字以上である必要があります",
  }),
  /** サークル名 */
  circle: z.string().min(1, {
    message: "サークル名は1文字以上である必要があります",
  }),
  /** 声優名（涼花みなせなど） */
  author: z.string().optional(),
  /** 作品説明 */
  description: z.string().default(""),
  /** 作品カテゴリ */
  category: WorkCategorySchema,
  /** DLsite作品ページURL */
  workUrl: z.string().url({
    message: "作品URLは有効なURL形式である必要があります",
  }),
  /** サムネイル画像URL */
  thumbnailUrl: z.string().url({
    message: "サムネイルURLは有効なURL形式である必要があります",
  }),
  /** 価格情報 */
  price: PriceInfoSchema,
  /** 評価情報 */
  rating: RatingInfoSchema.optional(),
  /** 販売数 */
  salesCount: z.number().int().nonnegative().optional(),
  /** 年齢制限（全年齢、R-15、R-18など） */
  ageRating: z.string().optional(),
  /** 作品タグ */
  tags: z.array(z.string()).default([]),
  /** サンプル画像 */
  sampleImages: z.array(SampleImageSchema).default([]),
  /** 独占配信フラグ */
  isExclusive: z.boolean().default(false),
});

/**
 * Firestoreに保存するDLsite作品データのZodスキーマ定義
 */
export const FirestoreDLsiteWorkSchema = DLsiteWorkBaseSchema.extend({
  /** 最終取得日時 */
  lastFetchedAt: z.string().datetime({
    message: "最終取得日時はISO形式の日時である必要があります",
  }),
  /** 作成日時 */
  createdAt: z.string().datetime({
    message: "作成日時はISO形式の日時である必要があります",
  }),
  /** 更新日時 */
  updatedAt: z.string().datetime({
    message: "更新日時はISO形式の日時である必要があります",
  }),
});

/**
 * フロントエンド表示用のDLsite作品データのZodスキーマ定義
 */
export const FrontendDLsiteWorkSchema = FirestoreDLsiteWorkSchema.extend({
  /** 表示用価格文字列 */
  displayPrice: z.string(),
  /** 割引表示テキスト */
  discountText: z.string().optional(),
  /** 評価表示テキスト */
  ratingText: z.string().optional(),
  /** 相対URL */
  relativeUrl: z.string(),
  /** ISO形式の日付文字列（フロントエンドでの使用のため） */
  createdAtISO: z.string().datetime(),
  lastFetchedAtISO: z.string().datetime(),
  updatedAtISO: z.string().datetime(),
});

/**
 * 作品リスト結果のZodスキーマ定義
 */
export const WorkListResultSchema = z.object({
  works: z.array(FrontendDLsiteWorkSchema),
  hasMore: z.boolean(),
  lastWork: FrontendDLsiteWorkSchema.optional(),
  totalCount: z.number().int().nonnegative().optional(),
});

/**
 * ページネーションパラメータのZodスキーマ定義
 */
export const WorkPaginationParamsSchema = z.object({
  limit: z.number().int().positive(),
  startAfter: z.string().optional(),
  author: z.string().optional(),
  category: WorkCategorySchema.optional(),
});

// Zodスキーマから型を抽出
export type WorkCategory = z.infer<typeof WorkCategorySchema>;
export type PriceInfo = z.infer<typeof PriceInfoSchema>;
export type RatingInfo = z.infer<typeof RatingInfoSchema>;
export type SampleImage = z.infer<typeof SampleImageSchema>;
export type DLsiteWorkBase = z.infer<typeof DLsiteWorkBaseSchema>;
export type FirestoreDLsiteWorkData = z.infer<typeof FirestoreDLsiteWorkSchema>;
export type FrontendDLsiteWorkData = z.infer<typeof FrontendDLsiteWorkSchema>;
export type WorkListResult = z.infer<typeof WorkListResultSchema>;
export type WorkPaginationParams = z.infer<typeof WorkPaginationParamsSchema>;

/**
 * Firestoreデータをフロントエンド表示用に変換するヘルパー関数
 * @param data Firestoreから取得したデータ
 * @returns フロントエンド表示用に変換されたデータ
 */
export function convertToFrontendWork(
  data: FirestoreDLsiteWorkData,
): FrontendDLsiteWorkData {
  // 表示用価格の生成
  const displayPrice =
    data.price.discount && data.price.original
      ? `${data.price.current}円（元：${data.price.original}円）`
      : `${data.price.current}円`;

  // 割引テキストの生成
  const discountText = data.price.discount
    ? `${data.price.discount}%OFF`
    : undefined;

  // 評価テキストの生成
  const ratingText = data.rating
    ? `★${data.rating.stars.toFixed(1)} (${data.rating.count})`
    : undefined;

  // 相対URLの生成
  const relativeUrl = `/maniax/work/=/product_id/${data.productId}.html`;

  // FrontendDLsiteWorkSchema形式のデータを生成
  const frontendData: FrontendDLsiteWorkData = {
    ...data,
    displayPrice,
    discountText,
    ratingText,
    relativeUrl,
    createdAtISO: data.createdAt,
    lastFetchedAtISO: data.lastFetchedAt,
    updatedAtISO: data.updatedAt,
  };

  // データの検証
  try {
    return FrontendDLsiteWorkSchema.parse(frontendData);
  } catch (error) {
    console.error("フロントエンド変換中にスキーマ検証エラー:", error);

    // エラー時でも最低限のデータを返す
    const now = new Date().toISOString();
    return {
      id: data.id,
      productId: data.productId,
      title: data.title,
      circle: data.circle,
      author: data.author,
      description: data.description || "",
      category: data.category,
      workUrl: data.workUrl,
      thumbnailUrl: data.thumbnailUrl,
      price: data.price,
      rating: data.rating,
      salesCount: data.salesCount,
      ageRating: data.ageRating,
      tags: data.tags || [],
      sampleImages: data.sampleImages || [],
      isExclusive: data.isExclusive || false,
      lastFetchedAt: data.lastFetchedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      displayPrice: `${data.price.current}円`,
      discountText,
      ratingText,
      relativeUrl,
      createdAtISO: data.createdAt,
      lastFetchedAtISO: data.lastFetchedAt,
      updatedAtISO: data.updatedAt,
    };
  }
}

/**
 * RSCからRCCへ安全にデータを渡すためのシリアライズ関数
 * @param data フロントエンド表示用データ
 * @returns シリアライズされたデータ文字列
 */
export function serializeWorkForRSC(data: FrontendDLsiteWorkData): string {
  return JSON.stringify(data);
}

/**
 * RCCでのデシリアライズ関数
 * @param serialized シリアライズされたデータ文字列
 * @returns 検証済みのフロントエンド表示用データ
 */
export function deserializeWorkForRCC(
  serialized: string,
): FrontendDLsiteWorkData {
  try {
    const data = JSON.parse(serialized);
    return FrontendDLsiteWorkSchema.parse(data);
  } catch (error) {
    console.error("デシリアライズまたはスキーマ検証エラー:", error);
    throw new Error("データの形式が無効です");
  }
}

/**
 * 作品リスト結果のシリアライズ関数
 * @param result 作品リスト結果
 * @returns シリアライズされたリスト結果
 */
export function serializeWorkListResult(result: WorkListResult): string {
  return JSON.stringify(result);
}

/**
 * 作品リスト結果のデシリアライズ関数
 * @param serialized シリアライズされたリスト結果
 * @returns 検証済みの作品リスト結果
 */
export function deserializeWorkListResult(serialized: string): WorkListResult {
  try {
    const data = JSON.parse(serialized);
    return WorkListResultSchema.parse(data);
  } catch (error) {
    console.error("リストのデシリアライズエラー:", error);
    return { works: [], hasMore: false };
  }
}

/**
 * Firestoreサーバーサイド（Cloud Functions）向けのデータ型定義
 * Timestampを使用するサーバーサイド向け
 */
export interface FirestoreServerDLsiteWorkData {
  /** FirestoreドキュメントID */
  id: string;
  /** DLsite商品ID */
  productId: string;
  /** 作品タイトル */
  title: string;
  /** サークル名 */
  circle: string;
  /** 声優名 */
  author?: string;
  /** 作品説明 */
  description: string;
  /** 作品カテゴリ */
  category: WorkCategory;
  /** DLsite作品ページURL */
  workUrl: string;
  /** サムネイル画像URL */
  thumbnailUrl: string;
  /** 価格情報 */
  price: PriceInfo;
  /** 評価情報 */
  rating?: RatingInfo;
  /** 販売数 */
  salesCount?: number;
  /** 年齢制限 */
  ageRating?: string;
  /** 作品タグ */
  tags: string[];
  /** サンプル画像 */
  sampleImages: SampleImage[];
  /** 独占配信フラグ */
  isExclusive: boolean;

  // Firestoreのサーバーサイドモデルではタイムスタンプを使用
  /** 最終取得日時（Firestore.Timestamp型） */
  lastFetchedAt: unknown; // Firestore.Timestamp型 (Firestore依存を避けるためunknown)
  /** 作成日時（Firestore.Timestamp型） */
  createdAt: unknown; // Firestore.Timestamp型
  /** 更新日時（Firestore.Timestamp型） */
  updatedAt: unknown; // Firestore.Timestamp型
}
