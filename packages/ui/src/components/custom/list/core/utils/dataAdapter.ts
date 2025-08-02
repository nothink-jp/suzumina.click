/**
 * データアダプターのユーティリティ
 */

import type { DataAdapter, ListDataSource, StandardListParams } from "../types";
import { transformFilterValue } from "./filterHelpers";

/**
 * 標準的なデータアダプターを作成
 */
export function createDataAdapter<T, P = any>(config: {
	/** パラメータ変換のマッピング */
	paramMapping?: {
		page?: string;
		itemsPerPage?: string;
		sort?: string;
		search?: string;
		[key: string]: string | undefined;
	};
	/** フィルター値の変換 */
	filterTransforms?: Record<string, (value: any) => any>;
	/** 結果の変換 */
	resultMapping: {
		items: string | ((result: P) => T[]);
		total: string | ((result: P) => number);
	};
}): DataAdapter<T, P> {
	return {
		toParams: (listParams: StandardListParams) => {
			const params: any = {};

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

			return params as P;
		},

		fromResult: (result: P) => {
			const items =
				typeof config.resultMapping.items === "string"
					? (result as any)[config.resultMapping.items]
					: config.resultMapping.items(result);

			const total =
				typeof config.resultMapping.total === "string"
					? (result as any)[config.resultMapping.total]
					: config.resultMapping.total(result);

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
	fetchData: (params: any) => Promise<{
		items: T[];
		totalCount: number;
		filteredCount: number;
	}>,
	adapter: DataAdapter<T>,
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
