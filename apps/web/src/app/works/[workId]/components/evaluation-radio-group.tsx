"use client";

import type { EvaluationInput } from "@suzumina.click/shared-types";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Award, Star, ThumbsDown } from "lucide-react";
import { useState } from "react";

interface EvaluationRadioGroupProps {
	value: {
		type: "top10" | "star" | "ng";
		starRating?: 1 | 2 | 3;
	} | null;
	onChange: (evaluation: EvaluationInput) => void;
	disabled?: boolean;
}

export function EvaluationRadioGroup({
	value,
	onChange,
	disabled = false,
}: EvaluationRadioGroupProps) {
	const [hoveredStar, setHoveredStar] = useState<number | null>(null);

	const handleTop10Click = () => {
		if (!disabled) {
			onChange({ type: "top10" });
		}
	};

	const handleStarClick = (rating: 1 | 2 | 3) => {
		if (!disabled) {
			onChange({ type: "star", starRating: rating });
		}
	};

	const handleNGClick = () => {
		if (!disabled) {
			onChange({ type: "ng" });
		}
	};

	const isTop10 = value?.type === "top10";
	const isStar = value?.type === "star";
	const isNG = value?.type === "ng";
	const starRating = isStar ? value.starRating || 0 : 0;

	return (
		<div className="space-y-2">
			<button
				type="button"
				onClick={handleTop10Click}
				disabled={disabled}
				className={cn(
					"flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors",
					isTop10
						? "border-yellow-300 bg-yellow-50 text-yellow-900"
						: "border-gray-200 bg-white hover:bg-gray-50",
					disabled && "cursor-not-allowed opacity-50",
				)}
			>
				<Award className={cn("h-5 w-5", isTop10 ? "text-yellow-600" : "text-gray-400")} />
				<div className="flex-1">
					<div className="text-sm font-medium">10選に追加</div>
					<div className="text-xs text-gray-600">特におすすめの作品として登録</div>
				</div>
			</button>

			<div
				className={cn(
					"flex items-center gap-3 rounded-md border px-4 py-3",
					isStar ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white",
					!disabled && "hover:bg-gray-50",
					disabled && "cursor-not-allowed opacity-50",
				)}
			>
				<div className="flex items-center gap-1">
					{[1, 2, 3].map((rating) => (
						<button
							key={rating}
							type="button"
							onClick={() => handleStarClick(rating as 1 | 2 | 3)}
							onMouseEnter={() => setHoveredStar(rating)}
							onMouseLeave={() => setHoveredStar(null)}
							disabled={disabled}
							className="p-1"
						>
							<Star
								className={cn(
									"h-5 w-5 transition-colors",
									(hoveredStar !== null ? rating <= hoveredStar : rating <= starRating)
										? "fill-blue-500 text-blue-500"
										: "text-gray-300",
								)}
							/>
						</button>
					))}
				</div>
				<div className="flex-1">
					<div className="text-sm font-medium">星評価</div>
					<div className="text-xs text-gray-600">作品の満足度を評価</div>
				</div>
			</div>

			<button
				type="button"
				onClick={handleNGClick}
				disabled={disabled}
				className={cn(
					"flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors",
					isNG
						? "border-red-300 bg-red-50 text-red-900"
						: "border-gray-200 bg-white hover:bg-gray-50",
					disabled && "cursor-not-allowed opacity-50",
				)}
			>
				<ThumbsDown className={cn("h-5 w-5", isNG ? "text-red-600" : "text-gray-400")} />
				<div className="flex-1">
					<div className="text-sm font-medium">NG登録</div>
					<div className="text-xs text-gray-600">今後表示しないようにする</div>
				</div>
			</button>
		</div>
	);
}
