/**
 * ConfigurableListのイベントハンドラーを管理するフック
 */

import { useCallback } from "react";
import type { FilterConfig, StandardListParams } from "../types";
import { getDefaultFilterValues } from "../utils/filterHelpers";

interface UseListHandlersOptions {
	urlSync: boolean;
	urlHook: {
		setSearch: (value: string) => void;
		setSort: (value: string) => void;
		setFilter: (key: string, value: unknown) => void;
		setPage: (page: number) => void;
		resetFilters: () => void;
		setItemsPerPage: (value: number) => void;
	};
	setLocalParams: React.Dispatch<React.SetStateAction<StandardListParams>>;
	filters: Record<string, FilterConfig>;
}

export function useListHandlers({
	urlSync,
	urlHook,
	setLocalParams,
	filters,
}: UseListHandlersOptions) {
	const handleSearch = useCallback(
		(value: string) => {
			if (urlSync) {
				urlHook.setSearch(value);
			} else {
				setLocalParams((prev) => ({ ...prev, search: value }));
			}
		},
		[urlSync, urlHook, setLocalParams],
	);

	const handleSortChange = useCallback(
		(value: string) => {
			if (urlSync) {
				urlHook.setSort(value);
			} else {
				setLocalParams((prev) => ({ ...prev, sort: value }));
			}
		},
		[urlSync, urlHook, setLocalParams],
	);

	const handleFilterChange = useCallback(
		(key: string, value: unknown) => {
			if (urlSync) {
				urlHook.setFilter(key, value);
			} else {
				setLocalParams((prev) => ({
					...prev,
					filters: { ...prev.filters, [key]: value },
				}));
			}
		},
		[urlSync, urlHook, setLocalParams],
	);

	const handlePageChange = useCallback(
		(page: number) => {
			if (urlSync) {
				urlHook.setPage(page);
			} else {
				setLocalParams((prev) => ({ ...prev, page }));
			}
		},
		[urlSync, urlHook, setLocalParams],
	);

	const handleResetFilters = useCallback(() => {
		if (urlSync) {
			urlHook.resetFilters();
		} else {
			setLocalParams((prev) => ({
				...prev,
				filters: getDefaultFilterValues(filters),
				search: "",
			}));
		}
	}, [urlSync, urlHook, setLocalParams, filters]);

	const handleItemsPerPageChange = useCallback(
		(value: string) => {
			if (urlSync) {
				urlHook.setItemsPerPage(Number(value));
			} else {
				setLocalParams((prev) => ({ ...prev, itemsPerPage: Number(value), page: 1 }));
			}
		},
		[urlSync, urlHook, setLocalParams],
	);

	return {
		handleSearch,
		handleSortChange,
		handleFilterChange,
		handlePageChange,
		handleResetFilters,
		handleItemsPerPageChange,
	};
}
