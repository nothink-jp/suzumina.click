/**
 * BasicList - 基本的なリストコンポーネント
 * ページネーション機能を提供するシンプルなリスト
 */

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import type { ListError } from "./core/types";
import { calculatePagination } from "./core/utils/dataAdapter";

export interface BasicListProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	itemsPerPage?: number;
	loading?: boolean;
	error?: ListError;
	className?: string;
	page?: number;
	onPageChange?: (page: number) => void;
}

export function BasicList<T>({
	items,
	renderItem,
	itemsPerPage = 12,
	loading = false,
	error,
	className = "",
	page: controlledPage,
	onPageChange,
}: BasicListProps<T>) {
	const [internalPage, setInternalPage] = useState(1);

	// 制御/非制御コンポーネントパターン
	const currentPage = controlledPage ?? internalPage;
	const setCurrentPage = (newPage: number) => {
		if (onPageChange) {
			onPageChange(newPage);
		} else {
			setInternalPage(newPage);
		}
	};

	// ページネーション情報を計算
	const pagination = useMemo(
		() => calculatePagination(items.length, itemsPerPage, currentPage),
		[items.length, itemsPerPage, currentPage],
	);

	// 現在のページのアイテムを取得
	const currentItems = useMemo(
		() => items.slice(pagination.startIndex, pagination.endIndex),
		[items, pagination.startIndex, pagination.endIndex],
	);

	// ローディング表示
	if (loading && items.length === 0) {
		return (
			<div className={`flex items-center justify-center py-12 ${className}`}>
				<div className="text-muted-foreground">読み込み中...</div>
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

	// 空状態
	if (items.length === 0) {
		return (
			<div className={`flex items-center justify-center py-12 ${className}`}>
				<div className="text-muted-foreground">データがありません</div>
			</div>
		);
	}

	return (
		<div className={className}>
			{/* アイテム数表示 */}
			<div className="mb-4 text-sm text-muted-foreground">
				{items.length}件中 {pagination.startIndex + 1}-{pagination.endIndex}件を表示
			</div>

			{/* リスト本体 */}
			<div className="space-y-4">
				{currentItems.map((item, index) => (
					<div key={pagination.startIndex + index}>
						{renderItem(item, pagination.startIndex + index)}
					</div>
				))}
			</div>

			{/* ページネーション */}
			{pagination.totalPages > 1 && (
				<div className="mt-8 flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => setCurrentPage(currentPage - 1)}
						disabled={!pagination.hasPrev}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>

					<div className="flex gap-1">
						{Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
							// 表示するページ番号を計算（現在のページを中心に）
							let pageNum: number;
							if (pagination.totalPages <= 7) {
								pageNum = i + 1;
							} else if (currentPage <= 4) {
								pageNum = i + 1;
							} else if (currentPage >= pagination.totalPages - 3) {
								pageNum = pagination.totalPages - 6 + i;
							} else {
								pageNum = currentPage - 3 + i;
							}

							if (pageNum < 1 || pageNum > pagination.totalPages) return null;

							return (
								<Button
									key={pageNum}
									variant={pageNum === currentPage ? "default" : "outline"}
									size="icon"
									onClick={() => setCurrentPage(pageNum)}
								>
									{pageNum}
								</Button>
							);
						})}
					</div>

					<Button
						variant="outline"
						size="icon"
						onClick={() => setCurrentPage(currentPage + 1)}
						disabled={!pagination.hasNext}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
