/**
 * ConfigurableListのコントロール部分
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import type { Option } from "./types";

interface ConfigurableListControlsProps {
	actualTotal: number;
	isRefreshing: boolean;
	paginationStartIndex: number;
	paginationEndIndex: number;
	searchQuery?: string;
	emptyMessage: string;
	sortOptions: Option[];
	currentSort: string;
	onSortChange: (value: string) => void;
	itemsPerPageOptions?: number[];
	currentItemsPerPage: number;
	onItemsPerPageChange: (value: string) => void;
	initialTotal?: number;
}

export function ConfigurableListControls({
	actualTotal,
	isRefreshing,
	paginationStartIndex,
	paginationEndIndex,
	searchQuery,
	emptyMessage,
	sortOptions,
	currentSort,
	onSortChange,
	itemsPerPageOptions,
	currentItemsPerPage,
	onItemsPerPageChange,
	initialTotal,
}: ConfigurableListControlsProps) {
	return (
		<div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			{/* 左側：件数表示 */}
			<div className="text-sm text-muted-foreground flex items-center gap-2">
				{isRefreshing && (
					<div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				)}
				{actualTotal > 0 ? (
					<>
						全{actualTotal}件 <span className="mx-2">/</span> {paginationStartIndex + 1}-
						{Math.min(paginationEndIndex, actualTotal)}件を表示
						{isRefreshing && <span className="text-xs">（更新中...）</span>}
					</>
				) : searchQuery ? (
					"検索結果がありません"
				) : (
					emptyMessage
				)}
			</div>

			{/* 右側：ソートとページサイズ */}
			<div className="flex items-center gap-3">
				{/* ソート選択 */}
				{sortOptions.length > 0 && (
					<Select value={currentSort} onValueChange={onSortChange}>
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
					(actualTotal > 0 || (initialTotal && initialTotal > 0)) && (
						<Select value={currentItemsPerPage.toString()} onValueChange={onItemsPerPageChange}>
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
	);
}
