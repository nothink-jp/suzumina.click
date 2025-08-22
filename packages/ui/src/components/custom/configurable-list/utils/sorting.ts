/**
 * Sorting utility functions for ConfigurableList
 */

/**
 * Compare two values for sorting
 */
export function compareValues(aValue: unknown, bValue: unknown): number {
	// Handle undefined values
	if (aValue === undefined && bValue === undefined) return 0;
	if (aValue === undefined) return 1;
	if (bValue === undefined) return -1;

	// For string comparison
	if (typeof aValue === "string" && typeof bValue === "string") {
		return aValue.localeCompare(bValue);
	}

	// For number comparison
	if (typeof aValue === "number" && typeof bValue === "number") {
		return aValue - bValue;
	}

	// For other types, convert to string and compare
	const aStr = String(aValue);
	const bStr = String(bValue);
	return aStr.localeCompare(bStr);
}

/**
 * Sort items by a given key
 */
export function sortItems<T>(
	items: T[],
	sortKey: string | undefined,
	getValueFn: (item: T, key: string) => unknown,
): T[] {
	if (!sortKey) return items;

	return [...items].sort((a, b) => {
		const aValue = getValueFn(a, sortKey);
		const bValue = getValueFn(b, sortKey);
		return compareValues(aValue, bValue);
	});
}
