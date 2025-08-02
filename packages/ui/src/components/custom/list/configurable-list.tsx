/**
 * ConfigurableList - カスタマイズ可能なリストコンポーネント
 * フィルター、ソート、URL同期、サーバーサイドデータ取得機能を提供
 */

"use client";

import { ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Skeleton } from "../../ui/skeleton";
import { useListData } from "./core/hooks/useListData";
import { useListUrl } from "./core/hooks/useListUrl";
import type { ConfigurableListProps, FilterConfig, StandardListParams } from "./core/types";
import { calculatePagination, wrapLegacyFetchData } from "./core/utils/dataAdapter";
import {
	generateOptions,
	getDefaultFilterValues,
	hasActiveFilters,
	normalizeOptions,
	transformFilterValue,
} from "./core/utils/filterHelpers";

export function ConfigurableList<T>({
	items: initialItems,
	renderItem,
	itemsPerPage = 12,
	loading: externalLoading = false,
	error: externalError,
	className = "",
	// ConfigurableList専用props
	filters = {},
	sorts = [],
	defaultSort,
	searchable = true,
	searchPlaceholder = "検索...",
	urlSync = true,
	dataAdapter,
	fetchFn,
	onError,
	emptyMessage = "データがありません",
	loadingComponent,
	layout = "list",
	gridColumns = {
		default: 1,
		md: 2,
		lg: 3,
	},
	itemsPerPageOptions,
}: ConfigurableListProps<T>) {
	// URLパラメータとの同期
	const urlHook = useListUrl({
		filters,
		defaultSort,
		defaultPageSize: itemsPerPage,
	});

	// サーバーサイドデータ取得が有効な場合
	const isServerSide = !!fetchFn && !!dataAdapter;

	// データ取得用のパラメータ
	const fetchParams: StandardListParams = useMemo(
		() => ({
			page: urlSync ? urlHook.params.page : 1,
			itemsPerPage: urlSync ? urlHook.params.itemsPerPage : itemsPerPage,
			sort: urlSync ? urlHook.params.sort : defaultSort || "",
			search: urlSync ? urlHook.params.search : "",
			filters: urlSync ? urlHook.params.filters : getDefaultFilterValues(filters),
		}),
		[urlSync, urlHook.params, itemsPerPage, defaultSort, filters],
	);

	// fetchFnをメモ化
	const memoizedFetchFn = useMemo(() => {
		if (!isServerSide) {
			return async () => ({ items: initialItems, total: initialItems.length });
		}
		return wrapLegacyFetchData(async (params) => {
			// paramsはすでにdataAdapterによって変換されているので、そのまま使用
			const result = await fetchFn!(params);
			return {
				items: result.items || [],
				totalCount: result.total || result.totalCount || 0,
				filteredCount: result.total || result.filteredCount || 0,
			};
		}, dataAdapter!);
	}, [isServerSide, dataAdapter, fetchFn, initialItems]);

	// サーバーサイドデータ取得
	const serverData = useListData(fetchParams, {
		fetchFn: memoizedFetchFn,
		initialData: isServerSide ? undefined : { items: initialItems, total: initialItems.length },
		onError,
		debounceMs: searchable ? 300 : 0, // 検索時のみデバウンス
	});

	// 使用するデータソース
	const data = serverData.data || { items: initialItems, total: initialItems.length };
	const loading = externalLoading || serverData.loading;
	const error = externalError || serverData.error;

	// クライアントサイドのフィルタリング（サーバーサイドでない場合）
	const processedItems = useMemo(() => {
		if (isServerSide) return data.items;

		let result = [...data.items];

		// 検索フィルタリング
		if (fetchParams.search && searchable) {
			result = result.filter((item) => {
				if (typeof item === "object" && item !== null) {
					const searchableProps = ["title", "name", "label"];
					return searchableProps.some((prop) => {
						const value = (item as any)[prop];
						return (
							typeof value === "string" &&
							value.toLowerCase().includes(fetchParams.search?.toLowerCase() || "")
						);
					});
				}
				return false;
			});
		}

		// カスタムフィルターの適用
		Object.entries(fetchParams.filters).forEach(([key, value]) => {
			const config = filters[key];
			if (!config) return;

			const transformedValue = transformFilterValue(value, config);
			if (transformedValue === undefined) return;

			result = result.filter((item) => {
				const itemValue = (item as any)[key];

				switch (config.type) {
					case "multiselect":
						return Array.isArray(transformedValue) && transformedValue.includes(itemValue);
					case "range": {
						const { min, max } = transformedValue;
						return (
							(min === undefined || itemValue >= min) && (max === undefined || itemValue <= max)
						);
					}
					case "boolean":
						return itemValue === transformedValue;
					default:
						return itemValue === transformedValue;
				}
			});
		});

		// ソート
		if (fetchParams.sort) {
			result.sort((a, b) => {
				const aValue = (a as any)[fetchParams.sort!];
				const bValue = (b as any)[fetchParams.sort!];

				if (aValue < bValue) return -1;
				if (aValue > bValue) return 1;
				return 0;
			});
		}

		return result;
	}, [data.items, fetchParams, isServerSide, searchable, filters]);

	// ページネーション情報
	const pagination = useMemo(() => {
		const total = isServerSide ? data.total : processedItems.length;
		return calculatePagination(total, fetchParams.itemsPerPage, fetchParams.page);
	}, [data.total, processedItems.length, fetchParams.itemsPerPage, fetchParams.page, isServerSide]);

	// 現在のページのアイテム
	const currentItems = useMemo(() => {
		// サーバーサイドの場合、データが期待するページサイズと一致しているか確認
		if (isServerSide) {
			// サーバーから取得したデータが現在のページサイズと一致している場合はそのまま使用
			// そうでない場合は、データの再取得が必要なのでローディング中として扱う
			return data.items;
		}
		return processedItems.slice(pagination.startIndex, pagination.endIndex);
	}, [processedItems, pagination, isServerSide, data.items]);

	// アクション関数
	const handleSearchChange = useCallback(
		(value: string) => {
			if (urlSync) {
				urlHook.setSearch(value);
			}
		},
		[urlSync, urlHook],
	);

	const handleSortChange = useCallback(
		(value: string) => {
			if (urlSync) {
				urlHook.setSort(value);
			}
		},
		[urlSync, urlHook],
	);

	const handleFilterChange = useCallback(
		(key: string, value: any) => {
			if (urlSync) {
				urlHook.setFilter(key, value);
			}
		},
		[urlSync, urlHook],
	);

	const handlePageChange = useCallback(
		(page: number) => {
			if (urlSync) {
				urlHook.setPage(page);
			}
		},
		[urlSync, urlHook],
	);

	const handleResetFilters = useCallback(() => {
		if (urlSync) {
			urlHook.resetFilters();
		}
	}, [urlSync, urlHook]);

	const handleItemsPerPageChange = useCallback(
		(value: string) => {
			if (urlSync) {
				urlHook.setItemsPerPage(Number(value));
			}
		},
		[urlSync, urlHook],
	);

	// フィルターコンポーネントのレンダリング
	const renderFilter = (key: string, config: FilterConfig) => {
		const value = fetchParams.filters[key];

		switch (config.type) {
			case "select": {
				const options = generateOptions(config);
				return (
					<Select value={value || ""} onValueChange={(v) => handleFilterChange(key, v)}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder={`${key}を選択`} />
						</SelectTrigger>
						<SelectContent>
							{options.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			}
			case "boolean":
				return (
					<Button
						variant={value ? "default" : "outline"}
						size="sm"
						onClick={() => handleFilterChange(key, !value)}
					>
						{key}
					</Button>
				);
			default:
				return null;
		}
	};

	// ローディング表示
	if (loading && currentItems.length === 0) {
		if (loadingComponent) return <>{loadingComponent}</>;

		return (
			<div className={className}>
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
			</div>
		);
	}

	// エラー表示
	if (error) {
		return (
			<div className={`rounded-lg border border-destructive/50 p-6 ${className}`}>
				<p className="text-destructive">{error.message}</p>
				{error.retry && (
					<Button onClick={error.retry} variant="outline" size="sm" className="mt-4">
						再試行
					</Button>
				)}
			</div>
		);
	}

	// ソートオプションの正規化
	const sortOptions = normalizeOptions(
		sorts.map((sort) => {
			if (typeof sort === "string") {
				return { value: sort, label: sort };
			}
			return sort;
		}),
	);
	const hasFilters = Object.keys(filters).length > 0;
	const activeFilters = hasActiveFilters(fetchParams.filters, filters);

	return (
		<div className={className}>
			{/* ヘッダー：検索、フィルター、ソート */}
			<div className="mb-6 space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					{/* 検索ボックス */}
					{searchable && (
						<div className="relative max-w-sm flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="search"
								placeholder={searchPlaceholder}
								value={fetchParams.search}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-10"
							/>
						</div>
					)}

					{/* ソート選択 */}
					{sortOptions.length > 0 && (
						<Select value={fetchParams.sort} onValueChange={handleSortChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="並び順" />
							</SelectTrigger>
							<SelectContent>
								{sortOptions.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>

				{/* フィルター */}
				{hasFilters && (
					<div className="flex flex-wrap items-center gap-2">
						<Filter className="h-4 w-4 text-muted-foreground" />
						{Object.entries(filters).map(([key, config]) => (
							<div key={key}>{renderFilter(key, config)}</div>
						))}
						{activeFilters && (
							<Button variant="ghost" size="sm" onClick={handleResetFilters} className="ml-2">
								<X className="mr-1 h-3 w-3" />
								リセット
							</Button>
						)}
					</div>
				)}
			</div>

			{/* アイテム数表示とページサイズ選択 */}
			<div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
				<div className="flex items-center gap-4">
					<div>
						{data.total > 0 ? (
							<>
								{data.total}件中 {pagination.startIndex + 1}-
								{Math.min(pagination.endIndex, data.total)}件を表示
							</>
						) : fetchParams.search ? (
							"検索結果がありません"
						) : (
							emptyMessage
						)}
					</div>
					{itemsPerPageOptions && itemsPerPageOptions.length > 0 && data.total > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-xs">表示件数:</span>
							<Select
								value={fetchParams.itemsPerPage.toString()}
								onValueChange={handleItemsPerPageChange}
							>
								<SelectTrigger className="h-8 w-[80px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{itemsPerPageOptions.map((option) => (
										<SelectItem key={option} value={option.toString()}>
											{option}件
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>
				{activeFilters && (
					<Badge variant="secondary" className="text-xs">
						フィルター適用中
					</Badge>
				)}
			</div>

			{/* リスト本体 */}
			{currentItems.length > 0 && (
				<div
					className={(() => {
						if (layout === "grid") {
							const classes = ["grid", "gap-6"];
							// デフォルトカラム数
							if (gridColumns.default === 1) classes.push("grid-cols-1");
							else if (gridColumns.default === 2) classes.push("grid-cols-2");
							else if (gridColumns.default === 3) classes.push("grid-cols-3");
							else if (gridColumns.default === 4) classes.push("grid-cols-4");
							// sm
							if (gridColumns.sm === 1) classes.push("sm:grid-cols-1");
							else if (gridColumns.sm === 2) classes.push("sm:grid-cols-2");
							else if (gridColumns.sm === 3) classes.push("sm:grid-cols-3");
							else if (gridColumns.sm === 4) classes.push("sm:grid-cols-4");
							// md
							if (gridColumns.md === 1) classes.push("md:grid-cols-1");
							else if (gridColumns.md === 2) classes.push("md:grid-cols-2");
							else if (gridColumns.md === 3) classes.push("md:grid-cols-3");
							else if (gridColumns.md === 4) classes.push("md:grid-cols-4");
							// lg
							if (gridColumns.lg === 1) classes.push("lg:grid-cols-1");
							else if (gridColumns.lg === 2) classes.push("lg:grid-cols-2");
							else if (gridColumns.lg === 3) classes.push("lg:grid-cols-3");
							else if (gridColumns.lg === 4) classes.push("lg:grid-cols-4");
							// xl
							if (gridColumns.xl === 1) classes.push("xl:grid-cols-1");
							else if (gridColumns.xl === 2) classes.push("xl:grid-cols-2");
							else if (gridColumns.xl === 3) classes.push("xl:grid-cols-3");
							else if (gridColumns.xl === 4) classes.push("xl:grid-cols-4");
							return classes.join(" ");
						}
						return "space-y-4";
					})()}
				>
					{currentItems.map((item, index) => (
						<div key={pagination.startIndex + index}>
							{renderItem(item, pagination.startIndex + index)}
						</div>
					))}
				</div>
			)}

			{/* ページネーション */}
			{pagination.totalPages > 1 && (
				<div className="mt-8 flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => handlePageChange(fetchParams.page - 1)}
						disabled={!pagination.hasPrev}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>

					<div className="flex gap-1">
						{Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
							let pageNum: number;
							if (pagination.totalPages <= 7) {
								pageNum = i + 1;
							} else if (fetchParams.page <= 4) {
								pageNum = i + 1;
							} else if (fetchParams.page >= pagination.totalPages - 3) {
								pageNum = pagination.totalPages - 6 + i;
							} else {
								pageNum = fetchParams.page - 3 + i;
							}

							if (pageNum < 1 || pageNum > pagination.totalPages) return null;

							return (
								<Button
									key={pageNum}
									variant={pageNum === fetchParams.page ? "default" : "outline"}
									size="icon"
									onClick={() => handlePageChange(pageNum)}
								>
									{pageNum}
								</Button>
							);
						})}
					</div>

					<Button
						variant="outline"
						size="icon"
						onClick={() => handlePageChange(fetchParams.page + 1)}
						disabled={!pagination.hasNext}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
