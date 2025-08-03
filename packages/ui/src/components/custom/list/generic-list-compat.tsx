/**
 * GenericList互換性レイヤー
 * 既存のGenericListインターフェースを新しいConfigurableListにマッピング
 */

"use client";

import type { ReactNode } from "react";
import { ConfigurableList } from "./configurable-list";
import type { DataAdapter, FilterConfig, SortConfig } from "./core/types";

// 互換性のための型定義
export interface ListParams {
	page: number;
	limit: number;
	sort?: string;
	search?: string;
	filters?: Record<string, unknown>;
}

export interface ListResult<T> {
	items: T[];
	totalCount: number;
	filteredCount: number;
}

// ListConfig型を再エクスポート
export interface ListConfig<T> extends GenericListCompatProps<T> {}

// 既存のGenericList型定義（互換性のため）
export interface GenericListCompatProps<T> {
	config: {
		title?: string;
		baseUrl: string;
		filters?: Array<{
			key: string;
			type: "select" | "multiselect" | "range" | "dateRange" | "search" | "boolean" | "custom";
			label: string;
			placeholder?: string;
			options?: Array<{ value: string; label: string }>;
			defaultValue?: unknown;
			validation?: (value: unknown) => boolean;
			transform?: (value: unknown) => unknown;
			dependsOn?: string;
			getDynamicOptions?: (parentValue: unknown) => Array<{ value: string; label: string }>;
		}>;
		sorts?: Array<{
			value: string;
			label: string;
		}>;
		defaultSort?: string;
		searchConfig?: {
			placeholder?: string;
			debounceMs?: number;
		};
		paginationConfig?: {
			currentPage?: number;
			itemsPerPage?: number;
			itemsPerPageOptions?: number[];
		};
		urlParamMapping?: {
			page?: string;
			limit?: string;
			sort?: string;
			search?: string;
			[key: string]: string | undefined;
		};
		gridColumns?: {
			default?: number;
			sm?: number;
			md?: number;
			lg?: number;
			xl?: number;
		};
	};
	fetchData: (params: {
		page: number;
		limit: number;
		sort?: string;
		search?: string;
		filters: Record<string, unknown>;
	}) => Promise<{
		items: T[];
		totalCount: number;
		filteredCount: number;
	}>;
	renderItem: (item: T, index: number) => ReactNode;
	initialData?: {
		items: T[];
		totalCount: number;
		filteredCount: number;
	};
	onFilterChange?: (filters: Record<string, unknown>) => void;
	onPageChange?: (page: number) => void;
	onSortChange?: (sort: string) => void;
	onSearchChange?: (search: string) => void;
}

/**
 * GenericList互換性ラッパー
 * 既存のコードを変更せずに新しいリストコンポーネントを使用可能にする
 */
export function GenericListCompat<T>({
	config,
	fetchData,
	renderItem,
	initialData,
	onFilterChange,
	onPageChange,
	onSortChange,
	onSearchChange,
}: GenericListCompatProps<T>) {
	// フィルター設定の変換
	const filters: Record<string, FilterConfig> = {};
	if (config.filters) {
		config.filters.forEach((filter) => {
			// サポートされているフィルタータイプのみ変換
			if (filter.type === "select" || filter.type === "boolean") {
				filters[filter.key] = {
					type: filter.type as "select" | "boolean",
					label: filter.label,
					placeholder: filter.placeholder,
					options: filter.options,
					showAll: filter.type === "select" && !filter.defaultValue,
					emptyValue: filter.defaultValue,
					validate: filter.validation,
					dependsOn: filter.dependsOn,
					enabled: filter.dependsOn
						? (allFilters) => {
								const parentValue = filter.dependsOn ? allFilters[filter.dependsOn] : undefined;
								return !!parentValue && parentValue !== "all";
							}
						: undefined,
				};
			}
			// TODO: multiselect, range, dateRange, custom のサポートを追加
		});
	}

	// ソート設定の変換
	const sorts: SortConfig[] = config.sorts || [];

	// データアダプターの作成
	const dataAdapter: DataAdapter<T> = {
		toParams: (params) => ({
			page: params.page,
			limit: params.itemsPerPage,
			sort: params.sort,
			search: params.search,
			filters: params.filters,
		}),
		fromResult: (result) => {
			const typedResult = result as {
				items: T[];
				totalCount: number;
				filteredCount: number;
			};
			return {
				items: typedResult.items,
				total: typedResult.totalCount || typedResult.filteredCount,
			};
		},
	};

	// イベントハンドラーの処理
	const handleError = (error: { message: string }) => {
		console.error("GenericListCompat Error:", error.message);
	};

	return (
		<div>
			{config.title && <h1 className="mb-6 text-2xl font-bold">{config.title}</h1>}

			<ConfigurableList
				items={initialData?.items || []}
				initialTotal={initialData?.totalCount}
				renderItem={renderItem}
				filters={filters}
				sorts={sorts}
				defaultSort={config.defaultSort}
				searchable={!!config.searchConfig}
				searchPlaceholder={config.searchConfig?.placeholder}
				itemsPerPage={config.paginationConfig?.itemsPerPage || 12}
				itemsPerPageOptions={config.paginationConfig?.itemsPerPageOptions}
				urlSync={true}
				fetchFn={fetchData as (params: unknown) => Promise<unknown>}
				dataAdapter={dataAdapter}
				onError={handleError}
				emptyMessage="データがありません"
				layout={config.gridColumns ? "grid" : "list"}
				gridColumns={config.gridColumns}
			/>
		</div>
	);
}

// 既存のGenericListと同じ名前でエクスポート（段階的移行用）
export { GenericListCompat as GenericList };
