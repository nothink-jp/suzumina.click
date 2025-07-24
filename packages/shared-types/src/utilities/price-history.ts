import { z } from "zod";
import { LocalePriceSchema } from "../entities/work";

/**
 * 価格履歴ドキュメント型定義（サブコレクション方式）
 * dlsiteWorks/{workId}/priceHistory/{YYYY-MM-DD}
 */
export const PriceHistoryDocumentSchema = z.object({
	/** 作品ID（親ドキュメントID） */
	workId: z.string().min(1),
	/** 記録日付（YYYY-MM-DD） */
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	/** 記録日時（ISO string） */
	capturedAt: z.string().datetime(),

	// === Individual Info API価格データ（そのまま保存） ===
	/** 多通貨価格配列 - Individual Info API `locale_prices` */
	localePrices: z.array(LocalePriceSchema).default([]),

	// === 表示用サマリー価格（JPY基準） ===
	/** 定価（JPY） */
	regularPrice: z.number().nonnegative(),
	/** セール価格（JPY、セール時のみ） */
	discountPrice: z.number().nonnegative().optional(),
	/** 割引率（%） */
	discountRate: z.number().min(0).max(100).default(0),
	/** キャンペーンID */
	campaignId: z.number().int().optional(),

	// === 価格変動検出フラグ ===
	/** 前日から価格変更あり */
	priceChanged: z.boolean().default(false),
	/** 新しいキャンペーン開始 */
	newCampaign: z.boolean().default(false),

	// === 収集メタデータ ===
	/** データ取得元 */
	dataSource: z.literal("individual_api"),
	/** API呼び出し回数（その日） */
	apiCallCount: z.number().positive().default(1),
	/** データ収集バージョン */
	collectionVersion: z.string().default("1.0"),
});

export type PriceHistoryDocument = z.infer<typeof PriceHistoryDocumentSchema>;

/**
 * フロントエンド表示用価格データポイント
 */
export const PriceHistoryPointSchema = z.object({
	/** 日付（YYYY-MM-DD） */
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	/** 定価 */
	regularPrice: z.number().nonnegative(),
	/** セール価格（セール時のみ） */
	discountPrice: z.number().nonnegative().optional(),
	/** その日の最安値 */
	lowestPrice: z.number().nonnegative(),
	/** 割引率（%） */
	discountRate: z.number().min(0).max(100),
	/** セール中フラグ */
	hasDiscount: z.boolean(),
	/** キャンペーンID */
	campaignId: z.number().int().optional(),
	/** 価格変更フラグ */
	priceChanged: z.boolean(),
});

export type PriceHistoryPoint = z.infer<typeof PriceHistoryPointSchema>;

/**
 * 価格統計情報
 */
export const PriceStatisticsSchema = z.object({
	/** 集計期間 */
	period: z.object({
		start: z.string(),
		end: z.string(),
		totalDays: z.number().int().nonnegative(),
	}),
	/** 表示通貨 */
	currency: z.string(),
	/** 最安値情報 */
	lowest: z.object({
		price: z.number().nonnegative(),
		date: z.string(),
		currency: z.string(),
	}),
	/** 最高値情報 */
	highest: z.object({
		price: z.number().nonnegative(),
		date: z.string(),
		currency: z.string(),
	}),
	/** 最大割引情報 */
	maxDiscount: z.object({
		rate: z.number().min(0).max(100),
		price: z.number().nonnegative(),
		date: z.string(),
	}),
	/** 平均価格 */
	averagePrice: z.number().nonnegative(),
	/** 期間内価格変動率（%） */
	priceChangeRate: z.number(),
	/** セール実施日数 */
	totalDiscountDays: z.number().int().nonnegative(),
});

export type PriceStatistics = z.infer<typeof PriceStatisticsSchema>;

/**
 * 価格履歴取得リクエストスキーマ
 */
export const PriceHistoryRequestSchema = z.object({
	/** 作品ID */
	workId: z.string().min(1),
	/** 表示通貨 */
	currency: z.string().default("JPY"),
	/** 表示期間（日数、0 = 全期間） */
	days: z.number().min(0).default(30),
});

export type PriceHistoryRequest = z.infer<typeof PriceHistoryRequestSchema>;

/**
 * 価格履歴レスポンススキーマ
 */
export const PriceHistoryResponseSchema = z.object({
	/** 作品ID */
	workId: z.string(),
	/** 表示通貨 */
	currency: z.string(),
	/** 期間情報 */
	period: z.object({
		days: z.number().int().min(0),
		start: z.string(),
		end: z.string(),
		totalRecords: z.number().int().nonnegative(),
	}),
	/** 価格履歴データポイント */
	priceHistory: z.array(PriceHistoryPointSchema),
	/** 統計情報 */
	statistics: PriceStatisticsSchema,
	/** データソース */
	dataSource: z.literal("subcollection"),
});

export type PriceHistoryResponse = z.infer<typeof PriceHistoryResponseSchema>;

/**
 * 支援通貨情報
 */
export const SUPPORTED_CURRENCIES = [
	{ code: "JPY", label: "日本円", symbol: "¥", region: "JP" },
	{ code: "USD", label: "US Dollar", symbol: "$", region: "US" },
	{ code: "EUR", label: "Euro", symbol: "€", region: "EU" },
	{ code: "CNY", label: "人民币", symbol: "¥", region: "CN" },
	{ code: "TWD", label: "新臺幣", symbol: "NT$", region: "TW" },
	{ code: "KRW", label: "원", symbol: "₩", region: "KR" },
] as const;

/**
 * 通貨コードから表示情報を取得
 */
export function getCurrencyInfo(currencyCode: string) {
	return SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
}

/**
 * 価格をフォーマット
 */
export function formatPrice(price: number, currencyCode: string): string {
	const currencyInfo = getCurrencyInfo(currencyCode);
	const symbol = currencyInfo?.symbol || currencyCode;
	return `${symbol}${price.toLocaleString()}`;
}
