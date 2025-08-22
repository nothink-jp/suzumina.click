/**
 * ConfigurableList - カスタマイズ可能なリストコンポーネント
 * フィルター、ソート、URL同期、サーバーサイドデータ取得機能を提供
 */

"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Slider } from "../ui/slider";
import { ConfigurableListControls } from "./configurable-list/ConfigurableListControls";
import { ConfigurableListFooter } from "./configurable-list/ConfigurableListFooter";
import { ConfigurableListHeader } from "./configurable-list/ConfigurableListHeader";
import { ConfigurableListItems } from "./configurable-list/ConfigurableListItems";
import { useConfigurableListData } from "./configurable-list/hooks/useConfigurableListData";
import { useListHandlers } from "./configurable-list/hooks/useListHandlers";
import { useListUrl } from "./configurable-list/hooks/useListUrl";
import { useSearchInput } from "./configurable-list/hooks/useSearchInput";
import type {
	ConfigurableListProps,
	FilterConfig,
	StandardListParams,
} from "./configurable-list/types";
import { calculatePagination } from "./configurable-list/utils/dataAdapter";
import {
	generateOptions,
	getDefaultFilterValues,
	hasActiveFilters,
	normalizeOptions,
} from "./configurable-list/utils/filterHelpers";
import { applyCustomFilters, applySearchFilter } from "./configurable-list/utils/filtering";
import { sortItems } from "./configurable-list/utils/sorting";
import { getFilterableValue } from "./configurable-list/utils/typeSafeAccess";

