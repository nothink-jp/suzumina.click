/**
 * Work Title Value Object
 *
 * Represents a work title with validation and manipulation methods
 * Refactored to use BaseValueObject and Result pattern for type safety
 */

import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * WorkTitle data structure
 */
interface WorkTitleData {
	value: string;
	masked?: string;
	kana?: string;
	altName?: string;
}

/**
 * WorkTitle Value Object with enhanced type safety
 */
export class WorkTitle
	extends BaseValueObject<WorkTitle>
	implements ValidatableValueObject<WorkTitle>
{
	private constructor(
		private readonly value: string,
		private readonly _masked?: string,
		private readonly _kana?: string,
		private readonly _altName?: string,
	) {
		super();
	}

	/**
	 * Creates a WorkTitle with validation
	 * @param value - The main title string
	 * @param masked - Optional masked title for sensitive content
	 * @param kana - Optional kana reading
	 * @param altName - Optional alternative name
	 * @returns Result containing WorkTitle or ValidationError
	 */
	static create(
		value: string,
		masked?: string,
		kana?: string,
		altName?: string,
	): Result<WorkTitle, ValidationError> {
		const validation = WorkTitle.validate(value);
		if (!validation.isValid) {
			return err(validationError("title", validation.error ?? "タイトルの検証に失敗しました"));
		}

		// Validate optional fields
		if (masked !== undefined && masked.trim().length === 0) {
			return err(validationError("masked", "Masked title cannot be empty if provided"));
		}
		if (kana !== undefined && kana.trim().length === 0) {
			return err(validationError("kana", "Kana reading cannot be empty if provided"));
		}
		if (altName !== undefined && altName.trim().length === 0) {
			return err(validationError("altName", "Alternative name cannot be empty if provided"));
		}

		return ok(new WorkTitle(value, masked, kana, altName));
	}

	/**
	 * Creates a WorkTitle from a data object
	 * @param data - WorkTitle data object
	 * @returns Result containing WorkTitle or ValidationError
	 */
	static fromData(data: WorkTitleData): Result<WorkTitle, ValidationError> {
		return WorkTitle.create(data.value, data.masked, data.kana, data.altName);
	}

	/**
	 * Creates a WorkTitle from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing WorkTitle or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<WorkTitle, ValidationError> {
		if (typeof obj === "string") {
			return WorkTitle.create(obj);
		}

		if (typeof obj !== "object" || obj === null) {
			return err(validationError("title", "Title must be a string or object"));
		}

		const data = obj as Record<string, unknown>;

		if (typeof data.value !== "string") {
			return err(validationError("title", "Title value must be a string"));
		}

		const masked = data.masked !== undefined ? String(data.masked) : undefined;
		const kana = data.kana !== undefined ? String(data.kana) : undefined;
		const altName = data.altName !== undefined ? String(data.altName) : undefined;

		return WorkTitle.create(data.value, masked, kana, altName);
	}

	/**
	 * Validates title format
	 */
	private static validate(value: string): { isValid: boolean; error?: string } {
		if (!value || value.trim().length === 0) {
			return { isValid: false, error: "Work title cannot be empty" };
		}

		if (value.length > 500) {
			return { isValid: false, error: "Work title must be 500 characters or less" };
		}

		return { isValid: true };
	}

	// Accessors

	toString(): string {
		return this.value;
	}

	toJSON(): WorkTitleData {
		return {
			value: this.value,
			...(this._masked && { masked: this._masked }),
			...(this._kana && { kana: this._kana }),
			...(this._altName && { altName: this._altName }),
		};
	}

	/**
	 * Gets the masked title for sensitive content
	 */
	getMasked(): string {
		return this._masked || this.value;
	}

	/**
	 * Gets the kana reading
	 */
	getKana(): string | undefined {
		return this._kana;
	}

	/**
	 * Gets the alternative name
	 */
	getAltName(): string | undefined {
		return this._altName;
	}

	/**
	 * Gets display title (prefers alt name if available)
	 */
	toDisplayString(): string {
		return this._altName || this.value;
	}

	// Business logic

	/**
	 * Checks if title contains specific keywords
	 */
	contains(keyword: string): boolean {
		const lowerKeyword = keyword.toLowerCase();
		return (
			this.value.toLowerCase().includes(lowerKeyword) ||
			(this._altName?.toLowerCase().includes(lowerKeyword) ?? false) ||
			(this._kana?.toLowerCase().includes(lowerKeyword) ?? false)
		);
	}

	/**
	 * Gets searchable text combining all title variations
	 */
	getSearchableText(): string {
		const parts = [this.value];
		if (this._altName) parts.push(this._altName);
		if (this._kana) parts.push(this._kana);
		return parts.join(" ");
	}

	/**
	 * Creates a new WorkTitle with updated alt name
	 * @param altName - New alternative name
	 * @returns Result containing new WorkTitle or ValidationError
	 */
	withAltName(altName: string): Result<WorkTitle, ValidationError> {
		return WorkTitle.create(this.value, this._masked, this._kana, altName);
	}

	/**
	 * Creates a new WorkTitle with updated masked title
	 * @param masked - New masked title
	 * @returns Result containing new WorkTitle or ValidationError
	 */
	withMasked(masked: string): Result<WorkTitle, ValidationError> {
		return WorkTitle.create(this.value, masked, this._kana, this._altName);
	}

	/**
	 * Creates a new WorkTitle with updated kana reading
	 * @param kana - New kana reading
	 * @returns Result containing new WorkTitle or ValidationError
	 */
	withKana(kana: string): Result<WorkTitle, ValidationError> {
		return WorkTitle.create(this.value, this._masked, kana, this._altName);
	}

	// ValidatableValueObject implementation

	isValid(): boolean {
		const mainValidation = WorkTitle.validate(this.value);
		if (!mainValidation.isValid) return false;

		if (this._masked && this._masked.trim().length === 0) return false;
		if (this._kana && this._kana.trim().length === 0) return false;
		if (this._altName && this._altName.trim().length === 0) return false;

		return true;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];

		const mainValidation = WorkTitle.validate(this.value);
		if (!mainValidation.isValid && mainValidation.error) {
			errors.push(mainValidation.error);
		}

		if (this._masked && this._masked.trim().length === 0) {
			errors.push("Masked title cannot be empty if provided");
		}
		if (this._kana && this._kana.trim().length === 0) {
			errors.push("Kana reading cannot be empty if provided");
		}
		if (this._altName && this._altName.trim().length === 0) {
			errors.push("Alternative name cannot be empty if provided");
		}

		return errors;
	}

	// BaseValueObject implementation

	equals(other: WorkTitle): boolean {
		if (!other || !(other instanceof WorkTitle)) {
			return false;
		}
		return (
			this.value === other.value &&
			this._masked === other._masked &&
			this._kana === other._kana &&
			this._altName === other._altName
		);
	}

	clone(): WorkTitle {
		return new WorkTitle(this.value, this._masked, this._kana, this._altName);
	}

	toPlainObject(): WorkTitleData {
		return this.toJSON();
	}
}
