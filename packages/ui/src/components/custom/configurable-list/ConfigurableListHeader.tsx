/**
 * ConfigurableListのヘッダーコンポーネント
 */

import { Search, X } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import type { FilterConfig } from "./types";

interface ConfigurableListHeaderProps {
	searchable: boolean;
	searchPlaceholder?: string;
	localSearchValue: string;
	onSearchChange: (value: string) => void;
	onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	onCompositionStart: () => void;
	onCompositionEnd: () => void;
	hasFilters: boolean;
	filters: Record<string, FilterConfig>;
	renderFilter: (key: string, config: FilterConfig) => React.ReactNode;
	activeFilters: boolean;
	onResetFilters: () => void;
}

export function ConfigurableListHeader({
	searchable,
	searchPlaceholder,
	localSearchValue,
	onSearchChange,
	onSearchKeyDown,
	onCompositionStart,
	onCompositionEnd,
	hasFilters,
	filters,
	renderFilter,
	activeFilters,
	onResetFilters,
}: ConfigurableListHeaderProps) {
	return (
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
							onChange={(e) => onSearchChange(e.target.value)}
							onKeyDown={onSearchKeyDown}
							onCompositionStart={onCompositionStart}
							onCompositionEnd={onCompositionEnd}
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
							<Button variant="ghost" size="sm" onClick={onResetFilters}>
								<X className="mr-1 h-3 w-3" />
								リセット
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
