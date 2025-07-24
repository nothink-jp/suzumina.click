/**
 * Common transformation functions for Value Objects
 */

/**
 * Ensures a value is not null or undefined
 * @param value - The value to check
 * @param name - The name of the value for error messages
 * @returns The non-null value
 * @throws Error if the value is null or undefined
 */
export function requireNonNull<T>(value: T | null | undefined, name: string): T {
	if (value === null || value === undefined) {
		throw new Error(`${name} must not be null or undefined`);
	}
	return value;
}

/**
 * Transforms a value to a string, with null/undefined handling
 * @param value - The value to transform
 * @param defaultValue - The default value if null/undefined
 * @returns The string value
 */
export function valueToString(value: unknown, defaultValue = ""): string {
	if (value === null || value === undefined) {
		return defaultValue;
	}
	return String(value);
}

/**
 * Transforms a value to a number, with null/undefined handling
 * @param value - The value to transform
 * @param defaultValue - The default value if null/undefined or NaN
 * @returns The numeric value
 */
export function toNumber(value: unknown, defaultValue = 0): number {
	if (value === null || value === undefined) {
		return defaultValue;
	}
	const num = Number(value);
	return Number.isNaN(num) ? defaultValue : num;
}

/**
 * Transforms a value to a boolean
 * @param value - The value to transform
 * @returns The boolean value
 */
export function toBoolean(value: unknown): boolean {
	return Boolean(value);
}

/**
 * Ensures a string is trimmed and non-empty
 * @param value - The string to check
 * @param name - The name of the value for error messages
 * @returns The trimmed non-empty string
 * @throws Error if the string is empty after trimming
 */
export function requireNonEmptyString(value: string, name: string): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new Error(`${name} must not be empty`);
	}
	return trimmed;
}

/**
 * Ensures a number is positive (greater than 0)
 * @param value - The number to check
 * @param name - The name of the value for error messages
 * @returns The positive number
 * @throws Error if the number is not positive
 */
export function requirePositiveNumber(value: number, name: string): number {
	if (value <= 0) {
		throw new Error(`${name} must be a positive number`);
	}
	return value;
}

/**
 * Ensures a number is non-negative (0 or greater)
 * @param value - The number to check
 * @param name - The name of the value for error messages
 * @returns The non-negative number
 * @throws Error if the number is negative
 */
export function requireNonNegativeNumber(value: number, name: string): number {
	if (value < 0) {
		throw new Error(`${name} must not be negative`);
	}
	return value;
}

/**
 * Clamps a number between min and max values
 * @param value - The number to clamp
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns The clamped number
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Rounds a number to a specified number of decimal places
 * @param value - The number to round
 * @param decimals - The number of decimal places
 * @returns The rounded number
 */
export function roundTo(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}
