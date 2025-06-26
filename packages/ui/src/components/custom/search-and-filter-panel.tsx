"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";

interface SearchAndFilterPanelProps {
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	onSearch?: () => void;
	onReset?: () => void;
	searchPlaceholder?: string;
	filters?: ReactNode;
	className?: string;
	hasActiveFilters?: boolean;
}

/**
 * 検索・フィルター専用パネル
 * - 検索バー（Enter実行対応）
 * - フィルターボタン群
 * - 検索・リセットアクション
 */
export function SearchAndFilterPanel({
	searchValue,
	onSearchChange,
	onSearch,
	onReset,
	searchPlaceholder = "検索...",
	filters,
	className,
	hasActiveFilters = false,
}: SearchAndFilterPanelProps) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			onSearch?.();
		}
	};

	return (
		<Card className={cn("p-4 sm:p-6 mb-6", className)}>
			<div className="space-y-4">
				{/* 検索バー */}
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1">
						<div className="relative">
							<Input
								type="text"
								placeholder={searchPlaceholder}
								value={searchValue}
								onChange={(e) => onSearchChange?.(e.target.value)}
								onKeyDown={handleKeyDown}
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

					{/* アクションボタン */}
					<div className="flex gap-2">
						<Button onClick={onSearch} className="h-11 px-6">
							検索
						</Button>
						{(hasActiveFilters || searchValue) && (
							<Button
								variant="outline"
								onClick={onReset}
								className="h-11 px-4"
								aria-label="検索・フィルターをリセット"
							>
								<X className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>

				{/* フィルター */}
				{filters && <div className="flex flex-wrap gap-3">{filters}</div>}
			</div>
		</Card>
	);
}
