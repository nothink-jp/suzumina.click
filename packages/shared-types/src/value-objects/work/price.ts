import { z } from "zod";
import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * Price data interface for internal use
 */
interface PriceData {
	amount: number;
	currency: string;
	original?: number;
	discount?: number;
	point?: number;
}

/**
 * Price Value Object
 *
 * 不変で価格を表現する値オブジェクト
 * DLsite作品の価格情報を扱う
 * Enhanced with BaseValueObject and Result pattern for type safety
 */
export class PriceValueObject
	extends BaseValueObject<PriceValueObject>
	implements ValidatableValueObject<PriceValueObject>
{
	private constructor(private readonly data: PriceData) {
		super();
	}

	/**
	 * Creates a Price with validation
	 * @param data - The price data
	 * @returns Result containing Price or ValidationError
	 */
	static create(data: {
		amount: number;
		currency: string;
		original?: number;
		discount?: number;
		point?: number;
	}): Result<PriceValueObject, ValidationError> {
		const validation = PriceValueObject.validate(data);
		if (!validation.isValid) {
			return err(validationError("price", validation.error ?? "価格の検証に失敗しました"));
		}

		return ok(new PriceValueObject(data));
	}

	/**
	 * Creates a Price from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing Price or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<PriceValueObject, ValidationError> {
		if (!obj || typeof obj !== "object") {
			return err(validationError("price", "Price data must be an object"));
		}

		const data = obj as Record<string, unknown>;

		if (typeof data.amount !== "number" || typeof data.currency !== "string") {
			return err(
				validationError("price", "Price must have amount as number and currency as string"),
			);
		}

		const priceData: PriceData = {
			amount: data.amount,
			currency: data.currency,
		};

		if (data.original !== undefined) {
			if (typeof data.original !== "number") {
				return err(validationError("price", "Original price must be a number"));
			}
			priceData.original = data.original;
		}

		if (data.discount !== undefined) {
			if (typeof data.discount !== "number") {
				return err(validationError("price", "Discount must be a number"));
			}
			priceData.discount = data.discount;
		}

		if (data.point !== undefined) {
			if (typeof data.point !== "number") {
				return err(validationError("price", "Point must be a number"));
			}
			priceData.point = data.point;
		}

		return PriceValueObject.create(priceData);
	}

	/**
	 * Validates price data
	 */
	private static validate(data: PriceData): { isValid: boolean; error?: string } {
		if (!Number.isInteger(data.amount) || data.amount < 0) {
			return { isValid: false, error: "Amount must be a non-negative integer" };
		}

		if (!data.currency || data.currency.length !== 3 || !/^[A-Z]{3}$/.test(data.currency)) {
			return { isValid: false, error: "Currency must be a 3-letter uppercase ISO 4217 code" };
		}

		if (data.original !== undefined && (!Number.isInteger(data.original) || data.original < 0)) {
			return { isValid: false, error: "Original price must be a non-negative integer" };
		}

		if (data.discount !== undefined && (data.discount < 0 || data.discount > 100)) {
			return { isValid: false, error: "Discount must be between 0 and 100" };
		}

		if (data.point !== undefined && (!Number.isInteger(data.point) || data.point < 0)) {
			return { isValid: false, error: "Point must be a non-negative integer" };
		}

		return { isValid: true };
	}

	// Accessors

	get amount(): number {
		return this.data.amount;
	}

	get currency(): string {
		return this.data.currency;
	}

	get original(): number | undefined {
		return this.data.original;
	}

	get discount(): number | undefined {
		return this.data.discount;
	}

	get point(): number | undefined {
		return this.data.point;
	}

	// Business logic methods

	/**
	 * 無料かどうか
	 */
	isFree(): boolean {
		return this.data.amount === 0;
	}

	/**
	 * 割引中かどうか
	 */
	isDiscounted(): boolean {
		return this.data.original !== undefined && this.data.original > this.data.amount;
	}

	/**
	 * 割引額を計算
	 */
	discountAmount(): number {
		return this.data.original ? this.data.original - this.data.amount : 0;
	}

	/**
	 * 実効割引率を計算
	 */
	effectiveDiscountRate(): number {
		if (!this.data.original || this.data.original === 0) return 0;
		return Math.round(((this.data.original - this.data.amount) / this.data.original) * 100);
	}

	/**
	 * 価格を文字列形式で取得
	 */
	format(): string {
		const formatter = new Intl.NumberFormat("ja-JP", {
			style: "currency",
			currency: this.data.currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		});
		return formatter.format(this.data.amount);
	}

	// ValidatableValueObject implementation

	isValid(): boolean {
		return PriceValueObject.validate(this.data).isValid;
	}

	getValidationErrors(): string[] {
		const validation = PriceValueObject.validate(this.data);
		return validation.isValid ? [] : [validation.error ?? "価格の検証に失敗しました"];
	}

	// BaseValueObject implementation

	equals(other: PriceValueObject): boolean {
		if (!other || !(other instanceof PriceValueObject)) {
			return false;
		}

		return (
			this.data.amount === other.data.amount &&
			this.data.currency === other.data.currency &&
			this.data.original === other.data.original &&
			this.data.discount === other.data.discount &&
			this.data.point === other.data.point
		);
	}

	clone(): PriceValueObject {
		return new PriceValueObject({
			amount: this.data.amount,
			currency: this.data.currency,
			original: this.data.original,
			discount: this.data.discount,
			point: this.data.point,
		});
	}

	toPlainObject(): PriceData {
		return {
			amount: this.data.amount,
			currency: this.data.currency,
			original: this.data.original,
			discount: this.data.discount,
			point: this.data.point,
		};
	}
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
	price: z.object({
		amount: z.number().int().min(0),
		currency: z
			.string()
			.length(3)
			.regex(/^[A-Z]{3}$/),
		original: z.number().int().min(0).optional(),
		discount: z.number().min(0).max(100).optional(),
		point: z.number().int().min(0).optional(),
	}),
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
	getLowest: (prices: PriceValueObject[]): PriceValueObject | undefined => {
		if (prices.length === 0) return undefined;
		return prices.reduce((lowest, current) => (current.amount < lowest.amount ? current : lowest));
	},

	/**
	 * 最高値を取得
	 */
	getHighest: (prices: PriceValueObject[]): PriceValueObject | undefined => {
		if (prices.length === 0) return undefined;
		return prices.reduce((highest, current) =>
			current.amount > highest.amount ? current : highest,
		);
	},

	/**
	 * 価格変動率を計算
	 */
	calculateChangeRate: (oldPrice: PriceValueObject, newPrice: PriceValueObject): number => {
		if (oldPrice.currency !== newPrice.currency) {
			throw new Error("Cannot compare prices with different currencies");
		}
		if (oldPrice.amount === 0) return 0;
		return ((newPrice.amount - oldPrice.amount) / oldPrice.amount) * 100;
	},
};

// Type alias for backward compatibility
export type Price = PriceValueObject;
