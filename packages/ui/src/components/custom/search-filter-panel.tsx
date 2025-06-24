"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface SearchFilterPanelProps {
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	onSearch?: () => void;
	searchPlaceholder?: string;
	filters?: ReactNode;
	className?: string;
}

/**
 * 検索・フィルターパネルコンポーネント
 * - 統一されたデザインの検索バーとフィルター
 * - レスポンシブ対応
 */
export function SearchFilterPanel({
	searchValue,
	onSearchChange,
	onSearch,
	searchPlaceholder = "検索...",
	filters,
	className,
}: SearchFilterPanelProps) {
	return (
		<Card className={cn("p-4 sm:p-6 mb-8", className)}>
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="flex-1">
					<div className="relative">
						<Input
							type="text"
							placeholder={searchPlaceholder}
							value={searchValue}
							onChange={(e) => onSearchChange?.(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									onSearch?.();
								}
							}}
							className="pr-10 h-11"
						/>
						<button
							type="button"
							onClick={onSearch}
							className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
							aria-label="検索"
						>
							<Search className="h-5 w-5" />
						</button>
					</div>
				</div>
				{filters && <div className="flex flex-col sm:flex-row gap-4">{filters}</div>}
			</div>
		</Card>
	);
}

interface FilterOption {
	value: string;
	label: string;
}

interface FilterSelectProps {
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	options: FilterOption[];
	className?: string;
}

/**
 * フィルター用のセレクトボックス
 * - 統一されたスタイリング
 * - タッチデバイス対応
 */
export function FilterSelect({
	value,
	onValueChange,
	placeholder = "選択してください",
	options,
	className,
}: FilterSelectProps) {
	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger className={cn("h-11 min-w-[140px]", className)}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

interface SortOption {
	value: string;
	label: string;
}

interface SortSelectProps {
	value?: string;
	onValueChange?: (value: string) => void;
	options?: SortOption[];
	className?: string;
}

/**
 * ソート用のセレクトボックス
 * - デフォルトのソートオプション付き
 */
export function SortSelect({
	value,
	onValueChange,
	options = [
		{ value: "default", label: "並び順" },
		{ value: "newest", label: "新しい順" },
		{ value: "oldest", label: "古い順" },
		{ value: "popular", label: "人気順" },
	],
	className,
}: SortSelectProps) {
	return (
		<FilterSelect
			value={value}
			onValueChange={onValueChange}
			placeholder="並び順"
			options={options}
			className={className}
		/>
	);
}
