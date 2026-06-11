/**
 * ConfigurableList用のデータ管理フック
 */

import { useMemo } from "react";
import type { DataAdapter, StandardListParams } from "../types";
import { useListData } from "./use-list-data";

interface UseConfigurableListDataOptions<T> {
	initialItems: T[];
	initialTotal?: number;
	fetchFn: (params: unknown) => Promise<unknown>;
	dataAdapter?: DataAdapter<T, unknown>;
	onError?: (error: Error) => void;
	searchable?: boolean;
}

export function useConfigurableListData<T>(
	fetchParams: StandardListParams,
	options: UseConfigurableListDataOptions<T>,
) {
	const { initialItems, initialTotal, fetchFn, dataAdapter, onError, searchable = true } = options;

	// fetchFn は必須＝常にサーバーフェッチ。fetchFn をメモ化
	const memoizedFetchFn = useMemo(() => {
		return async (params: StandardListParams) => {
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
	}, [dataAdapter, fetchFn]);

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

	// 使用するデータソース（フェッチ前は initialItems / initialTotal にフォールバック）
	const actualData = serverData.data ?? {
		items: initialItems,
		total: initialTotal ?? initialItems.length,
	};

	return {
		actualData,
		loading: serverData.loading,
		isRefreshing: serverData.isRefreshing || false,
		error: serverData.error,
	};
}
