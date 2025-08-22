/**
 * URL同期用のフック（改善版）
 */

"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FilterConfig } from "../types";
import { getDefaultFilterValues } from "../utils/filterHelpers";

interface UseListUrlOptions {
	/** フィルター設定 */
	filters?: Record<string, FilterConfig>;
	/** デフォルトのページサイズ */
	defaultPageSize?: number;
	/** デフォルトのソート */
	defaultSort?: string;
}

// Helper function to parse multiselect/tags value
function parseMultiselectValue(value: string): string[] {
	if (value.includes("|")) {
		// 新形式: パイプ区切り
		return value.split("|").filter(Boolean);
	}
	if (value.includes(",") && !value.includes(" ")) {
		// 旧形式: カンマ区切り（スペースを含まない場合のみ）
		return value.split(",").filter(Boolean);
	}
	// 単一の値（スペースを含む可能性がある）
	return [value];
}

// Helper function to parse range value
function parseRangeValue(value: string): { min?: number; max?: number } {
	const [min, max] = value.split("-");
	return {
		min: min ? Number.parseFloat(min) : undefined,
		max: max ? Number.parseFloat(max) : undefined,
	};
}

// Helper function to parse date range value
function parseDateRangeValue(value: string): { start?: string; end?: string } {
	// ISO日付形式（YYYY-MM-DD~YYYY-MM-DD）を正確に分割
	const separatorIndex = value.indexOf("~");
	if (separatorIndex !== -1) {
		const start = value.substring(0, separatorIndex);
		const end = value.substring(separatorIndex + 1);
		return {
			start: start || undefined,
			end: end || undefined,
		};
	}

	// 旧形式（ハイフン区切り）のフォールバック
	const parts = value.split("-");
	if (parts.length >= 6) {
		// YYYY-MM-DD-YYYY-MM-DD形式を想定
		const start = parts.slice(0, 3).join("-");
		const end = parts.slice(3).join("-");
		return {
			start: start || undefined,
			end: end || undefined,
		};
	}

	// 解析できない場合は空の範囲
	return {
		start: undefined,
		end: undefined,
	};
}

// Helper function to parse filter value based on type
function parseFilterValue(value: string, config: FilterConfig): unknown {
	if (config.type === "multiselect" || config.type === "tags") {
		return parseMultiselectValue(value);
	}
	if (config.type === "boolean") {
		return value === "true";
	}
	if (config.type === "range") {
		return parseRangeValue(value);
	}
	if (config.type === "dateRange") {
		return parseDateRangeValue(value);
	}
	return value;
}

// Helper function to serialize array values
function serializeArrayValue(value: unknown[]): string | null {
	if (value.length === 0) return null;
	// パイプ文字で結合（URLSearchParamsが自動的にエンコードする）
	return value.map((v) => String(v)).join("|");
}

// Helper function to serialize range values
function serializeRangeValue(value: unknown): string | null {
	const rangeValue = value as { min?: number; max?: number };
	if (rangeValue.min !== undefined || rangeValue.max !== undefined) {
		return `${rangeValue.min || ""}-${rangeValue.max || ""}`;
	}
	return null;
}

// Helper function to serialize date range values
function serializeDateRangeValue(value: unknown): string | null {
	const dateValue = value as { start?: string; end?: string };
	if (dateValue.start !== undefined || dateValue.end !== undefined) {
		// チルダ（~）を区切り文字として使用
		return `${dateValue.start || ""}~${dateValue.end || ""}`;
	}
	return null;
}

// Helper function to serialize filter value to URL parameter
function serializeFilterValue(value: unknown, config?: FilterConfig): string | null {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	if (Array.isArray(value)) {
		return serializeArrayValue(value);
	}

	if (typeof value === "object") {
		if (config?.type === "range") {
			return serializeRangeValue(value);
		}
		if (config?.type === "dateRange") {
			return serializeDateRangeValue(value);
		}
	}

	return value.toString();
}

// Helper function to update single parameter in URLSearchParams
function updateParam(
	params: URLSearchParams,
	key: string,
	value: unknown,
	defaultValue?: unknown,
): void {
	if (
		value === undefined ||
		value === null ||
		value === defaultValue ||
		value === "" ||
		value === 1
	) {
		params.delete(key);
	} else {
		params.set(key, String(value));
	}
}

