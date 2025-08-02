"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { ListConfig, ListParams } from "./types";

/**
 * URLパラメータとリスト状態を同期するフック
 */
export function useUrlParams(config: ListConfig) {
	const router = useRouter();
	const searchParams = useSearchParams();

	// URLパラメータのマッピング設定
	const paramMapping = useMemo(
		() => ({
			page: "page",
			limit: "limit",
			sort: "sort",
			search: "search",
			...config.urlParamMapping,
		}),
		[config.urlParamMapping],
	);

	// 現在のURLパラメータを取得
	const getParams = useCallback((): ListParams => {
		const page = Number.parseInt(searchParams.get(paramMapping.page) || "1", 10) || 1;
		const limit = Number.parseInt(
			searchParams.get(paramMapping.limit) ||
				config.paginationConfig?.itemsPerPage?.toString() ||
				"12",
			10,
		);
		const sort = searchParams.get(paramMapping.sort) || config.defaultSort || "";
		const search = searchParams.get(paramMapping.search) || "";

		// フィルターパラメータを収集
		const filters: Record<string, any> = {};
		if (config.filters) {
			for (const filter of config.filters) {
				const value = searchParams.get(filter.key);
				if (value !== null) {
					// 型に応じた変換
					if (filter.type === "multiselect") {
						filters[filter.key] = value.split(",").filter(Boolean);
					} else if (filter.type === "boolean") {
						filters[filter.key] = value === "true";
					} else if (filter.type === "range" || filter.type === "dateRange") {
						// rangeの場合は "min,max" 形式を想定
						const [min, max] = value.split(",");
						filters[filter.key] = { min, max };
					} else {
						filters[filter.key] = value;
					}
				} else if (filter.defaultValue !== undefined) {
					filters[filter.key] = filter.defaultValue;
				}
			}
		}

		return { page, limit, sort, search, filters };
	}, [searchParams, paramMapping, config]);

	// URLパラメータを更新
	const setParams = useCallback(
		(updates: Partial<ListParams>, resetPage = true) => {
			const currentUrl = new URL(window.location.href);
			const params = new URLSearchParams(currentUrl.search);

			// ページ番号をリセット（フィルター変更時など）
			if (resetPage && !("page" in updates)) {
				params.delete(paramMapping.page);
			}

			// 更新を適用
			if (updates.page !== undefined) {
				if (updates.page > 1) {
					params.set(paramMapping.page, updates.page.toString());
				} else {
					params.delete(paramMapping.page);
				}
			}

			if (updates.limit !== undefined) {
				const defaultLimit = config.paginationConfig?.itemsPerPage || 12;
				if (updates.limit !== defaultLimit) {
					params.set(paramMapping.limit, updates.limit.toString());
				} else {
					params.delete(paramMapping.limit);
				}
			}

			if (updates.sort !== undefined) {
				if (updates.sort && updates.sort !== config.defaultSort) {
					params.set(paramMapping.sort, updates.sort);
				} else {
					params.delete(paramMapping.sort);
				}
			}

			if (updates.search !== undefined) {
				if (updates.search) {
					params.set(paramMapping.search, updates.search);
				} else {
					params.delete(paramMapping.search);
				}
			}

			// フィルターの更新
			if (updates.filters && config.filters) {
				for (const filter of config.filters) {
					const value = updates.filters[filter.key];
					if (value !== undefined && value !== null && value !== filter.defaultValue) {
						// 型に応じた文字列化
						if (filter.type === "multiselect" && Array.isArray(value)) {
							if (value.length > 0) {
								params.set(filter.key, value.join(","));
							} else {
								params.delete(filter.key);
							}
						} else if (filter.type === "boolean") {
							params.set(filter.key, value.toString());
						} else if (
							(filter.type === "range" || filter.type === "dateRange") &&
							typeof value === "object" &&
							value.min !== undefined &&
							value.max !== undefined
						) {
							params.set(filter.key, `${value.min},${value.max}`);
						} else if (value) {
							params.set(filter.key, value.toString());
						} else {
							params.delete(filter.key);
						}
					} else {
						params.delete(filter.key);
					}
				}
			}

			// URLを更新
			const newUrl = `${config.baseUrl}?${params.toString()}`;
			router.push(newUrl);
		},
		[router, config, paramMapping],
	);

	// 個別のパラメータ更新用ヘルパー
	const updatePage = useCallback(
		(page: number) => {
			setParams({ page }, false);
		},
		[setParams],
	);

	const updateLimit = useCallback(
		(limit: number) => {
			setParams({ limit });
		},
		[setParams],
	);

	const updateSort = useCallback(
		(sort: string) => {
			setParams({ sort });
		},
		[setParams],
	);

	const updateSearch = useCallback(
		(search: string) => {
			setParams({ search });
		},
		[setParams],
	);

	const updateFilter = useCallback(
		(key: string, value: any) => {
			const currentParams = getParams();
			setParams({
				filters: {
					...currentParams.filters,
					[key]: value,
				},
			});
		},
		[getParams, setParams],
	);

	const resetFilters = useCallback(() => {
		const defaultFilters: Record<string, any> = {};
		if (config.filters) {
			for (const filter of config.filters) {
				if (filter.defaultValue !== undefined) {
					defaultFilters[filter.key] = filter.defaultValue;
				}
			}
		}
		setParams({ filters: defaultFilters, search: "" });
	}, [config.filters, setParams]);

	return {
		params: getParams(),
		setParams,
		updatePage,
		updateLimit,
		updateSort,
		updateSearch,
		updateFilter,
		resetFilters,
	};
}
