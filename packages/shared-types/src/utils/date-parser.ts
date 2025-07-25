/**
 * Date parsing utilities
 *
 * Provides safe date parsing functions with validation
 */

/**
 * Safely parses a date string and returns a Date object or undefined
 *
 * @param dateString - The date string to parse
 * @returns A valid Date object or undefined if parsing fails
 */
export function parseDate(dateString: string | null | undefined): Date | undefined {
	if (!dateString) return undefined;
	const parsed = Date.parse(dateString);
	return !Number.isNaN(parsed) ? new Date(dateString) : undefined;
}

/**
 * Checks if a date string is valid
 *
 * @param dateString - The date string to validate
 * @returns true if the date string is valid, false otherwise
 */
export function isValidDateString(dateString: string | null | undefined): boolean {
	if (!dateString) return false;
	const parsed = Date.parse(dateString);
	return !Number.isNaN(parsed);
}
