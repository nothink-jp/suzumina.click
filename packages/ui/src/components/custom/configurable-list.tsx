/**
 * ConfigurableList - カスタマイズ可能なリストコンポーネント
 * フィルター、ソート、URL同期、サーバーサイドデータ取得機能を提供
 */

"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "../ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Slider } from "../ui/slider";
import { useListData } from "./configurable-list/hooks/useListData";
import { useListUrl } from "./configurable-list/hooks/useListUrl";
import type {
	ConfigurableListProps,
	DataAdapter,
	FilterConfig,
	StandardListParams,
} from "./configurable-list/types";
import { generateGridClasses } from "./configurable-list/utils/classHelpers";
import { calculatePagination } from "./configurable-list/utils/dataAdapter";
import {
	generateOptions,
	getDefaultFilterValues,
	hasActiveFilters,
	normalizeOptions,
	transformFilterValue,
} from "./configurable-list/utils/filterHelpers";
import { getFilterableValue, getSearchableText } from "./configurable-list/utils/typeSafeAccess";

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
	initialTotal,
}: ConfigurableListProps<T>) {
	// URLパラメータとの同期
	const urlHook = useListUrl({
		filters,
		defaultSort,
		defaultPageSize: itemsPerPage,
	});

	// urlSyncがfalseの場合のローカル状態
	const [localParams, setLocalParams] = useState<StandardListParams>({
		page: 1,
		itemsPerPage,
		sort: defaultSort || "",
		search: "",
		filters: getDefaultFilterValues(filters),
	});

	// サーバーサイドデータ取得が有効な場合
	const isServerSide = !!fetchFn;

	// データ取得用のパラメータ
	const fetchParams: StandardListParams = useMemo(
		() => (urlSync ? urlHook.params : localParams),
		[urlSync, urlHook.params, localParams],
	);

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

	const loading = externalLoading || serverData.loading;
	const isRefreshing = serverData.isRefreshing || false;
	const error = externalError || serverData.error;

	// クライアントサイドのフィルタリング（サーバーサイドでない場合）
	const processedItems = useMemo(() => {
		if (isServerSide) return actualData.items;

		let result = [...actualData.items];

		// 検索フィルタリング
		if (fetchParams.search && searchable) {
			result = result.filter((item) => {
				const searchableText = getSearchableText(item);
				return searchableText
					? searchableText.toLowerCase().includes(fetchParams.search?.toLowerCase() || "")
					: false;
			});
		}

		// カスタムフィルターの適用
		Object.entries(fetchParams.filters).forEach(([key, value]) => {
			const config = filters[key];
			if (!config) return;

			// 空文字列の場合はフィルタリングしない
			if (value === "") return;

			const transformedValue = transformFilterValue(value, config);
			if (transformedValue === undefined) return;

			result = result.filter((item) => {
				const itemValue = getFilterableValue(item, key);

				switch (config.type) {
					case "multiselect":
					case "tags":
						// tagsタイプもmultiselectと同じロジックで処理
						if (Array.isArray(transformedValue)) {
							// itemValueが配列の場合（例：genres配列）
							if (Array.isArray(itemValue)) {
								// 選択されたタグのいずれかがアイテムのタグに含まれているか確認
								return transformedValue.some((selectedTag) => itemValue.includes(selectedTag));
							}
							// itemValueが単一値の場合
							return transformedValue.includes(itemValue);
						}
						return false;
					case "range": {
						const { min, max } = transformedValue as { min?: number; max?: number };
						const numValue = Number(itemValue);
						return (min === undefined || numValue >= min) && (max === undefined || numValue <= max);
					}
					case "boolean":
						return Boolean(itemValue) === transformedValue;
					default:
						return itemValue === transformedValue;
				}
			});
		});

		// ソート
		if (fetchParams.sort) {
			result.sort((a, b) => {
				const sortKey = fetchParams.sort;
				if (!sortKey) return 0;

				const aValue = getFilterableValue(a, sortKey);
				const bValue = getFilterableValue(b, sortKey);

				// Handle undefined values
				if (aValue === undefined && bValue === undefined) return 0;
				if (aValue === undefined) return 1;
				if (bValue === undefined) return -1;

				// Compare values
				// For string comparison
				if (typeof aValue === "string" && typeof bValue === "string") {
					return aValue.localeCompare(bValue);
				}
				// For number comparison
				if (typeof aValue === "number" && typeof bValue === "number") {
					return aValue - bValue;
				}
				// For other types, convert to string and compare
				const aStr = String(aValue);
				const bStr = String(bValue);
				return aStr.localeCompare(bStr);
			});
		}

		return result;
	}, [actualData.items, fetchParams, isServerSide, searchable, filters]);

	// ページネーション情報
	const pagination = useMemo(() => {
		const total = isServerSide ? actualData.total : processedItems.length;
		return calculatePagination(total, fetchParams.itemsPerPage, fetchParams.page);
	}, [
		actualData.total,
		processedItems.length,
		fetchParams.itemsPerPage,
		fetchParams.page,
		isServerSide,
	]);

	// 現在のページのアイテム
	const currentItems = useMemo(() => {
		if (isServerSide) {
			// サーバーサイドの場合でも、念のためページサイズに合わせてスライス
			// サーバーが異なるページサイズのデータを返した場合の対応
			const itemsPerPage = fetchParams.itemsPerPage;
			if (actualData.items.length > itemsPerPage) {
				// ページサイズより多いデータが返された場合はスライス
				return actualData.items.slice(0, itemsPerPage);
			}
			return actualData.items;
		}
		return processedItems.slice(pagination.startIndex, pagination.endIndex);
	}, [processedItems, pagination, isServerSide, actualData.items, fetchParams.itemsPerPage]);

	// IME変換中かどうかを管理
	const [isComposing, setIsComposing] = useState(false);
	const [localSearchValue, setLocalSearchValue] = useState(fetchParams.search);

	// URLパラメータが変更されたときにローカル値を同期
	useEffect(() => {
		setLocalSearchValue(fetchParams.search);
	}, [fetchParams.search]);

	// アクション関数
	const handleSearchChange = useCallback((value: string) => {
		setLocalSearchValue(value);
		// Enterキー入力時のみ更新するため、ここでは更新しない
	}, []);

	// IME変換終了時の処理
	const handleCompositionEnd = useCallback(() => {
		setIsComposing(false);
		// Enterキー入力時のみ更新するため、ここでは更新しない
	}, []);

	// Enterキー押下時の処理
	const handleSearchKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && !isComposing) {
				if (urlSync) {
					urlHook.setSearch(localSearchValue || "");
				} else {
					setLocalParams((prev) => ({ ...prev, search: localSearchValue || "" }));
				}
			}
		},
		[urlSync, urlHook, localSearchValue, isComposing],
	);

	const handleSortChange = useCallback(
		(value: string) => {
			if (urlSync) {
				urlHook.setSort(value);
			} else {
				setLocalParams((prev) => ({ ...prev, sort: value }));
			}
		},
		[urlSync, urlHook],
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
		[urlSync, urlHook],
	);

	const handlePageChange = useCallback(
		(page: number) => {
			if (urlSync) {
				urlHook.setPage(page);
			} else {
				setLocalParams((prev) => ({ ...prev, page }));
			}
		},
		[urlSync, urlHook],
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
	}, [urlSync, urlHook, filters]);

	const handleItemsPerPageChange = useCallback(
		(value: string) => {
			if (urlSync) {
				urlHook.setItemsPerPage(Number(value));
			} else {
				setLocalParams((prev) => ({ ...prev, itemsPerPage: Number(value), page: 1 }));
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
					<Select value={value?.toString() || ""} onValueChange={(v) => handleFilterChange(key, v)}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder={config.placeholder || `${config.label || key}を選択`} />
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
						{config.label || key}
					</Button>
				);
			case "multiselect": {
				const options = generateOptions(config);
				const selectedValues = Array.isArray(value) ? value : [];
				return (
					<div className="space-y-2">
						<Label>{config.label || key}</Label>
						<div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
							{options.map((opt) => (
								<div key={opt.value} className="flex items-center space-x-2">
									<Checkbox
										id={`${key}-${opt.value}`}
										checked={selectedValues.includes(opt.value)}
										onCheckedChange={(checked) => {
											const newValues = checked
												? [...selectedValues, opt.value]
												: selectedValues.filter((v) => v !== opt.value);
											handleFilterChange(key, newValues.length > 0 ? newValues : undefined);
										}}
									/>
									<Label
										htmlFor={`${key}-${opt.value}`}
										className="text-sm font-normal cursor-pointer"
									>
										{opt.label}
									</Label>
								</div>
							))}
						</div>
					</div>
				);
			}
			case "range": {
				const min = config.min ?? 0;
				const max = config.max ?? 100;
				const step = config.step ?? 1;
				const rangeValue = value as { min?: number; max?: number } | undefined;
				const currentMin = rangeValue?.min ?? min;
				const currentMax = rangeValue?.max ?? max;

				return (
					<div className="space-y-2">
						<Label>{config.label || key}</Label>
						<div className="flex items-center space-x-2">
							<Input
								type="number"
								value={currentMin}
								min={min}
								max={max}
								step={step}
								className="w-20"
								onChange={(e) => {
									const newMin = Number(e.target.value);
									handleFilterChange(key, { min: newMin, max: currentMax });
								}}
							/>
							<span className="text-sm text-muted-foreground">〜</span>
							<Input
								type="number"
								value={currentMax}
								min={min}
								max={max}
								step={step}
								className="w-20"
								onChange={(e) => {
									const newMax = Number(e.target.value);
									handleFilterChange(key, { min: currentMin, max: newMax });
								}}
							/>
						</div>
						<Slider
							value={[currentMin, currentMax]}
							min={min}
							max={max}
							step={step}
							onValueChange={([newMin, newMax]) => {
								handleFilterChange(key, { min: newMin, max: newMax });
							}}
							className="mt-2"
						/>
					</div>
				);
			}
			case "date": {
				return (
					<div className="space-y-2">
						<Label>{config.label || key}</Label>
						<Input
							type="date"
							value={value?.toString() || ""}
							onChange={(e) => handleFilterChange(key, e.target.value || undefined)}
							className="w-[180px]"
						/>
					</div>
				);
			}
			case "dateRange": {
				const dateValue = value as { start?: string; end?: string } | undefined;
				return (
					<div className="space-y-2">
						<Label>{config.label || key}</Label>
						<div className="flex items-center space-x-2">
							<Input
								type="date"
								value={dateValue?.start || ""}
								min={config.minDate}
								max={config.maxDate}
								onChange={(e) => {
									handleFilterChange(key, {
										start: e.target.value || undefined,
										end: dateValue?.end,
									});
								}}
								className="w-[140px]"
							/>
							<span className="text-sm text-muted-foreground">〜</span>
							<Input
								type="date"
								value={dateValue?.end || ""}
								min={config.minDate}
								max={config.maxDate}
								onChange={(e) => {
									handleFilterChange(key, {
										start: dateValue?.start,
										end: e.target.value || undefined,
									});
								}}
								className="w-[140px]"
							/>
						</div>
					</div>
				);
			}
			case "tags": {
				const options = generateOptions(config);
				const selectedValues = Array.isArray(value) ? value : [];
				// optionsがundefinedまたはnullの場合のみローディング中とみなす
				// 空配列の場合は有効なデータとして扱う
				const isLoading = options === undefined || options === null;
				const hasNoData = !isLoading && options.length === 0;

				return (
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="h-9 border-dashed"
								disabled={isLoading || hasNoData}
							>
								{config.label || key}
								{selectedValues.length > 0 && (
									<>
										<div className="mx-1 h-4 w-[1px] bg-border" />
										<Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
											{selectedValues.length}
										</Badge>
										<div className="hidden space-x-1 lg:flex">
											{selectedValues.length > 2 ? (
												<Badge variant="secondary" className="rounded-sm px-1 font-normal">
													{selectedValues.length}件選択中
												</Badge>
											) : (
												options
													.filter((option) => selectedValues.includes(option.value))
													.map((option) => (
														<Badge
															key={option.value}
															variant="secondary"
															className="rounded-sm px-1 font-normal"
														>
															{option.label}
														</Badge>
													))
											)}
										</div>
									</>
								)}
								<ChevronDown className="ml-2 h-4 w-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[300px] p-0" align="start">
							<div className="p-4">
								<div className="mb-2 text-sm font-medium">{config.label || key}</div>
								{isLoading ? (
									<div className="flex items-center justify-center py-8">
										<div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
										<span className="ml-2 text-sm text-muted-foreground">読み込み中...</span>
									</div>
								) : options.length === 0 ? (
									<div className="text-center py-4 text-sm text-muted-foreground">
										データがありません
									</div>
								) : (
									<>
										<div className="grid gap-2 max-h-[300px] overflow-y-auto">
											{options.map((option) => (
												<div key={option.value} className="flex items-center space-x-2">
													<Checkbox
														id={`tag-${option.value}`}
														checked={selectedValues.includes(option.value)}
														onCheckedChange={(checked) => {
															const newValues = checked
																? [...selectedValues, option.value]
																: selectedValues.filter((v) => v !== option.value);
															handleFilterChange(key, newValues.length > 0 ? newValues : undefined);
														}}
													/>
													<Label
														htmlFor={`tag-${option.value}`}
														className="text-sm font-normal cursor-pointer flex-1"
													>
														{option.label}
													</Label>
												</div>
											))}
										</div>
										{selectedValues.length > 0 && (
											<Button
												variant="ghost"
												size="sm"
												className="mt-2 w-full"
												onClick={() => handleFilterChange(key, undefined)}
											>
												クリア
											</Button>
										)}
									</>
								)}
							</div>
						</PopoverContent>
					</Popover>
				);
			}
			default:
				return null;
		}
	};

	// ローディング表示（データがない場合のみスケルトンを表示）
	if (loading && currentItems.length === 0 && !actualData.total) {
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
			{/* ヘッダー：検索とフィルターを横並び */}
			<div className="mb-6">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
					{/* 検索ボックス */}
					{searchable && (
						<div className="relative flex-1 lg:max-w-md">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="search"
								placeholder={
									searchPlaceholder ? `${searchPlaceholder} (Enterで検索)` : "検索... (Enterで検索)"
								}
								value={localSearchValue}
								onChange={(e) => handleSearchChange(e.target.value)}
								onKeyDown={handleSearchKeyDown}
								onCompositionStart={() => setIsComposing(true)}
								onCompositionEnd={handleCompositionEnd}
								className="pl-10"
							/>
						</div>
					)}

					{/* フィルター */}
					{hasFilters && (
						<div className="flex flex-shrink-0 flex-wrap items-center gap-2">
							{Object.entries(filters).map(([key, config]) => (
								<div key={key}>{renderFilter(key, config)}</div>
							))}
							{activeFilters && (
								<Button variant="ghost" size="sm" onClick={handleResetFilters}>
									<X className="mr-1 h-3 w-3" />
									リセット
								</Button>
							)}
						</div>
					)}
				</div>
			</div>

			{/* 情報表示とコントロール：件数、ソート、ページサイズ */}
			<div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{/* 左側：件数表示 */}
				<div className="text-sm text-muted-foreground flex items-center gap-2">
					{isRefreshing && (
						<div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					)}
					{actualData.total > 0 ? (
						<>
							全{actualData.total}件 <span className="mx-2">/</span> {pagination.startIndex + 1}-
							{Math.min(pagination.endIndex, actualData.total)}件を表示
							{isRefreshing && <span className="text-xs">（更新中...）</span>}
						</>
					) : fetchParams.search ? (
						"検索結果がありません"
					) : (
						emptyMessage
					)}
				</div>

				{/* 右側：ソートとページサイズ */}
				<div className="flex items-center gap-3">
					{/* ソート選択 */}
					{sortOptions.length > 0 && (
						<Select value={fetchParams.sort} onValueChange={handleSortChange}>
							<SelectTrigger className="h-8 w-[140px]">
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

					{/* ページサイズ選択 */}
					{itemsPerPageOptions &&
						itemsPerPageOptions.length > 0 &&
						(actualData.total > 0 || (initialTotal && initialTotal > 0)) && (
							<Select
								value={fetchParams.itemsPerPage.toString()}
								onValueChange={handleItemsPerPageChange}
							>
								<SelectTrigger className="h-8 w-[140px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{itemsPerPageOptions.map((option) => (
										<SelectItem key={option} value={option.toString()}>
											{option}件/ページ
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
				</div>
			</div>

			{/* リスト本体 */}
			{currentItems.length > 0 ? (
				<div
					className={
						layout === "grid"
							? generateGridClasses(gridColumns)
							: layout === "flex"
								? "flex flex-wrap gap-3 items-start"
								: "space-y-4"
					}
				>
					{currentItems.map((item, index) => (
						<div key={pagination.startIndex + index}>
							{renderItem(item, pagination.startIndex + index)}
						</div>
					))}
				</div>
			) : (
				// データがない場合は、ローディング中でない且つ初期データも存在しない場合のみ空メッセージを表示
				!loading &&
				actualData.total === 0 &&
				currentItems.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
				)
			)}

			{/* ページネーション（下部） */}
			{pagination.totalPages > 1 && (
				<Pagination className="mt-8">
					<PaginationContent>
						{/* Previous ボタン */}
						<PaginationItem>
							<PaginationPrevious
								href="#"
								onClick={(e) => {
									e.preventDefault();
									if (pagination.hasPrev) {
										handlePageChange(fetchParams.page - 1);
									}
								}}
								className={
									!pagination.hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"
								}
							/>
						</PaginationItem>

						{/* ページ番号の生成 */}
						{(() => {
							const current = fetchParams.page;
							const total = pagination.totalPages;
							const maxVisiblePages = 5;
							const halfVisible = Math.floor(maxVisiblePages / 2);

							// ページ番号の範囲を計算
							let startPage = Math.max(1, current - halfVisible);
							const endPage = Math.min(total, startPage + maxVisiblePages - 1);

							// 開始ページを調整
							if (endPage - startPage < maxVisiblePages - 1) {
								startPage = Math.max(1, endPage - maxVisiblePages + 1);
							}

							const pages = [];

							// 最初のページと省略記号
							if (startPage > 1) {
								pages.push(
									<PaginationItem key="page-1">
										<PaginationLink
											href="#"
											onClick={(e) => {
												e.preventDefault();
												handlePageChange(1);
											}}
										>
											1
										</PaginationLink>
									</PaginationItem>,
								);

								if (startPage > 2) {
									pages.push(
										<PaginationItem key="ellipsis-start">
											<PaginationEllipsis />
										</PaginationItem>,
									);
								}
							}

							// ページ番号
							for (let i = startPage; i <= endPage; i++) {
								pages.push(
									<PaginationItem key={`page-${i}`}>
										<PaginationLink
											href="#"
											isActive={current === i}
											onClick={(e) => {
												e.preventDefault();
												handlePageChange(i);
											}}
										>
											{i}
										</PaginationLink>
									</PaginationItem>,
								);
							}

							// 最後のページと省略記号
							if (endPage < total) {
								if (endPage < total - 1) {
									pages.push(
										<PaginationItem key="ellipsis-end">
											<PaginationEllipsis />
										</PaginationItem>,
									);
								}

								pages.push(
									<PaginationItem key={`page-${total}`}>
										<PaginationLink
											href="#"
											onClick={(e) => {
												e.preventDefault();
												handlePageChange(total);
											}}
										>
											{total}
										</PaginationLink>
									</PaginationItem>,
								);
							}

							return pages;
						})()}

						{/* Next ボタン */}
						<PaginationItem>
							<PaginationNext
								href="#"
								onClick={(e) => {
									e.preventDefault();
									if (pagination.hasNext) {
										handlePageChange(fetchParams.page + 1);
									}
								}}
								className={
									!pagination.hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}

			{/* 合計件数表示（ページネーションの下） */}
			{pagination.totalPages > 1 && (
				<div className="mt-2 text-center text-sm text-muted-foreground">
					{actualData.total}件中 {pagination.startIndex + 1}〜
					{Math.min(pagination.endIndex, actualData.total)}
					件を表示
				</div>
			)}
		</div>
	);
}
