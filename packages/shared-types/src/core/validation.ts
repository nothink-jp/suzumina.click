/**
 * Common Validation Utilities
 *
 * Shared validation functions for Value Objects.
 * Follows DRY principle to eliminate code duplication.
 */

import { err, ok, type Result, validationError } from "./result";

/**
 * String validation options
 */
export interface StringValidationOptions {
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	required?: boolean;
	trim?: boolean;
}

/**
 * Number validation options
 */
export interface NumberValidationOptions {
	min?: number;
	max?: number;
	integer?: boolean;
	positive?: boolean;
	nonnegative?: boolean;
}

/**
 * Array validation options
 */
export interface ArrayValidationOptions<T> {
	minLength?: number;
	maxLength?: number;
	unique?: boolean;
	itemValidator?: (item: T) => Result<T, ValidationError>;
}

/**
 * Common validation error type
 */
export interface ValidationError {
	field: string;
	message: string;
}

/**
 * Validates a string value
 */
export function validateString(
	value: string,
	field: string,
	options: StringValidationOptions = {},
): Result<string, ValidationError> {
	const { minLength, maxLength, pattern, required = false, trim = false } = options;

	const processedValue = trim ? value.trim() : value;

	if (required && !processedValue) {
		return err(validationError(field, `${field} is required`));
	}

	if (minLength !== undefined && processedValue.length < minLength) {
		return err(validationError(field, `${field} must be at least ${minLength} characters`));
	}

	if (maxLength !== undefined && processedValue.length > maxLength) {
		return err(validationError(field, `${field} must be at most ${maxLength} characters`));
	}

	if (pattern && !pattern.test(processedValue)) {
		return err(validationError(field, `${field} has invalid format`));
	}

	return ok(processedValue);
}

/**
 * Validates a number value
 */
export function validateNumber(
	value: number,
	field: string,
	options: NumberValidationOptions = {},
): Result<number, ValidationError> {
	const { min, max, integer = false, positive = false, nonnegative = false } = options;

	if (Number.isNaN(value)) {
		return err(validationError(field, `${field} must be a valid number`));
	}

	if (integer && !Number.isInteger(value)) {
		return err(validationError(field, `${field} must be an integer`));
	}

	if (positive && value <= 0) {
		return err(validationError(field, `${field} must be positive`));
	}

	if (nonnegative && value < 0) {
		return err(validationError(field, `${field} must be non-negative`));
	}

	if (min !== undefined && value < min) {
		return err(validationError(field, `${field} must be at least ${min}`));
	}

	if (max !== undefined && value > max) {
		return err(validationError(field, `${field} must be at most ${max}`));
	}

	return ok(value);
}

/**
 * Validates array length
 */
function validateArrayLength<T>(
	value: T[],
	field: string,
	minLength?: number,
	maxLength?: number,
): Result<void, ValidationError> {
	if (minLength !== undefined && value.length < minLength) {
		return err(validationError(field, `${field} must have at least ${minLength} items`));
	}

	if (maxLength !== undefined && value.length > maxLength) {
		return err(validationError(field, `${field} must have at most ${maxLength} items`));
	}

	return ok(undefined);
}

/**
 * Validates array items with a validator function
 */
function validateArrayItems<T>(
	value: T[],
	field: string,
	itemValidator: (item: T) => Result<T, ValidationError>,
): Result<void, ValidationError> {
	for (let i = 0; i < value.length; i++) {
		const item = value[i];
		if (item === undefined) {
			return err(validationError(field, `${field}[${i}] is undefined`));
		}
		const result = itemValidator(item);
		if (result.isErr()) {
			return err(validationError(field, `${field}[${i}]: ${result.error.message}`));
		}
	}
	return ok(undefined);
}

/**
 * Validates an array value
 */
export function validateArray<T>(
	value: T[],
	field: string,
	options: ArrayValidationOptions<T> = {},
): Result<T[], ValidationError> {
	const { minLength, maxLength, unique = false, itemValidator } = options;

	if (!Array.isArray(value)) {
		return err(validationError(field, `${field} must be an array`));
	}

	// Validate length
	const lengthResult = validateArrayLength(value, field, minLength, maxLength);
	if (lengthResult.isErr()) {
		return err(lengthResult.error);
	}

	// Validate uniqueness
	if (unique) {
		const uniqueItems = new Set(value);
		if (uniqueItems.size !== value.length) {
			return err(validationError(field, `${field} must contain unique items`));
		}
	}

	// Validate items
	if (itemValidator) {
		const itemsResult = validateArrayItems(value, field, itemValidator);
		if (itemsResult.isErr()) {
			return err(itemsResult.error);
		}
	}

	return ok(value);
}

/**
 * Validates a URL string
 */
export function validateUrl(value: string, field: string): Result<string, ValidationError> {
	try {
		new URL(value);
		return ok(value);
	} catch {
		return err(validationError(field, `${field} must be a valid URL`));
	}
}

/**
 * Validates an email address
 */
export function validateEmail(value: string, field: string): Result<string, ValidationError> {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(value)) {
		return err(validationError(field, `${field} must be a valid email address`));
	}
	return ok(value);
}

/**
 * Validates a date string or Date object
 */
export function validateDate(value: string | Date, field: string): Result<Date, ValidationError> {
	const date = typeof value === "string" ? new Date(value) : value;

	if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
		return err(validationError(field, `${field} must be a valid date`));
	}

	return ok(date);
}

/**
 * Combines multiple validation results
 */
export function combineValidations<_T>(
	validations: Result<unknown, ValidationError>[],
): Result<void, ValidationError> {
	for (const validation of validations) {
		if (validation.isErr()) {
			return err(validation.error);
		}
	}
	return ok(undefined);
}
