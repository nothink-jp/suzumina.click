"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { ListAction, ListConfig, ListParams, ListResult, ListState } from "./types";
import { useUrlParams } from "./use-url-params";

/**
 * リスト状態を管理するリデューサー
 */
function listReducer<T>(state: ListState<T>, action: ListAction): ListState<T> {
	switch (action.type) {
		case "SET_ITEMS": {
			const { items, totalCount, filteredCount } = action.payload;
			const totalPages = Math.ceil(filteredCount / state.pagination.itemsPerPage);

			// ページ番号の妥当性チェック
			const validPage = Math.min(
				Math.max(1, state.pagination.currentPage),
				Math.max(1, totalPages),
			);

			return {
				...state,
				items: items as T[],
				counts: {
					total: totalCount,
					filtered: filteredCount,
					displayed: items.length,
				},
				pagination: {
					...state.pagination,
					totalPages,
					currentPage: validPage,
				},
			};
		}

		case "SET_PAGE":
			return {
				...state,
				pagination: {
					...state.pagination,
					currentPage: action.payload,
				},
			};

		case "SET_ITEMS_PER_PAGE": {
			const totalPages = Math.ceil(state.counts.filtered / action.payload);
			return {
				...state,
				pagination: {
					...state.pagination,
					itemsPerPage: action.payload,
					totalPages,
					currentPage: 1, // ページサイズ変更時は1ページ目へ
				},
			};
		}

		case "SET_FILTER":
			return {
				...state,
				filters: {
					...state.filters,
					[action.payload.key]: action.payload.value,
				},
				pagination: {
					...state.pagination,
					currentPage: 1, // フィルター変更時は1ページ目へ
				},
			};

		case "SET_FILTERS":
			return {
				...state,
				filters: action.payload,
				pagination: {
					...state.pagination,
					currentPage: 1,
				},
			};

		case "RESET_FILTERS": {
			const defaultFilters: Record<string, any> = {};
			// デフォルト値の復元はconfigから行う必要があるため、
			// ここでは空オブジェクトにリセット
			return {
				...state,
				filters: defaultFilters,
				search: "",
				pagination: {
					...state.pagination,
					currentPage: 1,
				},
			};
		}

		case "SET_SORT":
			return {
				...state,
				sort: action.payload,
				pagination: {
					...state.pagination,
					currentPage: 1,
				},
			};

		case "SET_SEARCH":
			return {
				...state,
				search: action.payload,
				pagination: {
					...state.pagination,
					currentPage: 1,
				},
			};

		case "SET_LOADING":
			return {
				...state,
				isLoading: action.payload,
			};

		case "SET_ERROR":
			return {
				...state,
				error: action.payload,
				isLoading: false,
			};

		default:
			return state;
	}
}

/**
 * リスト状態管理フック
 */
export function useListState<T>(
	config: ListConfig,
	fetchData: (params: ListParams) => Promise<ListResult<T>>,
	initialData?: ListResult<T>,
) {
	const urlParams = useUrlParams(config);
	const { params } = urlParams;

	// 初期状態（一度だけ作成）
	const initialState = useMemo(
		(): ListState<T> => ({
			items: initialData?.items || [],
			counts: {
				total: initialData?.totalCount || 0,
				filtered: initialData?.filteredCount || initialData?.totalCount || 0,
				displayed: initialData?.items.length || 0,
			},
			pagination: {
				currentPage: params.page,
				itemsPerPage: params.limit,
				totalPages: initialData
					? Math.ceil((initialData.filteredCount || initialData.totalCount) / params.limit)
					: 0,
			},
			filters: params.filters,
			sort: params.sort || "",
			search: params.search || "",
			isLoading: false,
			error: null,
		}),
		[], // 空の依存配列にして一度だけ作成
	);

	const [state, dispatch] = useReducer(listReducer, initialState);

	// URLパラメータとの同期は削除（各アクション関数でURLを更新するため）

	// データ取得
	const loadData = useCallback(async () => {
		dispatch({ type: "SET_LOADING", payload: true });
		dispatch({ type: "SET_ERROR", payload: null });

		try {
			// 現在のstateから値を構築
			const currentParams: ListParams = {
				page: state.pagination.currentPage,
				limit: state.pagination.itemsPerPage,
				sort: state.sort,
				search: state.search,
				filters: state.filters,
			};
			const result = await fetchData(currentParams);
			dispatch({
				type: "SET_ITEMS",
				payload: {
					items: result.items,
					totalCount: result.totalCount,
					filteredCount: result.filteredCount,
				},
			});
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "データの取得に失敗しました";
			dispatch({ type: "SET_ERROR", payload: errorMessage });
			throw error;
		} finally {
			dispatch({ type: "SET_LOADING", payload: false });
		}
	}, [
		fetchData,
		state.pagination.currentPage,
		state.pagination.itemsPerPage,
		state.sort,
		state.search,
		state.filters,
	]);

	// アクション関数
	const setPage = useCallback(
		(page: number) => {
			urlParams.updatePage(page);
		},
		[urlParams],
	);

	const setItemsPerPage = useCallback(
		(itemsPerPage: number) => {
			urlParams.updateLimit(itemsPerPage);
		},
		[urlParams],
	);

	const setSort = useCallback(
		(sort: string) => {
			urlParams.updateSort(sort);
		},
		[urlParams],
	);

	const setSearch = useCallback(
		(search: string) => {
			urlParams.updateSearch(search);
		},
		[urlParams],
	);

	const setFilter = useCallback(
		(key: string, value: any) => {
			urlParams.updateFilter(key, value);
		},
		[urlParams],
	);

	const resetFilters = useCallback(() => {
		urlParams.resetFilters();
	}, [urlParams]);

	// フィルターが適用されているかチェック
	const hasActiveFilters = useMemo(() => {
		if (state.search) return true;

		if (!config.filters) return false;

		return config.filters.some((filter) => {
			const value = state.filters[filter.key];
			const defaultValue = filter.defaultValue;

			// 値が設定されており、デフォルト値と異なる場合
			if (value === undefined || value === null) return false;
			if (value === defaultValue) return false;

			// 配列の場合
			if (Array.isArray(value)) return value.length > 0;

			// オブジェクトの場合（range など）
			if (typeof value === "object") {
				return Object.values(value).some((v) => v !== undefined && v !== null && v !== "");
			}

			return true;
		});
	}, [state.search, state.filters, config.filters]);

	return {
		state,
		loadData,
		setPage,
		setItemsPerPage,
		setSort,
		setSearch,
		setFilter,
		resetFilters,
		hasActiveFilters,
	};
}