export function useListUrl(options: UseListUrlOptions = {}) {
	const { filters = {}, defaultPageSize = 12, defaultSort } = options;
	const searchParams = useSearchParams();

	// URLの更新フラグを管理
	const isUpdatingUrl = useRef(false);
	const lastUrlRef = useRef<string>("");

	// 現在のパラメータを解析
	const currentParams = useMemo(() => {
		const page = Number.parseInt(searchParams.get("page") || "1", 10);
		const itemsPerPage = Number.parseInt(
			searchParams.get("limit") || defaultPageSize.toString(),
			10,
		);
		const sort = searchParams.get("sort") || defaultSort || "";
		const search = searchParams.get("q") || "";

		// フィルターを解析
		const defaultFilterValues = getDefaultFilterValues(filters);
		const filterValues: Record<string, unknown> = { ...defaultFilterValues };
		Object.entries(filters).forEach(([key, config]) => {
			const value = searchParams.get(key);
			if (value !== null) {
				filterValues[key] = parseFilterValue(value, config);
			}
			// value が null の場合は、defaultFilterValues の値がそのまま使われる
		});

		return {
			page,
			itemsPerPage,
			sort,
			search,
			filters: filterValues,
		};
	}, [searchParams, filters, defaultPageSize, defaultSort]);

	// URLを更新する関数
	const updateUrl = useCallback(
		(
			updates: Partial<{
				page: number;
				itemsPerPage: number;
				sort: string;
				search: string;
				filters: Record<string, unknown>;
			}>,
		) => {
			const params = new URLSearchParams(searchParams.toString());

			// ページ
			if (updates.page !== undefined) {
				updateParam(params, "page", updates.page, 1);
			}

			// ページサイズ
			if (updates.itemsPerPage !== undefined) {
				updateParam(params, "limit", updates.itemsPerPage, defaultPageSize);
			}

			// ソート
			if (updates.sort !== undefined) {
				updateParam(params, "sort", updates.sort, defaultSort || "");
			}

			// 検索
			if (updates.search !== undefined) {
				updateParam(params, "q", updates.search, "");
			}

			// フィルター
			if (updates.filters !== undefined) {
				// まず、既存のフィルターパラメータをすべて削除
				Object.keys(filters).forEach((key) => {
					params.delete(key);
				});

				// 新しいフィルター値を設定
				Object.entries(updates.filters).forEach(([key, value]) => {
					const config = filters[key];
					const defaultValue = getDefaultFilterValues(filters)[key];

					// "all"値、空値、またはデフォルト値と同じ場合はURLから削除
					if ((config?.showAll && value === "all") || value === defaultValue) {
						return; // すでに削除されているので何もしない
					}

					const serialized = serializeFilterValue(value, config);
					if (serialized !== null) {
						params.set(key, serialized);
					}
				});
			}

			// URLを更新（スクロール位置を保持）
			const newUrl = params.toString() ? `?${params.toString()}` : "";
			const fullUrl = `${window.location.pathname}${newUrl}`;

			// 同じURLへの更新は無視
			if (lastUrlRef.current === fullUrl) {
				return;
			}

			lastUrlRef.current = fullUrl;
			isUpdatingUrl.current = true;

			// History APIを使用してURLを更新（ページリロードなし）
			window.history.pushState({}, "", fullUrl);

			// popstateイベントを手動で発火させて、useSearchParamsを更新
			window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
		},
		[searchParams, filters, defaultPageSize, defaultSort],
	);

	// 個別の更新関数
	const setPage = useCallback(
		(page: number) => {
			updateUrl({ page });
		},
		[updateUrl],
	);

	const setItemsPerPage = useCallback(
		(itemsPerPage: number) => {
			updateUrl({ itemsPerPage, page: 1 }); // ページサイズ変更時は1ページ目へ
		},
		[updateUrl],
	);

	const setSort = useCallback(
		(sort: string) => {
			updateUrl({ sort, page: 1 }); // ソート変更時は1ページ目へ
		},
		[updateUrl],
	);

	const setSearch = useCallback(
		(search: string) => {
			updateUrl({ search, page: 1 }); // 検索変更時は1ページ目へ
		},
		[updateUrl],
	);

	const setFilter = useCallback(
		(key: string, value: unknown) => {
			updateUrl({
				filters: { ...currentParams.filters, [key]: value },
				page: 1, // フィルター変更時は1ページ目へ
			});
		},
		[updateUrl, currentParams.filters],
	);

	const resetFilters = useCallback(() => {
		const defaultFilters = getDefaultFilterValues(filters);

		updateUrl({
			filters: defaultFilters,
			search: "",
			page: 1,
		});
	}, [updateUrl, filters]);

	// filters オブジェクトの参照を安定化
	const stableParams = useMemo(() => {
		// filtersの内容が同じであれば同じ参照を保持
		const filtersStr = JSON.stringify(currentParams.filters);
		return {
			...currentParams,
			filters: JSON.parse(filtersStr),
		};
	}, [currentParams]);

	// URLの更新フラグをリセット
	useEffect(() => {
		if (isUpdatingUrl.current) {
			// 次のレンダリングサイクルでフラグをリセット
			const timer = setTimeout(() => {
				isUpdatingUrl.current = false;
			}, 0);
			return () => clearTimeout(timer);
		}
	}, []);

	return {
		params: stableParams,
		setPage,
		setItemsPerPage,
		setSort,
		setSearch,
		setFilter,
		resetFilters,
	};
}
