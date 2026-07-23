/**
 * ConfigurableList - カスタマイズ可能なリストコンポーネント
 * フィルター、ソート、URL同期、サーバーサイドデータ取得機能を提供
 *
 * props は責務で 2 つに分かれる（型は ConfigurableListProps = 合成）:
 * - 汎用表示・ページング・状態: ListDisplayProps（items/renderItem/layout/loading 等）
 * - 用途特化クエリ・サーバー連携: ListQueryProps（filters/sorts/search/urlSync/fetchFn 等）
 * フィルター UI ウィジェットは configurable-list-filters（FilterControl）に分離。
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { ConfigurableListControls } from "./configurable-list/configurable-list-controls";
import { FilterControl } from "./configurable-list/configurable-list-filters";
import { ConfigurableListFooter } from "./configurable-list/configurable-list-footer";
import { ConfigurableListHeader } from "./configurable-list/configurable-list-header";
import { ConfigurableListItems } from "./configurable-list/configurable-list-items";
import { useConfigurableListData } from "./configurable-list/hooks/use-configurable-list-data";
import { useListHandlers } from "./configurable-list/hooks/use-list-handlers";
import { useListUrl } from "./configurable-list/hooks/use-list-url";
import { useSearchInput } from "./configurable-list/hooks/use-search-input";
import type {
	ConfigurableListProps,
	FilterConfig,
	StandardListParams,
} from "./configurable-list/types";
import { calculatePagination } from "./configurable-list/utils/data-adapter";
import {
	getActiveFilterChips,
	getDefaultFilterValues,
	hasActiveFilters,
	normalizeOptions,
} from "./configurable-list/utils/filter-helpers";

/**
 * リスト本体（アイテム一覧 or 空表示）の描画。
 * ConfigurableList 本体の cognitive complexity を増やさないよう分岐をここへ切り出す。
 */
function ConfigurableListBody<T>({
	currentItems,
	renderItem,
	layout,
	gridColumns,
	startIndex,
	shouldShowEmptyState,
	emptyState,
	emptyMessage,
}: {
	currentItems: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	layout: "list" | "grid" | "flex";
	gridColumns: { default?: number; sm?: number; md?: number; lg?: number; xl?: number };
	startIndex: number;
	shouldShowEmptyState: boolean;
	emptyState?: React.ReactNode;
	emptyMessage: string;
}) {
	if (currentItems.length > 0) {
		return (
			<ConfigurableListItems
				items={currentItems}
				renderItem={renderItem}
				layout={layout}
				gridColumns={gridColumns}
				startIndex={startIndex}
			/>
		);
	}
	if (!shouldShowEmptyState) return null;
	return emptyState ?? <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>;
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
	emptyState,
	loadingComponent,
	layout = "list",
	gridColumns = {
		default: 1,
		md: 2,
		lg: 3,
	},
	itemsPerPageOptions,
	initialTotal,
	listHeading,
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

	// ページネーション情報（サーバーが filter/sort/paginate 済みの total を返す）
	const pagination = useMemo(
		() => calculatePagination(actualData.total, fetchParams.itemsPerPage, fetchParams.page),
		[actualData.total, fetchParams.itemsPerPage, fetchParams.page],
	);

	// 現在のページのアイテム（サーバーが返したページをそのまま使う。
	// サーバーが異なるページサイズを返した場合に備えて念のためスライス）
	const currentItems = useMemo(() => {
		const itemsPerPage = fetchParams.itemsPerPage;
		return actualData.items.length > itemsPerPage
			? actualData.items.slice(0, itemsPerPage)
			: actualData.items;
	}, [actualData.items, fetchParams.itemsPerPage]);

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

	// フィルターUIの描画（type 振り分けは configurable-list-filters の FilterControl に委譲）
	const renderFilter = useCallback(
		(key: string, config: FilterConfig) => (
			<FilterControl
				keyName={key}
				value={fetchParams.filters[key]}
				config={config}
				onChange={(v) => handleFilterChange(key, v)}
			/>
		),
		[fetchParams.filters, handleFilterChange],
	);

	// アクティブフィルターの個別解除チップ（select/booleanは1件、tags/multiselectは選択値ごと）
	const activeFilterChips = useMemo(
		() => getActiveFilterChips(fetchParams.filters, filters),
		[fetchParams.filters, filters],
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
	// データがない場合は、ローディング中でない且つ初期データも存在しない場合のみ空表示を出す
	const shouldShowEmptyState = !loading && actualData.total === 0 && currentItems.length === 0;

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
				activeFilterChips={activeFilterChips}
				// key/value のシグネチャが一致するため、専用ハンドラを作らず handleFilterChange を
				// そのまま個別解除ハンドラとして再利用している（nextValue は解除後の値そのもの）
				onRemoveFilterChip={handleFilterChange}
			/>

			{/* 情報表示とコントロール：件数、ソート、ページサイズ */}
			<ConfigurableListControls
				actualTotal={actualData.total}
				isRefreshing={isRefreshing}
				paginationStartIndex={pagination.startIndex}
				paginationEndIndex={pagination.endIndex}
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
			{/* ページ h1 と各カード見出し(h3)の間を埋める中間見出し（sr-only）。見出しレベル skip を防ぐ */}
			{listHeading && <h2 className="sr-only">{listHeading}</h2>}
			<ConfigurableListBody
				currentItems={currentItems}
				renderItem={renderItem}
				layout={layout}
				gridColumns={gridColumns}
				startIndex={pagination.startIndex}
				shouldShowEmptyState={shouldShowEmptyState}
				emptyState={emptyState}
				emptyMessage={emptyMessage}
			/>

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
