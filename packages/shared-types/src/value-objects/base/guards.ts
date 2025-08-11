/**
 * Common type guard functions for Value Objects
 */

/**
 * Checks if a value is a non-null object
 * @param value - The value to check
 * @returns true if the value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Checks if a value is a string
 * @param value - The value to check
 * @returns true if the value is a string
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Checks if a value is a number (and not NaN)
 * @param value - The value to check
 * @returns true if the value is a valid number
 */
export function isNumber(value: unknown): value is number {
	return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Checks if a value is a boolean
 * @param value - The value to check
 * @returns true if the value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

/**
 * Checks if a value is an array
 * @param value - The value to check
 * @returns true if the value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
	return Array.isArray(value);
}

/**
 * Checks if a value is a valid Date object
 * @param value - The value to check
 * @returns true if the value is a valid Date
 */
export function isDate(value: unknown): value is Date {
	return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Checks if a value is null or undefined
 * @param value - The value to check
 * @returns true if the value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

/**
 * Checks if a value is defined (not null or undefined)
 * @param value - The value to check
 * @returns true if the value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * Checks if a string is empty or contains only whitespace
 * @param value - The string to check
 * @returns true if the string is empty or whitespace
 */
export function isEmptyString(value: string): boolean {
	return value.trim().length === 0;
}
