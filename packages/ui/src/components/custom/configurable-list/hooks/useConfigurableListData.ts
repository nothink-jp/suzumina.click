/**
 * ConfigurableList用のデータ管理フック
 */

import { useMemo } from "react";
import type { DataAdapter, StandardListParams } from "../types";
import { useListData } from "./useListData";

interface UseConfigurableListDataOptions<T> {
	initialItems: T[];
	initialTotal?: number;
	fetchFn?: (params: unknown) => Promise<unknown>;
	dataAdapter?: DataAdapter<T, unknown>;
	onError?: (error: Error) => void;
	searchable?: boolean;
}

export function useConfigurableListData<T>(
	fetchParams: StandardListParams,
	options: UseConfigurableListDataOptions<T>,
) {
	const { initialItems, initialTotal, fetchFn, dataAdapter, onError, searchable = true } = options;

	const isServerSide = !!fetchFn;

	// fetchFnをメモ化
	const memoizedFetchFn = useMemo(() => {
		if (!isServerSide) {
			return async () => ({ items: initialItems, total: initialTotal ?? initialItems.length });
		}
		return async (params: StandardListParams) => {
			if (!fetchFn) {
				throw new Error("fetchFn is required when using server-side data fetching");
			}

			// デフォルトアダプター: 結果がすでにListDataSource形式であることを想定
			const defaultAdapter: DataAdapter<T, unknown> = {
				toParams: (params) => params,
				fromResult: (result) => {
					const typedResult = result as {
						items?: T[];
						total?: number;
						totalCount?: number;
					};
					// itemsとtotalがあればそのまま使用、totalCountがあればtotalに変換
					return {
						items: typedResult.items || [],
						total: typedResult.total ?? typedResult.totalCount ?? 0,
					};
				},
			};

			const actualAdapter = dataAdapter || defaultAdapter;
			const apiParams = actualAdapter.toParams(params);
			const result = await fetchFn(apiParams);
			return actualAdapter.fromResult(result);
		};
	}, [isServerSide, dataAdapter, fetchFn, initialItems, initialTotal]);

	// サーバーサイドデータ取得
	const initialDataForHook = {
		items: initialItems,
		total: initialTotal ?? initialItems.length,
	};

	const serverData = useListData(fetchParams, {
		fetchFn: memoizedFetchFn,
		initialData: initialDataForHook,
		onError,
		debounceMs: searchable ? 300 : 0, // 検索時のみデバウンス
	});

	// 使用するデータソース
	const data = serverData.data || {
		items: initialItems,
		total: initialTotal || initialItems.length,
	};

	// データソースの決定
	const actualData = serverData.data || data;

	return {
		actualData,
		loading: serverData.loading,
		isRefreshing: serverData.isRefreshing || false,
		error: serverData.error,
		isServerSide,
	};
}
