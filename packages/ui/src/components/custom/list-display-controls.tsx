"use client";

import { Grid, List } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface DisplayOption {
	value: string;
	label: string;
}

interface ListDisplayControlsProps {
	title: string;
	totalCount: number;
	filteredCount?: number;
	currentPage?: number;
	totalPages?: number;

	// 並び順制御
	sortValue?: string;
	onSortChange?: (value: string) => void;
	sortOptions?: DisplayOption[];

	// 件数/ページ制御
	itemsPerPageValue?: string;
	onItemsPerPageChange?: (value: string) => void;
	itemsPerPageOptions?: DisplayOption[];

	// 表示モード制御（オプション）
	viewMode?: "grid" | "list";
	onViewModeChange?: (mode: "grid" | "list") => void;

	// その他のアクション
	actions?: ReactNode;
	className?: string;
}

/**
 * リスト表示制御コンポーネント
 * - タイトル・件数表示
 * - 並び順・件数/ページ・表示モード制御
 */
export function ListDisplayControls({
	title,
	totalCount,
	filteredCount,
	currentPage,
	totalPages,
	sortValue,
	onSortChange,
	sortOptions = [
		{ value: "default", label: "並び順" },
		{ value: "newest", label: "新しい順" },
		{ value: "oldest", label: "古い順" },
		{ value: "popular", label: "人気順" },
	],
	itemsPerPageValue,
	onItemsPerPageChange,
	itemsPerPageOptions = [
		{ value: "12", label: "12件/ページ" },
		{ value: "24", label: "24件/ページ" },
		{ value: "48", label: "48件/ページ" },
		{ value: "96", label: "96件/ページ" },
	],
	viewMode,
	onViewModeChange,
	actions,
	className,
}: ListDisplayControlsProps) {
	// フィルタが適用されているかどうか
	const isFiltered = filteredCount !== undefined && filteredCount !== totalCount;

	return (
		<div className={cn("mb-6", className)}>
			<div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
				{/* 左側：タイトル・件数・ページ情報 */}
				<div className="flex flex-col sm:flex-row sm:items-center gap-2">
					<h2 className="text-lg sm:text-xl font-semibold text-foreground">
						{title}{" "}
						{isFiltered ? (
							<span className="text-base font-normal">
								({filteredCount?.toLocaleString()}件 / 全{totalCount.toLocaleString()}件)
							</span>
						) : (
							<span className="text-base font-normal">(全{totalCount.toLocaleString()}件)</span>
						)}
					</h2>

					{currentPage && totalPages && totalPages > 1 && (
						<div className="text-sm text-muted-foreground">
							{currentPage}ページ / {totalPages}ページ
						</div>
					)}

					{actions}
				</div>

				{/* 右側：表示制御 */}
				<div className="flex items-center gap-3">
					{/* 並び順 */}
					{onSortChange && (
						<Select value={sortValue} onValueChange={onSortChange}>
							<SelectTrigger className="w-[140px] h-9">
								<SelectValue placeholder="並び順" />
							</SelectTrigger>
							<SelectContent>
								{sortOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{/* 件数/ページ */}
					{onItemsPerPageChange && (
						<Select value={itemsPerPageValue} onValueChange={onItemsPerPageChange}>
							<SelectTrigger className="w-[140px] h-9">
								<SelectValue placeholder="件数" />
							</SelectTrigger>
							<SelectContent>
								{itemsPerPageOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{/* 表示モード切替（オプション） */}
					{onViewModeChange && (
						<div className="flex border rounded-md">
							<Button
								variant={viewMode === "grid" ? "default" : "ghost"}
								size="sm"
								onClick={() => onViewModeChange("grid")}
								className="h-9 px-3 rounded-r-none"
								aria-label="グリッド表示"
							>
								<Grid className="h-4 w-4" />
							</Button>
							<Button
								variant={viewMode === "list" ? "default" : "ghost"}
								size="sm"
								onClick={() => onViewModeChange("list")}
								className="h-9 px-3 rounded-l-none border-l"
								aria-label="リスト表示"
							>
								<List className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
