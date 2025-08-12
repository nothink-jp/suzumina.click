/**
 * Work Price Value Object
 *
 * Immutable value object representing work pricing information
 * Refactored to use BaseValueObject and Result pattern for type safety
 */

import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import type { WorkPricePlain } from "../../plain-objects/work-plain";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * WorkPrice data structure
 */
interface WorkPriceData {
	current: number;
	currency: string;
	original?: number;
	discount?: number;
	point?: number;
}

/**
 * WorkPrice Value Object with enhanced type safety
 */
export class WorkPrice
	extends BaseValueObject<WorkPrice>
	implements ValidatableValueObject<WorkPrice>
{
	private constructor(
		private readonly _current: number,
		private readonly _currency: string = "JPY",
		private readonly _original?: number,
		private readonly _discount?: number,
		private readonly _point?: number,
	) {
		super();
	}

	/**
	 * Creates a WorkPrice with validation
	 * @param current - Current price
	 * @param currency - Currency code (default: JPY)
	 * @param original - Original price before discount
	 * @param discount - Discount percentage
	 * @param point - Point value
	 * @returns Result containing WorkPrice or ValidationError
	 */
	static create(
		current: number,
		currency = "JPY",
		original?: number,
		discount?: number,
		point?: number,
	): Result<WorkPrice, ValidationError> {
		const validation = WorkPrice.validate({ current, currency, original, discount, point });
		if (!validation.isValid) {
			return err(validationError("workPrice", validation.error ?? "価格の検証に失敗しました"));
		}
		return ok(new WorkPrice(current, currency, original, discount, point));
	}

	/**
	 * Creates a WorkPrice from data object
	 * @param data - WorkPrice data object
	 * @returns Result containing WorkPrice or ValidationError
	 */
	static fromData(data: WorkPriceData): Result<WorkPrice, ValidationError> {
		return WorkPrice.create(data.current, data.currency, data.original, data.discount, data.point);
	}

	/**
	 * Creates a WorkPrice from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing WorkPrice or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<WorkPrice, ValidationError> {
		if (typeof obj !== "object" || obj === null) {
			return err(validationError("workPrice", "WorkPrice must be an object"));
		}

		const data = obj as Record<string, unknown>;

		if (typeof data.current !== "number") {
			return err(validationError("current", "Current price must be a number"));
		}

		const currency = data.currency !== undefined ? String(data.currency) : "JPY";
		const original = typeof data.original === "number" ? data.original : undefined;
		const discount = typeof data.discount === "number" ? data.discount : undefined;
		const point = typeof data.point === "number" ? data.point : undefined;

		return WorkPrice.create(data.current, currency, original, discount, point);
	}

	/**
	 * Validates WorkPrice data
	 */
	private static validate(data: {
		current: number;
		currency: string;
		original?: number;
		discount?: number;
		point?: number;
	}): { isValid: boolean; error?: string } {
		if (data.current < 0) {
			return { isValid: false, error: "Price cannot be negative" };
		}
		if (data.original !== undefined && data.original < 0) {
			return { isValid: false, error: "Original price cannot be negative" };
		}
		if (data.discount !== undefined && (data.discount < 0 || data.discount > 100)) {
			return { isValid: false, error: "Discount must be between 0 and 100" };
		}
		if (data.point !== undefined && data.point < 0) {
			return { isValid: false, error: "Points cannot be negative" };
		}
		if (!WorkPrice.isValidCurrency(data.currency)) {
			return { isValid: false, error: `Invalid currency code: ${data.currency}` };
		}
		return { isValid: true };
	}

	get current(): number {
		return this._current;
	}

	get currency(): string {
		return this._currency;
	}

	get original(): number | undefined {
		return this._original;
	}

	get discount(): number | undefined {
		return this._discount;
	}

	get point(): number | undefined {
		return this._point;
	}

	/**
	 * Checks if the work is free
	 */
	isFree(): boolean {
		return this._current === 0;
	}

	/**
	 * Checks if the work is discounted
	 */
	isDiscounted(): boolean {
		return this._original !== undefined && this._original > this._current;
	}

	/**
	 * Gets the discount amount
	 */
	getDiscountAmount(): number {
		return this._original ? this._original - this._current : 0;
	}

	/**
	 * Calculates effective discount rate
	 */
	getEffectiveDiscountRate(): number {
		if (!this._original || this._original === 0) return 0;
		return Math.round(((this._original - this._current) / this._original) * 100);
	}

	/**
	 * Formats the price for display
	 */
	format(): string {
		const formatter = new Intl.NumberFormat("ja-JP", {
			style: "currency",
			currency: this._currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		});
		return formatter.format(this._current);
	}

	/**
	 * Formats with original price if discounted
	 */
	formatWithOriginal(): string {
		if (this.isDiscounted() && this._original) {
			const formatter = new Intl.NumberFormat("ja-JP", {
				style: "currency",
				currency: this._currency,
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			});
			return `${formatter.format(this._current)} (元: ${formatter.format(this._original)})`;
		}
		return this.format();
	}

	/**
	 * Returns string representation
	 */
	toString(): string {
		return this.formatWithOriginal();
	}

	/**
	 * Returns JSON representation
	 */
	toJSON() {
		return {
			current: this._current,
			currency: this._currency,
			...(this._original !== undefined && { original: this._original }),
			...(this._discount !== undefined && { discount: this._discount }),
			...(this._point !== undefined && { point: this._point }),
		};
	}

	// ValidatableValueObject implementation

	isValid(): boolean {
		return WorkPrice.validate({
			current: this._current,
			currency: this._currency,
			original: this._original,
			discount: this._discount,
			point: this._point,
		}).isValid;
	}

	getValidationErrors(): string[] {
		const validation = WorkPrice.validate({
			current: this._current,
			currency: this._currency,
			original: this._original,
			discount: this._discount,
			point: this._point,
		});
		return validation.isValid ? [] : [validation.error ?? "価格の検証に失敗しました"];
	}

	// BaseValueObject implementation

	equals(other: WorkPrice): boolean {
		if (!other || !(other instanceof WorkPrice)) {
			return false;
		}
		return (
			this._current === other._current &&
			this._currency === other._currency &&
			this._original === other._original &&
			this._discount === other._discount &&
			this._point === other._point
		);
	}

	clone(): WorkPrice {
		return new WorkPrice(
			this._current,
			this._currency,
			this._original,
			this._discount,
			this._point,
		);
	}

	toPlainObject(): WorkPricePlain {
		return {
			current: this._current,
			original: this._original,
			currency: this._currency,
			discount: this._discount,
			point: this._point,
			isFree: this.isFree(),
			isDiscounted: this.isDiscounted(),
			formattedPrice: this.format(),
		};
	}

	/**
	 * Creates a new price with discount applied
	 */
	withDiscount(discountPercent: number, original?: number): WorkPrice {
		const originalPrice = original || this._current;
		const discountedPrice = Math.floor(originalPrice * (1 - discountPercent / 100));
		return new WorkPrice(
			discountedPrice,
			this._currency,
			originalPrice,
			discountPercent,
			this._point,
		);
	}

	private static isValidCurrency(currency: string): boolean {
		// Common currency codes
		const validCurrencies = ["JPY", "USD", "EUR", "CNY", "TWD", "KRW"];
		return validCurrencies.includes(currency);
	}
}