// Filter component helpers to reduce complexity
function SelectFilter({
	value,
	config,
	onChange,
}: {
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	const options = generateOptions(config);
	return (
		<Select value={value?.toString() || ""} onValueChange={onChange}>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder={config.placeholder || `${config.label}を選択`} />
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

function BooleanFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	return (
		<Button variant={value ? "default" : "outline"} size="sm" onClick={() => onChange(!value)}>
			{config.label || keyName}
		</Button>
	);
}

function MultiselectFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	const options = generateOptions(config);
	const selectedValues = Array.isArray(value) ? value : [];

	return (
		<div className="space-y-2">
			<Label>{config.label}</Label>
			<div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
				{options.map((opt) => (
					<div key={opt.value} className="flex items-center space-x-2">
						<Checkbox
							id={`${keyName}-${opt.value}`}
							checked={selectedValues.includes(opt.value)}
							onCheckedChange={(checked) => {
								const newValues = checked
									? [...selectedValues, opt.value]
									: selectedValues.filter((v) => v !== opt.value);
								onChange(newValues.length > 0 ? newValues : undefined);
							}}
						/>
						<Label
							htmlFor={`${keyName}-${opt.value}`}
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

function RangeFilter({
	value,
	config,
	onChange,
}: {
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	const min = config.min ?? 0;
	const max = config.max ?? 100;
	const step = config.step ?? 1;
	const rangeValue = value as { min?: number; max?: number } | undefined;
	const currentMin = rangeValue?.min ?? min;
	const currentMax = rangeValue?.max ?? max;

	return (
		<div className="space-y-2">
			<Label>{config.label}</Label>
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
						onChange({ min: newMin, max: currentMax });
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
						onChange({ min: currentMin, max: newMax });
					}}
				/>
			</div>
			<Slider
				value={[currentMin, currentMax]}
				min={min}
				max={max}
				step={step}
				onValueChange={([newMin, newMax]) => {
					onChange({ min: newMin, max: newMax });
				}}
				className="mt-2"
			/>
		</div>
	);
}

function DateFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	return (
		<div className="space-y-2">
			<Label>{config.label || keyName}</Label>
			<Input
				type="date"
				value={value?.toString() || ""}
				onChange={(e) => onChange(e.target.value || undefined)}
				className="w-[180px]"
			/>
		</div>
	);
}

function DateRangeFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	const dateValue = value as { start?: string; end?: string } | undefined;
	return (
		<div className="space-y-2">
			<Label>{config.label || keyName}</Label>
			<div className="flex items-center space-x-2">
				<Input
					type="date"
					value={dateValue?.start || ""}
					min={config.minDate}
					max={config.maxDate}
					onChange={(e) => {
						onChange({
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
						onChange({
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

function TagsFilter({
	keyName,
	value,
	config,
	onChange,
}: {
	keyName: string;
	value: unknown;
	config: FilterConfig;
	onChange: (value: unknown) => void;
}) {
	const options = generateOptions(config);
	const selectedValues = Array.isArray(value) ? value : [];
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
					{config.label || keyName}
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
					<div className="mb-2 text-sm font-medium">{config.label || keyName}</div>
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							<span className="ml-2 text-sm text-muted-foreground">読み込み中...</span>
						</div>
					) : options.length === 0 ? (
						<div className="text-center py-4 text-sm text-muted-foreground">データがありません</div>
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
												onChange(newValues.length > 0 ? newValues : undefined);
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
									onClick={() => onChange(undefined)}
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

	// データ取得用のパラメータ
	const fetchParams: StandardListParams = useMemo(
		() => (urlSync ? urlHook.params : localParams),
		[urlSync, urlHook.params, localParams],
	);

	// データ管理
	const {
		actualData,
		loading: dataLoading,
		isRefreshing,
		error: dataError,
		isServerSide,
	} = useConfigurableListData(fetchParams, {
		initialItems,
		initialTotal,
		fetchFn,
		dataAdapter,
		onError,
		searchable,
	});

	const loading = externalLoading || dataLoading;
	const error = externalError || dataError;

	// クライアントサイドのフィルタリング（サーバーサイドでない場合）
	const processedItems = useMemo(() => {
		if (isServerSide) return actualData.items;

		let result = [...actualData.items];

		// 検索フィルタリング
		result = applySearchFilter(result, fetchParams.search, searchable);

		// カスタムフィルターの適用
		result = applyCustomFilters(result, fetchParams.filters, filters);

		// ソート
		result = sortItems(result, fetchParams.sort, getFilterableValue);

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

	// イベントハンドラー
	const {
		handleSearch,
		handleSortChange,
		handleFilterChange,
		handlePageChange,
		handleResetFilters,
		handleItemsPerPageChange,
	} = useListHandlers({
		urlSync,
		urlHook,
		setLocalParams,
		filters,
	});

	// 検索入力管理
	const {
		localSearchValue,
		handleSearchChange,
		handleSearchKeyDown,
		handleCompositionStart,
		handleCompositionEnd,
	} = useSearchInput({
		initialValue: fetchParams.search || "",
		onSearch: handleSearch,
	});

	// フィルターコンポーネントのレンダリング
	const renderFilter = useCallback(
		(key: string, config: FilterConfig) => {
			const value = fetchParams.filters[key];
			const onChange = (v: unknown) => handleFilterChange(key, v);

			switch (config.type) {
				case "select":
					return <SelectFilter value={value} config={config} onChange={onChange} />;
				case "boolean":
					return <BooleanFilter keyName={key} value={value} config={config} onChange={onChange} />;
				case "multiselect":
					return (
						<MultiselectFilter keyName={key} value={value} config={config} onChange={onChange} />
					);
				case "range":
					return <RangeFilter value={value} config={config} onChange={onChange} />;
				case "date":
					return <DateFilter keyName={key} value={value} config={config} onChange={onChange} />;
				case "dateRange":
					return (
						<DateRangeFilter keyName={key} value={value} config={config} onChange={onChange} />
					);
				case "tags":
					return <TagsFilter keyName={key} value={value} config={config} onChange={onChange} />;
				default:
					return null;
			}
		},
		[fetchParams.filters, handleFilterChange],
	);

	// ローディング表示（データがない場合のみスケルトンを表示）
	const shouldShowLoading = loading && currentItems.length === 0 && !actualData.total;
	if (shouldShowLoading) {
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
			<ConfigurableListHeader
				searchable={searchable}
				searchPlaceholder={searchPlaceholder}
				localSearchValue={localSearchValue}
				onSearchChange={handleSearchChange}
				onSearchKeyDown={handleSearchKeyDown}
				onCompositionStart={handleCompositionStart}
				onCompositionEnd={handleCompositionEnd}
				hasFilters={hasFilters}
				filters={filters}
				renderFilter={renderFilter}
				activeFilters={activeFilters}
				onResetFilters={handleResetFilters}
			/>

			{/* 情報表示とコントロール：件数、ソート、ページサイズ */}
			<ConfigurableListControls
				actualTotal={actualData.total}
				isRefreshing={isRefreshing}
				paginationStartIndex={pagination.startIndex}
				paginationEndIndex={pagination.endIndex}
				searchQuery={fetchParams.search || ""}
				emptyMessage={emptyMessage}
				sortOptions={sortOptions}
				currentSort={fetchParams.sort || ""}
				onSortChange={handleSortChange}
				itemsPerPageOptions={itemsPerPageOptions}
				currentItemsPerPage={fetchParams.itemsPerPage}
				onItemsPerPageChange={handleItemsPerPageChange}
				initialTotal={initialTotal}
			/>

			{/* リスト本体 */}
			{currentItems.length > 0 ? (
				<ConfigurableListItems
					items={currentItems}
					renderItem={renderItem}
					layout={layout}
					gridColumns={gridColumns}
					startIndex={pagination.startIndex}
				/>
			) : (
				// データがない場合は、ローディング中でない且つ初期データも存在しない場合のみ空メッセージを表示
				!loading &&
				actualData.total === 0 &&
				currentItems.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
				)
			)}

			{/* ページネーションと件数表示 */}
			<ConfigurableListFooter
				totalPages={pagination.totalPages}
				currentPage={fetchParams.page}
				hasPrev={pagination.hasPrev}
				hasNext={pagination.hasNext}
				onPageChange={handlePageChange}
				total={actualData.total}
				startIndex={pagination.startIndex}
				endIndex={pagination.endIndex}
			/>
		</div>
	);
}
