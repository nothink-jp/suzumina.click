/**
 * Work Price Value Object
 *
 * Immutable value object representing work pricing information
 */
export class WorkPrice {
	constructor(
		private readonly _current: number,
		private readonly _currency: string = "JPY",
		private readonly _original?: number,
		private readonly _discount?: number,
		private readonly _point?: number,
	) {
		if (_current < 0) {
			throw new Error("Price cannot be negative");
		}
		if (_original !== undefined && _original < 0) {
			throw new Error("Original price cannot be negative");
		}
		if (_discount !== undefined && (_discount < 0 || _discount > 100)) {
			throw new Error("Discount must be between 0 and 100");
		}
		if (_point !== undefined && _point < 0) {
			throw new Error("Points cannot be negative");
		}
		if (!this.isValidCurrency(_currency)) {
			throw new Error(`Invalid currency code: ${_currency}`);
		}
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

	/**
	 * Converts to plain object
	 */
	toPlainObject() {
		return {
			current: this._current,
			original: this._original,
			currency: this._currency,
			discount: this._discount,
			point: this._point,
			isFree: this.isFree(),
			isDiscounted: this.isDiscounted(),
			formattedPrice: this.formatWithOriginal(),
		};
	}

	equals(other: WorkPrice): boolean {
		return (
			other instanceof WorkPrice &&
			this._current === other._current &&
			this._currency === other._currency &&
			this._original === other._original &&
			this._discount === other._discount &&
			this._point === other._point
		);
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

	private isValidCurrency(currency: string): boolean {
		// Common currency codes
		const validCurrencies = ["JPY", "USD", "EUR", "CNY", "TWD", "KRW"];
		return validCurrencies.includes(currency);
	}

	/**
	 * Creates from legacy price info
	 */
	static fromLegacyPriceInfo(priceInfo: {
		current: number;
		original?: number;
		currency?: string;
		discount?: number;
		point?: number;
		isFreeOrMissingPrice?: boolean;
	}): WorkPrice {
		// Handle free works
		if (priceInfo.isFreeOrMissingPrice) {
			return new WorkPrice(0, priceInfo.currency || "JPY");
		}

		return new WorkPrice(
			priceInfo.current,
			priceInfo.currency || "JPY",
			priceInfo.original,
			priceInfo.discount,
			priceInfo.point,
		);
	}
}
