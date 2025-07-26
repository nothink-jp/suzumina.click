import { z } from "zod";

/**
 * Price Value Object
 *
 * 不変で価格を表現する値オブジェクト
 * DLsite作品の価格情報を扱う
 */
export const Price = z
	.object({
		/** 金額 */
		amount: z.number().int().min(0),
		/** 通貨コード (ISO 4217) */
		currency: z
			.string()
			.length(3)
			.regex(/^[A-Z]{3}$/),
		/** 元価格（割引前） */
		original: z.number().int().min(0).optional(),
		/** 割引率（パーセント） */
		discount: z.number().min(0).max(100).optional(),
		/** ポイント還元数 */
		point: z.number().int().min(0).optional(),
	})
	.transform((data) => ({
		...data,
		/** 無料かどうか */
		isFree: () => data.amount === 0,
		/** 割引中かどうか */
		isDiscounted: () => data.original !== undefined && data.original > data.amount,
		/** 割引額を計算 */
		discountAmount: () => (data.original ? data.original - data.amount : 0),
		/** 実効割引率を計算 */
		effectiveDiscountRate: () => {
			if (!data.original || data.original === 0) return 0;
			return Math.round(((data.original - data.amount) / data.original) * 100);
		},
		/** 他のPriceと等価か判定 */
		equals: (other: unknown): boolean => {
			// Price型のガードチェックを専用関数に委譲
			if (!isPriceType(other)) return false;
			const o = other as Record<string, unknown>;

			// 安全な比較
			return (
				data.amount === o.amount &&
				data.currency === o.currency &&
				data.original === o.original &&
				data.discount === o.discount &&
				data.point === o.point
			);
		},
		/** 価格を文字列形式で取得 */
		format: () => {
			const formatter = new Intl.NumberFormat("ja-JP", {
				style: "currency",
				currency: data.currency,
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			});
			return formatter.format(data.amount);
		},
	}));

export type Price = z.infer<typeof Price>;

/**
 * Price型かどうかを判定するヘルパー関数
 */
function isPriceType(value: unknown): boolean {
	// null/undefined チェック
	if (!value) return false;

	// オブジェクト型チェック
	if (typeof value !== "object") return false;
	const o = value as Record<string, unknown>;

	// 必須プロパティの型チェック
	if (typeof o.amount !== "number" || typeof o.currency !== "string") {
		return false;
	}

	// オプショナルプロパティの型チェック
	if (o.original !== undefined && typeof o.original !== "number") return false;
	if (o.discount !== undefined && typeof o.discount !== "number") return false;
	if (o.point !== undefined && typeof o.point !== "number") return false;

	return true;
}

/**
 * 通貨コードの検証
 */
export const CURRENCY_CODES = ["JPY", "USD", "EUR", "CNY", "TWD", "KRW"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/**
 * 価格履歴エントリ
 */
export const PriceHistoryEntry = z.object({
	/** 記録日時 */
	date: z.string().datetime(),
	/** 価格情報 */
	price: Price,
	/** キャンペーン情報 */
	campaign: z
		.object({
			id: z.string().optional(),
			name: z.string().optional(),
			endDate: z.string().datetime().optional(),
		})
		.optional(),
});

export type PriceHistoryEntry = z.infer<typeof PriceHistoryEntry>;

/**
 * 価格比較ユーティリティ
 */
export const PriceComparison = {
	/**
	 * 最安値を取得
	 */
	getLowest: (prices: Price[]): Price | undefined => {
		if (prices.length === 0) return undefined;
		return prices.reduce((lowest, current) => (current.amount < lowest.amount ? current : lowest));
	},

	/**
	 * 最高値を取得
	 */
	getHighest: (prices: Price[]): Price | undefined => {
		if (prices.length === 0) return undefined;
		return prices.reduce((highest, current) =>
			current.amount > highest.amount ? current : highest,
		);
	},

	/**
	 * 価格変動率を計算
	 */
	calculateChangeRate: (oldPrice: Price, newPrice: Price): number => {
		if (oldPrice.currency !== newPrice.currency) {
			throw new Error("Cannot compare prices with different currencies");
		}
		if (oldPrice.amount === 0) return 0;
		return ((newPrice.amount - oldPrice.amount) / oldPrice.amount) * 100;
	},
};
