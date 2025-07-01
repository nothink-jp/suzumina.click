"use client";

import { FilterIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Separator } from "../ui/separator";
import { DateRangeFilter } from "./date-range-filter";
import { NumericRangeFilter } from "./numeric-range-filter";

interface NumericRange {
	min?: number;
	max?: number;
}

interface DateRange {
	from?: Date;
	to?: Date;
}

export interface AdvancedFilters {
	playCount?: NumericRange;
	likeCount?: NumericRange;
	favoriteCount?: NumericRange;
	duration?: NumericRange;
	createdAt?: DateRange;
	createdBy?: string;
}

interface AdvancedFilterPanelProps {
	filters: AdvancedFilters;
	onChange: (filters: AdvancedFilters) => void;
	onApply?: () => void;
	className?: string;
}

export function AdvancedFilterPanel({
	filters,
	onChange,
	onApply,
	className,
}: AdvancedFilterPanelProps) {
	const [isOpen, setIsOpen] = useState(false);

	// フィルタが適用されているかどうかを判定
	const hasActiveFilters = () => {
		return (
			filters.playCount?.min !== undefined ||
			filters.playCount?.max !== undefined ||
			filters.likeCount?.min !== undefined ||
			filters.likeCount?.max !== undefined ||
			filters.favoriteCount?.min !== undefined ||
			filters.favoriteCount?.max !== undefined ||
			filters.duration?.min !== undefined ||
			filters.duration?.max !== undefined ||
			filters.createdAt?.from !== undefined ||
			filters.createdAt?.to !== undefined ||
			filters.createdBy !== undefined
		);
	};

	// アクティブなフィルタ数をカウント（簡素化）
	const getActiveFilterCount = () => {
		const hasPlayCount =
			filters.playCount?.min !== undefined || filters.playCount?.max !== undefined;
		const hasLikeCount =
			filters.likeCount?.min !== undefined || filters.likeCount?.max !== undefined;
		const hasFavoriteCount =
			filters.favoriteCount?.min !== undefined || filters.favoriteCount?.max !== undefined;
		const hasDuration = filters.duration?.min !== undefined || filters.duration?.max !== undefined;
		const hasCreatedAt =
			filters.createdAt?.from !== undefined || filters.createdAt?.to !== undefined;
		const hasCreatedBy = !!filters.createdBy;

		return [
			hasPlayCount,
			hasLikeCount,
			hasFavoriteCount,
			hasDuration,
			hasCreatedAt,
			hasCreatedBy,
		].filter(Boolean).length;
	};

	// すべてのフィルタをリセット
	const handleResetAll = () => {
		onChange({
			playCount: { min: undefined, max: undefined },
			likeCount: { min: undefined, max: undefined },
			favoriteCount: { min: undefined, max: undefined },
			duration: { min: undefined, max: undefined },
			createdAt: { from: undefined, to: undefined },
			createdBy: undefined,
		});
		onApply?.();
	};

	// プリセット定義
	const playCountPresets = [
		{ label: "1回以上", min: 1 },
		{ label: "10回以上", min: 10 },
		{ label: "100回以上", min: 100 },
		{ label: "1000回以上", min: 1000 },
	];

	const likeCountPresets = [
		{ label: "1回以上", min: 1 },
		{ label: "5回以上", min: 5 },
		{ label: "10回以上", min: 10 },
		{ label: "50回以上", min: 50 },
	];

	const favoriteCountPresets = [
		{ label: "1回以上", min: 1 },
		{ label: "5回以上", min: 5 },
		{ label: "10回以上", min: 10 },
		{ label: "20回以上", min: 20 },
	];

	const durationPresets = [
		{ label: "短い (～10秒)", max: 10 },
		{ label: "普通 (10～30秒)", min: 10, max: 30 },
		{ label: "長い (30秒～)", min: 30 },
		{ label: "とても長い (60秒～)", min: 60 },
	];

	const activeFilterCount = getActiveFilterCount();

	return (
		<div className={className}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<div className="flex items-center gap-2">
					<CollapsibleTrigger asChild>
						<Button variant="outline" size="sm" className="h-9">
							<FilterIcon className="mr-2 h-4 w-4" />
							高度フィルタ
							{activeFilterCount > 0 && (
								<Badge variant="secondary" className="ml-2 h-5 px-1 text-xs">
									{activeFilterCount}
								</Badge>
							)}
						</Button>
					</CollapsibleTrigger>
					{hasActiveFilters() && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleResetAll}
							className="h-9 text-muted-foreground hover:text-foreground"
						>
							<RotateCcwIcon className="mr-1 h-3 w-3" />
							リセット
						</Button>
					)}
				</div>

				<CollapsibleContent>
					<div className="mt-4 p-4 border rounded-lg bg-card space-y-4">
						<div className="flex flex-wrap gap-2">
							{/* 再生数フィルタ */}
							<NumericRangeFilter
								label="再生数"
								value={filters.playCount || {}}
								onChange={(range) => onChange({ ...filters, playCount: range })}
								presets={playCountPresets}
								unit="回"
								placeholder={{ min: "0", max: "上限なし" }}
							/>

							{/* いいね数フィルタ */}
							<NumericRangeFilter
								label="いいね数"
								value={filters.likeCount || {}}
								onChange={(range) => onChange({ ...filters, likeCount: range })}
								presets={likeCountPresets}
								unit="回"
								placeholder={{ min: "0", max: "上限なし" }}
							/>

							{/* お気に入り数フィルタ */}
							<NumericRangeFilter
								label="お気に入り数"
								value={filters.favoriteCount || {}}
								onChange={(range) => onChange({ ...filters, favoriteCount: range })}
								presets={favoriteCountPresets}
								unit="回"
								placeholder={{ min: "0", max: "上限なし" }}
							/>

							{/* 音声長フィルタ */}
							<NumericRangeFilter
								label="音声長"
								value={filters.duration || {}}
								onChange={(range) => onChange({ ...filters, duration: range })}
								presets={durationPresets}
								unit="秒"
								placeholder={{ min: "0", max: "上限なし" }}
							/>

							{/* 作成日フィルタ */}
							<DateRangeFilter
								label="作成日"
								value={filters.createdAt || {}}
								onChange={(range) => onChange({ ...filters, createdAt: range })}
							/>
						</div>

						{onApply && (
							<>
								<Separator />
								<div className="flex gap-2">
									<Button onClick={onApply} size="sm">
										フィルタを適用
									</Button>
									<Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
										閉じる
									</Button>
								</div>
							</>
						)}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
