"use client";

import { Loader2, Search } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { Card } from "../ui/card";

// 汎用的な提案アイテムの型
export interface AutocompleteSuggestionItem<T = unknown> {
	id: string;
	value: T;
}

interface AutocompleteDropdownProps<T> {
	items: AutocompleteSuggestionItem<T>[];
	isLoading?: boolean;
	isVisible: boolean;
	onSelect: (item: AutocompleteSuggestionItem<T>) => void;
	onClose: () => void;
	highlightedIndex: number;
	onHighlightChange: (index: number) => void;
	renderItem: (item: AutocompleteSuggestionItem<T>, isHighlighted: boolean) => ReactNode;
	className?: string;
	emptyMessage?: string;
	loadingMessage?: string;
}

/**
 * 汎用的なオートコンプリートドロップダウンコンポーネント
 * @template T - 提案アイテムの値の型
 */
export function AutocompleteDropdown<T>({
	items,
	isLoading = false,
	isVisible,
	onSelect,
	onClose,
	highlightedIndex,
	onHighlightChange,
	renderItem,
	className,
	emptyMessage = "候補が見つかりませんでした",
	loadingMessage = "検索中...",
}: AutocompleteDropdownProps<T>) {
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Handle clicks outside the dropdown
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				onClose();
			}
		}

		if (isVisible) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isVisible, onClose]);

	// Scroll highlighted item into view
	useEffect(() => {
		if (highlightedIndex >= 0 && dropdownRef.current) {
			const highlightedElement = dropdownRef.current.querySelector(
				`[data-index="${highlightedIndex}"]`,
			);
			if (highlightedElement) {
				highlightedElement.scrollIntoView({
					block: "nearest",
					behavior: "smooth",
				});
			}
		}
	}, [highlightedIndex]);

	if (!isVisible) {
		return null;
	}

	return (
		<Card
			ref={dropdownRef}
			className={cn(
				"absolute top-full left-0 right-0 mt-1 z-50",
				"max-h-80 overflow-y-auto shadow-lg border border-border",
				"bg-white rounded-lg",
				className,
			)}
			role="listbox"
		>
			{isLoading && (
				<div className="flex items-center justify-center py-4 text-muted-foreground">
					<Loader2 className="w-4 h-4 animate-spin mr-2" />
					<span className="text-sm">{loadingMessage}</span>
				</div>
			)}

			{!isLoading && items.length === 0 && (
				<div className="flex items-center justify-center py-4 text-muted-foreground">
					<Search className="w-4 h-4 mr-2" />
					<span className="text-sm">{emptyMessage}</span>
				</div>
			)}

			{!isLoading && items.length > 0 && (
				<div className="py-1">
					{items.map((item, index) => (
						<div
							key={item.id}
							data-index={index}
							className={cn(
								"cursor-pointer transition-colors",
								"hover:bg-accent focus:bg-accent",
								highlightedIndex === index && "bg-accent",
							)}
							onClick={() => onSelect(item)}
							onMouseEnter={() => onHighlightChange(index)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									onSelect(item);
								}
							}}
							role="option"
							aria-selected={highlightedIndex === index}
							tabIndex={-1}
						>
							{renderItem(item, highlightedIndex === index)}
						</div>
					))}
				</div>
			)}
		</Card>
	);
}
