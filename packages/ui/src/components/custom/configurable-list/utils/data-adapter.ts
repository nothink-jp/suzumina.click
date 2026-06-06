/**
 * データアダプターのユーティリティ
 */

import type { DataAdapter, ListDataSource, StandardListParams } from "../types";

/**
 * 標準的なデータアダプターを作成
 */
export function createDataAdapter<T, TParams = unknown>(config: {
	/** パラメータ変換のマッピング */
	paramMapping?: {
		page?: string;
		itemsPerPage?: string;
		sort?: string;
		search?: string;
		[key: string]: string | undefined;
	};
	/** フィルター値の変換 */
	filterTransforms?: Record<string, (value: unknown) => unknown>;
	/** 結果の変換 */
	resultMapping: {
		items: string | ((result: TParams) => T[]);
		total: string | ((result: TParams) => number);
	};
}): DataAdapter<T, TParams> {
	return {
		toParams: (listParams: StandardListParams) => {
			const params: Record<string, unknown> = {};

			// 基本パラメータのマッピング
			if (config.paramMapping?.page) {
				params[config.paramMapping.page] = listParams.page;
			} else {
				params.page = listParams.page;
			}

			if (config.paramMapping?.itemsPerPage) {
				params[config.paramMapping.itemsPerPage] = listParams.itemsPerPage;
			} else {
				params.limit = listParams.itemsPerPage;
			}

			if (listParams.sort) {
				if (config.paramMapping?.sort) {
					params[config.paramMapping.sort] = listParams.sort;
				} else {
					params.sort = listParams.sort;
				}
			}

			if (listParams.search) {
				if (config.paramMapping?.search) {
					params[config.paramMapping.search] = listParams.search;
				} else {
					params.search = listParams.search;
				}
			}

			// フィルターの変換
			Object.entries(listParams.filters).forEach(([key, value]) => {
				if (value !== undefined) {
					const transform = config.filterTransforms?.[key];
					const transformedValue = transform ? transform(value) : value;

					if (transformedValue !== undefined) {
						params[key] = transformedValue;
					}
				}
			});

			return params as TParams;
		},

		fromResult: (result: unknown) => {
			const items =
				typeof config.resultMapping.items === "string"
					? ((result as Record<string, unknown>)[config.resultMapping.items] as T[])
					: config.resultMapping.items(result as TParams);

			const total =
				typeof config.resultMapping.total === "string"
					? ((result as Record<string, unknown>)[config.resultMapping.total] as number)
					: config.resultMapping.total(result as TParams);

			return {
				items,
				total,
			};
		},
	};
}

/**
 * 既存のfetchData関数をラップして新しい形式に適合させる
 */
export function wrapLegacyFetchData<T>(
	fetchData: (params: unknown) => Promise<{
		items: T[];
		totalCount: number;
		filteredCount: number;
	}>,
	adapter: DataAdapter<T, unknown>,
): (params: StandardListParams) => Promise<ListDataSource<T>> {
	return async (params: StandardListParams) => {
		const apiParams = adapter.toParams(params);
		const result = await fetchData(apiParams);
		return adapter.fromResult(result);
	};
}

/**
 * ページネーション情報を計算
 */
export function calculatePagination(
	total: number,
	itemsPerPage: number,
	currentPage: number,
): {
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
	startIndex: number;
	endIndex: number;
} {
	const totalPages = Math.ceil(total / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = Math.min(startIndex + itemsPerPage, total);

	return {
		totalPages,
		hasNext: currentPage < totalPages,
		hasPrev: currentPage > 1,
		startIndex,
		endIndex,
	};
}
