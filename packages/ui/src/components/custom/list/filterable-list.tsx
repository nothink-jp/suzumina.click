/**
 * FilterableList - フィルター機能付きリストコンポーネント
 * SortableListにフィルター機能とURL同期を追加
 */

"use client";

import { Filter, Grid, List } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../ui/sheet";
import { FilterPanel } from "./core/components/FilterPanel";
import { useListUrl } from "./core/hooks/useListUrl";
import type { FilterConfig } from "./core/types";
import { getDefaultFilterValues, hasActiveFilters } from "./core/utils/filterHelpers";
import { getFilterableValue } from "./core/utils/typeSafeAccess";
import { SortableList, type SortableListProps } from "./sortable-list";

export interface FilterableListProps<T> extends SortableListProps<T> {
	filters?: Record<string, FilterConfig>;
	urlSync?: boolean;
	displayMode?: "grid" | "list";
	onFilterChange?: (filters: Record<string, unknown>) => void;
}

export function FilterableList<T>({
	items,
	filters,
	urlSync: enableUrlSync = false,
	displayMode: initialDisplayMode = "list",
	onFilterChange,
	...sortableListProps
}: FilterableListProps<T>) {
	const [displayMode, setDisplayMode] = useState(initialDisplayMode);
	const [filterValues, setFilterValues] = useState<Record<string, unknown>>(() =>
		filters ? getDefaultFilterValues(filters) : {},
	);
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	// URL同期フック（条件付きでも常に呼び出す）
	const urlHook = useListUrl({
		filters,
		defaultSort: sortableListProps.defaultSort,
	});

	// URL同期が有効な場合、URLから初期値を読み込む
	useEffect(() => {
		if (enableUrlSync && urlHook) {
			const { params } = urlHook;
			if (params.filters && Object.keys(params.filters).length > 0) {
				setFilterValues(params.filters);
			}
		}
	}, [enableUrlSync, urlHook]);

	// フィルター適用処理
	const filteredItems = useMemo(() => {
		if (!filters || Object.keys(filterValues).length === 0) {
			return items;
		}

		return items.filter((item) => {
			// 各フィルターをチェック
			for (const [key, value] of Object.entries(filterValues)) {
				if (value === undefined || value === null || value === "") continue;

				const filterConfig = filters[key];
				if (!filterConfig) continue;

				// フィルター適用ロジック（実際の実装では各フィルタータイプに応じた処理が必要）
				const itemValue = getFilterableValue(item, key);

				switch (filterConfig.type) {
					case "select":
						if (itemValue !== value) return false;
						break;
					case "multiselect":
						if (!Array.isArray(value) || value.length === 0) continue;
						if (!value.includes(itemValue)) return false;
						break;
					case "range": {
						const range = value as { min?: number; max?: number };
						const numValue = typeof itemValue === "number" ? itemValue : Number(itemValue);
						if (!isNaN(numValue)) {
							if (range.min !== undefined && numValue < range.min) return false;
							if (range.max !== undefined && numValue > range.max) return false;
						}
						break;
					}
					case "boolean":
						if (itemValue !== value) return false;
						break;
					// 他のフィルタータイプも同様に実装
				}
			}
			return true;
		});
	}, [items, filters, filterValues]);

	// フィルター変更ハンドラー
	const handleFilterChange = useCallback(
		(newFilters: Record<string, unknown>) => {
			setFilterValues(newFilters);

			// URL同期
			if (enableUrlSync && urlHook) {
				// Update filters through URL
				Object.entries(newFilters).forEach(([key, value]) => {
					urlHook.setFilter(key, value);
				});
			}

			// コールバック呼び出し
			if (onFilterChange) {
				onFilterChange(newFilters);
			}
		},
		[enableUrlSync, urlHook, onFilterChange],
	);

	// フィルターリセット
	const handleResetFilters = useCallback(() => {
		const defaultValues = filters ? getDefaultFilterValues(filters) : {};
		handleFilterChange(defaultValues);
	}, [filters, handleFilterChange]);

	// アクティブなフィルターがあるか
	const hasFilters = filters && hasActiveFilters(filterValues, filters);

	return (
		<div>
			{/* ツールバー */}
			{(filters || displayMode) && (
				<div className="mb-6 flex items-center justify-between">
					<div className="flex items-center gap-2">
						{/* フィルターボタン */}
						{filters && (
							<Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
								<SheetTrigger asChild>
									<Button variant="outline" size="sm">
										<Filter className="mr-2 h-4 w-4" />
										フィルター
										{hasFilters && (
											<span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
												{
													Object.values(filterValues).filter(
														(v) => v !== undefined && v !== null && v !== "",
													).length
												}
											</span>
										)}
									</Button>
								</SheetTrigger>
								<SheetContent>
									<SheetHeader>
										<SheetTitle>フィルター</SheetTitle>
									</SheetHeader>
									<div className="mt-6">
										<FilterPanel
											filters={filters}
											values={filterValues}
											onChange={handleFilterChange}
										/>
										{hasFilters && (
											<Button
												variant="outline"
												size="sm"
												onClick={handleResetFilters}
												className="mt-4 w-full"
											>
												リセット
											</Button>
										)}
									</div>
								</SheetContent>
							</Sheet>
						)}
					</div>

					{/* 表示モード切り替え */}
					{displayMode && (
						<div className="flex gap-1">
							<Button
								variant={displayMode === "list" ? "default" : "ghost"}
								size="sm"
								onClick={() => setDisplayMode("list")}
							>
								<List className="h-4 w-4" />
							</Button>
							<Button
								variant={displayMode === "grid" ? "default" : "ghost"}
								size="sm"
								onClick={() => setDisplayMode("grid")}
							>
								<Grid className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>
			)}

			{/* リスト表示 */}
			<SortableList
				{...sortableListProps}
				items={filteredItems}
				className={
					displayMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : ""
				}
			/>
		</div>
	);
}
