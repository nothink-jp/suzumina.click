/**
 * GenericList互換性レイヤー
 * 既存のGenericListインターフェースを新しいConfigurableListにマッピング
 */

"use client";

import type { ReactNode } from "react";
import { ConfigurableList } from "./configurable-list";
import type { DataAdapter, FilterConfig, SortConfig } from "./core/types";

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
			defaultValue?: any;
			validation?: (value: any) => boolean;
			transform?: (value: any) => any;
			dependsOn?: string;
			getDynamicOptions?: (parentValue: any) => Array<{ value: string; label: string }>;
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
	};
	fetchData: (params: {
		page: number;
		limit: number;
		sort?: string;
		search?: string;
		filters: Record<string, any>;
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
	onFilterChange?: (filters: Record<string, any>) => void;
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
					options: filter.options,
					showAll: filter.type === "select" && !filter.defaultValue,
					emptyValue: filter.defaultValue,
					validate: filter.validation,
					dependsOn: filter.dependsOn,
					enabled: filter.dependsOn
						? (allFilters) => {
								const parentValue = allFilters[filter.dependsOn!];
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
		fromResult: (result) => ({
			items: result.items,
			total: result.totalCount || result.filteredCount,
		}),
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
				renderItem={renderItem}
				filters={filters}
				sorts={sorts}
				defaultSort={config.defaultSort}
				searchable={!!config.searchConfig}
				searchPlaceholder={config.searchConfig?.placeholder}
				itemsPerPage={config.paginationConfig?.itemsPerPage || 12}
				urlSync={true}
				fetchFn={fetchData}
				dataAdapter={dataAdapter}
				onError={handleError}
				emptyMessage="データがありません"
			/>
		</div>
	);
}

// 既存のGenericListと同じ名前でエクスポート（段階的移行用）
export { GenericListCompat as GenericList };
