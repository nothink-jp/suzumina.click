/**
 * Circle (Maker) Value Object
 *
 * Represents a DLsite circle/maker with its information
 * Refactored to use BaseValueObject and Result pattern for type safety
 */

import type { CircleId as CircleIdBrand } from "../../core/ids";
import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * Circle data structure
 */
interface CircleData {
	id: string;
	name: string;
	nameEn?: string;
}

/**
 * Circle Value Object with enhanced type safety
 */
export class Circle extends BaseValueObject<Circle> implements ValidatableValueObject<Circle> {
	constructor(id: string, name: string, nameEn?: string) {
		super();
		// Validate inputs
		if (!name || name.trim().length === 0) {
			throw new Error("Circle name cannot be empty");
		}
		if (!id || id.trim().length === 0) {
			throw new Error("Circle ID cannot be empty");
		}
		if (nameEn !== undefined && nameEn.trim().length === 0) {
			throw new Error("English name cannot be empty if provided");
		}

		// Store as branded types internally
		this._id = id as CircleIdBrand;
		this._name = name;
		this._nameEn = nameEn;
	}

	private readonly _id: CircleIdBrand;
	private readonly _name: string;
	private readonly _nameEn?: string;

	/**
	 * Creates a Circle with validation
	 * @param id - Circle ID
	 * @param name - Circle name
	 * @param nameEn - Optional English name
	 * @returns Result containing Circle or ValidationError
	 */
	static create(id: string, name: string, nameEn?: string): Result<Circle, ValidationError> {
		try {
			const circle = new Circle(id, name, nameEn);
			return ok(circle);
		} catch (error) {
			return err(
				validationError("circle", error instanceof Error ? error.message : "Unknown error"),
			);
		}
	}

	/**
	 * Creates a Circle from data object
	 * @param data - Circle data object
	 * @returns Result containing Circle or ValidationError
	 */
	static fromData(data: CircleData): Result<Circle, ValidationError> {
		return Circle.create(data.id, data.name, data.nameEn);
	}

	/**
	 * Creates a Circle from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing Circle or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<Circle, ValidationError> {
		if (typeof obj !== "object" || obj === null) {
			return err(validationError("circle", "Circle must be an object"));
		}

		const data = obj as Record<string, unknown>;

		if (typeof data.id !== "string") {
			return err(validationError("id", "Circle ID must be a string"));
		}
		if (typeof data.name !== "string") {
			return err(validationError("name", "Circle name must be a string"));
		}

		const nameEn = data.nameEn !== undefined ? String(data.nameEn) : undefined;

		return Circle.create(data.id, data.name, nameEn);
	}

	/**
	 * Validates Circle data
	 */
	private static validate(data: { id: string; name: string; nameEn?: string }): {
		isValid: boolean;
		error?: string;
	} {
		if (!data.name || data.name.trim().length === 0) {
			return { isValid: false, error: "Circle name cannot be empty" };
		}
		if (!data.id || data.id.trim().length === 0) {
			return { isValid: false, error: "Circle ID cannot be empty" };
		}
		if (data.nameEn !== undefined && data.nameEn.trim().length === 0) {
			return { isValid: false, error: "English name cannot be empty if provided" };
		}
		return { isValid: true };
	}

	/**
	 * Gets the circle ID (e.g., "RG23954")
	 */
	get id(): string {
		return this._id as string;
	}

	/**
	 * Gets the circle name
	 */
	get name(): string {
		return this._name;
	}

	/**
	 * Gets the circle name in English
	 */
	get nameEn(): string | undefined {
		return this._nameEn;
	}

	/**
	 * Gets display name (prefers English if available based on context)
	 */
	toDisplayString(preferEnglish = false): string {
		if (preferEnglish && this._nameEn) {
			return this._nameEn;
		}
		return this._name;
	}

	/**
	 * Gets searchable text
	 */
	getSearchableText(): string {
		const parts = [this._name];
		if (this._nameEn) parts.push(this._nameEn);
		return parts.join(" ");
	}

	/**
	 * Creates a DLsite circle URL
	 */
	toUrl(): string {
		return `https://www.dlsite.com/maniax/circle/profile/=/maker_id/${this._id as string}.html`;
	}

	// ValidatableValueObject implementation

	isValid(): boolean {
		return Circle.validate({
			id: this._id as string,
			name: this._name,
			nameEn: this._nameEn,
		}).isValid;
	}

	getValidationErrors(): string[] {
		const validation = Circle.validate({
			id: this._id as string,
			name: this._name,
			nameEn: this._nameEn,
		});
		return validation.isValid ? [] : [validation.error ?? "サークル情報の検証に失敗しました"];
	}

	// BaseValueObject implementation

	equals(other: Circle): boolean {
		if (!other || !(other instanceof Circle)) {
			return false;
		}
		return (
			(this._id as string) === (other._id as string) &&
			this._name === other._name &&
			this._nameEn === other._nameEn
		);
	}

	clone(): Circle {
		const result = Circle.create(this._id as string, this._name, this._nameEn);
		if (result.isErr()) {
			throw new Error(`Failed to clone Circle: ${result.error.message}`);
		}
		return result.value;
	}

	toPlainObject(): CircleData {
		return {
			id: this._id as string,
			name: this._name,
			...(this._nameEn && { nameEn: this._nameEn }),
		};
	}

	/**
	 * Creates a Circle from partial data
	 * @param data - Partial circle data
	 * @returns Circle instance
	 */
	static fromPartial(data: { id?: string; name: string; nameEn?: string }): Circle {
		// If no ID provided, generate from name
		const id = data.id || `UNKNOWN_${Date.now()}`;
		const result = Circle.create(id, data.name, data.nameEn);
		if (result.isErr()) {
			throw new Error(`Failed to create Circle from partial data: ${result.error.message}`);
		}
		return result.value;
	}
}
