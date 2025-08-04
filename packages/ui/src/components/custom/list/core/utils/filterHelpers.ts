/**
 * フィルター処理のヘルパー関数
 */

import type { FilterConfig } from "../types";

/**
 * "all"値を適切な空値に変換
 */
export function transformFilterValue(value: unknown, config: FilterConfig): unknown {
	// showAllが有効で、値が"all"の場合
	if (config.showAll && value === "all") {
		return config.emptyValue ?? undefined;
	}
	return value;
}

/**
 * フィルター設定から"all"オプションを含む選択肢を生成
 */
export function generateOptions(config: FilterConfig): Array<{ value: string; label: string }> {
	if (config.type !== "select" && config.type !== "multiselect") {
		return [];
	}

	const baseOptions = normalizeOptions(config.options || []);

	if (config.showAll && config.type === "select") {
		return [{ value: "all", label: "すべて" }, ...baseOptions];
	}

	return baseOptions;
}

/**
 * 選択肢を正規化（文字列配列もオブジェクト配列に変換）
 */
export function normalizeOptions(
	options: string[] | Array<{ value: string; label: string }>,
): Array<{ value: string; label: string }> {
	if (options.length === 0) return [];

	if (typeof options[0] === "string") {
		return (options as string[]).map((opt) => ({
			value: opt,
			label: opt,
		}));
	}

	return options as Array<{ value: string; label: string }>;
}

/**
 * フィルターが有効かチェック
 */
export function isFilterEnabled(
	filterKey: string,
	config: FilterConfig,
	allFilters: Record<string, unknown>,
): boolean {
	if (!config.enabled) return true;
	return config.enabled(allFilters);
}

/**
 * フィルター値のバリデーション
 */
export function validateFilterValue(value: unknown, config: FilterConfig): boolean {
	if (!config.validate) return true;
	return config.validate(value);
}

/**
 * デフォルトフィルター値を生成
 */
export function getDefaultFilterValues(
	filters: Record<string, FilterConfig>,
): Record<string, unknown> {
	const defaults: Record<string, unknown> = {};

	Object.entries(filters).forEach(([key, config]) => {
		// defaultValueが指定されていればそれを優先
		if (config.defaultValue !== undefined) {
			defaults[key] = config.defaultValue;
		} else if (config.showAll && config.type === "select") {
			defaults[key] = "all";
		} else if (config.type === "select") {
			// showAllがfalseの場合、空文字列をデフォルトに
			defaults[key] = "";
		} else if (config.type === "boolean") {
			defaults[key] = false;
		} else if (config.type === "multiselect") {
			defaults[key] = [];
		} else if (config.type === "range") {
			defaults[key] = { min: undefined, max: undefined };
		} else if (config.type === "date") {
			defaults[key] = undefined;
		} else if (config.type === "dateRange") {
			defaults[key] = { start: undefined, end: undefined };
		}
	});

	return defaults;
}

/**
 * アクティブなフィルターがあるかチェック
 */
export function hasActiveFilters(
	currentFilters: Record<string, unknown>,
	filterConfigs: Record<string, FilterConfig>,
): boolean {
	const defaultValues = getDefaultFilterValues(filterConfigs);
	return Object.entries(currentFilters).some(([key, value]) => {
		const config = filterConfigs[key];
		if (!config) return false;

		// "all"値は非アクティブとみなす
		if (config.showAll && value === "all") return false;

		// 空配列は非アクティブ
		if (Array.isArray(value) && value.length === 0) return false;

		// undefinedやnullは非アクティブ
		if (value === undefined || value === null) return false;

		// デフォルト値と同じ場合は非アクティブ
		if (value === defaultValues[key]) return false;

		// rangeフィルターの場合
		if (config.type === "range" && typeof value === "object") {
			const rangeValue = value as { min?: number; max?: number };
			return rangeValue.min !== undefined || rangeValue.max !== undefined;
		}

		// dateRangeフィルターの場合
		if (config.type === "dateRange" && typeof value === "object") {
			const dateValue = value as { start?: string; end?: string };
			return dateValue.start !== undefined || dateValue.end !== undefined;
		}

		return true;
	});
}

/**
 * 年代選択肢を生成するヘルパー
 */
export function generateYearOptions(
	startYear: number,
	endYear?: number,
): Array<{ value: string; label: string }> {
	const end = endYear || new Date().getFullYear();
	const years = [];

	for (let year = end; year >= startYear; year--) {
		years.push({
			value: year.toString(),
			label: `${year}年`,
		});
	}

	return years;
}
