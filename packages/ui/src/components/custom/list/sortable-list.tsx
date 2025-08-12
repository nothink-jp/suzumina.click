/**
 * SortableList - ソート・検索機能付きリストコンポーネント
 * BasicListにソートと検索機能を追加
 */

"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { BasicList, type BasicListProps } from "./basic-list";
import type { SortConfig } from "./core/types";
import {
	getDateProperty,
	getFilterableValue,
	getSearchableText,
} from "./core/utils/typeSafeAccess";

export interface SortableListProps<T> extends BasicListProps<T> {
	sorts?: SortConfig[];
	defaultSort?: string;
	searchable?: boolean;
	searchPlaceholder?: string;
}

export function SortableList<T>({
	items,
	sorts,
	defaultSort,
	searchable = false,
	searchPlaceholder = "検索...",
	...basicListProps
}: SortableListProps<T>) {
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);

	// ソート設定の正規化
	const normalizedSorts = useMemo(() => {
		if (!sorts) return [];
		return sorts.map((s) => {
			if (typeof s === "string") {
				return { value: s, label: s };
			}
			return s;
		});
	}, [sorts]);

	const [currentSort, setCurrentSort] = useState(defaultSort || normalizedSorts[0]?.value || "");

	// 検索とソートを適用したアイテムを計算
	const processedItems = useMemo(() => {
		let result = [...items];

		// 検索フィルタリング
		if (searchable && searchTerm) {
			result = result.filter((item) => {
				const searchableText = getSearchableText(item);
				return searchableText
					? searchableText.toLowerCase().includes(searchTerm.toLowerCase())
					: false;
			});
		}

		// ソート処理
		if (currentSort && normalizedSorts.length > 0) {
			const sortConfig = normalizedSorts.find((s) => s.value === currentSort);
			if (sortConfig) {
				result.sort((a, b) => {
					// カスタムソート関数がある場合
					if (sortConfig.compareFn) {
						return sortConfig.compareFn(a, b);
					}

					// デフォルトの日付ソート
					const aDate = getDateProperty(a);
					const bDate = getDateProperty(b);
					if (aDate && bDate) {
						const aTime = aDate.getTime();
						const bTime = bDate.getTime();
						return sortConfig.order === "desc" ? bTime - aTime : aTime - bTime;
					}

					// プロパティ名によるソート
					if (sortConfig.field) {
						const aVal = getFilterableValue(a, sortConfig.field);
						const bVal = getFilterableValue(b, sortConfig.field);

						// 型安全な比較
						if (aVal === undefined && bVal === undefined) return 0;
						if (aVal === undefined) return 1;
						if (bVal === undefined) return -1;

						// 文字列または数値として比較
						const comparison = String(aVal).localeCompare(String(bVal), undefined, {
							numeric: true,
						});
						return sortConfig.order === "desc" ? -comparison : comparison;
					}

					return 0;
				});
			}
		}

		return result;
	}, [items, searchTerm, currentSort, normalizedSorts, searchable]);

	// 検索やソート変更時は1ページ目に戻る
	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
		setCurrentPage(1);
	};

	const handleSortChange = (value: string) => {
		setCurrentSort(value);
		setCurrentPage(1);
	};

	return (
		<div>
			{/* ヘッダー：検索とソート */}
			{(searchable || sorts) && (
				<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					{/* 検索ボックス */}
					{searchable && (
						<div className="relative max-w-sm flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="search"
								placeholder={searchPlaceholder}
								value={searchTerm}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-10"
							/>
						</div>
					)}

					{/* ソート選択 */}
					{normalizedSorts.length > 0 && (
						<Select value={currentSort} onValueChange={handleSortChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{normalizedSorts.map((sort) => (
									<SelectItem key={sort.value} value={sort.value}>
										{sort.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			)}

			{/* リスト表示（検索結果表示の調整） */}
			{searchable && searchTerm && processedItems.length === 0 ? (
				<div className="flex items-center justify-center py-12">
					<div className="text-muted-foreground">検索結果がありません</div>
				</div>
			) : (
				<BasicList
					{...basicListProps}
					items={processedItems}
					page={currentPage}
					onPageChange={setCurrentPage}
				/>
			)}
		</div>
	);
}
