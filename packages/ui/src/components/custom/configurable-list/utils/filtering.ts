/**
 * Filtering utility functions for ConfigurableList
 */

import type { FilterConfig } from "../types";
import { transformFilterValue } from "./filterHelpers";
import { getFilterableValue, getSearchableText } from "./typeSafeAccess";

/**
 * Apply search filter to items
 */
export function applySearchFilter<T>(
	items: T[],
	search: string | undefined,
	searchable: boolean,
): T[] {
	if (!search || !searchable) return items;

	return items.filter((item) => {
		const searchableText = getSearchableText(item);
		return searchableText ? searchableText.toLowerCase().includes(search.toLowerCase()) : false;
	});
}

/**
 * Check if item matches filter value
 */
function matchesFilterValue(
	itemValue: unknown,
	transformedValue: unknown,
	filterType: FilterConfig["type"],
): boolean {
	switch (filterType) {
		case "multiselect":
		case "tags":
			if (Array.isArray(transformedValue)) {
				if (Array.isArray(itemValue)) {
					return transformedValue.some((selectedTag) => itemValue.includes(selectedTag));
				}
				return transformedValue.includes(itemValue);
			}
			return false;
		case "range": {
			const { min, max } = transformedValue as { min?: number; max?: number };
			const numValue = Number(itemValue);
			return (min === undefined || numValue >= min) && (max === undefined || numValue <= max);
		}
		case "boolean":
			return Boolean(itemValue) === transformedValue;
		default:
			return itemValue === transformedValue;
	}
}

/**
 * Apply custom filters to items
 */
export function applyCustomFilters<T>(
	items: T[],
	filters: Record<string, unknown>,
	filterConfigs: Record<string, FilterConfig>,
): T[] {
	let result = [...items];

	Object.entries(filters).forEach(([key, value]) => {
		const config = filterConfigs[key];
		if (!config) return;

		// Skip empty values
		if (value === "") return;

		const transformedValue = transformFilterValue(value, config);
		if (transformedValue === undefined) return;

		result = result.filter((item) => {
			const itemValue = getFilterableValue(item, key);
			return matchesFilterValue(itemValue, transformedValue, config.type);
		});
	});

	return result;
}
