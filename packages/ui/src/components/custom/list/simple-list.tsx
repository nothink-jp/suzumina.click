/**
 * SimpleList - 最もシンプルなリストコンポーネント
 * 自動ページネーション、基本ソート、タイトル検索機能を提供
 */

"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import type { SimpleListProps } from "./core/types";
import { calculatePagination } from "./core/utils/dataAdapter";

export function SimpleList<T>({
	items,
	renderItem,
	itemsPerPage = 12,
	loading = false,
	error,
	className = "",
}: SimpleListProps<T>) {
	// ローカル状態管理
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// 検索とソートを適用したアイテムを計算
	const processedItems = useMemo(() => {
		let result = [...items];

		// 検索フィルタリング（タイトルプロパティがある場合）
		if (searchTerm) {
			result = result.filter((item) => {
				// itemがオブジェクトで、title, name, label のいずれかを持つ場合に検索
				if (typeof item === "object" && item !== null) {
					const searchableProps = ["title", "name", "label"];
					return searchableProps.some((prop) => {
						const value = (item as any)[prop];
						return (
							typeof value === "string" && value.toLowerCase().includes(searchTerm.toLowerCase())
						);
					});
				}
				return false;
			});
		}

		// ソート（createdAt, updatedAt, dateがある場合）
		result.sort((a, b) => {
			if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
				const dateProps = ["createdAt", "updatedAt", "date"];
				for (const prop of dateProps) {
					const aDate = (a as any)[prop];
					const bDate = (b as any)[prop];
					if (aDate && bDate) {
						const aTime = new Date(aDate).getTime();
						const bTime = new Date(bDate).getTime();
						return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
					}
				}
			}
			return 0;
		});

		return result;
	}, [items, searchTerm, sortOrder]);

	// ページネーション情報を計算
	const pagination = useMemo(
		() => calculatePagination(processedItems.length, itemsPerPage, currentPage),
		[processedItems.length, itemsPerPage, currentPage],
	);

	// 現在のページのアイテムを取得
	const currentItems = useMemo(
		() => processedItems.slice(pagination.startIndex, pagination.endIndex),
		[processedItems, pagination.startIndex, pagination.endIndex],
	);

	// 検索やソート変更時は1ページ目に戻る
	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
		setCurrentPage(1);
	};

	const handleSortChange = (value: "asc" | "desc") => {
		setSortOrder(value);
		setCurrentPage(1);
	};

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

	return (
		<div className={className}>
			{/* ヘッダー：検索とソート */}
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{/* 検索ボックス */}
				<div className="relative max-w-sm flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="search"
						placeholder="検索..."
						value={searchTerm}
						onChange={(e) => handleSearchChange(e.target.value)}
						className="pl-10"
					/>
				</div>

				{/* ソート選択 */}
				<Select value={sortOrder} onValueChange={handleSortChange}>
					<SelectTrigger className="w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="desc">新しい順</SelectItem>
						<SelectItem value="asc">古い順</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* アイテム数表示 */}
			<div className="mb-4 text-sm text-muted-foreground">
				{processedItems.length > 0 ? (
					<>
						{processedItems.length}件中 {pagination.startIndex + 1}-{pagination.endIndex}件を表示
					</>
				) : searchTerm ? (
					"検索結果がありません"
				) : (
					"データがありません"
				)}
			</div>

			{/* リスト本体 */}
			{currentItems.length > 0 && (
				<div className="space-y-4">
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
