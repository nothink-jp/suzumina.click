/**
 * Work ID Value Object
 *
 * Represents a DLsite work product ID (e.g., "RJ236867")
 * Refactored to use BaseValueObject and Result pattern for type safety
 */

import type { WorkId as WorkIdBrand } from "../../core/ids";
import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * WorkId Value Object with enhanced type safety
 */
export class WorkId extends BaseValueObject<WorkId> implements ValidatableValueObject<WorkId> {
	private constructor(private readonly value: WorkIdBrand) {
		super();
	}

	/**
	 * Creates a WorkId with validation
	 * @param value - The work ID string
	 * @returns Result containing WorkId or ValidationError
	 */
	static create(value: string): Result<WorkId, ValidationError> {
		const validation = WorkId.validate(value);
		if (!validation.isValid) {
			// validation.errorは必ず存在するが、TypeScript的にはoptionalなので
			// デフォルト値を提供（実際には使われないはず）
			return err(validationError("workId", validation.error ?? "作品IDの検証に失敗しました"));
		}
		// Convert string to branded type
		const brandedValue = value as WorkIdBrand;
		return ok(new WorkId(brandedValue));
	}

	/**
	 * Creates a WorkId from unknown input
	 * @param value - Unknown input to parse
	 * @returns Result containing WorkId or ValidationError
	 */
	static fromString(value: unknown): Result<WorkId, ValidationError> {
		if (typeof value !== "string") {
			return err(validationError("workId", "Work ID must be a string"));
		}
		return WorkId.create(value);
	}

	/**
	 * Creates a WorkId from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing WorkId or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<WorkId, ValidationError> {
		return WorkId.fromString(obj);
	}

	/**
	 * Validates Work ID format
	 * DLsite IDs start with RJ, RE, RG, BJ, VJ, etc. followed by numbers
	 */
	private static validate(value: string): { isValid: boolean; error?: string } {
		if (!value || value.trim().length === 0) {
			return { isValid: false, error: "Work ID cannot be empty" };
		}

		// DLsite ID pattern: 2 letters + numbers
		if (!/^[A-Z]{2}\d+$/.test(value)) {
			return {
				isValid: false,
				error: "Work ID must match pattern: 2 uppercase letters followed by digits",
			};
		}

		return { isValid: true };
	}

	/**
	 * Validates DLsite-specific work ID format (RJ + 6-8 digits)
	 */
	private static validateDLsiteFormat(value: string): { isValid: boolean; error?: string } {
		if (!/^RJ\d{6,8}$/.test(value)) {
			return {
				isValid: false,
				error: "DLsite Work ID must match pattern: RJ followed by 6-8 digits",
			};
		}
		return { isValid: true };
	}

	/**
	 * Creates a DLsite-specific WorkId with strict validation
	 * @param value - The work ID string
	 * @returns Result containing WorkId or ValidationError
	 */
	static createDLsiteWorkId(value: string): Result<WorkId, ValidationError> {
		const validation = WorkId.validateDLsiteFormat(value);
		if (!validation.isValid) {
			return err(validationError("workId", validation.error ?? "DLsite作品IDの検証に失敗しました"));
		}
		// Convert string to branded type
		const brandedValue = value as WorkIdBrand;
		return ok(new WorkId(brandedValue));
	}

	// Accessors

	toString(): string {
		return this.value as string;
	}

	toJSON(): string {
		return this.value as string;
	}

	/**
	 * Gets the ID type (RJ, RE, RG, etc.)
	 */
	getType(): string {
		return (this.value as string).substring(0, 2);
	}

	/**
	 * Gets the numeric part of the ID
	 */
	getNumericPart(): number {
		return Number.parseInt((this.value as string).substring(2), 10);
	}

	// Validation methods

	/**
	 * Checks if this is a DLsite work ID (RJ followed by 8 digits)
	 */
	isDLsiteWorkId(): boolean {
		return /^RJ\d{8}$/.test(this.value as string);
	}

	/**
	 * Checks if this is a DLsite work ID with legacy format support (RJ + 6-8 digits)
	 */
	isDLsiteWorkIdLoose(): boolean {
		return /^RJ\d{6,8}$/.test(this.value as string);
	}

	// ValidatableValueObject implementation

	isValid(): boolean {
		return WorkId.validate(this.value as string).isValid;
	}

	getValidationErrors(): string[] {
		const validation = WorkId.validate(this.value as string);
		return validation.isValid ? [] : [validation.error ?? "作品IDの検証に失敗しました"];
	}

	// BaseValueObject implementation

	equals(other: WorkId): boolean {
		if (!other || !(other instanceof WorkId)) {
			return false;
		}
		return (this.value as string) === (other.value as string);
	}

	clone(): WorkId {
		const result = WorkId.create(this.value as string);
		if (result.isErr()) {
			throw new Error(`Failed to clone WorkId: ${result.error.message}`);
		}
		return result.value;
	}

	toPlainObject(): string {
		return this.value as string;
	}

	// Static validation helpers

	/**
	 * Static method to validate DLsite work ID format
	 */
	static isValidDLsiteWorkId(value: string): boolean {
		return /^RJ\d{8}$/.test(value);
	}

	/**
	 * Static method to validate DLsite work ID format with legacy support
	 */
	static isValidDLsiteWorkIdLoose(value: string): boolean {
		return /^RJ\d{6,8}$/.test(value);
	}
}
