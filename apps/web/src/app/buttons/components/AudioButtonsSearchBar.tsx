"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Search, X } from "lucide-react";
import { startTransition } from "react";

interface AudioButtonsSearchBarProps {
	searchQuery: string;
	onSearchQueryChange: (value: string) => void;
	onSearch: () => void;
	onReset: () => void;
}

export function AudioButtonsSearchBar({
	searchQuery,
	onSearchQueryChange,
	onSearch,
	onReset,
}: AudioButtonsSearchBarProps) {
	const handleSearch = () => {
		startTransition(() => {
			onSearch();
		});
	};

	const handleReset = () => {
		startTransition(() => {
			onReset();
		});
	};

	return (
		<div className="flex flex-col sm:flex-row gap-4">
			<div className="flex-1">
				<div className="relative">
					<input
						type="text"
						placeholder="音声ボタンを検索..."
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
						className="w-full h-12 px-4 pr-12 rounded-lg border border-suzuka-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-suzuka-400 focus:border-transparent placeholder:text-muted-foreground"
					/>
					<button
						type="button"
						onClick={handleSearch}
						className="absolute right-3 top-1/2 transform -translate-y-1/2 text-suzuka-500 hover:text-suzuka-600 p-1"
						aria-label="検索"
					>
						<Search className="h-5 w-5" />
					</button>
				</div>
			</div>

			<div className="flex gap-2">
				<Button
					onClick={handleSearch}
					className="h-12 px-8 bg-suzuka-500 hover:bg-suzuka-600 text-white border-0"
				>
					検索
				</Button>
				{searchQuery && (
					<Button
						variant="outline"
						onClick={handleReset}
						className="h-12 px-4 border-suzuka-200 text-suzuka-600 hover:bg-suzuka-50"
						aria-label="検索をリセット"
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}
