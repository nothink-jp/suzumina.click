/**
 * Number parsing utilities
 *
 * Provides safe number parsing functions with validation
 */

/**
 * Safely parses a string to number, returning undefined for invalid values
 *
 * @param value - The string value to parse
 * @returns A valid number or undefined if parsing fails or results in NaN
 */
export function safeParseNumber(value: string | null | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = Number(value);
	return !Number.isNaN(parsed) ? parsed : undefined;
}

/**
 * Calculates ratio with proper validation
 *
 * @param numerator - The numerator value
 * @param denominator - The denominator value
 * @returns The ratio as a decimal, or 0 if denominator is <= 0
 */
export function calculateRatio(numerator: number, denominator: number): number {
	if (denominator <= 0) {
		return 0;
	}
	return numerator / denominator;
}

/**
 * Formats a ratio as percentage string
 *
 * @param numerator - The numerator value
 * @param denominator - The denominator value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "75.0%")
 */
export function formatPercentage(numerator: number, denominator: number, decimals = 1): string {
	// Ensure decimals is a non-negative integer
	const validDecimals = Math.max(0, Math.floor(decimals));
	const ratio = calculateRatio(numerator, denominator);
	return `${(ratio * 100).toFixed(validDecimals)}%`;
}
