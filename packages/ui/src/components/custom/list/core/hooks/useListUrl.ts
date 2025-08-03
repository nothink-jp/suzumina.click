/**
 * URL同期用のフック（改善版）
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
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

export function useListUrl(options: UseListUrlOptions = {}) {
	const { filters = {}, defaultPageSize = 12, defaultSort } = options;
	const searchParams = useSearchParams();
	const router = useRouter();

	// 現在のパラメータを解析
	const currentParams = useMemo(() => {
		const page = Number.parseInt(searchParams.get("page") || "1", 10);
		const itemsPerPage = Number.parseInt(
			searchParams.get("limit") || defaultPageSize.toString(),
			10,
		);
		const sort = searchParams.get("sort") || defaultSort || "";
		const search = searchParams.get("search") || "";

		// フィルターを解析
		const filterValues: Record<string, unknown> = {};
		Object.entries(filters).forEach(([key, config]) => {
			const value = searchParams.get(key);

			if (value !== null) {
				// 型に応じて変換
				if (config.type === "multiselect") {
					filterValues[key] = value.split(",").filter(Boolean);
				} else if (config.type === "boolean") {
					filterValues[key] = value === "true";
				} else if (config.type === "range") {
					const [min, max] = value.split("-");
					filterValues[key] = {
						min: min ? Number.parseFloat(min) : undefined,
						max: max ? Number.parseFloat(max) : undefined,
					};
				} else {
					filterValues[key] = value;
				}
			} else if (config.showAll && config.type === "select") {
				// showAllが有効な場合のデフォルト値
				filterValues[key] = "all";
			}
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
				if (updates.page === 1) {
					params.delete("page");
				} else {
					params.set("page", updates.page.toString());
				}
			}

			// ページサイズ
			if (updates.itemsPerPage !== undefined) {
				if (updates.itemsPerPage === defaultPageSize) {
					params.delete("limit");
				} else {
					params.set("limit", updates.itemsPerPage.toString());
				}
			}

			// ソート
			if (updates.sort !== undefined) {
				if (updates.sort === "" || updates.sort === defaultSort) {
					params.delete("sort");
				} else {
					params.set("sort", updates.sort);
				}
			}

			// 検索
			if (updates.search !== undefined) {
				if (updates.search === "") {
					params.delete("search");
				} else {
					params.set("search", updates.search);
				}
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

					// "all"値や空値は削除（すでに削除済みなのでスキップ）
					if (
						value === undefined ||
						value === null ||
						value === "" ||
						(config?.showAll && value === "all") ||
						(Array.isArray(value) && value.length === 0)
					) {
						// すでに削除されているので何もしない
					} else {
						// 型に応じてシリアライズ
						if (Array.isArray(value)) {
							params.set(key, value.join(","));
						} else if (typeof value === "object" && config?.type === "range") {
							const { min, max } = value;
							if (min !== undefined || max !== undefined) {
								params.set(key, `${min || ""}-${max || ""}`);
							} else {
								// すでに削除されている
							}
						} else {
							params.set(key, value.toString());
						}
					}
				});
			}

			// URLを更新（スクロール位置を保持）
			const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
			router.replace(newUrl);
		},
		[searchParams, filters, defaultPageSize, defaultSort, router],
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

	return {
		params: currentParams,
		setPage,
		setItemsPerPage,
		setSort,
		setSearch,
		setFilter,
		resetFilters,
	};
}
