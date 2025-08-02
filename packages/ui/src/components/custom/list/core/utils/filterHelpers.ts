/**
 * フィルター処理のヘルパー関数
 */

import type { FilterConfig } from "../types";

/**
 * "all"値を適切な空値に変換
 */
export function transformFilterValue(value: any, config: FilterConfig): any {
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
	allFilters: Record<string, any>,
): boolean {
	if (!config.enabled) return true;
	return config.enabled(allFilters);
}

/**
 * フィルター値のバリデーション
 */
export function validateFilterValue(value: any, config: FilterConfig): boolean {
	if (!config.validate) return true;
	return config.validate(value);
}

/**
 * デフォルトフィルター値を生成
 */
export function getDefaultFilterValues(filters: Record<string, FilterConfig>): Record<string, any> {
	const defaults: Record<string, any> = {};

	Object.entries(filters).forEach(([key, config]) => {
		if (config.showAll && config.type === "select") {
			defaults[key] = "all";
		} else if (config.type === "boolean") {
			defaults[key] = false;
		} else if (config.type === "multiselect") {
			defaults[key] = [];
		} else if (config.type === "range") {
			defaults[key] = { min: undefined, max: undefined };
		}
	});

	return defaults;
}

/**
 * アクティブなフィルターがあるかチェック
 */
export function hasActiveFilters(
	currentFilters: Record<string, any>,
	filterConfigs: Record<string, FilterConfig>,
): boolean {
	return Object.entries(currentFilters).some(([key, value]) => {
		const config = filterConfigs[key];
		if (!config) return false;

		// "all"値は非アクティブとみなす
		if (config.showAll && value === "all") return false;

		// 空配列は非アクティブ
		if (Array.isArray(value) && value.length === 0) return false;

		// undefinedやnullは非アクティブ
		if (value === undefined || value === null) return false;

		// rangeフィルターの場合
		if (config.type === "range" && typeof value === "object") {
			return value.min !== undefined || value.max !== undefined;
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
