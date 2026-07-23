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
	// tags/multiselectタイプで空配列の場合はundefinedを返す
	if (
		(config.type === "tags" || config.type === "multiselect") &&
		Array.isArray(value) &&
		value.length === 0
	) {
		return undefined;
	}
	return value;
}

/**
 * フィルター設定から"all"オプションを含む選択肢を生成
 */
export function generateOptions(config: FilterConfig): Array<{ value: string; label: string }> {
	if (config.type !== "select" && config.type !== "multiselect" && config.type !== "tags") {
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
 * デフォルトフィルター値を生成
 */
// Helper function to get default value for a single filter
function getFilterDefaultValue(config: FilterConfig): unknown {
	// defaultValueが指定されていればそれを優先
	if (config.defaultValue !== undefined) {
		return config.defaultValue;
	}

	switch (config.type) {
		case "select":
			return config.showAll ? "all" : "";
		case "boolean":
			return false;
		case "multiselect":
		case "tags":
			return [];
		case "range":
			return { min: undefined, max: undefined };
		case "date":
			return undefined;
		case "dateRange":
			return { start: undefined, end: undefined };
		default:
			return undefined;
	}
}

export function getDefaultFilterValues(
	filters: Record<string, FilterConfig>,
): Record<string, unknown> {
	const defaults: Record<string, unknown> = {};

	Object.entries(filters).forEach(([key, config]) => {
		defaults[key] = getFilterDefaultValue(config);
	});

	return defaults;
}

/**
 * アクティブなフィルターがあるかチェック
 */
// Helper function to check if a single filter is active
export function isFilterActive(
	value: unknown,
	config: FilterConfig,
	defaultValue: unknown,
): boolean {
	// "all"値は非アクティブとみなす
	if (config.showAll && value === "all") return false;

	// 空配列は非アクティブ
	if (Array.isArray(value) && value.length === 0) return false;

	// undefinedやnullは非アクティブ
	if (value === undefined || value === null) return false;

	// デフォルト値と同じ場合は非アクティブ
	if (value === defaultValue) return false;

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
}

export function hasActiveFilters(
	currentFilters: Record<string, unknown>,
	filterConfigs: Record<string, FilterConfig>,
): boolean {
	const defaultValues = getDefaultFilterValues(filterConfigs);
	return Object.entries(currentFilters).some(([key, value]) => {
		const config = filterConfigs[key];
		if (!config) return false;
		return isFilterActive(value, config, defaultValues[key]);
	});
}

/**
 * アクティブなフィルターの個別解除チップ。
 * select/boolean はフィルター単位で1チップ、tags/multiselect は選択値ごとに1チップを生成する
 * （range/date/dateRange は現状 consumer が使っていないため対象外＝ YAGNI）。
 */
export interface ActiveFilterChip {
	/** onChange(key, nextValue) に渡すフィルターキー */
	key: string;
	/** チップの表示ラベル */
	label: string;
	/** React key 生成用の識別値（tags/multiselectでは選択値そのもの） */
	value: unknown;
	/** このチップを解除するときに onChange(key, nextValue) へ渡す値 */
	nextValue: unknown;
}

// option label 末尾の件数サフィックス（例: "ASMR (39作品)" / "タグ名 (12件)"）はドロップダウンの
// 選択肢としては妥当だが、解除チップに使うと冗長なため表示直前でのみ剥がす（正本のoptionsは変更しない）。
// 先頭に \s* のような可変長の量指定子を置くと、一致に失敗するたび複数の開始位置×バックトラックの
// 組み合わせで多項式時間になる（ReDoS）ため、末尾を固定文字 "(" からアンカーし、
// 前の空白除去は正規表現ではなく trimEnd() で行う（CodeQL "Polynomial regular expression" 対策）
function stripCountSuffix(label: string): string {
	const match = label.match(/\(\d+[^()]*\)$/);
	if (!match) return label;
	return label.slice(0, match.index).trimEnd();
}

function getChipsForListValue(
	key: string,
	config: FilterConfig,
	selectedValues: unknown[],
): ActiveFilterChip[] {
	const options = generateOptions(config);
	return selectedValues.map((v) => {
		const label = stripCountSuffix(options.find((opt) => opt.value === v)?.label ?? String(v));
		const rest = selectedValues.filter((sv) => sv !== v);
		return { key, label, value: v, nextValue: rest.length > 0 ? rest : undefined };
	});
}

export function getActiveFilterChips(
	currentFilters: Record<string, unknown>,
	filterConfigs: Record<string, FilterConfig>,
): ActiveFilterChip[] {
	const defaultValues = getDefaultFilterValues(filterConfigs);
	const chips: ActiveFilterChip[] = [];

	for (const [key, config] of Object.entries(filterConfigs)) {
		const value = currentFilters[key];
		if (!isFilterActive(value, config, defaultValues[key])) continue;

		if (config.type === "tags" || config.type === "multiselect") {
			chips.push(...getChipsForListValue(key, config, Array.isArray(value) ? value : []));
			continue;
		}

		if (config.type === "select") {
			const options = generateOptions(config);
			const label = stripCountSuffix(
				options.find((opt) => opt.value === value)?.label ?? String(value),
			);
			chips.push({ key, label, value, nextValue: defaultValues[key] });
			continue;
		}

		if (config.type === "boolean") {
			chips.push({ key, label: config.label ?? key, value, nextValue: defaultValues[key] });
		}
	}

	return chips;
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
